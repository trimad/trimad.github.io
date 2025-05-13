---
author: Tristan Madden
categories: [Python, AI, Image Processing]
date: 2023-05-12
draft: false
summary: "A comprehensive guide to setting up and using 3D Photo Inpainting on Windows, including Miniconda environment setup, dependency installation, and usage instructions."
tags: [python, ai, 3d-modeling, photo-editing, computer-vision, machine-learning, image-processing]
title: "3D Photo Inpainting with Python and PyTorch"
toc: true
usePageBundles: true
---


## Prerequisites

### Miniconda

<a href="https://docs.conda.io/en/latest/miniconda.html" title="https://docs.conda.io/en/latest/miniconda.html">https://docs.conda.io/en/latest/miniconda.html</a>

### Git

<a href="https://git-scm.com/download/win" title="https://git-scm.com/download/win">https://git-scm.com/download/win</a>



Get Frame Interpolation source codes:
```Shell
git clone https://github.com/bycloudai/3d-photo-inpainting-Windows
```
cd into the cloned git repository, for example:
```Shell
cd C:\Users\trima\Documents\GitHub\3d-photo-inpainting
```

Create the Miniconda virtual environment:
```Shell
conda create -n 3d-photo-inpainting pip python=3.7
```
Activate the Miniconda virtual environment:
```Shell
conda activate 3d-photo-inpainting
```
Install requirements:
The requirements.txt in this git repo is out of date and no longer works.
```Shell
pip3 install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu118
pip install opencv-python
pip install vispy
pip install moviepy
pip install transforms3d
pip install networkx
pip install cynetworkx
pip install scikit-image
pip install pyyaml==5.4.1
```