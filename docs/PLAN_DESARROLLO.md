# Plan maestro de desarrollo FAENALERT Platform

**Fecha de elaboración:** 5 de noviembre de 2026  
**Estado:** documento de planificación inicial. La nota de que aún no existían backend y base de datos corresponde a la fecha de elaboración y quedó obsoleta: esta rama ya incluye API NestJS, migraciones PostgreSQL y flujos integrados. Para el estado actual, consultar el [README](../README.md) y la [verificación local](VERIFICACION_LOCAL.md).<br>

### Corte actual: maqueta funcional en entorno local (9 de noviembre de 2026)

La entrega visible parte del login aprobado y conduce al mismo espacio de trabajo con barra lateral; las URL heredadas son alias y no aplicaciones distintas. El frontend principal usa la API y PostgreSQL Docker para cargar datos sintéticos. El entorno local permite administrar empresas/faenas y sus accesos, y recorrer reuniones, integrantes, actas, acuerdos/acciones, incidentes, documentos, capacitaciones y comisiones. Las capacitaciones admiten lista de participantes, asistencia y bitácora textual; las comisiones e incidentes admiten acciones conectadas al tablero; las inspecciones permiten llegar de hallazgos a acciones verificadas. Los incidentes admiten una cronología descriptiva append-only y tareas enlazadas, pero no un proceso formal aprobado ni medidas oficiales. Esto materializa una parte del plan, no da por cerradas sus fases: siguen pendientes adjuntos reales, firma, IA conectada, flujos operativos validados, endurecimiento para clientes, revisión integral de accesibilidad/diseño y aceptación del cliente.
**Repositorio:** privado; la maqueta Angular existente se conserva en apps/web.  
**Stack indicado por el propietario:** Angular, NestJS sobre Node.js, PostgreSQL y Tauri.

La auditoría funcional de Vercel está documentada en [AUDITORIA_MAQUETA_VERCEL.md](AUDITORIA_MAQUETA_VERCEL.md). El alcance inicial del flujo de prevención está detallado en [ALCANCE_PRIMER_FLUJO_PREVENCION.md](ALCANCE_PRIMER_FLUJO_PREVENCION.md). El despliegue Vercel es una referencia visual; no se ha confirmado su SHA ni conectado su infraestructura al backend. Desde el 9 de noviembre, el módulo de espacios incorpora administración de empresas, faenas, períodos iniciales, asignación de cuentas existentes y revocación auditable; consultar [API_LOCAL.md](API_LOCAL.md) para rutas y permisos.

---

## 1. Resumen ejecutivo

El objetivo es evolucionar la maqueta de FAENALERT hacia una plataforma que permita a empresas y faenas gestionar de forma trazable el trabajo preventivo de sus Comités Paritarios. El producto debe conservar la continuidad del equipo y la información, y apoyar la gestión de integrantes, reuniones, actas, acuerdos, documentos, inspecciones, capacitaciones, comisiones e investigaciones.

La maqueta actual es la fuente inicial para descubrir pantallas y flujos. Sus registros son ficticios y se guardan en el navegador; no constituyen reglas aprobadas, persistencia central ni controles de seguridad. Como no se entregará documentación adicional, las decisiones deducidas de la maqueta deben quedar identificadas como supuestos hasta que el equipo responsable las acepte.

La entrega del 9 y 10 de noviembre debe tratarse como un hito de demostración. No es realista ni seguro comprometer una plataforma completa con autenticación, aislamiento entre empresas, documentos, seis módulos operativos, Excel, PDF, Tauri y analítica predictiva en ese plazo. El objetivo inmediato es demostrar el diseño y el alcance, y si el equipo puede comenzar a programar de inmediato, mostrar un flujo técnico integrado reducido.

**Estimación de planificación:** 6–9 semanas para un MVP web con 2–3 personas dedicadas, desde el cierre de alcance; añadir aproximadamente 1–2 semanas para empaquetado Tauri, piloto y endurecimiento. Analítica Medallón, sensores, predicción y grafo son una fase posterior. La estimación se revisa después de auditar la maqueta y confirmar disponibilidad del equipo.

---

## 2. Objetivo general y resultados esperados

### Objetivo general

Proveer una herramienta segura y auditable para organizar la gestión preventiva por empresa, contrato y faena, conservando la historia de los equipos y permitiendo dar seguimiento desde la detección de una condición hasta el cierre de una medida.

### Resultados de producto

1. Un usuario autorizado solo ve las empresas, faenas y registros que le corresponden.
2. La composición del comité, sus integrantes, roles y períodos conserva historial; los cambios no borran versiones anteriores.
3. Reuniones, actas, documentos, inspecciones, capacitaciones, comisiones e investigaciones quedan organizados por faena y con responsables.
4. Los hallazgos se pueden convertir en acciones con dueño, prioridad, fecha, estado y evidencia de cierre.
5. Excel permite recibir y entregar información mediante plantillas, validaciones e informe de errores.
6. Los informes PDF son legibles, identifican filtros y período y respetan permisos.
7. Un tablero de TV muestra indicadores agregados, de solo lectura, sin datos personales innecesarios.
8. La interfaz deriva de la maqueta, con continuidad visual y buena adaptación a escritorio, celular y pantalla grande.
9. La aplicación de escritorio Tauri consume la misma API y no guarda claves del servidor.

### Objetivos técnicos

- Mantener los registros operacionales en PostgreSQL con claves, restricciones y migraciones versionadas.
- Centralizar reglas de negocio y autorización en NestJS; Angular y Tauri no son fronteras de seguridad.
- Registrar acciones sensibles y cambios relevantes en una bitácora.
- Separar documentos y adjuntos del código y de las respuestas públicas; usar almacenamiento privado.
- Diseñar el dominio para generar analítica posteriormente, sin construir infraestructura predictiva antes de tener datos fiables.

---

## 3. Alcance y fronteras del proyecto

### Incluido en el MVP

- Empresas, contratos/faenas y asignación de usuarios a esos espacios.
- Identidad y acceso por roles; cierre de sesión y expiración.
- Comités, períodos, integrantes, representación, titularidad y reemplazos.
- Reuniones, agenda, asistencia, actas versionadas y acuerdos.
- Documentos: metadatos, permisos, carga/descarga segura y revisión de versión.
- Inspecciones, hallazgos y acciones correctivas/preventivas.
- Capacitaciones: actividad, participantes, fecha, evidencia y estado.
- Comisiones de trabajo y sus acuerdos/acciones.
- Accidentes/incidentes e investigación con cronología, evidencias y medidas.
- Búsqueda, filtros y paginación.
- Importación/exportación Excel con plantillas aprobadas.
- Informes PDF básicos por faena y rango de fechas.
- Tablero de TV de solo lectura con datos sintéticos en demostración y agregados autorizados en operación.
- Instalador de escritorio Tauri si el piloto requiere aplicación de escritorio y el entorno de compilación está disponible.

### Aplazado o fuera del primer MVP

- Votación electrónica: no se prioriza en la primera entrega; conservar el registro documental del proceso que corresponda y no sustituir una elección reglamentaria por una encuesta. El DS 44 establece requisitos específicos para las elecciones del Comité Paritario y para medios electrónicos; validar el alcance con asesoría laboral antes de implementar votación digital. [Decreto 44, BCN](https://www.bcn.cl/leychile/navegar?i=1205298)
- Modelo predictivo de riesgos.
- Ingesta en tiempo real de sensores y decisiones de evacuación automáticas.
- Base de datos de grafos.
- Lakehouse Medallón completo y almacenamiento frío histórico.
- Firma electrónica con validez legal hasta elegir proveedor y flujo.
- Asistente con IA conectada a datos reales.
- Reemplazo del sitio público Wix/RISKS 80. Este repositorio corresponde a la plataforma operativa; el sitio público debe mantenerse separado. No colocar Bow-Tie completo ni datos privados de la plataforma en el CMS público.
- Funcionamiento offline con sincronización en Tauri, salvo que se confirme como requisito de terreno.

### Regla de demostración

Todo dato sintético, indicador calculado sobre ejemplos y contenido ilustrativo debe identificarse como demostrativo. No introducir información real de trabajadores, salud, incidentes ni credenciales en la maqueta o en la pantalla de TV.

---

## 4. Hito del 9–10 de noviembre de 2026

El hito se propone como demostración y definición de alcance, no como salida a producción.

### Lunes 9: demostración de producto y alcance

- Recorrer la landing y el panel actual en Vercel.
- Mostrar los módulos que ya existen y señalar visualmente los módulos pendientes.
- Presentar el mapa de navegación y los flujos priorizados.
- Mostrar datos explícitamente ficticios.
- Acordar qué partes del flujo son requisitos y cuáles son supuestos deducidos.
- Presentar el stack, el modelo inicial y el calendario completo.

**Entregable:** maqueta de referencia navegable, mapa de pantallas, alcance del MVP y lista de decisiones abiertas.

### Martes 10: demostración técnica acotada

Si programación empieza inmediatamente y hay 2–3 personas disponibles:

- Levantar estructura inicial NestJS y PostgreSQL local.
- Definir migración mínima para empresa/faena, comité e integrantes.
- Implementar un recorrido de punta a punta reducido: iniciar sesión de demostración, seleccionar faena, consultar comité y crear un registro de inspección/hallazgo.
- Conectar Angular a la API en ambiente local o de desarrollo.
- Mostrar el contrato OpenAPI y el plan de seguridad.

**Entregable:** prueba técnica de integración, no plataforma terminada. Si el backend no alcanza a integrarse, entregar el modelo, contrato y secuencia técnica sin presentarlos como software funcional.

**No comprometer para el 10:** autenticación de producción, permisos auditados, seis módulos terminados, migración real, Tauri firmado, sincronización offline, predicción, votación electrónica ni despliegue con datos reales.

---

## 5. Personas usuarias y permisos iniciales

Los nombres finales de roles se validan durante el levantamiento.

| Rol propuesto | Permisos iniciales |
|---|---|
| Administrador de plataforma | Configuración técnica y soporte; acceso a datos solo bajo procedimiento auditado. |
| Administrador de empresa | Gestiona usuarios y faenas dentro de su empresa. |
| Administrador de faena / prevención | Gestiona el comité y los módulos preventivos de las faenas asignadas. |
| Presidencia / secretaría del comité | Gestiona reuniones, integrantes, actas, documentación y acuerdos según atribuciones aprobadas. |
| Integrante del comité | Consulta información de su faena y participa en tareas autorizadas. |
| Responsable de acción | Consulta y actualiza las acciones asignadas; no administra el comité completo. |
| Auditor / consulta | Lectura de datos permitidos y exportaciones autorizadas; sin edición. |
| Pantalla TV | Acceso de solo lectura a métricas agregadas, sin datos personales ni descargas. |

Principio: conceder el menor privilegio necesario. Cada solicitud se autoriza en NestJS verificando usuario, empresa, faena y acción; ocultar un botón en Angular no basta.

---

## 6. Flujos operacionales que deben quedar definidos

### 6.1 Empresa y faena

1. Crear empresa.
2. Crear contrato/faena bajo la empresa.
3. Asignar usuarios a empresa/faena y otorgar roles.
4. Crear período del Comité Paritario.
5. Registrar integrantes, representación, calidad, fechas y suplencias.
6. Cerrar período sin borrar el historial anterior.

### 6.2 Inspección a acción

1. Crear inspección por faena, área, fecha, responsable y lista de verificación.
2. Registrar observaciones y evidencia.
3. Clasificar hallazgo con taxonomía aprobada, sin inventar calificaciones predictivas.
4. Crear acción preventiva/correctiva con responsable y fecha comprometida.
5. Registrar avances, evidencia y cambios de estado.
6. Verificar cierre con fecha, responsable y respaldo.
7. Incluir historial en reporte PDF y exportación permitida.

### 6.3 Reunión, acta y acuerdos

1. Crear reunión, agenda, fecha, participantes y modalidad.
2. Registrar asistencia y notas.
3. Convertir acuerdos en acciones asignadas.
4. Generar acta borrador.
5. Revisar y aprobar mediante un flujo que aún debe definirse.
6. Conservar borradores, versión aprobada, autoría, fechas y cambios; nunca sobrescribir un acta aprobada.

### 6.4 Investigación

1. Registrar evento con hechos observados, ubicación, fecha y clasificación pendiente de validación.
2. Asignar investigador y participantes autorizados.
3. Mantener cronología, fuentes y evidencias con control de acceso.
4. Separar información personal o de salud de los hechos operacionales.
5. Registrar causas y medidas únicamente conforme al método aprobado.
6. Dar seguimiento a acciones y cerrar el expediente con auditoría.

### 6.5 Documentación y capacitaciones

- Identificar tipo, código, dueño, fecha, versión, vigencia, faena, confidencialidad y vencimiento.
- Controlar quién puede ver, reemplazar, aprobar, descargar y eliminar.
- Asociar capacitación, convocatoria, contenido, participantes, asistencia y evidencia.
- Avisar vencimientos mediante notificaciones definidas; no enviar correos desde el navegador.

### 6.6 Excel, PDF y TV

- Excel importado pasa primero por vista previa; mostrar filas válidas, errores y duplicados antes de confirmar.
- No reemplazar registros vigentes de forma silenciosa; cada importación queda identificada y auditable.
- Exportaciones incluyen filtros, fecha, empresa/faena y usuario que la solicitó.
- PDF usa plantillas y encabezados aprobados; separar informe de trabajo de acta oficial.
- TV opera con sesión de solo lectura, vista de pantalla completa, tiempos de expiración y valores agregados. En demostración, todos los datos deben decir “Datos de demostración”.

---

## 7. Modelo de datos inicial

El siguiente mapa es lógico; se normaliza y valida antes de crear las migraciones.

### Entidades maestras

- Empresa / tenant.
- Contrato o faena.
- Usuario.
- Rol y permiso.
- Relación usuario–empresa/faena.
- Área o ubicación operativa.
- Período del Comité Paritario.
- Persona.
- Integrante del comité con representación, cargo, calidad, vigencia y reemplazo.

### Entidades de operación

- Reunión, tema de agenda, asistencia y acta/versiones.
- Acuerdo/acción, responsable, prioridad, fecha, estado y evidencia.
- Documento, metadatos, versión, ubicación privada y permisos.
- Inspección, pregunta/checklist, resultado, hallazgo y clasificación.
- Capacitación, sesión, asistencia y evidencia.
- Comisión, integrantes, tareas y acuerdos.
- Evento/accidente/incidente, cronología, investigador, evidencia, causa y medida.
- Solicitud de importación, lote, fila, validación, error y resultado.
- Informe generado y filtro aplicado.
- Notificación.
- Evento de auditoría.

### Reglas de integridad

- Registros de una empresa/faena llevan tenantId/siteId verificable en servidor.
- Claves externas impiden referencias a personas, comités o sitios ajenos.
- Las relaciones históricas tienen vigencia desde/hasta; no se elimina el historial para “actualizar” el estado.
- Los documentos aprobados, actas y cambios sensibles se versionan.
- Las transiciones de estado se validan en NestJS.
- IDs internos secuenciales no se exponen como mecanismo de autorización.

---

## 8. Arquitectura técnica de partida

### Aplicación

- Angular: interfaz web y responsive.
- NestJS sobre Node.js: API REST, identidad, autorización, validaciones, reglas de negocio, auditoría y OpenAPI.
- PostgreSQL: datos transaccionales y restricciones relacionales.
- Tauri: contenedor de escritorio que carga la interfaz Angular y consume la misma API.
- Almacenamiento de objetos privado: adjuntos; decidir proveedor y políticas antes de implementar cargas.
- GCP: proveedor candidato según los apuntes; validar proyecto, propietarios, región, servicios, presupuesto y secretos antes de configurarlo.

### Datos analíticos

- Mantener el núcleo operacional relacional en 3FN.
- Separar la futura canalización analítica: Bronce conserva la entrada controlada; Plata limpia y valida; Oro publica agregados y métricas.
- Un esquema dimensional estrella puede atender tableros e informes sobre la capa Oro.
- La arquitectura Medallón es una organización progresiva de calidad de datos en un lakehouse, no una sustitución del modelo transaccional. [Documentación Medallion Lakehouse](https://docs.databricks.com/aws/en/lakehouse/medallion)
- Evaluar grafo cuando exista una consulta concreta de dependencias de riesgos que no sea razonable atender con relaciones y consultas actuales.
- Los indicadores o alertas deben dar apoyo a decisiones humanas. No emitir órdenes de evacuación automáticas por un trigger de base de datos.

---

## 9. Plan de trabajo detallado

La tabla siguiente supone 2–3 personas técnicas con dedicación sostenida. Las duraciones son rangos y algunas líneas se ejecutan en paralelo.

### Fase 0 — Preparar proyecto y gobernanza (0.5–1 día)

- F0.1 Confirmar propietario del producto y persona que acepta el alcance.
- F0.2 Definir canal de decisiones y registro de acuerdos.
- F0.3 Mantener repositorio privado, rama principal protegida y ramas de trabajo.
- F0.4 Definir política de commits, revisión y versionado.
- F0.5 Separar variables locales, desarrollo, staging y producción.
- F0.6 Confirmar que el código copiado de la maqueta no contiene credenciales ni vínculo accidental a Vercel.
- F0.7 Crear registro de riesgos y decisiones.
- **Aceptación:** cada cambio tiene responsable; secretos no están en el repositorio; el repo de maqueta queda intacto.

### Fase 1 — Auditoría de la maqueta y alcance (2–3 días)

- F1.1 Recorrer landing, acceso, selección de faena y cada una de las once secciones actuales.
- F1.2 Registrar para cada pantalla propósito, campos, acciones, validaciones y rutas de salida.
- F1.3 Marcar qué interacciones funcionan localmente y cuáles son solo simulación.
- F1.4 Revisar DemoRepository, localStorage, modelos y estado ficticio.
- F1.5 Mapear elementos actuales: reuniones, actas, acuerdos, integrantes, accidentes, documentos, reportes, asistentes y configuración.
- F1.6 Comparar con los requisitos pendientes: inspecciones, capacitaciones, comisiones y vistas de TV.
- F1.7 Etiquetar cada punto como confirmado por maqueta, supuesto o pendiente de decisión.
- F1.8 Definir el recorrido principal del MVP.
- F1.9 Preparar criterios de aceptación por pantalla y módulo.
- F1.10 Confirmar qué significa “conservar al equipo”: integrantes, roles, historial o importación de registros existentes.
- **Entregables:** inventario de pantallas, mapa de flujos, backlog priorizado, límites de la demo y preguntas bloqueantes.

### Fase 2 — UX, accesibilidad y modelo funcional (3–5 días)

- F2.1 Mantener tokens de color y tipografía visual de la maqueta; cotejar con las libretas visibles disponibles.
- F2.2 No inventar un manual de marca si los originales no están; registrar supuestos de identidad.
- F2.3 Diseñar pantallas ausentes: inspecciones, capacitaciones, comisiones, investigaciones y TV.
- F2.4 Crear estados de carga, vacío, error, sin permiso y éxito.
- F2.5 Definir diseño de tabla/ficha para móvil, escritorio y TV.
- F2.6 Especificar formularios, campos requeridos, mensajes de validación y confirmación de acciones destructivas.
- F2.7 Definir flujos de revisión/aprobación de acta, inspección e investigación.
- F2.8 Preparar textos claros para datos teóricos y estados no implementados.
- F2.9 Revisar navegación por teclado, foco, contraste y lector de pantalla.
- **Aceptación:** cada función prioritaria cuenta con pantalla, estados, permisos visibles y criterio de aceptación antes de programar.

### Fase 3 — Arquitectura y contratos de datos (3–5 días)

- F3.1 Definir límites de tenant, empresa, contrato y faena.
- F3.2 Definir roles y permisos en una matriz de acceso recurso–acción–rol.
- F3.3 Crear diagrama entidad–relación conceptual.
- F3.4 Resolver relación entre Persona, Usuario, Integrante del Comité y Responsable.
- F3.5 Definir claves, borrado lógico, vigencias, versionado y auditoría.
- F3.6 Decidir ORM/migraciones de PostgreSQL; justificar la elección en una decisión técnica.
- F3.7 Versionar contrato API bajo /api/v1.
- F3.8 Definir paginación, filtros, fechas, errores, correlación/requestId y concurrencia.
- F3.9 Clasificar campos personales, operacionales, confidenciales y publicables.
- F3.10 Definir retención, respaldo, restauración y registro de accesos.
- **Aceptación:** esquema revisado, contratos OpenAPI generables y permisos verificables en cada endpoint.

### Fase 4 — Fundaciones del sistema (1 semana)

- F4.1 Reorganizar Angular en rutas y módulos por dominio; conservar una ruta de transición desde la maqueta.
- F4.2 Crear cliente HttpClient, manejo común de sesión, errores y carga.
- F4.3 Crear NestJS con configuración por entorno, validación de DTO y documentación OpenAPI.
- F4.4 Crear conexión PostgreSQL solo en servidor.
- F4.5 Configurar migraciones reproducibles y datos sintéticos de desarrollo.
- F4.6 Crear endpoint de salud y registro estructurado de errores.
- F4.7 Crear pipeline mínimo de integración continua: formato, análisis estático y compilación.
- F4.8 Configurar CORS/TLS y límites de payload conforme a ambientes.
- F4.9 Prohibir secretos en frontend; cargar secretos de backend desde el gestor de entorno.
- F4.10 Preparar ambientes local y staging; producción queda bloqueada.
- **Aceptación:** Angular consume API de desarrollo; migraciones reconstruyen DB vacía y se pueden aplicar sin datos manuales.

### Fase 5 — Identidad, empresas, faenas y comité (1–1.5 semanas)

- F5.1 Implementar identidad real con proveedor elegido; no reutilizar el login de maqueta.
- F5.2 Definir invitación, recuperación, expiración y baja de usuario.
- F5.3 Implementar verificación de pertenencia al tenant y a faena en cada consulta.
- F5.4 Crear empresa, contrato/faena, ubicación y estados.
- F5.5 Implementar comité por faena y período.
- F5.6 Crear personas e integrantes con representación, rol de comité, titular/suplente, fechas y reemplazo.
- F5.7 Cargar únicamente datos sintéticos inicialmente.
- F5.8 Añadir bitácora de creación, edición, cambios de rol y cierre de período.
- F5.9 Migrar datos reales solo tras autorización y mapeo revisado.
- **Aceptación:** usuario A no puede consultar ni modificar sitio B manipulando la URL o el payload; cambios de composición conservan historial.

### Fase 6 — Gestión del Comité: reuniones, actas y acciones (1 semana)

- F6.1 Implementar reuniones, agenda, lugar/modalidad y fecha.
- F6.2 Registrar asistencia con usuario y estado.
- F6.3 Guardar notas sin perder cambios concurrentes.
- F6.4 Generar borrador de acta desde reunión.
- F6.5 Implementar revisión y nueva versión; no sobrescribir acta aprobada.
- F6.6 Crear acuerdos con responsable, prioridad, fecha y estado permitido.
- F6.7 Añadir evidencia de cumplimiento y cierre.
- F6.8 Hacer filtros y búsquedas por faena, responsable y estado.
- F6.9 Sustituir la persistencia local por servicios HTTP.
- **Aceptación:** flujo reunión → acta → acuerdo → evidencia se completa con auditoría e historial.

### Fase 7 — Módulos preventivos (1.5–2 semanas)

- F7.1 Inspecciones: plantillas versionadas, área, fecha, inspector, respuestas y estado.
- F7.2 Hallazgos: severidad según catálogo aprobado, descripción, evidencia y referencia a inspección.
- F7.3 Acciones: responsable, vencimiento, estado, comentarios, evidencia y verificación de cierre.
- F7.4 Capacitaciones: actividad, plan, sesión, asistencia y evidencia.
- F7.5 Comisiones: objetivo, miembros, reuniones, acuerdos y tareas.
- F7.6 Incidentes: registro de hechos, fecha, lugar, tipo y clasificación validada.
- F7.7 Investigaciones: equipo, cronología, antecedentes, causas y medidas, con acceso restringido.
- F7.8 Documentos: metadatos, clasificación, vigencia, versión, permisos y vínculo privado.
- F7.9 Asociar todos los registros a empresa/faena y, cuando aplique, a reunión/acción.
- F7.10 Añadir validaciones del lado servidor y bitácora.
- **Aceptación:** los módulos guardan, consultan y actualizan por API; ninguna pantalla reporta un adjunto guardado si no existe almacenamiento real.

### Fase 8 — Excel, PDF y notificaciones (4–7 días)

- F8.1 Acordar columnas de plantillas Excel por entidad y versión.
- F8.2 Validar encabezados, tipos, fechas, claves de relación y tamaño de archivo.
- F8.3 Importar a una zona temporal; mostrar vista previa y errores por fila.
- F8.4 Confirmar lote en transacción; definir detección de duplicados y rollback.
- F8.5 Guardar usuario, fecha, archivo de origen y resultado del lote.
- F8.6 Exportar columnas autorizadas, filtros y resumen del conjunto exportado.
- F8.7 Diseñar PDF de acta y PDF de reporte como productos diferentes.
- F8.8 Incluir empresa/faena, período, versión, generación y clasificación.
- F8.9 Definir si PDF se genera en API o frontend; preferir servidor para plantillas consistentes y permisos.
- F8.10 Definir notificaciones; evitar PII en asunto/cuerpo de correo.
- **Aceptación:** importación no altera datos hasta aprobación; error de fila se explica; exportación y PDF reproducen los filtros autorizados.

### Fase 9 — Tablero TV y Tauri (1–2 semanas)

- F9.1 Definir TV como vista web de pantalla completa o aplicación de escritorio; confirmar quién la opera.
- F9.2 Diseñar 16:9, distancia de lectura, contraste, rotación opcional y estados vacíos.
- F9.3 Usar un rol de solo lectura y datos agregados.
- F9.4 Ocultar personas identificables, investigaciones y notas confidenciales.
- F9.5 Añadir expiración, retorno seguro y bloqueo de descarga/edición.
- F9.6 Confirmar si Tauri debe ser online-only o admitir trabajo offline.
- F9.7 Configurar proyecto Tauri con el frontend Angular y conexión a la API.
- F9.8 Mantener permisos nativos mínimos; no incluir contraseñas, secretos SQL ni credenciales de servicio.
- F9.9 Configurar compilación para el sistema operativo elegido, firma y distribución.
- F9.10 Probar actualización, cierre, resolución de pantalla y reconexión.
- **Aceptación:** instalador de prueba abre la aplicación y utiliza API de staging; TV solo ve la información agregada autorizada.

### Fase 10 — Analítica avanzada y datos (posterior al MVP)

- F10.1 Instrumentar eventos de dominio con IDs pseudónimos y esquema versionado.
- F10.2 Definir fuentes, frecuencia, calidad y propietario de cada dato.
- F10.3 Implementar Bronce, Plata y Oro solo al existir necesidad de analítica transversal.
- F10.4 Construir dimensiones y hechos para indicadores aprobados.
- F10.5 Definir significado, cálculo, límite, responsable y visualización de cada indicador.
- F10.6 Medir datos faltantes, sesgos y cambios del catálogo antes de cualquier predicción.
- F10.7 Ejecutar evaluación retrospectiva y revisión humana de modelos.
- F10.8 Probar primero alertas informativas, con explicación y trazabilidad.
- F10.9 Evaluar base de grafos con consultas reales de dependencias; no añadirla por anticipación.
- F10.10 No automatizar evacuaciones ni controles críticos desde un modelo predictivo.
- **Aceptación:** todo indicador tiene fuente y definición; toda alerta explica datos y límites; ninguna acción crítica depende solo de un score automático.

### Fase 11 — QA, piloto y producción (1–2 semanas después del MVP)

- F11.1 Pruebas unitarias de reglas críticas y validadores.
- F11.2 Pruebas de integración de API y PostgreSQL.
- F11.3 Pruebas end-to-end de flujos principales. **Base automatizada:** Playwright cubre login, navegación de todos los módulos, perfil de solo lectura, búsqueda, navegación móvil, catálogo de 19 faenas de referencia con imágenes locales cargadas y atribución visible, inspección → hallazgo → acción → evidencia → revisión independiente → cierre persistido; reunión → asistencia/agenda → acta versionada → solicitud de revisión → acuerdo → evidencia → verificación independiente → cierre persistido; incidente → cronología ordenada → persistencia → consulta de solo lectura; capacitación → participante → asistencia/evidencia persistidas; y comisión → acción → evidencia → revisión independiente → cierre persistido. Falta implementar y probar aprobación independiente del acta; el acuerdo se ejecuta con evidencia textual sintética y permanece sujeto a la decisión D-21 antes de usarse como evidencia formal.
- F11.4 Pruebas negativas de tenant, faena, rol, descargas y exportaciones. **Cobertura actual:** API rechaza desde otra faena la lectura/escritura de evidencia, la transición y la verificación de acuerdos; un E2E crea una empresa/faena aparte, asigna `VIEWER`, cambia de espacio y confirma que una reunión solo aparece en su faena. La exportación CSV del navegador tiene pruebas de formato y un recorrido que comprueba filtro activo y omisión de correo/ID interno. Falta una exportación API con autorización/auditoría comprobada entre faenas y pruebas de descarga cuando exista almacenamiento binario.
- F11.5 Revisión de vulnerabilidades y dependencias. **Cobertura actual:** CI ejecuta `pnpm audit --prod --audit-level=moderate` y falla si aparecen avisos moderados o superiores; corte local 2026-11-09 sin avisos conocidos. Mantener revisión de avisos bajos y del estado de dependencias antes de cada release.
- F11.6 Prueba de carga acorde al número de empresas, faenas, usuarios concurrentes, registros y adjuntos esperado, midiendo tiempos p95 y errores. **Bloqueada por D-24:** los benchmarks locales con datos sintéticos son verificaciones técnicas y no demuestran capacidad productiva; acordar el perfil de carga y objetivos antes de ejecutar y aceptar una prueba de capacidad.
- F11.7 Prueba de respaldo y restauración. **Cobertura local:** `scripts/backup.ps1` crea un dump custom, valida el archivo y calcula SHA-256. `scripts/verify-backup-restore.ps1 -BackupPath <archivo> -CompareCurrent` restaura el artefacto en una base aislada y compara todas las tablas públicas y conteos de filas; también puede crear y limpiar un dump temporal. Sigue pendiente definir retención, copia fuera del host, cifrado y recuperación ante pérdida del volumen para producción.
- F11.8 Revisión de contraste, teclado, lector de pantalla y uso real en celular/TV. **Base automatizada:** E2E revisa nombres accesibles básicos de controles visibles en login y rutas principales, comprueba abrir/cerrar el menú móvil con teclado y restauración del foco, y recorre 14 rutas a 1440, 768 y 393 px sin desbordamiento horizontal. Falta medir contraste, validar lector de pantalla/zoom/movimiento reducido y obtener revisión manual en celular y TV; la prueba automatizada no es certificación WCAG.
- F11.9 Piloto con una empresa/faena, participantes autorizados y datos controlados.
- F11.10 Corregir hallazgos, documentar soporte, monitoreo, rollback y formación.
- F11.11 Obtener aprobación explícita del dueño antes de producción.
- **Aceptación:** no hay fallos críticos; permisos y backups verificados; dueño acepta alcance y riesgos residuales.

---

## 10. Calendario orientativo del MVP

Supuesto: 2–3 personas dedicadas y decisiones rápidas del propietario.

| Semana | Foco | Hito |
|---|---|---|
| 1 | Auditoría de maqueta, flujos, UX, alcance y decisiones de datos | Alcance y backlog aceptados |
| 2 | Arquitectura, esquema, contratos, seguridad e infraestructura de desarrollo | API inicial y modelo revisados |
| 3 | Identidad, roles, empresas, faenas y comités | Aislamiento tenant/faena demostrado |
| 4 | Integrantes, reuniones, actas y acciones | Flujo de comité operativo |
| 5 | Inspecciones, hallazgos y medidas | Flujo de prevención operativo |
| 6 | Capacitaciones, comisiones, investigaciones y documentos | Módulos preventivos conectados |
| 7 | Excel, PDF, búsqueda y tablero TV | Intercambio e informes básicos |
| 8 | Tauri, integración, accesibilidad, seguridad y piloto | Candidato de MVP |
| 9 | Correcciones, capacitación, documentación y buffer de entrega | Aprobación de salida |

La línea analítica Medallón, predicciones y grafos no forma parte de esta duración. Si el equipo trabaja parcialmente, o si se define autenticación corporativa, firma, offline o integraciones externas, recalcular calendario.

---

## 11. Definition of Done por cambio

Un ticket se considera terminado solo cuando:

1. Tiene requisito, alcance y criterio de aceptación.
2. La interfaz contempla carga, error, vacío, éxito y sin permiso.
3. El frontend no decide por sí solo el acceso.
4. API valida identidad, tenant/faena, esquema y transición de estado.
5. La migración funciona sobre base limpia y conserva datos previos.
6. Las operaciones relevantes se registran con autor y fecha.
7. Datos sensibles no aparecen en logs, analítica, URL ni mensajes de error.
8. Documentos permanecen privados y tienen autorización de descarga.
9. Excel/PDF respetan filtros y permisos.
10. Funciona en escritorio y móvil; TV usa información agregada.
11. Aceptación funcional registrada por el responsable.
12. Si cambia alcance/arquitectura, la decisión queda anotada.

---

## 12. Riesgos principales y mitigación

| Riesgo | Consecuencia | Mitigación |
|---|---|---|
| La maqueta contiene datos inventados o interacciones simuladas | Construir reglas equivocadas | Etiquetar supuestos y conseguir aceptación del flujo antes de backend |
| Querer terminar todos los módulos para el 9–10 | Demo fallida o promesas falsas | Limitar esa fecha a demostración y una prueba técnica |
| Pérdida o exposición de información de equipo | Daño operativo y de privacidad | No migrar datos sin autorización, plan de respaldo y controles |
| Aislamiento por empresa/faena solo en Angular | Acceso cruzado manipulando API | Autorizar cada recurso en NestJS y probar acceso negativo |
| Archivos en enlaces públicos | Exposición de actas/investigaciones | Bucket privado, URL temporal y política de descarga |
| Excel con formatos diversos | Duplicados o corrupción masiva | Plantillas versionadas, vista previa, lote, validación y rollback |
| Indicadores de TV exponen detalles | Riesgo de privacidad en espacios comunes | Agregación, rol kiosk, no mostrar PII ni casos sensibles |
| Triggers de riesgo generan evacuaciones erróneas | Riesgo para personas | Alertar y revisar; no accionar evacuaciones automáticamente |
| Grafo y Medallón demasiado temprano | Más costo y atraso sin valor validado | Mantenerlos como fase analítica posterior |
| Tauri requiere offline o dispositivos no definidos | Aumento de alcance y sincronización compleja | Online-first; documentar equipos/OS/offline antes de implementar |
| Votación electrónica sin requisitos | Proceso inválido o no auditable | Fase separada con revisión laboral y criterios aplicables |

---

## 13. Decisiones pendientes que no bloquean la maqueta, pero sí producción

1. Proveedor de autenticación y si requiere SSO/MFA.
2. Roles definitivos y relación empresa–contrato–faena.
3. Significado de “conservar al equipo” y si existe una fuente real que migrar.
4. Plantillas oficiales de Excel y reportes PDF.
5. Clasificación y retención de documentos e investigaciones.
6. TV demostrativa o productiva; métricas visibles y rotación.
7. Tauri online-only u offline y sistemas operativos de destino.
8. Qué función tendrá JSON: API, intercambio o configuración.
9. Proyecto, región, servicios y presupuesto GCP.
10. Flujo de revisión y aprobación del acta: quién revisa, quién aprueba, cómo se conserva cada versión y qué firma electrónica se requiere.
11. Alcance futuro del módulo de votación.
12. Si el sitio Wix RISKS 80 se mantiene como producto público independiente.
13. Qué evidencia debe respaldar el cierre de acuerdos de reunión y si quien verifica debe tener un permiso separado del responsable.
14. Política de respaldo para producción: RPO/RTO, frecuencia, retención, cifrado, destino fuera del host, responsable y frecuencia de pruebas de restauración (D-22).

No se bloqueará el trabajo esperando documentos que ya se confirmó que no llegarán. Cuando un dato falte, se utilizará un supuesto rotulado, no se inventará como requisito aprobado.

---

## 14. Responsabilidades sugeridas

| Responsabilidad | Rol propuesto |
|---|---|
| Prioridad, aceptación, decisiones de negocio | Dueño de producto / Juan Pablo |
| Mapa de pantallas y maqueta | Jorge Vergara + diseño |
| Angular y accesibilidad | Frontend |
| API, reglas y seguridad | Backend NestJS |
| Modelo, migraciones y rendimiento | Backend / datos |
| GCP, CI/CD, respaldos y observabilidad | Plataforma/DevOps |
| Aprobación técnica de riesgos y proceso CPHS | Especialista de prevención |
| Aceptación de operación y piloto | Representantes de faena y administración |

Una persona puede cubrir más de un rol, pero cada aceptación crítica debe tener un responsable nominal.

---

## 15. Primeras acciones en este repositorio

1. Revisar el mapa de pantallas actual en apps/web/docs/SDD.md y el contrato preliminar en apps/web/docs/API.md.
2. Completar el inventario de pantallas y marcar los módulos que faltan.
3. Acordar el recorrido vertical del 9–10 de noviembre.
4. Crear backlog con IDs de fases y responsables.
5. Dibujar el modelo relacional y aprobar aislamiento empresa/faena.
6. Decidir proveedor de identidad y ORM antes de escribir migraciones.
7. Iniciar NestJS y PostgreSQL local con datos sintéticos.
8. Conectar una sola pantalla Angular a la API.
9. Ejecutar la integración en staging antes de exponer cualquier dato.
10. Mantener la producción de Vercel existente sin cambios hasta aprobación de nuevo destino.

