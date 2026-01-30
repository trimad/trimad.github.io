---
title: "Generative Guidelines for my Rei Hugo theme"
date: 2026-01-26
description: ""
tags: [3d, force-directed, graph, hugo, visualization, taxonomy, search]
categories: [Visualization]
draft: false
toc: true
---

## CSS variables + font stacks (drop-in)
```css
/* ================================
   Rei Ayanami Canon Palette
   ================================ */

:root {
  /* Base palette */
  --rei-blue:     #9AA3D2; /* calm atmospheric background */
  --rei-surface:  #EFEDED; /* sterile panels */
  --rei-bone:     #F1E7DA; /* subtle highlight */
  --rei-red:      #CF2D2F; /* critical only */
  --rei-navy:     #20202B; /* primary ink */
  --rei-green:    #254434; /* NERV system accents */
  --rei-orange:   #D4733C; /* interaction / focus */

  /* Semantic roles */
  --bg: var(--rei-blue);
  --surface: var(--rei-surface);
  --surface-hover: var(--rei-bone);

  --text: var(--rei-navy);
  --text-muted: color-mix(in srgb, var(--rei-navy) 55%, var(--rei-blue));

  --border: color-mix(in srgb, var(--rei-navy) 15%, var(--rei-blue));
  --divider: color-mix(in srgb, var(--rei-navy) 10%, var(--rei-blue));

  --link: var(--rei-green);
  --link-hover: color-mix(in srgb, var(--rei-green) 70%, var(--rei-bone));

  --focus: var(--rei-orange);
  --danger: var(--rei-red);

  /* Shape language */
  --radius-1: 2px;
  --radius-2: 4px;
  --border-1: 1px solid var(--divider);

  /* Typography */
  --font-sans: "IBM Plex Sans","Inter","Source Sans 3",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  --font-mono: "IBM Plex Mono","JetBrains Mono","Source Code Pro",ui-monospace,Menlo,Consolas,monospace;

  /* Type scale */
  --fs-meta: 0.8125rem;
  --fs-body: 1rem;
  --fs-lead: 1.125rem;
  --fs-h3: 1.375rem;
  --fs-h2: 1.75rem;
  --fs-h1: 2.125rem;

  --lh-body: 1.65;
  --lh-tight: 1.2;

  /* Motion */
  --ease-system: cubic-bezier(0.2, 0, 0, 1);
}

```

## Generative Guidelines
```
RREI AYANAMI–INSPIRED HUGO THEME + GHOST GRAPH (3D FORCE-GRAPH)
CANON PALETTE EDITION

You are a senior creative director and front-end systems designer re-imagining an existing Hugo blog theme.

==================================================
AESTHETIC GOAL
==================================================
Design a minimalist, emotionally restrained interface inspired by Rei Ayanami’s tone
(detachment, stillness, clinical calm, isolation) from Neon Genesis Evangelion.

This is NOT anime fan art.
Do NOT use character imagery, EVA iconography, or overt anime tropes.
Translate Rei’s emotional restraint into a quiet, institutional design system.

The interface should feel observational, archival, and deliberately impersonal.

==================================================
COLOR PALETTE (STRICT / CANONICAL REI)
==================================================
Use ONLY the following colors:

#9AA3D2
#EFEDED
#254434
#D4733C 
#CF2D2F
#F1E7DA

Rules:
- No pure black, no pure white
- Red is rare and meaningful
- Orange is functional, never decorative
- Blue is atmospheric, not dominant text color
- Hierarchy relies on spacing and typography more than color

==================================================
TYPOGRAPHY (MUST FEEL “REI”)
==================================================
Primary Sans (Body + UI):
- IBM Plex Sans (preferred)
- Inter
- Source Sans 3

Secondary Mono (Metadata, Labels, Classification):
- IBM Plex Mono (preferred)
- JetBrains Mono
- Source Code Pro

Typography rules:
- Neutral, clinical, emotionally flat
- Headings are factual, not expressive
- Avoid dramatic weight contrast
- Metadata appears archival and system-driven
- No rounded, playful, or decorative typefaces

==================================================
SHAPE LANGUAGE (INSTITUTIONAL)
==================================================
Preferred:
- Rectangles and long horizontal panels
- Thin rules and inset borders
- Subtle corner radius (2–4px max)

Avoid:
- Pills, circles, bubbles
- Heavy shadows
- Organic or playful shapes

The interface should feel architectural and deliberate.

==================================================
LAYOUT & COMPOSITION
==================================================
- Generous negative space
- Left-aligned content preferred
- Subtle asymmetry allowed
- Reads like a technical archive, medical record, or classified report

Navigation must feel recessed and unemotional.

==================================================
UI COMPONENTS
==================================================
- Notices resemble system messages (SYSTEM LOG, OBSERVATION, CLASSIFIED)
- Links are understated; hover is minimal
- Focus states are deliberate and visible
- Code blocks are subdued and readable

==================================================
HUGO REQUIREMENTS
==================================================
The theme must support:
- Long-form technical writing
- Code-heavy posts
- Clean table-of-contents
- Taxonomies presented as classification systems
- Metadata treated as first-class but emotionally neutral

==================================================
GHOST GRAPH / 3D FORCE-GRAPH RESKIN (CRITICAL)
==================================================
The graph must feel like an analytical instrument, not a toy.

Canvas:
- Background: #9AA3D2
- Subtle fog using same color
- No bloom, glow, or neon effects

Nodes:
- Category nodes: #254434 (largest, authoritative)
- Tag nodes: #20202B (medium)
- Post nodes: #EFEDED (smallest)

Links:
- Color: #20202B at low opacity
- Hover: slightly increased opacity only

Labels:
- Hidden or minimal by default
- On hover/search: mono font, crisp, restrained
- Optional backing plate: translucent #F1E7DA

Interaction:
- Slow, damped orbit controls
- Click selects and pins focus
- Side panel opens like a system report
- Search is primary navigation method

==================================================
HARD AVOIDS
==================================================
- Cute UI
- Anime imagery
- High-saturation accents
- Marketing or landing-page aesthetics
- Overly rounded or playful components

==================================================
FINAL IMPRESSION
==================================================
The result should feel calm, distant, institutional, and quietly human.

Rei Ayanami — expressed as a documentation system.

```