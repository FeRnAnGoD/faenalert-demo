# Diseño del espacio integrado de prevención

El módulo /prevencion utiliza la identidad de FAENALERT: verde oscuro como superficie de contexto, naranja para la acción principal y superficies claras para lectura. La fotografía es un activo ya existente del repositorio.

La pantalla de acceso presenta el propósito y el ingreso. El espacio autenticado muestra contexto de faena, indicadores con datos de API, creación de inspección y lista navegable. El detalle organiza hallazgos, acciones y evidencias. Las acciones adicionales se despliegan para evitar formularios extensos abiertos por defecto.

Los indicadores de hallazgos y cierres pertenecen explícitamente a la inspección abierta; el total de inspecciones corresponde a la faena. Los estados se presentan en español con texto y color. Las fechas se formatean para Chile. Los mensajes de error y carga se anuncian mediante alert/status. El perfil lector consulta sin formularios de escritura.

Se separaron plantilla, estilos y estado. Shadow DOM evita que los estilos globales heredados de la maqueta alteren el nuevo módulo. Hay disposición de una columna en celular, campos adaptables, foco visible y respeto por preferencias de movimiento reducido.

El backend conserva autorización por recurso, validación, transacciones, versiones, auditoría y reglas de cierre. El diseño de interfaz no sustituye esas verificaciones.
