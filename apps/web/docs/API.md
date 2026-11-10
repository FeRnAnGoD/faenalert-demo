# Contrato propuesto para NestJS

Estado: propuesta, endpoints no implementados. Base `/api/v1`. Todos los recursos requieren sesión y pertenencia al tenant/faena. El backend deriva el tenant autorizado de la identidad; valida IDs enviados por el cliente.

| Dominio | Rutas propuestas |
|---|---|
| Identidad | GET /me, POST /auth/logout; proveedor OIDC/SSO/MFA por definir |
| Espacios | GET /sites, POST /sites, PATCH /sites/:id |
| Comité | GET /sites/:siteId/committee, GET/POST /committees/:id/members, PATCH /members/:id |
| Reuniones | GET/POST /committees/:id/meetings, GET/PATCH /meetings/:id |
| Agenda | GET/POST /meetings/:id/topics, PATCH /topics/:id |
| Asistencia | PUT /meetings/:id/attendance |
| Actas | GET/POST /meetings/:id/minutes, PATCH /minutes/:id, POST /minutes/:id/reviews |
| Acciones | GET/POST /sites/:siteId/actions, PATCH /actions/:id, POST /actions/:id/evidence |
| Eventos | GET/POST /sites/:siteId/incidents, GET/PATCH /incidents/:id |
| Investigación | GET/PUT /incidents/:id/investigation |
| Archivos | POST /documents/upload-intent, POST /documents/:id/finalize, GET /documents/:id/download-url |
| Reportes | GET /sites/:siteId/reports?from=&to= |
| Asistente | POST /sites/:siteId/assistant/messages; fuentes y controles de privacidad pendientes |

## Contratos

`RecordItem`: id, siteId, committeeId, title, description, status, dueDate/date, ownerId, type, priority, version, createdAt, updatedAt. Usar IDs opacos en la API; las claves numéricas del mock son solo de demostración.

`Member`: id, committeeId, personId, representation (worker/employer), role, participation (principal/alternate/adviser), replacementOf, validFrom, validUntil. Separar persona, cargo de trabajo, rol del comité y permisos de aplicación.

`Meeting`: agenda versionada, asistentes con representación y calidad efectiva de reemplazo, lugar/modalidad, fecha, estado. Conservar acta original y versiones; no sobrescribir documentos aprobados.

`Incident`: hechos operativos separados de datos personales/salud, clasificación por validar, cronología, investigador, evidencias, causas y medidas. No añadir datos clínicos sin revisión de finalidad/base legal y acceso específico.

Respuesta de lista `{items, page, pageSize, total}`; errores `{code,message,fieldErrors,requestId}`. Conflicto de versión: HTTP 409. Validación: 422. No autorizado/prohibido: 401/403. Las descargas nunca devuelven enlaces públicos permanentes.

## Integración y criterios

Sustituir métodos de DemoRepository por servicios HTTP por dominio, gestionar loading/error/empty, y probar acceso negativo entre tenants/faenas. El backend valida transiciones de estado, integridad documental y autorización aunque el frontend oculte controles. Ninguna clave de servicio o credencial SQL debe ir en Angular/Capacitor. Los envíos de firma requieren un proveedor/procedimiento definido y evidencia verificable.
