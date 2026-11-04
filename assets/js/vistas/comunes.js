import { esc, slug, separarMulti } from '../texto.js';
import { icono, ICONO_POR_SLUG } from '../iconos.js';

// Ícono decorativo para un valor de taxonomía ('' si no tiene).
export function iconoDe(valor) {
  const nombre = ICONO_POR_SLUG[slug(valor)];
  return nombre ? icono(nombre) : '';
}

export function tarjetaAgente(a) {
  const sectores = separarMulti(a.sectores);
  const franja = sectores.length ? `var(--sector-${slug(sectores[0])}, var(--negro))` : 'var(--negro)';
  const meta = [a.tipoEntidad, a.ciudad].map((v) => String(v ?? '').trim()).filter(Boolean).map(esc).join(' · ');
  const etiquetas = separarMulti(a.ofrece)
    .map((o) => `<li class="etiqueta">${iconoDe(o)}<span>${esc(o)}</span></li>`)
    .join('');
  return `<a class="tarjeta" href="#/agente/${esc(encodeURIComponent(a.id ?? ''))}" style="--franja: ${franja}">`
    + `<span class="tarjeta__cabeza"><span class="tarjeta__nombre">${esc(a.nombre)}</span>`
    + (a.verificado === true ? '<span class="sello">Verificado</span>' : '')
    + '</span>'
    + (meta ? `<span class="tarjeta__meta">${meta}</span>` : '')
    + (etiquetas ? `<ul class="etiquetas">${etiquetas}</ul>` : '')
    + '</a>';
}

// Chip de texto. Con quitarHref es un enlace que quita el filtro; con href, un acceso directo.
export function chip(texto, { activo = false, quitarHref = null, href = null, iconoHtml = '' } = {}) {
  const clase = `chip${activo ? ' chip--activo' : ''}`;
  if (quitarHref) {
    return `<a class="${clase}" href="${esc(quitarHref)}" aria-label="Quitar filtro: ${esc(texto)}">`
      + `<span>${esc(texto)}</span><span class="chip__x" aria-hidden="true">×</span></a>`;
  }
  if (href) return `<a class="${clase}" href="${esc(href)}">${iconoHtml}<span>${esc(texto)}</span></a>`;
  return `<span class="${clase}">${iconoHtml}<span>${esc(texto)}</span></span>`;
}
