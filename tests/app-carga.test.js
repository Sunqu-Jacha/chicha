import test from 'node:test'; import assert from 'node:assert/strict';

// I-3: localStorage bloqueado y red caída deben acabar en el aviso de error, nunca en "Cargando el mapa…".
test('app: almacén bloqueado sin red termina en el camino "ninguno" con botón de reintento', async () => {
  const elemento = () => ({ innerHTML: '', addEventListener() {}, querySelector: () => null, focus() {} });
  const vista = elemento();
  const capa = elemento();
  Object.assign(globalThis, {
    document: {
      getElementById: (id) => ({ vista, 'capa-ficha': capa }[id] ?? null),
      addEventListener() {}, querySelectorAll: () => [], activeElement: null,
    },
    window: { addEventListener() {}, matchMedia: () => ({ addEventListener() {} }), scrollTo() {} },
    location: { hash: '' },
  });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: async () => { throw new Error('sin red'); } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('bloqueado'); } });

  await import('../assets/js/app.js');
  for (let i = 0; i < 100 && !vista.innerHTML.includes('No pudimos'); i++) await new Promise((r) => setTimeout(r, 5));
  assert.ok(vista.innerHTML.includes('No pudimos cargar el mapa'), vista.innerHTML);
  assert.ok(vista.innerHTML.includes('data-reintentar'));
});
