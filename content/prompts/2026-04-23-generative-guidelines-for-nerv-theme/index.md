---
title: "NERV Theme Generative Guidelines"
date: 2026-04-23
draft: false
author: "Tristan Madden"
categories:
  - Prompts
  - Design Systems
tags:
  - nerv
  - hugo
  - theme
  - generative-guidelines
  - tactical-ui
description: "A self-contained design contract for the NERV Hugo theme: a high-contrast, industrial, command-interface visual system inspired by mecha command rooms and emergency operations displays."
toc: true
---

# NERV Theme Generative Guidelines

## Design Intent

NERV is a Hugo theme for technical writing that should feel like a hardened operations terminal rather than a magazine, portfolio, or marketing site. The interface should suggest a command room under pressure: black CRT fields, hot orange display chrome, pale yellow signal text, clipped geometry, dense metadata, measured spacing, and clear content hierarchy.

The aesthetic direction is inspired by industrial mecha command interfaces and emergency control displays. It must stay original: no copied logos, insignia, screenshots, character references, or proprietary artwork. The theme may use the name NERV because the theme brief requests it, but the visual language should be built from generic command-interface patterns: status rails, warning stripes, terminal labels, technical grids, and precision dividers.

The theme must prioritize readability. Its dramatic atmosphere comes from contrast, restrained phosphor glow, scanline texture, and system-like consistency, not from clutter.

## Core Principles

1. Content is the mission payload.
   The article body stays readable, centered, and predictable. Decorative systems frame the writing without competing with it.

2. Every visual decision must imply function.
   Lines divide regions, labels identify state, stripes mark attention, and color indicates severity or interaction.

3. The interface is tense, not chaotic.
   Use strong contrast and sharp geometry, but keep spacing disciplined and page flow calm.

4. The theme is a command surface.
   Navigation, article metadata, notices, code blocks, and taxonomy links should look like tactical controls or report fields.

5. The palette is limited but not one-note.
   Red is the dominant signal color, supported by amber, cyan, off-white, and neutral industrial grays.

6. The theme must work without external assets.
   CSS-generated grids, bands, rails, and typographic treatment are preferred over image dependencies.

## Color Palette

Use CSS custom properties with the following semantic names. Values may be adjusted slightly for contrast, but the relationships must remain intact.

| Token | Value | Role | Rationale |
| --- | --- | --- | --- |
| `--nerv-black` | `#030100` | Page background | Almost-black diagnostic glass, close to a powered CRT field. |
| `--nerv-panel` | `#0b0502` | Primary panels and article surfaces | Black-brown paneling keeps the screen dark while allowing orange edge light. |
| `--nerv-panel-2` | `#160a03` | Raised controls and secondary panels | Slightly warmer control fill for search, notices, and code regions. |
| `--nerv-line` | `#5f2709` | Borders and structural dividers | Low-intensity orange linework for inactive panel structure. |
| `--nerv-line-hot` | `#ff7a00` | Active borders and warning accents | Hot orange edge light for active interface chrome. |
| `--nerv-red` | `#ff5a00` | Brand/status orange | Main phosphor-orange identity color for rails, labels, and display chrome. |
| `--nerv-red-deep` | `#4d0800` | Deep warning fill | Dark red-orange fill for alert surfaces without overpowering text. |
| `--nerv-amber` | `#ffd56f` | Signal text and traces | Pale yellow phosphor for readable links, signal paths, and key text. |
| `--nerv-cyan` | `#ffb15a` | Legacy neutral data accent | Kept for compatibility with existing CSS names, but visually aligned to orange data light. |
| `--nerv-danger` | `#ff1f4f` | Danger/active alarm | Red-magenta state for hovered, focused, or high-alert elements. |
| `--nerv-green` | `#7cff6b` | Success/ready state | Reserved for success indicators and should appear rarely. |
| `--nerv-text` | `#ffe7bc` | Primary text | Warm phosphor text preserves readability while staying inside the display palette. |
| `--nerv-muted` | `#c89452` | Secondary text | Muted orange-brown for metadata and captions. |
| `--nerv-dim` | `#8b4715` | Tertiary text | Low priority labels, separators, and disabled-looking text. |

### Palette Rules

- Orange is the identity color, not the background color. Most surfaces remain black or near-black.
- Pale yellow marks readable signal text, links, traces, and high-value data.
- Red-magenta marks danger, hover, focus, and alarm states.
- Green is rare and only means ready, success, or verified.
- Use restrained CRT treatment across the theme: phosphor bloom, faint scanlines, inset glass glow, and hard-edge bands.
- Avoid large smooth gradients. If surface texture is needed, use thin linear grid patterns, scanlines, or hard-edge bands.
- Avoid purple, beige-dominant, brown/orange-dominant, and soft pastel palettes.
- Text contrast must satisfy WCAG AA where practical, especially body text and navigation.

## Typography

The theme uses system fonts only.

### Display and UI Text

Preferred stack:

```css
font-family: "Bahnschrift", "DIN Alternate", "Arial Narrow", "Roboto Condensed", "Segoe UI", system-ui, sans-serif;
```

Purpose:

- Condensed or semi-condensed system faces create a technical display feel.
- Uppercase may be used for labels, nav, metadata, status chips, and compact headings.
- Do not rely on letter spacing for personality. Letter spacing remains `0`.
- Heading weight should be firm and block-like, usually `700` or `800`.

### Body Text

Preferred stack:

```css
font-family: "Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif;
```

Purpose:

- Long-form content must be comfortable.
- Body line length should target 68 to 78 characters.
- Body line-height should be around `1.7`.
- Paragraph rhythm should feel deliberate and report-like.

### Code and Data

Preferred stack:

```css
font-family: "Cascadia Mono", "Consolas", "SFMono-Regular", Menlo, monospace;
```

Purpose:

- Code blocks and inline code are mission data.
- Code regions should be visually distinct with dark fills, left status rails, and subtle scanline/grid texture.
- Inline code should use compact padding and amber or cyan accents, but remain readable in prose.

## Layout Structure

### Page Shell

The global shell has three layers:

1. `body` background: near-black with CSS-generated tactical grid and scanline texture.
2. `site frame`: full-width header and footer with hard dividers.
3. `content bay`: constrained central column with optional side TOC on wide screens.

The page should never feel like a floating card stack. Sections are full-width bands or unframed constrained layouts. Cards are allowed only for repeated list entries, notices, and functional panels.

### Header

The header is a fixed-height command bar, not a hero.

Required elements:

- Site title as the primary brand.
- Small NERV system label, such as `NERV COMMAND INTERFACE`.
- Navigation links with active and hover states.
- A thin red status rail along the top or left edge.

Header behavior:

- Sticky positioning is allowed if it does not obscure content.
- On mobile, nav wraps into compact rows without overlapping.
- No large logo image is required. Use text, rails, and geometry.

### Home Page

The home page starts with usable content, not a landing pitch.

Recommended structure:

1. Compact operations banner with site title, description, and current content counts.
2. Latest posts list as command entries.
3. Section links for posts, archive, prompts, categories, and tags when available.

The first viewport should reveal actual content entries.

### List Pages

List pages are index consoles. Each item appears as a command entry with:

- Status number or index marker.
- Title.
- Date.
- Summary or description.
- Category and tag chips when available.

Entries use a left red rail, thin borders, and hard hover states. Hover should increase border intensity or shift the left rail, but should not resize the layout.

### Single Article Pages

Single pages use a report layout:

- Article header with title, date, categories, tags, and optional description.
- Optional table of contents when `toc: true`.
- Main prose area.
- Footer navigation for previous and next content where available.

On wide screens, the table of contents may sit in a right-side tactical panel. On narrow screens, it appears above the article body.

### Taxonomy Pages

Taxonomy term pages use compact chip grids. Counts should be visible because they behave like inventory totals.

## UI Components and Patterns

### Command Entries

Used for post lists, related links, and navigation groups.

Visual rules:

- Rectangular surface with `0` to `4px` radius.
- Left status rail in red.
- Thin steel border.
- Title in display font.
- Metadata in muted or amber text.
- Hover state uses red or cyan border emphasis.

### Buttons and Links

Buttons are tactical controls.

Rules:

- Primary actions use red fill or red border with dark fill.
- Secondary actions use steel border and cyan text.
- Download links should look like deliberate controls, not plain links.
- Focus state uses cyan outline.
- Avoid rounded pill buttons.

### Notices

Notices are alert blocks with severity:

- `info`: cyan rail.
- `warning`: amber rail.
- `danger` or `error`: red rail.
- `success`: green rail.

Each notice has a small uppercase label and a hard border. The body remains readable and should accept Markdown content.

### Code Blocks

Code blocks are diagnostic panels:

- Darker than the article surface.
- Left red or amber rail.
- Thin border.
- Horizontal scrolling for long lines.
- Preserve readable syntax highlighting if Hugo provides classes.

Inline code:

- Use `--nerv-panel-2`.
- Use amber text or off-white text with a red underline.
- Keep padding compact.

### Tables

Tables are data grids:

- Full-width within the content column.
- Sticky headers are optional but not required.
- Header cells use red or amber top/bottom borders.
- Row borders stay subtle.
- Horizontal scroll wrapper is acceptable for narrow screens.

### Media

Images and video embeds are evidence panels:

- Hard border.
- Optional caption as muted terminal text.
- Preserve aspect ratio.
- Do not add decorative frames that obscure content.

### Pagination

Pagination is a compact transport control:

- Previous and next buttons.
- Current page indicator if available.
- No oversized controls.

### Psychographic Display

The psychographic display is the theme's relationship map. It visualizes categories, tags, and entries as linked signal columns rather than as a free-floating decorative graph.

Rules:

- The display must be an enhancement to normal browsing, not the only way to navigate.
- It should render as a hard-edged tactical analysis panel with a black field, hot orange display chrome, pale yellow signal traces, and red-magenta danger emphasis.
- Within this component, orange/yellow replaces the broader theme's cyan data accent so the display reads like a psychographic diagnostic screen.
- Categories use orange emphasis, tags and neutral links use pale yellow emphasis, and active or danger focus states use red-magenta emphasis.
- A restrained CRT treatment is appropriate here: phosphor text bloom, faint scanlines, inset glass glow, and signal-path drop shadows. It must remain readable and should not spread to normal article content.
- Search, type toggles, linked paths, active focus state, and detail readout must share one command-interface vocabulary.
- With an empty search query, each signal column should render no more than 10 categories, 10 tags, and 10 entries. If more records are available, show a non-interactive continuation marker such as `... +N more` at the bottom of the column and let search reveal narrower matches.
- Single pages should focus the map on the current entry. Section and term pages should focus it on their current context.
- JavaScript may power the interactive map, but static links and regular list pages must remain fully usable without it.
- The fallback state should expose high-value category and tag links.

### Footer

The footer should feel like a shutdown/status strip:

- Thin top border.
- Muted metadata.
- Optional theme label.
- No marketing language.

## Visual Motifs and Iconography

Use CSS and text-first motifs instead of image assets.

Allowed motifs:

- Red vertical status rails.
- Thin rectangular panel borders.
- Diagonal warning stripes on small accents or separators.
- Grid overlays with low opacity.
- Scanlines with very low opacity.
- Bracket-like corner cuts using borders or pseudo-elements.
- Monospace status labels such as `SYNC`, `READY`, `ARCHIVE`, `LOG`, and `TRACE`.

Avoid:

- Official logos, seals, emblems, screenshots, or character art.
- Soft glow-heavy cyberpunk styling.
- Decorative orbs, bokeh, or cloudy gradient backgrounds.
- Excess animation. If used, animation must be subtle and disabled by `prefers-reduced-motion`.
- Excessively rounded cards or pill chips.

Icon direction:

- Prefer typographic symbols, rails, and labels over icon sets.
- When icons are necessary, they should be simple line icons and never the primary identity.

## Tone and Thematic Direction

Writing and UI labels should be concise, procedural, and technical.

Good label examples:

- `Latest Dispatches`
- `Archive Index`
- `Signal Tags`
- `Related Logs`
- `Read Report`
- `Download Payload`
- `System Ready`

Avoid:

- Cute copy.
- Marketing slogans.
- Character references.
- Lore explanations.
- Excessive military jargon that reduces clarity.

The theme should sound like an operations interface built for engineers and analysts.

## Accessibility and Responsiveness

- Body text must remain readable on mobile and desktop.
- Navigation must wrap cleanly.
- Interactive elements must have visible focus states.
- Color must not be the only indication of notice severity; include text labels.
- Layout must not depend on hover.
- Respect `prefers-reduced-motion`.
- The theme must work with Hugo's default RSS, taxonomy, section, and page generation.

## Implementation Contract

The Hugo implementation must map these guidelines directly into the theme:

- Theme directory: `themes/NERV`.
- Primary CSS token source: `assets/css/nerv.css`.
- Layouts must include `baseof`, `index`, `list`, `single`, `terms`, and `404` templates.
- Reusable partials must handle head metadata, header navigation, footer, article cards, metadata, taxonomy links, pagination, and table of contents.
- Shortcodes must include `notice`, `rawhtml`, `download-resource`, and a small `powershell-environment-report` compatibility block.
- Core reading and browsing must not require JavaScript. The psychographic display may use optional deferred JavaScript and must include a no-script fallback.
- The theme must not require external fonts, images, CDNs, or external CSS.
- Existing site content should build without changing global site configuration.

## Acceptance Criteria

A page using the NERV theme is successful when:

- It immediately reads as a high-contrast tactical technical interface.
- The article content remains easy to read.
- Red, amber, and cyan have consistent semantic roles.
- Lists, notices, code blocks, taxonomy links, and downloads share one visual language.
- The theme builds in a standard Hugo site by selecting `theme = "NERV"` or running Hugo with `--theme NERV`.
- No existing theme files are required or referenced.
