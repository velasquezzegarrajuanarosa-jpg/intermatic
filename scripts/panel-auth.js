// ============================================================
// AUTENTICACIÓN DEL PANEL — una sola contraseña.
// El acceso sale por token (localStorage + URL ?k= + cookie):
// funciona aunque el navegador bloquee cookies y caché.
// ============================================================
(function () {
  "use strict";

  var candado = document.getElementById("pl-candado");
  var error = document.getElementById("pl-candado-error");
  var input = document.getElementById("pl-clave");
  var boton = document.getElementById("pl-entrar");

  function mostrarError(msg) {
    if (!error) return;
    error.textContent = msg || "";
    error.hidden = !msg;
  }

  function tokenActual() {
    var k = "";
    try { k = new URLSearchParams(location.search).get("k") || ""; } catch (e) {}
    try { return localStorage.getItem("panelToken") || k; } catch (e) { return k; }
  }

  function post(url, body) {
    var token = tokenActual();
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "x-panel-token": token } : {}) },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function entrar() {
    mostrarError("");
    var clave = (input && input.value) || "";
    if (!clave) return mostrarError("Escribe la contraseña.");
    boton.disabled = true;
    post("/api/panel/entrar", { clave: clave }).then(function (r) {
      boton.disabled = false;
      if (!r.ok) return mostrarError(r.mensaje || "Contraseña incorrecta.");
      try { localStorage.setItem("panelToken", r.token); } catch (e) {}
      location.href = "/panel/?k=" + encodeURIComponent(r.token || "");
    }).catch(function () {
      boton.disabled = false;
      mostrarError("No se pudo conectar con el servidor.");
    });
  }

  async function iniciar() {
    if (boton) boton.addEventListener("click", entrar);
    if (input) {
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") entrar();
      });
    }

    var e;
    try {
      var token = tokenActual();
      e = await fetch("/api/panel/llave/estado", { cache: "no-store", headers: token ? { "x-panel-token": token } : {} })
        .then(function (r) { return r.json(); });
    } catch (err) {
      return;
    }

    if (e && e.autenticado) {
      if (window.PacPanelArrancar) window.PacPanelArrancar();
      return; // ya dentro
    }

    candado.hidden = false;
    if (input) input.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
