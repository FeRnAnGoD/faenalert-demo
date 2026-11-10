# Verificación local de la demostración funcional

Fecha: 9 de noviembre de 2026. Entorno local con datos sintéticos. Sin despliegue en nube.

## Estado verificado

| Área | Resultado |
| --- | --- |
| Frontend Angular | Compilación de producción correcta |
| API NestJS | Compilación TypeScript correcta |
| Pruebas unitarias | 7 de 7 correctas |
| Cliente de sesión frontend | 3 regresiones correctas: expiración 401, login rechazado y respuesta tardía de una sesión anterior |
| Navegador Chromium | 14 recorridos correctos: presentación/login, navegación por todos los módulos, catálogo de 19 faenas de referencia con imágenes locales cargadas y atribución, accesibilidad básica de controles, permisos de solo lectura, exportación CSV con filtro activo y sin correo/ID interno, creación de empresa/faena con reunión aislada, asignación de rol `VIEWER` y cambio entre espacios comprobando que el registro no aparece en otra faena, ciclo de inspección con cierre independiente, ciclo de reunión/acta/acuerdo, cronología de incidente ordenada y persistida con lectura por rol, capacitación con asistencia/evidencia persistidas, comisión con evidencia y revisión independiente, búsqueda global y navegación móvil; verifican además 14 rutas sin desbordamiento horizontal a 1440, 768 y 393 px; usan una base PostgreSQL efímera |
| Accesibilidad y responsive | Comprobación E2E de nombre accesible para controles visibles en login y rutas principales; menú móvil abre por teclado, cierra con Escape y devuelve el foco al activador. Las 14 rutas no exceden el ancho visible en escritorio, tablet y móvil. No sustituye medición de contraste ni pruebas con lector de pantalla |
| Exportación CSV local | Respeta búsqueda y filtros visibles, expone columnas explícitas, omite correo e IDs internos de integrantes y neutraliza celdas que Excel/Calc podría interpretar como fórmulas; 3 pruebas de serialización y 1 recorrido Playwright |
| Integración | Suite completa correcta en PostgreSQL aislado; 100 aserciones de plataforma y 49 de empresa, incluidos permisos cross-faena para evidencia/transición/verificación de acuerdos, migraciones/seed idempotentes, auditoría y benchmark |
| Dependencias de producción | `pnpm audit --prod --audit-level=moderate` sin vulnerabilidades conocidas al 9 de noviembre de 2026; CI falla ante avisos moderados o superiores; `multer` transitivo fijado en 2.5.0 para corregir [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) |
| Login y rutas | Login dividido visible en /; /gestion, /reuniones, /prevencion y /maqueta llevan a la misma aplicación |
| API local | Login de admin@demo.local y lectura del espacio de ejemplo correctos |
| Búsqueda global | `POST /api/v1/sites/:siteId/search` responde con resultados de todos los registros de la faena, respetando el acceso; prueba HTTP local correcta |
| Datos sintéticos | 1 faena, 12 integrantes, 3 reuniones, 6 acuerdos/acciones, 3 incidentes, 3 actas y 5 documentos |
| Stack Docker | PostgreSQL, migraciones, seed, API y frontend levantan en local |
| Respaldo y restauración | Dump custom producido por `scripts/backup.ps1`, listado válido con `pg_restore` y SHA-256; el mismo archivo se restauró en una base efímera y se compararon las 35 tablas públicas y sus filas; base de demo conservada |
| Interfaz | El acceso y el shell de trabajo parten de la maqueta aprobada; el shell incluye barra lateral y navegación por módulos |
| Integración continua | `.github/workflows/ci.yml` ejecuta auditoría de dependencias de producción y `pnpm verify` con PostgreSQL 17 y credenciales ficticias; el mismo comando pasó localmente |

El login usa la contraseña presente en SEED_PASSWORD dentro del .env raíz. No se copia ni se publica ese valor.

## Qué funciona en esta demostración

- Inicio de sesión contra la API y restauración de sesión local.
- Si la API devuelve 401 para una sesión vigente, vuelve al login, limpia el contexto y los datos autenticados en memoria, y conserva los borradores de acta guardados localmente. Las respuestas tardías de una sesión anterior no se aplican a una sesión nueva.
- Lectura del espacio de demostración e integrantes ficticios.
- Edición/creación de reuniones y miembros.
- Agenda y asistencia persistidas por API.
- Creación y edición de borradores de acta.
- Recorrido de reunión verificado en navegador: crear reunión, registrar asistencia y temas revisados, iniciar, escribir notas, generar un acta enlazada, guardar su versión, enviarla a revisión, crear un acuerdo asociado y comprobar los registros al volver a abrirlos tras recargar.
- Acuerdos relacionados con reuniones e inspecciones, con transiciones de estado y evidencia para verificación.
- Gestión de inspecciones integrada al espacio: creación, paginación, hallazgos, acciones y evidencia; verificador con permiso `review` separado de la interfaz de escritura.
- Ciclo de inspección verificado en navegador: crear inspección y hallazgo, asignar e iniciar una acción, guardar evidencia, solicitar revisión, cerrar con la cuenta verificadora y confirmar el cierre después de recargar.
- Lectura y edición básica de incidentes.
- Cronología textual de incidentes, ordenada por fecha del hecho, con autoría, control de acceso por faena y entradas inmutables.
- Cronología de incidente verificada en navegador: crear un evento sintético, añadir notas en orden inverso, comprobar orden cronológico y persistencia, e iniciar sesión como lector para confirmar lectura sin controles de escritura.
- Acciones vinculadas a un incidente que aparecen en el tablero común y usan evidencia y verificación independiente.
- Alta/edición de metadatos de documentos. Las descargas generadas se identifican como ejemplos.
- Alta, consulta, edición y exportación CSV de capacitaciones y comisiones, persistidas por la API en la faena seleccionada.
- Lista de participantes y asistencia pendiente/presente/ausente por capacitación, con versiones concurrentes y bitácora de evidencia textual.
- Acciones de comisión en el tablero común, asignadas a responsables con acceso de escritura en la faena, y con evidencia y revisión independiente.
- Acuerdos de reunión con evidencia textual append-only y revisión independiente; una cuenta verificadora distinta del responsable puede devolver el acuerdo o cerrarlo tras aprobarlo.
- Recorrido preventivo verificado en navegador: crear una capacitación, registrar participante/asistencia y evidencia textual; crear una comisión, avanzar su acción, aportar evidencia y cerrarla desde el tablero común con una cuenta revisora. Los datos quedan al recargar y el perfil verificador no obtiene controles de escritura.
- Recorrido de reunión verificado en navegador y API: aportar evidencia sintética al acuerdo, enviarlo a revisión, devolverlo, agregar información, aprobarlo con otra cuenta y confirmar el cierre después de recargar. El perfil verificador no puede editar el acuerdo ni verificar uno propio.
- Búsqueda global autenticada por faena en reuniones, actas, acuerdos, incidentes, inspecciones y hallazgos, documentos, capacitaciones, comisiones e integrantes. Devuelve como máximo ocho resultados y busca más allá de la primera página.
- Exportación CSV de la vista actual con filtros activos, columnas explícitas y neutralización de fórmulas; la exportación de integrantes excluye correo e identificadores técnicos.
- Preferencias de presentación guardadas localmente en el navegador.

## Límites pendientes del plan

- Guardar y servir adjuntos binarios de documentos o evidencia.
- Firma electrónica final y aprobación legal de actas.
- La solicitud de revisión de acta guarda el estado `IN_REVIEW`; aún no existe una cuenta revisora que apruebe o devuelva el acta. El flujo provisional de acuerdos usa evidencia textual sintética y una cuenta revisora distinta, pero su tipo de evidencia, aceptación y reglas de devolución deben validarse según la decisión D-21 antes de uso formal.
- Investigación de incidentes con etapas, clasificación, permisos específicos y medidas aprobadas; requieren validación funcional. La bitácora y las acciones vinculadas de la demo no son un expediente oficial.
- IA conectada a un modelo y analítica predictiva validada; el asistente actual usa respuestas locales.
- El benchmark de integración es una comprobación local de funcionalidad con datos sintéticos, no una prueba de carga ni una medida de capacidad. Acordar empresas/faenas, concurrencia, volúmenes, tiempos p95 y errores aceptables (D-24) antes de comprometer capacidad productiva.
- Carga binaria y retención de certificados/evidencias; la bitácora actual almacena solo descripciones.
- Definir y gestionar integrantes formales de comisión según el modelo operativo que acuerde producto.
- Revisión manual de contraste, lector de pantalla, zoom, movimiento reducido, fidelidad visual y uso real en celular/TV junto al cliente; las comprobaciones E2E actuales son humo funcional, no certificación WCAG.
- Medir el tiempo de respuesta de la búsqueda con volúmenes representativos de clientes; la consulta actual recorre registros por faena y no incorpora índices de texto especializados.
- El CSV actual se genera en el navegador y es una salida básica de la demo. Aún falta definir columnas oficiales (D-04) y, si se requiere exportación productiva, implementar autorización y auditoría en API, filtros del servidor y cobertura cross-faena.
- La ficha de Quebrada Blanca usa una imagen del kit de prensa de Teck cuyo registro no indica licencia abierta. Verificar autorización o sustituirla antes de difundir públicamente un video o material de la demo (D-23).
- OIDC, MFA, recuperación de cuenta y endurecimiento para usuarios o datos reales.
- El sistema es local. No se configuró un despliegue en nube.

## Reproducir localmente

Desde la raíz del repositorio, prepara el .env a partir de .env.example y establece claves locales. Luego ejecuta:

    docker compose --profile app up -d --build --wait

Abre http://127.0.0.1:8081/ en este entorno. El puerto se controla con WEB_PORT en .env. La API queda detrás del proxy local en /api.

Para detener los contenedores y conservar la base local:

    docker compose --profile app stop

Para ejecutar el recorrido de navegador, deja PostgreSQL local activo, prepara `.env` y ejecuta:

    pnpm exec playwright install --only-shell chromium
    pnpm test:e2e

El runner crea una base temporal, aplica migraciones y datos sintéticos, inicia API y Angular en puertos dedicados y elimina la base temporal al finalizar. Rechaza `NODE_ENV=production` y conexiones a PostgreSQL fuera de `localhost`; no modifica la base persistente de la demo.
