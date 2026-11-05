# Access Card Specification

## Overview

- **Target partial:** `partials/root-8a5edab2--auth-card.html`
- **Target CSS:** `styles/sections/root-8a5edab2--auth-card.css`
- **Target JS:** `scripts/sections/root-8a5edab2--auth-gate.js`
- **Section root class:** `.pac-main`
- **Interaction model:** static layout; click navigation; hover on two choices
- **Screenshot:** `docs/design-references/intermatico-com-bb8f8a88/root-8a5edab2/section-card-desktop.png`

## Class Name Mapping

| Original (extraction reference only) | New (output) |
|---|---|
| `#content` | `.pac-main` |
| `#contentwrapper` | `.pac-main__inner` |
| `.wrapper` | `.pac-gateway` |
| `.login` | `.pac-auth-card` |
| `form` | `.pac-form` |
| `.titulo` | `.pac-welcome` |
| `.logotipo` | `.pac-symbol-block` |
| `.logo-valid` | `.pac-symbol` |
| `.parrafo` | `.pac-caption` |
| `.button-group` | `.pac-choices` |
| `.btn` / `.boton-secundario` | `.pac-choice` |
| `.espacio` | `.pac-choice-gap` |
| inline 100px spacer | `.pac-tail` |
| `onclick="location.href=..."` | `data-pac-go` + module |
| `Trazado 149@2x.png` | `access-symbol.webp` |

## DOM Structure

```
.pac-main
  .pac-main__inner
    .pac-gateway
      .pac-auth-card
        .pac-form
          .pac-welcome
          .pac-symbol-block
            img.pac-symbol
            .pac-caption
          .pac-choices
            button.pac-choice[data-pac-go=personal]
            .pac-choice-gap
            button.pac-choice[data-pac-go=business]
    .pac-tail
```

`.pac-auth-card` is the positioned ancestor for the absolutely positioned choices.

## Computed Styles

### `.pac-main`

- position: absolute; top: 111px; left: calc(50% - 500px); width: 1000px
- height: 580px at desktop/tablet; 540px at mobile
- background: transparent

### `.pac-main__inner`

- padding: 20px; overflow: auto
- width: 1000px at desktop; 100% below 980px
- padding becomes 0 below 980px

### `.pac-gateway`

- display: flex; flex-direction: column; align-items: center; justify-content: center
- width: 100%; min-height: 100%; padding: 20px
- height: 440px

### `.pac-auth-card`

- position: relative; width: 70%; max-width: 340px; height: 400px
- padding: 30px 20px 10px 30px
- background: `rgb(255, 255, 255)`
- border-radius: 6px
- box-shadow: `0 1px 5px #0000004d`
- text-align: center
- measured at 1440px: x=550, y=151, 340×400
- measured at 390px: x=72.5, y=131, 245×400

### `.pac-form`

- margin: 0
- measured at 1440px: x=580, y=187, 290×267.484

### `.pac-welcome`

- padding: 5px
- margin: 6px 0 (global paragraph margin)
- color: `rgb(0, 42, 102)`
- font: 400 22px/26.4px Roboto, Helvetica, Arial, sans-serif
- height: 62.8125px (two line boxes plus 10px padding)

### `.pac-symbol-block`

- no own padding/margin/background
- measured at 1440px: x=580, y=255.813, 290×142.672
- measured at 390px: x=102.5, y=235.813, 195×128.312

### `.pac-symbol`

- display: inline (default)
- width: 59%; height: 59%
- intrinsic 586×351, rendered 171.094×102.469 at 1440px and 115.047×68.906 at 390px
- color: `rgb(0, 94, 184)` (not visible; image supplies colors)

### `.pac-caption`

- padding-top: 12px
- margin: 6px 0
- color: `rgb(0, 0, 0)`
- font: 400 16px/19.2px Roboto, Helvetica, Arial, sans-serif
- one line at desktop/tablet (31.203px high); two lines at 390px (50.406px high)

### `.pac-choices`

- display: block; width: 290px at 1440px, 195px at 390px; height: 50px
- y=404.484 at 1440px; y=370.125 at 390px

### `.pac-choice`

- position: absolute; left: 5%
- display: block; width: 90%; height: 40%; max-height: 40px
- margin-top: 20px; padding: 7px
- border: 0; border-radius: 6px
- background-color: `rgb(0, 121, 193)`; color: `rgb(255, 255, 255)`
- box-shadow: inset 0 0 0 1px `rgb(225, 225, 225)`
- font: 400 15px/normal Arial
- text-align: center; vertical-align: middle; cursor: auto; outline: none
- transform: rotateZ(0) → computed `matrix(1, 0, 0, 1, 0, 0)`
- transition: all 0.1s ease-out
- measured at 1440px: x=567, y=424.484, 306×40
- measured at 390px: x=84.75, y=390.125, 220.5×40

### `.pac-choice:hover`

- background-color: `rgb(0, 94, 184)`
- color: `rgb(255, 255, 255)`
- all other computed values unchanged

### `.pac-choice-gap`

- padding: 25px; height: 50px; no content

### `.pac-tail`

- height: 100px

## States & Behaviors

### Choice hover

- **Trigger:** pointer over either access choice.
- **State A:** background `rgb(0, 121, 193)`.
- **State B:** background `rgb(0, 94, 184)`.
- **Transition:** `all 0.1s ease-out`.
- **Implementation:** CSS `:hover` + transition.

### Choice click

- **Trigger:** click or keyboard activation of a choice.
- **Personas:** navigate to `https://www.intermatico.com/ebanking/seguridad/login.htm`.
- **Empresas:** navigate to `https://www.intermatico.com/Login/Index`.
- **Implementation:** delegated `data-pac-go` map in `initAuthGate`; no form submission and no credential fields.

## Text Content (verbatim)

- `¡Bienvenido!` followed by two line breaks.
- `Para comenzar, seleccione una opción`
- `Banca Virtual Personas`
- `Banca Virtual Empresas`
- Image alt: `Logo`

## Assets

- `assets/images/access-symbol.webp` — 586×351, WebP q80, alpha preserved.
- `assets/fonts/pacifico-text-regular.woff2` — regular weight; Arial is the control font.

## Responsive Behavior

- **Desktop (1440px):** card 340×400, x=550; button 306×40, x=567; title/logos/caption as measured.
- **Tablet (768px):** card 340×400, x=214; button 306×40, x=231; caption one line.
- **Mobile (390px):** card 245×400, x=72.5; button 220.5×40, x=84.75; logo 115×68.9; caption wraps to two lines.
- **Breakpoint:** 980px for the shell/frame; card and caption reflow continuously because the card is 70% with a 340px cap.
