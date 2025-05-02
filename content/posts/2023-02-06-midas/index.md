---
author: Tristan Madden
categories: [python]
date: 2023-02-06
featured: true
lastmod: 2023-02-06
tags: [ai, video, depth map]
title: MiDaS
usePageBundles: true
thumbnail: "thumbnail.png"
---

<h3><a href="https://github.com/isl-org/MiDaS">GitHub Repository</a></h3>

During installation, I ran into an issue where the CUDA package wasn't found. Had to modify environment.yaml to:

```Shell
name: midas-py310
channels:
  - pytorch
  - defaults
dependencies:
  - nvidia::cuda-toolkit=11.7.0
  - python=3.10.8
  - pytorch::pytorch=1.13.0
  - torchvision=0.14.0
  - pip=22.3.1
  - numpy=1.23.4
  - pip:
    - opencv-python==4.6.0.66
    - imutils==0.5.4
    - timm==0.6.12
    - einops==0.6.0
```
Commands that were helpful for troubleshooting CUDA:

```Shell
conda list env
conda env remove -n midas-py310
python -m torch.utils.collect_env
nvidia-smi
conda install cudatoolkit
```


```Shell
conda install -c "nvidia/label/cuda-11.7.0" cuda-toolkit
```

<h2>Activate the Conda environment</h2>

```Shell
conda activate midas-py310
```
<h2>Run MiDaS</h2>
From the Conda Shell, cd to the MiDaS directory

```Shell
cd C:\Users\trima\MiDaS
```

Place the image frames you would like to process in the "input" directory and run one of the following commands:

```Shell
# dpt_beit_large_512
python run.py --model_type dpt_beit_large_512 --input_path input --output_path output --grayscale --optimize
# dpt_swin2_large_384
python run.py --model_type dpt_swin2_large_384 --input_path input --output_path output --grayscale --optimize
# dpt_swin2_tiny_256
python run.py --model_type dpt_swin2_tiny_256 --input_path input --output_path output --grayscale --optimize
```

For "inferno" color mapping, omit the --grayscale flag.