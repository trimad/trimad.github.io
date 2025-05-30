---
author: Tristan Madden
categories: [Python]
date: 2023-12-14
draft: false
summary: "An experimental approach to extracting structured knowledge graphs from literary text using Mistral-7B LLM, demonstrated with the opening passage of The Hobbit and visualized as connected node-edge relationships."
tags: [python, knowledge-graphs, llm, nlp, data-visualization, mistral-7b]
title: "Generating Knowledge Graphs with LLMs and PyVis"
toc: true
usePageBundles: true
---

* The <a href="https://towardsdatascience.com/how-to-convert-any-text-into-a-graph-of-concepts-110844f22a1a">original post</a>.

* The model being used is <a href="https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2">mistralai/Mistral-7B-Instruct-v0.2</a>.

* The UI I'm using for inference is oobabooga's <a href="https://github.com/oobabooga/text-generation-webui">text-generation-webui</a>.

## Input
I am using the first page of The Hobbit as a test input.
```
In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the
ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down
on or to eat: it was a hobbit­hole, and that means comfort.
It had a perfectly round door like a porthole, painted green, with a shiny yellow brass knob
in the exact middle. The door opened on to a tube­shaped hall like a tunnel: a very comfortable
tunnel without smoke, with panelled walls, and floors tiled and carpeted, provided with polished
chairs, and lots and lots of pegs for hats and coats ­ the hobbit was fond of visitors. The tunnel
wound on and on, going fairly but not quite straight into the side of the hill ­ The Hill, as all the
people for many miles round called it ­ and many little round doors opened out of it, first on
one side and then on another. No going upstairs for the hobbit: bedrooms, bathrooms, cellars,
pantries (lots of these), wardrobes (he had whole rooms devoted to clothes), kitchens,
dining­rooms, all were on the same floor, and indeed on the same passage. The best rooms
were all on the left­hand side (going in), for these were the only ones to have windows,
deep­set round windows looking over his garden and meadows beyond, sloping down to the
river.
This hobbit was a very well­to­do hobbit, and his name was Baggins. The Bagginses had
lived in the neighbourhood of The Hill for time out of mind, and people considered them very
respectable, not only because most of them were rich, but also because they never had any
adventures or did anything unexpected: you could tell what a Baggins would say on any
question without the bother of asking him. This is a story of how a Baggins had an adventure,
found himself doing and saying things altogether unexpected. He may have lost the
neighbours' respect, but he gained­well, you will see whether he gained anything in the end.
The mother of our particular hobbit … what is a hobbit? I suppose hobbits need some
description nowadays, since they have become rare and shy of the Big People, as they call us.
They are (or were) a little people, about half our height, and smaller than the bearded Dwarves.
Hobbits have no beards. There is little or no magic about them, except the ordinary everyday
sort which helps them to disappear quietly and quickly when large stupid folk like you and me
come blundering along, making a noise like elephants which they can hear a mile off. They are
inclined to be at in the stomach; they dress in bright colours (chiefly green and yellow); wear
no shoes, because their feet grow natural leathery soles and thick warm brown hair like the
stuff on their heads (which is curly); have long clever brown fingers, good­natured faces, and
laugh deep fruity laughs (especially after dinner, which they have twice a day when they can
get it). Now you know enough to go on with. As I was saying, the mother of this hobbit ­ of
Bilbo Baggins, that is ­ was the fabulous Belladonna Took, one of the three remarkable
daughters of the Old Took, head of the hobbits who lived across The Water, the small river that
ran at the foot of The Hill. It was often said (in other families) that long ago one of the Took
ancestors must have taken a fairy wife. That was, of course, absurd, but certainly there was
still something not entirely hobbit­like about them, ­ and once in a while members of the
Took­clan would go and have adventures. They discreetly disappeared, and the family hushed
it up; but the fact remained that the Tooks were not as respectable as the Bagginses, though
they were undoubtedly richer. Not that Belladonna Took ever had any adventures after she
became Mrs. Bungo Baggins. Bungo, that was Bilbo's father, built the most luxurious
hobbit­hole for her (and partly with her money) that was to be found either under The Hill or
over The Hill or across The Water, and there they remained to the end of their days. Still it is
probable that Bilbo, her only son, although he looked and behaved exactly like a second edition
of his solid and comfortable father, got something a bit queer in his makeup from the Took
side, something that only waited for a chance to come out. The chance never arrived, until
Bilbo Baggins was grown up, being about fifty years old or so, and living in the beautiful
hobbit­hole built by his father, which I have just described for you, until he had in fact
apparently settled down immovably.
By some curious chance one morning long ago in the quiet of the world, when there was
less noise and more green, and the hobbits were still numerous and prosperous, and Bilbo
Baggins was standing at his door after breakfast smoking an enormous long wooden pipe that
reached nearly down to his woolly toes (neatly brushed) ­ Gandalf came by. Gandalf! If you had
heard only a quarter of what I have heard about him, and I have only heard very little of all
there is to hear, you would be prepared for any sort I of remarkable tale. Tales and adventures
sprouted up all over the place wherever he went, in the most extraordinary fashion. He had not
been down that way under The Hill for ages and ages, not since his friend the Old Took died, in
fact, and the hobbits had almost forgotten what he looked like. He had been away over The Hill
and across The Water on business of his own since they were all small hobbit­boys and
hobbit­girls.
```

## Output

```json
[
    {
        "node_1": "hobbit",
        "node_2": "hobbit-hole",
        "edge": "A hobbit lives in a hobbit-hole."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "tunnel-shaped hall",
        "edge": "A hobbit-hole has a tunnel-shaped hall."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "The Hill",
        "edge": "A hobbit-hole is located in The Hill."
    },
    {
        "node_1": "hobbit",
        "node_2": "Bilbo Baggins",
        "edge": "Bilbo Baggins is a hobbit."
    },
    {
        "node_1": "hobbit",
        "node_2": "Bungo Baggins",
        "edge": "Bungo Baggins is a hobbit and Bilbo Baggins' father."
    },
    {
        "node_1": "hobbit",
        "node_2": "Belladonna Took",
        "edge": "Bilbo Baggins' mother is Belladonna Took."
    },
    {
        "node_1": "hobbit",
        "node_2": "Gandalf",
        "edge": "Gandalf meets Bilbo Baggins."
    },
    {
        "node_1": "hobbit",
        "node_2": "Old Took",
        "edge": "The Tooks are hobbits and ancestors of Bilbo Baggins."
    },
    {
        "node_1": "hobbit",
        "node_2": "Bagginses",
        "edge": "The Bagginses are a hobbit family."
    },
    {
        "node_1": "hobbit",
        "node_2": "Tooks",
        "edge": "The Tooks are a hobbit family."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "luxurious",
        "edge": "Bilbo Baggins' hobbit-hole is luxurious."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "comfortable",
        "edge": "Bilbo Baggins' hobbit-hole is comfortable."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "panelled walls",
        "edge": "Bilbo Baggins' hobbit-hole has panelled walls."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "tiled and carpeted floors",
        "edge": "Bilbo Baggins' hobbit-hole has tiled and carpeted floors."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "polished chairs",
        "edge": "Bilbo Baggins' hobbit-hole has polished chairs."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "lots of pegs",
        "edge": "Bilbo Baggins' hobbit-hole has lots of pegs."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "round doors",
        "edge": "Bilbo Baggins' hobbit-hole has round doors."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "porthole-shaped door",
        "edge": "Bilbo Baggins' hobbit-hole has a porthole-shaped door."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "green door",
        "edge": "Bilbo Baggins' hobbit-hole has a green door."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "yellow brass knob",
        "edge": "Bilbo Baggins' hobbit-hole has a yellow brass knob."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "tube-shaped hall",
        "edge": "Bilbo Baggins' hobbit-hole has a tube-shaped hall."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "passage",
        "edge": "Bilbo Baggins' hobbit-hole has a passage."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "bedrooms",
        "edge": "Bilbo Baggins' hobbit-hole has bedrooms."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "bathrooms",
        "edge": "Bilbo Baggins' hobbit-hole has bathrooms."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "cellars",
        "edge": "Bilbo Baggins' hobbit-hole has cellars."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "pantries",
        "edge": "Bilbo Baggins' hobbit-hole has pantries."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "wardrobes",
        "edge": "Bilbo Baggins' hobbit-hole has wardrobes."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "kitchens",
        "edge": "Bilbo Baggins' hobbit-hole has kitchens."
    },
    {
        "node_1": "hobbit-hole",
        "node_2": "dining-rooms",
        "edge": "Bilbo Baggins' hobbit-hole has dining-rooms."
    },
    {
        "node_1": "hobbit",
        "node_2": "well-to-do",
        "edge": "Bilbo Baggins is well-to-do."
    },
    {
        "node_1": "hobbit",
        "node_2": "respectable",
        "edge": "Bilbo Baggins is considered respectable."
    },
    {
        "node_1": "hobbit",
        "node_2": "adventures",
        "edge": "Bilbo Baggins has adventures."
    },
    {
        "node_1": "hobbit",
        "node_2": "unexpected things",
        "edge": "Bilbo Baggins does unexpected things."
    },
    {
        "node_1": "hobbit",
        "node_2": "Gandalf",
        "edge": "Bilbo Baggins meets Gandalf."
    },
    {
        "node_1": "hobbit",
        "node_2": "Big People",
        "edge": "Hobbits consider Big People as large and stupid."
    },
    {
        "node_1": "hobbit",
        "node_2": "elephants",
        "edge": "Hobbits can hear elephants coming from a mile away."
    },
    {
        "node_1": "hobbit",
        "node_2": "green and yellow",
        "edge": "Hobbits dress in bright green and yellow colors."
    },
    {
        "node_1": "hobbit",
        "node_2": "no shoes",
        "edge": "Hobbits do not wear shoes."
    },
    {
        "node_1": "hobbit",
        "node_2": "natural leathery soles",
        "edge": "Hobbits have natural leathery soles."
    },
    {
        "node_1": "hobbit",
        "node_2": "thick warm brown hair",
        "edge": "Hobbits have thick warm brown hair."
    },
    {
        "node_1": "hobbit",
        "node_2": "long clever brown fingers",
        "edge": "Hobbits have long clever brown fingers."
    },
    {
        "node_1": "hobbit",
        "node_2": "good-natured faces",
        "edge": "Hobbits have good-natured faces."
    },
    {
        "node_1": "hobbit",
        "node_2": "deep fruity laughs",
        "edge": "Hobbits laugh deeply and fruitily."
    },
    {
        "node_1": "hobbit",
        "node_2": "Bagginses",
        "edge": "The Bagginses are a hobbit family."
    },
    {
        "node_1": "hobbit",
        "node_2": "Tooks",
        "edge": "The Tooks are a hobbit family."
    },
    {
        "node_1": "hobbit",
        "node_2": "Old Took",
        "edge": "The Old Took is a hobbit and ancestor of Bilbo Baggins."
    },
    {
        "node_1": "hobbit",
        "node_2": "fairy wife",
        "edge": "It is said that one of the Took ancestors took a fairy wife."
    },
    {
        "node_1": "hobbit",
        "node_2": "adventures",
        "edge": "The Tooks have adventures."
    },
    {
        "node_1": "hobbit",
        "node_2": "disappear quietly and quickly",
        "edge": "Hobbits can disappear quietly and quickly."
    },
    {
        "node_1": "hobbit",
        "node_2": "stupid folk",
        "edge": "Hobbits consider Big People as stupid."
    },
    {
        "node_1": "hobbit",
        "node_2": "elephants",
        "edge": "Hobbits can hear elephants coming from a mile away."
    },
    {
        "node_1": "hobbit",
        "node_2": "green and yellow",
        "edge": "Hobbits dress in bright green and yellow colors."
    },
    {
        "node_1": "hobbit",
        "node_2": "no shoes",
        "edge": "Hobbits do not wear shoes."
    },
    {
        "node_1": "hobbit",
        "node_2": "natural leathery soles",
        "edge": "Hobbits have natural leathery soles."
    },
    {
        "node_1": "hobbit",
        "node_2": "thick warm brown hair",
        "edge": "Hobbits have thick warm brown hair."
    },
    {
        "node_1": "hobbit",
        "node_2": "long clever brown fingers",
        "edge": "Hobbits have long clever brown fingers."
    },
    {
        "node_1": "hobbit",
        "node_2": "good-natured faces",
        "edge": "Hobbits have good-natured faces."
    },
    {
        "node_1": "hobbit",
        "node_2": "deep fruity laughs",
        "edge": "Hobbits laugh deeply and fruitily."
    },
    {
        "node_1": "hobbit",
        "node_2": "The Hill",
        "edge": "The Hill is the location of Bilbo Baggins' hobbit-hole."
    },
    {
        "node_1": "hobbit",
        "node_2": "quiet of the world",
        "edge": "The world was quieter in the past."
    },
    {
        "node_1": "hobbit",
        "node_2": "less noise",
        "edge": "There was less noise in the world in the past."
    },
    {
        "node_1": "hobbit",
        "node_2": "more green",
        "edge": "The world was greener in the past."
    },
    {
        "node_1": "hobbit",
        "node_2": "hobbits were numerous and prosperous",
        "edge": "Hobbits were numerous and prosperous in the past."
    }
]
```

## Visualize Graph

This script assumes `graph.json` exists in the same directory.

### Install dependencies
```
pip install networkx
```
```
pip install pyvis
```

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
file_path = os.path.join(os.path.dirname(__file__), 'graph.json')

# Load data from JSON file
with open(file_path, 'r') as file:
    data = json.load(file)

# Create a NetworkX graph
G = nx.Graph()

# Add nodes and edges from the data
for item in data:
    G.add_node(item["node_1"])
    G.add_node(item["node_2"])
    G.add_edge(item["node_1"], item["node_2"], title=item["edge"])

# Detect communities
communities_generator = nx.community.girvan_newman(G)
top_level_communities = next(communities_generator)
next_level_communities = next(communities_generator)
communities = sorted(map(sorted, next_level_communities))

# Create a PyVis network from the NetworkX graph
net = Network(height="1100px", width='100%', notebook=False, select_menu=True)

# Assign different random colors to different communities
for community in communities:
    color = generate_random_color()
    for node in community:
        net.add_node(node, node, color=color)

# Add edges
for edge in G.edges(data=True):
    net.add_edge(edge[0], edge[1], title=edge[2]['title'])

# Add additional options for better visualization
net.set_options("""
var options = {
  "nodes": {
    "font": {
      "size": 14
    }
  },
  "edges": {
    "color": {
      "inherit": true
    },
    "smooth": false
  },
  "physics": {
    "barnesHut": {
      "gravitationalConstant": -80000,
      "centralGravity": 0.3,
      "springLength": 200,
      "springConstant": 0.04,
      "damping": 0.09,
      "avoidOverlap": 0.1
    },
    "minVelocity": 0.75
  }
}
""")

# Save the network
#net.show("network.html")
net.write_html("network.html", local=True, notebook=False, open_browser=True)
```
