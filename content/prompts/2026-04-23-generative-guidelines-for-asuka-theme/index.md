---
title: "Asuka Theme Implementation Specification"
date: 2026-04-23
lastmod: 2026-04-23
description: "Living design and engineering specification for the Asuka Hugo theme: a high-alert editorial command interface shaped by Asuka Langley Soryu cues, ledgers, dossiers, and the retained Memory Field."
tags: [hugo, theme, design-system, accessibility, performance, editorial, character-translation]
categories: [Visualization]
draft: false
toc: true
---

## Purpose

This document is the implementation-grade source of truth for `themes/Asuka`.

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
- optional `ai` and `ai-tested-date` front matter on posts
- shortcode usage for `notice`, `rawhtml`, and `powershell-environment-report`

The theme should remain self-contained and portable under `themes/Asuka`, while still styling existing shared shortcode markup that uses the established `rei-` class vocabulary.

---

## Current Theme Identity

Asuka ships as a high-alert editorial command interface, not a generic blog skin and not a fan-art landing page.

Core product nouns:

- command deck
- combat ledger
- pilot dossier
- signal rail
- synchronization field
- Memory Field

Emotional targets:

- fierce technical confidence
- disciplined aggression
- competitive momentum
- theatrical precision
- bright danger under control
- engineered defiance

Character translation:

- Asuka Langley Soryu is translated through abstract interface traits, not literal depiction.
- Red is the dominant identity color, carried by plugsuit-like panels, warning bands, and active routes.
- Orange and amber act as heat, hazard, synchronization, and attention cues.
- White, black, and charcoal prevent the palette from becoming a flat red wash.
- Angular diagonal cuts, segmented suit panels, and cockpit telemetry should shape major surfaces.
- The theme may feel louder than Rei, but it must still be a credible technical publishing interface.

Avoid:

- literal character portraits, plugsuit replicas, franchise symbols, or logos
- childish anime fan-page styling
- neon cyberpunk overload
- generic SaaS cards and marketing hero sections
- unreadable red-on-red compositions
- decorative aggression that interrupts reading

Asuka should feel like technical writing routed through a sharp, confident pilot console: urgent, proud, precise, and readable.

---

## Visual System

## 1. Color

Use centralized semantic CSS variables in `themes/Asuka/assets/css/main.css`.

Palette behavior:

- page field: pale warm white with controlled heat gradients
- shell depth: charcoal, black-red, and deep umber shadows
- standard surfaces: white or light panels with red suit cuts and amber telemetry seams
- primary accent: Asuka red
- secondary accent: orange or amber synchronization cues
- structure: charcoal, red-brown, and warm gray linework
- safety contrast: text remains near-black or white, never mid-red on red

Rules:

- red may be prominent, but it must be structured by white and dark neutral space
- amber is a cue, not a full-page wash
- dark surfaces should read like instrument trays or cockpit panels
- gradients can add heat, but hierarchy and contrast win

## 2. Typography

Local fonts are part of the shipped product:

- UI and headings: `Sora`
- summaries and long-form prose: `Newsreader`
- code and metadata: `IBM Plex Mono`

Rules:

- headings can be sharper and more assertive than Rei
- summaries may keep the serif for editorial authority
- mono uppercase is reserved for labels, stats, dates, chips, buttons, and filter UI
- aggressive tracking should be used sparingly; the theme should feel precise, not shouted

## 3. Spacing and Rhythm

The theme depends on energetic but controlled rhythm.

Required behavior:

- panel padding should use a shared clamp-based rhythm
- ledger rows should feel like combat logs: compact enough to scan, spacious enough to trust
- article prose should remain narrower than index or archive surfaces
- mobile layouts must collapse cleanly without relying on tiny text

## 4. Shape and Depth

Asuka uses:

- angular diagonal cuts
- segmented cockpit and suit-panel geometry
- medium radii, less soft than Rei
- pill controls only where they behave like toggles or route chips
- thin high-contrast rules
- amber and red edge highlights
- stronger shadows than Rei, but not murky stacked darkness

Avoid:

- bubbly consumer-app geometry
- soft pastel panels without tension
- excessive rounded cards
- thick borders that make the system feel toy-like

---

## Signature Motifs

Allowed motifs:

- red suit-panel cuts on large surfaces
- amber synchronization bars and telemetry pips
- diagonal hazard bands where they clarify hierarchy
- cockpit-like black trays for code and Memory Field internals
- sharp active route indicators
- white armored panels with red undersides
- small asymmetrical warning marks

Forbidden motifs:

- franchise symbols
- character art
- repeated red bars on every component without hierarchy
- uncontrolled orange/brown palettes
- mecha wallpaper or battlefield scenery
- playful gadget clutter

---

## Global Shell

Required:

- skip link
- sticky header
- main landmark
- footer
- fixed atmospheric shell treatment
- stable content-width behavior

Header behavior:

- brand mark, site title, and short site description on the left
- compact primary navigation on the right
- active routes should be visually marked and expose `aria-current`
- mobile navigation must toggle cleanly without JavaScript dependency for basic linking
- hover/focus may use assertive red/amber motion if it remains user-triggered and short

Footer behavior:

- short site summary
- compact site metrics
- no oversized promotional close

---

## Page Patterns

## 1. Homepage

Required sections:

- a full-width command-deck lead with title, summary, and overview stats
- anchor buttons into the page rather than marketing CTAs
- one panel for recently created posts
- one panel for recently updated posts
- Memory Field block beneath normal browsing

The homepage should feel like a launch-ready index console, not a product launch page.

## 2. Section Archives and Taxonomy Term Archives

These pages share a common collection shell:

- page intro with kicker, title, summary, buttons, and stats
- filter panel above content
- vertical ledger of entry rows
- recently modified panel
- adjacent collections panel
- Memory Field block beneath the archive

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
- Memory Field block beneath the directory

## 4. Single Content Pages

Single pages are the primary reading product.

Required structure:

- pilot dossier header with section band, title, summary, and taxonomy pills
- optional wide banner image sourced from page bundle media
- two-column reading layout with signal rail on the left and prose on the right
- metadata cluster in the rail
- TOC in the rail when enabled and meaningful
- recent feed in the rail for non-post sections
- Memory Field centered on the current entry beneath the article

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
- Memory Field

Implementation preference:

- repeated UI lives in partials
- CSS variables drive shared tokens
- JavaScript stays small and narrowly scoped
- the Memory Field implementation should remain compatible with the Rei version unless there is a clear product reason to diverge

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
- code blocks should read like dark command instrumentation
- copy buttons should remain progressive enhancement only
- blockquotes should feel like quoted mission notes, not ornaments
- tables must scroll safely on narrow screens
- figures, tables, iframes, and video should sit inside framed surfaces
- notices must not rely on color alone

---

## Interaction and Motion

Interaction tone:

- sharp
- responsive
- deliberate
- more assertive than Rei without becoming chaotic

Requirements:

- hover is never the only cue
- focus states must be obvious
- row links remain generous click targets
- collection filters act only on already-rendered content
- the Memory Field remains secondary to normal navigation

Motion rules:

- allow short hover snaps, amber glints, and small lifts
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
- labelled Memory Field controls
- strong text contrast
- reduced-motion support
- touch-friendly targets

Performance guardrails:

- no client-side framework
- no runtime remote assets
- local fonts only
- JavaScript enhances navigation, filtering, code copy, and the Memory Field only
- normal reading and browsing must still work if JavaScript fails

---

## Hugo Implementation Map

The current production implementation lives in:

- `themes/Asuka/theme.toml`
- `themes/Asuka/assets/css/main.css`
- `themes/Asuka/assets/js/main.js`
- `themes/Asuka/assets/js/memory-field.js`
- `themes/Asuka/layouts/baseof.html`
- `themes/Asuka/layouts/home.html`
- `themes/Asuka/layouts/list.html`
- `themes/Asuka/layouts/page.html`
- `themes/Asuka/layouts/taxonomy.html`
- `themes/Asuka/layouts/_partials/*.html`
- shortcode compatibility files for `notice`, `rawhtml`, and `powershell-environment-report`

Template strategy:

- one global base template
- dedicated top-level templates for home, lists, pages, and taxonomies
- partial-driven shared UI
- page-bundle cover handling through reusable media partials
- Memory Field data emitted through Hugo and enhanced by JavaScript

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
- `ai-tested-date`

Rules:

- description falls back to summary, then to trimmed plain text
- thumbnails should prefer page resources when possible
- missing media, tags, or categories must not collapse the layout
- `ai` and `ai-tested-date` should render as notices only when present
- TOC should render only when enabled and meaningful

Shortcode compatibility required:

- `notice`
- `rawhtml`
- `powershell-environment-report`

---

## Engineering Guidance

When extending Asuka:

- keep the theme self-contained in `themes/Asuka`
- preserve the command-deck, combat-ledger, pilot-dossier, signal-rail, and Memory Field vocabulary
- update this prompt whenever those product patterns change
- prefer tokens and shared partials over one-off styling
- keep JavaScript bounded and replaceable
- when editing `main.css`, consolidate conflicting rules instead of stacking another contradictory refinement layer

Asuka should look bold because the system is disciplined and high-contrast, not because every surface is yelling.

---

## Acceptance Criteria

Asuka is acceptable only if all of the following are true:

1. This document accurately describes the current theme rather than an older design intent.
2. The visual system reads as bold, red-forward, technical, and high-alert.
3. Command decks, combat ledgers, pilot dossiers, signal rails, and the Memory Field remain coherent across page types.
4. Asuka Langley Soryu cues are visible through red suit-panel geometry, amber synchronization accents, angular confidence, and controlled volatility without literal character art.
5. Section and term browsing still feel purposeful without relying on the Memory Field.
6. Single pages privilege reading comfort first.
7. Accessibility and reduced-motion behavior remain solid.
8. The site builds successfully with Hugo.

---

## Decision Rule

When forced to choose:

- choose readability over heat
- choose sharp structure over decoration
- choose purposeful intensity over random aggression
- choose consistency over one-off cleverness
- choose maintainability over accumulated CSS drift

If a change makes the site feel more like Asuka but less trustworthy, less readable, or less maintainable, reject it.
