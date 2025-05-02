---
author: Tristan Madden
categories: [Python]
date: 2024-08-30
draft: false
featured: false
summary: "This Python script gradually reduces the quality and colors of all .png's in the same directory until a target size is reached."
tags: [PIL]
thumbnail: "thumbnail.png"
title: "Batch Compress Images"
toc: true
usePageBundles: true
---

This Python script gradually reduces the quality and colors of all .png's in the same directory until a target size is reached.

```python
from PIL import Image, ImageEnhance
import os
 
# Define the target size in bytes
TARGET_SIZE = 1048576/3
 
def reduce_image_size(input_image_path, output_image_path):
    # Load the image
    image = Image.open(input_image_path)
    
    # Convert image to RGB if it's not (necessary for JPEG format)
    if image.mode != 'RGB':
        image = image.convert('RGB')
 
    # Start with full color depth
    colors = 256
 
    # Initial quality
    quality = 95
 
    # Initialize step counter
    quality_steps = 0
 
    # Save image with decreasing quality and color depth until size is less than target size
    while True:
        # Use dithering when reducing color depth
        if colors < 256:  # Apply dithering only when color depth is reduced
            palette_image = image.quantize(colors=colors, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
        else:
            palette_image = image
        
        # Convert the palette image back to RGB for JPEG saving
        rgb_image = palette_image.convert('RGB')
 
        # Save the image with the current quality and reduced color depth
        rgb_image.save(output_image_path, format='JPEG', quality=quality, optimize=True, progressive=True)
        
        # Check the size of the saved image
        size = os.path.getsize(output_image_path)
 
        print(f"Processing {input_image_path} -> Quality: {quality}, Colors: {colors}, Size: {size / 1024:.2f} KB")
        
        # If the image size is below the target size, break the loop
        if size < TARGET_SIZE:
            break
        
        # Reduce the quality two times before reducing color depth
        if quality_steps < 2:
            # Decrease the quality for the next iteration
            quality -= 1
            quality_steps += 1
            # Ensure the quality does not go below 1
            if quality < 1:
                print("Quality is at minimum.")
                break
        else:
            # Reset the quality step counter and reduce color depth
            quality_steps = 0
            # Reduce the number of colors
            colors = max(16, colors - 1)  # Reduce colors by 1 each time, down to a minimum of 16 colors
            # Ensure the color depth does not go below 16
            if colors <= 16:
                print("Color depth is at minimum.")
                break
 
def optimize_directory_images(directory_path):
    # List all files in the directory
    for filename in os.listdir(directory_path):
        # Process only PNG files
        if filename.lower().endswith('.png'):
            input_image_path = os.path.join(directory_path, filename)
            output_image_path = os.path.join(directory_path, filename.replace('.png', '.jpg'))
            
            # Reduce image size and save as JPEG
            reduce_image_size(input_image_path, output_image_path)
 
# Example usage
directory_path = '.'  # Path to the directory containing PNG images (use '.' for the current directory)
optimize_directory_images(directory_path)
```
