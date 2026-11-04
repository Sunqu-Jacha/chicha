import test from 'node:test'; import assert from 'node:assert/strict';
import { cargarDatos, esDatosValidos } from '../assets/js/datos.js';
import { CLAVE_DATOS } from '../assets/js/config.js';

const listas = () => ({ ofrece: [], sectores: [], tiposEntidad: [], presencia: [], departamentos: [], tiposConvocatoria: [] });
const D = (n = 'a') => ({ generado: n, listas: listas(), agentes: [], convocatorias: [] });
const almacenFalso = (ini = {}) => { const m = new Map(Object.entries(ini)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), m }; };
const fetchOk = (d) => async () => ({ ok: true, json: async () => d });
const fetchCaido = async () => { throw new Error('red'); };

test('esDatosValidos acepta forma completa y rechaza el resto', () => {
  assert.equal(esDatosValidos(D()), true);
  assert.equal(esDatosValidos(null), false);
  assert.equal(esDatosValidos({ ...D(), agentes: {} }), false);
  assert.equal(esDatosValidos({ ...D(), convocatorias: undefined }), false);
  const l = listas(); delete l.presencia;
  assert.equal(esDatosValidos({ ...D(), listas: l }), false);
  assert.equal(esDatosValidos({ ...D(), listas: { ...listas(), sectores: 'x' } }), false);
});

test('red ok: origen red y guarda', async () => {
  const almacen = almacenFalso(); let url;
  const r = await cargarDatos({ url: 'https://x/exec', fetchFn: async (u) => { url = u; return { ok: true, json: async () => D('n') }; }, almacen });
  assert.equal(r.origen, 'red'); assert.equal(r.datos.generado, 'n');
  assert.equal(url, 'https://x/exec?accion=datos');
  assert.equal(JSON.parse(almacen.m.get(CLAVE_DATOS)).generado, 'n');
});

test('copia local válida: alGuardado se llama primero con la copia', async () => {
  const almacen = almacenFalso({ [CLAVE_DATOS]: JSON.stringify(D('vieja')) }); const orden = [];
  const fetchFn = async () => { orden.push('fetch'); return { ok: true, json: async () => D('nueva') }; };
  await cargarDatos({ url: 'u', fetchFn, almacen, alGuardado: d => orden.push('guardado:' + d.generado) });
  assert.deepEqual(orden, ['guardado:vieja', 'fetch']);
});

test('red caída con copia: local', async () => {
  const almacen = almacenFalso({ [CLAVE_DATOS]: JSON.stringify(D('vieja')) });
  const r = await cargarDatos({ url: 'u', fetchFn: fetchCaido, almacen });
  assert.equal(r.origen, 'local'); assert.equal(r.datos.generado, 'vieja');
});

test('red caída sin copia: ninguno', async () => {
  const r = await cargarDatos({ url: 'u', fetchFn: fetchCaido, almacen: almacenFalso() });
  assert.deepEqual(r, { datos: null, origen: 'ninguno' });
});

test('respuesta http no ok cuenta como fallo', async () => {
  const r = await cargarDatos({ url: 'u', fetchFn: async () => ({ ok: false, json: async () => D() }), almacen: almacenFalso() });
  assert.equal(r.origen, 'ninguno');
});

test('forma inválida no sobrescribe la copia', async () => {
  const almacen = almacenFalso({ [CLAVE_DATOS]: JSON.stringify(D('vieja')) });
  const r = await cargarDatos({ url: 'u', fetchFn: fetchOk({ ok: false, errores: 1 }), almacen });
  assert.equal(r.origen, 'local');
  assert.equal(JSON.parse(almacen.m.get(CLAVE_DATOS)).generado, 'vieja');
});

test('copia local corrupta se ignora', async () => {
  const r = await cargarDatos({ url: 'u', fetchFn: fetchCaido, almacen: almacenFalso({ [CLAVE_DATOS]: '{no json' }) });
  assert.equal(r.origen, 'ninguno');
});

test('almacén que lanza no rompe', async () => {
  const almacen = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('lleno'); } };
  const r = await cargarDatos({ url: 'u', fetchFn: fetchOk(D('n')), almacen });
  assert.equal(r.origen, 'red'); assert.equal(r.datos.generado, 'n');
  const r2 = await cargarDatos({ url: 'u', fetchFn: fetchCaido, almacen });
  assert.equal(r2.origen, 'ninguno');
});

test('fetch que nunca responde: el tiempo límite cae a la copia local', async () => {
  const almacen = almacenFalso({ [CLAVE_DATOS]: JSON.stringify(D('vieja')) });
  const colgado = (u, { signal } = {}) => new Promise((_, rechazar) => {
    if (signal) signal.addEventListener('abort', () => rechazar(signal.reason));
  });
  const r = await cargarDatos({ url: 'https://x/exec', fetchFn: colgado, almacen, tiempoLimiteMs: 30 });
  assert.equal(r.origen, 'local'); assert.equal(r.datos.generado, 'vieja');
  const r2 = await cargarDatos({ url: 'https://x/exec', fetchFn: colgado, almacen: almacenFalso(), tiempoLimiteMs: 30 });
  assert.equal(r2.origen, 'ninguno');
});

test('sin AbortSignal.timeout (navegadores viejos) la carga sigue funcionando sin signal', async () => {
  const original = AbortSignal.timeout; let opciones;
  try {
    AbortSignal.timeout = undefined;
    const r = await cargarDatos({ url: 'https://x/exec', fetchFn: async (u, o) => { opciones = o; return { ok: true, json: async () => D('n') }; }, almacen: almacenFalso() });
    assert.equal(r.origen, 'red'); assert.equal(opciones.signal, undefined);
  } finally { AbortSignal.timeout = original; }
});

test('localStorage bloqueado (getter que lanza) no rompe la carga', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    const r = await cargarDatos({ url: 'u', fetchFn: fetchOk(D('n')) });
    assert.equal(r.origen, 'red'); assert.equal(r.datos.generado, 'n');
    assert.deepEqual(await cargarDatos({ url: 'u', fetchFn: fetchCaido }), { datos: null, origen: 'ninguno' });
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('sin fetch disponible: camino "ninguno"', async () => {
  assert.deepEqual(await cargarDatos({ url: 'u', fetchFn: null, almacen: null }), { datos: null, origen: 'ninguno' });
});
