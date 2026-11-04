import { URL_SCRIPT } from './config.js';
import { cargarDatos } from './datos.js';
import { slug } from './texto.js';
import { criteriosVacios } from './filtros.js';
import { leerRuta, escribirRuta, limpiarSlugs } from './rutas.js';
import { renderPortada } from './vistas/portada.js';
import { renderExplorar, GRUPOS } from './vistas/explorar.js';
import { renderFicha } from './vistas/ficha.js';
import { renderConvocatorias } from './vistas/convocatorias.js';
import { renderSobre } from './vistas/sobre.js';
import { hoyLima } from './convocatorias.js';
import { abrirFormulario } from './vistas/formulario.js';

const URL_DATOS = URL_SCRIPT || 'assets/datos-ejemplo.json';
const TITULOS = { portada: 'Mapa de Emprendimiento', explorar: 'Explorar', internacional: 'Internacional', convocatorias: 'Convocatorias', sobre: 'Sobre Chicha', agente: 'Agente' };
const ESCRITORIO = '(min-width: 768px)';

const estado = {
  datos: null, origen: null, cargando: false, vistaPintada: null, pintadoAntes: false, htmlPintado: null,
  pendienteForm: null, rutaFondo: null, fondoReal: false, // fondoReal: el usuario llegó navegando a la vista que hay bajo la ficha
  fichaDesdeApp: false, htmlFicha: null, origenFicha: null, idFicha: null,
};
let $vista;
let $capaFicha;

export function validos(datos, vista) {
  const v = {};
  for (const g of GRUPOS) v[g.grupo] = new Set((datos.listas[g.lista] || []).map(slug));
  // En Convocatorias el parámetro tipo es el tipo de convocatoria, no el de entidad.
  if (vista === 'convocatorias') v.tipos = new Set((datos.listas.tiposConvocatoria || []).map(slug));
  return v;
}

function rutaActual() {
  const r = leerRuta(location.hash);
  if (estado.datos) r.criterios = limpiarSlugs(r.criterios, validos(estado.datos, r.vista));
  return r;
}

function htmlVista(r) {
  const d = estado.datos;
  switch (r.vista) {
    case 'explorar': return renderExplorar(d, r, 'Perú');
    case 'internacional': return renderExplorar(d, r, 'Internacional');
    case 'convocatorias': return renderConvocatorias(d, r, hoyLima());
    case 'sobre': return renderSobre();
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

// Pinta la vista que queda debajo cuando se entra directo a una ficha por URL.
function pintarFondo(a) {
  const fondo = { vista: a && a.capa === 'Internacional' ? 'internacional' : 'explorar', criterios: criteriosVacios(), orden: 'az' };
  const html = avisoOrigen() + htmlVista(fondo);
  $vista.innerHTML = html;
  estado.htmlPintado = html;
  estado.vistaPintada = fondo.vista;
  estado.rutaFondo = escribirRuta(fondo);
  estado.fondoReal = false;
  estado.pintadoAntes = true;
  marcarNav(fondo.vista);
}

function abrirFicha(r) {
  const a = estado.datos.agentes.find((x) => x.id === r.id) || null;
  if (estado.vistaPintada === null) pintarFondo(a);
  const html = renderFicha(a, estado.datos.convocatorias, hoyLima());
  const abierta = $capaFicha.querySelector('dialog[open]');
  estado.idFicha = r.id;
  document.title = `${a ? a.nombre : TITULOS.agente} · Chicha`;
  if (abierta) {
    if (html === estado.htmlFicha) return;
    const plantilla = document.createElement('template');
    plantilla.innerHTML = html;
    abierta.innerHTML = plantilla.content.firstElementChild.innerHTML;
    abierta.querySelector('[data-cerrar-ficha]').focus();
  } else {
    estado.fichaDesdeApp = estado.fondoReal;
    $capaFicha.innerHTML = html;
    $capaFicha.querySelector('dialog').showModal();
  }
  estado.htmlFicha = html;
}

// Quita la ficha del DOM; devuelve si había una.
function quitarFicha() {
  const dlg = $capaFicha.querySelector('dialog');
  if (!dlg) return false;
  if (dlg.open) dlg.close();
  $capaFicha.innerHTML = '';
  estado.htmlFicha = null;
  return true;
}

// Todo cierre (Esc, botón, clic fuera) pasa por el evento close del <dialog>.
function salirDeFicha() {
  if (leerRuta(location.hash).vista !== 'agente') return;
  if (estado.fichaDesdeApp) history.back();
  else location.replace(estado.rutaFondo || '#/explorar'); // replace: "Atrás" no reabre la ficha ni saca del sitio
}

function devolverFoco() {
  const origen = estado.origenFicha;
  estado.origenFicha = null;
  const href = `#/agente/${encodeURIComponent(estado.idFicha ?? '')}`;
  const destino = origen && origen.isConnected ? origen : $vista.querySelector(`a[href="${CSS.escape(href)}"]`);
  (destino || $vista).focus();
}

function pintar() {
  const r = rutaActual();
  if (!estado.datos) {
    if (estado.cargando) return;
    $vista.innerHTML = '<section class="error-carga" role="alert"><p>No pudimos cargar el mapa. Revisa tu conexión e intenta de nuevo.</p>'
      + '<button type="button" class="btn btn--primario" data-reintentar>Reintentar</button></section>';
    estado.vistaPintada = null;
    estado.htmlPintado = null;
    return;
  }
  if (r.vista === 'agente') { abrirFicha(r); return; }
  const veniaDeFicha = quitarFicha();
  const html = avisoOrigen() + htmlVista(r);
  marcarNav(r.vista);
  estado.rutaFondo = escribirRuta(r);
  estado.fondoReal = true;
  // Al cerrar la ficha la vista de abajo suele seguir igual: no se repinta (conserva scroll y estado).
  if (html === estado.htmlPintado) {
    if (veniaDeFicha) devolverFoco();
    return;
  }
  const cambioSeccion = estado.vistaPintada !== r.vista;
  const activo = document.activeElement;
  const focoDentro = Boolean(activo && activo !== $vista && $vista.contains(activo));
  const enfocado = focoDentro ? activo.id : '';
  $vista.innerHTML = html;
  estado.htmlPintado = html;
  estado.vistaPintada = r.vista;
  const primera = !estado.pintadoAntes;
  estado.pintadoAntes = true;
  if (primera) return; // en la carga inicial no se roba el foco
  if (veniaDeFicha && !cambioSeccion) {
    devolverFoco();
  } else if (cambioSeccion) {
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
  const html = htmlVista(rutaActual());
  plantilla.innerHTML = html;
  estado.htmlPintado = avisoOrigen() + html;
  for (const nueva of plantilla.content.querySelectorAll('[data-zona]')) {
    const actual = $vista.querySelector(`[data-zona="${nueva.dataset.zona}"]`);
    if (actual && actual.innerHTML !== nueva.innerHTML) actual.innerHTML = nueva.innerHTML;
  }
}

function aplicarFiltros(origen) {
  const form = $vista.querySelector('[data-filtros]');
  const orden = $vista.querySelector('[data-orden]');
  const r = rutaActual();
  const c = { ...criteriosVacios(), q: r.criterios.q };
  if (form) {
    const fd = new FormData(form);
    for (const g of GRUPOS) c[g.grupo] = fd.getAll(g.grupo);
  }
  const nueva = { ...r, criterios: c, orden: orden ? orden.value : r.orden };
  const cambioAnio = origen.matches('[data-anio]');
  if (r.vista === 'convocatorias') {
    if (cambioAnio) nueva.anio = Number(origen.value);
    nueva.soloAbiertas = $vista.querySelector('#f-abiertas').checked;
    nueva.incluirInternacional = $vista.querySelector('#f-intl').checked;
  }
  history.replaceState(history.state, '', escribirRuta(nueva));
  // El año cambia el título y los conteos de los filtros, que no son zonas.
  if (cambioAnio) pintar();
  else pintarZonas();
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

function zonaForm(id, rol) {
  let z = document.getElementById(id);
  if (!z) {
    z = document.createElement('div');
    z.id = id;
    z.setAttribute('role', rol);
    $vista.parentNode.insertBefore(z, $vista);
  }
  return z;
}

function avisarForm(estadoTxt, errorHtml) {
  zonaForm('aviso-form', 'status').innerHTML = estadoTxt ? `<p class="aviso">${estadoTxt}</p>` : '';
  zonaForm('error-form', 'alert').innerHTML = errorHtml ? `<div class="error-carga">${errorHtml}</div>` : '';
}

// Abre el formulario ya, o lo deja pendiente hasta que lleguen los datos.
function pedirFormulario(detalle) {
  if (estado.datos) {
    estado.pendienteForm = null;
    avisarForm('', '');
    abrirFormulario({ modo: detalle.modo || 'elegir', registroId: detalle.registroId || '', datos: estado.datos });
    return;
  }
  estado.pendienteForm = detalle;
  if (estado.cargando) avisarForm('Cargando el mapa para abrir el formulario…', '');
  else avisarForm('', '<p>No podemos abrir el formulario en este momento: el mapa no se pudo cargar.</p><button type="button" class="btn btn--primario" data-reintentar-form>Reintentar</button>');
}

async function cargar({ enfocar = false } = {}) {
  estado.cargando = true;
  if (estado.pendienteForm) avisarForm('Cargando el mapa para abrir el formulario…', '');
  if (!estado.datos) $vista.innerHTML = '<p class="vista__espera">Cargando el mapa…</p>';
  let resultado = { datos: null, origen: 'ninguno' }; // cualquier fallo inesperado acaba en el aviso con Reintentar
  try {
    resultado = await cargarDatos({
      url: URL_DATOS,
      alGuardado: (copia) => { estado.datos = copia; estado.origen = null; pintar(); },
    });
  } catch (err) {
    console.error('cargar:', err);
  }
  const { datos, origen } = resultado;
  estado.cargando = false;
  const igual = datos && estado.datos && JSON.stringify(datos) === JSON.stringify(estado.datos);
  if (datos) estado.datos = datos;
  const avisoAntes = estado.origen === 'local';
  estado.origen = origen;
  // Si la red trae lo mismo que ya se pintó desde la copia local, no se repinta (no se pierde el foco ni el scroll).
  if (!igual || avisoAntes !== (origen === 'local') || !estado.datos) pintar();
  if (enfocar && !$capaFicha.querySelector('dialog[open]')) {
    const destino = estado.datos ? $vista : $vista.querySelector('[data-reintentar]');
    if (destino) destino.focus({ preventScroll: true });
  }
  if (estado.pendienteForm) pedirFormulario(estado.pendienteForm);
}

export function iniciar() {
  $vista = document.getElementById('vista');
  $capaFicha = document.getElementById('capa-ficha');
  if (!$vista || !$capaFicha) return;

  window.addEventListener('hashchange', () => { if (estado.datos) pintar(); });
  window.matchMedia(ESCRITORIO).addEventListener('change', (e) => { if (e.matches) cerrarHoja(); });

  $vista.addEventListener('change', (e) => {
    if (e.target.matches('[data-filtro], [data-orden], [data-anio]')) aplicarFiltros(e.target);
  });
  $vista.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-buscar]');
    if (!form) return;
    e.preventDefault();
    buscar(form);
  });
  $vista.addEventListener('click', (e) => {
    if (e.target.id === 'hoja-filtros') { cerrarHoja(); return; } // clic en el fondo de la hoja
    const aFicha = e.target.closest('a[href^="#/agente/"]');
    if (aFicha) estado.origenFicha = aFicha;
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-anadir]')) anadir();
    else if (t.matches('[data-abrir-filtros]')) abrirHoja();
    else if (t.matches('[data-cerrar-filtros]')) cerrarHoja();
    else if (t.matches('[data-reintentar]')) cargar({ enfocar: true });
  });
  // close no burbujea: se escucha en captura. Esc lo dispara de forma nativa.
  $capaFicha.addEventListener('close', salirDeFicha, true);
  $capaFicha.addEventListener('click', (e) => {
    const dlg = $capaFicha.querySelector('dialog');
    if (!dlg) return;
    if (e.target === dlg || e.target.closest('[data-cerrar-ficha]')) { dlg.close(); return; } // el panel llena el <dialog>: e.target === dlg es el fondo
    const sugerir = e.target.closest('[data-sugerir]');
    if (sugerir) document.dispatchEvent(new CustomEvent('chicha:anadir', { detail: { modo: 'sugerencia', registroId: sugerir.dataset.registro } }));
  });
  document.addEventListener('chicha:anadir', (e) => {
    pedirFormulario(e.detail || {});
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-reintentar-form]')) cargar();
  });
  const btnAnadir = document.getElementById('btn-anadir');
  if (btnAnadir) btnAnadir.addEventListener('click', anadir);

  cargar();
}

if (typeof document !== 'undefined') iniciar();
