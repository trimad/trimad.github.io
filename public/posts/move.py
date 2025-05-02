import os
import shutil

# Get the current working directory
current_dir = os.getcwd()

# Iterate through all files in the directory
for file in os.listdir(current_dir):
    # Check if the file ends with ".md"
    if file.endswith(".md"):
        # Create a folder with the same name as the file
        folder_name = os.path.splitext(file)[0]
        os.makedirs(folder_name, exist_ok=True)
        
        # Move the file to the folder and rename it to "index.md"
        new_file_path = os.path.join(folder_name, "index.md")
        shutil.move(file, new_file_path)
