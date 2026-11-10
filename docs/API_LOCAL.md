# API local implementada

Base /api/v1; JSON; Authorization: Bearer <accessToken> salvo login y health. Errores: code, message, fieldErrors cuando corresponde y requestId. Validación 422, sesión 401, permisos 403, ausencia 404 y versión/transición/integridad 409. Los roles se comprueban por faena para cada ruta. IDs UUID.

## Identidad y contexto

POST /auth/login: {email,password}; respuesta {accessToken,expiresIn,user}. GET /me devuelve también `platform_roles`. GET /sites lista las faenas activas con acceso vigente; GET /sites/:siteId/users devuelve las cuentas activas asignadas sin correo.

`POST /sites/:siteId/search` con `{q}` busca hasta ocho resultados en los registros de la faena activa: reuniones, actas, acuerdos, incidentes, inspecciones y hallazgos, documentos, capacitaciones, comisiones e integrantes. Requiere permiso `read` en esa faena; `q` se recorta y admite entre 2 y 100 caracteres. La búsqueda es de solo lectura y recibe el término en el cuerpo para no poner nombres o términos de consulta en la URL.

GET /health/live comprueba proceso; GET /health/ready consulta PostgreSQL.

## Empresas, faenas y accesos

La jerarquía operativa es `organizations` (empresa cliente) → `sites` (faena) → comités y registros. El catálogo público de referencias de faenas chilenas es independiente y no crea organizaciones ni accesos. En esta entrega, `PLATFORM_ADMIN` es un rol global separado de `roles`, que contiene los permisos técnicos ADMIN, EDITOR, REVIEWER y VIEWER asignados en `site_access`.

| Ruta | Acceso | Cuerpo / resultado |
|---|---|---|
| GET /organizations | PLATFORM_ADMIN | Empresas y faenas, comité vigente más reciente y cantidad de accesos activos. |
| POST /organizations | PLATFORM_ADMIN | `{name,firstSiteName,committee:{name,validFrom,validUntil?}}`; crea empresa, primera faena, período y acceso ADMIN del creador en una transacción. |
| PUT /organizations/:organizationId | PLATFORM_ADMIN | `{name,active,version}`; desactivación lógica y control de concurrencia. |
| GET /organizations/:organizationId/sites | PLATFORM_ADMIN | Faenas y su período de comité más reciente. |
| POST /organizations/:organizationId/sites | PLATFORM_ADMIN | `{name,committee:{name,validFrom,validUntil?}}`; crea faena, período y acceso ADMIN del creador en una transacción. |
| PUT /sites/:siteId | PLATFORM_ADMIN | `{name,active,version}`; desactivación lógica y control de concurrencia. |
| GET /roles | sesión autenticada | Catálogo técnico de permisos asignables por faena. No define cargos ni representación del comité. |
| GET /platform/users | PLATFORM_ADMIN | Cuentas activas disponibles en la plataforma (hasta 500). |
| GET /organizations/:organizationId/users | PLATFORM_ADMIN | Cuentas activas ya vinculadas a alguna faena de la empresa (hasta 500). |
| GET /sites/:siteId/access-candidates | administrador de plataforma o administrador de la faena | Candidatos activos con nombre y correo. El administrador de faena solo ve cuentas ya vinculadas a su empresa; el administrador de plataforma puede seleccionar cualquier cuenta activa. |
| PUT /sites/:siteId/users/:userId | ADMIN de la faena o PLATFORM_ADMIN | `{role}`; asigna o cambia un permiso para esa faena. Solo se admiten cuentas existentes. |
| DELETE /sites/:siteId/users/:userId | ADMIN de la faena o PLATFORM_ADMIN | Revoca el acceso conservando una bitácora inmutable; no se puede retirar al último ADMIN ni el último acceso activo propio. |

El catálogo técnico de faena tiene estos permisos: ADMIN (`read`, `write`, `review`, `manage`), EDITOR (`read`, `write`), REVIEWER (`read`, `review`) y VIEWER (`read`). Un perfil puede operar en varias faenas con roles diferentes; la API valida cada acceso en el contexto de la faena solicitada. Estos roles no reemplazan los cargos de presidente, secretario, titular, suplente o asesor del comité.

Las organizaciones y faenas se desactivan de forma lógica y sus datos se conservan. Cada acceso otorgado, cambiado o revocado genera un evento histórico inmutable y un evento de auditoría. La demo crea una cuenta `PLATFORM_ADMIN` para administrar espacios. Esta entrega no crea usuarios ni envía invitaciones; el alta de cuentas depende de resolver identidad/SSO y el proceso de aprovisionamiento.

## Prevención

- GET /sites/:siteId/inspections?page=1&pageSize=20: {items,page,pageSize,total}.
- POST /sites/:siteId/inspections: {title,area,inspectedOn: YYYY-MM-DD,inspectorId}.
- GET /inspections/:id: inspección con findings y sus actions.
- POST /inspections/:id/findings: {description}.
- POST /findings/:id/actions: {title,ownerId,dueOn: YYYY-MM-DD,priority: HIGH|MEDIUM|LOW}.
- PATCH /actions/:id: {version,status: IN_PROGRESS|PENDING_VERIFICATION}.
- POST /actions/:id/evidence: {description}; evidencia textual, no archivo.
- GET /actions/:id/evidence: {items}.
- POST /actions/:id/verification: {version,approved:boolean,note}. Aprobación pasa a CLOSED, rechazo vuelve a IN_PROGRESS. Verificador distinto del responsable.
- POST /commissions/:commissionId/actions: {title,ownerId,dueOn: YYYY-MM-DD,priority: HIGH|MEDIUM|LOW}; crea una acción de comisión asignada a una cuenta con permiso `write` en la misma faena.
- GET /commissions/:commissionId/actions?page=1: lista las acciones de la comisión. Estas aparecen también en `/sites/:siteId/commitments` con origen `COMMISSION` y usan las mismas rutas `/actions/:id`, `/actions/:id/evidence` y `/actions/:id/verification` que las acciones de inspección.

## Acuerdos de reunión

- PATCH /agreements/:id: `{version,status:IN_PROGRESS|PENDING_VERIFICATION}`. Se exige evidencia antes de enviar a revisión; no hay cierre directo.
- POST /agreements/:id/evidence: `{description}`; agrega texto de evidencia al historial append-only. GET a la misma ruta consulta el historial para perfiles con acceso a la faena.
- POST /agreements/:id/verification: `{version,approved,note}`; exige permiso `review` y un verificador distinto del responsable. Aprobación cierra el acuerdo; devolución lo devuelve a `IN_PROGRESS`.
- El tablero `/sites/:siteId/commitments` presenta el estado y las acciones de revisión. Las descripciones de demo no equivalen a evidencia documental o aprobada.

## Incidentes

- GET /incidents/:incidentId/timeline?page=1&pageSize=20: bitácora ordenada por fecha del hecho, con autor y fecha de registro.
- POST /incidents/:incidentId/timeline: {eventAt: ISO con zona horaria,description}; agrega una nota cronológica textual. Solo permite anexar, requiere permiso `write` en la faena y deja auditoría. No representa el procedimiento oficial de investigación.
- GET /incidents/:incidentId/actions?page=1: tareas vinculadas al evento.
- POST /incidents/:incidentId/actions: {title,ownerId,dueOn: YYYY-MM-DD,priority: HIGH|MEDIUM|LOW}; el evento y la cuenta responsable deben pertenecer a la misma faena.
- Las tareas se incluyen en `/sites/:siteId/commitments` con origen `INCIDENT` y usan las rutas comunes de transición, evidencia y verificación independiente. En esta demo, la vinculación técnica no equivale a una medida oficial aprobada.

## Comités

GET/POST /sites/:siteId/committees. Alta: {name,validFrom,validUntil?}.
GET/POST /committees/:id/members. Alta de representante: {name,memberKind:REPRESENTATIVE,representation:WORKER|EMPLOYER,participation:PRINCIPAL|ALTERNATE,office?:PRESIDENT|SECRETARY,validFrom,validUntil?}. El comité admite hasta tres titulares y tres suplentes por representación y un cargo de presidencia y secretaría por período.

Para incorporar un experto en prevención sin voto: {name,memberKind:PREVENTION_EXPERT,representation:null,participation:null,office:null,validFrom,validUntil?}. No ocupa uno de los seis cupos de representación.

Los permisos de acceso (ADMIN, EDITOR, REVIEWER y VIEWER) se asignan a cuentas por faena. Son distintos de la representación, calidad y cargos del Comité Paritario. Este alcance conserva períodos, pero no modela todavía sustituciones, elecciones ni el circuito completo de administración.

Para una capacitación existente: `GET/POST /trainings/:trainingId/participants` con `{participant_name}` y `PATCH /trainings/:trainingId/participants/:participantId` con `{version,attended:boolean|null}`; `null` significa pendiente de registrar. `GET/POST /trainings/:trainingId/evidence` con `{description}` guarda una bitácora append-only de texto. Todas las rutas verifican el acceso a la faena de la capacitación. En la demo se deben usar nombres ficticios; todavía no se adjuntan archivos ni certificados.

## Operaciones

GET/POST /sites/:siteId/records/:domain y GET/PATCH /sites/:siteId/records/:domain/:id. Listas paginadas. PATCH recibe la representación completa más version, con semántica de reemplazo de campos editables. No hay eliminación destructiva.

| domain | Campos de alta |
| --- | --- |
| meetings | title, scheduled_at (ISO con zona), location, agenda |
| minutes | title, content, status (DRAFT o IN_REVIEW) |
| trainings | title, scheduled_at, instructor, description |
| commissions | title, objective |
| incidents | title, occurred_at, location, facts, kind (INCIDENT, ACCIDENT, OBSERVATION) |
| documents | title, description |

Los documentos son solo metadatos. Las actas son borradores sin firma. El catálogo constituye el registro inicial, no el flujo completo de cada dominio. Las capacitaciones admiten participantes, estado de asistencia y evidencia descriptiva append-only. Las comisiones admiten acciones vinculadas al tablero común con responsable, fecha, evidencia y verificación. Los acuerdos de reunión también pueden registrar evidencia descriptiva y requieren revisión independiente antes del cierre. La composición formal de los equipos de comisión sigue pendiente de definición. Los nombres SQL solo se toman del catálogo interno validado.

La UI integrada cubre reuniones, actas, integrantes, inspecciones y hallazgos, acciones, incidentes, documentos, capacitaciones y comisiones mediante la API. El flujo de inspecciones incluye creación, consulta, hallazgos, tareas y evidencia; las cuentas con permiso `review` pueden aprobar o devolver una acción desde el detalle sin necesitar permiso de escritura. Los incidentes admiten una cronología de notas textuales append-only, fechadas y atribuidas a la cuenta que las registra. No hay etapas, taxonomía, adjuntos ni medidas vinculadas aprobadas para la investigación.
