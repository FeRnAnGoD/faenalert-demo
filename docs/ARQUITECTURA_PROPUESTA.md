# Arquitectura propuesta

**Estado:** propuesta inicial para revisión. No es despliegue ni configuración productiva.

## 1. Vista lógica

    Angular Web ───────┐
                       ├── HTTPS /api/v1 ── NestJS ── PostgreSQL
    Tauri Desktop ─────┘                       ├────── almacenamiento privado de archivos
                                               └────── proveedor de identidad

Vercel hospeda hoy la maqueta de referencia. No es una decisión de que deba alojar NestJS o PostgreSQL. La plataforma operativa requerirá entornos propios. GCP aparece en los apuntes como candidato; deben confirmarse propietario del proyecto, región, servicios, presupuesto y cuentas.

## 2. Responsabilidades

### Angular

- Presentar landing y pantallas de la aplicación.
- Navegación por módulos y selección de contexto.
- Validación de experiencia de usuario; las reglas se vuelven a validar en API.
- Manejar estados de carga, error, vacío, permisos y concurrencia.
- No incluir secretos SQL, claves de GCP ni credenciales de servicio.
- Sustituir DemoRepository/localStorage por servicios HTTP por dominio.

### NestJS / Node.js

- Único punto de acceso a datos operacionales.
- Autenticación y validación de permisos por usuario, tenant, faena y acción.
- DTO, validación, reglas de estado, relaciones e integridad.
- Auditoría, notificaciones, generación/control de informes y enlaces temporales.
- OpenAPI versionado, errores estructurados y paginación.
- No confiar en IDs o tenant enviados por el navegador; derivar pertenencia de la sesión.

### PostgreSQL

- Registros operacionales en entidades relacionales normalizadas.
- Foreign keys, constraints, índices y transacciones.
- Migraciones de esquema versionadas.
- Particionar solo cuando volumen/consultas medidos lo justifiquen.
- Mantener PII y datos de salud separados o restringidos según finalidad.

### Almacenamiento privado

- Adjuntos fuera del bundle Angular y del directorio público.
- Metadatos y relación con faena guardados en PostgreSQL.
- Archivos cifrados, permisos y URLs firmadas de corta duración.
- Validar tamaño, tipo, antivirus y política de retención antes de guardar.
- No publicar enlaces permanentes a actas e investigaciones.

### Tauri

- Empaquetar la interfaz Angular como cliente de escritorio.
- Consumir la misma API HTTPS que el cliente web.
- No duplicar las reglas de negocio ni conectar directamente a PostgreSQL.
- Mantener capacidades nativas mínimas.
- Offline y sincronización quedan fuera hasta definir conflicto, cifrado local y borrado remoto.

## 3. Modelo de organización y seguridad

Relación inicial:

    Empresa/Tenant
      └── Contrato o faena
            ├── Comité por período
            ├── Áreas
            ├── Reuniones / actas / acciones
            ├── Inspecciones / hallazgos
            ├── Capacitaciones / comisiones
            ├── Incidentes / investigaciones
            └── Documentos

Un usuario puede tener acceso a una o varias faenas mediante asignaciones explícitas. Todas las lecturas, modificaciones, exportaciones y descargas deben comprobar esa asignación en la API. Si una organización opera varias empresas, la estructura puede requerir una entidad de grupo; confirmarlo antes de migraciones.

## 4. Modelo relacional y analítico

### Sistema operacional

Usar normalización para empresa, faena, personas, usuarios, comité, integrantes, documentos, reuniones, acciones e investigaciones. Las relaciones y periodos se registran explícitamente. Actas y documentos aprobados se versionan.

### Analítica futura

Medallón es una canalización analítica posterior:

- Bronce: copia de entradas con origen, fecha y versión de esquema.
- Plata: normalización, calidad, deduplicación y validaciones.
- Oro: agregados, dimensiones e indicadores listos para análisis.

El esquema estrella se consume para reportes y tableros. No es necesario duplicar el modelo operacional en una estrella para editar los registros.

### Grafo

Evaluar solo tras identificar consultas como rutas entre peligro, control, equipo, área, incidente y dependencia. Hacer primero una prueba con PostgreSQL y medir complejidad/performance; incorporar base de grafos si existe un beneficio que justifique operación adicional.

## 5. API

Base propuesta: /api/v1. Contrato detallado preliminar en apps/web/docs/API.md.

Dominios: auth, organizations, sites, committees, members, meetings, minutes, actions, documents, inspections, trainings, commissions, incidents, investigations, reports, imports y TV metrics.

Formato de lista: items, page, pageSize, total. Errores: code, message, fieldErrors, requestId. Versiones concurrentes: respuesta de conflicto; validación de campos: respuesta no exitosa con errores específicos. Las rutas de descarga se autorizan por cada archivo.

## 6. Ambientes

1. Local: contenedores o servicio local; datos sintéticos; secretos locales ignorados.
2. CI: compilación, análisis, pruebas y revisión de migraciones sin datos de cliente.
3. Development: API/DB aisladas para el equipo.
4. Staging: copia de esquema sin información personal, pruebas de aceptación.
5. Producción: solo con aprobación, accesos mínimos, backups, monitoreo y rollback.

GCP Cloud Run, Cloud SQL y Cloud Storage son candidatos descritos en la especificación actual, no servicios ya aprobados ni configurados.

## 7. Observabilidad y continuidad

- Logs estructurados con requestId; no registrar tokens, datos clínicos ni contenido de documentos.
- Métricas técnicas para disponibilidad, errores, latencia, DB y colas de archivos.
- Alertas operacionales dirigidas a responsables designados.
- Backup automatizado, retención definida y prueba de restauración.
- Runbook de despliegue y rollback.
- Registro de cambios de configuración y acceso privilegiado.

