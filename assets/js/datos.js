import { CLAVE_DATOS } from './config.js';

const CATALOGOS = ['ofrece', 'sectores', 'tiposEntidad', 'presencia', 'departamentos', 'tiposConvocatoria'];

export function esDatosValidos(d) {
  if (!d || typeof d !== 'object') return false;
  const l = d.listas;
  if (!l || typeof l !== 'object') return false;
  return CATALOGOS.every(k => Array.isArray(l[k])) && Array.isArray(d.agentes) && Array.isArray(d.convocatorias);
}

function leerCopia(almacen) {
  try {
    const crudo = almacen.getItem(CLAVE_DATOS);
    if (!crudo) return null;
    const d = JSON.parse(crudo);
    return esDatosValidos(d) ? d : null;
  } catch { return null; }
}

function guardarCopia(almacen, datos) {
  try { almacen.setItem(CLAVE_DATOS, JSON.stringify(datos)); } catch { /* sin espacio o bloqueado */ }
}

export async function cargarDatos({ url, fetchFn = globalThis.fetch, almacen = globalThis.localStorage, alGuardado, tiempoLimiteMs = 20000 } = {}) {
  const copia = almacen ? leerCopia(almacen) : null;
  if (copia && alGuardado) { try { alGuardado(copia); } catch { /* el aviso no debe romper la carga */ } }
  try {
    const resp = await fetchFn(url + '?accion=datos', (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(tiempoLimiteMs) } : {}));
    if (!resp || !resp.ok) throw new Error('respuesta no ok');
    const datos = await resp.json();
    if (!esDatosValidos(datos)) throw new Error('forma inválida');
    if (almacen) guardarCopia(almacen, datos);
    return { datos, origen: 'red' };
  } catch {
    return copia ? { datos: copia, origen: 'local' } : { datos: null, origen: 'ninguno' };
  }
}
