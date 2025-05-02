---
author: Tristan Madden
categories: [JavaScript, Python]
date: 2023-02-05
featured: true
featureImage: "thumbnail.gif"
lastmod: 2023-03-16
summary: "Stable Diffusion is an image generation technique that uses a diffusion process to iteratively generate images. It starts with a noise image and applies a series of transformations to it, where each transformation adds a little bit of noise to the image. These transformations are repeated over multiple time steps, and the amount of noise added is gradually decreased over time. This process smooths out the noise and generates a high-quality image. The stability of the diffusion process is maintained by scaling the added noise based on the image's current state, preventing the image from diverging or collapsing into a uniform color. Stable Diffusion is a powerful and versatile image generation technique that can produce realistic, high-resolution images with fine details and a wide range of styles."
tags: [ai, images, video]
thumbnail: "thumbnail.gif"
title: Stable Diffusion Scripts
toc: true
usePageBundles: true
---

## Data Grooming

### Numbering PNG files in a folder in sequence

```Python
import os
import pathlib

try:
    collection = os.getcwd()
    num_files_renamed = 0
    for i, filename in enumerate(os.listdir(collection)):
        file_extension = pathlib.Path(filename).suffix
        if file_extension == ".png" or file_extension == ".jpg":
            new_filename = f"{str(i).zfill(5)}.png"
            old_path = os.path.join(collection, filename)
            new_path = os.path.join(collection, new_filename)
            os.rename(old_path, new_path)
            num_files_renamed += 1
            print(f"Renamed file {filename} to {new_filename}")
    print(f"Renamed {num_files_renamed} files.")
except Exception as e:
    print(f"Error occurred: {e}")
```
This Python script renames all PNG and JPG files in the current working directory by adding a sequential number to the beginning of the filename, padded with leading zeros, and changing the file extension to PNG. It uses the os and pathlib modules to access the file system and the try-except block to catch any errors that may occur during file renaming. The script also prints progress messages to the console, showing the original and new filenames of each file that is renamed.

## Delete every other image in a folder

```Python
import os

# get the current working directory
cwd = os.getcwd()

# get a list of all the files in the directory
files = os.listdir(cwd)

# loop through the list of files
for i, file in enumerate(files):
    # check if the file is an image file
    if file.endswith('.jpg') or file.endswith('.jpeg') or file.endswith('.png'):
        # delete every other image file
        if i % 2 == 1:
            os.remove(file)
```

### Distance Sort

```Python
import os
from PIL import Image
from math import sqrt

folder_path = 'C:/Users/trima/FILM/photos'
image_files = os.listdir(folder_path)

# Open the first image and get its RGB values
first_image = Image.open(os.path.join(folder_path, image_files[0]))
first_image_rgb = first_image.getdata()

# Create a list to store the distances
distances = []

# Iterate over the remaining images in the folder
for image_file in image_files[1:]:
    if image_file.endswith('.png'):
        image = Image.open(os.path.join(folder_path, image_file))
        image_rgb = image.getdata()
        distance = 0
        for i in range(len(first_image_rgb)):
            distance += sqrt((first_image_rgb[i][0]-image_rgb[i][0])**2 + (first_image_rgb[i][1]-image_rgb[i][1])**2 + (first_image_rgb[i][2]-image_rgb[i][2])**2)
        print((distance, image_file))
        distances.append((distance, image_file))

# Sort the distances list by distance
distances.sort()

# Rename the first image to "0000.png"
os.rename(os.path.join(folder_path, image_files[0]), os.path.join(folder_path, "0000.png"))

# Rename each image to the next number in the sequence
for i in range(len(distances)):
    os.rename(os.path.join(folder_path, distances[i][1]), os.path.join(folder_path, str(i+1).zfill(4) + '.png'))
```

This script is a Python script that renames a sequence of PNG images in a folder based on the distance of their RGB values from the RGB values of the first image in the sequence. The script imports the os, PIL and math modules, it sets the folder path where the images are located and get the list of all files in that folder. It opens the first image and gets its RGB values, then creates an empty list to store the distances. It iterates over the remaining images in the folder, if the file is a png it opens the image and gets its RGB values. Then it calculates the distance between the RGB values of the current image and the first image using the Euclidean distance formula, appends the distance and the image name to the distance list. The script then sorts the distance list by the distance, renames the first image to "0000.png" and renames each image to the next number in the sequence using the os.rename() function, and 4 digits zero-padded number followed by the extension.

## Color Grading
### By Mean

```Python
import os
import cv2
import numpy as np

def average_color_grading():
    # Get all image filenames in the same directory as the script
    filenames = [f for f in os.listdir() if f.endswith('.jpg') or f.endswith('.png')]
    
    # Initialize a sum of color grading for all images
    color_grading_sum = None
    
    # Iterate through all images, adding each image's color grading to the sum
    for filename in filenames:
        print("averaging " + filename)
        image_path = filename
        image = cv2.imread(image_path)
        
        # Average color grading of an image is computed as mean of its pixels
        color_grading = np.mean(image, axis=(0, 1))
        
        # Add the color grading of the current image to the sum
        if color_grading_sum is None:
            color_grading_sum = color_grading
        else:
            color_grading_sum += color_grading
    
    # Divide the sum of color grading by the number of images to get the average color grading
    average_color_grading = color_grading_sum / len(filenames)
    
    return average_color_grading

def apply_color_grading(average_color_grading):
    # Get all image filenames in the same directory as the script
    filenames = [f for f in os.listdir() if f.endswith('.jpg') or f.endswith('.png')]
    
    # Create a new folder to save the color graded frames
    color_graded_folder = os.path.join(os.getcwd(), 'color_graded')
    os.makedirs(color_graded_folder, exist_ok=True)
    
    # Iterate through all images, applying the average color grading to each frame
    for i, filename in enumerate(filenames):
        print("color grading " + filename)
        image_path = filename
        image = cv2.imread(image_path)
        
        # Subtract the average color grading from each pixel to apply the color grading
        color_graded_image = image - np.mean(image, axis=(0, 1)) + average_color_grading
        
        # Zero-pad the sequential number and save the color graded image with the zero-padded sequential number
        color_graded_image_path = os.path.join(color_graded_folder, str(i).zfill(5) + '.png')
        cv2.imwrite(color_graded_image_path, color_graded_image)

average_color_grading = average_color_grading()
apply_color_grading(average_color_grading)

```
This program applies color grading to a set of images stored in the "images" folder. It does so by first computing the average color grading of all the images and then subtracting the average color grading from each pixel of each image and adding the average color grading. The resulting color graded images are saved in a new folder called "color_graded" within the "images" folder. It applies the average color grading to each frame by subtracting the mean of each frame's pixels from each pixel and adding the average color grading. 

## Generate CFG values for X/Y plot

```JavaScript
let frames = 60;
let str = "";
function setup() {
  noLoop();
  for (let i = 0; i <= frames; i++) {
    let x = map(i, 0, frames, 6, 9);
    str += nf(x,1,2);
    str += i < frames ? ", " : "";
  }
  print(str);
}
```

## Add a vignette fade

Fades from bottom to top. Great for hiding mistakes and artifacts. 

```Shell
from PIL import Image
import os
import threading

# Get the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

class VignetteThread(threading.Thread):
    def __init__(self, filename):
        threading.Thread.__init__(self)
        self.filename = filename

    def run(self):
        # Open the image file
        image = Image.open(os.path.join(script_dir, self.filename))
        
        # Define the size of the vignette black fade
        fade_height = 256
        
        # Create a black mask with the same size as the image
        mask = Image.new("L", image.size, 255)
        
        # Draw a linear gradient from white to black on the mask
        for y in range(image.size[1] - fade_height, image.size[1]):
            alpha = int(255 * (y - (image.size[1] - fade_height)) / fade_height)
            mask.paste(255 - alpha, (0, y, image.size[0], y+1))
        
        # Apply the mask to the image
        image.putalpha(mask)
        
        # Save the modified image with a new filename
        new_filename = os.path.splitext(self.filename)[0] + "_vignette.png"
        image.save(os.path.join(script_dir, new_filename))

# Loop through each file in the directory and create a thread for each image
threads = []
for filename in os.listdir(script_dir):
    if filename.endswith(".jpg") or filename.endswith(".png"):
        thread = VignetteThread(filename)
        threads.append(thread)
        thread.start()

# Wait for all threads to complete
for thread in threads:
    thread.join()

```

## Pixelate

Stable Diffusion is pretty bad at making convincing looking pixel art. This script post-processes images by average 4x4 clusters of pixels as well as rounding RGB values to MOD4 to reduce the color palette.
![](animooted.gif)

```Python
from PIL import Image
import os

# Define the pixel size of the grid
GRID_SIZE = 4

# Helper function to round a color channel to the nearest multiple of 4
def round_to_mod4(value):
    return 4 * round(value / 4)

# Create the output directory if it doesn't exist
if not os.path.exists('output'):
    os.makedirs('output')

# Iterate through all files in the current directory
for filename in os.listdir('.'):
    if filename.endswith('.png') or filename.endswith('.jpg'):
        # Open the image and get its size
        image = Image.open(filename)
        width, height = image.size
        
        # Create a new blank image to hold the pixelated version
        pixelated = Image.new('RGB', (width, height), color='white')
        
        # Loop through each 2x2 pixel grid in the image
        for x in range(0, width, GRID_SIZE):
            for y in range(0, height, GRID_SIZE):
                # Get the colors of the 4 pixels in the grid
                colors = []
                for i in range(GRID_SIZE):
                    for j in range(GRID_SIZE):
                        if x+i < width and y+j < height:
                            colors.append(image.getpixel((x+i, y+j)))
                
                # Calculate the average color of the grid, rounding each channel to the nearest multiple of 4
                avg_color = tuple(round_to_mod4(sum(c)/len(c)) for c in zip(*colors))
                
                # Set all 4 pixels in the grid to the average color
                for i in range(GRID_SIZE):
                    for j in range(GRID_SIZE):
                        if x+i < width and y+j < height:
                            pixelated.putpixel((x+i, y+j), avg_color)
        
        # Save the pixelated image with a new filename in the output directory
        new_filename = 'pixelated_' + filename
        output_path = os.path.join('output', new_filename)
        pixelated.save(output_path)
```