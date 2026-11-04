import { normalizar, slug, separarMulti } from './texto.js';

const CAMPO_GRUPO = { ofrece: 'ofrece', sectores: 'sectores', tipos: 'tipoEntidad', departamentos: 'departamento', presencia: 'presencia' };

export function criteriosVacios() {
  return { q: '', ofrece: [], sectores: [], tipos: [], departamentos: [], presencia: [] };
}

function valoresSlug(agente, campo) {
  return separarMulti(agente[campo]).map(slug);
}

export function filtrarAgentes(agentes, c) {
  const palabras = normalizar(c.q).split(' ').filter(Boolean);
  return agentes.filter((a) => {
    for (const [grupo, campo] of Object.entries(CAMPO_GRUPO)) {
      const sel = c[grupo] || [];
      if (sel.length === 0) continue;
      const vals = valoresSlug(a, campo);
      if (!sel.some((s) => vals.includes(s))) return false;
    }
    if (palabras.length) {
      const texto = normalizar([a.nombre, a.descripcion, a.ciudad, a.departamento].join(' '));
      if (!palabras.every((p) => texto.includes(p))) return false;
    }
    return true;
  });
}

export function ordenarAgentes(agentes, modo) {
  const copia = [...agentes];
  if (modo === 'recientes') {
    return copia.sort((x, y) => {
      if (!x.fechaAprobacion && !y.fechaAprobacion) return 0;
      if (!x.fechaAprobacion) return 1;
      if (!y.fechaAprobacion) return -1;
      return y.fechaAprobacion < x.fechaAprobacion ? -1 : y.fechaAprobacion > x.fechaAprobacion ? 1 : 0;
    });
  }
  return copia.sort((x, y) => String(x.nombre ?? '').localeCompare(String(y.nombre ?? ''), 'es'));
}

export function contarPorValor(agentes, campo) {
  const cuenta = new Map();
  for (const a of agentes) {
    for (const s of new Set(valoresSlug(a, campo))) {
      if (s) cuenta.set(s, (cuenta.get(s) || 0) + 1);
    }
  }
  return cuenta;
}
