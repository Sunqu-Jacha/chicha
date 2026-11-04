// Íconos Tabler Icons (MIT), set outline, v3.19.0 — https://tabler.io/icons
// Solo se guarda el contenido interno de cada SVG (viewBox 24x24).
import { esc } from './texto.js';

const PATHS = {
  'coin': "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M14.8 9a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1\" /><path d=\"M12 7v10\" />",
  'school': "<path d=\"M22 9l-10 -4l-10 4l10 4l10 -4v6\" /><path d=\"M6 10.6v5.4a6 3 0 0 0 12 0v-5.4\" />",
  'rocket': "<path d=\"M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3\" /><path d=\"M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3\" /><path d=\"M15 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" />",
  'building': "<path d=\"M3 21l18 0\" /><path d=\"M9 8l1 0\" /><path d=\"M9 12l1 0\" /><path d=\"M9 16l1 0\" /><path d=\"M14 8l1 0\" /><path d=\"M14 12l1 0\" /><path d=\"M14 16l1 0\" /><path d=\"M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16\" />",
  'speakerphone': "<path d=\"M18 8a3 3 0 0 1 0 6\" /><path d=\"M10 8v11a1 1 0 0 1 -1 1h-1a1 1 0 0 1 -1 -1v-5\" /><path d=\"M12 8h0l4.524 -3.77a.9 .9 0 0 1 1.476 .692v12.156a.9 .9 0 0 1 -1.476 .692l-4.524 -3.77h-8a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h8\" />",
  'affiliate': "<path d=\"M5.931 6.936l1.275 4.249m5.607 5.609l4.251 1.275\" /><path d=\"M11.683 12.317l5.759 -5.759\" /><path d=\"M5.5 5.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0\" /><path d=\"M18.5 5.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0\" /><path d=\"M18.5 18.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0\" /><path d=\"M8.5 15.5m-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0\" />",
  'trophy': "<path d=\"M8 21l8 0\" /><path d=\"M12 17l0 4\" /><path d=\"M7 4l10 0\" /><path d=\"M17 4v8a5 5 0 0 1 -10 0v-8\" /><path d=\"M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0\" /><path d=\"M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0\" />",
  'scale': "<path d=\"M7 20l10 0\" /><path d=\"M6 6l6 -1l6 1\" /><path d=\"M12 3l0 17\" /><path d=\"M9 12l-3 -6l-3 6a3 3 0 0 0 6 0\" /><path d=\"M21 12l-3 -6l-3 6a3 3 0 0 0 6 0\" />",
  'palette': "<path d=\"M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25\" /><path d=\"M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" /><path d=\"M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" /><path d=\"M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" />",
  'masks-theater': "<path d=\"M13.192 9h6.616a2 2 0 0 1 1.992 2.183l-.567 6.182a4 4 0 0 1 -3.983 3.635h-1.5a4 4 0 0 1 -3.983 -3.635l-.567 -6.182a2 2 0 0 1 1.992 -2.183z\" /><path d=\"M15 13h.01\" /><path d=\"M18 13h.01\" /><path d=\"M15 16.5c1 .667 2 .667 3 0\" /><path d=\"M8.632 15.982a4.037 4.037 0 0 1 -.382 .018h-1.5a4 4 0 0 1 -3.983 -3.635l-.567 -6.182a2 2 0 0 1 1.992 -2.183h6.616a2 2 0 0 1 2 2\" /><path d=\"M6 8h.01\" /><path d=\"M9 8h.01\" /><path d=\"M6 12c.764 -.51 1.528 -.63 2.291 -.36\" />",
  'music': "<path d=\"M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\" /><path d=\"M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\" /><path d=\"M9 17v-13h10v13\" /><path d=\"M9 8h10\" />",
  'movie': "<path d=\"M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z\" /><path d=\"M8 4l0 16\" /><path d=\"M16 4l0 16\" /><path d=\"M4 8l4 0\" /><path d=\"M4 16l4 0\" /><path d=\"M4 12l16 0\" /><path d=\"M16 8l4 0\" /><path d=\"M16 16l4 0\" />",
  'book': "<path d=\"M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0\" /><path d=\"M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0\" /><path d=\"M3 6l0 13\" /><path d=\"M12 6l0 13\" /><path d=\"M21 6l0 13\" />",
  'shirt': "<path d=\"M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0\" />",
  'building-monument': "<path d=\"M8 18l2 -13l2 -2l2 2l2 13\" /><path d=\"M5 21v-3h14v3\" /><path d=\"M3 21l18 0\" />",
  'needle-thread': "<path d=\"M3 21c-.667 -.667 3.262 -6.236 11.785 -16.709a3.5 3.5 0 1 1 5.078 4.791c-10.575 8.612 -16.196 12.585 -16.863 11.918z\" /><path d=\"M17.5 6.5l-1 1\" /><path d=\"M17 7c-2.333 -2.667 -3.5 -4 -5 -4s-2 1 -2 2c0 4 8.161 8.406 6 11c-1.056 1.268 -3.363 1.285 -5.75 .808\" /><path d=\"M5.739 15.425c-1.393 -.565 -3.739 -1.925 -3.739 -3.425\" /><path d=\"M19.5 9.5l1.5 1.5\" />",
  'pencil': "<path d=\"M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4\" /><path d=\"M13.5 6.5l4 4\" />",
  'bulb': "<path d=\"M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7\" /><path d=\"M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3\" /><path d=\"M9.7 17l4.6 0\" />",
  'users-group': "<path d=\"M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\" /><path d=\"M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1\" /><path d=\"M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\" /><path d=\"M17 10h2a2 2 0 0 1 2 2v1\" /><path d=\"M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\" /><path d=\"M3 13v-1a2 2 0 0 1 2 -2h2\" />",
};

export const ICONO_POR_SLUG = {
  'financiamiento-y-fondos': 'coin',
  'formacion': 'school',
  'incubacion-y-mentoria': 'rocket',
  'espacios-y-equipamiento': 'building',
  'difusion-y-circulacion': 'speakerphone',
  'redes-y-contactos': 'affiliate',
  'convocatorias-y-premios': 'trophy',
  'asesoria-legal-o-tecnica': 'scale',
  'artes-visuales': 'palette',
  'artes-escenicas': 'masks-theater',
  'musica': 'music',
  'audiovisual': 'movie',
  'editorial-y-literatura': 'book',
  'diseno-y-moda': 'shirt',
  'patrimonio': 'building-monument',
  'artesania': 'needle-thread',
  'educacion': 'pencil',
  'emprendimiento-e-innovacion': 'bulb',
  'cultura-comunitaria': 'users-group',
};

export function icono(nombre, etiqueta) {
  const interior = PATHS[nombre] ?? '';
  const a11y = etiqueta
    ? `role="img" aria-label="${esc(etiqueta)}"`
    : 'aria-hidden="true"';
  return `<svg class="icono" ${a11y} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${interior}</svg>`;
}
