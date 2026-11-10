# Infraestructura

compose.yaml en la raíz ejecuta PostgreSQL local con health check, persistencia y puerto de loopback. El perfil app agrega tarea de migración, API NestJS y frontend en Nginx sin privilegios root. Dockerfiles usan compilación por etapas y dependencias fijadas por pnpm-lock.yaml.

Los archivos .env están ignorados; los ejemplos versionados no contienen secretos productivos. scripts/backup.ps1 genera respaldos PostgreSQL custom en backups/ (ignorado), valida que el archivo se pueda listar con pg_restore y entrega su SHA-256. scripts/verify-backup-restore.ps1 puede verificar ese archivo con `-BackupPath <archivo> -CompareCurrent`, restaurándolo en una base aislada y comparando las tablas/filas con el origen estable; sin ruta genera y borra un respaldo temporal. La base restaurada y las copias temporales del contenedor se eliminan al terminar. El destino futuro se describe en gcp/README.md.

Antes de cambiar una migración aplicada, crear una migración nueva: el runner rechaza cambios de checksum. Para un despliegue, migrar con un rol propietario separado y ejecutar API con un rol limitado.

Para restaurar una copia custom, copiarla al contenedor y usar pg_restore en una base nueva con --no-owner --no-acl; comprobar tablas, cantidad de registros y flujo de lectura antes de reemplazar un entorno. No restaurar sobre la base activa sin un procedimiento de recuperación aprobado.
