import { criteriosVacios } from './filtros.js';

const VISTAS = ['portada', 'explorar', 'internacional', 'convocatorias', 'sobre', 'agente'];
const GRUPOS = [['ofrece', 'ofrece'], ['sec', 'sectores'], ['tipo', 'tipos'], ['dep', 'departamentos'], ['pres', 'presencia']];

function decodificar(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function lista(v) {
  return v.split(',').map(decodificar).filter(Boolean);
}

export function leerRuta(hash) {
  const texto = String(hash || '').replace(/^#/, '');
  const [ruta, consulta = ''] = texto.split('?');
  const segs = ruta.split('/').filter(Boolean);
  const vista = VISTAS.includes(segs[0]) ? segs[0] : 'portada';
  const params = {};
  for (const par of consulta.split('&')) {
    if (!par) continue;
    const i = par.indexOf('=');
    const k = i < 0 ? par : par.slice(0, i);
    const v = i < 0 ? '' : par.slice(i + 1);
    params[k] = v;
  }
  const criterios = criteriosVacios();
  if (params.q !== undefined) criterios.q = decodificar(params.q.replace(/\+/g, ' '));
  for (const [p, g] of GRUPOS) if (params[p]) criterios[g] = lista(params[p]);
  const anio = /^\d{4}$/.test(params.anio || '') ? Number(params.anio) : null;
  return {
    vista,
    criterios,
    orden: params.orden === 'recientes' ? 'recientes' : 'az',
    id: vista === 'agente' && segs[1] ? decodificar(segs[1]) : null,
    anio,
    soloAbiertas: params.abiertas === '1',
    incluirInternacional: params.intl !== '0',
  };
}

export function escribirRuta(r) {
  if (r.vista === 'portada') return '#/';
  if (r.vista === 'sobre') return '#/sobre';
  if (r.vista === 'agente') return `#/agente/${encodeURIComponent(r.id || '')}`;
  const c = r.criterios || criteriosVacios();
  const ps = [];
  if (c.q) ps.push(`q=${encodeURIComponent(c.q)}`);
  for (const [p, g] of GRUPOS) {
    if (c[g] && c[g].length) ps.push(`${p}=${c[g].map(encodeURIComponent).join(',')}`);
  }
  if (r.orden && r.orden !== 'az') ps.push(`orden=${r.orden}`);
  if (r.vista === 'convocatorias') {
    if (r.anio) ps.push(`anio=${r.anio}`);
    if (r.soloAbiertas) ps.push('abiertas=1');
    if (r.incluirInternacional === false) ps.push('intl=0');
  }
  return `#/${r.vista}${ps.length ? '?' + ps.join('&') : ''}`;
}

export function limpiarSlugs(c, validos) {
  const out = { ...c };
  for (const g of Object.keys(validos)) {
    out[g] = (c[g] || []).filter((s) => validos[g].has(s));
  }
  return out;
}
