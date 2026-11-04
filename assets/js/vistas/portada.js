import { esc, slug } from '../texto.js';
import { criteriosVacios } from '../filtros.js';
import { escribirRuta } from '../rutas.js';
import { hoyLima, estadoConvocatoria } from '../convocatorias.js';
import { chip, iconoDe } from './comunes.js';

const rutaExplorar = (cambios) => escribirRuta({ vista: 'explorar', criterios: { ...criteriosVacios(), ...cambios }, orden: 'az' });

export function renderPortada(datos, hoy = hoyLima()) {
  const peru = datos.agentes.filter((a) => (a.capa || 'Perú') === 'Perú');
  const abiertas = datos.convocatorias.filter((c) => estadoConvocatoria(c, hoy).estado === 'abierta').length;
  const departamentos = new Set(peru.map((a) => String(a.departamento ?? '').trim()).filter(Boolean)).size;
  const chips = datos.listas.ofrece
    .map((o) => `<li>${chip(o, { href: rutaExplorar({ ofrece: [slug(o)] }), iconoHtml: iconoDe(o) })}</li>`)
    .join('');
  const contador = (n, texto) => `<li><span class="contadores__n">${esc(n)}</span><span class="contadores__t">${texto}</span></li>`;
  return `<section class="portada" aria-labelledby="portada-titulo">
  <h1 class="portada__titulo" id="portada-titulo">CHICHA</h1>
  <p class="portada__sub">Mapa de emprendimiento</p>
  <p class="portada__bajada"><span class="caja-negra">AGENTES para el arte, la cultura y la educación en el Perú</span></p>
  <form class="buscador" role="search" data-buscar data-vista="explorar">
    <label for="q-portada">Busca por nombre, descripción o ciudad</label>
    <div class="buscador__fila">
      <input id="q-portada" name="q" type="search" autocomplete="off">
      <button class="btn btn--primario" type="submit">Buscar</button>
    </div>
  </form>
  <h2 class="portada__pregunta">¿Qué estás buscando?</h2>
  <ul class="chips chips--accesos">${chips}</ul>
  <ul class="contadores">
    ${contador(peru.length, 'Agentes')}
    ${contador(abiertas, 'Convocatorias abiertas')}
    ${contador(departamentos, 'Departamentos cubiertos')}
  </ul>
</section>`;
}
