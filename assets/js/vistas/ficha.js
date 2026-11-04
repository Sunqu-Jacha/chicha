import { esc, slug, separarMulti, urlSegura } from '../texto.js';
import { iconoDe, enlaceExterno, insigniaEstado, fechaClave, partesFecha } from './comunes.js';

const PALABRAS_MENORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'para']);

function iniciales(nombre) {
  return String(nombre ?? '').split(/\s+/)
    .filter((p) => p && !PALABRAS_MENORES.has(p.toLowerCase()))
    .map((p) => (p.match(/[\p{L}\p{N}]/u) || [''])[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function logo(a) {
  const url = urlSegura(a.logoUrl);
  if (url) return `<img src="${esc(url)}" class="ficha__logo" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  return `<span class="ficha__logo ficha__logo--iniciales" aria-hidden="true">${esc(iniciales(a.nombre))}</span>`;
}

function ubicacion(a) {
  const pais = String(a.pais ?? '').trim();
  const partes = [a.direccion, a.ciudad, a.departamento, pais === 'Perú' ? '' : pais]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean);
  return partes.filter((v, i) => v !== partes[i - 1]).map(esc).join(', ');
}

function dominio(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function enlaces(a) {
  const items = [];
  const externo = (valor, texto) => {
    const url = urlSegura(valor);
    if (url) items.push(enlaceExterno(url, esc(texto ?? dominio(url))));
  };
  externo(a.web, 'Sitio web');
  externo(a.instagram, 'Instagram');
  externo(a.facebook, 'Facebook');
  for (const red of separarMulti(a.otrasRedes)) externo(red);
  const correo = urlSegura(a.emailPublico, { mailto: true });
  if (correo && correo.startsWith('mailto:')) items.push(`<a href="${esc(correo)}">${esc(correo.slice(7))}</a>`);
  if (!items.length) return '';
  return `<section class="ficha__seccion"><h3>Contacto</h3><ul class="ficha__enlaces">${items.map((x) => `<li>${x}</li>`).join('')}</ul></section>`;
}

function etiquetas(a) {
  const ofrece = separarMulti(a.ofrece).map((o) => `<li class="etiqueta">${iconoDe(o)}<span>${esc(o)}</span></li>`);
  const sectores = separarMulti(a.sectores).map((v) => {
    const s = slug(v);
    return `<li class="etiqueta etiqueta--sector" style="--tono-claro: var(--sector-${s}-claro, var(--gris-fondo)); --tono-oscuro: var(--sector-${s}-oscuro, var(--negro))">${iconoDe(v)}<span>${esc(v)}</span></li>`;
  });
  const todas = [...ofrece, ...sectores];
  return todas.length ? `<ul class="etiquetas">${todas.join('')}</ul>` : '';
}

function convocatoria(c, hoy) {
  const { etiqueta, fecha } = fechaClave(c, hoy);
  const { dia, mes } = partesFecha(fecha);
  const bases = urlSegura(c.enlaceBases);
  return '<li class="ficha__conv">'
    + `<p class="ficha__conv-titulo">${esc(c.titulo)}</p>`
    + `<p class="ficha__conv-meta">${insigniaEstado(c, hoy)} <time datetime="${esc(fecha)}">${etiqueta} el ${esc(dia)} de ${esc(mes)}</time></p>`
    + (bases ? `<p class="ficha__conv-bases">${enlaceExterno(bases, `Ver bases<span class="solo-lector">: ${esc(c.titulo)}</span>`)}</p>` : '')
    + '</li>';
}

function convocatoriasDelAnio(a, lista, hoy) {
  const anio = Number(hoy.slice(0, 4));
  const propias = lista
    .filter((c) => c.agenteId === a.id && c.anio === anio)
    .sort((x, y) => String(x.fechaCierre).localeCompare(String(y.fechaCierre)));
  const cuerpo = propias.length
    ? `<ul class="ficha__convs">${propias.map((c) => convocatoria(c, hoy)).join('')}</ul>`
    : `<p class="ficha__nota">Sin convocatorias registradas en ${anio}.</p>`;
  return `<section class="ficha__seccion"><h3>Convocatorias ${anio}</h3>${cuerpo}</section>`;
}

const BOTON_CERRAR = '<button type="button" class="btn ficha__cerrar" data-cerrar-ficha>Cerrar</button>';

export function renderFicha(a, convocatorias, hoy) {
  if (!a) {
    return '<dialog class="ficha" aria-labelledby="ficha-titulo"><div class="ficha__panel">'
      + BOTON_CERRAR
      + '<h2 id="ficha-titulo" class="ficha__nombre">Este agente ya no está disponible</h2>'
      + '<p><a class="btn" href="#/explorar">Volver a explorar</a></p>'
      + '</div></dialog>';
  }
  const sectores = separarMulti(a.sectores);
  const franja = sectores.length ? `var(--sector-${slug(sectores[0])}, var(--negro))` : 'var(--negro)';
  const donde = ubicacion(a);
  return `<dialog class="ficha" aria-labelledby="ficha-titulo"><div class="ficha__panel" style="--franja: ${franja}">`
    + BOTON_CERRAR
    + `<div class="ficha__cabeza">${logo(a)}<div class="ficha__identidad">`
    + `<h2 id="ficha-titulo" class="ficha__nombre">${esc(a.nombre)}</h2>`
    + (a.verificado === true ? '<span class="sello">Verificado</span>' : '')
    + '</div></div>'
    + (a.tipoEntidad ? `<p class="ficha__tipo">${esc(a.tipoEntidad)}</p>` : '')
    + (donde ? `<p class="ficha__ubicacion">${donde}</p>` : '')
    + (a.descripcion ? `<p>${esc(a.descripcion)}</p>` : '')
    + etiquetas(a)
    + enlaces(a)
    + convocatoriasDelAnio(a, convocatorias, hoy)
    + `<p class="ficha__sugerir"><button type="button" class="btn" data-sugerir data-registro="${esc(a.id)}">Sugerir un cambio</button></p>`
    + '</div></dialog>';
}
