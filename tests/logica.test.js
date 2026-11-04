import test from 'node:test'; import assert from 'node:assert/strict';
import { deepEqual as laxo } from 'node:assert'; // deepEqual laxo: los objetos del vm tienen otro prototipo
import { cargarGs } from './cargar-gs.js';
import { separarMulti as separarMultiNav } from '../assets/js/texto.js';

const gs = cargarGs('apps-script/Logica.gs');

const LISTAS = {
  ofrece: ['Formación', 'Financiamiento y fondos'],
  sectores: ['Música', 'Artes visuales'],
  tiposEntidad: ['Fundación / ONG', 'Centro cultural'],
  presencia: ['Peruana', 'Internacional (sin sede en el Perú; solo capa Internacional)'],
  departamentos: ['Cusco', 'Lima'],
  tiposConvocatoria: ['fondo', 'premio'],
};
const APROBADOS = new Set(['ag-aaaaaa']);
const agenteOk = () => ({
  nombre: 'Casa Chicha', ofrece: ['Formación'], sectores: ['Música'], tipo_entidad: 'Centro cultural',
  presencia: 'Peruana', departamento: 'Cusco', ciudad: 'Cusco', descripcion: 'Un espacio.',
  nombre_proponente: 'Ana', email_proponente: 'ana@correo.pe', consentimiento: true,
});
const convOk = () => ({
  agente_id: 'ag-aaaaaa', titulo: 'Fondo X', anio: 2027, tipo: 'fondo', enlace_bases: 'https://x.pe/bases',
  fecha_cierre: '2027-03-14', nombre_proponente: 'Ana', email_proponente: 'ana@correo.pe', consentimiento: true,
});

test('paridad separarMulti: Logica.gs == assets/js/texto.js', () => {
  const casos = [null, undefined, '', ' ', 'a', 'a;b', 'Música; ;Artes visuales ', ';;', [' a ', '', 'b'], [], 5, 0, [1, null, ' x '], 'a;b;'];
  for (const c of casos) laxo(gs.separarMulti(c), separarMultiNav(c), JSON.stringify(c));
});

test('multivalor basura', () => laxo(gs.separarMulti('Música; ;Artes visuales '), ['Música', 'Artes visuales']));

test('fechaIso en America/Lima', () => {
  assert.equal(gs.fechaIso(new Date('2027-03-15T03:00:00Z')), '2027-03-14');
  assert.equal(gs.fechaIso('2027-03-15T10:00:00Z'), '2027-03-15');
  assert.equal(gs.fechaIso(''), null);
  assert.equal(gs.fechaIso(null), null);
  assert.equal(gs.fechaIso(new Date('x')), null);
});

test('aCamel', () => {
  assert.equal(gs.aCamel('tipo_entidad'), 'tipoEntidad');
  assert.equal(gs.aCamel('año'), 'anio');
  assert.equal(gs.aCamel('id'), 'id');
});

test('filasAObjetos recorta strings', () => {
  laxo(gs.filasAObjetos(['id', 'año'], [[' ag-1 ', 2027]]), [{ id: 'ag-1', 'año': 2027 }]);
});

test('faltantes detecta columna renombrada', () => {
  laxo(gs.faltantes(['id', 'nombre_', 'estado'], ['id', 'nombre', 'estado']), ['nombre']);
  laxo(gs.faltantes(gs.COLUMNAS_AGENTES, gs.COLUMNAS_AGENTES), []);
});

test('columnas del spec §6', () => {
  assert.equal(gs.COLUMNAS_AGENTES[0], 'id');
  assert.equal(gs.COLUMNAS_CONVOCATORIAS[0], 'id');
  assert.ok(gs.COLUMNAS_CONVOCATORIAS.includes('año'));
  laxo(gs.COLUMNAS_SUGERENCIAS, ['id', 'estado', 'fecha_envio', 'tipo_registro', 'registro_id', 'campo', 'valor_propuesto', 'fuente', 'email_proponente', 'notas_moderacion']);
  laxo(gs.MULTI, ['ofrece', 'sectores']);
});

const filaAgente = (extra) => Object.assign({
  id: 'ag-1', estado: 'aprobado', capa: 'Perú', verificado: 'sí', fecha_envio: '2026-10-01', fecha_aprobacion: new Date('2026-11-10T12:00:00Z'),
  origen: 'formulario', nombre: 'A', descripcion: 'd', logo_url: '', ofrece: 'Formación; Música', sectores: 'Música', tipo_entidad: 'Centro cultural',
  presencia: 'Peruana', pais: 'Perú', departamento: 'Cusco', ciudad: 'Cusco', direccion: '', lat: '', lng: -71.9, web: '', instagram: '', facebook: '',
  otras_redes: '', email_publico: '', nombre_proponente: 'Secreto', email_proponente: 's@x.pe', notas_moderacion: 'n', motivo_rechazo: 'm',
}, extra);

test('publicar agentes: solo aprobados, solo claves §7.1', () => {
  const salida = gs.publicar([filaAgente(), filaAgente({ id: 'ag-2', estado: 'pendiente' })], gs.PUBLICAS_AGENTES);
  assert.equal(salida.length, 1);
  const a = salida[0];
  laxo(Object.keys(a).sort(), ['id', 'capa', 'nombre', 'descripcion', 'ofrece', 'sectores', 'tipoEntidad', 'presencia', 'pais', 'departamento', 'ciudad', 'direccion', 'lat', 'lng', 'web', 'instagram', 'facebook', 'otrasRedes', 'emailPublico', 'logoUrl', 'verificado', 'fechaAprobacion'].sort());
  for (const k of ['email_proponente', 'emailProponente', 'notas_moderacion', 'motivo_rechazo', 'nombre_proponente', 'estado']) assert.ok(!(k in a), k);
  laxo(a.ofrece, ['Formación', 'Música']);
  assert.equal(a.verificado, true);
  assert.equal(a.lat, null);
  assert.equal(a.lng, -71.9);
  assert.equal(a.fechaAprobacion, '2026-11-10');
});

test('verificado a booleano', () => {
  const v = (x) => gs.publicar([filaAgente({ verificado: x })], gs.PUBLICAS_AGENTES)[0].verificado;
  assert.equal(v('sí'), true); assert.equal(v('si'), true); assert.equal(v(true), true);
  assert.equal(v('no'), false); assert.equal(v(''), false);
});

const filaConv = (extra) => Object.assign({
  id: 'cv-1', estado: 'aprobado', fecha_envio: '2026-10-01', fecha_aprobacion: '2026-11-01', agente_id: 'ag-1', titulo: 'T', 'año': '2027', tipo: 'fondo',
  ofrece: 'Formación', sectores: '', descripcion: '', monto: '', enlace_bases: 'https://x.pe', fecha_apertura: '', fecha_cierre: '2027-03-14', fecha_resultados: '',
  nombre_proponente: 'S', email_proponente: 's@x.pe', notas_moderacion: '', motivo_rechazo: '',
}, extra);

test('publicar convocatorias: claves §7.1, anio numérico, omite sin fecha_cierre', () => {
  const salida = gs.publicar([filaConv(), filaConv({ id: 'cv-2', fecha_cierre: '' }), filaConv({ id: 'cv-3', fecha_cierre: 'mañana' }), filaConv({ id: 'cv-4', estado: 'pendiente' })], gs.PUBLICAS_CONVOCATORIAS);
  assert.equal(salida.length, 1);
  const c = salida[0];
  laxo(Object.keys(c).sort(), ['id', 'agenteId', 'titulo', 'anio', 'tipo', 'ofrece', 'sectores', 'descripcion', 'monto', 'enlaceBases', 'fechaApertura', 'fechaCierre', 'fechaResultados'].sort());
  assert.strictEqual(c.anio, 2027);
  assert.equal(c.fechaApertura, null);
  laxo(c.sectores, []);
});

test('validarEnvio agente vacío: todos los obligatorios', () => {
  const e = gs.validarEnvio('agente', {}, LISTAS, APROBADOS);
  for (const k of ['nombre', 'ofrece', 'sectores', 'tipo_entidad', 'presencia', 'departamento', 'ciudad', 'descripcion', 'nombre_proponente', 'email_proponente', 'consentimiento'])
    assert.ok(e[k], k);
  assert.equal(e.nombre, 'Este campo es obligatorio.');
  assert.equal(e.consentimiento, 'Necesitamos tu consentimiento para guardar tu correo.');
});

test('validarEnvio agente válido', () => laxo(gs.validarEnvio('agente', agenteOk(), LISTAS, APROBADOS), {}));

test('validarEnvio descripción 281, sector inexistente, correo, url', () => {
  let e = gs.validarEnvio('agente', Object.assign(agenteOk(), { descripcion: 'x'.repeat(281) }), LISTAS, APROBADOS);
  assert.equal(e.descripcion, 'Máximo 280 caracteres.');
  laxo(gs.validarEnvio('agente', Object.assign(agenteOk(), { descripcion: 'x'.repeat(280) }), LISTAS, APROBADOS), {});
  e = gs.validarEnvio('agente', Object.assign(agenteOk(), { sectores: ['Música', 'Inexistente'] }), LISTAS, APROBADOS);
  assert.equal(e.sectores, 'Elige una opción de la lista.');
  e = gs.validarEnvio('agente', Object.assign(agenteOk(), { email_proponente: 'no-es-correo', web: 'ftp://x', consentimiento: false }), LISTAS, APROBADOS);
  assert.equal(e.email_proponente, 'Revisa el correo.');
  assert.equal(e.web, 'El enlace debe empezar con http:// o https://.');
  assert.equal(e.consentimiento, 'Necesitamos tu consentimiento para guardar tu correo.');
});

test('validarEnvio convocatoria', () => {
  laxo(gs.validarEnvio('convocatoria', convOk(), LISTAS, APROBADOS), {});
  assert.equal(gs.validarEnvio('convocatoria', Object.assign(convOk(), { agente_id: 'ag-zzzzzz' }), LISTAS, APROBADOS).agente_id, 'Elige un agente publicado.');
  const e = gs.validarEnvio('convocatoria', {}, LISTAS, APROBADOS);
  for (const k of ['agente_id', 'titulo', 'anio', 'tipo', 'enlace_bases', 'fecha_cierre', 'nombre_proponente', 'email_proponente', 'consentimiento']) assert.ok(e[k], k);
  assert.equal(gs.validarEnvio('convocatoria', Object.assign(convOk(), { tipo: 'otra' }), LISTAS, APROBADOS).tipo, 'Elige una opción de la lista.');
});

test('validarEnvio sugerencia', () => {
  const ok = { tipo_registro: 'agente', registro_id: 'ag-aaaaaa', campo: 'web', valor_propuesto: 'https://x.pe', email_proponente: 'a@b.pe', consentimiento: true };
  laxo(gs.validarEnvio('sugerencia', ok, LISTAS, APROBADOS), {});
  const e = gs.validarEnvio('sugerencia', {}, LISTAS, APROBADOS);
  for (const k of ['campo', 'valor_propuesto', 'email_proponente', 'consentimiento']) assert.ok(e[k], k);
});

test('esSpam', () => {
  assert.equal(gs.esSpam({ sitio_web_2: 'http://spam', t0: 0 }, 60000), true);
  assert.equal(gs.esSpam({ sitio_web_2: '', t0: 10000 }, 12000), true);
  assert.equal(gs.esSpam({ sitio_web_2: '', t0: 10000 }, 20000), false);
  assert.equal(gs.esSpam({ t0: 10000 }, 14000), false);
});

test('nuevoId', () => {
  assert.match(gs.nuevoId('ag', () => 0.5), /^ag-[0-9a-z]{6}$/);
  assert.match(gs.nuevoId('cv'), /^cv-[0-9a-z]{6}$/);
  assert.match(gs.nuevoId('sg', () => 0.999999999), /^sg-[0-9a-z]{6}$/);
});

test('correo: asuntos exactos', () => {
  assert.equal(gs.correo('nuevo-moderador', { tipo: 'agente', nombre: 'Casa' }).asunto, '[Chicha] Nuevo agente: Casa');
  assert.equal(gs.correo('nuevo-moderador', { tipo: 'convocatoria', titulo: 'Fondo' }).asunto, '[Chicha] Nueva convocatoria: Fondo');
  assert.equal(gs.correo('nuevo-moderador', { tipo: 'sugerencia' }).asunto, '[Chicha] Nueva sugerencia de cambio');
  assert.equal(gs.correo('acuse', {}).asunto, 'Recibimos tu propuesta en Chicha');
  assert.equal(gs.correo('aprobado', { nombre: 'Casa' }).asunto, 'Casa ya está en Chicha');
  assert.equal(gs.correo('rechazado', {}).asunto, 'Sobre tu propuesta en Chicha');
  assert.equal(gs.correo('recordatorio', { anio: 2027 }).asunto, '[Chicha] Convocatorias 2027 para renovar');
  for (const t of ['acuse', 'aprobado', 'rechazado', 'recordatorio']) assert.match(gs.correo(t, { anio: 2027, nombre: 'x' }).cuerpo, /Equipo Chicha · Sunqu Jach'a/);
  assert.match(gs.correo('rechazado', { motivo: 'Falta información' }).cuerpo, /Falta información/);
});

test('paraRenovar omite las ya duplicadas', () => {
  const c = (id, agente_id, titulo, anio, estado = 'aprobado') => ({ id, agente_id, titulo, 'año': anio, estado });
  const r = gs.paraRenovar([
    c('1', 'ag-1', 'A', 2026), c('2', 'ag-1', 'B', 2026), c('3', 'ag-2', 'C', 2026, 'pendiente'), c('4', 'ag-3', 'D', 2025),
    c('5', 'ag-1', 'A', 2027, 'pendiente'), c('6', 'ag-9', 'B', 2027, 'rechazado'),
  ], 2027);
  laxo(r.map((x) => x.id), ['2']);
});
