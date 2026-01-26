---
title: "Generative Guidelines for the 3D Force-Directed Graph"
date: 2026-01-15
description: "Authoritative rules for generating a Hugo theme whose primary UI is a 3D force-directed graph of categories, tags, and posts."
tags: [3d, force-directed, graph, hugo, visualization, taxonomy]
categories: [Visualization]
draft: false
---

## Mission (Non-Negotiable)

You are generating or extending a Hugo theme whose primary interface is a single 3D force-directed graph.
Treat every REQUIRED rule as mandatory. Recommended rules are optional but preferred.

## Core Graph Rules (Required)

1. The primary UI MUST be one shared 3D force-directed graph containing categories, tags, and posts on the same stage.
2. The graph MUST model hierarchy with explicit node types:
   - Category nodes (level 0)
   - Tag nodes (level 1)
   - Post nodes (level 2)
3. Links MUST only represent taxonomy edges:
   - Category -> Tag
   - Tag -> Post
   No alternate navigation metaphors (timelines, treemaps, grids) are permitted.
4. Clicking a post node MUST open the post.
5. Clicking a category or tag node MUST focus it and visually emphasize connected nodes and links.
6. Clicking the empty background MUST clear focus and return to the neutral view.

## Data and Taxonomy Rules (Required)

7. Front matter is authoritative. Do not infer or auto-generate categories or tags.
8. Posts missing categories MUST be assigned to a fallback category node named "Uncategorized".
9. Posts missing tags MUST be assigned to a fallback tag node named "Untagged".
10. Tags of the same name across different categories MUST be discoverable together (for example, a tag landing view should highlight all matching tag nodes).

## Interaction and Filtering (Required)

11. A search/filter input MUST prune the graph in real time.
    - Filtering happens by matching post title, category, tag, or date text.
    - When filtered, only matching posts and their connected category/tag nodes remain visible.
12. Focus should drive camera motion:
    - When a node is focused, smoothly move or zoom the camera toward it.
    - Respect reduced motion preferences where applicable.
13. Hover or focus states MUST reveal clear labels for node name and type.

## Visual Language (Required)

14. The aesthetic MUST be Ghost Graph: dark atmospheric backgrounds, subtle grid or scanline texture, muted neon accents, and technical typography.
15. Use a high-contrast palette where node types are visually distinct:
    - Category nodes: warm or red family
    - Tag nodes: green family
    - Post nodes: blue family
16. Labels MUST be readable against the background and must not clip or overlap excessively.
    Hide labels for tiny nodes rather than sacrificing legibility.

## Supplemental Navigation (Required)

17. A "Recently Modified" sidebar MUST be present on all primary views.
18. The sidebar MUST sort by the authoritative modification timestamp:
    - Use `lastmod` when present.
    - Otherwise fall back to Git commit date or file modification time.
19. Sidebar entries MUST link directly to posts and MUST NOT alter the graph focus state.
20. The sidebar MUST remain visually subordinate to the graph (narrow column, lower contrast).

## Performance and Accessibility (Recommended)

21. The 3D graph SHOULD degrade gracefully if the rendering library is unavailable.
    - Show a clear empty-state message.
    - Render a simple list view as a fallback when possible.
22. Keyboard navigation SHOULD be supported for focusable nodes and the sidebar.
23. The canvas SHOULD resize fluidly for desktop and mobile without layout shift.

## Generative Constraints (Non-Negotiable)

24. Do NOT introduce Voronoi, treemap, or other spatial metaphors.
25. Preserve spatial memory and clarity over novelty. The graph must be easy to understand before it is flashy.
