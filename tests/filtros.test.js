import test from 'node:test'; import assert from 'node:assert/strict';
import { criteriosVacios, filtrarAgentes, ordenarAgentes, contarPorValor } from '../assets/js/filtros.js';

const A = { id: 'a', nombre: 'Casa Andina', descripcion: 'Fondos y talleres de música', ofrece: ['Financiamiento y fondos', 'Formación'], sectores: ['Música'], tipoEntidad: 'Colectivo', presencia: 'Local', departamento: 'Cusco', ciudad: 'Cusco', fechaAprobacion: '2026-03-01' };
const B = { id: 'b', nombre: 'Ñandú Lab', descripcion: 'Cursos de grabado', ofrece: ['Formación'], sectores: ['Artes visuales'], tipoEntidad: 'Academia', presencia: 'Nacional', departamento: 'Lima', ciudad: 'Lima', fechaAprobacion: '' };
const C = { id: 'c', nombre: 'Nazca Fondo', descripcion: 'Becas para música urbana', ofrece: ['Financiamiento y fondos'], sectores: ['Música'], tipoEntidad: 'Fondo', presencia: 'Nacional', departamento: 'Lima', ciudad: 'Miraflores', fechaAprobacion: '2026-05-10' };
const D = { id: 'd', nombre: 'Espacio Wak\'a', descripcion: 'Sala de patrimonio', ofrece: ['Espacios'], sectores: ['Patrimonio'], tipoEntidad: 'Espacio', presencia: 'Local', departamento: 'Cusco', ciudad: 'Cusco', fechaAprobacion: '2025-12-01' };
const todos = [A, B, C, D];
const ids = (xs) => xs.map((x) => x.id).sort();

test('OR dentro de grupo', () => {
  const c = { ...criteriosVacios(), ofrece: ['financiamiento-y-fondos', 'formacion'] };
  assert.deepEqual(ids(filtrarAgentes(todos, c)), ['a', 'b', 'c']);
});
test('AND entre grupos', () => {
  const c = { ...criteriosVacios(), ofrece: ['financiamiento-y-fondos'], departamentos: ['cusco'] };
  assert.deepEqual(ids(filtrarAgentes(todos, c)), ['a']);
});
test('criterios vacíos devuelven todo', () => assert.equal(filtrarAgentes(todos, criteriosVacios()).length, 4));
test('búsqueda sin tildes', () => {
  assert.deepEqual(ids(filtrarAgentes(todos, { ...criteriosVacios(), q: 'musica cusco' })), ['a']);
});
test('ordenar az usa reglas del español', () => {
  const entrada = [B, C];
  const r = ordenarAgentes(entrada, 'az');
  assert.deepEqual(r.map((x) => x.id), ['c', 'b']);
  assert.deepEqual(entrada.map((x) => x.id), ['b', 'c']);
});
test('recientes sin fecha al final', () => {
  assert.deepEqual(ordenarAgentes(todos, 'recientes').map((x) => x.id), ['c', 'a', 'd', 'b']);
});
test('contarPorValor departamento', () => {
  const m = contarPorValor(todos, 'departamento');
  assert.equal(m.get('cusco'), 2); assert.equal(m.get('lima'), 2);
});
test('contarPorValor multivalor', () => assert.equal(contarPorValor(todos, 'ofrece').get('formacion'), 2));
