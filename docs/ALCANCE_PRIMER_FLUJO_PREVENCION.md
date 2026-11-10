# Alcance del primer flujo: inspección a cierre de acción

**Versión:** 1.0 propuesta para iniciar implementación

**Fecha:** 5 de noviembre de 2026

**Flujo:** empresa/faena → comité → inspección → hallazgo → acción → evidencia → cierre verificado

## 1. Objetivo

Permitir que una persona autorizada registre una inspección de una faena, documente uno o más hallazgos, asigne acciones preventivas/correctivas y verifique su cierre con evidencia e historial.

La maqueta original no incluía inspecciones. El flujo cuenta ahora con API local y una pantalla integrada al espacio principal para datos sintéticos. Los campos, estados y permisos de negocio aquí marcados como **propuestos** siguen sujetos a validación con prevención y el Comité Paritario; su implementación técnica no constituye aprobación funcional.

## 2. Alcance de la demostración del 9–10 de noviembre

La demostración técnica puede cubrir el recorrido completo con datos sintéticos y un ambiente local controlado:

- Elegir una faena VialCorp precargada.
- Crear y consultar una inspección.
- Registrar hallazgos vinculados a esa inspección.
- Asignar responsable y fecha comprometida a una acción.
- Adjuntar una nota de evidencia de ejemplo y solicitar verificación de cierre.
- Ver el historial de estado de inspección, hallazgo y acción.
- Angular consume NestJS; NestJS persiste en PostgreSQL local.

**La demostración no es una salida a producción.** No debe aceptar información de trabajadores reales, antecedentes de salud, credenciales productivas ni documentos oficiales. El acceso de demostración solo sirve en el entorno local preparado para la presentación.

Para que Angular pueda consumir la API local antes de elegir proveedor de identidad, el prototipo puede usar una identidad sintética creada en el servidor únicamente en desarrollo, con la API enlazada a loopback y datos de prueba. Debe negarse al iniciar fuera de `development`; no se instala en Vercel ni en staging/producción, no usa códigos compartidos en Angular y no representa autenticación real.

## 3. Fuera de este primer flujo

- Inspecciones recurrentes/calendario avanzado y editor de plantillas versionadas.
- Catálogo normativo de peligros, matriz IPER o cálculo automático de criticidad.
- Registro/investigación de accidentes con datos personales o de salud.
- Capacitaciones, comisiones, reuniones, actas y votaciones.
- Importación Excel, informes PDF oficiales, notificaciones por correo y firma electrónica.
- IA, predicción de riesgos, lakehouse Medallón, grafo, modo TV y aplicación Tauri.
- Inicio de sesión productivo hasta definir proveedor, recuperación y MFA.

## 4. Roles y reglas iniciales

Roles funcionales propuestos para validar:

| Rol | Puede hacer |
|---|---|
| Inspector | Crear inspecciones en faenas asignadas y registrar hallazgos. |
| Responsable de acción | Ver y actualizar las acciones que tiene asignadas; aportar evidencia. |
| Verificador | Revisar evidencia y cerrar o devolver una acción con observación. |
| Administrador de faena | Consultar los registros de su faena y administrar asignaciones autorizadas. |

Reglas iniciales:

1. Toda inspección pertenece a exactamente una faena.
2. Una inspección puede contener cero o varios hallazgos mientras se completa; para cerrarla se debe confirmar si cero hallazgos requiere una justificación.
3. Un hallazgo puede originar una o varias acciones. Cada acción debe tener responsable y fecha comprometida antes de pasar a “En curso”.
4. Quien ejecuta una acción no puede ser el único verificador de su cierre.
5. El historial conserva quién hizo cada cambio y cuándo; cambiar estado no borra la historia anterior.
6. La API valida el acceso a empresa/faena en cada lectura y escritura. Ocultar una opción en Angular no es control de acceso.
7. No registrar diagnóstico, ficha clínica, RUT u otros datos sensibles en este flujo inicial.

La autenticación productiva y la jerarquía definitiva de empresa/contrato/faena continúan pendientes de las decisiones D-01 y D-03 de `DECISIONES_PENDIENTES.md`.

## 5. Datos mínimos propuestos

### Inspección

| Campo | Requerido | Regla inicial |
|---|---:|---|
| `id` | Sí | UUID generado por backend. |
| `siteId` | Sí | Faena autorizada para el usuario. |
| `code` | Sí | Folio legible generado por backend, único dentro de la faena. |
| `title` | Sí | Texto de hasta 160 caracteres. |
| `area` | Sí | Área/lugar de trabajo; texto inicial, catálogo posterior. |
| `scheduledAt` | Sí | Fecha de inspección. |
| `startedAt`, `completedAt` | No | Tiempos de inicio y término, si aplican. |
| `inspectorPersonId` | Sí | Persona que realizó la inspección; no equivale por sí sola a una cuenta de acceso. |
| `summary` | No | Contexto general, sin incluir datos sensibles. |
| `status` | Sí | `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. |
| `createdAt`, `createdBy`, `updatedAt`, `version` | Sí | Metadatos de trazabilidad/concurrencia del servidor. |

### Hallazgo

| Campo | Requerido | Regla inicial |
|---|---:|---|
| `id`, `inspectionId` | Sí | UUID; referencia obligatoria a su inspección. |
| `description` | Sí | Hecho observado y verificable; hasta 2.000 caracteres. |
| `location` | Sí | Lugar específico dentro del área. |
| `observedAt` | Sí | Fecha/hora del hallazgo; por defecto, la de captura. |
| `category` | No | Catálogo pendiente de validar; no bloquear captura por clasificación. |
| `priority` | No | `LOW`, `MEDIUM`, `HIGH` solo si prevención aprueba el uso de esta prioridad. No presentarla como matriz ni nivel legal de riesgo. |
| `status` | Sí | Derivado de sus acciones: `OPEN`, `ACTION_IN_PROGRESS`, `RESOLVED`. |
| `createdAt`, `createdBy` | Sí | Trazabilidad del servidor. |

### Acción preventiva/correctiva

| Campo | Requerido | Regla inicial |
|---|---:|---|
| `id`, `findingId` | Sí | UUID y hallazgo de origen. |
| `title` | Sí | Resultado concreto esperado; hasta 160 caracteres. |
| `description` | No | Pasos/contexto de ejecución. |
| `responsiblePersonId` | Sí | Responsable seleccionado de las personas habilitadas en la faena. |
| `dueAt` | Sí | Fecha de compromiso; no anterior a la fecha de creación sin justificación. |
| `priority` | No | Misma regla provisional del hallazgo. |
| `status` | Sí | `PENDING`, `IN_PROGRESS`, `PENDING_VERIFICATION`, `CLOSED`, `RETURNED`. |
| `closureNote` | Requerido al cierre | Explica qué se realizó y cómo responde al hallazgo. |
| `verifiedBy`, `verifiedAt` | Requerido al cierre | Verificador distinto del responsable. |
| `createdAt`, `createdBy`, `updatedAt`, `version` | Sí | Historial técnico del servidor. |

### Evidencia

Para la demo se acepta una nota de evidencia sintética vinculada a la acción: descripción, autor y fecha. La carga de archivos reales se habilita solo cuando esté decidido e implementado el almacenamiento privado, permisos, tamaño/tipo admitido, retención y descarga autorizada. Nunca marcar un nombre de archivo local como un adjunto ya guardado.

## 6. Estados y transiciones

```text
Inspección: Borrador → En curso → Completada
                         └────────→ Cancelada

Acción: Pendiente → En curso → Por verificar → Cerrada
                                      └───────→ Devuelta → En curso
```

- Una inspección completada no se edita silenciosamente; una corrección posterior deja autor, fecha y motivo.
- Una acción `CLOSED` requiere nota de cierre, evidencia registrada, verificador diferente del responsable y marca temporal del servidor.
- Una acción devuelta requiere observación del verificador y vuelve a `IN_PROGRESS`.
- Una fecha vencida se calcula usando la fecha actual del servidor y el estado, no un día fijo en el frontend.
- La severidad/criticidad de hallazgos no se infiere de un score ni de texto libre. El catálogo y sus criterios quedan pendientes de aprobación.

## 7. API inicial propuesta

Base: `/api/v1`. Estos contratos están implementados en el entorno local de demostración; cualquier ampliación o ajuste de negocio requiere validación y versionado.

| Método y ruta | Uso |
|---|---|
| `GET /sites` | Listar solo faenas autorizadas. |
| `GET /sites/:siteId/inspections` | Buscar/listar inspecciones por fecha y estado, con paginación. |
| `POST /sites/:siteId/inspections` | Crear inspección en borrador. |
| `GET /inspections/:inspectionId` | Consultar inspección, hallazgos y acciones autorizados. |
| `PATCH /inspections/:inspectionId` | Editar campos permitidos y cambiar estado válido. |
| `POST /inspections/:inspectionId/findings` | Registrar hallazgo. |
| `POST /findings/:findingId/actions` | Crear una acción asociada al hallazgo. |
| `PATCH /actions/:actionId` | Actualizar responsable, entrega, descripción o estado permitido. |
| `POST /actions/:actionId/evidence` | Registrar nota de evidencia; adjuntos binarios se aplazan. |
| `POST /actions/:actionId/verification` | Aprobar cierre o devolver con observación. |

Toda ruta debe comprobar la sesión y su pertenencia a la faena. Los `siteId` enviados por Angular son contexto solicitado, no prueba de autorización. Las listas responden con `items`, `page`, `pageSize` y `total`; las mutaciones devuelven errores de campo claros y un `requestId`.

## 8. Criterios de aceptación

### Demostración integrada

- **CA-01:** Con datos sintéticos, se selecciona una faena y se puede crear y volver a abrir una inspección.
- **CA-02:** No se puede guardar una inspección sin faena, título, área, fecha e inspector.
- **CA-03:** Se puede agregar más de un hallazgo, cada uno ligado a la inspección correcta.
- **CA-04:** Se crea una acción ligada al hallazgo con responsable y fecha comprometida.
- **CA-05:** La acción pasa por Pendiente, En curso y Por verificar; se puede registrar una nota de evidencia de demo.
- **CA-06:** La acción no se cierra sin nota de cierre y verificador distinto del responsable.
- **CA-07:** Al cerrar y volver a consultar, se conserva el registro y su historial en PostgreSQL local.
- **CA-08:** El flujo Angular usa NestJS; ningún registro de este recorrido se guarda en `localStorage`.
- **CA-09:** Los errores de validación identifican el campo; se muestran estados de carga, vacío y error de API.
- **CA-10:** En la demo se identifica de forma visible que los datos son ficticios y el entorno no es productivo.

### Antes de habilitar datos reales

- **CA-11:** La identidad productiva está respaldada por un proveedor aprobado, con expiración y recuperación de sesión.
- **CA-12:** Pruebas negativas demuestran que usuarios de una faena no pueden listar, consultar, cambiar, exportar ni descargar registros de otra.
- **CA-13:** Cada transición y verificación tiene actor, fecha y valor anterior/nuevo en bitácora protegida.
- **CA-14:** El almacenamiento de evidencia es privado, validado por tipo/tamaño, autorizado por faena y tiene una política de retención.
- **CA-15:** Se prueba backup y restauración de los datos del flujo.
- **CA-16:** Prevención valida categorías, prioridad, criterios de inspección y cierre; producto valida permisos y responsables.

## 9. Decisiones aún abiertas

Estas propuestas permiten comenzar con registros sintéticos; no deben convertirse en reglas productivas por defecto:

1. Catálogo y versión de preguntas/listas de inspección.
2. Clasificación de hallazgos y significado/aprobación de prioridad Alta/Media/Baja.
3. Campos de lugar/área y si deben ser catálogos por faena.
4. Cantidad y tipos de evidencia; formato, tamaño, retención y permisos de descarga.
5. Quién puede verificar/cerrar acciones y qué hacer con acciones vencidas.
6. Identidad, jerarquía tenant/empresa/faena y asignaciones de usuarios.
7. ORM/migraciones de PostgreSQL, registrado como ADR antes de crear el esquema definitivo.

## 10. Orden de implementación recomendado

1. Registrar como aprobados los campos y transiciones que valide el dueño funcional; mantener el resto como supuestos.
2. Elegir ORM y estrategia de migración en una ADR; no conectar Angular directamente a PostgreSQL.
3. Preparar NestJS y PostgreSQL local con configuración separada y datos sintéticos.
4. Implementar esquema, validaciones y servicios de inspección, hallazgo, acción, evidencia textual y verificación.
5. Construir pantallas Angular y sustituir la persistencia local solo para este flujo.
6. Realizar revisión del recorrido integrado y de accesos antes de incorporarlo a un despliegue compartido.

El flujo técnico está implementado y conectado a la navegación principal. El repositorio aún no declara aprobado el proveedor de identidad, el ORM ni las reglas funcionales enumeradas en esta propuesta. La demo debe mantenerse local y con datos sintéticos; no se habilitan datos reales hasta resolver las decisiones de acceso, privacidad, retención y almacenamiento.
