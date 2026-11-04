import test from 'node:test'; import assert from 'node:assert/strict';
import { leerRuta, escribirRuta, limpiarSlugs } from '../assets/js/rutas.js';
import { criteriosVacios } from '../assets/js/filtros.js';

const base = () => ({ vista: 'portada', criterios: criteriosVacios(), orden: 'az', id: null, anio: null, soloAbiertas: false, incluirInternacional: true });

test('portada por defecto', () => {
  assert.deepEqual(leerRuta('#/'), base());
  assert.deepEqual(leerRuta(''), base());
  assert.equal(escribirRuta(base()), '#/');
});

test('ida y vuelta: explorar con filtros', () => {
  const r = { ...base(), vista: 'explorar', orden: 'recientes',
    criterios: { q: 'música andina', ofrece: ['formacion', 'espacios'], sectores: ['musica'], tipos: ['colectivo'], departamentos: ['cusco'], presencia: ['local'] } };
  assert.deepEqual(leerRuta(escribirRuta(r)), r);
});

test('ida y vuelta: internacional', () => {
  const r = { ...base(), vista: 'internacional', criterios: { ...criteriosVacios(), sectores: ['musica'] } };
  assert.deepEqual(leerRuta(escribirRuta(r)), r);
});

test('ida y vuelta: convocatorias con año, abiertas e intl', () => {
  const r = { ...base(), vista: 'convocatorias', anio: 2027, soloAbiertas: true, incluirInternacional: false,
    criterios: { ...criteriosVacios(), sectores: ['musica'], ofrece: ['financiamiento-y-fondos'] } };
  const h = escribirRuta(r);
  assert.match(h, /anio=2027&abiertas=1&intl=0$/);
  assert.deepEqual(leerRuta(h), r);
});

test('ida y vuelta: agente y sobre', () => {
  const r = { ...base(), vista: 'agente', id: 'casa-andina' };
  assert.equal(escribirRuta(r), '#/agente/casa-andina');
  assert.deepEqual(leerRuta(escribirRuta(r)), r);
  assert.equal(leerRuta('#/sobre').vista, 'sobre');
});

test('vista desconocida y parámetros desconocidos', () => {
  assert.equal(leerRuta('#/xyz').vista, 'portada');
  const r = leerRuta('#/explorar?foo=1&sec=musica');
  assert.deepEqual(r.criterios.sectores, ['musica']);
});

test('q con espacios y tildes se codifica', () => {
  const r = { ...base(), vista: 'explorar', criterios: { ...criteriosVacios(), q: 'ñandú & café' } };
  const h = escribirRuta(r);
  assert.ok(h.includes(encodeURIComponent('ñandú & café')));
  assert.equal(leerRuta(h).criterios.q, 'ñandú & café');
});

test('omite valores por defecto y orden estable', () => {
  const r = { ...base(), vista: 'explorar', criterios: { ...criteriosVacios(), presencia: ['local'], q: 'a' } };
  assert.equal(escribirRuta(r), '#/explorar?q=a&pres=local');
});

test('limpiarSlugs descarta slugs inexistentes', () => {
  const validos = { ofrece: new Set(), sectores: new Set(['musica']), tipos: new Set(), departamentos: new Set(), presencia: new Set() };
  const c = { ...criteriosVacios(), q: 'x', sectores: ['gastronomia', 'musica'] };
  const l = limpiarSlugs(c, validos);
  assert.deepEqual(l.sectores, ['musica']);
  assert.equal(l.q, 'x');
});
