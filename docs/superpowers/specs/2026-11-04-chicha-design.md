# Chicha · Mapa de Emprendimiento — Especificación de diseño

**Fecha:** 2026-11-04
**Producto de:** Sunqu Jach'a (asociación civil sin fines de lucro, Perú, 2019)
**Responsable y moderador:** Alvaro Padilla Huamán
**Cuenta propietaria (hoja, script, avisos):** sunqujacha@gmail.com
**Estado:** diseño aprobado por partes en conversación; pendiente de revisión de este documento

---

## 1. Propósito

**Chicha — Mapa de Emprendimiento: Agentes para el arte, la cultura y la educación** es un directorio público y filtrable de los agentes del ecosistema creativo peruano: instituciones públicas, empresas y marcas, universidades, centros culturales, fundaciones, cooperación internacional, incubadoras, colectivos y espacios públicos.

Sirve a **emprendedores culturales** que necesitan responder "¿quién me puede dar financiamiento, formación, espacio, difusión…?" y a la vez es un producto institucional de Sunqu Jach'a, coherente con su misión de generar oportunidades y empleo en torno al arte y la cultura.

**Éxito significa:**
- Un emprendedor encuentra en menos de un minuto los agentes relevantes combinando qué necesita, su disciplina y su región.
- Cualquier persona puede proponer un agente o una convocatoria sin crear cuenta.
- El moderador aprueba desde una hoja de cálculo que ya sabe usar, avisado por correo.
- Costo de operación: cero.

## 2. Alcance

**Versión 1 (esta especificación)**
- Directorio de agentes del **Perú**: entidades peruanas y entidades extranjeras con sede o presencia en el Perú (embajadas, cooperación internacional, centros culturales extranjeros).
- Capa separada **Internacional**: oportunidades de Latinoamérica y el mundo abiertas a postulantes desde el Perú. Misma interfaz, sección propia.
- Sección **Convocatorias**: calendario cronológico por año.
- Formularios públicos moderados: añadir agente, añadir convocatoria, sugerir un cambio.

**Fase 2 (fuera de esta versión, pero prevista en los datos)**
- Vista de mapa geográfico (Leaflet + OpenStreetMap) usando `lat` / `lng`.

**Fuera de alcance**
- Cuentas de usuario, inicio de sesión, valoraciones o comentarios.
- Panel de administración propio (la hoja de cálculo cumple ese rol).
- Botones "Aprobar/Rechazar" dentro del correo (riesgo de aprobación accidental por escáneres de enlaces).

## 3. Taxonomía (fuente única: pestaña `Listas`)

Un agente tiene **uno o más** valores de *¿Qué ofrece?* y *Sector*, y **exactamente un** *Tipo de entidad*.

**¿Qué ofrece?** (primer filtro: es la pregunta con la que llega el emprendedor)
Financiamiento y fondos · Formación · Incubación y mentoría · Espacios y equipamiento · Difusión y circulación · Redes y contactos · Convocatorias y premios · Asesoría legal o técnica

**Sector**
Artes visuales · Artes escénicas · Música · Audiovisual · Editorial y literatura · Diseño y moda · Patrimonio · Artesanía · Educación · Emprendimiento e innovación · Cultura comunitaria

**Tipo de entidad**
Pública (Estado, gobierno regional, municipalidad) · Privada / empresa / marca · Universidad o instituto · Centro cultural · Fundación / ONG · Cooperación internacional / embajada · Incubadora / aceleradora · Colectivo / red · Espacio público

**Presencia**
Peruana · Extranjera con sede en el Perú · Internacional (sin sede en el Perú; solo capa Internacional)

**Departamento**
Los 24 departamentos del Perú + Provincia Constitucional del Callao.

Añadir o renombrar un valor en `Listas` lo propaga al formulario, a los filtros y a los menús desplegables de la hoja, sin tocar código.

## 4. Experiencia y estructura del sitio

Patrón: **directorio con filtros laterales** (dirección A de los bocetos).

### 4.1 Cabecera (fija)
Logotipo `CHICHA` + "por Sunqu Jach'a" · navegación: Explorar · Convocatorias · Internacional · Sobre Chicha · botón primario rojo **"+ Añadir"** (única acción destacada de la vista). Debajo, franja de colores del awayo.

### 4.2 Portada
- Título `CHICHA`, subtítulo "Mapa de emprendimiento", bajada con caja negra "AGENTES para el arte, la cultura y la educación en el Perú".
- Buscador (texto libre sobre nombre, descripción, ciudad).
- Accesos rápidos "¿Qué estás buscando?": un chip por cada valor de *¿Qué ofrece?*, que abre Explorar ya filtrado.
- Contadores: n.º de agentes, convocatorias abiertas, departamentos cubiertos.

### 4.3 Explorar
- **Barra lateral de filtros**, en orden: ¿Qué ofrece? → Sector → Tipo de entidad → Departamento → Presencia. Casillas múltiples; "ver más" cuando la lista es larga.
- **Lógica de filtros:** OR dentro de un mismo grupo, AND entre grupos. Ej.: (Financiamiento OR Formación) AND (Música) AND (Cusco).
- **Zona de resultados:** chips de filtros activos removibles + "Limpiar" · contador de resultados · orden (A–Z / más recientes) · el conmutador Lista ↔ Mapa **no aparece en v1**; se añade en la fase 2.
- **Tarjeta de agente:** franja superior del color del sector principal, nombre, sello de verificado si aplica, tipo · ciudad, etiquetas de *¿Qué ofrece?*.
- **Estado vacío:** "No hay agentes con estos filtros" + "Quitar el último filtro" + invitación a "Añadir un agente".
- **Estado en URL:** filtros, búsqueda y ficha abierta se reflejan en la URL (`#/explorar?ofrece=financiamiento&dep=cusco`) para compartir y para que "Atrás" funcione.

### 4.4 Ficha del agente
Panel lateral en escritorio, pantalla completa en móvil. Contenido: logo (o iniciales), nombre, tipo, ubicación, descripción (≤ 280 caracteres), etiquetas, web y redes, correo público, convocatorias del agente en el año en curso, enlace **"Sugerir un cambio"**. URL propia (`#/agente/<id>`).

### 4.5 Convocatorias
- Lista ordenada por fecha de cierre, agrupada por mes, con selector de año.
- Estado calculado automáticamente a partir de la fecha del día:
  - **Próxima:** hoy < `fecha_apertura`
  - **Abierta:** `fecha_apertura` ≤ hoy ≤ `fecha_cierre`; si faltan ≤ 14 días, muestra "cierra en N días"
  - **Cerrada:** hoy > `fecha_cierre`
  - Sin `fecha_apertura`: se considera abierta hasta el cierre.
- Filtros: "Solo abiertas", Sector, ¿Qué ofrece?, Tipo de convocatoria.
- Cada convocatoria enlaza a su agente y a sus bases (`enlace_bases`).

### 4.6 Internacional
Mismos componentes y filtros que Explorar, sobre los agentes con `capa = Internacional`. Aviso fijo: "Oportunidades abiertas a postulantes desde el Perú". Sus convocatorias aparecen en Convocatorias con una etiqueta "Internacional" y un filtro para incluirlas o excluirlas.

### 4.7 Sobre Chicha
Qué es, quién lo impulsa (Sunqu Jach'a, misión, lema "Juntos, construimos el Perú"), cómo se modera, cómo colaborar, aviso de privacidad.

### 4.8 Formulario "Añadir"
Modal en dos pasos. Primero: *¿Qué quieres sumar?* **Agente** o **Convocatoria**.

- **Agente:** nombre*, ¿qué ofrece?* (múltiple), sector* (múltiple), tipo de entidad*, presencia*, país (fijo "Perú" salvo presencia Internacional), departamento*, ciudad*, dirección, descripción* (contador 280), web, Instagram, Facebook, otras redes, correo público, logo (URL), tu nombre*, tu correo*, casilla de consentimiento*.
- **Convocatoria:** agente* (lista de agentes publicados con búsqueda; opción "no está en la lista → añadir agente primero"), título*, año*, tipo*, ¿qué ofrece?, sectores, descripción, monto (texto), enlace a bases*, fecha de apertura, fecha de cierre*, fecha de resultados, tu nombre*, tu correo*, consentimiento*.
- Etiquetas visibles (nunca solo placeholder), error junto al campo, botón "Enviar para revisión", confirmación "Recibimos tu propuesta. Te escribiremos cuando la revisemos."
- **Sugerir un cambio** (desde la ficha): qué dato cambia, valor propuesto, fuente, tu correo, consentimiento.

### 4.9 Móvil
Filtros como hoja inferior "Filtros (n)"; botón "+ Añadir" flotante abajo; ficha a pantalla completa. Probado a 375, 768, 1024 y 1440 px, sin scroll horizontal.

## 5. Identidad visual (dirección "Awayo")

Base: la marca Sunqu Jach'a (rojo, negro, blanco; palo seco condensada en mayúsculas; cajas tipográficas negras). Lo vibrante entra desde los textiles andinos, como franja y como código de color de sectores, sin invadir la lectura.

- **Tipografías:** Bebas Neue (titulares, mayúsculas, tracking amplio) · Work Sans 400/500 (texto, 16 px mínimo).
- **Colores base:** rojo Sunqu `#C8232C` (acción primaria, acentos) · negro `#141414` (texto, cajas) · blanco `#FFFFFF` (fondo).
- **Franja awayo:** `#C8232C` · `#F28C28` · `#F6C700` · `#1E9E5A` · `#1F6FB2` · `#6B3FA0` · `#D6246E` · `#141414`.
- **Color por sector** (franja de tarjeta y etiqueta; la etiqueta usa fondo claro del tono + texto oscuro del mismo tono para contraste AA; tonos finales se validan con verificador de contraste en la implementación):

| Sector | Tono base |
|---|---|
| Artes visuales | magenta `#D6246E` |
| Artes escénicas | rojo `#C8232C` |
| Música | naranja `#F28C28` |
| Audiovisual | morado `#6B3FA0` |
| Editorial y literatura | azul `#1F6FB2` |
| Diseño y moda | coral `#E8603C` |
| Patrimonio | terracota `#9C5B2E` |
| Artesanía | ocre `#C99A06` |
| Educación | verde `#1E9E5A` |
| Emprendimiento e innovación | amarillo `#F6C700` |
| Cultura comunitaria | turquesa `#0E8C8C` |

- **Nunca solo color:** cada sector y cada valor de *¿Qué ofrece?* lleva un ícono SVG (set Tabler o Lucide, trazo). Sin emojis como íconos.
- **Efectos:** planos, sin degradados ni sombras decorativas; transiciones 150–200 ms; se respeta `prefers-reduced-motion`.
- **Accesibilidad:** contraste ≥ 4.5:1 en texto, foco visible, navegación completa por teclado, `aria-label` en botones de solo ícono, objetivos táctiles ≥ 44 px.
- **Nombre de marca:** "Sunqu Jach'a" en texto corrido; el logotipo se usa tal cual ("SUNQU JACHA").
- Lo "chicha" fluorescente queda reservado para piezas de campaña (redes, lanzamiento), no para la interfaz.

## 6. Modelo de datos (Google Sheets)

Archivo **"Chicha – Base de agentes"** en el Drive de sunqujacha@gmail.com. Multivalores separados por `;`. Encabezados y columnas de control protegidos; `estado` y columnas de taxonomía con validación desplegable desde `Listas`.

### 6.1 Pestaña `Agentes`

| Grupo | Columna | Notas |
|---|---|---|
| Control | `id` | único, generado por el script (`ag-` + aleatorio corto) |
| | `estado` | pendiente · aprobado · rechazado · archivado |
| | `capa` | Perú · Internacional |
| | `verificado` | sí · no |
| | `fecha_envio`, `fecha_aprobacion` | ISO `AAAA-MM-DD` |
| | `origen` | formulario · carga inicial |
| Identidad | `nombre`, `descripcion` (≤ 280), `logo_url` | |
| Filtros | `ofrece` (multi), `sectores` (multi), `tipo_entidad` (uno), `presencia` | valores de `Listas` |
| Ubicación | `pais`, `departamento`, `ciudad`, `direccion`, `lat`, `lng` | `lat`/`lng` opcionales (fase 2) |
| Contacto público | `web`, `instagram`, `facebook`, `otras_redes`, `email_publico` | |
| **Privado** | `nombre_proponente`, `email_proponente`, `notas_moderacion`, `motivo_rechazo` | nunca se publica |

### 6.2 Pestaña `Convocatorias`
Una fila por **edición anual** (una convocatoria recurrente = una fila por año).

| Grupo | Columna |
|---|---|
| Control | `id` (`cv-…`), `estado`, `fecha_envio`, `fecha_aprobacion` |
| Vínculo | `agente_id` (debe existir y estar aprobado) |
| Contenido | `titulo`, `año`, `tipo` (fondo · premio · beca · residencia · formación · concurso · otro), `ofrece` (multi), `sectores` (multi), `descripcion`, `monto` (texto libre), `enlace_bases` |
| Fechas | `fecha_apertura`, `fecha_cierre`, `fecha_resultados` |
| **Privado** | `nombre_proponente`, `email_proponente`, `notas_moderacion`, `motivo_rechazo` |

### 6.3 Pestaña `Sugerencias`
`id`, `estado` (pendiente · aplicada · descartada), `fecha_envio`, `tipo_registro` (agente · convocatoria), `registro_id`, `campo`, `valor_propuesto`, `fuente`, `email_proponente` (privado), `notas_moderacion`. Las sugerencias no modifican datos automáticamente: el moderador las aplica a mano.

### 6.4 Pestaña `Listas`
Una columna por catálogo: `ofrece`, `sectores`, `tipos_entidad`, `presencia`, `departamentos`, `tipos_convocatoria`. Opcionalmente una columna `slug` por catálogo para URLs estables.

## 7. Arquitectura

```
[ Navegador ]  ──GET datos──▶  [ Apps Script (aplicación web) ]  ◀──lee/escribe──▶  [ Google Sheets ]
   GitHub Pages ──POST envío──▶        │
   (HTML/CSS/JS)                       └──MailApp──▶ sunqujacha@gmail.com / proponentes
```

- **Sitio estático** en GitHub Pages, organización `sunqujacha` → `https://sunqujacha.github.io/chicha/` (dominio propio opcional después).
- **HTML, CSS y JavaScript sin framework**, una sola página con enrutado por hash (`#/explorar`, `#/convocatorias`, `#/internacional`, `#/sobre`, `#/agente/<id>`).
- **Apps Script** vinculado a la hoja, desplegado como aplicación web ("ejecutar como: sunqujacha@gmail.com", "acceso: cualquiera").

### 7.1 Lectura: `GET ?accion=datos`
Devuelve JSON con solo registros `aprobado` y solo columnas públicas:

```json
{
  "generado": "2026-11-04T15:00:00Z",
  "listas": { "ofrece": [...], "sectores": [...], "tiposEntidad": [...], "presencia": [...], "departamentos": [...], "tiposConvocatoria": [...] },
  "agentes": [ { "id": "ag-x7k2", "capa": "Perú", "nombre": "...", "descripcion": "...", "ofrece": ["..."], "sectores": ["..."], "tipoEntidad": "...", "presencia": "...", "pais": "Perú", "departamento": "Cusco", "ciudad": "Cusco", "direccion": "...", "lat": null, "lng": null, "web": "...", "instagram": "...", "facebook": "...", "otrasRedes": "...", "emailPublico": "...", "logoUrl": "...", "verificado": true, "fechaAprobacion": "2026-11-10" } ],
  "convocatorias": [ { "id": "cv-a91f", "agenteId": "ag-x7k2", "titulo": "...", "anio": 2027, "tipo": "fondo", "ofrece": ["..."], "sectores": ["..."], "descripcion": "...", "monto": "...", "enlaceBases": "...", "fechaApertura": "2027-02-01", "fechaCierre": "2027-03-14", "fechaResultados": null } ]
}
```

- Respuesta en caché (`CacheService`, ~10 min); la caché se invalida al aprobar/editar un registro.
- El sitio guarda la última respuesta válida en `localStorage` y la muestra de inmediato mientras refresca (carga percibida instantánea; funciona si el script falla momentáneamente).

### 7.2 Escritura: `POST` (agente · convocatoria · sugerencia)
- Enviado como `text/plain` con cuerpo JSON para evitar la verificación previa de CORS.
- **Validación en servidor:** obligatorios presentes, longitudes, URLs y correos bien formados, valores de taxonomía existentes en `Listas`, `agente_id` existente y aprobado (convocatorias), consentimiento marcado.
- **Antispam:** campo trampa oculto (si viene lleno, se descarta en silencio), tiempo mínimo de llenado (≥ 4 s), límite global de envíos por hora con `CacheService`. Cloudflare Turnstile queda como mejora si aparece spam.
- Escribe la fila con `estado = pendiente`, `id` y `fecha_envio`; responde `{ ok: true }` o `{ ok: false, errores: { campo: mensaje } }`.
- El formulario conserva el borrador en `localStorage` hasta recibir `ok: true`.

### 7.3 Correos (MailApp, desde sunqujacha@gmail.com)

| Disparador | Destinatario | Contenido |
|---|---|---|
| Envío nuevo | moderador | Asunto `[Chicha] Nuevo agente: <nombre>` (o convocatoria/sugerencia), resumen y enlace directo a la fila |
| Envío nuevo | proponente | Acuse de recibo |
| `estado` → aprobado | proponente | "Ya está en Chicha" + enlace a la ficha; el script escribe `fecha_aprobacion` e invalida caché |
| `estado` → rechazado | proponente | Mensaje cordial + `motivo_rechazo` si existe |
| 5 de enero (disparador por tiempo) | moderador | Convocatorias del año anterior, para duplicar con fechas nuevas |

- Cambios de estado detectados con un disparador instalable `onEdit` sobre la columna `estado`.
- Límite de Gmail gratuito ≈ 100 destinatarios/día; si se supera, los avisos al proponente se encolan para el día siguiente y el aviso al moderador tiene prioridad. Recomendación: Google Workspace para Organizaciones sin Fines de Lucro (≈ 1.500/día).

### 7.4 Manejo de errores
- **Estructura de la hoja alterada** (falta una columna esperada): el script no publica datos nuevos, sirve la última versión válida en caché y avisa al moderador por correo una vez.
- **Script caído o lento:** el sitio muestra los datos guardados localmente con la nota "Mostrando datos guardados"; si no hay datos, mensaje claro con "Reintentar".
- **Envío fallido:** mensaje "No pudimos enviar tu propuesta. Tu texto sigue guardado; intenta de nuevo." sin perder lo escrito.

## 8. Privacidad
- Casilla obligatoria de consentimiento: el correo del proponente se usa solo para informarle del resultado de su propuesta (Ley N.º 29733, Protección de Datos Personales).
- Columnas privadas nunca salen de la hoja; la función de lectura usa una lista blanca de columnas públicas (no una lista negra).
- Aviso de privacidad en "Sobre Chicha".

## 9. Compartir y buscadores
Título y descripción por sección, imagen de vista previa (Open Graph) para WhatsApp y redes, `sitemap` básico. Las fichas usan URL con hash; si se necesita indexación por ficha, se evaluará en una versión posterior.

## 10. Estructura del repositorio

```
chicha/
  index.html
  assets/
    css/        estilos (tokens en :root, componentes)
    js/
      app.js        arranque y enrutado
      datos.js      carga, caché local, normalización
      filtros.js    lógica de filtrado y estado en URL (pura, testeable)
      convocatorias.js  cálculo de estado y agrupación (pura, testeable)
      vistas/       portada, explorar, ficha, convocatorias, sobre, formulario
    img/        logo, íconos, imagen OG
  apps-script/
    Code.gs       doGet, doPost, disparadores, correos
    appsscript.json
  plantilla/
    chicha-base.xlsx   hoja modelo con pestañas, listas y ejemplos
  tests/          pruebas de filtros.js y convocatorias.js (node --test)
  docs/
```

## 11. Pruebas y verificación
- **Automáticas** (`node --test`): combinaciones de filtros (OR/AND), búsqueda de texto con y sin tildes, estado de convocatorias en bordes de fecha (día de apertura, día de cierre, sin fecha de apertura, zona horaria de Lima), lectura/escritura del estado en la URL.
- **Apps Script:** se prueba contra una hoja de ensayo: envío válido, envío inválido, campo trampa, aprobación → correo + caché invalidada, columna faltante → aviso.
- **Manual antes de publicar:** 375 / 768 / 1024 / 1440 px; teclado de extremo a extremo; lector de pantalla en formulario y filtros; contraste de todos los colores de sector.

## 12. Lanzamiento
1. Crear la organización `sunqujacha` en GitHub y el repositorio `chicha`.
2. Crear la hoja desde la plantilla en el Drive de sunqujacha@gmail.com; pegar y desplegar el script; copiar la URL de la aplicación web a la configuración del sitio.
3. Carga inicial de agentes (`origen = carga inicial`, `estado = aprobado`).
4. Publicar en GitHub Pages.
5. Antes de difundir: verificar disponibilidad de dominio y posibles conflictos de marca "Chicha" en Indecopi.

## 13. Decisiones registradas
- Dirección de layout **A** (filtros laterales) sobre B (chips + mapa dividido).
- Base de datos **Google Sheets + Apps Script**; sitio en **GitHub Pages**. Airtable y Supabase descartados por costo/complejidad para la escala esperada (cientos a pocos miles de registros).
- Aprobación **cambiando `estado` en la hoja**, con enlace a la fila en el correo; sin botones de aprobación en el correo.
- Tres filtros principales (¿Qué ofrece?, Sector, Tipo) + Departamento y Presencia.
- Capa **Internacional** separada del directorio peruano.
- Convocatorias como **edición anual por fila**, con recordatorio el 5 de enero.
- Dirección visual **Awayo** sobre la marca Sunqu Jach'a; nombre **Chicha**.
