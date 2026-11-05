# Behavior Notes

The page is almost entirely static. All values below were measured with `getComputedStyle()` and interactive states were replayed in Chromium.

## Load

- No SPA hydration or async content.
- The page uses one self-hosted regular-weight font. The only visible headline uses the regular face; the footer's strong text uses synthesized bold, exactly as the original.
- On load, `.pac-stage` has `background-color: rgb(3, 142, 221)`.
- `initBackdrop()` picks one of eight images, writes it to `sessionStorage` under `pacifico-auth-scene`, and sets the inline background image. A reload reuses the stored scene.

## Scroll

- No scroll-driven behavior. The page is fully fixed/absolute and fits the viewport at 1440×900, 768×1024, and 390×844.
- `body` height is 0px; document scroll size equals the viewport.
- `.pac-viewport` is the only scroll container, and only for short viewports where the card plus tail could exceed the viewport.

## Hover

| Element | Before | After | Transition |
|---|---|---|---|
| Access choice | background `rgb(0, 121, 193)`, color white | background `rgb(0, 94, 184)`, color white | `all 0.1s ease-out` |
| Top shortcut | white, no underline | white, underline | none |
| Footer security link | `rgb(0, 121, 192)`, no underline | same color, underline | none |

The access choices also keep the original `transform: matrix(1, 0, 0, 1, 0, 0)`, the 1px inset hairline, `cursor: auto`, and no focus outline.

## Click

- **Banca Virtual Personas** → local `personas/index.html`
- **Banca Virtual Empresas** → local `empresas/index.html`
- **Inicio** → local `index.html`
- **POR SU SEGURIDAD** → `https://www.intermatico.com/Usuario/SeguridadPrincipal`

The Personas and Empresas pages reproduce the first username step. Their submit buttons stay on the local page and reveal a demo notice; no data is posted, stored, or transmitted. The password step and live banking flow are intentionally not implemented.

## Context Menu

- A document-level `contextmenu` listener calls `preventDefault()`, matching the original page.

## Responsive

| Width | Frame | Card | Footer |
|---|---|---|---|
| 1440px | 1000px, centered; wordmark offset 37% | 340×400 at x=550 | 1000px inner, right-side compatibility text visible |
| 768px | 100% wide; wordmark centered | 340×400 at x=214 | 1000px inner, compatibility text hidden |
| 390px | 100% wide; wordmark centered | 245×400 at x=72.5 | 1000px inner, overflows viewport to the right; compatibility text hidden |

The responsive switch happens at **980px**. There are no other layout changes between 1440 and 768.

## Form Flows

- **Personas (`personas/index.html`):** username → password → device registration → PacifiID code. Each primary button enables when its field has content. The password has a visibility toggle. The loading overlay appears for every transition. The password step has a back arrow; the device/code steps have Cancelar. `PacUserCheck`, `PacLoginCheck`, and `PacCodeCheck` are optional lab hooks; the code step shows a pending notice until one is connected.
- **Empresas (`empresas/index.html`):** username → password. The password step has a Volver link. `PacBusinessLoginCheck` is the optional lab hook. The flow stops after the password step, matching the requested scope.
- Neither flow posts, stores, or transmits credentials. No analytics or live banking API is called.

## Deliberately Not Reproduced

- Google Analytics, the external `seguridad.evidenciainformatica.com.ec` script, and the legacy browser-redirect script.
- The anti-forgery hidden input and server-side form submission.
- The password step, unlock flow, account creation, product request, and live pages behind the two access choices.
