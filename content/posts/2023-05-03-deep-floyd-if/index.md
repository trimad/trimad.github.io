---
author: Tristan Madden
categories: [Python, Shell]
date: 2023-05-03
lastmod: 2023-05-09
draft: false
tags: [ai, images]
title: Deep Floyd IF
thumbnail: "thumbnail.png"
summary: My tentative work flow for running Deep Floyd IF locally for image generation.
usePageBundles: true
toc: true
---

## Download prerequisites
1. [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
2. [Git](https://git-scm.com/download/win)

## Setup Environment
### Clone the git repo

```Shell
git clone https://github.com/deep-floyd/IF.git
```

### cd to the repo folder
_In my case:_
```Shell
cd C:\Users\trima\Documents\GitHub\IF
```

### Create the conda environment
```Shell
conda create --name IF python=3.10.10
```

### Activate the environment
```Shell
conda activate IF
```

### Install requirements
```Shell
pip install -r requirements.txt --upgrade
pip3 install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu118
```

## Setup Program

### Download the model weights from Hugging Face

{{% notice warning "WARNING" %}}
IF-I-XL-v1.0 is ~262 GB
{{% /notice %}}
```Shell
git clone https://huggingface.co/DeepFloyd/IF-I-XL-v1.0.git
```
{{% notice warning "WARNING" %}}
IF-II-L-v1 is ~182 GB
{{% /notice %}}
```Shell
git clone https://huggingface.co/DeepFloyd/IF-II-L-v1.0.git
```
{{% notice warning "WARNING" %}}
stable-diffusion-x4-upscaler is ~26.1 GB
{{% /notice %}}
```Shell
git clone https://huggingface.co/stabilityai/stable-diffusion-x4-upscaler.git
```


## Run Deep Floyd IF
Put the code below in a file called run.py. Run it in Anaconda Prompt with `python run.py`

```Python

import gc
import torch
import time

torch.cuda.set_per_process_memory_fraction(0.5)

def flush():
    gc.collect()
    torch.cuda.empty_cache()

from diffusers import DiffusionPipeline
from diffusers.utils import pt_to_pil

# stage 1
stage_1 = DiffusionPipeline.from_pretrained("./IF-I-XL-v1.0", variant="fp16", torch_dtype=torch.float16, safety_checker=None)

# stage 2
stage_2 = DiffusionPipeline.from_pretrained('./IF-II-L-v1.0', text_encoder=None, variant="fp16", torch_dtype=torch.float16, safety_checker=None)

# stage 3
stage_3 = DiffusionPipeline.from_pretrained('./stable-diffusion-x4-upscaler', torch_dtype=torch.float16, safety_checker=None)

# Memory management
stage_1.enable_sequential_cpu_offload()
stage_2.enable_model_cpu_offload()
stage_3.enable_model_cpu_offload()

# prompt
prompt = 'an anime girl wearing a shirt that says "hello world"'

# text embeds
prompt_embeds, negative_embeds = stage_1.encode_prompt(prompt)

# seed settings
time_seed = int(time.time())
generator = torch.manual_seed(time_seed)

# stage 1
image = stage_1(prompt_embeds=prompt_embeds, negative_prompt_embeds=negative_embeds, generator=generator, output_type="pt").images
pt_to_pil(image)[0].save("./if_stage_I.png")

del stage_1
flush()

# stage 2
image = stage_2(
    image=image, prompt_embeds=prompt_embeds, negative_prompt_embeds=negative_embeds, generator=generator, output_type="pt"
).images
pt_to_pil(image)[0].save("./if_stage_II.png")

del stage_2
flush()

# stage 3
image = stage_3(prompt=prompt, image=image, generator=generator, noise_level=100).images
image[0].save("./if_stage_III.png")
```

## Conclusion

My takeaways from Deep Floyd IF:
* The 16GB of VRAM in my RTX 4080 isn't enough to run the third stage, so the largest output this implementation can make is 256x256
* Deep Floyd IF has extremely slow inference times, upwards of two mintues per 256x256 image. I've played around a bit with memory management but don't know enough about Pytorch to get VRAM usage under 16GB. I got stage 3 working in CPU mode only, which sent inference times soaring over 40 minutes per 1024x1024 image.
* Community adoption has been slow, probably because of slow inference times
* Not really seeing an advantage of this over Stable Diffusion + ControlNet