---
title: "Rei Theme Implementation Specification"
date: 2026-01-28
lastmod: 2026-04-24
description: "Implementation-grade design and engineering specification for the Rei Hugo theme: a cold editorial archive built from chambers, ledgers, dossiers, signal rails, and restrained Rei Ayanami-inspired interface cues."
tags: [hugo, theme, design-system, accessibility, performance, editorial, character-translation]
categories: [Visualization]
draft: false
toc: true
---

## Purpose

This document is the source of truth for `themes/Rei` and for the site-level decision to use Rei as the default Hugo theme.

It should be accurate enough for a future implementation pass to preserve the shipped product without reverse-engineering the layouts, CSS, and JavaScript from scratch. If Rei changes materially, update this guide in the same pass. A stale implementation prompt is a defect.

## Operating Contract

Rei is a technical archive interface, not a generic blog skin, marketing homepage, or literal character tribute.

The theme must:

- keep `theme = "Rei"` in `hugo.toml`
- remain self-contained under `themes/Rei`
- support normal browsing without JavaScript
- use local fonts and local assets only
- prioritize long-form reading comfort over atmosphere
- keep the memory field secondary to standard navigation
- treat red as a sparse signal, not a general accent wash

The implementation vocabulary is:

- chamber
- ledger
- dossier
- signal rail
- memory field

These nouns should map to real page patterns and class names, not only to visual flavor.

## Repository Reality

The site is a Hugo archive with:

- long-form technical posts in `content/posts`
- prompt and design documents in `content/prompts`
- older reference material in `content/archive`
- category and tag taxonomies
- page bundles with optional thumbnail or cover media
- optional `toc`
- optional `ai` and `ai-tested-date` front matter on posts
- shortcode usage for `notice`, `rawhtml`, and `powershell-environment-report`

The Rei production surface currently lives in:

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
- shortcode compatibility files in `themes/Rei/layouts/_shortcodes`

## Theme Identity

Rei should feel like a sterile archive maintained by a quiet observer.

Emotional targets:

- white lab stillness
- clinical order
- quiet technical precision
- restrained fragility
- archival distance
- porcelain calm
- unreadable interiority

Character translation:

- Rei Ayanami is translated through abstract interface traits, not literal depiction.
- Pale porcelain fields, blue-white atmosphere, and powder-blue traces suggest hair, stillness, and cold light.
- Crimson belongs to eye-like signals, warnings, focus rings, and selected relationships.
- Bandage-like seams, capsule framing, and white suit-panel geometry may shape large surfaces.
- The theme should carry quiet asymmetry: one precise red cue, one blue seam, one offset panel trace.

Avoid:

- literal character art, franchise symbols, plugsuit replicas, or logos
- neon cyberpunk spectacle
- orange mecha-industrial palettes
- warm lifestyle editorial styling
- generic SaaS feature-page composition
- decorative clutter around reading zones
- repeated crimson bars on every component

## Visual System

### Color

Color tokens live in `themes/Rei/assets/css/main.css`.

Palette behavior:

- page field: icy blue-white and porcelain
- shell depth: ink blue-black only where contrast needs it
- standard surfaces: cool white-blue panels with subtle overlays
- primary accent: powder, steel, or laboratory blue
- signal accent: restrained crimson
- structure: blue-gray linework and seam traces

Rules:

- most components should read blue or neutral before red appears
- red should behave like an eye, alarm, or selected relationship
- depth should come from tone, inset highlights, and light shadow
- gradients may support atmosphere, but text contrast wins

### Typography

Local fonts are part of the product:

- UI and headings: `Sora`
- summaries and prose: `Newsreader`
- code and metadata: `IBM Plex Mono`

Rules:

- headings should feel composed and architectural
- prose should stay calm, readable, and narrower than archive layouts
- metadata may be uppercase, but spacing must remain restrained
- negative letter spacing and excessive tracking should be treated as drift
- code blocks should read like dark instrument trays

### Shape and Depth

Rei uses:

- large outer radii
- medium inner radii
- pill and capsule controls
- thin rules
- inset highlights
- restrained shadows
- seam-like traces on major panels
- ovoid ocular marks only when they stay precise and quiet

Avoid:

- thick borders
- plush stacked shadows
- bubbly consumer-app geometry
- heavy glass effects

## Signature Motifs

Allowed motifs:

- faint structural grid under the shell
- cool surface reflections
- micro-band accents near panel edges
- slim vertical seam lights inside larger chambers
- abstract Rei-inspired clinical glyphs, currently an unframed black sphere mark for the brand; navigation links use pill framing
- static optical cues in selected media placeholders only
- evidence-banner framing for page media
- powder-blue veil shapes that read as hairline traces
- bandage seams and sterile suit-panel cuts on large surfaces

Forbidden motifs:

- character portraits
- franchise emblems
- loud scanline overlays across prose
- animated ocular gimmicks, including blinking navigation eyes
- ambient animation in reading zones
- decorative effects that obscure hierarchy

## Global Shell

Required:

- skip link
- sticky header
- primary navigation
- main landmark
- footer
- fixed atmospheric veil and grid
- stable content-width behavior

Header behavior:

- brand mark, site title, and site description on the left
- compact primary navigation on the right
- active routes expose `aria-current`
- mobile navigation uses JavaScript enhancement, but basic navigation remains visible when JavaScript fails

Footer behavior:

- short site summary
- compact site metrics
- last-updated signal when content exists
- no oversized promotional close

## Page Patterns

### Homepage

The homepage is an index console.

Required sections:

- chamber lead with site title, summary, and overview stats
- anchor buttons into the page
- recently created posts panel
- recently updated posts panel
- memory field beneath normal browsing

Do not convert the homepage into a landing page.

### Section and Term Archives

Section archives and taxonomy term archives share the collection shell.

Required:

- page intro with kicker, title, summary, buttons, and stats
- filter panel above the visible collection
- vertical ledger of entry rows
- recently modified panel
- adjacent collections panel
- memory field beneath the archive

Entry rows should preserve a three-part rhythm:

- metadata rail
- body copy
- thumbnail or placeholder block

Do not collapse archive pages into a generic card grid.

### Taxonomy Indexes

Taxonomy index pages are directories.

Required:

- page intro
- filter panel
- stacked term rows
- per-term count
- latest connected entry where available
- clear empty state
- memory field beneath the directory

### Single Pages

Single pages are the primary reading product.

Required:

- dossier header with section band, title, summary, and taxonomy pills
- optional wide banner image sourced from page bundle media
- two-column reading layout
- signal rail on the left
- prose on the right
- metadata cluster in the rail
- TOC in the rail when enabled and meaningful
- recent feed in the rail for non-post sections
- memory field centered on the current entry beneath the article

Current product rule:

- posts omit adjacent navigation and related-content panels
- non-post sections may render adjacent navigation and related entries beneath prose

## Component Inventory

Required shared components:

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
- cover and banner media treatment
- memory field

Implementation preference:

- repeated UI lives in partials
- CSS variables drive shared tokens
- JavaScript stays small and narrowly scoped
- avoid adding contradictory CSS refinement layers

## Content Styling

The theme must handle:

- headings and paragraphs
- ordered and unordered lists
- inline code and code blocks
- blockquotes
- tables
- figures and captions
- footnotes and backreferences
- notices
- embedded video or raw HTML content

Rules:

- prose should remain high-contrast and comfortable for technical reading
- code blocks must scroll safely and expose copy controls only as enhancement
- blockquotes should feel archival, not ornamental
- tables must scroll safely on narrow screens
- figures, tables, iframes, and video should sit inside framed surfaces
- notices must not rely on color alone

## Interaction and Motion

Interaction tone:

- deliberate
- low-amplitude
- editorial before app-like

Requirements:

- hover is never the only cue
- focus states are obvious
- ledger rows remain generous click targets
- collection filters act only on already-rendered content
- copy buttons and memory-field behavior are progressive enhancements
- decorative eye motifs remain static rather than animated when used outside the brand and primary navigation

Allowed motion:

- small hover lifts
- opacity shifts
- subtle shadow or opacity changes when motion is allowed

Forbidden motion:

- ambient loops in reading zones
- large parallax
- theatrical page transitions
- blinking eye animation in any motion mode
- forced animation in reduced-motion mode

## Accessibility and Resilience

Required:

- visible skip link
- semantic landmarks
- keyboard-usable mobile navigation
- navigation remains reachable without JavaScript
- labelled filters
- labelled memory-field controls
- strong text contrast
- reduced-motion support
- touch-friendly targets
- readable layout at narrow widths

Failure behavior:

- if JavaScript fails, primary navigation remains visible
- if filtering JavaScript fails, archive entries remain visible
- if memory-field JavaScript fails, normal browsing still works
- if media is missing, placeholders preserve the ledger rhythm

## Performance Guardrails

Required:

- no client-side framework
- no runtime remote assets
- local fonts only
- bounded JavaScript for navigation, filtering, code copy, and memory field
- no decorative asset that blocks reading
- no implementation that requires JavaScript for basic page discovery

## Front Matter Assumptions

Observed fields:

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

- description falls back to summary, then trimmed plain text
- thumbnails should prefer page resources
- missing media, tags, or categories must not collapse the layout
- `ai` and `ai-tested-date` render notices only when present
- TOC renders only when enabled and meaningful

Shortcode compatibility required:

- `notice`
- `rawhtml`
- `powershell-environment-report`

## Engineering Guidance

When extending Rei:

- keep the theme self-contained in `themes/Rei`
- preserve chamber, ledger, dossier, signal rail, and memory field patterns
- update this guide whenever those product patterns change
- prefer tokens and shared partials over one-off styling
- keep JavaScript bounded and replaceable
- consolidate conflicting CSS instead of stacking another override
- verify with `hugo` after layout or CSS changes

Rei should look deliberate because the system is disciplined, not because the stylesheet keeps accreting exceptions.

## Acceptance Criteria

Rei is acceptable only if all of the following are true:

1. `hugo.toml` points to `theme = "Rei"`.
2. This document accurately describes the current theme.
3. The visual system reads as cold, editorial, and clinically restrained.
4. Chambers, ledgers, dossiers, signal rails, and the memory field remain coherent across page types.
5. Most accents are blue or neutral, with red kept sparse and meaningful.
6. Rei Ayanami cues are visible through porcelain whites, powder-blue traces, red ocular signals, bandage seams, and quiet asymmetry without literal character art.
7. Section and term browsing still feel purposeful without relying on the memory field.
8. Single pages privilege reading comfort first.
9. Navigation, filters, and reading still work when JavaScript fails.
10. Accessibility and reduced-motion behavior remain solid.
11. The site builds successfully with Hugo.

## Decision Rule

When forced to choose:

- choose readability over atmosphere
- choose restraint over novelty
- choose consistency over one-off cleverness
- choose maintainability over accumulated CSS drift

If a change makes the site feel more sci-fi but less trustworthy, less readable, or less maintainable, reject it.
