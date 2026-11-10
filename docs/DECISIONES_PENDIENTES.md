# Decisiones pendientes

Este registro evita convertir supuestos deducidos de una maqueta en reglas aprobadas. La falta de documentación no detiene el prototipo; las decisiones que afectan datos, permisos o producción sí deben cerrarse antes de esas etapas.

| ID | Prioridad | Decisión requerida | Responsable sugerido | Valor provisional |
|---|---|---|---|---|
| D-01 | Bloqueante para backend | ¿Qué proveedor autentica usuarios? ¿SSO/MFA? | Producto + plataforma | No inventar; usar acceso local solo en demo |
| D-02 | Bloqueante para datos | ¿Qué significa “conservar al equipo”: módulos, integrantes, historial o migración? | Producto + prevención | Conservar el historial del comité; no migrar datos sin fuente y autorización |
| D-03 | Bloqueante para autorización | ¿Se requiere grupo, contrato o áreas por encima/debajo de la empresa y faena? | Producto | Empresa → faena ya implementado; validar contrato, área y administración delegada antes de añadir niveles |
| D-04 | Bloqueante para exportación | Plantillas y columnas oficiales de Excel para entrada/salida | Operaciones | Importación primero por una plantilla con vista previa |
| D-05 | Bloqueante para documentos | Clasificación, retención, aprobadores y formatos PDF | Producto + legal/prevención | Restringir actas e investigaciones por rol |
| D-06 | Bloqueante para desktop | ¿Tauri es necesario para el 9–10 o solo para fase posterior? | Producto | Web primero; wrapper posterior |
| D-07 | Bloqueante para desktop | ¿Tauri debe funcionar offline? ¿Qué equipos y sistemas operativos? | Terreno + plataforma | Online-only hasta definir sincronización |
| D-08 | Importante | ¿TV usa indicadores demo o datos operativos? ¿Qué rotación requiere? | Producto + faena | Demo con datos sintéticos; producción agregada y sin PII |
| D-09 | Importante | ¿Qué significa “JSON”: contrato API, intercambio o configuración? | Producto + backend | JSON como formato API; Excel para intercambio operativo |
| D-10 | Bloqueante para infraestructura | Proyecto GCP, región, dueños, presupuesto y servicios aprobados | Administrador GCP | No desplegar recursos hasta confirmación |
| D-11 | Importante | ORM y estrategia de migración PostgreSQL | Backend | Comparar Prisma/TypeORM y registrar ADR |
| D-12 | Importante | ¿Qué módulos deben quedar editables en el primer piloto? | Producto + usuarios | Equipo/comité y flujo inspección → acción |
| D-13 | Posterior | Alcance del catálogo RISKS 80 y visibilidad pública/privada | Dueño del catálogo | Riesgos no validados no se publican como oficiales |
| D-14 | Posterior | Votación: solo actas/registros o proceso electrónico | Producto + asesoría laboral | No implementar votación electrónica en MVP |
| D-15 | Posterior | Firma, notificaciones y proveedor | Producto + legal + plataforma | Sin firma ni envíos reales en demo |
| D-16 | Posterior | Fuente tipográfica/activos oficiales de las libretas | Diseño/propietario | Usar apariencia de maqueta y marcar como aproximada |
| D-17 | Bloqueante para producción | Política de privacidad, retención, incidentes y atención de solicitudes | Propietario + asesoría | Usar nombres ficticios en participantes y registros de evidencia; no ingresar personas ni documentos reales hasta definir la política |
| D-18 | Importante | Quién acepta cada etapa y qué evidencia requiere | Dueño del producto | Aceptación registrada en issue/release |
| D-19 | Importante | ¿El perfil de verificación y la separación del responsable cumplen el proceso de cada faena? | Producto + prevención | Acciones y acuerdos exigen `review` y bloquean la auto-verificación; REVIEWER no tiene `write` ni `manage`. Validar el flujo y la asignación de verificadores con prevención |
| D-20 | Bloqueante para incidentes reales | ¿Qué etapas, clasificación, responsables y restricciones de acceso exige la investigación? | Producto + prevención + asesoría | La demo guarda notas y tareas sintéticas por faena; su vínculo técnico no define causas, severidad, datos de salud ni medidas oficiales |
| D-21 | Importante | ¿Qué evidencia basta para respaldar un acuerdo formal, y qué regla se aplica a devoluciones y nuevos intentos? | Producto + prevención | Demo provisional: registra descripciones append-only y exige revisión `review` por una persona distinta del responsable. Validar tipos de evidencia, criterios de aceptación y reglas de devolución antes de uso formal |
| D-22 | Bloqueante para producción | ¿Qué RPO/RTO, frecuencia, retención, cifrado, destino externo y responsable de restauración se requieren? | Dueño de producto + plataforma/seguridad | Existe dump manual local con SHA-256 y restauración de prueba; no hay copia externa, cifrado ni retención automatizada. No usar como respaldo productivo ni guardar datos reales en este entorno |
| D-23 | Bloqueante para difusión pública | ¿Existe autorización para reproducir en demostraciones y material audiovisual la imagen de Quebrada Blanca procedente del [kit de prensa de Teck](https://www.teck.com/operations/chile/operations/quebrada-blanca/QBmedia/)? | Propietario del producto + asesoría | El registro del asset no indica una licencia abierta. No asumir que la publicación en una web autoriza reutilización: obtener permiso expreso o reemplazar la imagen por otra con licencia verificable antes de difundir el material públicamente |
| D-24 | Bloqueante para dimensionar producción | ¿Cuántas empresas, faenas por empresa, usuarios concurrentes, registros y adjuntos por faena se esperan? ¿Qué tiempos p95 y ventanas de carga se deben cumplir? | Dueño de producto + operaciones + plataforma | Los benchmarks locales son verificaciones técnicas con datos sintéticos; no representan capacidad productiva. Acordar la carga y los objetivos antes de ejecutar una prueba de capacidad o comprometer niveles de servicio |

## Registro de decisiones arquitectónicas

Crear una nota ADR por cada decisión que afecte costo, operación o seguridad: ORM, identidad, almacenamiento, esquema de tenancy, estrategia de archivo, Tauri/offline, hosting y analítica. Cada ADR debe guardar contexto, alternativas, decisión, consecuencias y fecha.

