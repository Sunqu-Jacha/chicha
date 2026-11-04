/**
 * Chicha - lógica pura del Apps Script.
 * Funciones globales, sin servicios de Google ni import/export: se prueba en Node con tests/cargar-gs.js.
 * Se usa `var` para que las constantes queden como propiedades del contexto de pruebas.
 */

var COLUMNAS_AGENTES = [
  'id', 'estado', 'capa', 'verificado', 'fecha_envio', 'fecha_aprobacion', 'origen',
  'nombre', 'descripcion', 'logo_url',
  'ofrece', 'sectores', 'tipo_entidad', 'presencia',
  'pais', 'departamento', 'ciudad', 'direccion', 'lat', 'lng',
  'web', 'instagram', 'facebook', 'otras_redes', 'email_publico',
  'nombre_proponente', 'email_proponente', 'notas_moderacion', 'motivo_rechazo',
  'aviso_enviado'
];

var COLUMNAS_CONVOCATORIAS = [
  'id', 'estado', 'fecha_envio', 'fecha_aprobacion',
  'agente_id',
  'titulo', 'año', 'tipo', 'ofrece', 'sectores', 'descripcion', 'monto', 'enlace_bases',
  'fecha_apertura', 'fecha_cierre', 'fecha_resultados',
  'nombre_proponente', 'email_proponente', 'notas_moderacion', 'motivo_rechazo',
  'aviso_enviado'
];

var COLUMNAS_SUGERENCIAS = [
  'id', 'estado', 'fecha_envio', 'tipo_registro', 'registro_id', 'campo', 'valor_propuesto', 'fuente',
  'email_proponente', 'notas_moderacion'
];

// Lista blanca: todo salvo control interno (estado, origen, fecha_envio, aviso_enviado) y columnas privadas.
// En convocatorias tampoco sale fecha_aprobacion (el JSON público del spec §7.1 no la incluye).
var PUBLICAS_AGENTES = [
  'id', 'capa', 'verificado', 'fecha_aprobacion',
  'nombre', 'descripcion', 'logo_url',
  'ofrece', 'sectores', 'tipo_entidad', 'presencia',
  'pais', 'departamento', 'ciudad', 'direccion', 'lat', 'lng',
  'web', 'instagram', 'facebook', 'otras_redes', 'email_publico'
];

var PUBLICAS_CONVOCATORIAS = [
  'id', 'agente_id',
  'titulo', 'año', 'tipo', 'ofrece', 'sectores', 'descripcion', 'monto', 'enlace_bases',
  'fecha_apertura', 'fecha_cierre', 'fecha_resultados'
];

var MULTI = ['ofrece', 'sectores'];

var ZONA_HORARIA = 'America/Lima';
var TIEMPO_MINIMO_MS = 4000;
var FIRMA = "Equipo Chicha · Sunqu Jach'a";

// Misma regla que separarMulti de assets/js/texto.js (la paridad se verifica en tests).
function separarMulti(v) {
  if (v === null || v === undefined) return [];
  var partes = Array.isArray(v) ? v : String(v).split(';');
  return partes.map(function (p) { return String(p).trim(); }).filter(Boolean);
}

// Presencia "Internacional" (sin sede en el Perú): capa Internacional, sin departamento.
function esInternacional(presencia) {
  return typeof presencia === 'string' && presencia.trim() === 'Internacional';
}

function fechaIso(v) {
  var r = fechaIsoCruda(v);
  return esFechaIso(r) ? r : null;
}

function fechaIsoCruda(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') return v.trim().slice(0, 10);
  if (!(v instanceof Date) || isNaN(v.getTime())) return null;
  var partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(v);
  var o = {};
  partes.forEach(function (p) { o[p.type] = p.value; });
  return o.year + '-' + o.month + '-' + o.day;
}

function aCamel(s) {
  if (s === 'año') return 'anio';
  return String(s).replace(/_([a-z0-9])/g, function (_, c) { return c.toUpperCase(); });
}

function filasAObjetos(encabezados, filas) {
  return filas.map(function (fila) {
    var o = {};
    encabezados.forEach(function (h, i) {
      var v = fila[i];
      o[h] = typeof v === 'string' ? v.trim() : v;
    });
    return o;
  });
}

function faltantes(encabezados, esperadas) {
  return esperadas.filter(function (c) { return encabezados.indexOf(c) === -1; });
}

function numeroOnull(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

function esFechaIso(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var p = s.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}

function publicar(registros, publicas) {
  var esConvocatoria = publicas.indexOf('fecha_cierre') !== -1;
  var salida = [];
  registros.forEach(function (r) {
    if (r.estado !== 'aprobado' || ausente(r.id)) return;
    var o = {};
    publicas.forEach(function (col) {
      var v = r[col];
      var clave = aCamel(col);
      if (MULTI.indexOf(col) !== -1) o[clave] = separarMulti(v);
      else if (col.indexOf('fecha_') === 0) o[clave] = fechaIso(v);
      else if (col === 'verificado') o[clave] = v === true || v === 'sí' || v === 'si';
      else if (col === 'lat' || col === 'lng' || col === 'año') o[clave] = numeroOnull(v);
      else o[clave] = v === null || v === undefined ? '' : String(v); // una celda numérica sigue siendo texto en el JSON
    });
    if (esConvocatoria && (!esFechaIso(o.fechaCierre) || o.anio === null)) return;
    salida.push(o);
  });
  return salida;
}

// Una convocatoria solo es pública si su agente también lo es (no archivado ni pendiente).
function conAgenteAprobado(convocatorias, ids) {
  return convocatorias.filter(function (c) { return ids.has(String(c.agenteId).trim()); });
}

// Control que le falta a una fila cargada a mano: solo celdas vacías, nunca pisa lo que ya escribió el script.
// La capa espera a que haya presencia: el nombre suele escribirse antes y luego no se corregiría sola.
function camposPorCompletar(tipo, r, prefijo, hoy, aleatorio) {
  var campos = {};
  var esConvocatoria = tipo === 'convocatoria';
  if (ausente(esConvocatoria ? r.titulo : r.nombre)) return campos;
  if (ausente(r.id)) campos.id = nuevoId(prefijo, aleatorio);
  if (ausente(r.fecha_envio)) campos.fecha_envio = hoy;
  if (!esConvocatoria) {
    if (ausente(r.origen)) campos.origen = 'carga inicial';
    if (ausente(r.capa) && !ausente(r.presencia)) campos.capa = esInternacional(r.presencia) ? 'Internacional' : 'Perú';
  }
  return campos;
}

var OBLIGATORIO = 'Este campo es obligatorio.';
var RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var RE_URL = /^https?:\/\//;
var MAX_TEXTO = 2000;
var MAX_DESCRIPCION = 280;
var MAX_NOMBRE_PROPONENTE = 100;

function ausente(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function validarEnvio(tipo, d, listas, idsAprobados) {
  var e = {};
  d = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
  listas = listas || {};

  // Texto escalar: debe ser string. Devuelve el string recortado, o null si falta o es inválido (ya anotó el error).
  function texto(campo, requerido, max) {
    var v = d[campo];
    if (ausente(v)) { if (requerido) e[campo] = OBLIGATORIO; return null; }
    if (typeof v !== 'string') { e[campo] = 'Revisa este campo.'; return null; }
    var s = v.trim();
    var tope = max || MAX_TEXTO;
    if (s.length > tope) { e[campo] = 'Máximo ' + tope + ' caracteres.'; return null; }
    return s;
  }
  function opcionUnica(campo, lista, requerido) {
    var v = d[campo];
    if (ausente(v)) { if (requerido) e[campo] = OBLIGATORIO; return; }
    if (typeof v !== 'string' || (lista || []).indexOf(v.trim()) === -1) e[campo] = 'Elige una opción de la lista.';
  }
  function opcionMultiple(campo, lista, requerido) {
    var v = d[campo];
    if (ausente(v) || (Array.isArray(v) && v.length === 0)) { if (requerido) e[campo] = OBLIGATORIO; return; }
    var validos = lista || [];
    var ok = Array.isArray(v) && v.every(function (x) { return typeof x === 'string' && validos.indexOf(x.trim()) !== -1; });
    if (!ok) e[campo] = 'Elige una opción de la lista.';
  }
  function correoCampo(campo, requerido) {
    var s = texto(campo, requerido);
    if (s !== null && !RE_CORREO.test(s)) e[campo] = 'Revisa el correo.';
  }
  function urlCampo(campo, requerido) {
    var s = texto(campo, requerido);
    if (s !== null && !RE_URL.test(s)) e[campo] = 'El enlace debe empezar con http:// o https://.';
  }
  function fechaCampo(campo, requerido) {
    var s = texto(campo, requerido);
    if (s !== null && !esFechaIso(s)) e[campo] = 'Usa el formato AAAA-MM-DD.';
  }
  function anioCampo(campo) {
    var v = d[campo];
    if (ausente(v)) { e[campo] = OBLIGATORIO; return; }
    var ok = (typeof v === 'number' || (typeof v === 'string' && /^\d{4}$/.test(v.trim()))) &&
      Number.isInteger(Number(v)) && Number(v) >= 2000 && Number(v) <= 2100;
    if (!ok) e[campo] = 'Revisa el año.';
  }
  function consentimiento() {
    if (d.consentimiento !== true) e.consentimiento = 'Necesitamos tu consentimiento para guardar tu correo.';
  }

  if (tipo === 'agente') {
    texto('nombre', true);
    opcionMultiple('ofrece', listas.ofrece, true);
    opcionMultiple('sectores', listas.sectores, true);
    opcionUnica('tipo_entidad', listas.tiposEntidad, true);
    opcionUnica('presencia', listas.presencia, true);
    // Las entidades internacionales no tienen departamento del Perú.
    var internacional = esInternacional(d.presencia);
    opcionUnica('departamento', listas.departamentos, !internacional);
    texto('ciudad', true);
    texto('pais', false);
    texto('direccion', false);
    texto('otras_redes', false);
    texto('descripcion', true, MAX_DESCRIPCION);
    urlCampo('web', false); urlCampo('instagram', false); urlCampo('facebook', false); urlCampo('logo_url', false);
    correoCampo('email_publico', false);
    texto('nombre_proponente', true, MAX_NOMBRE_PROPONENTE);
    correoCampo('email_proponente', true);
    consentimiento();
  } else if (tipo === 'convocatoria') {
    var ag = texto('agente_id', true);
    if (ag !== null && !(idsAprobados && idsAprobados.has(ag))) e.agente_id = 'Elige un agente publicado.';
    texto('titulo', true);
    anioCampo('anio');
    opcionUnica('tipo', listas.tiposConvocatoria, true);
    opcionMultiple('ofrece', listas.ofrece, false);
    opcionMultiple('sectores', listas.sectores, false);
    texto('descripcion', false, MAX_DESCRIPCION);
    texto('monto', false);
    urlCampo('enlace_bases', true);
    fechaCampo('fecha_apertura', false);
    fechaCampo('fecha_cierre', true);
    fechaCampo('fecha_resultados', false);
    if (!e.fecha_apertura && !e.fecha_cierre && !ausente(d.fecha_apertura) && d.fecha_apertura.trim() > d.fecha_cierre.trim()) {
      e.fecha_apertura = 'La apertura debe ser antes del cierre.';
    }
    if (!e.anio && !e.fecha_cierre && Number(d.anio) !== Number(d.fecha_cierre.trim().slice(0, 4))) {
      e.anio = 'El año debe coincidir con la fecha de cierre.';
    }
    texto('nombre_proponente', true, MAX_NOMBRE_PROPONENTE);
    correoCampo('email_proponente', true);
    consentimiento();
  } else if (tipo === 'sugerencia') {
    opcionUnica('tipo_registro', ['agente', 'convocatoria'], true);
    texto('registro_id', true);
    texto('campo', true);
    texto('valor_propuesto', true);
    texto('fuente', false);
    correoCampo('email_proponente', true);
    consentimiento();
  } else {
    e.tipo = 'Elige una opción de la lista.';
  }
  return e;
}

function esSpam(d, ahoraMs) {
  d = d || {};
  if (!ausente(d.sitio_web_2)) return true;
  // Sin marca de tiempo válida no se puede comprobar el tiempo de llenado: se descarta.
  if (d.t0 === null || d.t0 === undefined || d.t0 === '') return true;
  var t0 = Number(d.t0);
  if (!isFinite(t0)) return true;
  // Reloj del cliente adelantado (transcurrido negativo): no es spam. Solo 0 <= transcurrido < mínimo lo es.
  var transcurrido = ahoraMs - t0;
  return transcurrido >= 0 && transcurrido < TIEMPO_MINIMO_MS;
}

function nuevoId(prefijo, aleatorio) {
  var rnd = aleatorio || Math.random;
  var s = '';
  for (var i = 0; i < 6; i++) {
    var n = Math.floor(rnd() * 36);
    if (!(n >= 0)) n = 0;
    if (n > 35) n = 35;
    s += n.toString(36);
  }
  return prefijo + '-' + s;
}

function correo(tipo, datos) {
  datos = datos || {};
  var asunto, cuerpo;
  if (tipo === 'nuevo-moderador') {
    var t = datos.tipo;
    if (t === 'convocatoria') asunto = '[Chicha] Nueva convocatoria: ' + (datos.titulo || '');
    else if (t === 'sugerencia') asunto = '[Chicha] Nueva sugerencia de cambio';
    else asunto = '[Chicha] Nuevo agente: ' + (datos.nombre || '');
    cuerpo = 'Llegó un envío nuevo para revisar.\n\n' +
      (datos.resumen ? datos.resumen + '\n\n' : '') +
      (datos.enlace ? 'Ábrelo en la hoja: ' + datos.enlace + '\n\n' : '') +
      FIRMA;
  } else if (tipo === 'acuse') {
    // Sale a una dirección sin verificar: sin ningún texto del usuario, para que no sirva de relé de spam.
    var esSugerencia = datos.tipo === 'sugerencia';
    asunto = esSugerencia ? 'Recibimos tu sugerencia en Chicha' : 'Recibimos tu propuesta en Chicha';
    cuerpo = 'Hola,\n\n' +
      (esSugerencia
        ? 'Recibimos tu sugerencia de cambio. La revisaremos y, si corresponde, aplicaremos el cambio.'
        : 'Recibimos tu propuesta. Te escribiremos cuando la revisemos.') +
      '\n\n' + FIRMA;
  } else if (tipo === 'aprobado') {
    asunto = (datos.nombre || '') + ' ya está en Chicha';
    cuerpo = 'Hola' + (datos.nombreProponente ? ' ' + datos.nombreProponente : '') + ',\n\n' +
      'Tu propuesta ya está publicada en Chicha.' +
      (datos.enlace ? '\nPuedes verla aquí: ' + datos.enlace : '') + '\n\n' + FIRMA;
  } else if (tipo === 'rechazado') {
    asunto = 'Sobre tu propuesta en Chicha';
    cuerpo = 'Hola' + (datos.nombreProponente ? ' ' + datos.nombreProponente : '') + ',\n\n' +
      'Gracias por escribirnos. Por ahora no pudimos publicar tu propuesta.' +
      (datos.motivo ? '\n\nMotivo: ' + datos.motivo : '') +
      '\n\nPuedes volver a enviarla cuando quieras.\n\n' + FIRMA;
  } else if (tipo === 'recordatorio') {
    asunto = '[Chicha] Convocatorias ' + datos.anio + ' para renovar';
    var lista = (datos.convocatorias || []).map(function (c) { return '- ' + c.titulo; }).join('\n');
    cuerpo = 'Estas convocatorias del año anterior pueden duplicarse con fechas nuevas:\n\n' +
      (lista ? lista + '\n\n' : '') +
      (datos.enlace ? 'Hoja: ' + datos.enlace + '\n\n' : '') + FIRMA;
  } else {
    throw new Error('Tipo de correo desconocido: ' + tipo);
  }
  return { asunto: asunto, cuerpo: cuerpo };
}

function paraRenovar(convocatorias, anio) {
  var anioDe = function (c) { return Number(c['año'] !== undefined ? c['año'] : c.anio); };
  var clave = function (c) { return String(c.agente_id).trim() + '|' + String(c.titulo).trim(); };
  var yaEnAnio = {};
  convocatorias.forEach(function (c) {
    if (anioDe(c) === anio && (c.estado === 'aprobado' || c.estado === 'pendiente')) yaEnAnio[clave(c)] = true;
  });
  return convocatorias.filter(function (c) {
    return c.estado === 'aprobado' && anioDe(c) === anio - 1 && !yaEnAnio[clave(c)];
  });
}
