# Transformation Audit

Machine-readable artifact: `qa/transformation-audit.json`.

## Identifier Audit

Shipped files scanned: landing page, both form pages, all four landing partials, all stylesheets, all scripts, and `README.md`.

Original tokens checked (selectors, IDs, classes, data attributes, JS globals, storage key):

- `#background`, `#bodywrapper`, `#top`, `#toplinks`, `#headerlogin`, `#content`, `#contentwrapper`
- `.wrapper`, `.login`, `.titulo`, `.logotipo`, `.logo-valid`, `.parrafo`, `.button-group`, `.btn`, `.boton-secundario`, `.espacio`
- `#footerlogin`, `#footerline`, `#footercontent`, `#footertext`, `#footertext2`, `#footertext3`, `.br`
- `bgls`, `sayswho`, `_gaq`, `jQuery`, `javascript:`, `#username`, `#user`, `#btnIngresar`

**Result:** 0 hits. The landing uses the new `pac-*` vocabulary; the Personas page uses `pfl-*`; the Empresas page uses `emp-*`.

## Asset Audit

- `assets/images/`: 15 files, all `.webp` — 8 scenes, 2 landing wordmarks, 1 access symbol, 1 Personas wordmark, and 3 Empresas form assets.
- `assets/fonts/`: 4 files, all `.woff2` — landing Roboto and Personas Inter 400/500/700.
- `assets/icons/`: 1 favicon `.ico` plus 12 SVG icons.
- No `.jpg`, `.jpeg`, `.png`, `.gif`, `.ttf`, `.otf`, `.woff` files ship.
- Image dimensions were verified against the source after conversion.
- Transparent marks retained alpha.

## Network Audit

- No `<link>` to Google Fonts or any CDN.
- No external `<script>` or `@import`.
- No external font URLs.
- Runtime resource entries for the landing and form pages are all local.
- The only absolute `https://` strings are navigation destinations, tutorial links, and display text; they are not fetched on load.

## Color Audit

- All landing color tokens use `rgb()` for values whose source notation was hex.
- The only alpha landing color is the card shadow: source `rgba(0, 0, 0, 0.3)` → output `#0000004d` (round-trip error 0.00196, below the 0.004 tolerance).
- Landing section stylesheets reference only custom properties, not literal colors.
- Computed-style diff reported no color differences on any mapped landing element.

## Code Audit

- No framework, bundler, package manifest, or build step.
- No inline `<style>` blocks.
- No inline `<script>` blocks; all behavior is in classic external scripts.
- JavaScript is re-authored with new function and constant names.
- All asset and stylesheet paths are relative.
- The landing page works from `file://` because it uses classic scripts, not ES modules.
