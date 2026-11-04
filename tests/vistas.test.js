import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tarjetaAgente, chip } from '../assets/js/vistas/comunes.js';
import { renderPortada } from '../assets/js/vistas/portada.js';
import { renderExplorar } from '../assets/js/vistas/explorar.js';
import { leerRuta } from '../assets/js/rutas.js';
import { esDatosValidos } from '../assets/js/datos.js';
import { renderFicha } from '../assets/js/vistas/ficha.js';
import { renderConvocatorias } from '../assets/js/vistas/convocatorias.js';
import { renderSobre } from '../assets/js/vistas/sobre.js';
import { validos } from '../assets/js/app.js';
import { estadoConvocatoria } from '../assets/js/convocatorias.js';

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
  const deps = new Set(ejemplo.agentes.filter((a) => a.capa === 'Perú').map((a) => a.departamento).filter(Boolean)).size;
  const abiertas = ejemplo.convocatorias.filter((c) => estadoConvocatoria(c, '2026-11-04').estado === 'abierta').length;
  assert.match(html, new RegExp(`>${deps}</span><span class="contadores__t">Departamentos`));
  assert.match(html, new RegExp(`>${abiertas}</span><span class="contadores__t">Convocatorias abiertas`));
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

const conv = (extra = {}) => ({
  id: 'cv-1', agenteId: 'ag-1', titulo: 'Fondo de prueba', anio: 2026, tipo: 'fondo', ofrece: ['Financiamiento y fondos'], sectores: ['Música'],
  descripcion: '', monto: '', enlaceBases: 'https://example.org/bases', fechaApertura: '2026-10-01', fechaCierre: '2026-11-13', fechaResultados: null, ...extra,
});

test('renderFicha(null) avisa que el agente no está disponible (Review Focus 5)', () => {
  const html = renderFicha(null, [], '2026-11-04');
  assert.ok(html.includes('Este agente ya no está disponible'));
  assert.ok(html.includes('href="#/explorar"'));
  assert.ok(html.includes('Volver a explorar'));
  assert.match(html, /^<dialog /);
});

test('renderFicha: enlaces externos con rel="noopener" y target="_blank", correo con mailto', () => {
  const a = agente({ web: 'https://example.org', instagram: 'https://instagram.com/casa', facebook: 'https://facebook.com/casa',
    otrasRedes: 'https://tiktok.com/@casa', emailPublico: 'hola@example.org' });
  const html = renderFicha(a, [], '2026-11-04');
  const externos = html.match(/<a [^>]*href="https?:[^>]*>/g) || [];
  assert.equal(externos.length, 4);
  for (const e of externos) { assert.ok(e.includes('rel="noopener"'), e); assert.ok(e.includes('target="_blank"'), e); }
  assert.ok(html.includes('href="mailto:hola@example.org"'));
  assert.ok(html.includes('Sugerir un cambio'));
  assert.ok(html.includes('data-registro="ag-1"'));
});

test('renderFicha no enlaza URLs con esquemas peligrosos y escapa los datos', () => {
  const a = agente({ nombre: '<b>X</b>', web: 'javascript:alert(1)', instagram: ' JavaScript:alert(1)', facebook: 'data:text/html,x',
    otrasRedes: 'vbscript:x', emailPublico: 'javascript:alert(1)', logoUrl: 'javascript:alert(1)' });
  const html = renderFicha(a, [], '2026-11-04');
  assert.ok(!/javascript:|vbscript:|data:/i.test(html));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<b>'));
  assert.ok(html.includes('&lt;b&gt;'));
});

test('renderFicha: logo seguro o iniciales', () => {
  assert.ok(renderFicha(agente({ logoUrl: 'https://example.org/logo.png' }), [], '2026-11-04').includes('<img src="https://example.org/logo.png"'));
  assert.ok(renderFicha(agente({ nombre: 'Casa de la Música' }), [], '2026-11-04').includes('>CM<'));
});

test('renderFicha muestra solo las convocatorias del agente en el año en curso, con su estado', () => {
  const cs = [conv({ titulo: 'Fondo vigente' }), conv({ id: 'cv-2', titulo: 'Fondo viejo', anio: 2025, fechaCierre: '2025-05-01' }),
    conv({ id: 'cv-3', agenteId: 'otro', titulo: 'Fondo ajeno' })];
  const html = renderFicha(agente(), cs, '2026-11-04');
  assert.ok(html.includes('Fondo vigente'));
  assert.ok(html.includes('cierra en 9 días'));
  assert.ok(!html.includes('Fondo viejo'));
  assert.ok(!html.includes('Fondo ajeno'));
});

const datosConv = (convocatorias, agentes = [agente()]) => ({ ...ejemplo, agentes, convocatorias });

test('renderConvocatorias: título con año, insignia "cierra en 9 días" y enlace a bases', () => {
  const html = renderConvocatorias(datosConv([conv()]), leerRuta('#/convocatorias'), '2026-11-04');
  assert.ok(html.includes('CONVOCATORIAS 2026'));
  assert.ok(html.includes('Abierta · cierra en 9 días'));
  assert.ok(html.includes('Noviembre'));
  assert.ok(html.includes('href="#/agente/ag-1"'));
  assert.match(html, /<a [^>]*href="https:\/\/example\.org\/bases"[^>]*rel="noopener"/);
  assert.ok(html.includes('Ver bases'));
});

test('renderConvocatorias: textos de insignia exactos', () => {
  const html = (hoy, extra = {}) => renderConvocatorias(datosConv([conv(extra)]), leerRuta('#/convocatorias'), hoy);
  assert.ok(html('2026-11-12').includes('Abierta · cierra en 1 día<'));
  assert.ok(html('2026-11-13').includes('Abierta · cierra hoy<'));
  assert.ok(html('2026-10-15').includes('>Abierta<'));
  assert.ok(html('2026-09-15').includes('>Próxima<'));
  assert.ok(html('2026-11-20').includes('>Cerrada<'));
});

test('renderConvocatorias: fecha grande de cierre, o de apertura si está próxima', () => {
  const html = (hoy) => renderConvocatorias(datosConv([conv()]), leerRuta('#/convocatorias'), hoy);
  assert.ok(html('2026-11-04').includes('datetime="2026-11-13"'));
  assert.ok(html('2026-09-15').includes('datetime="2026-10-01"'));
});

test('renderConvocatorias: estado vacío, año elegido y filtros desde la ruta', () => {
  const ag = [agente(), agente({ id: 'ag-i', capa: 'Internacional', nombre: 'Red Global' })];
  const cs = [conv(), conv({ id: 'cv-i', agenteId: 'ag-i', titulo: 'Beca global', tipo: 'beca' }),
    conv({ id: 'cv-27', titulo: 'Fondo futuro', anio: 2027, fechaApertura: '2027-01-01', fechaCierre: '2027-02-01' })];
  const d = datosConv(cs, ag);
  const vacio = renderConvocatorias(d, leerRuta('#/convocatorias?tipo=premio'), '2026-11-04');
  assert.ok(vacio.includes('No hay convocatorias con estos filtros este año'));
  const sinIntl = renderConvocatorias(d, leerRuta('#/convocatorias?intl=0'), '2026-11-04');
  assert.ok(sinIntl.includes('Fondo de prueba') && !sinIntl.includes('Beca global'));
  const conIntl = renderConvocatorias(d, leerRuta('#/convocatorias'), '2026-11-04');
  assert.ok(conIntl.includes('Beca global') && conIntl.includes('>Internacional<'));
  const beca = renderConvocatorias(d, leerRuta('#/convocatorias?tipo=beca'), '2026-11-04');
  assert.ok(beca.includes('Beca global') && !beca.includes('Fondo de prueba'));
  const a2027 = renderConvocatorias(d, leerRuta('#/convocatorias?anio=2027'), '2026-11-04');
  assert.ok(a2027.includes('CONVOCATORIAS 2027') && a2027.includes('Fondo futuro') && !a2027.includes('Fondo de prueba'));
  assert.ok(a2027.includes('<option value="2027" selected>'));
  const abiertas = renderConvocatorias(d, leerRuta('#/convocatorias?anio=2027&abiertas=1'), '2026-11-04');
  assert.ok(abiertas.includes('No hay convocatorias con estos filtros este año'));
  for (const t of ['Solo abiertas', 'Incluir internacionales', '<legend>Sector</legend>', '<legend>¿Qué ofrece?</legend>', '<legend>Tipo</legend>']) assert.ok(conIntl.includes(t), t);
});

test('renderConvocatorias no enlaza bases con esquemas peligrosos', () => {
  const html = renderConvocatorias(datosConv([conv({ enlaceBases: 'javascript:alert(1)' })]), leerRuta('#/convocatorias'), '2026-11-04');
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('Ver bases'));
});

test('renderSobre: lema, Sunqu Jach\'a, moderación y aviso de privacidad', () => {
  const html = renderSobre();
  for (const t of ['SOBRE CHICHA', 'Juntos, construimos el Perú', "Sunqu Jach'a", 'Ley N.º 29733', 'Sugerir un cambio']) assert.ok(html.includes(t), t);
});

test('renderExplorar en capa Perú ignora pres=internacional', () => {
  const html = renderExplorar(ejemplo, leerRuta('#/explorar?pres=internacional'), 'Perú');
  assert.ok(html.includes('Filtros (0)'));
  assert.ok(!html.includes('Quitar filtro: Internacional'));
});

test('validos: en convocatorias el tipo se valida contra tiposConvocatoria', () => {
  assert.ok(validos(ejemplo, 'convocatorias').tipos.has('beca'));
  assert.ok(!validos(ejemplo, 'explorar').tipos.has('beca'));
});
