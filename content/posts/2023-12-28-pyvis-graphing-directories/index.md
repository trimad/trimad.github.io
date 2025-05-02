---
author: Tristan Madden
categories: [Python]
date: 2023-12-28
#lastmod: 2023-10-17
draft: true
featured: true
summary: ""
tags: [Python]
thumbnail: "thumbnail.png"
title: "Graphing a Windows directory with pyvis"
toc: true
usePageBundles: true
---


## Install Dependencies

```Shell
pip install --upgrade pip
pip install --upgrade pyvis
pip install --upgrade networkx

```

## Generate a JSON representation of a Windows directory

```python
import os
import json

# List of folders to be excluded from the folder structure
excluded_folders = [".git", "node_modules", ".bin"]

def create_folder_structure_json(dir_path):
    folder_structure = {}
    for root, dirs, files in os.walk(dir_path):
        # Check if any excluded folders are in the current directory
        dirs[:] = [d for d in dirs if d not in excluded_folders]

        current_folder = folder_structure
        folders = os.path.relpath(root, dir_path).split(os.path.sep)
        for folder in folders:
            if folder not in excluded_folders:
                current_folder = current_folder.setdefault(folder, {})
    return folder_structure

def save_to_json(data, output_file):
    with open(output_file, 'w') as json_file:
        json.dump(data, json_file, indent=4)

if __name__ == "__main__":
    directory_path = input("Enter the directory path: ")
    if os.path.exists(directory_path) and os.path.isdir(directory_path):
        folder_structure = create_folder_structure_json(directory_path)
        output_file = "folder_structure.json"
        save_to_json(folder_structure, output_file)
        print(f"Folder structure saved to {output_file}")
    else:
        print("Invalid directory path or directory does not exist.")
```

## Visualize Graph

```python
import json
import os
import random
from pyvis.network import Network
import networkx as nx

def generate_random_color():
    """Generate a random hex color."""
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

# Path to the JSON file
file_path = os.path.join(os.path.dirname(__file__), 'folder_structure.json')

# Load data from JSON file
with open(file_path, 'r') as file:
    data = json.load(file)

# Create a NetworkX graph
G = nx.Graph()

# Function to recursively add nodes and edges to the graph
def add_nodes_and_edges(parent, node_dict):
    for node, sub_dict in node_dict.items():
        full_node = os.path.join(parent, node) if parent != '.' else node
        G.add_node(full_node)
        if sub_dict:
            for sub_node in sub_dict:
                G.add_edge(full_node, os.path.join(full_node, sub_node))
            add_nodes_and_edges(full_node, sub_dict)

# Start by adding the root node
G.add_node('.')
add_nodes_and_edges('.', data)

# Create a PyVis network from the NetworkX graph
# https://pyvis.readthedocs.io/en/latest/_modules/pyvis/network.html
net = Network(
    notebook=False,
    bgcolor="#1a1a1a",
    #cdn_resources="remote",
    height="93vh",
    width="100%",
    select_menu=True,
    font_color="#cccccc",
    # filter_menu=True,
    directed=False,
    layout="hierarchical"
)

# Assign different random colors to different nodes
for node in G.nodes():
    color = generate_random_color()
    # Get the folder name (last part of the path)
    folder_name = os.path.basename(node)
    net.add_node(node, folder_name, color=color)

# Add edges
for edge in G.edges():
    net.add_edge(edge[0], edge[1])

net.repulsion(node_distance=256, spring_length=512)
net.show_buttons()

# Save the network
net.write_html("folder_structure_network.html", local=True, notebook=False, open_browser=True)
```