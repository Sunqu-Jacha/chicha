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
  'nombre_proponente', 'email_proponente', 'notas_moderacion', 'motivo_rechazo'
];

var COLUMNAS_CONVOCATORIAS = [
  'id', 'estado', 'fecha_envio', 'fecha_aprobacion',
  'agente_id',
  'titulo', 'año', 'tipo', 'ofrece', 'sectores', 'descripcion', 'monto', 'enlace_bases',
  'fecha_apertura', 'fecha_cierre', 'fecha_resultados',
  'nombre_proponente', 'email_proponente', 'notas_moderacion', 'motivo_rechazo'
];

var COLUMNAS_SUGERENCIAS = [
  'id', 'estado', 'fecha_envio', 'tipo_registro', 'registro_id', 'campo', 'valor_propuesto', 'fuente',
  'email_proponente', 'notas_moderacion'
];

// Lista blanca: todo salvo control interno (estado, origen, fecha_envio) y columnas privadas.
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

function fechaIso(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    var s = v.trim();
    return s ? s.slice(0, 10) : null;
  }
  var d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  var partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
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
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function publicar(registros, publicas) {
  var esConvocatoria = publicas.indexOf('fecha_cierre') !== -1;
  var salida = [];
  registros.forEach(function (r) {
    if (r.estado !== 'aprobado') return;
    var o = {};
    publicas.forEach(function (col) {
      var v = r[col];
      var clave = aCamel(col);
      if (MULTI.indexOf(col) !== -1) o[clave] = separarMulti(v);
      else if (col.indexOf('fecha_') === 0) o[clave] = fechaIso(v);
      else if (col === 'verificado') o[clave] = v === true || v === 'sí' || v === 'si';
      else if (col === 'lat' || col === 'lng' || col === 'año') o[clave] = numeroOnull(v);
      else o[clave] = v === null || v === undefined ? '' : v;
    });
    if (esConvocatoria && !esFechaIso(o.fechaCierre)) return;
    salida.push(o);
  });
  return salida;
}

var OBLIGATORIO = 'Este campo es obligatorio.';
var RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var RE_URL = /^https?:\/\//;

function vacio(v) {
  if (Array.isArray(v)) return v.map(function (x) { return String(x).trim(); }).filter(Boolean).length === 0;
  return v === null || v === undefined || String(v).trim() === '';
}

function validarEnvio(tipo, d, listas, idsAprobados) {
  var e = {};
  d = d || {};
  listas = listas || {};

  function obligatorio(campo) {
    if (vacio(d[campo])) { e[campo] = OBLIGATORIO; return false; }
    return true;
  }
  function enLista(campo, lista) {
    var valores = Array.isArray(d[campo]) ? d[campo] : [d[campo]];
    var validos = lista || [];
    var ok = valores.every(function (x) { return validos.indexOf(String(x).trim()) !== -1; });
    if (!ok) e[campo] = 'Elige una opción de la lista.';
  }
  function listaObligatoria(campo, lista) {
    if (obligatorio(campo)) enLista(campo, lista);
  }
  function listaOpcional(campo, lista) {
    if (!vacio(d[campo])) enLista(campo, lista);
  }
  function correoObligatorio(campo) {
    if (obligatorio(campo) && !RE_CORREO.test(String(d[campo]).trim())) e[campo] = 'Revisa el correo.';
  }
  function correoOpcional(campo) {
    if (!vacio(d[campo]) && !RE_CORREO.test(String(d[campo]).trim())) e[campo] = 'Revisa el correo.';
  }
  function urlObligatoria(campo) {
    if (obligatorio(campo) && !RE_URL.test(String(d[campo]).trim())) e[campo] = 'El enlace debe empezar con http:// o https://.';
  }
  function urlOpcional(campo) {
    if (!vacio(d[campo]) && !RE_URL.test(String(d[campo]).trim())) e[campo] = 'El enlace debe empezar con http:// o https://.';
  }
  function descripcion(campo, requerida) {
    if (requerida) { if (!obligatorio(campo)) return; }
    else if (vacio(d[campo])) return;
    if (String(d[campo]).trim().length > 280) e[campo] = 'Máximo 280 caracteres.';
  }
  function consentimiento() {
    if (d.consentimiento !== true) e.consentimiento = 'Necesitamos tu consentimiento para guardar tu correo.';
  }

  if (tipo === 'agente') {
    obligatorio('nombre');
    listaObligatoria('ofrece', listas.ofrece);
    listaObligatoria('sectores', listas.sectores);
    listaObligatoria('tipo_entidad', listas.tiposEntidad);
    listaObligatoria('presencia', listas.presencia);
    // Las entidades internacionales no tienen departamento del Perú.
    if (String(d.presencia || '').indexOf('Internacional') === 0) listaOpcional('departamento', listas.departamentos);
    else listaObligatoria('departamento', listas.departamentos);
    obligatorio('ciudad');
    descripcion('descripcion', true);
    urlOpcional('web'); urlOpcional('instagram'); urlOpcional('facebook'); urlOpcional('logo_url');
    correoOpcional('email_publico');
    obligatorio('nombre_proponente');
    correoObligatorio('email_proponente');
    consentimiento();
  } else if (tipo === 'convocatoria') {
    if (obligatorio('agente_id') && !(idsAprobados && idsAprobados.has(String(d.agente_id).trim()))) e.agente_id = 'Elige un agente publicado.';
    obligatorio('titulo');
    obligatorio('anio');
    listaObligatoria('tipo', listas.tiposConvocatoria);
    listaOpcional('ofrece', listas.ofrece);
    listaOpcional('sectores', listas.sectores);
    descripcion('descripcion', false);
    urlObligatoria('enlace_bases');
    obligatorio('fecha_cierre');
    obligatorio('nombre_proponente');
    correoObligatorio('email_proponente');
    consentimiento();
  } else if (tipo === 'sugerencia') {
    obligatorio('tipo_registro');
    obligatorio('registro_id');
    obligatorio('campo');
    obligatorio('valor_propuesto');
    correoObligatorio('email_proponente');
    consentimiento();
  } else {
    e.tipo = 'Elige una opción de la lista.';
  }
  return e;
}

function esSpam(d, ahoraMs) {
  d = d || {};
  if (!vacio(d.sitio_web_2)) return true;
  var t0 = Number(d.t0);
  // Sin marca de tiempo válida no se puede comprobar el tiempo de llenado: se descarta.
  if (!isFinite(t0)) return true;
  return ahoraMs - t0 < TIEMPO_MINIMO_MS;
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
    asunto = 'Recibimos tu propuesta en Chicha';
    cuerpo = 'Hola' + (datos.nombreProponente ? ' ' + datos.nombreProponente : '') + ',\n\n' +
      'Recibimos tu propuesta. Te escribiremos cuando la revisemos.\n\n' + FIRMA;
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
