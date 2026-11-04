import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizar, slug, esc, separarMulti } from '../assets/js/texto.js';
test('normalizar quita tildes y mayúsculas', () => assert.equal(normalizar('  Música  ÁNDINA '), 'musica andina'));
test('slug', () => { assert.equal(slug('Financiamiento y fondos'), 'financiamiento-y-fondos'); assert.equal(slug('Cooperación internacional / embajada'), 'cooperacion-internacional-embajada'); });
test('esc neutraliza html', () => assert.equal(esc('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;'));
test('esc de null', () => assert.equal(esc(null), ''));
test('separarMulti tolera basura', () => assert.deepEqual(separarMulti('Música; ;Artes visuales '), ['Música', 'Artes visuales']));
