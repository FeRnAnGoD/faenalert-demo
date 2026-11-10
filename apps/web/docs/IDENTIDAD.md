# Identidad visual de FaenAlert CPHS

Aplicada a la maqueta local a partir del telón PDF y las tres referencias adjuntas por el usuario el 2 de noviembre de 2026.

| Uso | Color |
| --- | --- |
| Azul marino principal | `#14283F` |
| Azul profundo | `#08243E` |
| Naranja de marca, símbolo y navegación activa | `#EF6B17` |
| Acción con texto blanco, variante de mayor contraste | `#BD4B08` |
| Superficie | `#FFFFFF` |
| Fondo | `#F4F6F9` |
| Texto secundario | `#526579` |

Los tokens se encuentran en `src/responsive.css`. Se reemplazó la anterior gama verde por azules; el verde se conserva para comunicar éxito y estados activos. Las alertas mantienen sus colores semánticos y etiquetas.

`src/app/brand.ts` contiene un símbolo vectorial recreado a partir de la referencia CPHS y un nombre escrito como texto escalable. Es una aproximación para la maqueta; el archivo vectorial oficial podrá sustituirlo cuando esté disponible. Se reutiliza en la landing, la navegación y el acceso.

La landing combina una propuesta de valor, una vista ilustrativa del panel y secciones de funciones y recorrido. El botón de entrada abre el acceso de demostración, que incluye una opción para explorar directamente; el acceso no es autenticación real. Las credenciales de ejemplo se documentan fuera del login. El panel previo se marca como demostración y usa datos ficticios. Sus animaciones son discretas y respetan la preferencia de movimiento reducido.

Se mantienen los puntos de adaptación y accesibilidad documentados en RESPONSIVE.md: menú móvil, tablas como tarjetas, formularios desplazables, foco visible, teclado y controles táctiles. La aplicación continúa como demostración local, sin backend ni autenticación real.

Validación: compilación Angular de producción correcta; revisión visual en escritorio, tablet y móvil, incluyendo integrantes y formulario a 320 px. No equivale a una auditoría completa de accesibilidad.
