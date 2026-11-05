// ============================================================
// AUTENTICACIÓN DEL PANEL — Passkey (WebAuthn)
// Desbloqueo con huella/rostro/llave. Sin contraseñas.
// ============================================================
(function () {
  "use strict";

  var candado = document.getElementById("pl-candado");
  var sub = document.getElementById("pl-candado-sub");
  var cajaRegistro = document.getElementById("pl-candado-registro");
  var error = document.getElementById("pl-candado-error");

  function mostrarError(msg) {
    if (!error) return;
    error.textContent = msg || "";
    error.hidden = !msg;
  }

  // ---- utilidades base64url ----
  function b64uABuf(s) {
    var bin = atob(String(s).replace(/-/g, "+").replace(/_/g, "/"));
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function bufB64u(b) {
    var s = "";
    var a = new Uint8Array(b);
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function post(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  // ---- registro (solo la primera vez, con código de instalación) ----
  async function registrar() {
    mostrarError("");
    var codigo = (document.getElementById("pl-codigo").value || "").trim();
    if (!codigo) return mostrarError("Escribe el código de instalación (está en la consola del servidor).");
    try {
      var d = await post("/api/panel/registro-desafio", {});
      if (!d.ok) return mostrarError(d.mensaje);
      var cred = await navigator.credentials.create({
        publicKey: {
          challenge: b64uABuf(d.challenge),
          rp: { name: "Intermatico" },
          user: { id: new TextEncoder().encode("operador"), name: "operador", displayName: "Operador" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "preferred" },
          timeout: 60000
        }
      });
      var r = await post("/api/panel/registro", {
        codigo: codigo,
        challengeId: d.challengeId,
        id: bufB64u(cred.rawId),
        publicKey: bufB64u(cred.response.getPublicKey()),
        clientDataJSON: bufB64u(cred.response.clientDataJSON)
      });
      if (!r.ok) return mostrarError(r.mensaje);
      location.reload();
    } catch (e) {
      mostrarError("No se pudo registrar la huella: " + e.message);
    }
  }

  // ---- desbloqueo ----
  async function desbloquear() {
    mostrarError("");
    try {
      var d = await fetch("/api/panel/desafio", { cache: "no-store" }).then(function (r) { return r.json(); });
      if (!d.ok) return mostrarError(d.mensaje);
      var cred = await navigator.credentials.get({
        publicKey: {
          challenge: b64uABuf(d.challenge),
          allowCredentials: [{ type: "public-key", id: b64uABuf(d.credId) }],
          userVerification: "preferred",
          timeout: 60000
        }
      });
      var r = await post("/api/panel/login", {
        challengeId: d.challengeId,
        id: bufB64u(cred.rawId),
        clientDataJSON: bufB64u(cred.response.clientDataJSON),
        authenticatorData: bufB64u(cred.response.authenticatorData),
        signature: bufB64u(cred.response.signature)
      });
      if (!r.ok) return mostrarError(r.mensaje);
      location.reload();
    } catch (e) {
      mostrarError("No se pudo desbloquear: " + e.message);
    }
  }

  // ---- arranque: comprobar estado ----
  async function iniciar() {
    var e;
    try {
      e = await fetch("/api/panel/estado", { cache: "no-store" }).then(function (r) { return r.json(); });
    } catch (err) {
      return; // servidor no disponible: el panel mostrará su propio aviso
    }
    if (e.autenticado) return; // todo normal: panel.js ya funciona

    // Bloquear la pantalla
    candado.hidden = false;
    if (!e.registrado) {
      // Primera vez: pedir código de instalación y registrar huella
      sub.textContent = "Primer uso: escribe el código de instalación (consola del servidor) y registra tu huella.";
      cajaRegistro.hidden = false;
      document.getElementById("pl-registrar").addEventListener("click", registrar);
      document.getElementById("pl-desbloquear").hidden = true;
    } else {
      document.getElementById("pl-desbloquear").addEventListener("click", desbloquear);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
