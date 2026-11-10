# Especificación de la maqueta FaenAlert

Fecha: 2 de noviembre de 2026. Estado: frontend de demostración local.

## Objetivo

Ayudar a un Comité Paritario a preparar reuniones, dar continuidad a acuerdos, registrar evidencia y organizar medidas preventivas en centros de trabajo de distintas industrias. El trabajo se organiza por responsables y fechas de entrega; las reuniones sí permiten indicar su hora. Las reuniones diarias de desarrollo a las 18:00 del apunte no se representan como una obligación diaria del CPHS.

## Decisiones de alcance

Se toma el diseño visual adjunto como referencia y se aplica el feedback: omitir votaciones y no limitar la imagen a minería. Las correcciones normativas investigadas en el chat se incorporan a los textos: DS 44 como referencia general actual. No se reproducen los rótulos DS 54 como norma vigente ni garantías de certificación, anonimato electoral o predicción que no existen en la maqueta. La referencia a ley 21.163 en apuntes requiere corrección jurídica: el estudio previo identificó Ley 21.663 para ciberseguridad; no es una prohibición de SQL. Antes de producción, actualizar revisión legal.

## Usuarios previstos

Presidenta/presidente, secretaría, representantes titulares y suplentes, experto de prevención sin voto, responsables de medidas y administradores de empresa. La aplicación mantiene separados los cargos del Comité Paritario y los permisos de cuenta (ADMIN, EDITOR, REVIEWER y VIEWER), que se autorizan en backend por faena. El experto asesor no ocupa un cupo de representación ni se presenta como titular con voto.

## Flujos

1. Landing de presentación → acceso demo → selección de faena → panel.
2. Crear reunión → agenda → asistencia → notas → acuerdos → generar acta borrador.
3. Editar acta → guardar borrador → solicitar revisión simulada → imprimir/PDF.
4. Crear medida → asignar dueño/entrega/prioridad → cambiar estado → exportar.
5. Registrar evento ficticio → expediente → hechos/factores a validar → crear medida.
6. Integrantes → búsqueda/filtro → agregar/editar → exportar.
7. Documentos → filtros → metadatos de archivo → vista → fuente oficial o descarga de ejemplo.
8. Asistente → preguntas guiadas → respuestas locales transparentes.

## Identidad visual

Naranjo #f2701a para acciones primarias; verde #033c32 en navegación; blancos y superficies claras de apoyo; texto azul gris, estados semánticos verdes/ámbar/rojos. Tipografía de sistema legible. Sidebar fija en escritorio, menú lateral desplegable en móvil, tablas con desplazamiento horizontal, modal en viewport, controles de foco y etiquetas accesibles. Fotografía contextual por industria. Maqueta adaptable a celular y escritorio.

## Criterios funcionales

- Acceder a todos los módulos mediante navegación sin enlaces muertos.
- Validar campos requeridos y correo en formularios.
- Persistir registros creados y editados tras recarga.
- Exportar CSV escapando comillas y separadores.
- No mostrar adjuntos como almacenados si solo se conserva el nombre.
- No exponer afirmaciones de autenticación, firmas o IA real en el frontend demo.
- Los números de reportes deben identificarse como ilustrativos si no se derivan del estado.

## Próxima conexión

Extraer fachadas por dominio y reemplazar repositorio local por HttpClient. Incorporar router Angular y lazy loading por módulo en la fase de integración; hoy la navegación usa vistas del prototipo y hashes. Centralizar autorización, manejo de errores, carga, conflictos, auditoría y paginación en API. Desarrollar subida segura de archivos, flujo de firmas, notificaciones y aislamiento tenant. Los registros se separan en claves locales por faena. Esta separación de la maqueta no representa una frontera de seguridad; la API debe autorizar cada recurso.

## Seguridad de producción

NestJS como única puerta de datos; consultas parametrizadas/ORM en servidor; roles y pertenencia por recurso; TLS; sesiones seguras; MFA para privilegios; buckets privados; auditoría protegida; secretos gestionados; retención y respaldo/restauración. Cloud Run, Cloud SQL y Cloud Storage son opciones a evaluar para GCP. Esta maqueta no implementa ni acredita esos controles.
