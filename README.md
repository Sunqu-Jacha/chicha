# Chicha · Mapa de Emprendimiento

Chicha es un directorio público y filtrable de agentes y convocatorias para el arte, la cultura y la gestión de proyectos con impacto social en el Perú, una iniciativa de Sunqu Jach'a. Es un sitio estático (HTML, CSS y JavaScript con módulos ES, sin frameworks ni paso de compilación) cuyos datos viven en una hoja de Google Sheets servida por un Google Apps Script. Las propuestas llegan por formulario y quedan pendientes hasta que se moderan.

## Correr en local y pruebas

- Sitio: sirve la carpeta tal cual con cualquier servidor estático, por ejemplo `npx serve .` o `python -m http.server 4173`, y abre `http://localhost:4173`. Los módulos ES no funcionan abriendo `index.html` con doble clic.
- Mientras `URL_SCRIPT` en `assets/js/config.js` esté vacío, el sitio no tiene datos reales ni envía formularios. `assets/datos-ejemplo.json` contiene datos de muestra.
- Pruebas: `npm test` (usa `node --test`, requiere Node 20 o superior y no tiene dependencias).

## Desplegar la hoja

1. Con la cuenta **sunqujacha@gmail.com**, crea una hoja de cálculo nueva en Google Sheets y abre **Extensiones › Apps Script**.
2. Pega como tres archivos `apps-script/Logica.gs`, `apps-script/Code.gs` y `apps-script/Instalacion.gs`, y reemplaza el contenido de `appsscript.json` por el de `apps-script/appsscript.json` (actívalo en **Configuración del proyecto › Mostrar el archivo de manifiesto "appsscript.json" en el editor**).
3. Ejecuta `crearEstructura` y acepta los permisos. Crea las pestañas, validaciones, listas y datos de ejemplo.
4. Ejecuta `instalarDisparadores` (crea `alEditar` y `recordatorioAnual`).
5. **Implementar › Nueva implementación › Aplicación web**: ejecutar como "yo", acceso "cualquier usuario". Copia la URL que termina en `/exec`.
6. Guarda esa URL: la pegarás en `assets/js/config.js` en el paso 5 de "Publicar en GitHub Pages", cuando el repositorio remoto ya exista.
7. Antes de dar por buena la hoja real, repite la checklist de la sección siguiente en una hoja de ensayo.

## Probar el script

Hazlo en una **hoja de ensayo** (no la real), con la cuenta sunqujacha@gmail.com.

1. Crea una hoja de cálculo nueva y abre **Extensiones › Apps Script**. Pega `apps-script/Logica.gs`, `apps-script/Code.gs` e `apps-script/Instalacion.gs` como tres archivos, y reemplaza `appsscript.json` por `apps-script/appsscript.json` (actívalo en **Configuración del proyecto › Mostrar el archivo de manifiesto "appsscript.json" en el editor**).
2. En el editor, ejecuta `crearEstructura` y acepta los permisos. Comprueba:
   - [ ] Existen las pestañas `Agentes`, `Convocatorias`, `Sugerencias`, `Listas` y `_cola` (esta última oculta).
   - [ ] **Archivo › Configuración** muestra la zona horaria `(GMT-05:00) Lima`.
   - [ ] La fila 1 está congelada y aparece una advertencia al editar un encabezado o una columna de control: `id`, `fecha_envio`, `fecha_aprobacion`, `aviso_enviado` y, solo en `Agentes`, `origen` (`Convocatorias` no tiene `origen`).
   - [ ] `estado`, `capa`, `verificado`, `tipo_entidad`, `presencia`, `departamento` (Agentes) y `tipo` (Convocatorias) tienen menú desplegable.
   - [ ] Hay 2 agentes de ejemplo con `estado = aprobado` y `origen = carga inicial`, y 1 convocatoria de ejemplo con `estado = aprobado`.
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
   - [ ] `aviso_enviado` queda en `aprobado`. Copia esa celda de `estado` y pégala sobre un rango que la incluya junto con el `estado` de un agente de ejemplo (ya aprobado): **no** llega ningún correo y `fecha_aprobacion` no cambia.
10. Envía otro `POST` válido como el del paso 6 y, en esa fila nueva, escribe algo en `motivo_rechazo` y **después** cambia `estado` a `rechazado`:
    - [ ] Llega el correo de rechazo con el motivo.
11. Renombra un encabezado de `Agentes` (por ejemplo `ciudad` → `Ciudad`) (la edición vacía la caché) y abre `<URL>?accion=datos` dos veces:
    - [ ] Sigue devolviendo la versión anterior (con "Prueba").
    - [ ] Llega **1** correo "[Chicha] Revisa la estructura de la hoja" (no uno por consulta).
    - [ ] Restaura el nombre `ciudad`.
12. Recordatorio anual: en el editor ejecuta `recordatorioAnual`. Este año no envía nada, porque `instalarDisparadores` marca el año en curso si ya pasó el 5 de enero; solo despacha la cola `_cola` si tiene filas. El primer recordatorio sale el próximo 5 de enero (o el primer día siguiente en que el disparador corra).
13. Recarga la hoja y escribe en una fila nueva de `Agentes` solo `nombre` y, después, `presencia`:
    - [ ] Aparece el menú **Chicha › Completar carga inicial**.
    - [ ] La fila queda con `id`, `fecha_envio`, `origen = carga inicial` y, al elegir la presencia, `capa`.
    - [ ] Las filas que ya tenían esos datos no cambian, ni al editarlas ni al usar el menú.

## Publicar en GitHub Pages

1. Todo lo que publiques (incluida la URL del script en `config.js`) debe estar commiteado en `main`.
2. La organización **Sunqu-Jacha** en GitHub ya tiene el repositorio **chicha**. Debe ser público para usar GitHub Pages en el plan gratuito.
3. Conecta este repositorio y sube la rama principal:
   ```
   git remote add origin https://github.com/Sunqu-Jacha/chicha.git
   git push -u origin main
   ```
4. En el repositorio: **Settings › Pages › Build and deployment**: fuente **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
5. Estando en `main`, pega la URL `/exec` del script en `assets/js/config.js` como valor de `URL_SCRIPT` y publica:
   ```
   git add assets/js/config.js
   git commit -m "config: URL del script"
   git push
   ```
6. El sitio queda en `https://sunqu-jacha.github.io/chicha/`. Esa URL ya está en `index.html` (`og:url`, `og:image`, canonical), `sitemap.xml`, `robots.txt` y `apps-script/Code.gs` (`URL_SITIO`, usada en los correos); si cambia, actualízala en los cuatro.

## Actualizar después

- **Script:** editar el código en Apps Script no cambia la URL `/exec` publicada. Tras cada cambio: **Implementar › Gestionar implementaciones › editar (lápiz) › Versión: Nueva versión › Implementar**. Si no, la URL sigue sirviendo el código viejo.
- **Sitio:** haz commit en `main` y `git push`; GitHub Pages lo publica en uno o dos minutos.

## Moderar

Todo lo que llega por formulario entra a `Agentes` o `Convocatorias` con `estado = pendiente`. Abre la fila (el correo de aviso trae el enlace) y:

- **Aprobar**: cambia `estado` a `aprobado`. Se escribe `fecha_aprobacion`, el sitio lo muestra tras vencer la caché (hasta 10 minutos) y el proponente recibe un correo con el enlace a su ficha. Marca `verificado = sí` solo si comprobaste los datos con la entidad.
- **Rechazar**: escribe primero el motivo en `motivo_rechazo` y **después** cambia `estado` a `rechazado`; el correo al proponente incluye el motivo.
- **Sugerencias de cambio** (pestaña `Sugerencias`): no modifican nada solas. Revisa cada una y aplica el cambio a mano en la fila del agente. Quien la envía recibe solo el acuse, no un correo con el resultado.
- No edites `id`, `fecha_envio`, `fecha_aprobacion`, `aviso_enviado` ni `origen`. Las columnas del proponente y de moderación nunca salen de la hoja hacia el sitio.

## Carga inicial

Para cargar a mano los agentes y convocatorias del lanzamiento, con los disparadores ya instalados:

1. Recarga la hoja: aparece el menú **Chicha**.
2. Borra las filas de ejemplo que creó `crearEstructura` (2 en `Agentes` y 1 en `Convocatorias`).
3. En `Agentes`, llena una fila por agente: `estado = aprobado`, `nombre`, `descripcion`, `ofrece` y `sectores` (varios valores separados por `;`), `tipo_entidad`, `presencia`, `pais`, `departamento`, `ciudad` y los enlaces que tenga. Deja vacíos `id`, `capa`, `origen` y `fecha_envio`.
4. Al escribir o pegar, el script completa esas cuatro columnas: `id`, `fecha_envio` y `origen = carga inicial` en cuanto hay `nombre`, y `capa` en cuanto hay además `presencia`. Solo llena celdas vacías: nunca cambia una fila que ya tiene esos datos. Si corriges la `presencia` después, corrige también la `capa`.
5. Para repasar todas las filas de una vez (por ejemplo, si algo se pegó antes de instalar los disparadores), usa **Chicha › Completar carga inicial**.
6. En `Convocatorias`, llena `estado = aprobado`, `agente_id` (copia el `id` ya generado del agente), `titulo`, `año`, `tipo`, `enlace_bases` y `fecha_cierre`, más lo opcional. El script completa `id` y `fecha_envio` en cuanto hay `titulo`.

No se publica una fila sin `id`, una convocatoria sin `año` o `fecha_cierre` válidos, ni una convocatoria cuyo agente no esté aprobado.

## Añadir valores a las listas

Las opciones de los menús y casillas (qué ofrece, sectores, tipos de entidad, presencia, departamentos, tipos de convocatoria) están en la pestaña `Listas`, una columna por lista. Añade el nuevo valor al final de la columna correspondiente: aparece en el sitio y en los formularios tras vencer la caché. Un valor nuevo de sector necesita además su tono en `assets/css/tokens.css` (`--sector-<slug>`, `-claro` y `-oscuro`, con contraste mínimo 4.5:1); si no, la franja del agente sale en negro. No cambies el nombre de un valor ya usado sin actualizar las filas que lo contienen.

## Créditos

Los íconos provienen de [Tabler Icons](https://tabler.io/icons) (licencia MIT), set outline v3.19.0.
Las tipografías Bebas Neue y Work Sans provienen de [Google Fonts](https://fonts.google.com) (licencia SIL Open Font License).
