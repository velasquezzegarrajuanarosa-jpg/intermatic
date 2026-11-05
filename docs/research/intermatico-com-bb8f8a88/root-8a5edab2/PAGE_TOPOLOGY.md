# Page Topology

**Page:** `https://www.intermatico.com/`  
**Page key:** `root-8a5edab2`  
**Interaction model:** static page with two navigation controls, hover styling, one random scene choice, and a session-persisted scene.

## Layer Order (back to front)

1. **`.pac-viewport`** — fixed page shell at inset 0, `z-index: 0`, `overflow: auto`. It is the containing layer for the scenic backdrop and the foreground composition.
2. **`.pac-stage`** — absolute inset 0 inside the viewport, `z-index: -1`, `overflow: auto`. Carries the sky-blue fallback and the randomly selected photograph as a `cover`, fixed-attachment background.
3. **`.pac-frame`** — absolute, top 8px, 1000px wide and centered, `overflow: hidden`; contains:
   - `.pac-strip` — 30px top strip.
   - `.pac-shortcuts` — 24px shortcut row, right-aligned at desktop, centered below 980px.
   - `.pac-brand` — 70px wordmark band, shifted 37% at desktop and full width below 980px.
4. **`.pac-main`** — absolute, top 111px, 1000px wide and centered; contains the gateway, the white access card, and the 100px tail. It is above the scenic layer, inside the viewport.
5. **`.pac-footer`** — fixed to the bottom, 63px high, above the viewport; contains the 2px rule and the legal/security strip.

`body` remains `display: flex; flex-direction: column` and has zero flow height because every visible layer is fixed or absolute. Document scroll size therefore stays at the viewport size.

## Section Order

1. Scenic backdrop
2. Masthead: shortcut strip + wordmark
3. Gateway: access card + two access choices
4. Legal footer

## Interaction Map

| Element | Model | Trigger | Result |
|---|---|---|---|
| Scenic backdrop | time/persistence | first load | random image from eight; stored in `sessionStorage` and reused |
| “Inicio” | click | click | reloads the local root (`./`) |
| “Banca Virtual Personas” | click | click | opens the local `personas/index.html` first-step demo |
| “Banca Virtual Empresas” | click | click | opens the local `empresas/index.html` first-step demo |
| Access buttons | hover | pointer | background changes from `rgb(0, 121, 193)` to `rgb(0, 94, 184)` over 0.1s ease-out |
| Shortcut / security links | hover | pointer | underline |
| Whole document | context menu | right click | context menu is prevented |

There are no tabs, accordions, scroll-driven state changes, carousels, modals, or dark-mode transitions on this page.

## Dependencies

- The masthead and gateway are positioned relative to the fixed `.pac-viewport`.
- The footer is independent and fixed to the bottom; it overlays the viewport content at short heights.
- The access card's absolutely positioned choices depend on `.pac-auth-card` being the positioned ancestor.
- The backdrop must stay inside `.pac-viewport`; moving it outside changes the text compositing and disables subpixel antialiasing.

## Additional Pages

### Personas first step (personas/index.html)

- Full-page light split layout: 62% access panel + 38% security-tips panel at desktop.
- At 799px and below it stacks: access panel, then tips panel.
- Contains the username field, disabled-until-input Continuar control, secondary actions, and the security tips.
- Local demo only; submit shows a notice and does not navigate or transmit.

### Empresas first step (empresas/index.html)

- Reuses the landing scenic shell, masthead, and footer.
- Adds the legacy 400px business login card, help strip, and notice card.
- Contains the username field and INGRESAR control.
- Local demo only; submit shows a notice and does not navigate or transmit.

