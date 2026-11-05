# Scenic Backdrop Specification

## Overview

- **Target partial:** `partials/root-8a5edab2--backdrop.html`
- **Target CSS:** `styles/sections/root-8a5edab2--backdrop.css`
- **Target JS:** `scripts/sections/root-8a5edab2--backdrop.js`
- **Section root class:** `.pac-stage`
- **Interaction model:** time/persistence (random scene on first load, then session-persisted)
- **Screenshot:** `docs/design-references/intermatico-com-bb8f8a88/root-8a5edab2/section-background-desktop.png`

## Class Name Mapping

| Original (extraction reference only) | New (output) |
|---|---|
| `#background` (background layer) | `.pac-stage` |
| `#background` (fixed content shell) | `.pac-viewport` (page-level shared wrapper) |
| `bgls` (sessionStorage key) | `pacifico-auth-scene` |
| `images[]` | `SCENES` |

## DOM Structure

`body > .pac-viewport > .pac-stage` — the stage is an empty aria-hidden layer. All foreground sections are siblings inside `.pac-viewport`.

## Computed Styles

### `.pac-stage`

- position: absolute; inset: 0; z-index: -1; overflow: auto
- background-color: `rgb(3, 142, 221)`
- background-repeat: no-repeat
- background-position: center center
- background-attachment: fixed
- background-size: cover
- box-sizing: border-box
- width/height: viewport size
- opacity: 1; transform: none

The actual image is set as an inline `background-image` by the module. At 1440×900, the image is 1500×1008 and is cropped by `cover`.

## States & Behaviors

### Initial scene selection

- **Trigger:** module initialisation on page load.
- **State A:** no image; solid `rgb(3, 142, 221)`.
- **State B:** one of eight images, `auth-scene-01.webp` … `auth-scene-08.webp`.
- **Persistence:** `sessionStorage["pacifico-auth-scene"]`; if the stored value is in the scene list it is reused, otherwise a random scene is selected and stored.
- **Transition:** none, instant.
- **Implementation:** `root.style.setProperty("background-image", ...)`; no external library.

There are no hover, focus, or scroll states on the backdrop.

## Assets

- `assets/images/auth-scene-01.webp` … `auth-scene-08.webp` — all 1500×1008, WebP q80, converted from the original JPEGs.

## Text Content

N/A (decorative layer, aria-hidden).

## Responsive Behavior

- **Desktop (1440px):** cover, fixed attachment, 1440×900.
- **Tablet (768px):** cover, fixed attachment, 768×1024.
- **Mobile (390px):** cover, fixed attachment, 390×844.
- **Breakpoint:** none; the layer always fills the viewport.
