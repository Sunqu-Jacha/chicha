import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  tipoDeRegistro, resolverAgenteId, armarDatos, leerBorrador, guardarBorrador, borrarBorrador, htmlFormulario,
} from '../assets/js/vistas/formulario.js';
import { validarEnvio } from '../assets/js/validacion.js';
import { CLAVE_BORRADOR } from '../assets/js/config.js';

const ejemplo = JSON.parse(readFileSync(new URL('../assets/datos-ejemplo.json', import.meta.url), 'utf8'));

function almacenFalso() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('tipoDeRegistro deriva el tipo del prefijo del id', () => {
  assert.equal(tipoDeRegistro('ag-ej01'), 'agente');
  assert.equal(tipoDeRegistro('cv-a91f'), 'convocatoria');
  assert.equal(tipoDeRegistro('xx-1'), '');
  assert.equal(tipoDeRegistro(undefined), '');
  assert.equal(tipoDeRegistro('ag'), '');
});

test('resolverAgenteId acepta nombre, id o texto libre', () => {
  const ags = [{ id: 'ag-1', nombre: 'Casa Andina', ciudad: 'Cusco' }, { id: 'ag-2', nombre: 'Casa Andina', ciudad: 'Lima' }, { id: 'ag-3', nombre: 'Taller Sur', ciudad: 'Puno' }];
  assert.equal(resolverAgenteId('Taller Sur', ags), 'ag-3');
  assert.equal(resolverAgenteId('  taller sur ', ags), 'ag-3');
  assert.equal(resolverAgenteId('ag-2', ags), 'ag-2');
  assert.equal(resolverAgenteId('Casa Andina (Lima)', ags), 'ag-2');
  assert.equal(resolverAgenteId('Casa Andina', ags), 'Casa Andina'); // ambiguo: no se adivina
  assert.equal(resolverAgenteId('Nadie', ags), 'Nadie');
});

test('armarDatos: nombres de columna, arrays, booleano y año numérico', () => {
  const d = armarDatos('convocatoria', {
    agente_id: 'Taller Sur', titulo: ' Fondo ', anio: '2027', tipo: 'fondo', ofrece: ['Formación'], sectores: [],
    monto: '', consentimiento: true, sitio_web_2: '',
  }, { agentes: [{ id: 'ag-3', nombre: 'Taller Sur', ciudad: 'Puno' }] });
  assert.deepStrictEqual(d, { agente_id: 'ag-3', titulo: 'Fondo', anio: 2027, tipo: 'fondo', ofrece: ['Formación'], consentimiento: true });
});

test('armarDatos: consentimiento siempre es booleano', () => {
  assert.equal(armarDatos('agente', {}).consentimiento, false);
  assert.equal(armarDatos('agente', { consentimiento: 'on' }).consentimiento, false);
  assert.equal(armarDatos('agente', { consentimiento: true }).consentimiento, true);
});

test('armarDatos agente: Internacional descarta departamento y conserva país; Perú descarta país', () => {
  const intl = armarDatos('agente', { presencia: 'Internacional', departamento: 'Cusco', pais: 'Chile' });
  assert.equal(intl.departamento, undefined);
  assert.equal(intl.pais, 'Chile');
  const pe = armarDatos('agente', { presencia: 'Peruana', departamento: 'Cusco', pais: 'Chile' });
  assert.equal(pe.departamento, 'Cusco');
  assert.equal(pe.pais, undefined);
});

test('armarDatos sugerencia: tipo_registro y registro_id salen del id', () => {
  const d = armarDatos('sugerencia', { campo: 'Web', valor_propuesto: 'https://x.pe', consentimiento: true }, { registroId: 'cv-a91f' });
  assert.equal(d.tipo_registro, 'convocatoria');
  assert.equal(d.registro_id, 'cv-a91f');
  const mal = armarDatos('sugerencia', {}, { registroId: 'zz-1' });
  assert.equal(mal.tipo_registro, '');
  assert.ok(validarEnvio('sugerencia', mal, ejemplo.listas, new Set()).tipo_registro);
});

test('armarDatos conserva el campo trampa cuando viene lleno', () => {
  assert.equal(armarDatos('agente', { sitio_web_2: 'spam.com' }).sitio_web_2, 'spam.com');
  assert.equal(armarDatos('agente', { sitio_web_2: '' }).sitio_web_2, undefined);
});

test('borrador: por modo, sin consentimiento ni campo trampa, y se borra', () => {
  const al = almacenFalso();
  guardarBorrador(al, 'agente', { nombre: 'Casa', ofrece: ['Formación'], consentimiento: true, sitio_web_2: 'x' });
  guardarBorrador(al, 'convocatoria', { titulo: 'Fondo' });
  assert.deepStrictEqual(leerBorrador(al, 'agente'), { nombre: 'Casa', ofrece: ['Formación'] });
  assert.deepStrictEqual(leerBorrador(al, 'convocatoria'), { titulo: 'Fondo' });
  assert.ok(!al.getItem(CLAVE_BORRADOR).includes('consentimiento'));
  assert.ok(!al.getItem(CLAVE_BORRADOR).includes('sitio_web_2'));
  borrarBorrador(al, 'agente');
  assert.equal(leerBorrador(al, 'agente'), null);
  assert.deepStrictEqual(leerBorrador(al, 'convocatoria'), { titulo: 'Fondo' });
});

test('borrador de sugerencia solo se restaura para el mismo registro', () => {
  const al = almacenFalso();
  guardarBorrador(al, 'sugerencia', { valor_propuesto: 'x' }, 'ag-1');
  assert.deepStrictEqual(leerBorrador(al, 'sugerencia', 'ag-1'), { valor_propuesto: 'x' });
  assert.equal(leerBorrador(al, 'sugerencia', 'ag-2'), null);
});

test('borrador tolera almacén roto o ausente', () => {
  assert.equal(leerBorrador(null, 'agente'), null);
  guardarBorrador(null, 'agente', { a: 1 });
  borrarBorrador(null, 'agente');
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); }, removeItem: () => { throw new Error('x'); } };
  assert.equal(leerBorrador(roto, 'agente'), null);
  guardarBorrador(roto, 'agente', { a: 1 });
  borrarBorrador(roto, 'agente');
  const basura = { getItem: () => '{no json', setItem() {}, removeItem() {} };
  assert.equal(leerBorrador(basura, 'agente'), null);
});

test('htmlFormulario elegir: dos opciones', () => {
  const h = htmlFormulario('elegir', ejemplo);
  assert.ok(h.includes('¿Qué quieres sumar?'));
  assert.ok(h.includes('data-modo="agente"') && h.includes('data-modo="convocatoria"'));
});

test('htmlFormulario agente: etiquetas visibles, trampa, contador, multivalores como casillas', () => {
  const h = htmlFormulario('agente', ejemplo);
  assert.ok(h.includes('<label for="f-nombre"'));
  assert.ok(h.includes('name="sitio_web_2"') && h.includes('tabindex="-1"') && h.includes('autocomplete="off"'));
  assert.ok(h.includes('0/280'));
  assert.ok(h.includes('type="checkbox" name="ofrece"') && h.includes('type="checkbox" name="sectores"'));
  assert.ok(h.includes('name="consentimiento"'));
  assert.ok(h.includes('Enviar para revisión'));
  assert.ok(h.includes('data-campo="pais" hidden'));
  for (const n of ['nombre', 'tipo_entidad', 'presencia', 'departamento', 'ciudad', 'descripcion', 'nombre_proponente', 'email_proponente']) {
    assert.ok(h.includes(`id="err-${n}"`), n);
    assert.ok(h.includes(`aria-describedby="`), n);
  }
});

test('htmlFormulario convocatoria: agente_id con datalist de agentes publicados y salida a añadir agente', () => {
  const h = htmlFormulario('convocatoria', ejemplo);
  assert.ok(h.includes('<input list="lista-agentes"'));
  assert.ok(h.includes('<datalist id="lista-agentes">'));
  assert.ok(h.includes(ejemplo.agentes[0].nombre));
  assert.ok(h.includes('¿No está? Añade el agente primero'));
  assert.ok(h.includes('name="anio"'));
});

test('htmlFormulario sugerencia: campos propios, muestra a qué registro se refiere y escapa', () => {
  const datos = { ...ejemplo, agentes: [{ ...ejemplo.agentes[0], id: 'ag-x', nombre: '<b>Mala</b>' }] };
  const h = htmlFormulario('sugerencia', datos, 'ag-x');
  assert.ok(!h.includes('<b>Mala</b>'));
  assert.ok(h.includes('&lt;b&gt;Mala&lt;/b&gt;'));
  assert.ok(h.includes('name="valor_propuesto"') && h.includes('name="fuente"') && h.includes('name="campo"'));
});

test('htmlFormulario escapa nombres de agentes en el datalist', () => {
  const datos = { ...ejemplo, agentes: [{ id: 'ag-x', nombre: '"><script>1</script>', ciudad: 'X' }] };
  const h = htmlFormulario('convocatoria', datos);
  assert.ok(!h.includes('<script>'));
});
