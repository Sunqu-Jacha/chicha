import test from 'node:test'; import assert from 'node:assert/strict';
import { hoyLima, estadoConvocatoria, filtrarConvocatorias, agruparPorMes, aniosDisponibles } from '../assets/js/convocatorias.js';

const base = { id: 'x', agenteId: 'a', titulo: 'T', anio: 2027, tipo: 'Concurso', ofrece: ['Financiamiento y fondos'], sectores: ['Música'], descripcion: '', monto: '', enlaceBases: '', fechaApertura: '2027-02-01', fechaCierre: '2027-03-14', fechaResultados: '' };
const c = (o) => ({ ...base, ...o });

test('estado: próxima antes de apertura', () => assert.deepEqual(estadoConvocatoria(base, '2027-01-31'), { estado: 'proxima', diasParaCierre: null }));
test('estado: abierta con más de 14 días', () => assert.deepEqual(estadoConvocatoria(base, '2027-02-01'), { estado: 'abierta', diasParaCierre: null }));
test('estado: abierta con 9 días', () => assert.deepEqual(estadoConvocatoria(base, '2027-03-05'), { estado: 'abierta', diasParaCierre: 9 }));
test('estado: cierre mismo día = 0', () => assert.deepEqual(estadoConvocatoria(base, '2027-03-14'), { estado: 'abierta', diasParaCierre: 0 }));
test('estado: cerrada al día siguiente', () => assert.deepEqual(estadoConvocatoria(base, '2027-03-15'), { estado: 'cerrada', diasParaCierre: null }));
test('estado: sin apertura y antes del cierre es abierta', () => assert.equal(estadoConvocatoria(c({ fechaApertura: '' }), '2027-01-01').estado, 'abierta'));
test('estado: exactamente 14 días', () => assert.equal(estadoConvocatoria(base, '2027-02-28').diasParaCierre, 14));

test('hoyLima usa America/Lima', () => {
  assert.equal(hoyLima(new Date('2027-03-15T03:00:00Z')), '2027-03-14');
  assert.equal(hoyLima(new Date('2027-03-15T05:00:00Z')), '2027-03-15');
});

test('agruparPorMes ordena y nombra en español', () => {
  const l = [c({ id: '1', titulo: 'B', fechaCierre: '2027-03-14' }), c({ id: '2', titulo: 'A', fechaCierre: '2027-03-14' }), c({ id: '3', fechaCierre: '2027-01-10' }), c({ id: '4', anio: 2026, fechaCierre: '2026-05-01' })];
  const g = agruparPorMes(l, 2027);
  assert.deepEqual(g.map((x) => [x.mes, x.nombre]), [[1, 'Enero'], [3, 'Marzo']]);
  assert.deepEqual(g[1].items.map((x) => x.id), ['2', '1']);
});

test('aniosDisponibles desc sin repetidos', () => assert.deepEqual(aniosDisponibles([c({ anio: 2026 }), c({ anio: 2027 }), c({ anio: 2026 })]), [2027, 2026]));

const L = [c({ id: 'p', agenteId: 'pe' }), c({ id: 'i', agenteId: 'in', tipo: 'Beca', ofrece: ['Formación'], sectores: ['Cine'], fechaCierre: '2027-01-10' }), c({ id: 'u', agenteId: 'zz' })];
const capas = new Map([['pe', 'Perú'], ['in', 'Internacional']]);
const crit = { soloAbiertas: false, sectores: [], ofrece: [], tipos: [], incluirInternacional: true };
const ids = (xs) => xs.map((x) => x.id).sort();

test('incluirInternacional:false excluye internacionales; desconocido es Perú', () => {
  assert.deepEqual(ids(filtrarConvocatorias(L, { ...crit, incluirInternacional: false }, capas, '2027-02-10')), ['p', 'u']);
});
test('soloAbiertas excluye cerradas y próximas', () => {
  assert.deepEqual(ids(filtrarConvocatorias(L, { ...crit, soloAbiertas: true }, capas, '2027-02-10')), ['p', 'u']);
});
test('OR dentro del grupo, AND entre grupos (slugs)', () => {
  assert.deepEqual(ids(filtrarConvocatorias(L, { ...crit, tipos: ['beca', 'concurso'] }, capas, '2027-01-01')), ['i', 'p', 'u']);
  assert.deepEqual(ids(filtrarConvocatorias(L, { ...crit, tipos: ['beca'], sectores: ['cine'], ofrece: ['formacion'] }, capas, '2027-01-01')), ['i']);
  assert.deepEqual(ids(filtrarConvocatorias(L, { ...crit, tipos: ['beca'], sectores: ['musica'] }, capas, '2027-01-01')), []);
});
