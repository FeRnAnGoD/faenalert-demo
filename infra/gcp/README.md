# Camino de despliegue a GCP

Todavía no se han creado recursos cloud. La imagen de API recibe PORT, DATABASE_URL, CORS_ORIGIN, JWT_SECRET y LOCAL_AUTH_ENABLED por entorno. Incluye apagado ordenado y health checks. La conexión PostgreSQL acepta una URL con sslmode=verify-full y certificados según el proveedor.

1. Elegir proyecto, región, cuentas y presupuesto.
2. Configurar proveedor de identidad y su adaptador de verificación; la autenticación local está bloqueada en producción.
3. Artifact Registry para imágenes; Cloud Run para API; PostgreSQL administrado (Cloud SQL) con conexión privada o conector y roles separados de migración y ejecución.
4. Ejecutar migraciones como tarea única previa al rollout, nunca desde cada réplica. Mantener los cambios compatibles con la versión anterior.
5. Secret Manager para secretos y Workload Identity para CI, sin JSON de cuentas de servicio.
6. Frontend servido con fallback SPA y proxy /api al backend; CORS limitado al origen exacto.
7. Cloud Storage privado para adjuntos cuando exista su módulo; evitar almacenamiento efímero de Cloud Run.
8. Configurar logs, métricas, alertas, backup, prueba de restauración y rollback de imagen.

No se agrega Terraform con identificadores inventados ni se ejecutan despliegues. Esta guía describe las decisiones y el contrato que deberá implementar la infraestructura del entorno.
