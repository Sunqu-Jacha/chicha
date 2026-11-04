export function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function slug(s) {
  return normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

export function separarMulti(v) {
  if (v === null || v === undefined) return [];
  const partes = Array.isArray(v) ? v : String(v).split(';');
  return partes.map((p) => String(p).trim()).filter(Boolean);
}

const CORREO = /^[^\s@<>"'()\:;,/?&=#]+@[^\s@<>"'()\:;,/?&=#]+\.[^\s@<>"'()\:;,/?&=#]+$/;

// Lista blanca de esquemas para todo href/src venido de la hoja: http(s) y, solo si se pide, mailto.
export function urlSegura(u, { mailto = false } = {}) {
  if (typeof u !== 'string') return null;
  const texto = u.trim();
  if (!texto) return null;
  if (mailto) {
    const correo = texto.replace(/^mailto:/i, '');
    if (CORREO.test(correo)) return `mailto:${correo}`;
  }
  try {
    const url = new URL(texto);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}
