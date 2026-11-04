import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Carga un .gs (funciones globales, sin import/export) en un contexto vm y devuelve el contexto.
// Las funciones y las `var` globales del archivo quedan como propiedades del contexto.
export function cargarGs(ruta) {
  const abs = path.isAbsolute(ruta) ? ruta : path.join(RAIZ, ruta);
  const codigo = fs.readFileSync(abs, 'utf8');
  const contexto = {
    Intl, Date, Math, JSON, Set, Map, Array, Object, String, Number, Boolean, RegExp, Error,
    isNaN, isFinite, parseFloat, parseInt,
  };
  vm.runInNewContext(codigo, contexto, { filename: abs });
  return contexto;
}
