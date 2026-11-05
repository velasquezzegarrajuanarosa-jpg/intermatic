# QA Report

**Target:** `https://www.intermatico.com/`  
**Clone:** `index.html` in this folder  
**QA date:** 2026-11-04  
**Tooling:** Chromium via Playwright, pixelmatch/pngjs, computed-style extraction, Node audit scripts.

## Runtime

| Check | Result |
|---|---|
| Console errors (1440, 768, 390) | 0 |
| Console errors (DPR 2) | 0 |
| Failed requests / 404s | 0 |
| Font requests | self-hosted WOFF2, 0 external |
| External CSS/JS/font requests | 0 |
| Broken images | 0 |
| Scene files reachable | 8/8 HTTP 200 |

## Pixel Diff

| Viewport | Dimensions | Differing pixels | Share | Pass bar |
|---|---:|---:|---:|---:|
| Desktop 1440×900 | 1440×900 | 0 | **0.0000%** | ≤0.1% |
| Tablet 768×1024 | 768×1024 | 0 | **0.0000%** | ≤0.1% |
| Mobile 390×844 | 390×844 | 0 | **0.0000%** | ≤0.1% |
| Desktop DPR 2 | 2880×1800 | 292 | **0.0056%** | ≤0.1% |

Desktop, tablet, and mobile captures are pixel-identical. The DPR2 residue is limited to the retina wordmark edges after WebP re-encoding.

Screenshot and diff image artifacts were removed at the user's request so the package can be audited by an image-free model. The numeric results remain in `qa/pixel-diff.md`.

## Computed Style / Geometry Diff

All 27 mapped element roles were compared at 390, 768, and 1440px:

- body, scenic stage, frame, strip, shortcut row, shortcut link, brand, hidden title
- card shell and content wrapper, gateway, card, form, welcome, symbol block, symbol, caption, choices, first choice, gap
- footer, rule, inner, compatibility block, spacer, security block, security link

**Result:** every mapped element matched x, y, width, and height at every viewport. There was no drift in font size, line height, weight, color, padding, margin, radius, shadow, or transition values. The only positioning/z-index differences are the documented page-wrapper substitutions below.

The remaining entries in `qa/style-diff.md` are intentional re-authoring differences:

- The scenic layer is `absolute` inside a fixed `.pac-viewport` instead of `fixed` at the document root; this preserves the original compositing and subpixel text rendering.
- The frame is absolutely positioned at 8px instead of relying on the original collapsed-margin stack; the 8px offset is encoded in the frame instead of the shortcut row.
- Background image URLs point at local transformed WebP assets instead of remote JPEG/PNG files.
- The original percentage `top` values on the header resolve to 0 in the source because its containing block height is content-dependent; the clone writes the resulting 0 offset explicitly.

## State and Interaction QA

| Check | Original | Clone |
|---|---|---|
| Choice default background | `rgb(0, 121, 193)` | identical |
| Choice hover background | `rgb(0, 94, 184)` | identical |
| Choice hover transition | `all 0.1s ease-out` | identical |
| Choice inset ring | `rgb(225, 225, 225) 0 0 0 1px inset` | identical |
| Choice transform | `matrix(1, 0, 0, 1, 0, 0)` | identical |
| Choice cursor / outline | `auto` / `none` | identical |
| Shortcut hover | underline | identical |
| Footer link hover | underline | identical |
| Scene persistence | session key `bgls` | session key `pacifico-auth-scene` |
| Context menu | prevented | prevented |
| Personas destination | live e-banking endpoint | local `personas/index.html` first-step demo |
| Empresas destination | live login endpoint | local `empresas/index.html` first-step demo |

All hover comparisons were exact matches for both 1440px and 390px.

## Form Pages

The two access choices now open local multi-step flows.

| Check | Personas | Empresas |
|---|---|---|
| Local route | `personas/index.html` | `empresas/index.html` |
| Steps | username → password → device → PacifiID code | username → password |
| Console errors / 404s | 0 / 0 | 0 / 0 |
| Loading overlay | Included for every transition | Included for every transition |
| Password visibility | Eye toggle | Native password field |
| Validation gate | `PacUserCheck` / `PacLoginCheck` hooks | `PacBusinessLoginCheck` hook |
| Code gate | `PacCodeCheck` hook; local pending notice until connected | — |
| Credentials transmitted | None | None |
| Visual QA | username screen 0.8384% desktop / 0.9407% mobile vs original; subsequent steps manually checked | visually checked at 1440/390; scenic photo is random |

The flow reproduces the requested sequence and local state changes. It does not call any real banking API. The landing page's 0.0000% pixel result is unaffected by these additional pages.

## Transformation Audit

| Rule | Result |
|---|---|
| Original CSS classes / IDs / data attributes in shipped files | **0 hits** |
| Original JS names / globals / storage key | **0 hits** |
| Raster images in `assets/images` | **all `.webp`** |
| Fonts in `assets/fonts` | **all `.woff2`** |
| Favicon | original `.ico` format retained |
| External CSS / JS / fonts | **none** |
| Color notation | original hex → `rgb()`; original `rgba()` shadow → 8-digit hex; computed values verified identical |
| Inline `<style>` / `<script>` blocks | none |
| Frameworks / CDNs / build step | none |

The only absolute URLs in the package are intentional navigation targets for the two access choices and the security footer link; they are not resource requests.

## Weight

| Measurement | Original | Clone |
|---|---:|---:|
| Landing page initial transfer (scene 05) | 422,048 bytes | **221,047 bytes** |
| Deployable files on disk (landing + both form pages + all 8 scenes) | — | 1,025,079 bytes / 53 files |

Landing initial transfer is 47.6% lighter. The on-disk total includes both form pages, all local icons/fonts, and all eight random scenes.

## Known Gaps

- The Personas flow includes username, password, device registration, and PacifiID code UI. The Empresas flow stops after password. The unlock flow, account creation, product request, and live dashboard are not reproduced.
- Forms are local-only demos: no data is posted, stored, or transmitted. The validation and code APIs are represented by `window.Pac*Check` hooks; no real endpoint has been called.
- The security footer link still points to the official live page.
- Google Analytics, the external `seguridad.evidenciainformatica.com.ec` script, and the legacy browser redirect were deliberately omitted.
- The scene is random by design. QA pinned scene 05 through session storage for deterministic comparison.
- Scripts are classic scripts, so the landing page works from `file://`; a static server is still recommended for the complete package.
- DPR2 score is 0.0056% rather than 0.0000% because of WebP re-encoding of the retina wordmark.
- Form-page visual diffs are above the landing-page gate because of font antialiasing, small icon scaling, and the intentionally simplified card/notice spacing. The landing page itself remains pixel-identical.

## How to View

From this folder:

```powershell
python -m http.server 8137 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8137/`. Reload to see a different random scene (the choice persists for the session).
