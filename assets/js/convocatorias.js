import { slug } from './texto.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIA_MS = 86400000;

export function hoyLima(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(ahora);
}

function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / DIA_MS);
}

export function estadoConvocatoria(c, hoy) {
  if (c.fechaApertura && hoy < c.fechaApertura) return { estado: 'proxima', diasParaCierre: null };
  if (hoy > c.fechaCierre) return { estado: 'cerrada', diasParaCierre: null };
  const dias = diasEntre(hoy, c.fechaCierre);
  return { estado: 'abierta', diasParaCierre: dias <= 14 ? dias : null };
}

const coincide = (valores, elegidos) => elegidos.length === 0 || valores.some((v) => elegidos.includes(slug(v)));

export function filtrarConvocatorias(lista, criterios, capaPorAgente, hoy) {
  const { soloAbiertas, sectores, ofrece, tipos, incluirInternacional } = criterios;
  return lista.filter((c) => {
    if (soloAbiertas && estadoConvocatoria(c, hoy).estado !== 'abierta') return false;
    if (!incluirInternacional && (capaPorAgente.get(c.agenteId) || 'Perú') === 'Internacional') return false;
    return coincide(c.sectores || [], sectores) && coincide(c.ofrece || [], ofrece) && coincide([c.tipo || ''], tipos);
  });
}

export function agruparPorMes(lista, anio) {
  const porMes = new Map();
  for (const c of lista.filter((x) => x.anio === anio)) {
    const mes = Number(c.fechaCierre.slice(5, 7));
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(c);
  }
  return [...porMes.keys()].sort((a, b) => a - b).map((mes) => ({
    mes,
    nombre: MESES[mes - 1],
    items: porMes.get(mes).sort((a, b) => a.fechaCierre.localeCompare(b.fechaCierre) || a.titulo.localeCompare(b.titulo, 'es')),
  }));
}

export function aniosDisponibles(lista) {
  return [...new Set(lista.map((c) => c.anio))].sort((a, b) => b - a);
}
