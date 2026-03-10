---
title: "Rei Theme Implementation Specification"
date: 2026-01-28
lastmod: 2026-03-09
description: "Living design and engineering specification for the Rei Hugo theme: a cold, quiet, clinically restrained publication system for technical writing."
tags: [hugo, theme, design-system, accessibility, performance, minimalism]
categories: [Visualization]
draft: false
toc: true
---

## Purpose

This document is the implementation-grade source of truth for `themes/Rei`.

Rei is not a mood board and not a fan-art exercise. It is a complete Hugo theme for a technical personal publication that should feel cold, quiet, precise, elegant, and emotionally restrained while remaining highly readable and production-safe.

When atmospheric styling conflicts with readability, accessibility, maintainability, or Hugo compatibility, the practical choice wins.

---

## Repository Reality

The current repository is a Hugo site with:

- long-form posts in `content/posts`
- prompt/spec documents in `content/prompts`
- older reference material in `content/archive`
- taxonomy browsing through `categories` and `tags`
- page bundle thumbnails for some content
- optional `toc`
- legacy shortcode usage for `notice`, `rawhtml`, and `powershell-environment-report`

There are no site-level layout overrides outside the theme directory at the time of writing. `themes/Rei` should therefore be self-contained and portable.

---

## Theme Concept and Philosophy

### Core identity

Rei should feel like:

- a white test chamber
- a sterile archive interface
- a quiet research terminal
- a memory log stored inside a clinical future system

Rei must not feel like:

- anime fan art
- franchise imitation
- a neon cyberpunk dashboard
- a generic blue-accent blog clone
- an over-frosted glass UI demo

### Emotional targets

The shipped theme should evoke:

- stillness
- cold light
- restrained fragility
- controlled distance
- synthetic humanity
- clinical order

The shipped theme should avoid:

- loud spectacle
- playful warmth
- ornamental clutter
- high-energy motion
- ironic or novelty styling

### Implementation posture

The theme should be:

- original in markup, component system, and styling
- Hugo-native and understandable
- CSS-first where possible
- lightly enhanced with JavaScript, never dependent on it for core browsing

### Explicit clean-slate rule

Rei must not preserve the prior theme's page architecture under new colors.

Rejected carry-overs include:

- the same hero plus side-panel homepage shell
- the same card-grid-first collection browsing pattern
- the same article-plus-rail arrangement with only token renaming
- the same discovery feature framing with only aesthetic restyling

If a template can be described as "Ghost Graph, but colder," it fails the spec.

---

## Design System

## 1. Color System

Use semantic CSS variables defined centrally in the main stylesheet.

Required tokens:

- `--bg`: main page field
- `--bg-elevated`: raised page shell
- `--bg-panel`: standard panel surface
- `--bg-panel-strong`: denser surface for code, cards, or emphasis
- `--bg-deep`: deep framing background
- `--line`: default divider
- `--line-strong`: emphasized divider
- `--text`: primary foreground
- `--text-soft`: secondary foreground
- `--text-faint`: tertiary foreground
- `--accent`: primary Rei blue
- `--accent-strong`: focused signal blue
- `--accent-soft`: pale blue wash
- `--signal`: restrained red
- `--signal-soft`: low-saturation red wash
- `--success`: reserved status green-blue
- `--shadow`: cool ambient shadow
- `--glow`: rare blue bloom

Palette rules:

- blue and white dominate large surfaces
- black or blue-black provides depth and framing
- red is sparse and semantically meaningful
- text contrast must remain strong enough for long technical reading
- gradients are allowed only when they support atmosphere without reducing clarity

### Base palette direction

- background: ice white with a blue cast
- shell framing: ink blue-black
- panels: translucent white-blue surfaces
- primary accent: desaturated laboratory blue
- signal accent: disciplined crimson

## 2. Typography

### Type roles

- UI and headings: technical or geometric sans
- body copy: calm, literary serif
- code and metadata: crisp monospace

### Practical implementation decision

The first shipped version should vendor local webfonts instead of depending on runtime third-party font CDNs.

Role split:

- Sans: `Sora`
- Serif: `Newsreader`
- Mono: `IBM Plex Mono`

Rules:

- headings should feel composed, not loud
- display text should be controlled and slightly architectural
- prose should optimize for reading comfort before visual novelty
- metadata may use light uppercase tracking sparingly
- monospace should be used for diagnostics, chips, timestamps, and code

## 3. Spacing and Layout

Spacing must follow a predictable scale and create strong negative space.

Required behavior:

- compact spacing for metadata clusters and controls
- moderate spacing for cards and panels
- generous spacing between sections
- comfortable vertical rhythm in long-form prose

Layout rules:

- pages should sit inside a stable shell with wide margins on desktop
- reading width should remain intentionally narrow enough for comfort
- homepage and list pages can use wider grids than article prose
- mobile layouts must collapse cleanly without relying on tiny text

## 4. Shape, Borders, and Depth

Required language:

- medium outer radii
- sharper internal separators
- thin rules instead of thick frames
- cool, soft shadows used sparingly
- layered borders and subtle inset treatments preferred over heavy elevation

Avoid:

- bubbly consumer-app shapes
- thick glassmorphism blur everywhere
- deep shadow stacks

## 5. Component Language

Panels and cards should feel like fabricated instrument housings or sterile trays:

- pale surfaces
- precise edge treatment
- quiet metadata
- clear content hierarchy
- occasional translucent overlays used with restraint

Links should feel editorial first, chrome second.

Buttons should be:

- compact
- deliberate
- blue-forward for primary actions
- low-noise for secondary actions
- red only for destructive or high-significance moments

Inputs should resemble calm lab-console controls with unmistakable focus states.

---

## Visual Motifs

Allowed motifs:

- fine structural linework
- chamber seams
- reflection-like surface gradients
- subtle blue bloom in controlled moments
- sparse red locator markers
- quiet interface labels

Forbidden motifs:

- franchise symbols
- character art
- loud anime cues
- exaggerated scanline overlays across prose
- maximal hologram styling

---

## Functional Product Decisions

These decisions turn vague aspiration into specific implementation guidance.

## 1. Discovery Surface

The legacy graph idea is retained, but the implementation should change.

Rei should ship an original **memory field**:

- a deterministic, column-based relationship map
- categories, tags, and entries rendered as structured nodes
- search and lightweight filtering provided through small JavaScript
- SVG connectors used for visual relationships
- the initial view may ship with a seeded query such as `Rei` when needed to keep the client-side stage bounded on larger sites
- conventional navigation always remains the primary browsing method

The memory field is intentionally **not** a physics simulation and **not** a flashy canvas demo.

Why:

- lower complexity
- better readability
- easier accessibility
- more consistent art direction
- less dependency risk

## 2. Collection Filtering

Collection pages should provide lightweight client-side filtering over the cards already rendered by Hugo.

Scope:

- title
- summary/description
- tags
- categories
- section label

This is collection filtering, not full-site full-text search. A true index-backed search can be deferred.

## 3. Code UX

Code blocks should gain:

- consistent framing
- language/header treatment where available
- copy button added progressively with JavaScript
- accessible copy labels and status feedback
- copy actions that capture only code content, never button labels or other UI text

## 4. Related Content

Single pages should expose discoverability through:

- adjacent navigation within a section
- related items chosen from shared tags, categories, and section context
- a small memory field block beneath the article

---

## Page-Level Layout Patterns

## 1. Global Shell

Required:

- skip link
- sticky header
- main landmark
- footer
- stable background system
- consistent content width behavior

The shell should feel like a contained lab environment rather than a blank white browser window.

## 2. Homepage

Required sections:

- hero with title, summary, and primary routes
- system state panel showing site scope and latest update
- recent content grid
- section route cards for posts, prompts, and archive
- taxonomy highlight panels
- memory field block

The homepage should read like a calm control room, not a product landing page.

## 3. Section and Taxonomy Term Pages

Required:

- page intro with title, summary, and content count
- lightweight filter control
- card grid for entries
- pagination
- empty state
- recent updates support
- memory field block beneath normal browsing

## 4. Taxonomy Index Pages

Required:

- term cards
- per-term count
- latest connected item where possible
- clear no-content fallback
- relation to the memory field without making it dominant

## 5. Single Content Pages

Required:

- title block with metadata
- optional responsive hero/feature image if available from page resources
- taxonomy pills
- table of contents when enabled
- highly readable prose
- styled figures, tables, code, footnotes, and blockquotes
- section-adjacent navigation
- related content
- memory field block

Single pages are the primary product and must privilege reading comfort.

---

## Content Element Rules

The theme must visibly improve the following:

- paragraphs and headings
- lists
- inline code and code blocks
- blockquotes
- tables
- figures and captions
- footnotes and backreferences
- horizontal rules
- notices/admonitions
- embedded video or raw HTML content

Rules:

- tables must scroll safely on narrow screens
- captions must be distinct from body text
- blockquotes should feel archival and restrained, not decorative
- footnotes should be clearly separated and easy to return from
- notices must not rely on color alone

---

## Component Inventory

Required shared components:

- site header
- site footer
- page intro
- article card
- metadata cluster
- taxonomy pill group
- collection filter
- pagination
- empty state
- recent updates panel
- related content panel
- memory field
- notice/callout block
- code block copy affordance
- optional cover media treatment

Preferred implementation:

- repeated markup in partials
- CSS variables for shared tokens
- very small JavaScript modules

---

## Interaction Rules

Interaction tone:

- quiet
- deliberate
- low-amplitude
- never theatrical

Requirements:

- hover is never the only cue
- focus states must be obvious
- cards must remain large click targets
- navigation must work without JavaScript
- sticky elements must not hide anchor targets
- filters must degrade gracefully

---

## Motion Rules

Allowed motion:

- slow fades
- subtle opacity shifts
- slight elevation or translation
- restrained panel-state transitions

Disallowed motion:

- looping ambient animation in reading areas
- large parallax
- springy overshoot
- animation that interferes with scanning or selection

Implementation rules:

- honor `prefers-reduced-motion`
- keep durations short and consistent
- remove motion if it hurts clarity or performance

---

## Accessibility Requirements

Required:

- visible skip link
- semantic landmarks
- strong contrast
- coherent heading hierarchy
- accessible nav toggle on mobile
- clear keyboard focus styles
- touch-friendly targets
- reduced-motion support
- accessible filter controls
- notices whose meaning is not color-only

Single-page requirements:

- TOC remains navigable
- copy buttons expose accessible text
- figure captions remain readable
- footnote references and return links remain clear

Memory field requirements:

- useful static fallback content exists without JavaScript
- the enhanced interface is keyboard accessible
- search and filters are labelled
- relationship highlighting cannot be the only way information is conveyed

---

## Performance Guardrails

Required:

- no client-side framework
- no heavy graph library
- no runtime dependency on remote JS CDNs
- local fonts preferred
- CSS-first presentation
- progressive enhancement only where justified
- reading pages remain fast if JavaScript fails

Preferred:

- Hugo asset pipeline for fingerprinted CSS and JS
- limited font weights
- bounded JS scope per feature
- responsive cover-image derivatives generated at build time where page resources allow

---

## Hugo Implementation Guidance

## Theme file map

The first production implementation should include, at minimum:

- `themes/Rei/theme.toml`
- `themes/Rei/assets/css/main.css`
- `themes/Rei/assets/js/main.js`
- `themes/Rei/assets/js/memory-field.js`
- `themes/Rei/layouts/_default/baseof.html`
- `themes/Rei/layouts/_default/list.html`
- `themes/Rei/layouts/_default/single.html`
- `themes/Rei/layouts/_default/taxonomy.html`
- `themes/Rei/layouts/_default/terms.html`
- `themes/Rei/layouts/index.html`
- shared partials for metadata, cards, pagination, related content, and memory field
- shortcode compatibility files for `notice`, `rawhtml`, and `powershell-environment-report`

## Template strategy

Prefer:

- one global base template
- one shared list-shell approach for sections and term pages
- one terms template for taxonomy indexes
- partial-driven repeated UI

Avoid:

- section-specific one-off template forks unless required
- duplicated card markup
- JavaScript-only navigation logic

## Asset strategy

Prefer:

- a single main stylesheet organized by tokens, shell, components, prose, and responsive rules
- small JS files split by responsibility
- responsive page-bundle image handling with explicit dimensions to reduce layout shift
- no external runtime script dependency for the memory field

## Data and fallback strategy

The memory field should be driven by Hugo-rendered JSON embedded in the page.

Fallback behavior:

- if JavaScript is unavailable, users still see curated links for top categories, top tags, and recent entries
- if a page lacks tags, categories, or thumbnails, cards and metadata must still render intentionally
- because the memory-field payload is site-wide, Hugo may cache its rendered JSON across pages during the build

---

## Content Modeling and Front Matter Assumptions

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

Rules:

- description falls back to summary, then to a trimmed plain-text excerpt
- thumbnails should prefer page resources when possible
- missing metadata must never collapse layout quality
- multi-category and multi-tag entries should remain visually tidy
- TOC should render only when enabled and meaningful

Shortcode compatibility required:

- `notice`
- `rawhtml`
- `powershell-environment-report`

The `notice` shortcode must support both named and positional usage already present in this repository.

New front matter should remain optional. If later additions such as `featured`, `hero`, or `series` are introduced, the theme must treat them as enhancements rather than requirements.

---

## Acceptance Criteria

Rei is acceptable only if all of the following are true:

1. This document remains a real implementation specification, not a vague prompt.
2. `themes/Rei` is a complete Hugo theme authored as a clean-slate original implementation.
3. The visual system is recognizably cold, restrained, and Rei-inspired without using copyrighted franchise assets.
4. Blue and white dominate, black frames depth, and red remains sparse and meaningful.
5. Home, section, term, taxonomy index, and single pages all share one coherent system.
6. Prose elements, code blocks, tables, figures, notices, and footnotes are materially improved.
7. Conventional browsing works cleanly without JavaScript.
8. The memory field works as a secondary discovery layer with a quieter presentation than the old graph concept.
9. Mobile responsiveness, focus behavior, and reduced-motion support are solid.
10. The site builds successfully with Hugo.

---

## Deferred Roadmap

High-value follow-up work:

- optional local full-text search
- featured-content front matter
- better taxonomy summaries stored in data files
- series navigation once content uses it

Lower-priority exploration:

- alternate dark variant if it preserves Rei identity
- richer section-specific hero copy
- persisted memory-field state across navigations

---

## Decision Rule

When extending Rei:

- choose restraint over spectacle
- choose readability over atmosphere when forced to pick
- choose system consistency over clever one-offs
- choose Hugo-native durability over frontend novelty

If a decision makes the theme look more sci-fi but reduces clarity, maintainability, accessibility, or trust, reject it.
