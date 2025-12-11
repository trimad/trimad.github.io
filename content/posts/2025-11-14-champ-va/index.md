---
author: Tristan Madden
categories: [System Administration]
date: 2025-11-14
draft: false
tags: [security]
title: "ChampVA Claims"
summary: "My personal workflow for how to file claims with ChampVA"
usePageBundles: true
toc: true
---

## Download Itemized Billing Statements:

It looks like I should be able to download those here but I've never been able to: https://mychart.ohiohealth.com/MyChart/Home/

## Download EOB's

https://membersecure.anthem.com/member/eob-center/medical

Useful script for downloading EOB PDF's from the browser console:

```JavaScript
(function() {
    const buttons = Array.from(document.querySelectorAll("button[id^=tcp-eobcenter-download-link]"));
    console.log("Found " + buttons.length + " EOB download buttons");

    let i = 0;
    function clickNext() {
        if (i >= buttons.length) {
            console.log("Done clicking all EOB buttons");
            return;
        }

        const btn = buttons[i];
        console.log("Clicking button", i + 1, "of", buttons.length, btn.id);

        btn.click();

        i++;
        setTimeout(clickNext, 1500);
    }

    clickNext();
})();
```

## Sort EOB's into separate folders

This script uses a QWEN 3 vision model running in LM Studio to sort the EOB's into their respective folders.

```powershell
import os
import shutil
import requests
import json
import pypdfium2 as pdfium
import base64
from PIL import Image
from io import BytesIO

# Names to detect and folder names to move into
SEARCH_CRITERIA = {
    "first m last": "name 1",
    "first m last": "name 2",
    "first m last": "name 3",
}

QWEN_ENDPOINT = "http://192.168.1.3:1234/v1/chat/completions"

DEBUG_MODE = False


def qwen_extract_text(image_bytes):
    """
    Uses Qwen to extract raw text from a page image.
    No classification, no guessing. Pure OCR-like output.
    """
    encoded = base64.b64encode(image_bytes).decode("utf8")
    data_uri = "data:image/png;base64," + encoded

    prompt = (
        "Extract all visible text from the provided image. "
        "Return only the extracted text. Do not add explanations. "
        "Do not classify. Do not guess. Do not summarize. "
        "Only output the raw text you see."
    )

    payload = {
        "model": "qwen3-vl-8b-thinking",
        "messages": [
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_uri}
                    }
                ]
            }
        ]
    }

    response = requests.post(QWEN_ENDPOINT, json=payload, headers={"Content-Type": "application/json"})

    try:
        result = response.json()

        if DEBUG_MODE:
            print("\nQwen OCR Raw JSON:\n", json.dumps(result, indent=2))

        text = result["choices"][0]["message"]["content"]
        if not text:
            return ""

        return text.lower()

    except Exception as e:
        print("Error extracting text from Qwen:", e)
        return ""


def extract_pdf_text_direct(pdf_path):
    """
    Extracts text directly from text-based PDFs.
    This is the fastest and most accurate when available.
    """
    pdf = pdfium.PdfDocument(pdf_path)
    texts = []

    for i in range(len(pdf)):
        page = pdf.get_page(i)
        textpage = page.get_textpage()
        count = textpage.count_chars()
        page_text = textpage.get_text_range(0, count)
        if page_text:
            texts.append(page_text.lower())

    pdf.close()
    return "\n".join(texts)


def render_pdf_to_images(pdf_path):
    images = []
    pdf = pdfium.PdfDocument(pdf_path)

    for i in range(len(pdf)):
        page = pdf.get_page(i)
        bitmap = page.render(scale=3)
        pil_img = bitmap.to_pil()
        images.append(pil_img)

    pdf.close()
    return images


def classify_text(text):
    """
    Checks text for exact name matches, returns folder name or None.
    """
    for full_name_lower, folder in SEARCH_CRITERIA.items():
        if full_name_lower in text:
            return folder
    return None


def organize_pdfs():
    current_dir = os.getcwd()
    print("Starting Qwen OCR-based PDF organization in:", current_dir)

    # Create destination folders
    for folder in SEARCH_CRITERIA.values():
        os.makedirs(folder, exist_ok=True)

    pdf_files = [f for f in os.listdir(current_dir) if f.lower().endswith(".pdf")]

    print("Found", len(pdf_files), "PDF files.")

    for filename in pdf_files:
        print("\nProcessing:", filename)
        full_path = os.path.join(current_dir, filename)

        # Step 1: Try direct PDF text extraction
        try:
            direct_text = extract_pdf_text_direct(full_path)
        except:
            direct_text = ""

        folder_match = classify_text(direct_text)

        if folder_match:
            dest = os.path.join(current_dir, folder_match, filename)
            shutil.move(full_path, dest)
            print("Moved by direct PDF text match:", folder_match)
            continue

        # Step 2: Use image rendering + Qwen OCR fallback
        try:
            pages = render_pdf_to_images(full_path)
        except Exception as e:
            print("Could not render PDF:", e)
            continue

        folder_match = None

        for page_index, img in enumerate(pages):
            print("  OCR page", page_index + 1)

            buffer = BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)
            text = qwen_extract_text(buffer.read())

            if DEBUG_MODE:
                print("\nExtracted text from page", page_index + 1)
                print(text)

            detected = classify_text(text)

            if detected:
                folder_match = detected
                print("  Match found:", detected)
                break

        if not folder_match:
            print("  No match found. Leaving file in place.")
            continue

        dest = os.path.join(current_dir, folder_match, filename)
        shutil.move(full_path, dest)
        print("Moved by OCR match:", folder_match)

    print("\nOrganization complete.")


if __name__ == "__main__":
    organize_pdfs()

```

## Submit Claim

https://www.va.gov/family-and-caregiver-benefits/health-and-disability/champva/file-champva-claim-10-7959a/introduction
