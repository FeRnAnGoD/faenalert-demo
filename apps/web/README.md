# FaenAlert — frontend

La aplicación funcional local se abre en http://127.0.0.1:8081/. Su ruta principal reproduce el acceso dividido de la maqueta aprobada; al iniciar sesión muestra el espacio de trabajo con barra lateral. Las rutas heredadas /gestion, /reuniones, /prevencion y /maqueta conducen al mismo inicio.

El shell Angular consume la API local para datos sintéticos persistidos en PostgreSQL. El README de la raíz explica el arranque completo en Docker y las credenciales de demostración.

## Alcance conectado

El recorrido actual cubre login, selección de faena existente, integrantes, reuniones, agenda, asistencia, borradores de actas, acuerdos/acciones, incidentes y metadatos de documentos. La cuenta de ejemplo es admin@demo.local; la contraseña está en SEED_PASSWORD del .env raíz.

## Límites

- Toda la información del seed es ficticia.
- La creación de empresas y faenas no está conectada.
- Los documentos conservan metadatos; la descarga es ilustrativa. No hay almacenamiento de adjuntos.
- El asistente entrega respuestas locales predefinidas; no llama a un modelo de IA.
- No hay firma electrónica final, MFA, OIDC ni recuperación de cuenta.
- La aplicación es local y no se ha desplegado en nube.

La vista de presentación permanece accesible desde el botón correspondiente en el login; no es otra aplicación ni el destino obligatorio al abrir el sitio.
