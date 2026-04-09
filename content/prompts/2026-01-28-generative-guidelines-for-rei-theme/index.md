---
title: "Rei Theme Implementation Specification"
date: 2026-01-28
lastmod: 2026-04-09
description: "Living design and engineering specification for the current Rei Hugo theme: a cold editorial archive built from chambers, ledgers, dossiers, and restrained interface signals."
tags: [hugo, theme, design-system, accessibility, performance, editorial]
categories: [Visualization]
draft: false
toc: true
---

## Purpose

This document is the implementation-grade source of truth for `themes/Rei`.

It should describe the shipped theme accurately enough that a future refresh can preserve the same product, visual language, and technical constraints without reverse-engineering the current CSS and layouts from scratch.

If the implementation changes materially, update this document in the same pass. A stale prompt is a defect.

---

## Repository Reality

The current repository is a Hugo site with:

- long-form posts in `content/posts`
- prompt/spec documents in `content/prompts`
- older reference material in `content/archive`
- taxonomy browsing through `categories` and `tags`
- page bundles with optional thumbnail or cover media
- optional `toc`
- optional `ai` and `ai-tested` front matter on posts
- shortcode usage for `notice`, `rawhtml`, and `powershell-environment-report`

At the time of writing there are no site-level layout overrides outside `themes/Rei`. The theme should remain self-contained and portable.

---

## Current Theme Identity

Rei now ships as a cold editorial control system, not a generic blog skin and not a product-marketing layout.

Core product nouns:

- chamber
- ledger
- dossier
- signal rail
- memory field

Emotional targets:

- white lab stillness
- clinical order
- quiet technical precision
- restrained fragility
- archival distance

Avoid:

- neon cyberpunk spectacle
- warm lifestyle editorial styling
- over-frosted glass UI
- generic SaaS feature-page structure
- loud franchise mimicry

Rei should feel like a sterile archive interface for technical writing, with atmosphere carried by structure, typography, linework, and restraint rather than by decorative effects.

---

## Visual System

## 1. Color

Use centralized semantic CSS variables in `themes/Rei/assets/css/main.css`.

Palette behavior:

- page field: icy blue-white
- shell depth: ink blue-black
- standard surfaces: cool white-blue panels with subtle overlays
- primary accent: steel or laboratory blue
- signal accent: restrained crimson
- structure: blue-gray linework and seams

Rules:

- most components should read as blue/neutral first
- red is a signal, not a wash applied to every surface
- gradients may support atmosphere, but text contrast and clarity win
- depth should come from tone, inset highlights, and light shadow, not heavy dark stacking

## 2. Typography

Local fonts are part of the shipped product:

- UI and headings: `Sora`
- summaries and long-form prose: `Newsreader`
- code and metadata: `IBM Plex Mono`

Rules:

- headings should feel composed and architectural, not loud
- the serif is allowed outside article prose when summaries need more texture and calm
- mono uppercase is reserved for labels, stats, dates, chips, buttons, and filter UI
- excessive tracking or all-caps saturation should be treated as a bug

## 3. Spacing and Rhythm

The theme depends on consistent negative space.

Required behavior:

- panel padding should use a shared clamp-based rhythm
- ledger rows need enough air to scan quickly
- article prose should remain narrower than index or archive surfaces
- mobile layouts must collapse cleanly without relying on tiny text

## 4. Shape and Depth

Rei uses:

- large outer radii
- medium inner radii
- pill controls
- thin rules
- inset highlights
- restrained shadows
- seam-like decorative traces on major surfaces

Avoid:

- bubbly consumer-app geometry
- thick borders
- plush, dark, stacked shadows

---

## Signature Motifs

Allowed motifs:

- faint structural grid under the shell
- cool surface reflections
- micro-band accents near the top edge of major panels
- slim vertical seam lights inside larger chambers
- optical or ocular cues in the header and navigation, provided they stay quiet and precise
- evidence-banner framing for page media

Forbidden motifs:

- franchise symbols
- character art
- loud scanline overlays across prose
- repeated crimson bars on every component
- playful gadget clutter

---

## Global Shell

Required:

- skip link
- sticky header
- main landmark
- footer
- fixed atmospheric veil and grid
- stable content-width behavior

Header behavior:

- brand mark, site title, and short site description on the left
- compact primary navigation on the right
- active routes should be visually marked and expose `aria-current`
- mobile navigation must toggle cleanly without JavaScript dependency for basic linking

Footer behavior:

- short site summary
- compact site metrics
- no oversized promotional close

---

## Page Patterns

## 1. Homepage

The current homepage is intentionally restrained.

Required sections:

- a full-width chamber lead with title, summary, and overview stats
- anchor buttons into the page rather than marketing CTAs
- one panel for recently created posts
- one panel for recently updated posts
- memory field block beneath normal browsing

The homepage should feel like an index console, not a product launch page.

## 2. Section Archives and Taxonomy Term Archives

These pages share a common collection shell:

- page intro with kicker, title, summary, buttons, and stats
- filter panel above content
- vertical ledger of entry rows
- recently modified panel
- adjacent collections panel
- memory field block beneath the archive

Do not collapse these pages into a generic card grid. The ledger is a defining pattern.

Entry rows should preserve a three-part rhythm:

- metadata rail
- body copy
- thumbnail or placeholder block

## 3. Taxonomy Index Pages

Taxonomy index pages act as directories, not article grids.

Required:

- page intro
- filter panel
- stacked term rows
- per-term count
- latest connected entry where available
- clear empty state
- memory field block beneath the directory

## 4. Single Content Pages

Single pages are the primary reading product.

Required structure:

- dossier header with section band, title, summary, and taxonomy pills
- optional wide banner image sourced from page bundle media
- two-column reading layout with signal rail on the left and prose on the right
- metadata cluster in the rail
- TOC in the rail when enabled and meaningful
- recent feed in the rail for non-post sections
- memory field centered on the current entry beneath the article

Current product rule:

- posts omit adjacent navigation and related-content panels
- non-post sections may render adjacent navigation and related entries beneath prose

Any deliberate change to that behavior should update this document.

---

## Component Inventory

Required shared components in the current theme:

- site header
- site footer
- page intro
- filter panel
- ledger entry row
- term directory row
- metadata cluster
- taxonomy pills
- TOC panel
- recent feed
- pagination
- empty state
- related entries section
- notice block
- cover/banner media treatment
- memory field

Implementation preference:

- repeated UI lives in partials
- CSS variables drive shared tokens
- JavaScript stays small and narrowly scoped

---

## Content Styling Rules

The theme must visibly improve:

- headings and paragraphs
- lists
- inline code and code blocks
- blockquotes
- tables
- figures and captions
- footnotes and backreferences
- notices
- embedded video or raw HTML content

Rules:

- prose should remain calm, high-contrast, and comfortable for long technical reading
- summaries outside the main article may borrow the serif when it improves texture and hierarchy
- code blocks should read like dark instrument trays
- copy buttons should remain progressive enhancement only
- blockquotes should feel archival, not ornamental
- tables must scroll safely on narrow screens
- figures, tables, iframes, and video should sit inside framed surfaces
- notices must not rely on color alone

---

## Interaction and Motion

Interaction tone:

- deliberate
- low-amplitude
- editorial before app-like

Requirements:

- hover is never the only cue
- focus states must be obvious
- row links remain generous click targets
- collection filters act only on already-rendered content
- the memory field remains secondary to normal navigation

Motion rules:

- allow small hover lifts and opacity shifts
- no ambient looping effects in reading zones
- no large parallax or theatrical transitions
- honor `prefers-reduced-motion`

---

## Accessibility and Performance

Required:

- visible skip link
- semantic landmarks
- keyboard-usable mobile nav
- labelled filters
- labelled memory field controls
- strong text contrast
- reduced-motion support
- touch-friendly targets

Performance guardrails:

- no client-side framework
- no runtime remote assets
- local fonts only
- JavaScript enhances navigation, filtering, code copy, and the memory field only
- normal reading and browsing must still work if JavaScript fails

---

## Hugo Implementation Map

The current production implementation lives in:

- `themes/Rei/theme.toml`
- `themes/Rei/assets/css/main.css`
- `themes/Rei/assets/js/main.js`
- `themes/Rei/assets/js/memory-field.js`
- `themes/Rei/layouts/baseof.html`
- `themes/Rei/layouts/home.html`
- `themes/Rei/layouts/list.html`
- `themes/Rei/layouts/page.html`
- `themes/Rei/layouts/taxonomy.html`
- `themes/Rei/layouts/_partials/*.html`
- shortcode compatibility files for `notice`, `rawhtml`, and `powershell-environment-report`

Template strategy:

- one global base template
- dedicated top-level templates for home, lists, pages, and taxonomies
- partial-driven shared UI
- page-bundle cover handling through reusable media partials

---

## Front Matter and Content Assumptions

Observed current fields:

- `title`
- `date`
- `lastmod`
- `description`
- `summary`
- `categories`
- `tags`
- `toc`
- `thumbnail`
- `ai`
- `ai-tested`

Rules:

- description falls back to summary, then to trimmed plain text
- thumbnails should prefer page resources when possible
- missing media, tags, or categories must not collapse the layout
- `ai` and `ai-tested` should render as notices only when present
- TOC should render only when enabled and meaningful

Shortcode compatibility required:

- `notice`
- `rawhtml`
- `powershell-environment-report`

---

## Engineering Guidance

When extending Rei:

- keep the theme self-contained in `themes/Rei`
- preserve the chamber, ledger, dossier, and signal-rail vocabulary
- update this prompt whenever those product patterns change
- prefer tokens and shared partials over one-off styling
- keep JavaScript bounded and replaceable
- when editing `main.css`, consolidate conflicting rules instead of stacking another contradictory refinement layer

Rei should continue to look deliberate because the system is disciplined, not because the stylesheet keeps accreting overrides.

---

## Acceptance Criteria

Rei is acceptable only if all of the following are true:

1. This document accurately describes the current theme rather than an older design intent.
2. The visual system reads as cold, editorial, and clinically restrained.
3. Chambers, ledgers, dossiers, signal rails, and the memory field remain coherent across page types.
4. Most accents are blue or neutral, with red kept sparse and meaningful.
5. Section and term browsing still feel purposeful without relying on the memory field.
6. Single pages privilege reading comfort first.
7. Accessibility and reduced-motion behavior remain solid.
8. The site builds successfully with Hugo.

---

## Decision Rule

When forced to choose:

- choose readability over atmosphere
- choose restraint over novelty
- choose consistency over one-off cleverness
- choose maintainability over accumulated CSS drift

If a change makes the site feel more sci-fi but less trustworthy, less readable, or less maintainable, reject it.
