# Cliente de escritorio

La API y el frontend local ya se pueden consumir desde un contenedor de escritorio online. La base elegida sigue siendo Tauri 2, pero este equipo no dispone de cargo/Rust. El instalador y sus pruebas son un trabajo pendiente verificable, independiente de GCP.

Contrato del cliente:
- Consumir el mismo frontend y la misma API; ninguna conexión SQL ni secreto del servidor.
- En desarrollo usar http://127.0.0.1:8080/prevencion con el stack Docker.
- Para empaquetar, acordar URL del backend, orígenes CORS, CSP, firma Windows, actualizaciones e identidad.
- Sin sincronización offline ni almacenamiento local de información real en esta etapa.

No se incluyen archivos Rust sin compilar como si constituyeran un cliente funcional.
