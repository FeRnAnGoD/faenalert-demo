# Reuniones, actas y acuerdos

Pantalla local: /reuniones. Conserva autenticación y permisos por faena. Permite programar reuniones, preparar un acta, editarla como borrador o enviarla a revisión, consultar versiones anteriores y asignar acuerdos con responsable y fecha. En la demo, los acuerdos avanzan Pendiente → En curso → Por verificar → Completado; una devolución los regresa a En curso.

API bajo /api/v1:
- GET /meetings/:id/workspace: reunión, acta, acuerdos e historial.
- POST /meetings/:id/minutes: {content}; una sola acta por reunión.
- PATCH /minutes/:id/draft: {version,content,status:DRAFT|IN_REVIEW}.
- GET /minutes/:id/revisions: versiones conservadas.
- POST /minutes/:id/agreements: {title,ownerId,dueOn}.
- PATCH /agreements/:id: {version,status:IN_PROGRESS|PENDING_VERIFICATION}. Para solicitar verificación se debe registrar evidencia primero; no se puede cerrar directamente ni reabrir un acuerdo cerrado.
- POST /agreements/:id/evidence: {description}; agrega una descripción de evidencia al historial inmutable. No adjunta archivos.
- GET /agreements/:id/evidence: {items}; permite consultar la evidencia según acceso a la faena.
- POST /agreements/:id/verification: {version,approved,note}; requiere permiso `review` y que quien verifica no sea el responsable. La aprobación cierra el acuerdo y la devolución lo deja En curso.

La creación de reuniones continúa en POST /sites/:siteId/records/meetings. Las actas vinculadas se modifican únicamente mediante su ruta dedicada para registrar cada versión. Las transiciones y ediciones comprueban versión y se auditan dentro de la misma transacción. El perfil lector solo consulta.

Las migraciones 004 y 017 agregan vínculos, revisiones y seguimiento de acuerdos sin eliminar registros previos. La migración 017 amplía los registros de evidencia/verificación para asociarlos a un solo tipo de acción o acuerdo y los protege contra actualización o eliminación. Los acuerdos que ya estaban completados se conservan como historial, sin inventar una verificación retroactiva. Las actas antiguas sin reunión conservan su API básica. Esta etapa no incluye firma electrónica, aprobación final del acta ni generación PDF. Los acuerdos de reuniones tienen su propio seguimiento: no se presentan como acciones originadas en una inspección.

La suite meetings.integration.ts verifica duplicados, permisos, versiones, bloqueo de edición por API genérica, conservación del texto original y el ciclo de evidencia/revisión independiente de los acuerdos, incluida la devolución, cierre y auditoría. Se ejecuta junto con las otras suites en una base temporal mediante pnpm verify. Este flujo usa descripciones sintéticas y sigue sujeto a validar con negocio qué evidencia exige un acuerdo formal.
