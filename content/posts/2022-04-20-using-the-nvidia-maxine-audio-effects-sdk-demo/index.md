---
title: NVIDIA Maxine Windows Audio Effects SDK
author: Tristan Madden
date: 2022-04-20
lastmod: 2023-02-25
categories: [Shell]
tags: [audio, sound, SDK]
summary: This is my tentative workflow for cleaning-up poor audio using the NVIDIA Maxine Windows Audio Effects SDK.
thumbnail: "thumbnail.png"
usePageBundles: true
---

This is my tentative workflow for cleaning-up poor audio using the NVIDIA Maxine Windows Audio Effects SDK.

<h3><a href="https://catalog.ngc.nvidia.com/orgs/nvidia/teams/maxine/resources/maxine_windows_audio_effects_sdk_ga/files">Download (requires NVIDIA developer account)</a></h3>
<h3><a href="https://docs.nvidia.com/deeplearning/maxine/audio-effects-sdk/index.html">NVIDIA Maxine Documentation</a></h3>

The Audio Effects SDK only accepts audio that is in .wav format sampled at 8000Hz single-channel, 16000Hz single-channel, or 48000Hz single-channel. This can be resampled using ffmpeg.

- Convert a .mp3 file to 8kHz, single-channel PCM:

```console
ffmpeg -i input.mp3 -ar 8000 -ac 1 8000.wav
```

- Convert a .m4a file to 16kHz, single-channel PCM:

```console
ffmpeg -i input.mp3 -ar 16000 -ac 1 16000.wav
```

- Convert a .wav file to 48kHz, single-channel PCM:

```console
ffmpeg -i input.mp3 -ar 48000 -ac 1 48000.wav
```

A config file has to be fed to a batch script. The "effects_demo" includes sample config files for different GPU architectures. I hava an NVIDIA RTX 4080, so I would customize the "denoiser48k_cfg_ada.txt" config file and run it with the "run_denoiser_48k_ada.bat" batch file. Example config:

```console
# Effect.
# Supported values are: denoiser/dereverb/dereverb_denoiser/aec/superres
effect dereverb_denoiser
# Point this to the model file.
# This indicates 48k model for denoiser effect for ADA supported GPU architecture is picked from models folder
# Similarly, this path can be modified as per user's choice of effect and sample rate (8k/16k/48k depending on effect)
model models\ada\dereverb_denoiser_48k.trtpkg
# Noisy input file
# 48k Input file is picked from denoiser folder. 
# User can modify below line to pick their own file as input.
input_wav input_files\48000.wav
# Denoised audio data will be saved to this file.
# Output can be dumped at user specifid location too. In this case, Output will be saved to current folder.
output_wav 48000.wav
# Set to 1 for real time mode i.e. audio data will be processed 
# at same speed like that of an audio input device like
# microphone. Since the denoising is faster that real time, the
# processing will be equal to audio file duration.
real_time 0
# Intensity Ratio
intensity_ratio 0.5
# Enable VAD
enable_vad 1
```