# Legal Footer Specification

## Overview

- **Target partial:** `partials/root-8a5edab2--footer.html`
- **Target CSS:** `styles/sections/root-8a5edab2--footer.css`
- **Section root class:** `.pac-footer`
- **Interaction model:** static; one hover link
- **Screenshot:** `docs/design-references/intermatico-com-bb8f8a88/root-8a5edab2/section-footer-desktop.png`

## Class Name Mapping

| Original (extraction reference only) | New (output) |
|---|---|
| `#footerlogin` | `.pac-footer` |
| `#footerline` | `.pac-footer__rule` |
| `#footercontent` | `.pac-footer__inner` |
| `#footertext3` | `.pac-footer__compat` |
| `#footertext2` | `.pac-footer__spacer` |
| `#footertext` | `.pac-footer__security` |
| `#footertext a` | `.pac-footer__link` |
| `.br` | `.pac-clear` (scoped as `.pac-footer .pac-clear`) |

## DOM Structure

```
.pac-footer
  .pac-footer__rule
  .pac-footer__inner
    .pac-footer__compat
    .pac-footer__spacer
    .pac-footer__security
      strong > a.pac-footer__link
```

## Computed Styles

### `.pac-footer`

- position: fixed; left/right/bottom: 0; width: 100%; height: 63px
- background-color: `rgb(241, 246, 251)`
- color: `rgb(88, 88, 91)`
- font: 400 10px/normal Roboto, Helvetica, Arial, sans-serif
- measured at 1440px: y=837; at 390px: y=781

### `.pac-footer__rule`

- height: 2px; background-color: `rgb(161, 199, 218)`

### `.pac-footer__inner`

- width: 1000px; margin: 10px auto 0
- measured at 1440px: x=220, y=849, 1000×27
- at 768/390px the box remains 1000px wide and overflows the viewport to the right, matching the original

### `.pac-footer__compat`

- float: right; padding: 1px 20px 0 0
- font-size: 9px; text-align: right
- begins with a `<br>` so the first text line sits below the reserved line
- hidden below 980px

### `.pac-footer__spacer`

- float: right; width: 84px; padding: 1px 20px 0
- empty; height 1px

### `.pac-footer__security`

- padding: 1px 0 0 20px
- width: 1000px; height: 27px

### `.pac-footer__link`

- color: `rgb(0, 121, 192)`
- font-weight: 700
- `strong` supplies the bold weight
- **hover:** underline; color unchanged

### `.pac-footer .pac-clear`

- clear: left

## States & Behaviors

### Security link hover

- **Trigger:** pointer over “POR SU SEGURIDAD”.
- **State A:** no underline.
- **State B:** underline.
- **Transition:** none.

## Text Content (verbatim)

Compatibility block:

```
Internet Explorer 11.0; Chrome 36.0.1; Firefox 31.0; | Resolucion óptima: 1280x1024
© Copyright 2026 Banco del Pacífico * V.14.0.0
```

Security block:

```
POR SU SEGURIDAD
Antes de ingresar sus datos en esta pantalla, verifique si la dirección en la barra superior es: https://www.intermatico.com
```

## Assets

No images. Fonts use the shared self-hosted Roboto woff2.

## Responsive Behavior

- **Desktop (1440px):** 1000px inner centered; compatibility text visible on the right; security text on the left.
- **Tablet (768px):** compatibility text hidden; spacer remains; security text starts at the left edge and is clipped by the 1000px inner width.
- **Mobile (390px):** same as tablet; the fixed footer is 63px high at the bottom, and the security line is clipped at the viewport edge.
- **Breakpoint:** 980px for hiding the compatibility block.
