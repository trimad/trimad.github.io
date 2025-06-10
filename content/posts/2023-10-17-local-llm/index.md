---
author: Tristan Madden
categories: [Python]
date: 2023-10-17
draft: false
summary: "A guide to setting up a local large language model (LLM) environment for TheraFit, a project focused on matching clients with therapists."
tags: [python, llm, machine-learning, local-ai, therafit]
title: "Setting Up a Local Large Language Model (LLM) Environment"
toc: true
usePageBundles: true
---
TheraFit is a personal project and Large Language Model approach to matching clients to therapists.
## Environment Setup
Clone the <a href="https://github.com/Trimad/TheraFit">Git repository</a>.
```shell
git clone https://github.com/Trimad/TheraFit
```
Install <a href="https://docs.conda.io/projects/miniconda/en/latest">Miniconda</a>.


### Create the environment
```shell
conda create --name local-llm python=3.11.4 --channel conda-forge
```
```shell
conda activate local-llm
```

### Install pip requirements
```shell
pip3 install -r requirements.txt
```

### Install the Windows version of bitsandbytes
```shell
python -m pip install bitsandbytes --prefer-binary --extra-index-url=https://jllllll.github.io/bitsandbytes-windows-webui 
```

### Force reinstall torch until it works
```shell
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 --force-reinstall
```

## Test the Environment
Use the test script included in the Git repo. 
```shell
python test.py
```
If the environment is configured correctly, Torch, Transformers, Gradio and Accelerate should all return True.
```shell
C:\Users\Tristan\Documents\GitHub\TheraFit>python test.py
Torch (CUDA availability): True
Transformers: True
Gradio: True
Accelerate: True
```

## Run Therafit
```shell
python run.py
```