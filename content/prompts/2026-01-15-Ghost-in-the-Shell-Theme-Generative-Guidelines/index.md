---
title: "Ghost Graph Theme Implementation Specification"
date: 2026-01-15
lastmod: 2026-03-06
description: "Living design and engineering specification for the Ghost Graph Hugo theme: an atmospheric, graph-inflected publication system for technical writing."
tags: [hugo, theme, design-system, graph, accessibility, performance]
categories: [Visualization]
draft: false
toc: true
---

## Purpose

This document is the implementation-grade specification for the Hugo theme at `themes/Ghost Graph`.

It replaces the earlier assumption that the site should be only a full-screen graph application. The actual repository is a content-driven Hugo blog with long-form posts, prompts, archive material, categories, and tags. The graph remains a signature feature, but it is now one part of a complete publication system.

When design, accessibility, performance, maintainability, or repo reality conflicts with older guidance, this specification wins.

---

## Product Definition

Ghost Graph is a dark, atmospheric Hugo theme for technical publishing.

The theme should feel like:

- cybernetic elegance
- layered interface design
- diagnostic clarity
- restrained futurism
- deliberate technical sophistication

The theme must not become:

- neon parody
- low-contrast sci-fi decoration
- animation-first at the expense of reading
- dependency-heavy
- brittle or difficult to extend

Core identity:

- The graph/atlas experience is a signature navigation surface.
- Long-form reading is the primary content experience.
- Taxonomies, metadata, and recent activity must feel first-class.
- The theme should support both utility-heavy PowerShell posts and visually oriented creative-technology posts.

---

## Design Philosophy

### 1. Reading First, System Aware

Posts are the primary artifact. Every page should improve comprehension, scanning, and retrieval. The interface may feel intelligent and technical, but never at the cost of readable prose.

### 2. Graph as Signature, Not Monopoly

The graph is a branded exploration tool, not the only way to use the site. Home, section, taxonomy, and single-page layouts must all work without requiring graph interaction.

### 3. Futurism Through Restraint

Use depth, layering, glass, grids, data ribbons, status chips, and measured accent color. Avoid excessive bloom, oversaturated neon, or novelty motion.

### 4. Maintainable Hugo-Native Architecture

Prefer Hugo templates, partials, section logic, page resources, and lightweight JavaScript. The theme should be understandable by someone maintaining a small static site without a frontend build pipeline beyond Hugo assets.

---

## Visual Language

### Mood

- deep midnight backgrounds with subtle atmospheric gradients
- precise technical framing lines and panel treatments
- subdued cyan as the primary signal accent
- limited warm accent for emphasis, status, and balance
- layered surfaces that suggest a console, atlas, or diagnostic station

### Texture and Depth

- Use soft grid or scanline treatments sparingly.
- Prefer one strong background system site-wide rather than unrelated effects per page.
- Panels should use translucency only when text contrast remains strong.
- Decorative lines, glows, and rules should reinforce hierarchy, not compete with content.

### Shape Language

- rounded corners are acceptable, but avoid soft consumer-app styling
- combine rounded containers with sharp inner dividers and technical captions
- cards and panels should feel engineered, not bubbly

---

## Typography

### Roles

- UI / navigation / labels: angular or technical sans family
- Reading text: highly legible serif or humanist sans with strong long-form performance
- Code / metadata: dedicated monospace

### Rules

- Headlines should be compact, intentional, and high-contrast.
- UI labels should use restrained uppercase treatment; avoid overusing all caps for body-scale text.
- Body copy should prioritize rhythm, width, and line-height over visual gimmicks.
- Metadata should be scannable and compact.
- Code blocks must preserve clear syntax contrast and spacing.

### Recommended Hierarchy

- Display / hero titles: assertive but not oversized
- Page titles: high contrast and stable across templates
- Kicker / eyebrow text: uppercase tracking used sparingly
- Body text: comfortable for long technical posts
- Captions / labels: compact, muted, but readable

---

## Color and Token System

The theme should define a reusable token system in CSS custom properties.

### Required Token Groups

- background tokens
- surface/panel tokens
- border/stroke tokens
- text tokens
- muted text tokens
- primary accent tokens
- warm accent tokens
- success / warning / danger tokens where needed
- shadow/glow tokens
- spacing tokens
- radius tokens
- motion-duration tokens

### Color Rules

- Primary accent should be cyan/ice/teal-adjacent, not fluorescent.
- Warm accent should be reserved for warnings, active emphasis, or contrast moments.
- Text contrast must remain comfortably readable on all surfaces.
- Graph node colors must be distinct by type and legible against the background.
- Avoid using saturated accent color as the default text color for large content regions.

---

## Layout and Spacing System

### Global Layout

- Use a constrained content width for reading layouts.
- Use wider but still structured widths for home and collection layouts.
- Use consistent horizontal gutters across breakpoints.
- Desktop layouts may use multi-column arrangements, but the primary reading column must remain dominant.

### Spacing Principles

- Space should communicate hierarchy before color does.
- Use predictable vertical rhythm between header, intro, cards, metadata, and content blocks.
- Large hero areas should feel deliberate, not empty.
- Dense metadata or taxonomy areas should still breathe.

### Responsive Intent

- Mobile is not a reduced desktop; panels must reflow cleanly.
- Graph overlays must not trap content off-screen on smaller viewports.
- Sidebars should collapse beneath the main column when space is constrained.

---

## Page Template Patterns

## 1. Global Shell

Required:

- sticky or visually anchored header
- skip link
- clear main content landmark
- footer with lightweight site-level context
- consistent background and surface language

Header responsibilities:

- brand
- primary navigation
- active-section clarity
- optional quick link to graph/atlas behavior where appropriate

## 2. Homepage

The homepage must stop acting as a redirect.

Required sections:

- a hero that explains the site’s identity and purpose
- recent or featured content
- section overview / information architecture entry points
- taxonomy or signal highlights
- graph/atlas block as a signature exploration surface

The homepage should feel like a command deck for the publication, not a blank launch screen.

## 3. Section List Pages

Required:

- section header with title, description, and counts
- meaningful article cards or rows
- lightweight filtering/search if practical
- optional graph/atlas section for section-local exploration
- pagination when the page count is high enough

Sections must be useful even if JavaScript fails.

## 4. Taxonomy Terms Pages

Required:

- overview of categories/tags with counts
- a more legible browsing pattern than raw term lists
- optional highlights such as latest page per term
- consistent relation to the graph system

## 5. Taxonomy Term Pages

Required:

- strong term header
- post count
- related sibling terms or contextual metadata when useful
- content cards for matching pages
- graph focus or atlas state aligned to the selected term when graph is shown

## 6. Single Post Pages

Required:

- strong title block
- clearly grouped metadata
- taxonomy chips
- optional page-resource media support
- usable table of contents treatment
- readable content column
- styled long-form elements
- related content or nearby content discovery
- recently modified / contextual secondary rail when space allows

---

## Component Inventory

The theme should converge on a reusable component set instead of page-specific one-offs.

Required components:

- site header
- site footer
- hero / page intro block
- section stat chips
- article card
- metadata cluster
- taxonomy pill/chip
- graph/atlas shell
- search/filter control
- recent activity panel
- table of contents panel
- related content panel
- pagination controls
- notice/callout
- code block wrapper with copy action
- figure / image treatment
- table styling
- blockquote styling
- footnote styling

Preferred implementation:

- partials for shared markup
- CSS classes driven by tokens
- lightweight JS only for progressive enhancement

---

## Graph / Atlas Guidance

The graph remains a signature feature, but the specification changes its role.

### Core Rules

1. The graph should visualize categories, tags, and posts in one shared field.
2. The graph may be 2D or 3D; the current implementation is 2D and does not need to be forced into 3D.
3. Clicking a post node must navigate to the post.
4. Clicking a category or tag should focus or narrow context without disorienting the user.
5. Search must filter or de-emphasize results in real time.
6. The graph must degrade gracefully when the rendering library is unavailable.

### Product Positioning

- The graph is a discovery layer.
- It should not replace list pages, taxonomy pages, or reading layouts.
- Graph UI copy should sound like an atlas or signal map, not a demo of rendering technology.

### Usability Rules

- Search and focus state must be obvious.
- Empty states must be explicit.
- Keyboard affordances should be discoverable.
- Motion must honor `prefers-reduced-motion`.
- Overlay panels must remain readable on mobile.

### Visual Rules

- The graph stage should feel integrated with the site’s visual language.
- Node labels must favor legibility over density.
- Graph chrome should match the rest of the theme, not look like a separate product.

---

## Interaction and Motion Rules

### Motion Principles

- Motion should signal state change, not perform for its own sake.
- Prefer subtle reveals, fades, and short lifts over dramatic transforms.
- Hover motion must never be required to understand content.

### Required Rules

- focus styles must be visible for keyboard users
- hover states must have non-hover equivalents where needed
- reduced-motion users must get a calmer experience
- sticky elements must not obscure anchor navigation

### Suggested Motion Range

- 120ms to 240ms for UI transitions
- 240ms to 400ms for panel reveals or larger content shifts
- avoid infinite decorative animation in reading areas

---

## Accessibility Requirements

Required:

- strong color contrast for text and controls
- semantic landmarks
- visible skip link
- keyboard-accessible navigation and actionable controls
- clear focus indicators
- search and filter controls with labels
- touch-friendly target sizes
- reduced-motion support
- tables that remain readable on smaller screens
- content styling that does not rely on color alone

Single-page requirements:

- heading hierarchy must be coherent
- TOC should not become a keyboard trap
- code copy controls need accessible labels
- footnotes and backreferences should remain readable

Graph requirements:

- if the graph library fails, show a useful fallback message
- graph instructions should not assume pointer-only interaction

---

## Performance Guardrails

Required:

- no heavy client-side framework
- no avoidable runtime dependency bloat
- only load graph assets on pages that actually render the graph
- keep decorative effects CSS-first where possible
- do not block reading layouts on graph initialization
- keep overlays and shadows moderate enough to avoid obvious low-end jank

Preferred:

- use Hugo assets pipeline for CSS/JS bundling/fingerprinting
- use page resources and image fallbacks when available
- progressively enhance search/filtering rather than requiring JavaScript for basic navigation

---

## Hugo Implementation Guidance

### Theme Scope

`themes/Ghost Graph` is the authoritative theme location.

The theme should assume:

- no site-level layout overrides are required
- content lives mainly in `content/posts`, `content/prompts`, and `content/archive`
- taxonomies are `categories` and `tags`

### Template Strategy

Prefer:

- `_default/baseof.html` for global shell
- dedicated home template for the landing page
- shared partials for cards, metadata, taxonomy pills, section intros, and sidebars
- reusable list logic for sections and taxonomy term pages

Avoid:

- duplicating card markup across templates
- coupling page rendering to graph-only layouts
- embedding large content-specific rules into one-off templates

### Asset Strategy

Prefer:

- one main theme stylesheet organized by tokens, layout, components, content, and utilities
- small focused JS files for graph behavior and collection filtering
- no large third-party CSS frameworks

---

## Front Matter and Content Model Assumptions

Current content assumptions in this repo:

- `title` is present
- `date` is present
- `summary` or `description` is often present but should fall back gracefully
- `categories` and `tags` are optional and may be empty
- `toc` is optional
- `lastmod` may be absent; Git info may supplement it
- page bundles often contain `thumbnail.*` or other media, but not universally

Implementation rules:

- missing categories must degrade gracefully in cards and graph views
- missing tags must degrade gracefully in cards and graph views
- missing thumbnails must use a visual fallback, not broken media UI
- optional future fields like `series`, `featured`, `hero`, or `aliases` should not break templates if absent

---

## Reusable Partial Guidance

Recommended partials:

- `site-header`
- `site-footer`
- `page-hero`
- `article-card`
- `meta-row`
- `taxonomy-pills`
- `graph-shell`
- `recently-modified`
- `related-content`
- `pagination`
- `content-media` or thumbnail helper

Rules:

- partials should own repeated markup
- copy should be reusable and not overfit one section
- section-specific text may be passed through dictionaries

---

## Acceptance Criteria

The redesign is acceptable only if all of the following are true:

1. The homepage is a real landing page and no longer redirects immediately.
2. Header, footer, home, list, taxonomy, and single templates share one coherent visual system.
3. The graph remains present as a signature feature without monopolizing the entire product.
4. Section and taxonomy pages are usable as conventional browsing pages without graph interaction.
5. Single-post pages meaningfully improve metadata, readability, and related-content discovery.
6. Code blocks, tables, blockquotes, figures, footnotes, and notices are visibly improved.
7. Mobile layouts remain readable and functional.
8. Focus states and keyboard behavior are stronger than before.
9. The theme still builds cleanly with Hugo.
10. Changes improve maintainability rather than scattering page-specific hacks.

---

## Prioritized Future Enhancements

### High Priority

- richer related-content scoring
- optional featured-post front matter
- optional hero media/front matter conventions
- taxonomy landing pages with better summaries and visual analytics

### Medium Priority

- local search index for full-text retrieval beyond graph filtering
- section-specific accent variants while preserving the global system
- additional shortcodes for structured callouts, steps, and command references

### Lower Priority

- cached graph positions across builds
- optional light theme variant if the design can retain identity
- richer post-series support when the content model actually adopts it

---

## Decision Rule

When implementing or extending Ghost Graph:

- preserve the site’s identity
- prioritize clarity over spectacle
- prefer system coherence over isolated cleverness
- prefer durable Hugo-native solutions over fragile frontend complexity

If something looks futuristic but reads worse, navigates worse, or maintains worse, reject it.
