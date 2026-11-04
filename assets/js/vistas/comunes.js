import { esc, slug, separarMulti } from '../texto.js';
import { estadoConvocatoria, MESES } from '../convocatorias.js';
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

export function mayusculaInicial(s) {
  const t = String(s ?? '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// La url debe venir ya validada con urlSegura.
export function enlaceExterno(url, contenidoHtml, clase = '') {
  return `<a${clase ? ` class="${clase}"` : ''} href="${esc(url)}" target="_blank" rel="noopener">${contenidoHtml}`
    + '<span class="solo-lector"> (se abre en una pestaña nueva)</span></a>';
}

function textoEstado({ estado, diasParaCierre: n }) {
  if (estado === 'proxima') return 'Próxima';
  if (estado === 'cerrada') return 'Cerrada';
  if (n === null) return 'Abierta';
  if (n === 0) return 'Abierta · cierra hoy';
  return `Abierta · cierra en ${n === 1 ? '1 día' : `${n} días`}`;
}

export function insigniaEstado(c, hoy) {
  const e = estadoConvocatoria(c, hoy);
  const urgente = e.estado === 'abierta' && e.diasParaCierre !== null;
  return `<span class="insignia insignia--${e.estado}${urgente ? ' insignia--urgente' : ''}">${esc(textoEstado(e))}</span>`;
}

// Fecha que importa según el estado: la apertura si está próxima; si no, el cierre.
export function fechaClave(c, hoy) {
  const { estado } = estadoConvocatoria(c, hoy);
  if (estado === 'proxima') return { etiqueta: 'Abre', fecha: c.fechaApertura };
  return { etiqueta: estado === 'cerrada' ? 'Cerró' : 'Cierra', fecha: c.fechaCierre };
}

export function partesFecha(iso) {
  const [, m, d] = String(iso).split('-').map(Number);
  const mes = MESES[m - 1] || '';
  return { dia: d, mes: mes.toLowerCase() };
}

// Descripción, monto y fecha de resultados, cada uno solo si existe.
export function detallesConvocatoria(c, clase) {
  const parrafo = (html) => `<p class="${clase}">${html}</p>`;
  const descripcion = String(c.descripcion ?? '').trim();
  const monto = String(c.monto ?? '').trim();
  let html = '';
  if (descripcion) html += parrafo(esc(descripcion));
  if (monto) html += parrafo(`Monto: ${esc(monto)}`);
  if (c.fechaResultados) {
    const { dia, mes } = partesFecha(c.fechaResultados);
    const anio = String(c.fechaResultados).slice(0, 4);
    html += parrafo(`Resultados: <time datetime="${esc(c.fechaResultados)}">${esc(dia)} de ${esc(mes)} de ${esc(anio)}</time>`);
  }
  return html;
}
