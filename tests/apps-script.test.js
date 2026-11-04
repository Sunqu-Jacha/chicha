import test from 'node:test'; import assert from 'node:assert/strict';
import { cargarVariosGs } from './cargar-gs.js';

const LOGICA = 'apps-script/Logica.gs';
const CODE = 'apps-script/Code.gs';
const INSTALACION = 'apps-script/Instalacion.gs';
const ORDENES = [
  [LOGICA, CODE, INSTALACION], [LOGICA, INSTALACION, CODE],
  [CODE, LOGICA, INSTALACION], [CODE, INSTALACION, LOGICA],
  [INSTALACION, LOGICA, CODE], [INSTALACION, CODE, LOGICA],
];

// Cualquier uso de un servicio de Google durante la carga lanza: al cargar no debe tocarse ninguno.
const servicio = (nombre) => new Proxy({}, { get() { throw new Error(`${nombre} usado al cargar`); } });
const GOOGLE = Object.fromEntries(['SpreadsheetApp', 'CacheService', 'PropertiesService', 'LockService', 'MailApp',
  'ContentService', 'Utilities', 'ScriptApp'].map((n) => [n, servicio(n)]));

for (const orden of ORDENES) {
  test(`I-1: el proyecto carga en el orden ${orden.map((r) => r.split('/')[1]).join(', ')}`, () => {
    const gs = cargarVariosGs(orden, GOOGLE);
    assert.equal(typeof gs.doGet, 'function');
    assert.equal(typeof gs.crearEstructura, 'function');
    assert.equal(gs.hojas().agente.columnas, gs.COLUMNAS_AGENTES);
    assert.equal(gs.hojas().convocatoria.columnas, gs.COLUMNAS_CONVOCATORIAS);
    assert.equal(gs.hojas().sugerencia.columnas, gs.COLUMNAS_SUGERENCIAS);
  });
}

test('I-5: límite de 12 envíos por hora y reserva de cuota de 20 para acuses', () => {
  const gs = cargarVariosGs([LOGICA, CODE, INSTALACION], GOOGLE);
  assert.equal(gs.LIMITE_ENVIOS_HORA, 12);
  assert.equal(gs.CUOTA_MINIMA_ACUSE, 20);
});
