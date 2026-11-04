import { URL_SCRIPT } from './config.js';
import { cargarDatos } from './datos.js';
import { esc, slug } from './texto.js';
import { criteriosVacios } from './filtros.js';
import { leerRuta, escribirRuta, limpiarSlugs } from './rutas.js';
import { renderPortada } from './vistas/portada.js';
import { renderExplorar, GRUPOS } from './vistas/explorar.js';

const URL_DATOS = URL_SCRIPT || 'assets/datos-ejemplo.json';
const TITULOS = { portada: 'Mapa de Emprendimiento', explorar: 'Explorar', internacional: 'Internacional', convocatorias: 'Convocatorias', sobre: 'Sobre Chicha', agente: 'Agente' };
const ESCRITORIO = '(min-width: 768px)';

const estado = { datos: null, origen: null, cargando: false, vistaPintada: null, pintadoAntes: false };
let $vista;

function validos(datos) {
  const v = {};
  for (const g of GRUPOS) v[g.grupo] = new Set((datos.listas[g.lista] || []).map(slug));
  return v;
}

function rutaActual() {
  const r = leerRuta(location.hash);
  if (estado.datos) r.criterios = limpiarSlugs(r.criterios, validos(estado.datos));
  return r;
}

function pendiente(titulo, texto) {
  return `<section class="pendiente"><h1>${esc(titulo)}</h1><p>${esc(texto)}</p><p><a class="btn" href="#/explorar">Volver a explorar</a></p></section>`;
}

function htmlVista(r) {
  const d = estado.datos;
  switch (r.vista) {
    case 'explorar': return renderExplorar(d, r, 'Perú');
    case 'internacional': return renderExplorar(d, r, 'Internacional');
    case 'convocatorias': return pendiente('CONVOCATORIAS', 'Próximamente.');
    case 'sobre': return pendiente('SOBRE CHICHA', 'Próximamente.');
    case 'agente': {
      const a = d.agentes.find((x) => x.id === r.id);
      return pendiente(a ? a.nombre : 'AGENTE', 'La ficha completa estará disponible próximamente.');
    }
    default: return renderPortada(d);
  }
}

function avisoOrigen() {
  return estado.origen === 'local' ? '<p class="aviso" role="status">Mostrando datos guardados</p>' : '';
}

function marcarNav(vista) {
  for (const a of document.querySelectorAll('.nav a[data-ruta]')) {
    if (a.dataset.ruta === vista) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  document.title = `${TITULOS[vista] || TITULOS.portada} · Chicha`;
}

function pintar() {
  const r = rutaActual();
  if (!estado.datos) {
    if (estado.cargando) return;
    $vista.innerHTML = '<section class="error-carga" role="alert"><p>No pudimos cargar el mapa. Revisa tu conexión e intenta de nuevo.</p>'
      + '<button type="button" class="btn btn--primario" data-reintentar>Reintentar</button></section>';
    estado.vistaPintada = null;
    return;
  }
  const cambioSeccion = estado.vistaPintada !== r.vista;
  const activo = document.activeElement;
  const focoDentro = Boolean(activo && activo !== $vista && $vista.contains(activo));
  const enfocado = focoDentro ? activo.id : '';
  $vista.innerHTML = avisoOrigen() + htmlVista(r);
  marcarNav(r.vista);
  estado.vistaPintada = r.vista;
  const primera = !estado.pintadoAntes;
  estado.pintadoAntes = true;
  if (primera) return; // en la carga inicial no se roba el foco
  if (cambioSeccion) {
    window.scrollTo(0, 0);
    $vista.focus({ preventScroll: true });
  } else if (focoDentro) {
    // El elemento enfocado se reemplazó: se recupera por id o se lleva al contador de resultados.
    const destino = (enfocado && document.getElementById(enfocado)) || document.getElementById('contador') || $vista;
    destino.focus({ preventScroll: true });
  }
}

// Repinta solo las zonas marcadas (contador, chips, resultados…) para no perder la barra de filtros ni el foco.
function pintarZonas() {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = htmlVista(rutaActual());
  for (const nueva of plantilla.content.querySelectorAll('[data-zona]')) {
    const actual = $vista.querySelector(`[data-zona="${nueva.dataset.zona}"]`);
    if (actual && actual.innerHTML !== nueva.innerHTML) actual.innerHTML = nueva.innerHTML;
  }
}

function aplicarFiltros() {
  const form = $vista.querySelector('[data-filtros]');
  const orden = $vista.querySelector('[data-orden]');
  const r = rutaActual();
  const c = { ...criteriosVacios(), q: r.criterios.q };
  if (form) {
    const fd = new FormData(form);
    for (const g of GRUPOS) c[g.grupo] = fd.getAll(g.grupo);
  }
  const nueva = { ...r, criterios: c, orden: orden ? orden.value : r.orden };
  history.replaceState(history.state, '', escribirRuta(nueva));
  pintarZonas();
}

// Hoja inferior de filtros (móvil): se mueve el mismo formulario al <dialog> y se devuelve al cerrar.
function abrirHoja() {
  const hoja = $vista.querySelector('#hoja-filtros');
  const form = $vista.querySelector('[data-filtros]');
  if (!hoja || !form || typeof hoja.showModal !== 'function') return;
  hoja.querySelector('[data-hueco-filtros]').appendChild(form);
  hoja.addEventListener('close', () => {
    const lateral = $vista.querySelector('[data-lateral]');
    if (lateral && hoja.isConnected) lateral.appendChild(form);
  }, { once: true });
  hoja.showModal();
}

function cerrarHoja() {
  const hoja = $vista && $vista.querySelector('#hoja-filtros');
  if (hoja && hoja.open) hoja.close();
}

function anadir() {
  document.dispatchEvent(new CustomEvent('chicha:anadir', { detail: { modo: 'elegir' } }));
}

function buscar(form) {
  const q = String(new FormData(form).get('q') || '').trim();
  const destino = form.dataset.vista || 'explorar';
  const r = rutaActual();
  const criterios = r.vista === destino ? { ...r.criterios, q } : { ...criteriosVacios(), q };
  location.hash = escribirRuta({ ...r, vista: destino, criterios, orden: r.vista === destino ? r.orden : 'az' });
}

async function cargar() {
  estado.cargando = true;
  if (!estado.datos) $vista.innerHTML = '<p class="vista__espera">Cargando el mapa…</p>';
  const { datos, origen } = await cargarDatos({
    url: URL_DATOS,
    alGuardado: (copia) => { estado.datos = copia; estado.origen = null; pintar(); },
  });
  estado.cargando = false;
  const igual = datos && estado.datos && JSON.stringify(datos) === JSON.stringify(estado.datos);
  if (datos) estado.datos = datos;
  const avisoAntes = estado.origen === 'local';
  estado.origen = origen;
  // Si la red trae lo mismo que ya se pintó desde la copia local, no se repinta (no se pierde el foco ni el scroll).
  if (!igual || avisoAntes !== (origen === 'local') || !estado.datos) pintar();
}

export function iniciar() {
  $vista = document.getElementById('vista');
  if (!$vista) return;

  window.addEventListener('hashchange', () => { if (estado.datos) pintar(); });
  window.matchMedia(ESCRITORIO).addEventListener('change', (e) => { if (e.matches) cerrarHoja(); });

  $vista.addEventListener('change', (e) => {
    if (e.target.matches('[data-filtro], [data-orden]')) aplicarFiltros();
  });
  $vista.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-buscar]');
    if (!form) return;
    e.preventDefault();
    buscar(form);
  });
  $vista.addEventListener('click', (e) => {
    if (e.target.id === 'hoja-filtros') { cerrarHoja(); return; } // clic en el fondo de la hoja
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-anadir]')) anadir();
    else if (t.matches('[data-abrir-filtros]')) abrirHoja();
    else if (t.matches('[data-cerrar-filtros]')) cerrarHoja();
    else if (t.matches('[data-reintentar]')) cargar();
  });
  const btnAnadir = document.getElementById('btn-anadir');
  if (btnAnadir) btnAnadir.addEventListener('click', anadir);

  cargar();
}

if (typeof document !== 'undefined') iniciar();
