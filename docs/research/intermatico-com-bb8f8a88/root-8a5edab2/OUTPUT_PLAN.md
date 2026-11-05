# Output Plan

## Target

- **URL:** `https://www.intermatico.com/`
- **Normalized origin:** `https://www.intermatico.com`
- **Site key:** `intermatico-com-bb8f8a88`
- **Page key:** `root-8a5edab2`
- **Output root:** `C:\Users\Djthe\clone intermatico\intermatico-com-bb8f8a88`
- **Destination document:** `index.html`

## Existing Output Inventory

Before this run the destination folder contained only `skill-clone-website-static.zip`. The zip was preserved unchanged. There was no prior clone output to merge or replace.

## Page Mapping

| Source URL | Destination | Notes |
|---|---|---|
| `https://www.intermatico.com/` | `index.html` | Landing page |
| `https://www.intermatico.com/ebanking/seguridad/login.htm` | `personas/index.html` | Username → password → device → PacifiID code demo |
| `https://www.intermatico.com/Login/Index` | `empresas/index.html` | Username → password demo |

The two access choices open the local flow pages. Personas includes password, device registration, and PacifiID code steps; Empresas stops after the password step. Validation/code APIs are represented by `window.Pac*Check` hooks. No credentials are posted, stored, or transmitted. The security footer link still points at the official live page.

## Shared Foundation

Written by the foreman:

- `styles/tokens.css` — color, type, radii, shell width, and the self-hosted font faces.
- `styles/base.css` — reset, body typography, page-level `.pac-viewport` layer, element defaults.
- `styles/personas.css` — standalone Personas page layout and fonts.
- `scripts/main.js` — classic entry point and global context-menu behavior.
- `index.html` — assembled landing page.
- `personas/index.html`, `empresas/index.html` — local first-step access screens.

## Sections

| Section | Partial | CSS | JS |
|---|---|---|---|
| Scenic backdrop | `partials/root-8a5edab2--backdrop.html` | `styles/sections/root-8a5edab2--backdrop.css` | `scripts/sections/root-8a5edab2--backdrop.js` |
| Masthead and top shortcut | `partials/root-8a5edab2--masthead.html` | `styles/sections/root-8a5edab2--masthead.css` | — |
| Access card and choices | `partials/root-8a5edab2--auth-card.html` | `styles/sections/root-8a5edab2--auth-card.css` | `scripts/sections/root-8a5edab2--auth-gate.js` |
| Legal footer | `partials/root-8a5edab2--footer.html` | `styles/sections/root-8a5edab2--footer.css` | — |

Additional pages:

| Page | CSS | JS |
|---|---|---|
| Personas flow | `styles/personas.css` | `scripts/personas.js` |
| Empresas flow | shared foundation + `styles/sections/empresas-card.css` | `scripts/empresas.js` |

The assembled page wraps the three viewport sections in `.pac-viewport`. That fixed page shell is the shared composition layer; it keeps the scenic layer and foreground in one compositing context, which is required for the original subpixel text rendering.

## Assets

- Eight scenic photographs → `assets/images/auth-scene-01.webp` … `auth-scene-08.webp`, WebP q80.
- Wordmark → `assets/images/brand-wordmark.webp` and `brand-wordmark-retina.webp`, WebP q80 with alpha.
- Card symbol → `assets/images/access-symbol.webp`, WebP q80 with alpha.
- Roboto Regular → `assets/fonts/pacifico-text-regular.woff2`.
- Personas wordmark → `assets/images/personas-wordmark.webp`, WebP q80 with alpha.
- Personas icons → `assets/icons/personas-*.svg`, copied as SVG with new names.
- Personas type → `assets/fonts/personas-inter-regular.woff2`, `personas-inter-medium.woff2`, `personas-inter-bold.woff2`.
- Empresas intro and user label → `assets/images/empresas-intro.webp`, `empresas-user-label.webp`, WebP q80 with alpha.
- Favicon → `assets/icons/pacifico.ico`, kept in its original format.

Staging files are kept outside the output root and are not part of the deployable package.

## Collisions

None. Every section owns separate partial, CSS, and JS files. No prior page, section, or asset was overwritten.
