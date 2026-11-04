import { esc, slug } from '../texto.js';
import { criteriosVacios, filtrarAgentes, ordenarAgentes, contarPorValor } from '../filtros.js';
import { escribirRuta } from '../rutas.js';
import { tarjetaAgente, chip, iconoDe } from './comunes.js';

// Orden del spec §4.3. grupo = clave de criterios, lista = catálogo en datos.listas, campo = propiedad del agente.
export const GRUPOS = [
  { grupo: 'ofrece', titulo: '¿Qué ofrece?', lista: 'ofrece', campo: 'ofrece', iconos: true },
  { grupo: 'sectores', titulo: 'Sector', lista: 'sectores', campo: 'sectores', iconos: true },
  { grupo: 'tipos', titulo: 'Tipo de entidad', lista: 'tiposEntidad', campo: 'tipoEntidad' },
  { grupo: 'departamentos', titulo: 'Departamento', lista: 'departamentos', campo: 'departamento', soloPeru: true },
  { grupo: 'presencia', titulo: 'Presencia', lista: 'presencia', campo: 'presencia', soloPeru: true },
];
const VISIBLES = 6;
// "Internacional" (sin sede en el Perú) solo existe en la capa Internacional (spec §3).
const PRESENCIA_SOLO_INTL = 'internacional';

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function gruposDe(capa) {
  return GRUPOS.filter((g) => capa === 'Perú' || !g.soloPeru);
}

// Ruta que resulta de quitar el último filtro: último valor del último grupo con selección; si no hay, la búsqueda.
function sinUltimo(c, grupos) {
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i].grupo;
    if (c[g].length) return { ...c, [g]: c[g].slice(0, -1) };
  }
  return c.q ? { ...c, q: '' } : null;
}

function opcion(g, valor, n, marcado) {
  const s = slug(valor);
  const id = `f-${g.grupo}-${s}`;
  return `<label class="opcion" for="${esc(id)}">`
    + `<input type="checkbox" id="${esc(id)}" name="${g.grupo}" value="${esc(s)}" data-filtro${marcado ? ' checked' : ''}>`
    + (g.iconos ? iconoDe(valor) : '')
    + `<span class="opcion__t">${esc(valor)}</span><span class="opcion__n">${n}</span></label>`;
}

export function grupoFiltro(g, valores, cuenta, sel) {
  const items = valores.map((v) => ({ v, html: opcion(g, v, cuenta.get(slug(v)) || 0, sel.includes(slug(v))) }));
  const primeros = items.slice(0, VISIBLES).map((x) => x.html).join('');
  const resto = items.slice(VISIBLES);
  let mas = '';
  if (resto.length) {
    const abierto = resto.some((x) => sel.includes(slug(x.v)));
    mas = `<details class="filtros__mas"${abierto ? ' open' : ''}><summary>`
      + `<span class="mas__abrir">Ver más (${resto.length})</span><span class="mas__cerrar">Ver menos</span></summary>`
      + resto.map((x) => x.html).join('') + '</details>';
  }
  return `<fieldset class="filtros__grupo"><legend>${esc(g.titulo)}</legend>${primeros}${mas}</fieldset>`;
}

// Hoja inferior (móvil): app.js mueve aquí el formulario [data-filtros] al abrirla.
export function hojaFiltros(n) {
  return `<dialog class="hoja" id="hoja-filtros" aria-labelledby="hoja-titulo">
    <div class="hoja__cabeza"><h2 id="hoja-titulo">Filtros</h2><button type="button" class="btn" data-cerrar-filtros>Cerrar</button></div>
    <div class="hoja__cuerpo" data-hueco-filtros></div>
    <div class="hoja__pie"><button type="button" class="btn btn--primario" data-cerrar-filtros data-zona="ver-resultados">Ver ${plural(n, 'resultado', 'resultados')}</button></div>
  </dialog>`;
}

export function renderExplorar(datos, ruta, capa) {
  const vista = capa === 'Internacional' ? 'internacional' : 'explorar';
  const grupos = gruposDe(capa);
  const c = { ...criteriosVacios(), ...ruta.criterios };
  if (capa !== 'Perú') { c.departamentos = []; c.presencia = []; }
  else c.presencia = c.presencia.filter((s) => s !== PRESENCIA_SOLO_INTL);
  const href = (crit) => escribirRuta({ ...ruta, vista, criterios: crit });

  const base = datos.agentes.filter((a) => (a.capa || 'Perú') === capa);
  const resultados = ordenarAgentes(filtrarAgentes(base, c), ruta.orden);
  const nActivos = grupos.reduce((s, g) => s + c[g.grupo].length, 0);

  const etiquetaDe = {};
  const lateral = grupos.map((g) => {
    let valores = datos.listas[g.lista] || [];
    if (g.grupo === 'presencia' && capa === 'Perú') valores = valores.filter((v) => slug(v) !== PRESENCIA_SOLO_INTL);
    etiquetaDe[g.grupo] = new Map(valores.map((v) => [slug(v), v]));
    return grupoFiltro(g, valores, contarPorValor(base, g.campo), c[g.grupo]);
  }).join('');

  const chips = [];
  if (c.q) chips.push(chip(`Búsqueda: ${c.q}`, { activo: true, quitarHref: href({ ...c, q: '' }) }));
  for (const g of grupos) {
    for (const s of c[g.grupo]) {
      const texto = etiquetaDe[g.grupo].get(s) || s;
      chips.push(chip(texto, { activo: true, quitarHref: href({ ...c, [g.grupo]: c[g.grupo].filter((x) => x !== s) }) }));
    }
  }
  const zonaChips = chips.length
    ? `<ul class="chips">${chips.map((x) => `<li>${x}</li>`).join('')}</ul>`
      + `<a class="enlace-limpiar" href="${esc(href(criteriosVacios()))}">Limpiar</a>`
    : '';

  let zonaResultados;
  if (resultados.length) {
    zonaResultados = `<ul class="cuadricula">${resultados.map((a) => `<li>${tarjetaAgente(a)}</li>`).join('')}</ul>`;
  } else {
    const anterior = sinUltimo(c, grupos);
    zonaResultados = `<div class="vacio"><p class="vacio__titulo">No hay agentes con estos filtros</p><div class="vacio__acciones">`
      + (anterior ? `<a class="btn" href="${esc(href(anterior))}">Quitar el último filtro</a>` : '')
      + '<button type="button" class="btn btn--primario" data-anadir>Añadir un agente</button></div></div>';
  }

  const titulo = capa === 'Internacional' ? 'INTERNACIONAL' : 'EXPLORAR';
  const aviso = capa === 'Internacional'
    ? '<p class="aviso-intl"><span class="caja-negra">Oportunidades abiertas a postulantes desde el Perú</span></p>'
    : '';
  const orden = (v, t) => `<option value="${v}"${ruta.orden === v ? ' selected' : ''}>${t}</option>`;

  return `<section class="explorar" aria-labelledby="explorar-titulo">
  <h1 id="explorar-titulo">${titulo}</h1>
  ${aviso}
  <div class="explorar__cuerpo">
    <aside class="explorar__lateral" aria-label="Filtros" data-lateral>
      <form class="filtros" id="form-filtros" data-filtros>${lateral}</form>
    </aside>
    <div class="explorar__principal">
      <form class="buscador buscador--compacto" role="search" data-buscar data-vista="${vista}">
        <label for="q-explorar">Buscar por nombre, descripción o ciudad</label>
        <div class="buscador__fila">
          <input id="q-explorar" name="q" type="search" autocomplete="off" value="${esc(c.q)}">
          <button class="btn" type="submit">Buscar</button>
        </div>
      </form>
      <div class="explorar__barra">
        <button type="button" class="btn btn-filtros" data-abrir-filtros aria-haspopup="dialog" data-zona="boton-filtros">Filtros (${nActivos})</button>
        <p class="contador" id="contador" data-zona="contador" aria-live="polite" tabindex="-1">${plural(resultados.length, 'agente', 'agentes')}</p>
        <div class="orden">
          <label for="orden">Ordenar</label>
          <select id="orden" name="orden" data-orden>${orden('az', 'A–Z')}${orden('recientes', 'Más recientes')}</select>
        </div>
      </div>
      <div class="explorar__chips" data-zona="chips">${zonaChips}</div>
      <div data-zona="resultados">${zonaResultados}</div>
    </div>
  </div>
  ${hojaFiltros(resultados.length)}
</section>`;
}
