import { URL_SCRIPT, CLAVE_BORRADOR } from '../config.js';
import { esc, normalizar } from '../texto.js';
import { validarEnvio, esInternacional, MAX_DESCRIPCION } from '../validacion.js';
import { iconoDe } from './comunes.js';

export const MSG_RED = 'No pudimos enviar tu propuesta. Tu texto sigue guardado; intenta de nuevo.';
export const MSG_TIEMPO = MSG_RED + ' Revisa tu correo antes de reenviar: si recibiste el acuse, tu propuesta ya llegó.';
export const MSG_SIN_SCRIPT = 'El formulario aún no está conectado.';
export const MSG_EXITO = 'Recibimos tu propuesta. Te escribiremos cuando la revisemos.';
const MSG_REGISTRO = 'No pudimos identificar qué registro quieres corregir. Cierra esta ventana y vuelve a intentarlo.';
const MSG_REVISA = 'Revisa los campos marcados.';
const ESPERA_MINIMA_MS = 4200; // el script descarta envíos de menos de 4 s: se espera en vez de perder la propuesta en silencio

const TITULOS = {
  elegir: '¿Qué quieres sumar?', agente: 'Añadir un agente', convocatoria: 'Añadir una convocatoria', sugerencia: 'Sugerir un cambio',
};

const CAMPOS_SUGERIBLES = {
  agente: ['Nombre', 'Descripción', 'Qué ofrece', 'Sectores', 'Tipo de entidad', 'Presencia', 'Departamento', 'Ciudad', 'Dirección',
    'Web', 'Instagram', 'Facebook', 'Otras redes', 'Correo público', 'Logo', 'Otro dato'],
  convocatoria: ['Título', 'Año', 'Tipo', 'Descripción', 'Monto', 'Enlace a las bases', 'Fecha de apertura', 'Fecha de cierre',
    'Fecha de resultados', 'Otro dato'],
};

const AVISO_CONSENTIMIENTO = "Acepto que Sunqu Jach'a guarde mi correo solo para avisarme del resultado de mi propuesta (Ley N.º 29733).";

/* ---------- Lógica pura (se prueba en Node) ---------- */

export function tipoDeRegistro(id) {
  const s = String(id ?? '');
  if (s.startsWith('ag-')) return 'agente';
  if (s.startsWith('cv-')) return 'convocatoria';
  return '';
}

// Etiquetas únicas para la lista de agentes: si dos comparten nombre se añade la ciudad (y, si aún chocan, el id).
export function etiquetasAgentes(agentes) {
  const lista = (agentes || []).map((a) => ({ id: a.id, nombre: String(a.nombre ?? '').trim(), ciudad: String(a.ciudad ?? '').trim() }));
  const cuenta = (clave) => lista.reduce((m, a) => m.set(clave(a), (m.get(clave(a)) || 0) + 1), new Map());
  const porNombre = cuenta((a) => normalizar(a.nombre));
  const conCiudad = lista.map((a) => ({ ...a, etiqueta: porNombre.get(normalizar(a.nombre)) > 1 && a.ciudad ? `${a.nombre} (${a.ciudad})` : a.nombre }));
  const porEtiqueta = cuenta((a) => normalizar(a.etiqueta));
  return conCiudad.map((a) => ({ id: a.id, etiqueta: porEtiqueta.get(normalizar(a.etiqueta)) > 1 ? `${a.etiqueta} (${a.id})` : a.etiqueta }));
}

// El campo muestra el nombre; al enviar se traduce al id. Si no coincide con nadie se manda tal cual y el validador lo rechaza.
export function resolverAgenteId(texto, agentes) {
  const t = String(texto ?? '').trim();
  if (!t) return t;
  if ((agentes || []).some((a) => a.id === t)) return t;
  const n = normalizar(t);
  const coinciden = etiquetasAgentes(agentes).filter((a) => normalizar(a.etiqueta) === n);
  return coinciden.length === 1 ? coinciden[0].id : t;
}

// valores: lo que hay en el formulario (strings, arrays de casillas, consentimiento boolean) -> `datos` del POST.
export function armarDatos(modo, valores, { agentes = [], registroId = '' } = {}) {
  const v = valores || {};
  const d = {};
  for (const [k, x] of Object.entries(v)) {
    if (k === 'consentimiento') continue;
    if (Array.isArray(x)) { if (x.length) d[k] = x; continue; }
    const s = String(x ?? '').trim();
    if (s) d[k] = s;
  }
  d.consentimiento = v.consentimiento === true;
  if (modo === 'agente') {
    if (esInternacional(d.presencia)) delete d.departamento;
    else delete d.pais;
  } else if (modo === 'convocatoria') {
    if (d.agente_id) d.agente_id = resolverAgenteId(d.agente_id, agentes);
    if (typeof d.anio === 'string' && /^\d{4}$/.test(d.anio)) d.anio = Number(d.anio);
  } else if (modo === 'sugerencia') {
    d.tipo_registro = tipoDeRegistro(registroId);
    d.registro_id = String(registroId ?? '');
  }
  return d;
}

function almacenSeguro() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function leerTodo(almacen) {
  try {
    const t = JSON.parse(almacen.getItem(CLAVE_BORRADOR) || 'null');
    return t && typeof t === 'object' && !Array.isArray(t) ? t : {};
  } catch { return {}; }
}

export function leerBorrador(almacen, modo, registroId = '') {
  if (!almacen) return null;
  try {
    const b = leerTodo(almacen)[modo];
    if (!b || typeof b !== 'object' || !b.valores || typeof b.valores !== 'object') return null;
    if (modo === 'sugerencia' && b.registro !== registroId) return null;
    return b.valores;
  } catch { return null; }
}

// Nunca se guarda el consentimiento (debe darse en cada envío) ni el campo trampa.
export function guardarBorrador(almacen, modo, valores, registroId = '') {
  if (!almacen) return;
  try {
    const t = leerTodo(almacen);
    const v = { ...valores };
    delete v.consentimiento;
    delete v.sitio_web_2;
    t[modo] = { valores: v, registro: registroId };
    almacen.setItem(CLAVE_BORRADOR, JSON.stringify(t));
  } catch { /* sin espacio o bloqueado */ }
}

export function borrarBorrador(almacen, modo) {
  if (!almacen) return;
  try {
    const t = leerTodo(almacen);
    delete t[modo];
    if (Object.keys(t).length) almacen.setItem(CLAVE_BORRADOR, JSON.stringify(t));
    else almacen.removeItem(CLAVE_BORRADOR);
  } catch { /* nada que hacer */ }
}

/* ---------- Marcado ---------- */

const REQ = '<span class="campo__req" aria-hidden="true"> *</span>';

function descripcionPor(n, { ayuda, cuenta } = {}) {
  return [ayuda ? `ayuda-${n}` : '', cuenta ? `cuenta-${n}` : '', `err-${n}`].filter(Boolean).join(' ');
}

function envoltura(n, cuerpo, { oculto = false } = {}) {
  return `<div class="campo" data-campo="${n}"${oculto ? ' hidden' : ''}>${cuerpo}<p class="campo__error" id="err-${n}" hidden></p></div>`;
}

function entrada({ n, e, r = false, tipo = 'text', ayuda = '', extra = '', oculto = false, lista = '' }) {
  return envoltura(n,
    `<label for="f-${n}" class="campo__etiqueta">${esc(e)}${r ? REQ : ''}</label>`
    + (ayuda ? `<p class="campo__ayuda" id="ayuda-${n}">${esc(ayuda)}</p>` : '')
    + `<input${lista ? ` list="${lista}"` : ''} id="f-${n}" name="${n}" type="${tipo}"${r ? ' aria-required="true"' : ''} aria-describedby="${descripcionPor(n, { ayuda })}"${extra ? ` ${extra}` : ''}>`,
    { oculto });
}

function area({ n, e, r = false, ayuda = '', cuenta = false }) {
  return envoltura(n,
    `<label for="f-${n}" class="campo__etiqueta">${esc(e)}${r ? REQ : ''}</label>`
    + (ayuda ? `<p class="campo__ayuda" id="ayuda-${n}">${esc(ayuda)}</p>` : '')
    + `<textarea id="f-${n}" name="${n}" rows="4"${r ? ' aria-required="true"' : ''} aria-describedby="${descripcionPor(n, { ayuda, cuenta })}"></textarea>`
    + (cuenta ? `<p class="campo__cuenta" id="cuenta-${n}" data-cuenta="${n}">0/${MAX_DESCRIPCION}</p>` : ''));
}

function seleccion({ n, e, r = false, opciones, ayuda = '', oculto = false }) {
  return envoltura(n,
    `<label for="f-${n}" class="campo__etiqueta">${esc(e)}${r ? REQ : ''}</label>`
    + (ayuda ? `<p class="campo__ayuda" id="ayuda-${n}">${esc(ayuda)}</p>` : '')
    + `<select id="f-${n}" name="${n}"${r ? ' aria-required="true"' : ''} aria-describedby="${descripcionPor(n, { ayuda })}">`
    + '<option value="">Elige una opción</option>'
    + opciones.map((o) => `<option value="${esc(o.valor ?? o)}">${esc(o.texto ?? o)}</option>`).join('')
    + '</select>',
    { oculto });
}

function casillas({ n, e, r = false, opciones, ayuda = '' }) {
  return `<fieldset class="campo campo--grupo" data-campo="${n}" id="f-${n}" aria-describedby="${descripcionPor(n, { ayuda })}">`
    + `<legend class="campo__etiqueta">${esc(e)}${r ? `${REQ}<span class="solo-lector"> (obligatorio)</span>` : ''}</legend>`
    + (ayuda ? `<p class="campo__ayuda" id="ayuda-${n}">${esc(ayuda)}</p>` : '')
    + '<div class="casillas">'
    + opciones.map((o) => `<label class="casilla"><input type="checkbox" name="${n}" value="${esc(o)}">${iconoDe(o)}<span>${esc(o)}</span></label>`).join('')
    + `</div><p class="campo__error" id="err-${n}" hidden></p></fieldset>`;
}

function consentimiento() {
  return envoltura('consentimiento',
    `<label class="casilla casilla--consentimiento"><input type="checkbox" id="f-consentimiento" name="consentimiento" aria-required="true" aria-describedby="err-consentimiento"><span>${esc(AVISO_CONSENTIMIENTO)}${REQ}</span></label>`);
}

function tusDatos(conNombre) {
  return '<h3 class="form__grupo">Tus datos</h3>'
    + '<p class="campo__ayuda">Tu correo solo se usa para avisarte del resultado.</p>'
    + (conNombre ? entrada({ n: 'nombre_proponente', e: 'Tu nombre', r: true, extra: 'autocomplete="name"' }) : '')
    + entrada({ n: 'email_proponente', e: 'Tu correo', r: true, tipo: 'email', extra: 'autocomplete="email" inputmode="email"' })
    + consentimiento();
}

function camposAgente(l) {
  return '<h3 class="form__grupo">Sobre el agente</h3>'
    + entrada({ n: 'nombre', e: 'Nombre', r: true })
    + casillas({ n: 'ofrece', e: '¿Qué ofrece?', r: true, opciones: l.ofrece || [] })
    + casillas({ n: 'sectores', e: 'Sector', r: true, opciones: l.sectores || [] })
    + seleccion({ n: 'tipo_entidad', e: 'Tipo de entidad', r: true, opciones: l.tiposEntidad || [] })
    + seleccion({ n: 'presencia', e: 'Presencia', r: true, opciones: l.presencia || [] })
    + entrada({ n: 'pais', e: 'País', ayuda: 'Indica el país donde tiene su sede.', oculto: true })
    + seleccion({ n: 'departamento', e: 'Departamento', r: true, opciones: l.departamentos || [] })
    + entrada({ n: 'ciudad', e: 'Ciudad', r: true })
    + entrada({ n: 'direccion', e: 'Dirección' })
    + area({ n: 'descripcion', e: 'Descripción', r: true, cuenta: true, ayuda: `Cuenta en pocas palabras qué hace (máximo ${MAX_DESCRIPCION} caracteres).` })
    + entrada({ n: 'web', e: 'Sitio web', tipo: 'url', ayuda: 'Debe empezar con http:// o https://.', extra: 'inputmode="url"' })
    + entrada({ n: 'instagram', e: 'Instagram (enlace)', tipo: 'url', extra: 'inputmode="url"' })
    + entrada({ n: 'facebook', e: 'Facebook (enlace)', tipo: 'url', extra: 'inputmode="url"' })
    + entrada({ n: 'otras_redes', e: 'Otras redes' })
    + entrada({ n: 'email_publico', e: 'Correo público', tipo: 'email', extra: 'inputmode="email"' })
    + entrada({ n: 'logo_url', e: 'Logo (enlace a la imagen)', tipo: 'url', extra: 'inputmode="url"' })
    + tusDatos(true);
}

function camposConvocatoria(l, agentes) {
  const opciones = etiquetasAgentes(agentes);
  return '<h3 class="form__grupo">Sobre la convocatoria</h3>'
    + envoltura('agente_id',
      '<label for="f-agente_id" class="campo__etiqueta">Agente que la convoca' + REQ + '</label>'
      + '<p class="campo__ayuda" id="ayuda-agente_id">Escribe para buscar entre los agentes publicados.</p>'
      + `<input list="lista-agentes" id="f-agente_id" name="agente_id" type="text" autocomplete="off" aria-required="true" aria-describedby="ayuda-agente_id err-agente_id">`
      + `<datalist id="lista-agentes">${opciones.map((o) => `<option value="${esc(o.etiqueta)}"></option>`).join('')}</datalist>`
      + '<button type="button" class="enlace-boton" data-modo="agente">¿No está? Añade el agente primero</button>')
    + entrada({ n: 'titulo', e: 'Título', r: true })
    + entrada({ n: 'anio', e: 'Año', r: true, ayuda: 'Cuatro cifras, por ejemplo 2027.', extra: 'inputmode="numeric" autocomplete="off"' })
    + seleccion({ n: 'tipo', e: 'Tipo', r: true, opciones: l.tiposConvocatoria || [] })
    + casillas({ n: 'ofrece', e: '¿Qué ofrece?', opciones: l.ofrece || [] })
    + casillas({ n: 'sectores', e: 'Sectores', opciones: l.sectores || [] })
    + area({ n: 'descripcion', e: 'Descripción', cuenta: true, ayuda: `Máximo ${MAX_DESCRIPCION} caracteres.` })
    + entrada({ n: 'monto', e: 'Monto', ayuda: 'En texto libre, por ejemplo "hasta S/ 10 000".' })
    + entrada({ n: 'enlace_bases', e: 'Enlace a las bases', r: true, tipo: 'url', ayuda: 'Debe empezar con http:// o https://.', extra: 'inputmode="url"' })
    + entrada({ n: 'fecha_apertura', e: 'Fecha de apertura', tipo: 'date' })
    + entrada({ n: 'fecha_cierre', e: 'Fecha de cierre', r: true, tipo: 'date' })
    + entrada({ n: 'fecha_resultados', e: 'Fecha de resultados', tipo: 'date' })
    + tusDatos(true);
}

function nombreDeRegistro(datos, registroId) {
  const a = (datos.agentes || []).find((x) => x.id === registroId);
  if (a) return a.nombre;
  const c = (datos.convocatorias || []).find((x) => x.id === registroId);
  return c ? c.titulo : registroId;
}

function camposSugerencia(datos, registroId) {
  const campos = CAMPOS_SUGERIBLES[tipoDeRegistro(registroId)] || ['Otro dato'];
  return `<p class="form__sobre">Sobre: <strong>${esc(nombreDeRegistro(datos, registroId))}</strong></p>`
    + seleccion({ n: 'campo', e: 'Qué dato cambia', r: true, opciones: campos })
    + area({ n: 'valor_propuesto', e: 'Valor propuesto', r: true, ayuda: 'Escribe cómo debería quedar.' })
    + entrada({ n: 'fuente', e: 'Fuente', ayuda: 'Un enlace o referencia que respalde el cambio (opcional).' })
    + tusDatos(false);
}

// Contenido interior del <dialog> para un modo.
export function htmlFormulario(modo, datos, registroId = '') {
  const d = datos || { listas: {}, agentes: [], convocatorias: [] };
  const cerrar = '<button type="button" class="btn form__cerrar" data-cerrar-form>Cerrar</button>';
  const titulo = `<h2 id="form-titulo" class="form__titulo" tabindex="-1">${esc(TITULOS[modo] || TITULOS.elegir)}</h2>`;
  if (modo === 'agente' || modo === 'convocatoria' || modo === 'sugerencia') {
    const cuerpo = modo === 'agente' ? camposAgente(d.listas || {})
      : modo === 'convocatoria' ? camposConvocatoria(d.listas || {}, d.agentes || [])
        : camposSugerencia(d, registroId);
    return `<div class="form__panel">${cerrar}${titulo}`
      + '<form class="form" novalidate>'
      + '<div class="form__general" role="alert" data-general></div>'
      + '<p class="form__nota">Los campos con * son obligatorios.</p>'
      + (modo === 'sugerencia' ? '' : '<p class="form__nota"><button type="button" class="enlace-boton" data-modo="elegir">Elegir otra cosa</button></p>')
      + cuerpo
      + '<div class="trampa" aria-hidden="true"><label>No rellenes este campo<input type="text" name="sitio_web_2" tabindex="-1" autocomplete="off"></label></div>'
      + '<div class="form__acciones"><button type="submit" class="btn btn--primario" data-enviar>Enviar para revisión</button></div>'
      + '</form></div>';
  }
  return `<div class="form__panel">${cerrar}${titulo}`
    + '<p>Elige qué quieres proponer. Lo revisamos antes de publicarlo.</p>'
    + '<div class="form__opciones">'
    + '<button type="button" class="btn btn--primario" data-modo="agente">Agente</button>'
    + '<button type="button" class="btn btn--primario" data-modo="convocatoria">Convocatoria</button>'
    + '</div></div>';
}

/* ---------- Comportamiento (solo navegador) ---------- */

// Lee el formulario como valores crudos (strings, arrays de casillas, consentimiento boolean).
function leerValores(form) {
  const v = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      if (el.name === 'consentimiento') { v.consentimiento = el.checked; continue; }
      if (!Array.isArray(v[el.name])) v[el.name] = [];
      if (el.checked) v[el.name].push(el.value);
    } else {
      v[el.name] = el.value;
    }
  }
  return v;
}

function aplicarValores(form, valores) {
  for (const el of form.elements) {
    if (!el.name || el.name === 'consentimiento' || el.name === 'sitio_web_2' || !(el.name in valores)) continue;
    const x = valores[el.name];
    if (el.type === 'checkbox') el.checked = Array.isArray(x) && x.includes(el.value);
    else if (typeof x === 'string') el.value = x;
  }
}

function sincronizar(form) {
  const pres = form.elements.presencia;
  if (pres) {
    const intl = esInternacional(pres.value);
    const dep = form.querySelector('[data-campo="departamento"]');
    const pais = form.querySelector('[data-campo="pais"]');
    if (dep && dep.hidden !== intl) { dep.hidden = intl; limpiarError(dep); }
    if (pais && pais.hidden === intl) { pais.hidden = !intl; limpiarError(pais); }
  }
  const desc = form.elements.descripcion;
  const cuenta = form.querySelector('[data-cuenta="descripcion"]');
  if (desc && cuenta) {
    const n = desc.value.trim().length;
    cuenta.textContent = `${n}/${MAX_DESCRIPCION}`;
    cuenta.classList.toggle('campo__cuenta--excedido', n > MAX_DESCRIPCION);
  }
}

function limpiarError(campo) {
  const p = campo.querySelector('.campo__error');
  if (p) { p.textContent = ''; p.hidden = true; }
  for (const c of campo.querySelectorAll('input, select, textarea')) c.removeAttribute('aria-invalid');
  campo.classList.remove('campo--error');
}

function limpiarErrores(form) {
  for (const c of form.querySelectorAll('[data-campo]')) limpiarError(c);
  form.querySelector('[data-general]').textContent = '';
}

// Muestra errores por campo; los que no tienen campo van al aviso general. Devuelve el primer control con error.
function mostrarErrores(form, errores) {
  const generales = [];
  let primero = null;
  for (const [clave, mensaje] of Object.entries(errores)) {
    const campo = clave === '_general' ? null : form.querySelector(`[data-campo="${clave}"]`);
    if (!campo || campo.hidden) {
      generales.push(['tipo_registro', 'registro_id', 'tipo'].includes(clave) ? MSG_REGISTRO : String(mensaje));
      continue;
    }
    const p = campo.querySelector('.campo__error');
    p.textContent = String(mensaje);
    p.hidden = false;
    campo.classList.add('campo--error');
    const controles = campo.querySelectorAll('input, select, textarea');
    for (const c of controles) if (c.type !== 'checkbox') c.setAttribute('aria-invalid', 'true');
    const control = controles[0];
    if (control && (!primero || (primero.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_PRECEDING))) primero = control;
  }
  const general = form.querySelector('[data-general]');
  general.textContent = generales.join(' ');
  return primero;
}

const TIEMPO_ENVIO_MS = 30000;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function abrirFormulario({ modo = 'elegir', datos, registroId = '' } = {}) {
  const capa = document.getElementById('capa-modal');
  if (!capa || !datos) return;
  const previo = capa.querySelector('dialog');
  if (previo) { if (previo.open) previo.close(); previo.remove(); }

  const activo = document.activeElement;
  const opener = activo && activo !== document.body ? activo : null;
  const almacen = almacenSeguro();
  const t0 = Date.now();
  const estado = { modo, enviando: false };

  const dlg = document.createElement('dialog');
  dlg.className = 'formulario';
  dlg.setAttribute('aria-labelledby', 'form-titulo');
  capa.appendChild(dlg);

  const idsAprobados = new Set((datos.agentes || []).map((a) => a.id));

  function pintar(nuevo) {
    estado.modo = nuevo;
    dlg.removeAttribute('aria-describedby');
    dlg.innerHTML = htmlFormulario(nuevo, datos, registroId);
    const form = dlg.querySelector('form');
    if (form) {
      const borrador = leerBorrador(almacen, nuevo, registroId);
      if (borrador) aplicarValores(form, borrador);
      sincronizar(form);
    }
    dlg.querySelector('#form-titulo').focus();
  }

  function guardar() {
    const form = dlg.querySelector('form');
    if (form) guardarBorrador(almacen, estado.modo, leerValores(form), registroId);
  }

  function exito() {
    dlg.innerHTML = '<div class="form__panel"><button type="button" class="btn form__cerrar" data-cerrar-form>Cerrar</button>'
      + '<h2 id="form-titulo" class="form__titulo" tabindex="-1">¡Gracias!</h2>'
      + `<p id="form-exito" role="status">${esc(MSG_EXITO)}</p></div>`;
    dlg.setAttribute('aria-describedby', 'form-exito');
    dlg.querySelector('#form-titulo').focus();
  }

  async function enviar(form) {
    if (estado.enviando) return;
    const boton = form.querySelector('[data-enviar]');
    limpiarErrores(form);
    const modoEnvio = estado.modo;
    const d = armarDatos(modoEnvio, leerValores(form), { agentes: datos.agentes, registroId });
    const errores = validarEnvio(modoEnvio, d, datos.listas, idsAprobados);
    if (Object.keys(errores).length) {
      const primero = mostrarErrores(form, errores);
      if (primero) primero.focus();
      else form.querySelector('[data-general]').scrollIntoView({ block: 'nearest' });
      return;
    }
    const general = form.querySelector('[data-general]');
    if (!URL_SCRIPT) { general.textContent = MSG_SIN_SCRIPT; general.scrollIntoView({ block: 'nearest' }); return; }

    estado.enviando = true;
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    form.setAttribute('aria-busy', 'true');
    let respuesta = null;
    let agotado = false;
    try {
      const falta = ESPERA_MINIMA_MS - (Date.now() - t0);
      if (falta > 0) await esperar(falta);
      const r = await fetch(URL_SCRIPT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tipo: modoEnvio, datos: d, t0 }),
        ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(TIEMPO_ENVIO_MS) } : {}),
      });
      respuesta = await r.json();
    } catch (err) { respuesta = null; agotado = !!err && (err.name === 'TimeoutError' || err.name === 'AbortError'); }
    estado.enviando = false;

    if (respuesta && respuesta.ok === true) {
      borrarBorrador(almacen, modoEnvio);
      if (dlg.isConnected) exito();
      return;
    }
    if (!dlg.isConnected || !form.isConnected) return;
    boton.disabled = false;
    boton.textContent = 'Enviar para revisión';
    form.removeAttribute('aria-busy');
    const errs = respuesta && respuesta.ok === false && respuesta.errores && typeof respuesta.errores === 'object' ? respuesta.errores : null;
    if (!errs || !Object.keys(errs).length) {
      general.textContent = agotado ? MSG_TIEMPO : MSG_RED;
      general.scrollIntoView({ block: 'nearest' });
      return;
    }
    const primero = mostrarErrores(form, errs);
    if (!general.textContent && !primero) general.textContent = MSG_REVISA;
    if (general.textContent) general.scrollIntoView({ block: 'nearest' });
    else if (primero) primero.focus();
  }

  dlg.addEventListener('input', (e) => { const f = e.target.closest('form'); if (f) { sincronizar(f); guardar(); } });
  dlg.addEventListener('change', (e) => { const f = e.target.closest('form'); if (f) { sincronizar(f); guardar(); } });
  dlg.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target.closest('form'); if (f) enviar(f); });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-cerrar-form]')) { if (!estado.enviando) dlg.close(); return; }
    const m = e.target.closest('[data-modo]');
    if (m && !estado.enviando) pintar(m.dataset.modo);
  });
  // Mientras se envía no se puede cerrar: así siempre se ve el resultado y no se burla la guarda de doble envío.
  dlg.addEventListener('cancel', (e) => { if (estado.enviando) e.preventDefault(); });
  dlg.addEventListener('close', () => {
    if (estado.enviando) { if (dlg.isConnected) dlg.showModal(); return; }
    dlg.remove();
    const destino = opener && opener.isConnected ? opener : document.getElementById('vista');
    if (destino) destino.focus();
  });

  pintar(modo);
  dlg.showModal();
  dlg.querySelector('#form-titulo').focus();
}
