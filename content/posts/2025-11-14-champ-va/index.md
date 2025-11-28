---
author: Tristan Madden
categories: [champva]
date: 2025-11-14
draft: false
tags: [insurance]
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

## Sort EOB's

```python
import os
import shutil
from pathlib import Path
import PyPDF2

# Use the folder where this script is located
SOURCE_FOLDER = Path(__file__).parent

TARGETS = {
    "Theo": "Theo",
    "Liam": "Liam",
    "Michelle": "Michelle"
}

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                try:
                    text += page.extract_text() or ""
                except:
                    pass
    except:
        pass
    return text

def main():
    source = SOURCE_FOLDER

    # Create destination folders
    for folder in TARGETS.values():
        (source / folder).mkdir(exist_ok=True)

    # Loop through PDFs
    for file in source.glob("*.pdf"):
        text = extract_text_from_pdf(file).lower()
        placed = False

        for word, folder in TARGETS.items():
            if word.lower() in text:
                shutil.move(str(file), str(source / folder / file.name))
                print(f"Moved {file.name} to {folder}")
                placed = True
                break

        if not placed:
            print(f"No match found in {file.name}")

if __name__ == "__main__":
    main()

```

## Submit Claim

https://www.va.gov/family-and-caregiver-benefits/health-and-disability/champva/file-champva-claim-10-7959a/introduction

