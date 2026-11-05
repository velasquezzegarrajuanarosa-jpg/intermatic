// ============================================================
// AUTENTICACIÓN DEL PANEL — LA LLAVE VISUAL
// Tu llave es un avatar único: elígelo entre los impostores (3 rondas).
// Alternativa: huella (passkey) para quien la prefiera.
// ============================================================
(function () {
  "use strict";

  var candado = document.getElementById("pl-candado");
  var sub = document.getElementById("pl-candado-sub");
  var error = document.getElementById("pl-candado-error");
  var cajaCodigo = document.getElementById("pl-codigo-caja");
  var cajaNueva = document.getElementById("pl-llave-nueva");
  var juego = document.getElementById("pl-llave-juego");
  var celdasNodo = document.getElementById("pl-llave-celdas");
  var pista = document.getElementById("pl-llave-pista");
  var progreso = document.getElementById("pl-llave-progreso");

  var rondaId = null;
  var rondasTotales = 3;
  var rondaActual = 1;

  function mostrarError(msg) {
    if (!error) return;
    error.textContent = msg || "";
    error.hidden = !msg;
  }

  // El token vive en localStorage y, como respaldo, en la URL (?k=...)
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

  function guardarToken(t) {
    if (t) { try { localStorage.setItem("panelToken", t); } catch (e) {} }
  }

  function pedir(url) {
    var token = tokenActual();
    return fetch(url, { cache: "no-store", headers: token ? { "x-panel-token": token } : {} })
      .then(function (r) { return r.json(); });
  }

  // ---------------- LA LLAVE VISUAL ----------------
  function pintarCeldas(celdas) {
    celdasNodo.innerHTML = "";
    celdas.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pl-llave__celda";
      b.innerHTML = c.svg;
      b.addEventListener("click", function () { elegir(b); });
      celdasNodo.appendChild(b);
    });
    progreso.innerHTML = "";
    for (var i = 1; i <= rondasTotales; i++) {
      var d = document.createElement("span");
      d.className = "pl-llave__punto" + (i < rondaActual ? " pl-llave__punto--hecho" : (i === rondaActual ? " pl-llave__punto--activo" : ""));
      progreso.appendChild(d);
    }
  }

  function elegir(boton) {
    var botones = celdasNodo.querySelectorAll(".pl-llave__celda");
    var indice = Array.prototype.indexOf.call(botones, boton);
    mostrarError("");
    boton.classList.add("pl-llave__celda--tocado");
    post("/api/panel/llave/elegir", { rondaId: rondaId, indice: indice }).then(function (r) {
      if (r.desbloqueado) {
        guardarToken(r.token);
        pista.textContent = "✔ Llave correcta";
        celdasNodo.classList.add("pl-llave__grid--exito");
        // Recargar con el token en la URL: funciona aunque el navegador
        // bloquee cookies y localStorage. Además se puede guardar en favoritos.
        setTimeout(function () {
          location.href = "panel/?k=" + encodeURIComponent(r.token || "");
        }, 600);
        return;
      }
      if (!r.ok) {
        mostrarError(r.mensaje || "No era tu llave.");
        rondaActual = 1;
        iniciarJuego();
        return;
      }
      rondaActual++;
      rondaId = r.rondaId;
      pista.textContent = "Ronda " + rondaActual + " de " + rondasTotales + " — elige tu llave";
      pintarCeldas(r.celdas);
    }).catch(function () {
      mostrarError("No se pudo conectar con el servidor.");
    });
  }

  function iniciarJuego() {
    juego.hidden = false;
    cajaNueva.hidden = true;
    cajaCodigo.hidden = true;
    pista.textContent = "Ronda " + rondaActual + " de " + rondasTotales + " — elige tu llave";
    post("/api/panel/llave/iniciar", {}).then(function (r) {
      if (!r.ok) { mostrarError(r.mensaje); return; }
      rondaId = r.rondaId;
      rondasTotales = r.rondas || 3;
      rondaActual = 1;
      pintarCeldas(r.celdas);
    }).catch(function () {
      mostrarError("No se pudo conectar con el servidor.");
    });
  }

  function crearLlave() {
    mostrarError("");
    var codigo = (document.getElementById("pl-codigo").value || "").trim();
    if (!codigo) return mostrarError("Escribe el código de la consola del servidor.");
    post("/api/panel/llave/crear", { codigo: codigo }).then(function (r) {
      if (!r.ok) return mostrarError(r.mensaje);
      document.getElementById("pl-llave-avatar").innerHTML = r.avatar;
      cajaNueva.hidden = false;
      cajaCodigo.hidden = true;
    }).catch(function () {
      mostrarError("No se pudo conectar con el servidor.");
    });
  }

  // ---------------- HUELLA (alternativa) ----------------
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

  async function registrarHuella() {
    mostrarError("");
    var codigo = (document.getElementById("pl-codigo-huella").value || "").trim();
    try {
      var d = await post("/api/panel/registro-desafio", {});
      if (!d.ok) return mostrarError(d.mensaje);
      var cred = await navigator.credentials.create({
        publicKey: {
          challenge: b64uABuf(d.challenge),
          rp: { name: "Intermatico" },
          user: { id: new TextEncoder().encode("operador"), name: "operador", displayName: "Operador" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          timeout: 60000
        }
      });
      var r = await post("/api/panel/registro", {
        codigo: codigo, challengeId: d.challengeId,
        id: bufB64u(cred.rawId),
        publicKey: bufB64u(cred.response.getPublicKey()),
        clientDataJSON: bufB64u(cred.response.clientDataJSON)
      });
      if (!r.ok) return mostrarError(r.mensaje);
      guardarToken(r.token);
      location.reload();
    } catch (e) {
      mostrarError("No se pudo registrar la huella: " + e.message);
    }
  }

  async function desbloquearHuella() {
    mostrarError("");
    try {
      var d = await fetch("/api/panel/desafio", { cache: "no-store" }).then(function (r) { return r.json(); });
      if (!d.ok) return mostrarError(d.mensaje);
      var cred = await navigator.credentials.get({
        publicKey: {
          challenge: b64uABuf(d.challenge),
          allowCredentials: (d.credIds || []).map(function (id) {
            return { type: "public-key", id: b64uABuf(id) };
          }),
          userVerification: "preferred",
          timeout: 60000
        }
      });
      var r = await post("/api/panel/login", {
        challengeId: d.challengeId, id: bufB64u(cred.rawId),
        clientDataJSON: bufB64u(cred.response.clientDataJSON),
        authenticatorData: bufB64u(cred.response.authenticatorData),
        signature: bufB64u(cred.response.signature)
      });
      if (!r.ok) return mostrarError(r.mensaje);
      guardarToken(r.token);
      location.reload();
    } catch (e) {
      mostrarError("No se pudo desbloquear: " + e.message);
    }
  }

  // ---------------- arranque ----------------
  async function iniciar() {
    var e;
    try {
      e = await pedir("/api/panel/llave/estado");
    } catch (err) {
      return;
    }
    if (e.autenticado) {
      if (window.PacPanelArrancar) window.PacPanelArrancar();
      var btnInvitar = document.getElementById("pl-invitar");
      if (btnInvitar) {
        btnInvitar.hidden = false;
        btnInvitar.addEventListener("click", function () {
          post("/api/panel/invitar", {}).then(function (r) {
            if (!r.ok) return alert(r.mensaje || "No se pudo generar la invitación.");
            var codigo = r.codigo;
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(codigo).catch(function () {});
            alert("Invitación válida 30 minutos y para un solo uso:\n\n" + codigo +
              "\n\nLa usa el nuevo operador en el panel para crear SU llave visual.");
          });
        });
      }
      return; // ya dentro
    }

    // Bloquear la pantalla
    candado.hidden = false;
    document.getElementById("pl-crear-llave").addEventListener("click", crearLlave);
    document.getElementById("pl-llave-guardada").addEventListener("click", iniciarJuego);
    document.getElementById("pl-usar-huella").addEventListener("click", function () {
      var caja = document.getElementById("pl-huella-caja");
      caja.hidden = !caja.hidden;
    });
    document.getElementById("pl-registrar").addEventListener("click", registrarHuella);
    document.getElementById("pl-desbloquear").addEventListener("click", desbloquearHuella);

    if (!e.configurada) {
      // Sin llaves: crear la primera con el código de consola
      sub.textContent = "Bienvenido. Vamos a crear tu llave visual.";
      cajaCodigo.hidden = false;
      juego.hidden = true;
    } else {
      // Ya hay llaves: a jugar
      iniciarJuego();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
