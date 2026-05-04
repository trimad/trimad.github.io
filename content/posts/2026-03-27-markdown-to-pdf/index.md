---
ai: true
ai-tested-date: 2026-03-27
author: "Tristan Madden"
categories:
  - "Python"
date: 2026-03-27
draft: false
summary: "Convert a Markdown file into a styled PDF with Python and an installed Chrome or Edge browser, while preserving the source filename and suppressing browser-added headers and footers."
tags:
  - "python"
  - "markdown"
  - "pdf"
  - "automation"
title: "Convert Markdown To PDF With Python"
toc: true
usePageBundles: true
---

## Overview

When I wanted a quick way to turn a Markdown file into a clean PDF, I did not need a full publishing pipeline. I needed one script that could take a file path, render the Markdown as HTML, and hand the final layout off to a browser-grade PDF engine that was already installed on the machine.

This script does exactly that. It accepts a Markdown filename as a parameter, converts the file to HTML with the `markdown` package, groups major sections to reduce ugly page breaks, then renders the result to PDF through an installed Chromium-based browser such as Chrome or Edge. The output PDF is written next to the source file and keeps the same base filename.

## Requirements

- Python 3 installed and available on your `PATH`
- An installed Chromium-based browser such as Google Chrome or Microsoft Edge
- The `markdown` package in your virtual environment
- A Markdown file you want to convert, either passed by relative path or absolute path
- Permission to create a temporary HTML file during rendering and write the final PDF beside the source Markdown file

## Key Capabilities

- Accepts a Markdown filename as a command-line argument
- Writes the PDF beside the source file with the same base filename
- Converts Markdown to HTML with support for tables, code blocks, and a table of contents
- Injects CSS directly into the generated HTML so there is no separate stylesheet to manage
- Groups `h2` and `h3` blocks into logical resume sections to reduce awkward page breaks
- Renders the final PDF with an installed Chrome or Edge browser
- Suppresses the default browser PDF headers and footers so the output does not include timestamps, local file paths, or page-number overlays
- Cleans up the temporary HTML file even when rendering fails

## Download

{{< download-resource file="markdown_to_pdf.py" title="Source File" label="Download markdown_to_pdf.py" >}}
This post bundles the exact Python script described here, so the download link points directly to the page resource for this entry.
{{< /download-resource >}}

## How to Use

1. Download `markdown_to_pdf.py` to any working folder.
2. Create a virtual environment:

```powershell
python -m venv .venv
```

3. Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

4. Upgrade `pip` and install the required package inside the virtual environment:

```powershell
python -m pip install --upgrade pip
pip install markdown
```

5. Make sure Chrome or Edge is installed locally, because the script uses that browser directly for PDF rendering.
6. Run the script and pass the Markdown file you want to convert:

```powershell
python .\markdown_to_pdf.py .\resume.md
```

7. The script will create `resume.pdf` beside `resume.md`. You can also pass a full path if the Markdown file lives somewhere else.

## Example Output

```text
Reading markdown file: C:\resume\resume.md
Converting markdown to HTML...
Rendering with installed browser...
PDF saved successfully: C:\resume\resume.pdf
```

## Notes

- The script writes the PDF next to the source Markdown file and keeps the same base filename.
- `group_markdown_blocks()` is especially useful for resume-style Markdown where `##` starts a major section and `###` starts an entry inside that section.
- This version of the script depends on a locally installed Chrome or Edge browser and does not use Playwright or `pdfkit`.
- If PowerShell blocks `Activate.ps1`, run `Set-ExecutionPolicy -Scope Process Bypass` for the current shell and then activate the virtual environment again.
- The HTML grouping step uses `xml.etree.ElementTree`, so heavily customized raw HTML inside the Markdown may require a different parser or some defensive cleanup first.
