---
title: "Generative Guidelines for the 3D Force-Directed Graph (Search-First)"
date: 2026-01-26
description: "Authoritative rules for generating a Hugo theme whose primary UI is a 3D force-directed graph of categories, tags, and posts, optimized for practical search and retrieval."
tags: [3d, force-directed, graph, hugo, visualization, taxonomy, search]
categories: [Visualization]
draft: false
---

## Mission (Non-Negotiable)

You are generating or extending a Hugo theme whose primary interface is a single 3D force-directed graph.

This system must balance **exploration** with **practical retrieval**.  
The graph must remain visually compelling while allowing users to quickly and confidently locate specific posts or scripts.

Treat every REQUIRED rule as mandatory.  
Recommended rules are optional but preferred.

---

## Core Graph Rules (Required)

1. The primary UI MUST be one shared 3D force-directed graph containing categories, tags, and posts on the same stage.
2. The graph MUST model hierarchy with explicit node types:
   - Category nodes (level 0)
   - Tag nodes (level 1)
   - Post nodes (level 2)
3. Links MUST only represent taxonomy edges:
   - Category → Tag
   - Tag → Post  
   No alternate navigation metaphors (timelines, treemaps, grids) are permitted.
4. Clicking a post node MUST open the post.
5. Clicking a category or tag node MUST focus it and visually emphasize connected nodes and links.
6. Clicking the empty background MUST clear focus and return to the neutral view.

---

## Data and Taxonomy Rules (Required)

7. Front matter is authoritative. Do not infer or auto-generate categories or tags.
8. Posts missing categories MUST be assigned to a fallback category node named `Uncategorized`.
9. Posts missing tags MUST be assigned to a fallback tag node named `Untagged`.
10. Tags of the same name across different categories MUST be discoverable together.
    - For example, a tag landing or highlight action should emphasize all matching tag nodes globally.

---

## Interaction and Filtering (Required)

11. A search/filter input MUST prune or de-emphasize the graph in real time.
    - Filtering matches against post title, category, tag, or date text.
    - When filtered, only matching posts and their connected taxonomy paths remain emphasized.
12. Focus MUST drive camera motion:
    - Smooth pan, dolly, or zoom toward the focused node.
    - Respect reduced-motion preferences.
13. Hover or focus states MUST reveal clear labels for node name and node type.

---

## 🔍 Search & Retrieval Mode (Required)

14. The graph MUST support a distinct **Search Mode** when a search query is non-empty.
    - Search Mode alters visual emphasis, not underlying structure.
    - The graph MUST remain visible at all times.

15. In Search Mode, matching results MUST be **ranked** in the following priority order:
    1. Post title exact matches
    2. Post title partial matches
    3. Tag matches
    4. Category matches
    5. Date matches

16. The highest-ranked post MUST be visually designated as the **Primary Result**:
    - Stronger outline, glow, or contrast
    - Camera framing biased toward this node
    - All other matches remain visible but visually subordinate

17. Non-matching nodes SHOULD be dimmed rather than removed when performance allows, preserving spatial context.

---

## 🧭 Orientation & Context (Required)

18. When a post node is focused (via click or search), a **breadcrumb path** MUST be displayed:
    - Category → Tag(s) → Post
    - Breadcrumbs are informational and read-only by default

19. Interacting with breadcrumb elements MUST:
    - Highlight the corresponding nodes and links in the graph
    - NOT change focus unless explicitly clicked

---

## 📐 Spatial Stability Rules (Required)

20. Node positions MUST be deterministic between sessions for identical data inputs.
    - Use stable seeds or cached layout positions.
21. Search filtering MUST NOT trigger a full graph re-layout.
22. In Search Mode, camera behavior MUST prioritize clarity over spectacle:
    - Minimal zoom
    - Prefer pan or subtle dolly
    - Avoid rapid or disorienting motion

---

## Visual Language (Required)

23. The aesthetic MUST be **Ghost Graph**:
    - Dark atmospheric backgrounds
    - Subtle grid or scanline textures
    - Muted neon accents
    - Technical or sci-fi typography
24. Node types MUST be visually distinct using a high-contrast palette:
    - Category nodes: warm or red family
    - Tag nodes: green family
    - Post nodes: blue family
25. Labels MUST remain readable:
    - No excessive overlap or clipping
    - Hide labels for tiny or distant nodes rather than sacrificing legibility

---

## 📋 Supplemental Navigation (Required)

26. A **Recently Modified** sidebar MUST be present on all primary views.
27. Sidebar sorting MUST use authoritative timestamps:
    - `lastmod` when present
    - Otherwise Git commit date or file modification time
28. Sidebar entries MUST:
    - Link directly to posts
    - NOT alter the graph’s focus state
29. The sidebar MUST remain visually subordinate to the graph:
    - Narrow column
    - Lower contrast
    - No competing motion or emphasis

---

## 📄 Supplemental Search Results (Required, Subordinate)

30. When Search Mode is active, a compact **Search Results panel** MAY appear:
    - Text-only list of matching posts
    - Sorted using the same ranking rules as the graph
31. Selecting a search result MUST focus the corresponding node in the graph.
32. This panel MUST:
    - Never replace the graph
    - Use lower visual contrast than the canvas
    - Be dismissed automatically when the search query is cleared

---

## Performance and Accessibility (Recommended)

33. The 3D graph SHOULD degrade gracefully if the rendering library is unavailable:
    - Display a clear empty-state message
    - Render a simple list view as a fallback when possible
34. Keyboard navigation SHOULD be supported for:
    - Focusable nodes
    - Breadcrumbs
    - Sidebar and search results
35. The canvas SHOULD resize fluidly for desktop and mobile without layout shift.

---

## 🧠 Cognitive Load Safeguards (Non-Negotiable)

36. At no time should more than ONE node be visually emphasized as the Primary Result.
37. Color, glow, and motion MUST never compete with label readability.
38. When tradeoffs arise, prioritize:
    - Legibility
    - Predictability
    - Spatial memory  
    over visual novelty.

---

## Generative Constraints (Non-Negotiable)

39. Do NOT introduce Voronoi, treemaps, timelines, grids, or alternate spatial metaphors.
40. Preserve spatial memory and clarity over novelty.
41. The graph must be easy to understand **before** it is impressive.

---
