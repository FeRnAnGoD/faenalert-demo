# Faenalert-Comite_Paritario

Plataforma empresarial para la gestión de **Prevención de Riesgos Laborales**, **Fiscalización Operacional** y **Comités Paritarios de Higiene y Seguridad (CPHS)**, orientada al marco chileno del Decreto Supremo Nº 44 y la Ley 16.744, y a operaciones de alta exigencia (minería, faenas industriales y construcción).

El repositorio está estructurado como un monorepo modular con **Angular**, **NestJS** y **PostgreSQL 17**. La API comprueba el acceso por faena; las relaciones críticas tienen restricciones relacionales, y la auditoría append-only está protegida por base de datos. Las entidades editables usan control de concurrencia optimista.

---

## 🏛️ Arquitectura del Monorepo

```
faenalert-platform/
├── apps/
│   ├── api/                 # Backend modular NestJS 11 + PostgreSQL 17 nativo
│   │   ├── migrations/      # Esquema versionado con advisory locks y checksums
│   │   ├── src/auth/        # Autenticación scrypt + JWT con guard por faena
│   │   ├── src/committees/  # Gestión CPHS: periodos, paridad y membresías
│   │   ├── src/common/      # Control de acceso RBAC, auditoría y errores tipados
│   │   ├── src/workspace/   # Empresas, faenas, períodos de comité y accesos por espacio
│   │   ├── src/database/    # Pool pg con auto-reconexión y transacciones atómicas
│   │   ├── src/operations/  # Catálogo Zod: incidentes, actas, capacitaciones y documentos
│   │   ├── src/prevention/  # Inspecciones, hallazgos, acciones y verificación
│   │   └── test/            # Tests unitarios e integración real sobre DB desechable
│   ├── web/                 # Frontend SPA en Angular 19+ (Standalone Components)
│   │   ├── src/app/platform/  # Servicios de sesión, API, contexto y drafts
│   │   ├── src/app/prevention.ts / prevention.html # Flujo preventivo integrado
│   │   ├── src/app/meetings.ts / meetings.html     # Vistas de reuniones y actas
│   │   ├── src/app/management.ts                   # Centro de gestión
│   │   └── src/app/         # Shell funcional derivado de la maqueta aprobada
│   └── desktop/             # Contrato y especificación para cliente Tauri 2
├── packages/
│   └── contracts/           # Interfaces y tipos TypeScript compartidos cliente/servidor
├── infra/
│   ├── nginx/               # Reverse proxy local, headers de seguridad y SPA routing
│   └── gcp/                 # Especificaciones de infraestructura cloud (Cloud Run / Cloud SQL)
├── scripts/
│   ├── backup.ps1           # Respaldo PostgreSQL en formato binario personalizado (pg_dump)
│   └── verify-recovery.ps1  # Simulación de caída de base de datos y recuperación
└── docs/
    ├── adr/                 # Architecture Decision Records (ADR 0001: Base local)
    ├── API_LOCAL.md         # Catálogo de endpoints, contratos y códigos de error
    └── VERIFICACION_LOCAL.md# Matriz de pruebas y validaciones locales ejecutadas
```

---

## ⚙️ Principios de Diseño y Reglas de Negocio

1. **Datos organizados por empresa y faena**:
   - `organizations` representa la empresa y `sites` es la tabla de faenas.
   - Los módulos de la faena guardan su `site_id` directamente o heredan el contexto por su registro padre (por ejemplo, acciones → hallazgos → inspecciones).
   - `site_access` asigna usuarios y un rol a cada faena. La API verifica esa asignación antes de leer o modificar sus registros; algunas relaciones críticas también tienen claves foráneas compuestas.

2. **Auditoría e Historial Inmutables**:
   - La tabla `audit_events` y las revisiones de actas (`minute_revisions`) cuentan con *triggers* en PL/pgSQL que rechazan operaciones `UPDATE` y `DELETE` (`append-only`). Los eventos registran actor, faena, entidad, acción, detalles y fecha.

3. **Flujo de Prevención con Segregación de Funciones (*Maker-Checker*)**:
   - Circuito: `Inspección → Hallazgo → Acción correctiva → Evidencia → Verificación → Cierre`.
   - No se permite saltar de estado pendiente a cerrado directamente.
   - Requiere evidencia registrada previo a la solicitud de verificación.
   - **Regla Maker-Checker**: El usuario asignado como responsable de la acción no puede verificar ni auto-aprobar su propio cierre.

4. **Concurrencia Optimista**:
   - Todas las entidades editables manejan una columna `version`. Modificaciones concurrentes sobre versiones desactualizadas son rechazadas con código HTTP `409 Conflict`.

5. **SQL Parametrizado Puro**:
   - Sin ORMs que oculten el costo de las consultas; se utiliza el driver nativo `pg` con transacciones explícitas y validación estricta de payloads con esquemas `Zod`.

6. **Una experiencia, respaldada por la API local**:
   - La ruta `/` muestra el acceso dividido de la maqueta; tras ingresar abre el mismo espacio de trabajo con barra lateral y módulos.
   - Las rutas heredadas `/gestion`, `/reuniones`, `/prevencion` y `/maqueta` redirigen a `/`. No son aplicaciones paralelas.
   - Reuniones, actas, acuerdos, integrantes, incidentes y documentos de ejemplo se leen y guardan mediante la API NestJS y PostgreSQL. Solo las preferencias de presentación se guardan en el navegador.

---

## 📋 Requisitos Previos

- **Para levantar la demo:** Docker Desktop con motor de contenedores Linux.
- **Para compilar o ejecutar herramientas desde el host:** Node.js 24.x y pnpm 11.25.x o superior.

---

## 🚀 Iniciar la demostración funcional local

### 1. Configurar el entorno local

~~~powershell
git clone --branch feature/Demo-Base https://github.com/JeanU10/faenalert-platform.git faenalert-platform
Set-Location faenalert-platform

# No reemplaza una configuración local que ya exista.
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
~~~

> [!NOTE]
> Cambia `POSTGRES_PASSWORD`, `JWT_SECRET` y `SEED_PASSWORD` en el `.env` local antes de compartir el entorno.

### 2. Levantar el sistema completo en Docker

~~~powershell
docker compose --profile app up -d --build --wait
~~~

Docker inicia PostgreSQL, aplica las migraciones, carga los registros ficticios y sirve Angular y NestJS detrás de Nginx. La dirección usa `WEB_PORT` del `.env` (8081 por defecto en esta rama).

- **Aplicación**: [http://127.0.0.1:8081/](http://127.0.0.1:8081/)
- **Estado API**: [http://127.0.0.1:8081/api/v1/health/live](http://127.0.0.1:8081/api/v1/health/live)
- **Documentación API**: [http://127.0.0.1:8081/api/docs](http://127.0.0.1:8081/api/docs)

Las rutas heredadas `/gestion`, `/reuniones`, `/prevencion` y `/maqueta` conducen al mismo inicio. Para grabar todos los módulos usa `faenalert-admin@faenalert.local` (administración global local); su contraseña está en `FAENALERT_ADMIN_PASSWORD` dentro del `.env` raíz. Para una demostración pública usa `demo@faenalert.local`, perfil `VIEWER`, con una contraseña independiente configurada en `PROMO_VIEWER_PASSWORD`. No publiques la contraseña administrativa.

### Cuentas Demo Sembradas

El seed es idempotente. Las cuentas anteriores mantienen `SEED_PASSWORD`; las cuentas FaenaAlert usan claves independientes configuradas localmente:

| Correo | Rol en Faena | Propósito |
| :--- | :--- | :--- |
| `admin@demo.local` | `ADMIN` | Creación de inspecciones, miembros y comités |
| `verificador@demo.local` | `REVIEWER` | Verifica acciones sin administrar la faena |
| `lector@demo.local` | `VIEWER` | Consulta de auditoría y lectura sin privilegios de escritura |
| `demo@faenalert.local` | `VIEWER` | Acceso promocional de solo lectura para el stand |
| `faenalert-admin@faenalert.local` | `ADMIN` + `PLATFORM_ADMIN` | Administración local para grabar y preparar la demo |

Configura `PROMO_VIEWER_PASSWORD` y `FAENALERT_ADMIN_PASSWORD` en el `.env` local; no se guardan en Git. Comparte únicamente las credenciales de solo lectura en un material público.

Los permisos técnicos de demostración están en `roles`; `site_access` los relaciona con usuarios y faenas. El catálogo de roles de negocio y su alcance definitivo se deben validar antes de cargar usuarios reales.

---

Para detener el stack preservando los datos:
~~~powershell
docker compose --profile app stop
~~~

---

## 🧪 Pruebas y Aseguramiento de Calidad

El monorepo cuenta con una suite completa de pruebas automatizadas:

~~~powershell
# Compilar todos los paquetes y aplicaciones
pnpm build

# Ejecutar pruebas unitarias de reglas de dominio
pnpm test

# Ejecutar pruebas de integración HTTP / PostgreSQL
pnpm --filter @faenalert/api test:integration

# Verificación integral en un solo comando
pnpm verify
~~~

> [!TIP]
> El runner de pruebas de integración (`run-integration.ts`) crea una base de datos temporal desechable, corre las migraciones, ejecuta más de 80 aserciones (RBAC, concurrencia, transacciones, auditoría e inmutabilidad) y la destruye al finalizar, sin alterar los datos de desarrollo.

---

## 💾 Respaldos y Recuperación

~~~powershell
# Crear un respaldo PostgreSQL custom en backups/; valida el archivo y muestra SHA-256
$backupOutput = ./scripts/backup.ps1
$backupOutput

# Restaurar ese archivo en una base aislada y comparar todas las tablas públicas
$backupLine = @($backupOutput | Where-Object { $_.StartsWith('Backup: ') })[0]
$backupPath = $backupLine.Substring(8)
./scripts/verify-backup-restore.ps1 -BackupPath $backupPath -CompareCurrent

# Alternativa: generar, restaurar y borrar un respaldo temporal en una sola pasada
./scripts/verify-backup-restore.ps1

# Ejecutar prueba de tolerancia a fallos y reconexión del pool
./scripts/verify-recovery.ps1
~~~

---

## 🗺️ Estado del Proyecto y Próximos Pasos

| Dominio | Estado Actual | Siguiente Hito |
| :--- | :--- | :--- |
| **Prevención y Hallazgos** | Inspecciones, hallazgos, acciones, evidencia textual y verificación integrados con API y PostgreSQL | Adjuntos binarios y almacenamiento privado GCS/S3 |
| **Reuniones y Actas CPHS** | Integrado con revisiones inmutables y borradores | Flujo de firma electrónica simple |
| **Integrantes CPHS** | Lectura y edición de integrantes ficticios desde la UI y API | Elecciones y reemplazo formal de miembros |
| **Incidentes** | Registro por faena, bitácora append-only y acciones enlazadas al tablero común | Validar proceso formal, clasificación y acceso a información sensible antes de uso operativo |
| **Capacitaciones** | Alta/edición por faena, lista de participantes, asistencia y bitácora textual | Política de privacidad/retención y adjuntos de certificados |
| **Comisiones** | Objetivo y acciones vinculadas al tablero, con responsable, evidencia y verificación | Definir y modelar la composición formal de integrantes |
| **Documentos** | Metadatos de ejemplo conectados; descarga ilustrativa | Adjuntos binarios y almacenamiento privado |
| **Empresas y faenas** | Alta y edición lógica de empresas y faenas, períodos iniciales y asignación/revocación de cuentas existentes; catálogo público chileno separado | Aprovisionamiento de usuarios e invitaciones tras decidir identidad y políticas |
| **Asistente y reportes** | Respuestas locales e indicadores calculados sobre datos sintéticos | IA conectada y analítica validada |
| **Autenticación** | Local scrypt + JWT (restringido en producción) | Integración OIDC (Google Workspace / Entra ID) |
| **Cliente Escritorio** | Especificación y contratos definidos | Compilación con toolchain Rust en Tauri 2 |

---

## 📄 Licencia

Propiedad privada. Todos los derechos reservados. Desarrollado para Faenalert.
