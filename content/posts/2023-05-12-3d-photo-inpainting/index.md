---
author: Tristan Madden
categories: [python]
date: 2023-05-11
draft: true
summary: 
tags: [ai]
thumbnail: thumbnail.png
title: 3D Photo Inpainting
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