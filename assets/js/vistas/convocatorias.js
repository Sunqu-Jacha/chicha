import { esc, slug, urlSegura } from '../texto.js';
import { criteriosVacios, contarPorValor } from '../filtros.js';
import { escribirRuta } from '../rutas.js';
import { filtrarConvocatorias, agruparPorMes, aniosDisponibles } from '../convocatorias.js';
import { enlaceExterno, insigniaEstado, fechaClave, partesFecha, mayusculaInicial, detallesConvocatoria } from './comunes.js';
import { grupoFiltro, hojaFiltros, plural } from './explorar.js';

const GRUPOS_CONV = [
  { grupo: 'sectores', titulo: 'Sector', lista: 'sectores', campo: 'sectores', iconos: true },
  { grupo: 'ofrece', titulo: '¿Qué ofrece?', lista: 'ofrece', campo: 'ofrece', iconos: true },
  { grupo: 'tipos', titulo: 'Tipo', lista: 'tiposConvocatoria', campo: 'tipo', mayuscula: true },
];

function item(c, agente, hoy) {
  const { etiqueta, fecha } = fechaClave(c, hoy);
  const { dia, mes } = partesFecha(fecha);
  const nombre = agente ? `<a href="#/agente/${esc(encodeURIComponent(agente.id))}">${esc(agente.nombre)}</a>` : '';
  const lugar = agente ? String(agente.departamento || agente.pais || '').trim() : '';
  const meta = [nombre, esc(mayusculaInicial(c.tipo)), esc(lugar)].filter(Boolean).join(' · ');
  const internacional = agente && agente.capa === 'Internacional' ? ' <span class="etiqueta">Internacional</span>' : '';
  const bases = urlSegura(c.enlaceBases);
  return '<li class="conv">'
    + `<time class="conv__fecha" datetime="${esc(fecha)}"><span class="conv__etiqueta">${etiqueta}</span>`
    + `<span class="conv__dia">${esc(dia)}</span><span class="conv__mes">${esc(mes)}</span></time>`
    + '<div class="conv__cuerpo">'
    + `<h3 class="conv__titulo">${esc(c.titulo)}</h3>`
    + `<p class="conv__meta">${meta}</p>`
    + `<p class="conv__estado">${insigniaEstado(c, hoy)}${internacional}</p>`
    + detallesConvocatoria(c, 'conv__detalle')
    + (bases ? `<p class="conv__bases">${enlaceExterno(bases, `Ver bases<span class="solo-lector">: ${esc(c.titulo)}</span>`)}</p>` : '')
    + '</div></li>';
}

export function renderConvocatorias(datos, ruta, hoy) {
  const anioActual = Number(hoy.slice(0, 4));
  const anio = ruta.anio || anioActual;
  const anios = [...new Set([...aniosDisponibles(datos.convocatorias), anioActual, anio])].sort((a, b) => b - a);
  const c = { ...criteriosVacios(), ...ruta.criterios };
  const incluirInternacional = ruta.incluirInternacional !== false;
  const soloAbiertas = Boolean(ruta.soloAbiertas);

  const agentes = new Map(datos.agentes.map((a) => [a.id, a]));
  const capas = new Map(datos.agentes.map((a) => [a.id, a.capa || 'Perú']));
  const delAnio = datos.convocatorias.filter((x) => x.anio === anio);
  const filtradas = filtrarConvocatorias(delAnio, {
    soloAbiertas, sectores: c.sectores, ofrece: c.ofrece, tipos: c.tipos, incluirInternacional,
  }, capas, hoy);
  const meses = agruparPorMes(filtradas, anio);

  const lateral = GRUPOS_CONV.map((g) => {
    const lista = datos.listas[g.lista] || [];
    const valores = g.mayuscula ? lista.map(mayusculaInicial) : lista;
    return grupoFiltro(g, valores, contarPorValor(delAnio, g.campo), c[g.grupo]);
  }).join('');
  const nActivos = GRUPOS_CONV.reduce((s, g) => s + c[g.grupo].length, 0) + (incluirInternacional ? 0 : 1) + (soloAbiertas ? 1 : 0);

  let zonaResultados;
  if (meses.length) {
    zonaResultados = meses.map((m) => `<section class="conv-mes"><h2>${esc(m.nombre)}</h2><ul class="conv-lista">`
      + m.items.map((x) => item(x, agentes.get(x.agenteId), hoy)).join('')
      + '</ul></section>').join('');
  } else {
    const limpiar = escribirRuta({ vista: 'convocatorias', criterios: criteriosVacios(), anio: ruta.anio });
    zonaResultados = '<div class="vacio"><p class="vacio__titulo">No hay convocatorias con estos filtros este año</p>'
      + (nActivos ? `<div class="vacio__acciones"><a class="btn" href="${esc(limpiar)}">Limpiar filtros</a></div>` : '')
      + '</div>';
  }

  const opcionesAnio = anios.map((n) => `<option value="${n}"${n === anio ? ' selected' : ''}>${n}</option>`).join('');

  return `<section class="explorar convocatorias" aria-labelledby="conv-titulo">
  <h1 id="conv-titulo">CONVOCATORIAS ${anio}</h1>
  <div class="explorar__cuerpo">
    <aside class="explorar__lateral" aria-label="Filtros" data-lateral>
      <form class="filtros" id="form-filtros" data-filtros>${lateral}
        <fieldset class="filtros__grupo"><legend>Alcance</legend>
          <label class="opcion" for="f-intl"><input type="checkbox" id="f-intl" data-filtro${incluirInternacional ? ' checked' : ''}><span class="opcion__t">Incluir internacionales</span></label>
        </fieldset>
      </form>
    </aside>
    <div class="explorar__principal">
      <div class="explorar__barra">
        <button type="button" class="btn btn-filtros" data-abrir-filtros aria-haspopup="dialog" data-zona="boton-filtros">Filtros (${nActivos})</button>
        <p class="contador" id="contador" data-zona="contador" aria-live="polite" tabindex="-1">${plural(filtradas.length, 'convocatoria', 'convocatorias')}</p>
        <label class="opcion conv-abiertas" for="f-abiertas"><input type="checkbox" id="f-abiertas" data-filtro${soloAbiertas ? ' checked' : ''}><span class="opcion__t">Solo abiertas</span></label>
        <div class="orden">
          <label for="anio-conv">Año</label>
          <select id="anio-conv" data-anio>${opcionesAnio}</select>
        </div>
      </div>
      <div data-zona="resultados">${zonaResultados}</div>
    </div>
  </div>
  ${hojaFiltros(filtradas.length)}
</section>`;
}
