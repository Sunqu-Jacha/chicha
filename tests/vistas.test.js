import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tarjetaAgente, chip } from '../assets/js/vistas/comunes.js';
import { renderPortada } from '../assets/js/vistas/portada.js';
import { renderExplorar } from '../assets/js/vistas/explorar.js';
import { leerRuta } from '../assets/js/rutas.js';
import { esDatosValidos } from '../assets/js/datos.js';

const ejemplo = JSON.parse(readFileSync(new URL('../assets/datos-ejemplo.json', import.meta.url), 'utf8'));

const agente = (extra = {}) => ({
  id: 'ag-1', capa: 'Perú', nombre: 'Casa Andina', descripcion: 'Talleres', ofrece: ['Formación'], sectores: ['Música'],
  tipoEntidad: 'Centro cultural', presencia: 'Peruana', departamento: 'Cusco', ciudad: 'Cusco', verificado: false, ...extra,
});

test('tarjetaAgente escapa el nombre (Review Focus 1)', () => {
  const html = tarjetaAgente(agente({ nombre: '<script>alert(1)</script>', ciudad: '"><img src=x>' }));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img'));
});

test('tarjetaAgente: enlace a la ficha, franja del primer sector, tipo · ciudad, sello', () => {
  const html = tarjetaAgente(agente({ id: 'ag-x7', sectores: ['Artes visuales', 'Música'], verificado: true, ofrece: ['Formación', 'Redes y contactos'] }));
  assert.match(html, /^<a [^>]*href="#\/agente\/ag-x7"/);
  assert.ok(html.includes('--sector-artes-visuales'));
  assert.ok(html.includes('Centro cultural · Cusco'));
  assert.ok(html.includes('Verificado'));
  assert.ok(html.includes('Redes y contactos'));
  assert.ok(html.includes('<svg'));
  assert.ok(!tarjetaAgente(agente()).includes('Verificado'));
});

test('chip con quitarHref es un enlace con etiqueta accesible', () => {
  const html = chip('Música', { activo: true, quitarHref: '#/explorar' });
  assert.ok(html.includes('href="#/explorar"'));
  assert.ok(html.includes('chip--activo'));
  assert.ok(html.includes('Quitar filtro: Música'));
  assert.ok(!chip('<b>', {}).includes('<b>'));
});

test('datos de ejemplo válidos, con agentes internacionales y taxonomía completa', () => {
  assert.ok(esDatosValidos(ejemplo));
  assert.ok(ejemplo.agentes.length >= 10);
  assert.ok(ejemplo.agentes.some((a) => a.capa === 'Internacional'));
  assert.ok(ejemplo.convocatorias.length >= 6);
  assert.equal(ejemplo.listas.departamentos.length, 25);
  assert.deepEqual(ejemplo.listas.presencia, ['Peruana', 'Extranjera con sede en el Perú', 'Internacional']);
  const ids = new Set(ejemplo.agentes.map((a) => a.id));
  for (const c of ejemplo.convocatorias) assert.ok(ids.has(c.agenteId), c.id);
  for (const a of ejemplo.agentes) {
    for (const v of a.ofrece) assert.ok(ejemplo.listas.ofrece.includes(v), v);
    for (const v of a.sectores) assert.ok(ejemplo.listas.sectores.includes(v), v);
    assert.ok(ejemplo.listas.tiposEntidad.includes(a.tipoEntidad), a.tipoEntidad);
    assert.ok(ejemplo.listas.presencia.includes(a.presencia), a.presencia);
  }
});

test('renderPortada: buscador, un chip por ofrece y contadores', () => {
  const html = renderPortada(ejemplo, '2026-11-04');
  assert.ok(html.includes('<form'));
  assert.ok(html.includes('¿Qué estás buscando?'));
  for (const o of ejemplo.listas.ofrece) assert.ok(html.includes(o), o);
  assert.ok(html.includes('href="#/explorar?ofrece=financiamiento-y-fondos"'));
  const peru = ejemplo.agentes.filter((a) => a.capa === 'Perú').length;
  assert.ok(html.includes(`>${peru}<`));
});

test('renderExplorar sin resultados muestra el estado vacío', () => {
  const html = renderExplorar(ejemplo, leerRuta('#/explorar?q=zzzzqqq'), 'Perú');
  assert.ok(html.includes('No hay agentes con estos filtros'));
  assert.ok(html.includes('Quitar el último filtro'));
  assert.ok(html.includes('Añadir un agente'));
});

test('renderExplorar: grupos en orden, filtros aplicados y chips', () => {
  const html = renderExplorar(ejemplo, leerRuta('#/explorar?sec=musica'), 'Perú');
  const pos = ['¿Qué ofrece?', 'Sector', 'Tipo de entidad', 'Departamento', 'Presencia'].map((g) => html.indexOf(`<legend>${g}</legend>`));
  assert.ok(pos.every((p) => p >= 0));
  assert.deepEqual([...pos].sort((a, b) => a - b), pos);
  assert.ok(html.includes('Quitar filtro: Música'));
  assert.ok(html.includes('Limpiar'));
  assert.ok(html.includes('Filtros (1)'));
  assert.ok(!html.includes('No hay agentes con estos filtros'));
  assert.ok(!html.includes('Fondo Creativo Andino'));
});

test('renderExplorar en capa Internacional oculta Departamento y Presencia', () => {
  const html = renderExplorar(ejemplo, leerRuta('#/internacional'), 'Internacional');
  assert.ok(!html.includes('<legend>Departamento</legend>'));
  assert.ok(!html.includes('<legend>Presencia</legend>'));
  assert.ok(html.includes('Oportunidades abiertas a postulantes desde el Perú'));
  assert.ok(html.includes('Fondo Creativo Andino'));
  assert.ok(!html.includes('Centro Cultural Ejemplo Qosqo'));
});

test('Quitar el último filtro enlaza a la ruta sin el último valor', () => {
  const datos = { ...ejemplo, agentes: [] };
  const html = renderExplorar(datos, leerRuta('#/explorar?ofrece=formacion&sec=musica'), 'Perú');
  assert.ok(html.includes('href="#/explorar?ofrece=formacion"'));
});
