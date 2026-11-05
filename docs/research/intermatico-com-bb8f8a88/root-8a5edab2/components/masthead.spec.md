# Masthead Specification

## Overview

- **Target partial:** `partials/root-8a5edab2--masthead.html`
- **Target CSS:** `styles/sections/root-8a5edab2--masthead.css`
- **Section root class:** `.pac-frame`
- **Interaction model:** static; one hover link
- **Screenshot:** `docs/design-references/intermatico-com-bb8f8a88/root-8a5edab2/section-header-desktop.png`

## Class Name Mapping

| Original (extraction reference only) | New (output) |
|---|---|
| `#bodywrapper` | `.pac-frame` |
| `#top` | `.pac-strip` |
| `#toplinks` | `.pac-shortcuts` |
| `#toplinks a` | `.pac-shortcuts__link` |
| `#headerlogin` | `.pac-brand` |
| `#headerlogin h1` | `.pac-brand__title` |
| `logo.png` | `brand-wordmark.webp` |
| `logo-2x.png` | `brand-wordmark-retina.webp` |

## DOM Structure

`.pac-frame > (.pac-strip > .pac-shortcuts > .pac-shortcuts__link) + (.pac-brand > .pac-brand__title)`

The title is real text, visually hidden by the inherited `text-indent: -10000px` on `.pac-brand`; the visible identity is the background image.

## Computed Styles

### `.pac-frame`

- position: absolute; top: 8px; left: 0; right: 0
- width: 1000px; margin: 0 auto; overflow: hidden
- height: 103px (30px strip + 3px collapsed heading margin + 70px brand)
- background: transparent

### `.pac-strip`

- height: 30px

### `.pac-shortcuts`

- width: 100%; height: 24px
- color: `rgb(255, 255, 255)`
- font: 100 13px/18px Roboto, Helvetica, Arial, sans-serif
- text-align: right

### `.pac-shortcuts__link`

- color: `rgb(255, 255, 255)`; text-decoration: none
- margin-left: 15px
- **hover:** underline; color unchanged
- measured at 1440px: x=1188.094, y=8, 31.906×18

### `.pac-brand`

- position: relative; left: 37%
- width: 1000px; height: 70px
- background-image: `brand-wordmark.webp`; repeat: no-repeat; position: 0% 0%
- text-indent: -10000px
- **retina:** `brand-wordmark-retina.webp`, `background-size: 250px auto`, position 0% 0%
- measured at 1440px: x=590, y=41, 1000×70

### `.pac-brand__title`

- font: 700 22px/normal Roboto, Helvetica, Arial, sans-serif
- color: `rgb(51, 51, 51)`
- margin: 3px 0 8px
- visually clipped left by the inherited text indent

## States & Behaviors

### Shortcut hover

- **Trigger:** pointer over “Inicio”.
- **State A:** `text-decoration: none`.
- **State B:** `text-decoration: underline`.
- **Transition:** none.
- **Implementation:** CSS `:hover`.

### Responsive shell switch

- **Trigger:** viewport ≤980px.
- **State A (desktop):** frame 1000px centered; brand offset `left: 37%`; shortcut text right-aligned; wordmark at left edge of brand.
- **State B (tablet/mobile):** frame 100%; brand `left: 0`, width 100%; wordmark `background-position: 50% 0%`; shortcut text centered.
- **Transition:** none.
- **Implementation:** `@media screen and (max-width: 980px)`.

## Assets

- `assets/images/brand-wordmark.webp` (250×69, alpha)
- `assets/images/brand-wordmark-retina.webp` (1000×276, alpha)
- `assets/fonts/pacifico-text-regular.woff2` (body font; the wordmark itself is an image)

## Text Content (verbatim)

- Shortcut: `Inicio`
- Hidden heading: `Intermático del Banco del Pacífico`

## Responsive Behavior

- **Desktop (1440px):** `.pac-frame` at x=220, width 1000; `.pac-brand` at x=590, width 1000; shortcut at right.
- **Tablet (768px):** `.pac-frame` x=0, width 768; brand x=0, width 768; wordmark centered; shortcut centered.
- **Mobile (390px):** frame and brand 390px wide; wordmark centered at x=70; shortcut centered.
- **Breakpoint:** 980px.
