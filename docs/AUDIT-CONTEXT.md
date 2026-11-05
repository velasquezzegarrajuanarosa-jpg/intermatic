# Contexto para auditoría sin imágenes

El modelo de auditoría **no recibe imágenes como input**. Eso no significa que el proyecto no pueda tener imágenes: significa que no hay que adjuntarlas, incrustarlas en el chat ni pedirle que las lea. El navegador puede usar los assets del sitio normalmente.

## Dos carpetas

- **Implementación completa (original, con assets):** `C:\Users\Djthe\clone intermatico\intermatico-com-bb8f8a88`
- **Copia solo código, sin ningún archivo de imagen:** `C:\Users\Djthe\clone intermatico\intermatico-com-bb8f8a88-auditoria-sin-imagenes`
- **ZIP solo código:** `C:\Users\Djthe\clone intermatico\intermatico-auditoria-sin-imagenes.zip`

Usa la copia solo código si el arnés de auditoría intenta adjuntar automáticamente todos los archivos. Usa la implementación completa si el auditor puede abrir la app y consultar el DOM sin tomar capturas.

**No uses esta conversación para la auditoría:** ya contiene imágenes adjuntas. Abre una sesión nueva.

## Qué puede auditar el modelo sin ver píxeles

- HTML, CSS, JS, estructura DOM, estados, textos, validaciones y hooks de API.
- Snapshot textual de las 14 vistas/estados en `docs/AUDIT-STATE.json`: DOM visible, textos, posiciones, estilos computados, imágenes referenciadas, enlaces, botones e inputs.
- Manifest de assets en `docs/research/intermatico-com-bb8f8a88/root-8a5edab2/ASSETS.md`: formato, dimensiones, bytes y uso.
- Puede ejecutar la app en un servidor local y consultar `getComputedStyle`, `getBoundingClientRect`, `naturalWidth`, estados de botones e inputs, y requests HTTP 200. Lo que no puede hacer es mirar capturas; para eso está tu auditoría visual/manual.

## Flujo implementado

### Landing (`index.html`)
- Fondo escénico: imagen por defecto + selección aleatoria de 8 imágenes guardada en `sessionStorage`.
- Botones Personas/Empresas → páginas locales.
- Hover de botones, enlaces, footer y menú de contexto.
- Sin formularios ni credenciales.

### Personas (`personas/index.html`)
1. Usuario.
2. Contraseña: avatar demo, ojo mostrar/ocultar, volver.
3. Registra este dispositivo: nombre + Continuar/Cancelar.
4. Código PacifiID: código + Continuar/Cancelar.
5. Spinner “Cargando…” en cada transición.

### Empresas (`empresas/index.html`)
1. Usuario.
2. Contraseña.
3. Se detiene ahí. Incluye spinner, Volver y el aviso local.

## Hooks de API (sin llamadas reales)

```js
window.PacUserCheck = async (usuario) => ({ valid: true });
window.PacLoginCheck = async (usuario, clave) => ({ valid: true });
window.PacCodeCheck = async (codigo) => ({ valid: true });
window.PacBusinessLoginCheck = async (usuario, clave) => ({ valid: true });
```

Si un hook devuelve `{ valid: false, message: "..." }`, el flujo se detiene en ese paso. El código no llama a ninguna API bancaria real.

## Assets

Las imágenes del sitio siguen en la implementación original porque son necesarias para renderizar:

- 8 escenas WebP de 1500×1008.
- Wordmarks WebP, símbolo de acceso y assets de Personas/Empresas.
- 12 SVG de iconos.
- Favicon ICO.
- 4 fuentes WOFF2.

No hay capturas de pantalla ni imágenes de QA en `docs/`. La copia solo código no incluye ninguno de estos binarios; conserva las mismas referencias en el código.

## Prompt sugerido para el auditor

> Audita este proyecto en modo solo texto. No adjuntes, leas ni generes imágenes ni capturas. Usa el código, `docs/AUDIT-STATE.json` y consultas DOM/computed styles si necesitas ejecutar la app. La fidelidad visual la revisa una persona por separado.
