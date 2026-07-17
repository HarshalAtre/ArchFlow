# Design - ArchFlow

A locked design system for the ArchFlow application. Every frontend change
should read this file before introducing visual or interaction patterns.

## Genre

Modern-minimal with a technical workbench voice. ArchFlow should feel like a
serious architecture instrument: precise, calm, information-dense, and fast.

## Macrostructure Family

- App pages: Workbench. Compact command header, left tool rail, dominant graph
  canvas, and right contextual inspector.
- Mobile app: Canvas first. Tools and Inspector become explicit modal drawers.
- Content pages: Long document using the same typography and neutral surfaces.

## Theme

- Dark mode is the default for first-time visitors. Light mode is an explicit,
  persistent user choice available from the command header.
- `--color-paper`: primary workspace and panel surface for the active theme
- `--color-paper-2`: quiet panel surface
- `--color-paper-3`: selected and grouped control surface
- `--color-ink`: charcoal primary text
- `--color-ink-2`: secondary text
- `--color-rule`: low-chroma structural rules
- `--color-accent`: restrained cobalt action color
- `--color-focus`: brighter blue keyboard focus indicator
- Semantic success, warning, and danger colors remain distinct from the accent.

In light mode, paper tokens use near-white neutral surfaces. In dark mode, they
use low-chroma charcoal surfaces rather than tinted navy. The accent should
occupy no more than 5 percent of a viewport. Canvas content, not decorative
color, carries the product identity.

## Typography

- Display and brand: IBM Plex Mono, weight 700, roman
- Body and interface: IBM Plex Sans, weights 400, 500, and 700
- Display tracking: 0
- Technical labels use IBM Plex Mono with compact uppercase treatment.
- Interface body copy never drops below 14px.

## Spacing

Use the 4-point named scale in `frontend/src/styles/tokens.css`. Components use
tokens instead of introducing new raw spacing values.

## Motion

- State easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Short state changes: 140ms
- Panel movement: 220ms
- No bouncy motion, global hover scaling, or decorative reveals
- Reduced motion removes transforms and animations

## Microinteractions Stance

- Silent success when the result is already visible
- Errors appear where recovery is possible
- Focus indicators appear instantly
- One hover effect per control
- Loading states keep geometry stable
- Creation tools use domain-specific icons and restrained semantic color.
- Secondary commands and detailed editors use progressive disclosure.
- Collapsed editor sections show useful counts so their content stays discoverable.

## CTA Voice

- Primary commands use a compact cobalt fill and direct verb labels.
- Secondary commands use neutral paper with a structural border.
- Destructive commands use a pale danger surface and explicit labels.
- Corners are 6px for controls and 8px for floating panels.

## Per-Page Allowances

- App pages must not use decorative hero artwork, gradients, or marketing cards.
- HLD nodes may use subtle type-specific surface accents when they preserve
  diagram readability.
- LLD notation remains monochrome-first to preserve UML clarity.

## What Pages Must Share

- ArchFlow mono wordmark
- Header, mode switcher, panel controls, and focus treatment
- Typography, spacing scale, semantic colors, and control geometry
- Canvas-first behavior on small screens

## What Pages May Differ On

- HLD and LLD tool vocabulary
- Node and relationship notation
- Inspector fields required by each design mode

## Exports

The canonical reusable CSS variables live in
`frontend/src/styles/tokens.css`. They are the implementation source for this
document.
