/**
 * Chicha - servicios del Apps Script: lectura (doGet), envíos (doPost), disparadores y correos.
 * Usa la lógica pura de Logica.gs (mismo proyecto: todas las funciones son globales).
 */

var MODERADOR = 'sunqujacha@gmail.com';
var URL_SITIO = 'https://sunqu-jacha.github.io/chicha/';

var CLAVE_CACHE = 'datos';
var SEGUNDOS_CACHE = 600;
var TROZO_CACHE_CHARS = 30000;          // ≤ 90 KB por valor de caché (límite 100 KB) aun con caracteres de 3 bytes
var PROP_ULTIMA = 'ultima_';            // ultima_n = número de trozos; ultima_0, ultima_1, … = JSON troceado
var PROP_ULTIMA_HUELLA = 'ultima_huella';
var TROZO_CHARS = 3000;                 // ≤ 9 KB por propiedad aun con caracteres de 3 bytes
var MAX_BYTES_PROPIEDADES = 400000;     // margen bajo el total de 500 KB del almacén de propiedades
var PROP_AVISO_ESTRUCTURA = 'aviso_estructura_ms';
var PROP_RECORDATORIO = 'recordatorio_anio';
var MS_24H = 24 * 60 * 60 * 1000;
var LIMITE_ENVIOS_HORA = 12;
var CUOTA_MINIMA = 5;
var CUOTA_MINIMA_ACUSE = 20;            // por debajo, los acuses esperan en _cola: la cuota queda para moderar
var ESPERA_LOCK_MS = 10000;

var COLUMNAS_LISTAS = ['ofrece', 'sectores', 'tipos_entidad', 'presencia', 'departamentos', 'tipos_convocatoria'];
var COLUMNAS_COLA = ['fecha', 'destinatario', 'asunto', 'cuerpo', 'intentos'];
var MAX_INTENTOS_COLA = 3;
var MAX_LOTE_COLA = 50;

// Función y no constante: COLUMNAS_* vive en Logica.gs y el orden de carga de los archivos no está garantizado.
function hojas() {
  return {
    agente: { nombre: 'Agentes', columnas: COLUMNAS_AGENTES, prefijo: 'ag' },
    convocatoria: { nombre: 'Convocatorias', columnas: COLUMNAS_CONVOCATORIAS, prefijo: 'cv' },
    sugerencia: { nombre: 'Sugerencias', columnas: COLUMNAS_SUGERENCIAS, prefijo: 'sg' }
  };
}

// Campos que el formulario puede escribir (lista blanca). Nunca columnas de control ni de moderación.
var CAMPOS_ENTRADA = {
  agente: ['nombre', 'descripcion', 'logo_url', 'ofrece', 'sectores', 'tipo_entidad', 'presencia',
    'departamento', 'ciudad', 'direccion', 'web', 'instagram', 'facebook', 'otras_redes', 'email_publico',
    'nombre_proponente', 'email_proponente'],
  convocatoria: ['agente_id', 'titulo', 'anio', 'tipo', 'ofrece', 'sectores', 'descripcion', 'monto',
    'enlace_bases', 'fecha_apertura', 'fecha_cierre', 'fecha_resultados', 'nombre_proponente', 'email_proponente'],
  sugerencia: ['tipo_registro', 'registro_id', 'campo', 'valor_propuesto', 'fuente', 'email_proponente']
};

var CAMPOS_FECHA = ['fecha_apertura', 'fecha_cierre', 'fecha_resultados'];

var ERROR_ENVIO = 'No pudimos enviar tu propuesta. Intenta de nuevo en unos minutos.';
var ERROR_LIMITE = 'Hay muchos envíos en este momento. Intenta en unos minutos.';

/* ---------- Utilidades de hoja ---------- */

function libro() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function leerTabla(nombre) {
  var hoja = libro().getSheetByName(nombre);
  if (!hoja || hoja.getLastRow() < 1 || hoja.getLastColumn() < 1) {
    return { hoja: hoja, encabezados: [], valores: [], registros: [] };
  }
  var valores = hoja.getDataRange().getValues();
  var encabezados = valores[0].map(function (h) { return String(h).trim(); });
  return { hoja: hoja, encabezados: encabezados, valores: valores, registros: filasAObjetos(encabezados, valores.slice(1)) };
}

function encabezadosDe(hoja) {
  if (!hoja || hoja.getLastColumn() < 1) return [];
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

function leerListas(tabla) {
  var listas = {};
  var valores = tabla.valores;
  COLUMNAS_LISTAS.forEach(function (col) {
    var i = tabla.encabezados.indexOf(col);
    var lista = [];
    for (var f = 1; i !== -1 && f < valores.length; f++) {
      var v = String(valores[f][i]).trim();
      if (v) lista.push(v);
    }
    listas[aCamel(col)] = lista;
  });
  return listas;
}

function idsAprobados(tablaAgentes) {
  var ids = new Set();
  tablaAgentes.registros.forEach(function (r) {
    if (r.estado === 'aprobado' && !ausente(r.id)) ids.add(String(r.id).trim());
  });
  return ids;
}

function enlaceFila(hoja, fila) {
  return libro().getUrl() + '#gid=' + hoja.getSheetId() + '&range=A' + fila;
}

function faltanEn(nombre, tabla, esperadas) {
  return faltantes(tabla.encabezados, esperadas).map(function (c) { return nombre + '.' + c; });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonCrudo(texto) {
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Lectura: GET ?accion=datos ---------- */

function doGet(e) {
  var accion = e && e.parameter ? e.parameter.accion : '';
  if (accion !== 'datos') return json({ ok: false, error: 'Acción desconocida.' });

  var enCache = leerCache();
  if (enCache) return jsonCrudo(enCache);

  try {
    var agentes = leerTabla('Agentes');
    var convocatorias = leerTabla('Convocatorias');
    var tablaListas = leerTabla('Listas');
    var faltan = [].concat(
      faltanEn('Agentes', agentes, COLUMNAS_AGENTES),
      faltanEn('Convocatorias', convocatorias, COLUMNAS_CONVOCATORIAS),
      faltanEn('Listas', tablaListas, COLUMNAS_LISTAS)
    );
    if (faltan.length) {
      avisarEstructura(faltan);
      return servirUltimaValida();
    }
    var contenido = {
      listas: leerListas(tablaListas),
      agentes: publicar(agentes.registros, PUBLICAS_AGENTES),
      convocatorias: conAgenteAprobado(publicar(convocatorias.registros, PUBLICAS_CONVOCATORIAS), idsAprobados(agentes))
    };
    // La huella se calcula sin `generado`, que cambia en cada lectura.
    var huella = Utilities.base64Encode(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, JSON.stringify(contenido), Utilities.Charset.UTF_8));
    var texto = JSON.stringify({
      generado: new Date().toISOString(),
      listas: contenido.listas,
      agentes: contenido.agentes,
      convocatorias: contenido.convocatorias
    });
    guardarCache(texto);
    guardarUltimaValida(texto, huella);
    return jsonCrudo(texto);
  } catch (err) {
    console.error('doGet: ' + err);
    return servirUltimaValida();
  }
}

// Caché troceada: CLAVE_CACHE guarda el número de trozos y CLAVE_CACHE_0, _1, … el JSON.
// Borrar CLAVE_CACHE (alEditar) basta para invalidarla.
function guardarCache(texto) {
  var trozos = {};
  var n = 0;
  for (var i = 0; i < texto.length; i += TROZO_CACHE_CHARS) {
    trozos[CLAVE_CACHE + '_' + n] = texto.slice(i, i + TROZO_CACHE_CHARS);
    n++;
  }
  trozos[CLAVE_CACHE] = String(n);
  try {
    CacheService.getScriptCache().putAll(trozos, SEGUNDOS_CACHE);
  } catch (err) {
    console.error('caché: ' + err);
  }
}

function leerCache() {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(CLAVE_CACHE)) || 0;
  if (!n) return null;
  var claves = [];
  for (var i = 0; i < n; i++) claves.push(CLAVE_CACHE + '_' + i);
  var trozos = cache.getAll(claves);
  var partes = [];
  for (var j = 0; j < n; j++) {
    if (typeof trozos[claves[j]] !== 'string') return null; // algún trozo expiró: se regenera
    partes.push(trozos[claves[j]]);
  }
  return partes.join('');
}

function servirUltimaValida() {
  var texto = leerUltimaValida();
  return texto ? jsonCrudo(texto) : json({ ok: false, error: 'Datos no disponibles por ahora.' });
}

function guardarUltimaValida(texto, huella) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PROP_ULTIMA_HUELLA) === huella) return; // mismo contenido: no se reescribe
  if (Utilities.newBlob(texto).getBytes().length > MAX_BYTES_PROPIEDADES) return; // demasiado grande: solo caché
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPERA_LOCK_MS)) return;
  try {
    var anterior = Number(props.getProperty(PROP_ULTIMA + 'n')) || 0;
    var nuevos = {};
    var n = 0;
    for (var i = 0; i < texto.length; i += TROZO_CHARS) {
      nuevos[PROP_ULTIMA + n] = texto.slice(i, i + TROZO_CHARS);
      n++;
    }
    nuevos[PROP_ULTIMA + 'n'] = String(n);
    nuevos[PROP_ULTIMA_HUELLA] = huella;
    props.setProperties(nuevos, false);
    for (var j = n; j < anterior; j++) props.deleteProperty(PROP_ULTIMA + j);
  } finally {
    lock.releaseLock();
  }
}

function leerUltimaValida() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var n = Number(props[PROP_ULTIMA + 'n']) || 0;
  var partes = [];
  for (var i = 0; i < n; i++) {
    if (typeof props[PROP_ULTIMA + i] !== 'string') return null;
    partes.push(props[PROP_ULTIMA + i]);
  }
  return n ? partes.join('') : null;
}

function avisarEstructura(faltan) {
  var props = PropertiesService.getScriptProperties();
  var ultimo = Number(props.getProperty(PROP_AVISO_ESTRUCTURA)) || 0;
  var ahora = Date.now();
  if (ahora - ultimo < MS_24H) return;
  props.setProperty(PROP_AVISO_ESTRUCTURA, String(ahora));
  enviarCorreo(MODERADOR, '[Chicha] Revisa la estructura de la hoja',
    'Faltan columnas esperadas en la hoja, así que el sitio sigue mostrando la última versión válida:\n\n' +
    faltan.map(function (c) { return '- ' + c; }).join('\n') + '\n\n' +
    'Restaura los nombres de columna para que los cambios vuelvan a publicarse.\n' +
    'Hoja: ' + libro().getUrl() + '\n\n' + FIRMA);
}

/* ---------- Escritura: POST ---------- */

function doPost(e) {
  var cuerpo;
  try {
    cuerpo = JSON.parse(e && e.postData ? e.postData.contents : '');
  } catch (errJson) {
    return json({ ok: false, errores: { _general: ERROR_ENVIO } });
  }
  if (!cuerpo || typeof cuerpo !== 'object') return json({ ok: false, errores: { _general: ERROR_ENVIO } });
  var tipo = cuerpo.tipo;
  var d = (cuerpo.datos && typeof cuerpo.datos === 'object' && !Array.isArray(cuerpo.datos)) ? cuerpo.datos : {};

  // Antispam: se responde como si todo hubiera ido bien, sin escribir.
  if (esSpam({ sitio_web_2: d.sitio_web_2, t0: cuerpo.t0 }, Date.now())) return json({ ok: true });

  try {
    var confHojas = hojas();
    var conf = Object.prototype.hasOwnProperty.call(confHojas, tipo) ? confHojas[tipo] : null;
    if (!conf) return json({ ok: false, errores: validarEnvio(tipo, d, {}, new Set()) });
    var hoja = libro().getSheetByName(conf.nombre);
    var encabezados = encabezadosDe(hoja);
    var tablaListas = leerTabla('Listas');
    var agentes = tipo === 'convocatoria' ? leerTabla('Agentes') : { encabezados: [], registros: [] };
    var faltan = [].concat(
      faltantes(encabezados, conf.columnas).map(function (c) { return conf.nombre + '.' + c; }),
      faltanEn('Listas', tablaListas, COLUMNAS_LISTAS),
      tipo === 'convocatoria' ? faltanEn('Agentes', agentes, ['id', 'estado']) : []
    );
    if (faltan.length) {
      avisarEstructura(faltan);
      return json({ ok: false, errores: { _general: ERROR_ENVIO } });
    }

    var errores = validarEnvio(tipo, d, leerListas(tablaListas), idsAprobados(agentes));
    if (Object.keys(errores).length) return json({ ok: false, errores: errores });

    var registro = armarRegistro(tipo, d, conf.prefijo);
    var fila;
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(ESPERA_LOCK_MS)) return json({ ok: false, errores: { _general: ERROR_ENVIO } });
    try {
      var cache = CacheService.getScriptCache();
      var claveHora = 'envios_' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMddHH');
      var enviados = Number(cache.get(claveHora)) || 0;
      if (enviados >= LIMITE_ENVIOS_HORA) return json({ ok: false, errores: { _general: ERROR_LIMITE } });
      hoja.appendRow(encabezados.map(function (h) {
        return Object.prototype.hasOwnProperty.call(registro, h) ? registro[h] : '';
      }));
      fila = hoja.getLastRow();
      cache.put(claveHora, String(enviados + 1), 3600);
    } finally {
      lock.releaseLock();
    }

    avisarEnvioNuevo(tipo, registro, enlaceFila(hoja, fila));
    return json({ ok: true });
  } catch (err) {
    console.error('doPost: ' + err);
    return json({ ok: false, errores: { _general: ERROR_ENVIO } });
  }
}

// Texto para la hoja: recortado y con apóstrofo inicial, que Sheets guarda como texto literal
// (evita fórmulas inyectadas con = + - @ y conversiones automáticas a número o fecha).
function comoTexto(v) {
  var s = Array.isArray(v) ? separarMulti(v).join('; ') : String(v).trim();
  return s ? "'" + s : '';
}

function armarRegistro(tipo, d, prefijo) {
  var r = {};
  CAMPOS_ENTRADA[tipo].forEach(function (campo) {
    var v = d[campo];
    if (ausente(v)) return;
    if (campo === 'anio') r['año'] = Number(v);
    else if (CAMPOS_FECHA.indexOf(campo) !== -1) r[campo] = String(v).trim(); // AAAA-MM-DD validado: Sheets lo guarda como fecha
    else r[campo] = comoTexto(v);
  });
  r.id = nuevoId(prefijo);
  r.estado = 'pendiente';
  r.fecha_envio = fechaIso(new Date());
  if (tipo === 'agente') {
    var internacional = esInternacional(d.presencia);
    r.capa = internacional ? 'Internacional' : 'Perú';
    r.pais = internacional ? (ausente(d.pais) ? '' : comoTexto(d.pais)) : 'Perú';
    r.verificado = 'no';
    r.origen = 'formulario';
  }
  return r;
}

function sinApostrofo(v) {
  var s = String(v);
  return s.charAt(0) === "'" ? s.slice(1) : s;
}

function avisarEnvioNuevo(tipo, registro, enlace) {
  var resumen = Object.keys(registro)
    .filter(function (k) { return registro[k] !== ''; })
    .map(function (k) { return k + ': ' + sinApostrofo(registro[k]); })
    .join('\n');
  var aMod = correo('nuevo-moderador', {
    tipo: tipo,
    nombre: sinApostrofo(registro.nombre || ''),
    titulo: sinApostrofo(registro.titulo || ''),
    resumen: resumen,
    enlace: enlace
  });
  try {
    enviarCorreo(MODERADOR, aMod.asunto, aMod.cuerpo);
  } catch (err) {
    console.error('correo moderador: ' + err);
    // La fila ya está escrita: un fallo aquí no debe convertirse en error para quien envió.
    try { encolar([[MODERADOR, aMod.asunto, aMod.cuerpo, 0]]); } catch (errCola) { console.error('cola moderador: ' + errCola); }
  }

  var destino = sinApostrofo(registro.email_proponente || '');
  if (!destino) return;
  var acuse = correo('acuse', { tipo: tipo });
  try { avisarProponente(destino, acuse.asunto, acuse.cuerpo, CUOTA_MINIMA_ACUSE); } catch (err2) { console.error('acuse: ' + err2); }
}

/* ---------- Correos y cola ---------- */

function enviarCorreo(destino, asunto, cuerpo) {
  MailApp.sendEmail(destino, asunto, cuerpo, { name: 'Chicha' });
}

// Avisos a proponentes: si queda poca cuota diaria, se encolan en _cola para el día siguiente.
function avisarProponente(destino, asunto, cuerpo, cuotaMinima) {
  if (MailApp.getRemainingDailyQuota() < (cuotaMinima || CUOTA_MINIMA)) {
    encolar([[destino, asunto, cuerpo, 0]]);
    return;
  }
  enviarCorreo(destino, asunto, cuerpo);
}

function hojaCola() {
  var ss = libro();
  var hoja = ss.getSheetByName('_cola');
  if (!hoja) {
    hoja = ss.insertSheet('_cola');
    hoja.getRange(1, 1, 1, COLUMNAS_COLA.length).setValues([COLUMNAS_COLA]);
    hoja.setFrozenRows(1);
    hoja.hideSheet();
  }
  return hoja;
}

// Agrega avisos [destino, asunto, cuerpo, intentos] al final de _cola bajo un candado corto.
// Si el candado no llega a tiempo se agrega igual: perder el aviso es peor que una carrera improbable.
function encolar(avisos) {
  if (!avisos.length) return;
  var filas = avisos.map(function (a) {
    return [fechaIso(new Date()), comoTexto(a[0]), comoTexto(a[1]), comoTexto(a[2]), Number(a[3]) || 0];
  });
  var lock = LockService.getScriptLock();
  var conCandado = lock.tryLock(ESPERA_LOCK_MS);
  try {
    var hoja = hojaCola();
    hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, COLUMNAS_COLA.length).setValues(filas);
  } finally {
    if (conCandado) lock.releaseLock();
  }
}

// Saca un lote de _cola bajo un candado corto, lo envía sin candado y reencola los fallos
// (un destinatario rechazado se descarta tras MAX_INTENTOS_COLA intentos; no bloquea al resto).
function despacharCola() {
  var hoja = libro().getSheetByName('_cola');
  if (!hoja || hoja.getLastRow() < 2) return;
  var cupo = Math.min(MAX_LOTE_COLA, MailApp.getRemainingDailyQuota() - CUOTA_MINIMA + 1);
  if (cupo <= 0) return;

  var lote;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPERA_LOCK_MS)) return;
  try {
    var total = hoja.getLastRow() - 1;
    if (total < 1) return;
    var n = Math.min(cupo, total);
    lote = hoja.getRange(2, 1, n, COLUMNAS_COLA.length).getValues();
    hoja.deleteRows(2, n);
  } finally {
    lock.releaseLock();
  }

  var pendientes = [];
  lote.forEach(function (f) {
    var aviso = [String(f[1]), String(f[2]), String(f[3]), Number(f[4]) || 0];
    if (MailApp.getRemainingDailyQuota() < CUOTA_MINIMA) { pendientes.push(aviso); return; }
    try {
      enviarCorreo(aviso[0], aviso[1], aviso[2]);
    } catch (err) {
      console.error('cola: ' + err);
      aviso[3]++;
      if (aviso[3] < MAX_INTENTOS_COLA) pendientes.push(aviso);
    }
  });
  encolar(pendientes);
}

/* ---------- Carga inicial ---------- */

// Completa id, capa, origen y fecha_envio de filas cargadas a mano, entre f0 y f1 (sin f1: hasta la última).
// Devuelve cuántas filas cambió. Bajo candado y con flush: dos ediciones seguidas de una fila disparan dos
// alEditar, y el segundo debe ver el id del primero en vez de generar otro.
function completarFilas(hoja, tipo, f0, f1) {
  if (!hoja) return 0;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPERA_LOCK_MS)) throw new Error('La hoja está ocupada. Intenta de nuevo en unos segundos.');
  try {
    var ultima = f1 ? Math.min(f1, hoja.getLastRow()) : hoja.getLastRow();
    if (ultima < f0) return 0;
    var encabezados = encabezadosDe(hoja);
    var valores = hoja.getRange(f0, 1, ultima - f0 + 1, encabezados.length).getValues();
    var prefijo = hojas()[tipo].prefijo;
    var hoy = fechaIso(new Date());
    var cambiadas = 0;
    filasAObjetos(encabezados, valores).forEach(function (r, i) {
      var campos = camposPorCompletar(tipo, r, prefijo, hoy);
      var claves = Object.keys(campos);
      claves.forEach(function (c) {
        var col = encabezados.indexOf(c) + 1;
        if (col) hoja.getRange(f0 + i, col).setValue(campos[c]);
      });
      if (claves.length) cambiadas++;
    });
    if (cambiadas) SpreadsheetApp.flush();
    return cambiadas;
  } finally {
    lock.releaseLock();
  }
}

// Disparador simple: añade el menú al abrir la hoja.
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Chicha').addItem('Completar carga inicial', 'completarCargaInicial').addToUi();
}

function completarCargaInicial() {
  var ss = libro();
  var n = completarFilas(ss.getSheetByName('Agentes'), 'agente', 2) +
    completarFilas(ss.getSheetByName('Convocatorias'), 'convocatoria', 2);
  CacheService.getScriptCache().remove(CLAVE_CACHE);
  ss.toast('Filas completadas: ' + n + '.', 'Chicha');
}

/* ---------- Disparadores ---------- */

// Disparador instalable "Al editar" (lo crea instalarDisparadores). No se llama onEdit para no
// ejecutarse también como disparador simple, que no puede enviar correos.
// Avisa al proponente solo si `estado` (aprobado/rechazado) difiere de `aviso_enviado`, y luego lo anota:
// pegar varias celdas o repetir el mismo estado no reenvía correos.
function alEditar(e) {
  if (!e || !e.range) return;
  var hoja = e.range.getSheet();
  var nombre = hoja.getName();
  if (['Agentes', 'Convocatorias', 'Listas'].indexOf(nombre) === -1) return;
  var cache = CacheService.getScriptCache();
  cache.remove(CLAVE_CACHE);
  if (nombre === 'Listas') return;

  var f0 = Math.max(2, e.range.getRow());
  var f1 = e.range.getRow() + e.range.getNumRows() - 1;
  if (f1 >= f0) {
    try {
      if (completarFilas(hoja, nombre === 'Agentes' ? 'agente' : 'convocatoria', f0, f1)) cache.remove(CLAVE_CACHE);
    } catch (errFilas) {
      console.error('completarFilas: ' + errFilas); // el menú puede completarlas después; los avisos siguen
    }
  }

  var encabezados = encabezadosDe(hoja);
  var colEstado = encabezados.indexOf('estado') + 1;
  var c0 = e.range.getColumn();
  var c1 = c0 + e.range.getNumColumns() - 1;
  if (!colEstado || colEstado < c0 || colEstado > c1) return;
  var colAviso = encabezados.indexOf('aviso_enviado') + 1;
  if (!colAviso) {
    avisarEstructura([nombre + '.aviso_enviado']);
    return;
  }

  if (f1 < f0) return;
  var valores = hoja.getRange(f0, 1, f1 - f0 + 1, encabezados.length).getValues();
  var registros = filasAObjetos(encabezados, valores);
  var colFecha = encabezados.indexOf('fecha_aprobacion') + 1;

  registros.forEach(function (r, i) {
    if (r.estado !== 'aprobado' && r.estado !== 'rechazado') return;
    var fila = f0 + i;
    if (r.estado === 'aprobado' && colFecha && ausente(r.fecha_aprobacion)) {
      hoja.getRange(fila, colFecha).setValue(fechaIso(new Date()));
    }
    if (String(r.aviso_enviado).trim() === r.estado) return;
    hoja.getRange(fila, colAviso).setValue(r.estado);
    var destino = String(r.email_proponente || '').trim();
    if (!destino) return;
    var nombreProponente = String(r.nombre_proponente || '').trim();
    var mensaje;
    if (r.estado === 'aprobado') {
      var agenteId = nombre === 'Agentes' ? r.id : r.agente_id;
      mensaje = correo('aprobado', {
        nombre: nombre === 'Agentes' ? r.nombre : r.titulo,
        nombreProponente: nombreProponente,
        enlace: URL_SITIO + '#/agente/' + encodeURIComponent(String(agenteId || '').trim())
      });
    } else {
      mensaje = correo('rechazado', { nombreProponente: nombreProponente, motivo: String(r.motivo_rechazo || '').trim() });
    }
    try { avisarProponente(destino, mensaje.asunto, mensaje.cuerpo); } catch (err) { console.error('alEditar: ' + err); }
  });
  cache.remove(CLAVE_CACHE);
}

// Disparador diario: despacha la cola y, desde el 5 de enero (hora de Lima) y una sola vez por año,
// envía el recordatorio anual. instalarDisparadores marca el año en curso si ya pasó el 5 de enero.
function recordatorioAnual() {
  try { despacharCola(); } catch (err) { console.error('recordatorioAnual/cola: ' + err); }
  var hoy = new Date();
  if (!yaEsDiaDeRecordatorio(hoy)) return;
  var anio = Number(Utilities.formatDate(hoy, ZONA_HORARIA, 'yyyy'));
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PROP_RECORDATORIO) === String(anio)) return;

  var tabla = leerTabla('Convocatorias');
  var enlace = tabla.hoja ? libro().getUrl() + '#gid=' + tabla.hoja.getSheetId() : libro().getUrl();
  var mensaje = correo('recordatorio', {
    anio: anio,
    convocatorias: paraRenovar(tabla.registros, anio),
    enlace: enlace
  });
  enviarCorreo(MODERADOR, mensaje.asunto, mensaje.cuerpo);
  props.setProperty(PROP_RECORDATORIO, String(anio));
}

function yaEsDiaDeRecordatorio(fecha) {
  return Utilities.formatDate(fecha, ZONA_HORARIA, 'MM-dd') >= '01-05';
}
