---
title: Record Desktop Silently
author: Tristan Madden
categories: [Shell]
tags: [ffmpeg, VBScript, bat]
date: 2022-02-09
thumbnail: "thumbnail.png"
usePageBundles: true
---

Place these 3 files in any directory and run update.vbs to begin recording a Windows session silently.

<h2><a href="https://github.com/Trimad/RecordDesktopSilently">Github Repository</a></h2>

## update.exe
* This file is just ffmpeg that's been renamed to be slightly more inconspicuous in Task Manager.

## update.bat
* There are two lines to this batch file. The first line deletes "output.mp4" if it already exists in the same directory.
* The framerate in frames per second of the recording is set here following the "-framerate" flag
* The amount of time in seconds to record is set here following the "-t" flag
* output.mp4 will be saved in the same directory after the specified amount of recording time is up. 

## update.vbs
* This Visual Basic script runs udpate.bat without a visible command prompt.
