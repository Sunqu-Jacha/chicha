import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizar, slug, esc, separarMulti, urlSegura } from '../assets/js/texto.js';
test('normalizar quita tildes y mayúsculas', () => assert.equal(normalizar('  Música  ÁNDINA '), 'musica andina'));
test('slug', () => { assert.equal(slug('Financiamiento y fondos'), 'financiamiento-y-fondos'); assert.equal(slug('Cooperación internacional / embajada'), 'cooperacion-internacional-embajada'); });
test('esc neutraliza html', () => assert.equal(esc('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;'));
test('esc de null', () => assert.equal(esc(null), ''));
test('separarMulti tolera basura', () => assert.deepEqual(separarMulti('Música; ;Artes visuales '), ['Música', 'Artes visuales']));

test('urlSegura acepta http y https', () => {
  assert.equal(urlSegura('https://example.org/a?b=1'), 'https://example.org/a?b=1');
  assert.equal(urlSegura('  http://example.org  '), 'http://example.org/');
  assert.equal(urlSegura('HTTPS://Example.org'), 'https://example.org/');
});
test('urlSegura rechaza esquemas peligrosos y basura', () => {
  for (const u of ['javascript:alert(1)', ' javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', '\u0001javascript:x',
    'data:text/html,<b>x</b>', 'vbscript:msgbox(1)', 'VBScript:x', '//evil.example', 'example.org', 'ftp://example.org', '', null, undefined, 42]) {
    assert.equal(urlSegura(u), null, String(u));
  }
});
test('urlSegura con mailto solo cuando se pide', () => {
  assert.equal(urlSegura('contacto@example.org'), null);
  assert.equal(urlSegura('mailto:contacto@example.org'), null);
  assert.equal(urlSegura('contacto@example.org', { mailto: true }), 'mailto:contacto@example.org');
  assert.equal(urlSegura(' MAILTO:contacto@example.org ', { mailto: true }), 'mailto:contacto@example.org');
  assert.equal(urlSegura('javascript:alert(1)//@x.org', { mailto: true }), null);
  assert.equal(urlSegura('a b@x.org', { mailto: true }), null);
  assert.equal(urlSegura('"><x@y.org', { mailto: true }), null);
});
