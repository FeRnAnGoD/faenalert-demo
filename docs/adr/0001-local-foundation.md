# ADR 0001 — Base local y límites de integración

Estado: implementado para desarrollo local, 7 noviembre 2026.

Monorepo pnpm, Node 24, Angular y NestJS 11. PostgreSQL 17 en Docker con volumen persistente y puerto ligado a loopback. SQL parametrizado mediante pg; migraciones SQL con checksum, bloqueo asesor y transacción por archivo. No se incorpora ORM: el esquema y las migraciones son la fuente de verdad.

La API se divide en módulos de base de datos, identidad, prevención y operaciones. Las tablas son explícitas por dominio. El catálogo de operaciones admite solo nombres y columnas validados por esquemas Zod; ningún identificador SQL proviene libremente de la solicitud. Escrituras y auditoría se confirman en la misma transacción. Las acciones se bloquean durante transiciones y verifican versión. La auditoría rechaza UPDATE y DELETE mediante trigger; un propietario SQL conserva privilegios administrativos y debe restringirse antes de producción.

Identidad local: contraseñas scrypt con sal aleatoria, JWT de una hora, roles por faena. Los tokens viven en memoria del cliente. LOCAL_AUTH_ENABLED se rechaza en producción; conectar un proveedor OIDC y reemplazar emisión/verificación antes de habilitar usuarios reales. No hay recuperación de contraseña, revocación individual ni MFA local.

La entrada canónica del producto es `/`: muestra el login dividido de la maqueta aprobada y, tras autenticarse, el shell con barra lateral y módulos. Las rutas heredadas `/gestion`, `/reuniones`, `/prevencion` y `/maqueta` redirigen a esa entrada. No se monta una segunda aplicación visual. Las pantallas funcionales consumen la API local para los datos de demostración; solo las preferencias de presentación quedan en el navegador. El alcance es una demostración local con registros ficticios, no un sistema habilitado para usuarios o datos reales.

El recorrido principal conectado comprende login, selección de faena existente, integrantes, reuniones, agenda y asistencia, borradores de acta, acuerdos/acciones, incidentes y metadatos de documentos. La creación de empresas/faenas, adjuntos binarios, firma electrónica, IA remota y algunos flujos avanzados siguen pendientes. Los datos de seed son sintéticos.

GCP no limita el desarrollo actual: migraciones, reglas, permisos, pruebas, UI, contenedores y respaldos pueden avanzar localmente. Proyecto, región, presupuesto e identidad del entorno cloud se resuelven antes de aplicar infraestructura.

Las columnas SQL DATE se entregan como YYYY-MM-DD: no se convierten en timestamps. Los timestamps de auditoría y eventos siguen representando instantes con zona horaria.
