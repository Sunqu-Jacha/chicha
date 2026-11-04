import test from 'node:test'; import assert from 'node:assert/strict';
import { cargarGs } from './cargar-gs.js';
import { validarEnvio, esInternacional } from '../assets/js/validacion.js';

const gs = cargarGs('apps-script/Logica.gs');

const LISTAS = {
  ofrece: ['Formación', 'Financiamiento y fondos'],
  sectores: ['Música', 'Artes visuales'],
  tiposEntidad: ['Fundación / ONG', 'Centro cultural'],
  presencia: ['Peruana', 'Internacional'],
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
const sugOk = () => ({
  tipo_registro: 'agente', registro_id: 'ag-aaaaaa', campo: 'Web', valor_propuesto: 'https://nueva.pe',
  email_proponente: 'ana@correo.pe', consentimiento: true,
});
const con = (base, cambios) => ({ ...base(), ...cambios });
const sin = (base, ...campos) => { const o = base(); for (const c of campos) delete o[c]; return o; };

// [nombre, tipo, datos, variante]
const CASOS = [
  ['agente ok', 'agente', agenteOk()],
  ['agente vacío', 'agente', {}],
  ['agente null', 'agente', null],
  ['agente undefined', 'agente', undefined],
  ['agente array', 'agente', []],
  ['agente string', 'agente', 'hola'],
  ['nombre numérico', 'agente', con(agenteOk, { nombre: 5 })],
  ['nombre objeto', 'agente', con(agenteOk, { nombre: {} })],
  ['nombre en blanco', 'agente', con(agenteOk, { nombre: '   ' })],
  ['nombre 2000', 'agente', con(agenteOk, { nombre: 'a'.repeat(2000) })],
  ['nombre 2001', 'agente', con(agenteOk, { nombre: 'a'.repeat(2001) })],
  ['descripcion 280', 'agente', con(agenteOk, { descripcion: 'a'.repeat(280) })],
  ['descripcion 281', 'agente', con(agenteOk, { descripcion: 'a'.repeat(281) })],
  ['descripcion 280 + espacios', 'agente', con(agenteOk, { descripcion: ` ${'a'.repeat(280)} ` })],
  ['sin descripcion', 'agente', sin(agenteOk, 'descripcion')],
  ['ofrece string', 'agente', con(agenteOk, { ofrece: 'Formación' })],
  ['ofrece vacío', 'agente', con(agenteOk, { ofrece: [] })],
  ['ofrece inválido', 'agente', con(agenteOk, { ofrece: ['Nada'] })],
  ['ofrece con espacios', 'agente', con(agenteOk, { ofrece: [' Formación '] })],
  ['ofrece no-string', 'agente', con(agenteOk, { ofrece: [1] })],
  ['ofrece mezcla', 'agente', con(agenteOk, { ofrece: ['Formación', 'Nada'] })],
  ['sectores ausente', 'agente', sin(agenteOk, 'sectores')],
  ['tipo_entidad inválido', 'agente', con(agenteOk, { tipo_entidad: 'X' })],
  ['tipo_entidad número', 'agente', con(agenteOk, { tipo_entidad: 3 })],
  ['tipo_entidad con espacios', 'agente', con(agenteOk, { tipo_entidad: ' Centro cultural ' })],
  ['presencia ausente', 'agente', sin(agenteOk, 'presencia')],
  ['R7 Internacional sin departamento', 'agente', con(agenteOk, { presencia: 'Internacional', departamento: undefined })],
  ['R7 Internacional con departamento vacío', 'agente', con(agenteOk, { presencia: 'Internacional', departamento: '' })],
  ['R7 Internacional con país', 'agente', con(agenteOk, { presencia: 'Internacional', departamento: undefined, pais: 'Chile' })],
  ['R7 Internacional con departamento inválido', 'agente', con(agenteOk, { presencia: 'Internacional', departamento: 'Marte' })],
  ['R7 Internacional con espacios', 'agente', con(agenteOk, { presencia: ' Internacional ', departamento: undefined })],
  ['R7 internacional minúscula', 'agente', con(agenteOk, { presencia: 'internacional', departamento: undefined })],
  ['Peruana sin departamento', 'agente', sin(agenteOk, 'departamento')],
  ['departamento inválido', 'agente', con(agenteOk, { departamento: 'Marte' })],
  ['pais número', 'agente', con(agenteOk, { pais: 3 })],
  ['ciudad ausente', 'agente', sin(agenteOk, 'ciudad')],
  ['web ok', 'agente', con(agenteOk, { web: 'https://casa.pe' })],
  ['web ftp', 'agente', con(agenteOk, { web: 'ftp://casa.pe' })],
  ['web sin esquema', 'agente', con(agenteOk, { web: 'casa.pe' })],
  ['instagram mal', 'agente', con(agenteOk, { instagram: '@casa' })],
  ['facebook ok', 'agente', con(agenteOk, { facebook: 'http://fb.com/casa' })],
  ['logo_url mal', 'agente', con(agenteOk, { logo_url: 'javascript:1' })],
  ['email_publico mal', 'agente', con(agenteOk, { email_publico: 'x' })],
  ['email_publico ok', 'agente', con(agenteOk, { email_publico: 'info@casa.pe' })],
  ['email_proponente mal', 'agente', con(agenteOk, { email_proponente: 'ana@' })],
  ['email_proponente espacio', 'agente', con(agenteOk, { email_proponente: 'a na@x.pe' })],
  ['email_proponente ausente', 'agente', sin(agenteOk, 'email_proponente')],
  ['nombre_proponente ausente', 'agente', sin(agenteOk, 'nombre_proponente')],
  ['consentimiento false', 'agente', con(agenteOk, { consentimiento: false })],
  ['consentimiento "true"', 'agente', con(agenteOk, { consentimiento: 'true' })],
  ['consentimiento 1', 'agente', con(agenteOk, { consentimiento: 1 })],
  ['consentimiento ausente', 'agente', sin(agenteOk, 'consentimiento')],
  ['otras_redes larga', 'agente', con(agenteOk, { otras_redes: 'a'.repeat(2001) })],

  ['convocatoria ok', 'convocatoria', convOk()],
  ['convocatoria vacía', 'convocatoria', {}],
  ['agente_id desconocido', 'convocatoria', con(convOk, { agente_id: 'ag-zzzzzz' })],
  ['agente_id número', 'convocatoria', con(convOk, { agente_id: 7 })],
  ['agente_id con espacios', 'convocatoria', con(convOk, { agente_id: ' ag-aaaaaa ' })],
  ['agente_id sin ids aprobados', 'convocatoria', convOk(), 'sinIds'],
  ['agente_id con ids null', 'convocatoria', convOk(), 'idsNull'],
  ['titulo ausente', 'convocatoria', sin(convOk, 'titulo')],
  ['anio string ok', 'convocatoria', con(convOk, { anio: '2027' })],
  ['anio string con espacios', 'convocatoria', con(convOk, { anio: ' 2027 ' })],
  ['anio decimal', 'convocatoria', con(convOk, { anio: 2027.5 })],
  ['anio 1999', 'convocatoria', con(convOk, { anio: 1999 })],
  ['anio 2000', 'convocatoria', con(convOk, { anio: 2000 })],
  ['anio 2100', 'convocatoria', con(convOk, { anio: 2100 })],
  ['anio 2101', 'convocatoria', con(convOk, { anio: 2101 })],
  ['anio texto', 'convocatoria', con(convOk, { anio: 'abcd' })],
  ['anio 5 dígitos', 'convocatoria', con(convOk, { anio: '20277' })],
  ['anio null', 'convocatoria', con(convOk, { anio: null })],
  ['anio ausente', 'convocatoria', sin(convOk, 'anio')],
  ['anio booleano', 'convocatoria', con(convOk, { anio: true })],
  ['anio array', 'convocatoria', con(convOk, { anio: [2027] })],
  ['tipo inválido', 'convocatoria', con(convOk, { tipo: 'sorteo' })],
  ['tipo ausente', 'convocatoria', sin(convOk, 'tipo')],
  ['ofrece opcional inválido', 'convocatoria', con(convOk, { ofrece: ['Nada'] })],
  ['ofrece opcional ok', 'convocatoria', con(convOk, { ofrece: ['Formación'], sectores: ['Música'] })],
  ['sectores opcional string', 'convocatoria', con(convOk, { sectores: 'Música' })],
  ['descripcion conv 281', 'convocatoria', con(convOk, { descripcion: 'a'.repeat(281) })],
  ['monto larga', 'convocatoria', con(convOk, { monto: 'a'.repeat(2001) })],
  ['enlace ausente', 'convocatoria', sin(convOk, 'enlace_bases')],
  ['enlace sin esquema', 'convocatoria', con(convOk, { enlace_bases: 'x.pe' })],
  ['fecha_cierre ausente', 'convocatoria', sin(convOk, 'fecha_cierre')],
  ['fecha 30 de febrero', 'convocatoria', con(convOk, { fecha_cierre: '2027-02-30' })],
  ['fecha sin ceros', 'convocatoria', con(convOk, { fecha_cierre: '2027-3-1' })],
  ['fecha número', 'convocatoria', con(convOk, { fecha_cierre: 20270314 })],
  ['fecha bisiesto ok', 'convocatoria', con(convOk, { fecha_cierre: '2028-02-29' })],
  ['fecha no bisiesto', 'convocatoria', con(convOk, { fecha_cierre: '2027-02-29' })],
  ['fecha_apertura mal', 'convocatoria', con(convOk, { fecha_apertura: '14/03/2027' })],
  ['fecha_apertura ok', 'convocatoria', con(convOk, { fecha_apertura: '2027-02-01' })],
  ['fecha_resultados mal', 'convocatoria', con(convOk, { fecha_resultados: 'pronto' })],
  ['convocatoria sin consentimiento', 'convocatoria', con(convOk, { consentimiento: false })],

  ['sugerencia ok', 'sugerencia', sugOk()],
  ['sugerencia vacía', 'sugerencia', {}],
  ['sugerencia tipo_registro inválido', 'sugerencia', con(sugOk, { tipo_registro: 'otro' })],
  ['sugerencia tipo_registro ausente', 'sugerencia', sin(sugOk, 'tipo_registro')],
  ['sugerencia convocatoria', 'sugerencia', con(sugOk, { tipo_registro: 'convocatoria', registro_id: 'cv-abc123' })],
  ['sugerencia registro_id ausente', 'sugerencia', sin(sugOk, 'registro_id')],
  ['sugerencia campo ausente', 'sugerencia', sin(sugOk, 'campo')],
  ['sugerencia valor larguísimo', 'sugerencia', con(sugOk, { valor_propuesto: 'a'.repeat(2001) })],
  ['sugerencia fuente larga', 'sugerencia', con(sugOk, { fuente: 'a'.repeat(2001) })],
  ['sugerencia sin fuente', 'sugerencia', sin(sugOk, 'fuente')],
  ['sugerencia email mal', 'sugerencia', con(sugOk, { email_proponente: 'x' })],
  ['sugerencia sin consentimiento', 'sugerencia', con(sugOk, { consentimiento: undefined })],

  ['tipo desconocido', 'otro', {}],
  ['tipo undefined', undefined, {}],
  ['tipo null', null, agenteOk()],
  ['tipo vacío', '', {}],
];

const aJson = (v) => JSON.parse(JSON.stringify(v));

test('paridad validarEnvio: validacion.js == Logica.gs (mismos errores y mensajes)', () => {
  for (const [nombre, tipo, datos, variante] of CASOS) {
    const listas = LISTAS;
    const ids = variante === 'idsNull' ? null : variante === 'sinIds' ? undefined : APROBADOS;
    const navegador = aJson(validarEnvio(tipo, datos, listas, ids));
    const script = aJson(gs.validarEnvio(tipo, datos, listas, ids));
    assert.deepStrictEqual(navegador, script, nombre);
  }
});

test('paridad con listas ausentes u ocultas', () => {
  for (const listas of [undefined, null, {}]) {
    for (const [tipo, datos] of [['agente', agenteOk()], ['convocatoria', convOk()]]) {
      assert.deepStrictEqual(
        aJson(validarEnvio(tipo, datos, listas, APROBADOS)),
        aJson(gs.validarEnvio(tipo, datos, listas, APROBADOS)),
      );
    }
  }
});

test('paridad esInternacional: coincidencia exacta tras recortar', () => {
  for (const v of ['Internacional', ' Internacional ', 'internacional', 'Internacionales', '', null, undefined, 3, ['Internacional']]) {
    assert.equal(esInternacional(v), gs.esInternacional(v), JSON.stringify(v));
  }
});

test('casos concretos con mensajes esperados', () => {
  assert.deepStrictEqual(aJson(validarEnvio('agente', agenteOk(), LISTAS, APROBADOS)), {});
  assert.deepStrictEqual(aJson(validarEnvio('convocatoria', convOk(), LISTAS, APROBADOS)), {});
  assert.deepStrictEqual(aJson(validarEnvio('sugerencia', sugOk(), LISTAS, APROBADOS)), {});
  const e = validarEnvio('agente', {}, LISTAS, APROBADOS);
  assert.equal(e.nombre, 'Este campo es obligatorio.');
  assert.equal(e.consentimiento, 'Necesitamos tu consentimiento para guardar tu correo.');
  assert.equal(validarEnvio('agente', con(agenteOk, { descripcion: 'a'.repeat(281) }), LISTAS).descripcion, 'Máximo 280 caracteres.');
  assert.equal(validarEnvio('convocatoria', con(convOk, { anio: 1999 }), LISTAS, APROBADOS).anio, 'Revisa el año.');
  assert.equal(validarEnvio('agente', con(agenteOk, { presencia: 'Internacional', departamento: undefined }), LISTAS).departamento, undefined);
  assert.equal(validarEnvio('agente', con(agenteOk, { presencia: 'internacional', departamento: undefined }), LISTAS).departamento, 'Este campo es obligatorio.');
});
