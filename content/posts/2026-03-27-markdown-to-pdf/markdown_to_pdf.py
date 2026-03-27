#!/usr/bin/env python3
"""
Convert a Markdown file to PDF using headless Chromium.
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path
import xml.etree.ElementTree as ET


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Convert a Markdown file to PDF using an installed Chromium-based browser."
    )
    parser.add_argument(
        "markdown_file",
        help="Path to the Markdown file to render.",
    )
    return parser.parse_args()


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
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 40px;
                max-width: 900px;
                margin: 0 auto;
            }}

            h1 {{
                font-size: 28px;
                color: #2c3e50;
                text-align: center;
                border-bottom: 3px solid #2c3e50;
                padding: 20px 0;
                margin-bottom: 20px;
            }}

            h2 {{
                font-size: 18px;
                color: #2c3e50;
                border-bottom: 2px solid #bdc3c7;
                padding: 15px 0 10px 0;
                margin-top: 25px;
                margin-bottom: 15px;
            }}

            h3 {{
                font-size: 15px;
                color: #34495e;
                font-weight: 600;
                margin-top: 15px;
                margin-bottom: 8px;
            }}

            h4, h5, h6 {{
                font-size: 13px;
                color: #555;
                margin-top: 12px;
                margin-bottom: 6px;
            }}

            p {{
                margin-bottom: 12px;
                text-align: left;
                orphans: 3;
                widows: 3;
            }}

            ul, ol {{
                margin: 12px 0 12px 30px;
                break-inside: avoid;
                page-break-inside: avoid;
            }}

            li {{
                margin-bottom: 6px;
                line-height: 1.5;
                break-inside: avoid;
                page-break-inside: avoid;
            }}

            .markdown-section {{
                break-inside: avoid-page;
                page-break-inside: avoid;
            }}

            .markdown-entry {{
                break-inside: avoid-page;
                page-break-inside: avoid;
                margin-bottom: 12px;
            }}

            strong, b {{
                color: #2c3e50;
                font-weight: 600;
            }}

            em, i {{
                font-style: italic;
            }}

            code {{
                background-color: #f5f5f5;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
            }}

            pre {{
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 12px;
                margin: 12px 0;
                overflow-x: auto;
                font-family: 'Courier New', monospace;
                font-size: 12px;
            }}

            pre code {{
                background-color: transparent;
                padding: 0;
            }}

            blockquote {{
                border-left: 4px solid #bdc3c7;
                margin: 12px 0;
                padding-left: 16px;
                color: #666;
                font-style: italic;
            }}

            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
            }}

            th, td {{
                border: 1px solid #ddd;
                padding: 10px;
                text-align: left;
            }}

            th {{
                background-color: #2c3e50;
                color: white;
                font-weight: bold;
            }}

            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}

            a {{
                color: #3498db;
                text-decoration: none;
            }}

            a:hover {{
                text-decoration: underline;
            }}

            hr {{
                border: none;
                border-top: 2px solid #bdc3c7;
                margin: 20px 0;
                break-after: avoid-page;
                page-break-after: avoid;
            }}

            del, s {{
                text-decoration: line-through;
                color: #999;
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
                body {{
                    padding: 20px;
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


def render_markdown_to_pdf(markdown_path):
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

    print(f"Reading markdown file: {markdown_file}")

    markdown_content = markdown_file.read_text(encoding="utf-8")

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

        print("Rendering with installed browser...")
        try:
            render_with_installed_browser(temp_html, output_pdf)
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


def main():
    """Entry point for the CLI."""
    args = parse_args()
    render_markdown_to_pdf(args.markdown_file)


if __name__ == "__main__":
    main()
