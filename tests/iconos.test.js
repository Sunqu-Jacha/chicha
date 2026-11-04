import test from 'node:test';
import assert from 'node:assert/strict';
import { icono, ICONO_POR_SLUG } from '../assets/js/iconos.js';
import { slug } from '../assets/js/texto.js';

const VALORES = [
  'Financiamiento y fondos', 'Formación', 'Incubación y mentoría', 'Espacios y equipamiento',
  'Difusión y circulación', 'Redes y contactos', 'Convocatorias y premios', 'Asesoría legal o técnica',
  'Artes visuales', 'Artes escénicas', 'Música', 'Audiovisual', 'Editorial y literatura', 'Diseño y moda',
  'Patrimonio', 'Artesanía', 'Educación', 'Emprendimiento e innovación', 'Cultura comunitaria',
];

test('cada valor de ¿Qué ofrece? y Sector tiene ícono', () => {
  for (const v of VALORES) {
    const nombre = ICONO_POR_SLUG[slug(v)];
    assert.ok(nombre, `falta ícono para ${v}`);
    assert.match(icono(nombre), /<path/, `sin trazos para ${nombre}`);
  }
});

test('sin etiqueta: aria-hidden', () => {
  const s = icono('coin');
  assert.match(s, /^<svg /);
  assert.match(s, /aria-hidden="true"/);
  assert.doesNotMatch(s, /role=/);
});

test('con etiqueta: role=img y aria-label escapado', () => {
  const s = icono('coin', 'Fondos "&" <b>');
  assert.match(s, /role="img"/);
  assert.match(s, /aria-label="Fondos &quot;&amp;&quot; &lt;b&gt;"/);
  assert.doesNotMatch(s, /aria-hidden/);
});
