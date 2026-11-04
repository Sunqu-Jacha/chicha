// Validación de envíos en el navegador. Mismas reglas y mensajes que `validarEnvio` de apps-script/Logica.gs
// (Apps Script no puede importar este módulo): la paridad se verifica en tests/validacion.test.js.

const OBLIGATORIO = 'Este campo es obligatorio.';
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_URL = /^https?:\/\//;
const MAX_TEXTO = 2000;
export const MAX_DESCRIPCION = 280;

// Presencia "Internacional" (sin sede en el Perú): capa Internacional, sin departamento.
export function esInternacional(presencia) {
  return typeof presencia === 'string' && presencia.trim() === 'Internacional';
}

export function esFechaIso(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

function ausente(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

export function validarEnvio(tipo, datos, listas, idsAprobados) {
  const e = {};
  const d = (datos && typeof datos === 'object' && !Array.isArray(datos)) ? datos : {};
  const L = listas || {};

  // Texto escalar: debe ser string. Devuelve el string recortado, o null si falta o es inválido (ya anotó el error).
  function texto(campo, requerido, max) {
    const v = d[campo];
    if (ausente(v)) { if (requerido) e[campo] = OBLIGATORIO; return null; }
    if (typeof v !== 'string') { e[campo] = 'Revisa este campo.'; return null; }
    const s = v.trim();
    const tope = max || MAX_TEXTO;
    if (s.length > tope) { e[campo] = `Máximo ${tope} caracteres.`; return null; }
    return s;
  }
  function opcionUnica(campo, lista, requerido) {
    const v = d[campo];
    if (ausente(v)) { if (requerido) e[campo] = OBLIGATORIO; return; }
    if (typeof v !== 'string' || (lista || []).indexOf(v.trim()) === -1) e[campo] = 'Elige una opción de la lista.';
  }
  function opcionMultiple(campo, lista, requerido) {
    const v = d[campo];
    if (ausente(v) || (Array.isArray(v) && v.length === 0)) { if (requerido) e[campo] = OBLIGATORIO; return; }
    const validos = lista || [];
    const ok = Array.isArray(v) && v.every((x) => typeof x === 'string' && validos.indexOf(x.trim()) !== -1);
    if (!ok) e[campo] = 'Elige una opción de la lista.';
  }
  function correoCampo(campo, requerido) {
    const s = texto(campo, requerido);
    if (s !== null && !RE_CORREO.test(s)) e[campo] = 'Revisa el correo.';
  }
  function urlCampo(campo, requerido) {
    const s = texto(campo, requerido);
    if (s !== null && !RE_URL.test(s)) e[campo] = 'El enlace debe empezar con http:// o https://.';
  }
  function fechaCampo(campo, requerido) {
    const s = texto(campo, requerido);
    if (s !== null && !esFechaIso(s)) e[campo] = 'Usa el formato AAAA-MM-DD.';
  }
  function anioCampo(campo) {
    const v = d[campo];
    if (ausente(v)) { e[campo] = OBLIGATORIO; return; }
    const ok = (typeof v === 'number' || (typeof v === 'string' && /^\d{4}$/.test(v.trim())))
      && Number.isInteger(Number(v)) && Number(v) >= 2000 && Number(v) <= 2100;
    if (!ok) e[campo] = 'Revisa el año.';
  }
  function consentimiento() {
    if (d.consentimiento !== true) e.consentimiento = 'Necesitamos tu consentimiento para guardar tu correo.';
  }

  if (tipo === 'agente') {
    texto('nombre', true);
    opcionMultiple('ofrece', L.ofrece, true);
    opcionMultiple('sectores', L.sectores, true);
    opcionUnica('tipo_entidad', L.tiposEntidad, true);
    opcionUnica('presencia', L.presencia, true);
    // Las entidades internacionales no tienen departamento del Perú.
    const internacional = esInternacional(d.presencia);
    opcionUnica('departamento', L.departamentos, !internacional);
    texto('ciudad', true);
    texto('pais', false);
    texto('direccion', false);
    texto('otras_redes', false);
    texto('descripcion', true, MAX_DESCRIPCION);
    urlCampo('web', false); urlCampo('instagram', false); urlCampo('facebook', false); urlCampo('logo_url', false);
    correoCampo('email_publico', false);
    texto('nombre_proponente', true);
    correoCampo('email_proponente', true);
    consentimiento();
  } else if (tipo === 'convocatoria') {
    const ag = texto('agente_id', true);
    if (ag !== null && !(idsAprobados && idsAprobados.has(ag))) e.agente_id = 'Elige un agente publicado.';
    texto('titulo', true);
    anioCampo('anio');
    opcionUnica('tipo', L.tiposConvocatoria, true);
    opcionMultiple('ofrece', L.ofrece, false);
    opcionMultiple('sectores', L.sectores, false);
    texto('descripcion', false, MAX_DESCRIPCION);
    texto('monto', false);
    urlCampo('enlace_bases', true);
    fechaCampo('fecha_apertura', false);
    fechaCampo('fecha_cierre', true);
    fechaCampo('fecha_resultados', false);
    texto('nombre_proponente', true);
    correoCampo('email_proponente', true);
    consentimiento();
  } else if (tipo === 'sugerencia') {
    opcionUnica('tipo_registro', ['agente', 'convocatoria'], true);
    texto('registro_id', true);
    texto('campo', true);
    texto('valor_propuesto', true);
    texto('fuente', false);
    correoCampo('email_proponente', true);
    consentimiento();
  } else {
    e.tipo = 'Elige una opción de la lista.';
  }
  return e;
}
