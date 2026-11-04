# Chicha · Mapa de Emprendimiento

## Probar el script

Hazlo en una **hoja de ensayo** (no la real), con la cuenta sunqujacha@gmail.com.

1. Crea una hoja de cálculo nueva y abre **Extensiones › Apps Script**. Pega `apps-script/Logica.gs`, `apps-script/Code.gs` e `apps-script/Instalacion.gs` como tres archivos, y reemplaza `appsscript.json` por `apps-script/appsscript.json` (actívalo en **Configuración del proyecto › Mostrar el archivo de manifiesto "appsscript.json" en el editor**).
2. En el editor, ejecuta `crearEstructura` y acepta los permisos. Comprueba:
   - [ ] Existen las pestañas `Agentes`, `Convocatorias`, `Sugerencias`, `Listas` y `_cola` (esta última oculta).
   - [ ] **Archivo › Configuración** muestra la zona horaria `(GMT-05:00) Lima`.
   - [ ] La fila 1 está congelada y, al editar un encabezado o las columnas `id`, `fecha_envio`, `fecha_aprobacion` u `origen`, aparece una advertencia.
   - [ ] `estado`, `capa`, `verificado`, `tipo_entidad`, `presencia`, `departamento` (Agentes) y `tipo` (Convocatorias) tienen menú desplegable.
   - [ ] Hay 2 agentes y 1 convocatoria de ejemplo con `estado = aprobado` y `origen = carga inicial`.
   - [ ] Ejecutar `crearEstructura` otra vez no cambia nada (no duplica los ejemplos).
3. Ejecuta `instalarDisparadores`. En **Activadores** (reloj del menú izquierdo) aparecen `alEditar` (al editar la hoja) y `recordatorioAnual` (diario).
4. **Implementar › Nueva implementación › Aplicación web** (ejecutar como: yo; acceso: cualquier usuario). Copia la URL que termina en `/exec`.
5. Abre `<URL>?accion=datos` en el navegador:
   - [ ] Devuelve JSON con `generado`, `listas`, los 2 agentes y la convocatoria de ejemplo.
   - [ ] No aparecen `estado`, `origen`, `fechaEnvio`, `nombreProponente`, `emailProponente`, `notasModeracion` ni `motivoRechazo`.
6. Envía un `POST` válido (en la consola del navegador, con una dirección de correo tuya en `email_proponente`):

   ```js
   fetch('<URL>', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({
     tipo: 'agente', t0: Date.now() - 10000,
     datos: { nombre: 'Prueba', ofrece: ['Formación'], sectores: ['Música'], tipo_entidad: 'Centro cultural',
       presencia: 'Peruana', departamento: 'Lima', ciudad: 'Lima', descripcion: 'Agente de prueba.',
       nombre_proponente: 'Prueba', email_proponente: 'TU_CORREO', consentimiento: true }
   }) }).then(r => r.json()).then(console.log)
   ```

   - [ ] Responde `{ ok: true }`.
   - [ ] Aparece una fila nueva en `Agentes` con `estado = pendiente`, `id`, `fecha_envio`, `origen = formulario` y `capa = Perú`.
   - [ ] Llegan 2 correos: el aviso al moderador (con enlace que abre la fila) y el acuse al proponente.
7. Repite el `POST` añadiendo `sitio_web_2: 'x'` dentro de `datos`:
   - [ ] Responde `{ ok: true }` pero **no** se crea fila ni llegan correos.
8. Repite el `POST` con `ofrece: ['No existe']`:
   - [ ] Responde `{ ok: false, errores: { ofrece: … } }` y no se crea fila.
9. En la fila de prueba, cambia `estado` a `aprobado`:
   - [ ] Se escribe `fecha_aprobacion` con la fecha de hoy.
   - [ ] Llega el correo "Prueba ya está en Chicha" con enlace a `#/agente/<id>`.
   - [ ] `<URL>?accion=datos` ahora incluye el agente "Prueba".
10. Envía otro `POST` válido como el del paso 6 y, en esa fila nueva, escribe algo en `motivo_rechazo` y **después** cambia `estado` a `rechazado`:
    - [ ] Llega el correo de rechazo con el motivo.
11. Renombra un encabezado de `Agentes` (por ejemplo `ciudad` → `Ciudad`) (la edición vacía la caché) y abre `<URL>?accion=datos` dos veces:
    - [ ] Sigue devolviendo la versión anterior (con "Prueba").
    - [ ] Llega **1** correo "[Chicha] Revisa la estructura de la hoja" (no uno por consulta).
    - [ ] Restaura el nombre `ciudad`.
12. Recordatorio anual: en el editor ejecuta `recordatorioAnual`. Fuera del 5 de enero no envía nada (solo despacha la cola `_cola` si tiene filas).
