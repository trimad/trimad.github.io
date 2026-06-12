#!/usr/bin/env python3
"""
Convert a Markdown file to PDF using headless Chromium.
"""

import argparse
import base64
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


LIST_MARKER_RE = re.compile(r"^ {0,3}(?:[-+*]|\d+[.)])\s+")
FENCE_RE = re.compile(r"^ {0,3}(```+|~~~+)")
PDF_TAG_COMMENT_RE = re.compile(
    r"<!--\s*pdf-tags?\s*:\s*(.*?)\s*-->",
    re.IGNORECASE | re.DOTALL,
)
PDF_URL_COMMENT_RE = re.compile(
    r"<!--\s*pdf-(?:metadata-)?url\s*:\s*(.*?)\s*-->",
    re.IGNORECASE | re.DOTALL,
)
PDF_SOURCE_TEXT_COMMENT_RE = re.compile(
    r"<!--\s*pdf-source-text\s*:\s*(.*?)\s*-->",
    re.IGNORECASE | re.DOTALL,
)
PDF_SOURCE_TEXT_BASE64_COMMENT_RE = re.compile(
    r"<!--\s*pdf-source-text-base64\s*:\s*(.*?)\s*-->",
    re.IGNORECASE | re.DOTALL,
)
MIN_RENDERED_FALLBACK_TEXT_LENGTH = 800
MANAGED_PDF_METADATA_KEYS = {
    "/Keywords",
    "/SourceURL",
    "/SourceURLs",
    "/JobDescription",
    "/SourceText",
    "/sourceText",
}


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Convert a Markdown file to PDF using an installed Chromium-based browser."
    )
    parser.add_argument(
        "markdown_file",
        help="Path to the Markdown file to render.",
    )
    parser.add_argument(
        "--tag",
        dest="pdf_tags",
        action="append",
        default=[],
        help="Hidden PDF metadata tag/keyword. May be repeated or comma-separated.",
    )
    parser.add_argument(
        "--tags",
        dest="pdf_tag_groups",
        action="append",
        default=[],
        help="Comma-separated hidden PDF metadata tags/keywords.",
    )
    parser.add_argument(
        "--metadata-url",
        "--url",
        dest="metadata_urls",
        action="append",
        default=[],
        help="URL to fetch and embed as hidden custom PDF metadata.",
    )
    parser.add_argument(
        "--no-fetch-url-text",
        action="store_true",
        help="Embed metadata URLs without fetching and embedding their page text.",
    )
    return parser.parse_args()


def normalize_pdf_tags(tag_values):
    """Return a de-duplicated list of non-empty PDF metadata tags."""
    tags = []
    seen = set()

    for value in tag_values:
        for tag in re.split(r"[,;\n]", value):
            normalized_tag = tag.strip().strip("\"'")
            if not normalized_tag:
                continue

            tag_key = normalized_tag.casefold()
            if tag_key not in seen:
                tags.append(normalized_tag)
                seen.add(tag_key)

    return tags


def extract_pdf_tags(markdown_content):
    """Extract hidden PDF metadata tags from Markdown comments."""
    return normalize_pdf_tags(PDF_TAG_COMMENT_RE.findall(markdown_content))


def normalize_metadata_urls(url_values):
    """Return a de-duplicated list of valid HTTP(S) metadata URLs."""
    urls = []
    seen = set()

    for value in url_values:
        for url in value.splitlines():
            normalized_url = url.strip().strip("\"'")
            if not normalized_url:
                continue

            parsed_url = urlparse(normalized_url)
            if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
                raise ValueError(f"Expected an absolute HTTP(S) URL, got: {url}")

            url_key = normalized_url.casefold()
            if url_key not in seen:
                urls.append(normalized_url)
                seen.add(url_key)

    return urls


def extract_metadata_urls(markdown_content):
    """Extract custom PDF metadata URLs from hidden Markdown comments."""
    return normalize_metadata_urls(PDF_URL_COMMENT_RE.findall(markdown_content))


class ReadableTextExtractor(HTMLParser):
    """Extract visible-ish readable text from an HTML page."""

    BLOCK_TAGS = {
        "address",
        "article",
        "aside",
        "blockquote",
        "br",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "footer",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "li",
        "main",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "tbody",
        "td",
        "tfoot",
        "th",
        "thead",
        "tr",
        "ul",
    }
    SKIP_TAGS = {
        "button",
        "canvas",
        "code",
        "form",
        "iframe",
        "input",
        "nav",
        "noscript",
        "option",
        "script",
        "select",
        "style",
        "svg",
        "template",
        "textarea",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_stack = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()

        if self.skip_stack:
            self.skip_stack.append(tag)
            return

        if tag in self.SKIP_TAGS or self.should_skip_element(attrs):
            self.skip_stack.append(tag)
            return

        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        tag = tag.lower()

        if self.skip_stack:
            if tag in self.skip_stack:
                while self.skip_stack:
                    skipped_tag = self.skip_stack.pop()
                    if skipped_tag == tag:
                        break
            return

        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip_stack:
            self.parts.append(data)

    @staticmethod
    def should_skip_element(attrs):
        """Return True for hidden or non-content HTML elements."""
        attr_map = {name.lower(): value or "" for name, value in attrs}
        style = attr_map.get("style", "").replace(" ", "").lower()
        return (
            "hidden" in attr_map
            or attr_map.get("aria-hidden", "").lower() == "true"
            or "display:none" in style
            or "visibility:hidden" in style
        )

    def get_text(self):
        return normalize_source_text("".join(self.parts))


def normalize_source_text(text):
    """Normalize scraped text while preserving paragraph boundaries."""
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")
    lines = []

    for line in text.splitlines():
        line = re.sub(r"[ \t\f\v]+", " ", line).strip()
        if line:
            lines.append(line)
        elif lines and lines[-1] != "":
            lines.append("")

    normalized = "\n".join(lines)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def extract_readable_text_from_html(html_content):
    """Extract readable text from an HTML document."""
    extractor = ReadableTextExtractor()
    extractor.feed(html_content)
    extractor.close()
    return extractor.get_text()


def fetch_url_source_text(url, timeout=20):
    """Fetch a URL and extract readable source text for PDF metadata."""
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0 Safari/537.36"
            )
        },
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            content_type = response.headers.get("content-type", "")
            charset = response.headers.get_content_charset() or "utf-8"
            raw_content = response.read()
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise RuntimeError(f"Could not fetch {url}: {error}") from error

    page_text = raw_content.decode(charset, errors="replace")
    if "html" not in content_type.casefold():
        return normalize_source_text(page_text)

    source_text = extract_readable_text_from_html(page_text)
    rendered_source_text = fetch_rendered_url_source_text(url)

    if rendered_source_text and (
        len(source_text) < MIN_RENDERED_FALLBACK_TEXT_LENGTH
        or len(rendered_source_text) > len(source_text)
    ):
        return rendered_source_text

    return source_text


def fetch_rendered_url_source_text(url, wait_ms=10000):
    """Use headless Chromium to extract text after JavaScript has rendered the page."""
    browsers = find_installed_browsers()
    if not browsers:
        return ""

    for browser in browsers:
        with tempfile.TemporaryDirectory(prefix="markdown-to-pdf-browser-") as user_data:
            try:
                result = subprocess.run(
                    [
                        str(browser),
                        "--headless=new",
                        "--disable-gpu",
                        "--disable-extensions",
                        "--no-first-run",
                        "--no-default-browser-check",
                        f"--user-data-dir={user_data}",
                        f"--virtual-time-budget={wait_ms}",
                        "--dump-dom",
                        url,
                    ],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=max(15, wait_ms // 1000 + 10),
                )
            except (subprocess.CalledProcessError, OSError, subprocess.TimeoutExpired):
                continue

            rendered_text = extract_readable_text_from_html(result.stdout)
            if rendered_text:
                return rendered_text

    return ""


def encode_source_text_comment(text):
    """Encode arbitrary source text so it is safe inside a hidden Markdown comment."""
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def decode_source_text_comment(encoded_text):
    """Decode source text from a hidden base64 Markdown comment."""
    compact_text = re.sub(r"\s+", "", encoded_text)
    return base64.b64decode(compact_text).decode("utf-8")


def extract_source_texts(markdown_content):
    """Extract source text payloads from hidden Markdown comments."""
    source_texts = []

    for text in PDF_SOURCE_TEXT_COMMENT_RE.findall(markdown_content):
        normalized_text = normalize_source_text(text)
        if normalized_text:
            source_texts.append(normalized_text)

    for encoded_text in PDF_SOURCE_TEXT_BASE64_COMMENT_RE.findall(markdown_content):
        decoded_text = normalize_source_text(decode_source_text_comment(encoded_text))
        if decoded_text:
            source_texts.append(decoded_text)

    return source_texts


def append_metadata_url_comments(markdown_content, urls):
    """Add CLI-supplied URLs as hidden Markdown comments for the render pipeline."""
    if not urls:
        return markdown_content

    comments = "\n".join(f"<!-- pdf-url: {url} -->" for url in urls)
    return f"{markdown_content.rstrip()}\n\n{comments}\n"


def append_source_text_comments(markdown_content, source_texts):
    """Add fetched source text as hidden base64 Markdown comments."""
    if not source_texts:
        return markdown_content

    comments = "\n".join(
        f"<!-- pdf-source-text-base64: {encode_source_text_comment(text)} -->"
        for text in source_texts
        if text
    )
    return f"{markdown_content.rstrip()}\n\n{comments}\n"


def normalize_list_boundaries(markdown_content):
    """Add missing blank lines before Markdown lists without touching fenced code."""
    normalized_lines = []
    in_fenced_code = False
    previous_line = ""

    for line in markdown_content.splitlines(keepends=True):
        if FENCE_RE.match(line):
            in_fenced_code = not in_fenced_code

        if (
            not in_fenced_code
            and LIST_MARKER_RE.match(line)
            and previous_line.strip()
            and not LIST_MARKER_RE.match(previous_line)
        ):
            normalized_lines.append("\n")

        normalized_lines.append(line)
        previous_line = line

    return "".join(normalized_lines)


def group_markdown_blocks(html_fragment):
    """Wrap h2 and h3 sections to reduce awkward page breaks."""
    try:
        root = ET.fromstring(f"<div>{html_fragment}</div>")
    except ET.ParseError:
        return html_fragment

    grouped_children = []
    current_section = None
    current_entry = None

    def flush_entry():
        nonlocal current_entry
        if current_entry is not None and current_section is not None:
            current_section.append(current_entry)
            current_entry = None

    def flush_section():
        nonlocal current_section
        flush_entry()
        if current_section is not None:
            grouped_children.append(current_section)
            current_section = None

    for child in list(root):
        root.remove(child)
        tag = child.tag.lower() if isinstance(child.tag, str) else ""

        if tag == "h2":
            flush_section()
            current_section = ET.Element("section", {"class": "markdown-section"})
            current_section.append(child)
        elif tag == "h3":
            if current_section is None:
                current_section = ET.Element("section", {"class": "markdown-section"})
            flush_entry()
            current_entry = ET.Element("div", {"class": "markdown-entry"})
            current_entry.append(child)
        else:
            if current_entry is not None:
                current_entry.append(child)
            elif current_section is not None:
                current_section.append(child)
            else:
                grouped_children.append(child)

    flush_section()

    return "".join(
        ET.tostring(child, encoding="unicode", method="html")
        for child in grouped_children
    )


def build_html_document(html_content):
    """Build the styled HTML document used for PDF rendering."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @page {{
                size: Letter;
                margin: 0.52in 0.62in;
            }}

            :root {{
                --ink: #1f2933;
                --muted: #52616f;
                --rule: #d7dee8;
                --rule-strong: #a8b6c8;
                --accent: #0f4c81;
                --accent-soft: #eef5fb;
                --code-bg: #f4f7fa;
            }}

            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            html {{
                background: #eef2f6;
            }}

            body {{
                font-family: Aptos, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 10.5pt;
                line-height: 1.42;
                color: var(--ink);
                background: white;
                padding: 0.58in 0.68in;
                max-width: 8.5in;
                margin: 0 auto;
                -webkit-font-smoothing: antialiased;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }}

            h1 {{
                font-size: 27pt;
                line-height: 1.05;
                color: #102a43;
                text-align: center;
                font-weight: 750;
                padding: 0;
                margin-bottom: 7px;
            }}

            h1 strong {{
                color: inherit;
                font-weight: inherit;
            }}

            body > h1:first-child + p {{
                color: var(--muted);
                font-size: 9.4pt;
                line-height: 1.38;
                text-align: center;
                padding-bottom: 13px;
                margin-bottom: 15px;
                border-bottom: 1px solid var(--rule);
            }}

            h2 {{
                font-size: 11.4pt;
                line-height: 1.25;
                color: var(--accent);
                border-bottom: 1px solid var(--rule-strong);
                padding: 0 0 4px 0;
                margin-top: 16px;
                margin-bottom: 8px;
                font-weight: 750;
                text-transform: uppercase;
                letter-spacing: 0;
            }}

            h3 {{
                font-size: 11pt;
                line-height: 1.25;
                color: #182635;
                font-weight: 750;
                margin-top: 10px;
                margin-bottom: 3px;
            }}

            h4, h5, h6 {{
                font-size: 10.2pt;
                color: #334e68;
                margin-top: 9px;
                margin-bottom: 4px;
                font-weight: 700;
            }}

            p {{
                margin-bottom: 7px;
                text-align: left;
                orphans: 3;
                widows: 3;
            }}

            h3 + p {{
                color: var(--muted);
                font-size: 10pt;
                line-height: 1.35;
                margin-bottom: 5px;
            }}

            h3 + p strong {{
                display: inline-block;
                color: #243b53;
                font-weight: 700;
                margin-bottom: 1px;
            }}

            ul, ol {{
                margin: 6px 0 9px 18px;
                padding-left: 0;
                break-inside: auto;
                page-break-inside: auto;
            }}

            li {{
                margin-bottom: 3.5px;
                padding-left: 2px;
                line-height: 1.38;
                break-inside: avoid;
                page-break-inside: avoid;
            }}

            li::marker {{
                color: var(--accent);
                font-size: 0.9em;
            }}

            .markdown-section {{
                margin-bottom: 6px;
                break-inside: auto;
                page-break-inside: auto;
            }}

            .markdown-entry {{
                break-inside: avoid-page;
                page-break-inside: avoid;
                margin-bottom: 8px;
            }}

            strong, b {{
                color: #1d344f;
                font-weight: 700;
            }}

            em, i {{
                font-style: italic;
            }}

            code {{
                color: #243b53;
                background-color: var(--code-bg);
                padding: 1px 5px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 9.4pt;
            }}

            pre {{
                background-color: var(--code-bg);
                border: 1px solid var(--rule);
                border-radius: 6px;
                padding: 10px 12px;
                margin: 9px 0;
                overflow-x: auto;
                font-family: 'Courier New', monospace;
                font-size: 9.2pt;
                line-height: 1.35;
            }}

            pre code {{
                background-color: transparent;
                padding: 0;
            }}

            blockquote {{
                border-left: 3px solid var(--accent);
                margin: 9px 0;
                padding: 7px 0 7px 12px;
                color: var(--muted);
                background: var(--accent-soft);
                font-style: italic;
            }}

            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 9px 0;
                font-size: 9.6pt;
            }}

            th, td {{
                border: 1px solid var(--rule);
                padding: 7px 8px;
                text-align: left;
            }}

            th {{
                background-color: var(--accent);
                color: white;
                font-weight: 700;
            }}

            tr:nth-child(even) {{
                background-color: #f8fafc;
            }}

            a {{
                color: var(--accent);
                text-decoration: none;
            }}

            a:hover {{
                text-decoration: underline;
            }}

            hr {{
                border: none;
                border-top: 1px solid var(--rule);
                margin: 14px 0;
                break-after: avoid-page;
                page-break-after: avoid;
            }}

            del, s {{
                text-decoration: line-through;
                color: #8a98a8;
            }}

            h2, h3 {{
                break-after: avoid-page;
                page-break-after: avoid;
            }}

            h2 + *, h3 + * {{
                break-before: avoid-page;
                page-break-before: avoid;
            }}

            @media print {{
                html {{
                    background: white;
                }}

                body {{
                    padding: 0;
                    max-width: none;
                }}
            }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """


def find_installed_browsers():
    """Return installed Chromium-based browsers that can be used for rendering."""
    candidates = [
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    ]
    return [candidate for candidate in candidates if candidate.exists()]


def render_with_installed_browser(temp_html, output_pdf):
    """Render the PDF with a locally installed Chromium-based browser."""
    browsers = find_installed_browsers()
    if not browsers:
        raise RuntimeError(
            "No supported Chromium-based browser was found. Install Google Chrome or Microsoft Edge."
        )

    errors = []

    for browser in browsers:
        try:
            subprocess.run(
                [
                    str(browser),
                    "--headless=new",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--no-pdf-header-footer",
                    "--print-to-pdf-no-header",
                    f"--print-to-pdf={output_pdf}",
                    temp_html.resolve().as_uri(),
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            return True
        except (subprocess.CalledProcessError, OSError) as error:
            errors.append(f"{browser}: {error}")

    raise RuntimeError("; ".join(errors))


def write_pdf_metadata(pdf_path, metadata_updates):
    """Write custom metadata fields to a PDF."""
    metadata_updates = {
        key: value for key, value in metadata_updates.items() if value is not None
    }

    if not metadata_updates:
        return

    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError as error:
        raise RuntimeError(
            "Adding hidden PDF metadata requires pypdf. Install it with: pip install pypdf"
        ) from error

    metadata_pdf = None

    try:
        reader = PdfReader(str(pdf_path))
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        metadata = {}
        if reader.metadata:
            metadata = {
                str(key): str(value)
                for key, value in reader.metadata.items()
                if value is not None and str(key) not in MANAGED_PDF_METADATA_KEYS
            }

        metadata.update(metadata_updates)
        writer.add_metadata(metadata)

        with tempfile.NamedTemporaryFile(
            "wb",
            delete=False,
            suffix=".pdf",
            prefix=f"{pdf_path.stem}-metadata-",
            dir=pdf_path.parent,
        ) as metadata_file:
            metadata_pdf = Path(metadata_file.name)
            writer.write(metadata_file)

        metadata_pdf.replace(pdf_path)
    finally:
        if metadata_pdf and metadata_pdf.exists():
            try:
                metadata_pdf.unlink()
            except OSError:
                pass


def build_pdf_metadata(pdf_tags, metadata_urls, source_texts):
    """Build PDF metadata updates from hidden tags, URLs, and scraped source text."""
    metadata = {}

    if pdf_tags:
        metadata["/Keywords"] = ", ".join(pdf_tags)

    if metadata_urls:
        metadata["/SourceURL"] = metadata_urls[0]

    if source_texts:
        source_text = "\n\n---\n\n".join(source_texts)
        metadata["/sourceText"] = source_text

    return metadata


def render_markdown_to_pdf(
    markdown_path,
    cli_pdf_tags=None,
    cli_metadata_urls=None,
    fetch_url_text=True,
):
    """Render a Markdown file to PDF using a headless browser."""
    markdown_file = Path(markdown_path).expanduser()
    if not markdown_file.is_absolute():
        markdown_file = (Path.cwd() / markdown_file).resolve()
    else:
        markdown_file = markdown_file.resolve()

    if not markdown_file.exists():
        print(f"Error: Markdown file not found at {markdown_file}")
        sys.exit(1)

    if markdown_file.is_dir():
        print(f"Error: Expected a file but got a directory: {markdown_file}")
        sys.exit(1)

    output_pdf = markdown_file.with_suffix(".pdf")
    temp_html = None
    temp_pdf = None

    print(f"Reading markdown file: {markdown_file}")

    markdown_content = markdown_file.read_text(encoding="utf-8")

    try:
        cli_metadata_urls = normalize_metadata_urls(cli_metadata_urls or [])
    except ValueError as error:
        print(f"Error: {error}")
        sys.exit(1)

    markdown_content = append_metadata_url_comments(markdown_content, cli_metadata_urls)
    metadata_urls = extract_metadata_urls(markdown_content)

    fetched_source_texts = []
    if fetch_url_text and metadata_urls:
        for metadata_url in metadata_urls:
            print(f"Fetching source text from: {metadata_url}")
            try:
                source_text = fetch_url_source_text(metadata_url)
            except RuntimeError as error:
                print(f"Error: {error}")
                sys.exit(1)

            if source_text:
                fetched_source_texts.append(source_text)

    markdown_content = append_source_text_comments(markdown_content, fetched_source_texts)
    pdf_tags = normalize_pdf_tags(
        [*(cli_pdf_tags or []), *extract_pdf_tags(markdown_content)]
    )
    try:
        source_texts = extract_source_texts(markdown_content)
    except (ValueError, UnicodeDecodeError) as error:
        print(f"Error: Invalid hidden PDF source text comment: {error}")
        sys.exit(1)

    pdf_metadata = build_pdf_metadata(pdf_tags, metadata_urls, source_texts)
    markdown_content = normalize_list_boundaries(markdown_content)

    try:
        import markdown

        print("Converting markdown to HTML...")
        html_content = markdown.markdown(
            markdown_content,
            extensions=["extra", "toc", "tables", "codehilite"],
        )
        html_content = group_markdown_blocks(html_content)
        html_document = build_html_document(html_content)

        with tempfile.NamedTemporaryFile(
            "w",
            delete=False,
            suffix=".html",
            prefix=f"{markdown_file.stem}-",
            encoding="utf-8",
        ) as temp_file:
            temp_file.write(html_document)
            temp_html = Path(temp_file.name)

        with tempfile.NamedTemporaryFile(
            "wb",
            delete=False,
            suffix=".pdf",
            prefix=f"{markdown_file.stem}-",
            dir=markdown_file.parent,
        ) as temp_pdf_file:
            temp_pdf = Path(temp_pdf_file.name)

        temp_pdf.unlink()

        print("Rendering with installed browser...")
        try:
            render_with_installed_browser(temp_html, temp_pdf)
            if pdf_tags:
                print(f"Adding hidden PDF tags: {', '.join(pdf_tags)}")
            if metadata_urls:
                print(f"Adding custom PDF metadata URL: {metadata_urls[0]}")
            if source_texts:
                source_text_length = sum(len(text) for text in source_texts)
                print(f"Adding scraped source text metadata: {source_text_length} characters")
            if pdf_metadata:
                write_pdf_metadata(temp_pdf, pdf_metadata)
            try:
                temp_pdf.replace(output_pdf)
            except OSError as error:
                raise RuntimeError(
                    f"Could not replace {output_pdf}. Close the PDF if it is open and try again."
                ) from error
            print(f"PDF saved successfully: {output_pdf}")
        except RuntimeError as error:
            print(f"Error: {error}")
            sys.exit(1)

    except ImportError as error:
        print(f"Error: Missing required package: {error}")
        print("\nTo fix, install with:")
        print("  pip install markdown")
        sys.exit(1)
    except Exception as error:
        print(f"Error: {error}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        if temp_html and temp_html.exists():
            try:
                temp_html.unlink()
            except OSError:
                pass
        if temp_pdf and temp_pdf.exists():
            try:
                temp_pdf.unlink()
            except OSError:
                pass


def main():
    """Entry point for the CLI."""
    args = parse_args()
    render_markdown_to_pdf(
        args.markdown_file,
        cli_pdf_tags=[*args.pdf_tags, *args.pdf_tag_groups],
        cli_metadata_urls=args.metadata_urls,
        fetch_url_text=not args.no_fetch_url_text,
    )


if __name__ == "__main__":
    main()
