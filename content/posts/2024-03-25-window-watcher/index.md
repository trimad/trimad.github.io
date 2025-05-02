---
author: Tristan Madden
categories: [Python]
date: 2024-03-25
#lastmod: 2023-10-17
draft: false
featured: true
summary: "Use a machine vision model to watch a window."
tags: [Python]
thumbnail: "thumbnail.png"
title: "Window Watcher"
toc: true
usePageBundles: true
---

Github Repository: <a href="https://github.com/vikhyat/moondream">Window Watcher</a>

## Server-Side

### Setup Environment

I am using the moondream2 model for fast inference. 

Model Repository: <a href="https://github.com/vikhyat/moondream">Moondream on GitHub</a>

Take the server.py script from this repo: Github Repository: <a href="https://github.com/vikhyat/moondream">Window Watcher</a>

```
git clone https://github.com/vikhyat/moondream.git
cd moondream
python -m venv venv
venv\Scripts\activate
cd ../
pip install -r requirements.txt
pip3 install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu121
pip install flask
```
Confirm CUDA is working, or else the script will fall back onto the GPU.
```shell
nvcc --version
```

### Server-Side Script

```python
from flask import Flask, request, jsonify
from PIL import Image
from io import BytesIO

import argparse
import torch
import re
import time
import gradio as gr
from moondream import detect_device, LATEST_REVISION
from threading import Thread
from transformers import TextIteratorStreamer, AutoTokenizer, AutoModelForCausalLM

app = Flask(__name__)

parser = argparse.ArgumentParser()
parser.add_argument("--cpu", action="store_true")
args = parser.parse_args()

if args.cpu:
    device = torch.device("cpu")
    dtype = torch.float32
else:
    device, dtype = detect_device()
    if device != torch.device("cpu"):
        print("Using device:", device)
        print("If you run into issues, pass the `--cpu` flag to this script.")
        print()
        
# Initialize the model
model_id = "vikhyatk/moondream2"
tokenizer = AutoTokenizer.from_pretrained(model_id, revision=LATEST_REVISION)
moondream = AutoModelForCausalLM.from_pretrained(
    model_id, trust_remote_code=True, revision=LATEST_REVISION
).to(device=device, dtype=dtype)
moondream.eval()

@app.route('/itt', methods=['POST'])
def get_answer():
    if 'image' not in request.files or 'prompt' not in request.form:
        return jsonify({"error": "Missing image file or prompt"}), 400

    image_file = request.files['image']
    prompt = request.form['prompt']

    image = Image.open(BytesIO(image_file.read()))

    # Ensure image size is optimal for the model
    # image = image.resize((optimal_width, optimal_height))

    image_embeds = moondream.encode_image(image)

    answer = moondream.answer_question(image_embeds, prompt, tokenizer)
    
    return jsonify({"text": answer})

if __name__ == "__main__":
    # Disable debug for production
    app.run(debug=True)

```

## Client-Side

POST `http://127.0.0.1:5000/itt`

### Client-Side Script

