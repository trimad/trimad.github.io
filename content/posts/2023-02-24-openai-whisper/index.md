---
author: Tristan Madden
categories: [Python]
date: 2023-02-24
featured: true
tags: [AI, audio]
thumbnail: "thumbnail.png"
title: OpenAI Whisper
ShowReadingTime: true
summary: "Whisper is a general-purpose speech recognition model. It is trained on a large dataset of diverse audio and is also a multi-task model that can perform multilingual speech recognition as well as speech translation and language identification."
usePageBundles: true
---

Whisper is a general-purpose speech recognition model. It is trained on a large dataset of diverse audio and is also a multi-task model that can perform multilingual speech recognition as well as speech translation and language identification.

<h3><a href="https://github.com/openai/whisper">GitHub Repository</a></h3>

<h3>Installation</h3>

```Shell
pip install git+https://github.com/openai/whisper.git 
```

<h3>Fix CUDA not detecting GPU</h3>
Whisper will default to the CPU if a GPU is not detected, which is considerably slower.

```Shell
pip uninstall torch
pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu116
```

<h3>Example usage</h3>

```Shell
# Transcribe
whisper input.mp3 --model medium.en --language en --task transcribe
# Translate
whisper japanese.wav --model large --language Japanese --task translate
```

<h3>Available models and languages</h3>

There are five model sizes, four with English-only versions, offering speed and accuracy tradeoffs. Below are the names of the available models and their approximate memory requirements and relative speed. 


|  Size  | Parameters | English-only model | Multilingual model | Required VRAM | Relative speed |
|:------:|:----------:|:------------------:|:------------------:|:-------------:|:--------------:|
|  tiny  |    39 M    |     `tiny.en`      |       `tiny`       |     ~1 GB     |      ~32x      |
|  base  |    74 M    |     `base.en`      |       `base`       |     ~1 GB     |      ~16x      |
| small  |   244 M    |     `small.en`     |      `small`       |     ~2 GB     |      ~6x       |
| medium |   769 M    |    `medium.en`     |      `medium`      |     ~5 GB     |      ~2x       |
| large  |   1550 M   |        N/A         |      `large`       |    ~10 GB     |       1x       |

For English-only applications, the .en models tend to perform better, especially for the tiny.en and base.en models.