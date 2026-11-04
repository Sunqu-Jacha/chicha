/**
 * Chicha - instalación de la hoja y de los disparadores.
 * Ejecutar a mano desde el editor de Apps Script: crearEstructura() y luego instalarDisparadores().
 */

var TAXONOMIA = {
  ofrece: [
    'Financiamiento y fondos', 'Formación', 'Incubación y mentoría', 'Espacios y equipamiento',
    'Difusión y circulación', 'Redes y contactos', 'Convocatorias y premios', 'Asesoría legal o técnica'
  ],
  sectores: [
    'Artes visuales', 'Artes escénicas', 'Música', 'Audiovisual', 'Editorial y literatura', 'Diseño y moda',
    'Patrimonio', 'Artesanía', 'Educación', 'Emprendimiento e innovación', 'Cultura comunitaria'
  ],
  tipos_entidad: [
    'Pública (Estado, gobierno regional, municipalidad)', 'Privada / empresa / marca', 'Universidad o instituto',
    'Centro cultural', 'Fundación / ONG', 'Cooperación internacional / embajada', 'Incubadora / aceleradora',
    'Colectivo / red', 'Espacio público'
  ],
  presencia: [
    'Peruana', 'Extranjera con sede en el Perú', 'Internacional (sin sede en el Perú; solo capa Internacional)'
  ],
  departamentos: [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Cusco', 'Huancavelica', 'Huánuco',
    'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco',
    'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali', 'Provincia Constitucional del Callao'
  ],
  tipos_convocatoria: ['fondo', 'premio', 'beca', 'residencia', 'formación', 'concurso', 'otro']
};

var ESTADOS_REGISTRO = ['pendiente', 'aprobado', 'rechazado', 'archivado'];
var ESTADOS_SUGERENCIA = ['pendiente', 'aplicada', 'descartada'];

function crearEstructura() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(ZONA_HORARIA);

  var listas = ss.getSheetByName('Listas');
  if (!listas) {
    listas = nuevaHoja(ss, 'Listas', COLUMNAS_LISTAS);
    var alto = Math.max.apply(null, COLUMNAS_LISTAS.map(function (c) { return TAXONOMIA[c].length; }));
    var filas = [];
    for (var f = 0; f < alto; f++) {
      filas.push(COLUMNAS_LISTAS.map(function (c) { return TAXONOMIA[c][f] || ''; }));
    }
    listas.getRange(2, 1, alto, COLUMNAS_LISTAS.length).setNumberFormat('@').setValues(filas);
  }

  var idEjemplo = null;
  if (!ss.getSheetByName('Agentes')) {
    var agentes = nuevaHoja(ss, 'Agentes', COLUMNAS_AGENTES);
    validarLista(agentes, 'estado', ESTADOS_REGISTRO);
    validarLista(agentes, 'capa', ['Perú', 'Internacional']);
    validarLista(agentes, 'verificado', ['sí', 'no']);
    validarDesdeListas(agentes, 'tipo_entidad', listas, 'tipos_entidad');
    validarDesdeListas(agentes, 'presencia', listas, 'presencia');
    validarDesdeListas(agentes, 'departamento', listas, 'departamentos');
    protegerControl(agentes, ['id', 'fecha_envio', 'fecha_aprobacion', 'origen']);
    idEjemplo = insertarAgentesEjemplo(agentes);
  }

  if (!ss.getSheetByName('Convocatorias')) {
    var convocatorias = nuevaHoja(ss, 'Convocatorias', COLUMNAS_CONVOCATORIAS);
    validarLista(convocatorias, 'estado', ESTADOS_REGISTRO);
    validarDesdeListas(convocatorias, 'tipo', listas, 'tipos_convocatoria');
    protegerControl(convocatorias, ['id', 'fecha_envio', 'fecha_aprobacion']);
    // Solo si el agente de ejemplo se creó ahora (si no, el vínculo apuntaría a un id inexistente).
    if (idEjemplo) insertarConvocatoriaEjemplo(convocatorias, idEjemplo);
  }

  if (!ss.getSheetByName('Sugerencias')) {
    var sugerencias = nuevaHoja(ss, 'Sugerencias', COLUMNAS_SUGERENCIAS);
    validarLista(sugerencias, 'estado', ESTADOS_SUGERENCIA);
    protegerControl(sugerencias, ['id', 'fecha_envio']);
  }

  if (!ss.getSheetByName('_cola')) nuevaHoja(ss, '_cola', COLUMNAS_COLA).hideSheet();

  // La hoja vacía que trae un archivo nuevo ("Hoja 1" / "Sheet1") sobra.
  ['Hoja 1', 'Sheet1'].forEach(function (n) {
    var h = ss.getSheetByName(n);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });
}

function nuevaHoja(ss, nombre, columnas) {
  var hoja = ss.insertSheet(nombre);
  var encabezado = hoja.getRange(1, 1, 1, columnas.length);
  encabezado.setValues([columnas]).setFontWeight('bold');
  hoja.setFrozenRows(1);
  encabezado.protect()
    .setDescription('Encabezados de ' + nombre + ': el script depende de estos nombres')
    .setWarningOnly(true);
  return hoja;
}

function columnaDe(hoja, nombreColumna) {
  return encabezadosDe(hoja).indexOf(nombreColumna) + 1;
}

function rangoColumna(hoja, col) {
  return hoja.getRange(2, col, hoja.getMaxRows() - 1, 1);
}

function validarLista(hoja, nombreColumna, valores) {
  var col = columnaDe(hoja, nombreColumna);
  if (!col) return;
  rangoColumna(hoja, col).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build()
  );
}

function validarDesdeListas(hoja, nombreColumna, listas, catalogo) {
  var col = columnaDe(hoja, nombreColumna);
  var colLista = columnaDe(listas, catalogo);
  if (!col || !colLista) return;
  var origen = listas.getRange(2, colLista, listas.getMaxRows() - 1, 1);
  rangoColumna(hoja, col).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(origen, true).setAllowInvalid(false).build()
  );
}

// Advertencia (no bloqueo): el moderador puede editar en emergencias tras confirmar.
function protegerControl(hoja, columnas) {
  columnas.forEach(function (c) {
    var col = columnaDe(hoja, c);
    if (!col) return;
    var letra = hoja.getRange(1, col).getA1Notation().replace(/\d+/g, '');
    hoja.getRange(letra + ':' + letra).protect()
      .setDescription('Columna de control ' + c + ': la llena el script')
      .setWarningOnly(true);
  });
}

function filaPara(hoja, valores) {
  return encabezadosDe(hoja).map(function (h) {
    return Object.prototype.hasOwnProperty.call(valores, h) ? valores[h] : '';
  });
}

function insertarAgentesEjemplo(hoja) {
  var hoy = fechaIso(new Date());
  var base = { estado: 'aprobado', verificado: 'no', fecha_envio: hoy, fecha_aprobacion: hoy, origen: 'carga inicial' };
  var a1 = Object.assign({}, base, {
    id: nuevoId('ag'), capa: 'Perú',
    nombre: 'Centro cultural de ejemplo',
    descripcion: 'Registro de ejemplo para probar Chicha. Bórralo o archívalo antes del lanzamiento.',
    ofrece: 'Formación; Espacios y equipamiento', sectores: 'Música; Artes escénicas',
    tipo_entidad: 'Centro cultural', presencia: 'Peruana',
    pais: 'Perú', departamento: 'Cusco', ciudad: 'Cusco',
    web: URL_SITIO
  });
  var a2 = Object.assign({}, base, {
    id: nuevoId('ag'), capa: 'Internacional',
    nombre: 'Fondo internacional de ejemplo',
    descripcion: 'Registro de ejemplo de la capa Internacional. Bórralo o archívalo antes del lanzamiento.',
    ofrece: 'Financiamiento y fondos', sectores: 'Audiovisual',
    tipo_entidad: 'Cooperación internacional / embajada',
    presencia: 'Internacional (sin sede en el Perú; solo capa Internacional)',
    pais: 'España', ciudad: 'Madrid',
    web: URL_SITIO
  });
  hoja.getRange(2, 1, 2, encabezadosDe(hoja).length).setValues([filaPara(hoja, a1), filaPara(hoja, a2)]);
  return a1.id;
}

function insertarConvocatoriaEjemplo(hoja, agenteId) {
  var hoy = fechaIso(new Date());
  var anio = Number(Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy')) + 1;
  var c = {
    id: nuevoId('cv'), estado: 'aprobado', fecha_envio: hoy, fecha_aprobacion: hoy,
    agente_id: agenteId,
    titulo: 'Convocatoria de ejemplo ' + anio, 'año': anio, tipo: 'fondo',
    ofrece: 'Financiamiento y fondos', sectores: 'Música',
    descripcion: 'Convocatoria de ejemplo para probar Chicha. Bórrala o archívala antes del lanzamiento.',
    monto: 'Por definir', enlace_bases: URL_SITIO,
    fecha_apertura: anio + '-02-01', fecha_cierre: anio + '-03-14'
  };
  hoja.getRange(2, 1, 1, encabezadosDe(hoja).length).setValues([filaPara(hoja, c)]);
}

function instalarDisparadores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'alEditar' || f === 'recordatorioAnual') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('alEditar').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('recordatorioAnual').timeBased().everyDays(1).atHour(7).inTimezone(ZONA_HORARIA).create();
}
