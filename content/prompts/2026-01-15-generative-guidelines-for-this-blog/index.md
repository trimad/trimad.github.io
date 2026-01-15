---
title: "Generative Guidelines for This Hugo Blog Theme"
date: 2026-01-15
description: "Authoritative rules governing how generative systems should structure, style, and extend this Hugo blog theme."
tags: []
categories: []
draft: false
---

## Core Structural Rules

1. **Categories and tags MUST be visualized as Voronoi diagrams.**  
   Categories represent the top-level Voronoi partition of the site.

2. **The visual language of the theme MUST be inspired by _Ghost in the Shell_.**  
   This includes:
   - Muted neon accents
   - High-contrast dark backgrounds
   - Technical typography
   - A subtle cyberpunk / cybernetic aesthetic  
   (Inspiration, not imitation.)

3. **Selecting a category Voronoi cell MUST transition to a second Voronoi diagram representing tags within that category.**

4. **All Voronoi cells MUST be interactive.**  
   - Category cells link to tag-level diagrams  
   - Tag cells link to individual posts  
   - Post-level links MUST be directly clickable from the diagram

5. **Posts assigned to exactly two categories MUST appear in a derived Voronoi cell bordering both parent category cells.**  
   - The derived cell’s color MUST be an interpolation of its parent category colors  
   - Posts with more than two categories MUST ignore additional categories beyond the first two

5a. **Posts assigned to exactly two tags MUST appear in a derived Voronoi cell bordering both parent tag cells.**  
   - The derived cell's color MUST be an interpolation of its parent tag colors  
   - Posts with more than two tags MUST ignore additional tags beyond the first two

---

## Layout & Interaction Rules (Recommended)

6. **Voronoi diagrams MUST be deterministic.**  
   Given the same content set, the diagram layout MUST remain stable between builds to avoid disorienting users.

6a. **Voronoi cell areas MUST be weighted by post count.**  
   Cells should be ranked from most posts to least posts, and the size weighting MUST follow that ranking.

7. **Diagram transitions SHOULD be animated but non-intrusive.**  
   Animations should convey hierarchy changes, not distract from navigation.

8. **Hover states MUST reveal metadata.**  
   Hovering over a cell SHOULD display:
   - Post title
   - Category / tag
   - Publish date (optional)
   - Estimated reading time (optional)

9. **Text legibility MUST take precedence over visual density.**  
   If a Voronoi cell becomes too small to display text clearly:
   - Hide text
   - Rely on hover or click interactions instead

---

## Content & Metadata Rules (Recommended)

10. **Front matter MUST be treated as authoritative.**  
    Generative systems MUST NOT infer categories or tags that are not explicitly defined in front matter.

11. **Categories SHOULD be few and stable.**  
    Tags MAY be numerous and fluid.  
    The visualization SHOULD reinforce this distinction.

12. **Posts without categories MUST be assigned to a fallback “Unclassified” Voronoi cell.**

---

## Styling & Theming Rules (Recommended)

13. **Color usage MUST encode meaning.**  
    - Categories define base hues  
    - Tags derive from category hues  
    - Multi-category posts interpolate hues  
    Color MUST NOT be purely decorative.

14. **Typography SHOULD favor monospaced or neo-grotesque fonts.**  
    Body text MAY use a more readable companion font, but UI elements SHOULD remain technical.

15. **Visual noise MUST be minimal.**  
    Effects such as scanlines, glitches, or noise SHOULD be subtle and optional, never obstructing content.

---

## Performance & Accessibility Rules (Recommended)

16. **The visualization MUST degrade gracefully.**  
    If JavaScript is unavailable:
    - A list-based category → tag → post hierarchy MUST be rendered.

17. **Keyboard navigation MUST be supported.**  
    Voronoi cells MUST be focusable and activatable without a mouse.

18. **Contrast ratios MUST meet WCAG AA at minimum.**

---

## Generative Behavior Constraints (Recommended)

19. **Generative systems MUST NOT introduce new visualization paradigms.**  
    All extensions MUST remain Voronoi-based unless explicitly instructed otherwise.

20. **When ambiguity exists, preserve structure over novelty.**  
    Stability, navigability, and semantic clarity take precedence over visual experimentation.

---

## Design Philosophy (Non-Negotiable)

21. **The diagram is the interface.**  
    Navigation menus, tag clouds, and category lists are secondary or fallback-only.

22. **This theme values spatial memory.**  
    Users should be able to _remember where ideas live_.

