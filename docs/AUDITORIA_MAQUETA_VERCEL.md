# Auditoría funcional de la maqueta FAENALERT en Vercel

**Fecha:** 5 de noviembre de 2026

**URL revisada:** https://faenalert-maqueta.vercel.app/

**Estado:** auditoría de interfaz y contraste con el código fuente disponible en `apps/web`.

**Resultado general:** adecuada como presentación interactiva con datos ficticios; no apta para gestionar información real ni para operación productiva.

## 1. Alcance y método

Se recorrieron en el despliegue publicado la landing y el ingreso a la maqueta, el panel, empresas/faenas, reuniones, actas, acuerdos/acciones, integrantes, accidentes/incidentes, documentos, asistente, reportes y configuración. Se abrieron formularios para leer campos y comportamiento declarado, y se cerraron sin crear ni modificar registros. La auditoría fue de solo lectura.

El contraste de implementación se hizo con la copia Angular incluida en este repositorio: `apps/web/src/app/app.ts`, `app.html`, `repository.ts` y la documentación en `apps/web/docs/`. No se verificó que el despliegue Vercel corresponda a un SHA concreto del repositorio ni se inspeccionó su configuración de infraestructura. Tampoco se ejecutaron pruebas automatizadas ni una auditoría de seguridad.

En este documento:

- **Observado** significa visible en la versión publicada durante el recorrido.
- **Confirmado en código** significa que la implementación local permite corroborar cómo funciona.
- **Por validar** indica una regla de negocio que la maqueta no permite confirmar.

## 2. Resumen ejecutivo

La maqueta comunica bien el propósito de organizar el trabajo de un Comité Paritario y presenta un recorrido comprensible. Su base funcional más clara es la gestión de reuniones, actas, acuerdos, integrantes y expedientes de incidentes. La empresa VialCorp y sus seis faenas aparecen en el espacio de trabajo.

El límite principal es arquitectónico: la aplicación es un frontend de demostración. Los registros se guardan en `localStorage` del navegador, no hay API NestJS ni PostgreSQL conectados, y la identidad/permisos se declaran ilustrativos. La etiqueta de empresa/faena no constituye aislamiento de datos. El asistente entrega respuestas preparadas, los reportes incluyen valores ilustrativos, la selección de archivo conserva su nombre, y las firmas quedan pendientes del backend.

El flujo de la landing solicitado previamente está presente: **Explorar maqueta** conduce al login. Desde la pantalla de login, su botón **Explorar maqueta** ingresa al espacio de demostración. No se encontraron credenciales de prueba visibles inicialmente; sin embargo, el código del login no autentica realmente y contiene una verificación fija de demostración. Debe reemplazarse por identidad del backend antes de incorporar usuarios o información real.

## 3. Módulos y nivel de implementación

| Área | Estado observado | Alcance real de la maqueta |
|---|---|---|
| Landing e ingreso | Presente | Presentación, datos ficticios y acceso a la demo; no hay sesión real. |
| Empresas y faenas | Presente | VialCorp con Los Pelambres, Centinela, Collahuasi, Teck QB, MOP y Casa Central; selección visual de faena. |
| Panel general | Presente | Indicadores, próxima reunión y acciones con información de ejemplo. |
| Reuniones | Presente | Lista, detalle con agenda, asistencia, notas, acuerdos y documentos; el recorrido puede generar un borrador de acta. |
| Actas | Presente | Crear/editar registros y cambiar estados de demostración; sin firma ni aprobación con validez operativa. |
| Acuerdos y acciones | Presente | Responsable, vencimiento, tipo, estado y prioridad; no se observó un flujo completo de evidencia y verificación de cierre. |
| Integrantes | Presente | Lista de 12 personas sintéticas, representación, rol, titular/suplente, filtros y formulario de alta. |
| Accidentes e incidentes | Parcial | Registro genérico y expediente de ejemplo; faltan campos y etapas para una investigación operativa completa. |
| Documentos y normativa | Parcial | Catálogo y metadatos; el formulario advierte que el almacenamiento de archivo se conectará después. |
| Asistente IA | Simulado | Respuestas locales predefinidas y referencias; no consulta un modelo ni documentos conectados. |
| Reportes | Ilustrativo | Métricas de demo y gráfico marcado como ejemplo; permite descargar datos como CSV. |
| Configuración | Demostrativa | Preferencias guardadas en navegador; el propio panel califica los permisos como ilustrativos. |
| Inspecciones | Sin módulo propio | Se mencionan en agenda y como tipo de acuerdo, pero no hay un flujo navegable de checklist/inspección. |
| Capacitaciones | Sin módulo propio | Aparecen como tipo de acuerdo y tema de agenda; no hay planificación, asistencia ni evidencia de capacitación. |
| Comisiones | No observado | No existe sección ni flujo específico en la navegación revisada. |
| Excel / PDF | Parcial | Hay exportaciones CSV y opción de impresión del navegador; no se encontró importación Excel ni generación de PDF controlada por backend. |
| Tablero para TV / Tauri | No observado | No hay modo de pantalla de solo lectura ni aplicación Tauri comprobada. |

## 4. Hallazgos priorizados

### P0 — Bloqueantes antes de usar datos reales

1. **Autenticación de demostración, no autenticación real.** La interfaz solicita correo, contraseña y código, pero el código fuente valida la entrada en el navegador y usa un valor fijo. No hay proveedor de identidad, sesión respaldada por servidor ni protección frente a manipulación del cliente. La ausencia de credenciales visibles en el formulario no convierte este mecanismo en acceso seguro.

2. **Persistencia local sin continuidad central.** `DemoRepository` lee y escribe `localStorage`, con una clave local por ID de faena. Los datos no se sincronizan entre usuarios o dispositivos, no existe respaldo central ni auditoría. Al limpiar el navegador o cambiar de equipo, se pierde esa continuidad. Las seis faenas parten además del mismo conjunto base sintético; separarlas por clave local no equivale a separar empresas en un servidor.

3. **Sin autorización ni aislamiento multiempresa en servidor.** Configuración avisa que los permisos son ilustrativos y que la autorización real queda para servicios conectados. Hoy no hay API que valide pertenencia de usuario, empresa y faena en cada lectura, edición, descarga o exportación.

4. **Los adjuntos no quedan almacenados.** El formulario de documentos indica que el backend se conectará después. En el código, seleccionar un archivo mantiene su nombre como metadato de demostración; no hay almacenamiento privado, control de acceso, versionado ni descarga del archivo original.

### P1 — Necesarios para un MVP operativo

5. **Faltan inspecciones, capacitaciones y comisiones como dominios propios.** La maqueta menciona estos conceptos, pero no ofrece formularios, estados, listados ni seguimiento específico. Para el objetivo preventivo, deben diseñarse como flujos completos y relacionarse con acciones.

6. **Investigación de incidentes demasiado resumida.** El formulario general captura título, descripción, fecha, responsable, tipo, estado y prioridad. El expediente de ejemplo muestra hechos, factores por validar y medidas propuestas, pero no modela cronología, equipo investigador, fuentes/evidencias, revisión, restricciones por sensibilidad ni cierre auditable.

7. **Actas, revisión y firma son simuladas.** Se puede preparar un borrador e imprimir desde el navegador; la solicitud de firma solo cambia un estado local y la interfaz informa que el envío de firmas está pendiente. No existe versionado verificable ni un circuito real de aprobación.

8. **Intercambio no cubre el requisito Excel/PDF.** El código exporta colecciones en CSV; no se encontró carga/importación XLSX con vista previa, validación por fila o control de duplicados. La impresión del navegador no garantiza una plantilla PDF estable para actas o informes.

9. **Datos de reuniones pueden perderse si no se convierten en acta.** Agenda, asistencia y notas se manejan en estado del componente; el repositorio de demostración persiste reuniones y actas, pero no un modelo dedicado para esos elementos. Conviene guardar borradores de forma explícita y definir qué se conserva al salir o cambiar de faena.

10. **VialCorp está incorporado como dato de ejemplo, no como configuración multiempresa.** Es correcto para la presentación solicitada, pero la plataforma debe permitir múltiples organizaciones y faenas sin reutilizar datos sintéticos ni nombres del cliente en el código.

### P2 — Consistencia y evolución

11. **Fecha visible desactualizada.** En el recorrido del 5 de noviembre de 2026, la barra superior mostraba “Lun, 02 noviembre 2026”. El código también compara vencimientos con una fecha fija (`2026-11-02`), lo que puede clasificar mal compromisos vencidos. La fecha debe derivarse de la hora local y las reglas de negocio deben usar una fuente temporal coherente.

12. **Reportes y analítica no deben presentarse como medición real.** El módulo indica “Datos de demostración” y “Ejemplo ilustrativo”, lo cual es apropiado. El gráfico es una secuencia fija y la nota aclara que no calcula tasas de accidentabilidad sin exposición. Se deben conservar estas advertencias hasta definir fórmulas y fuentes aprobadas.

13. **Asistente sin IA conectada.** La respuesta revisada sobre acuerdos fue una plantilla local que lee el listado de demostración. La interfaz lo declara. Si se integra IA, habrá que decidir fuentes, permisos, retención de prompts y revisión humana antes de conectar datos reales.

14. **El requisito de TV requiere un modo específico.** Una pantalla operativa de TV debería tener sesión de solo lectura, datos agregados, contraste y tamaño tipográfico a distancia, renovación controlada y ausencia de nombres, incidentes identificables y notas confidenciales.

## 5. Modelo de dominio sugerido a partir de la maqueta

Esta estructura es una recomendación para iniciar diseño, no una regla confirmada por el negocio:

```text
Empresa
└── Contrato/faena
    ├── Comité y período
    │   ├── Personas e integrantes con historial
    │   ├── Reuniones → agenda/asistencia → actas versionadas
    │   ├── Acuerdos/acciones → responsables/evidencias → cierre
    │   ├── Inspecciones → checklist/hallazgos → acciones
    │   ├── Capacitaciones → sesiones/participantes/evidencias
    │   ├── Comisiones → integrantes/reuniones/acuerdos
    │   ├── Incidentes → investigación/evidencias/medidas
    │   └── Documentos → versiones/permisos/vigencia
    └── Usuarios con asignaciones y roles explícitos
```

PostgreSQL relacional normalizado es suficiente para el registro operacional inicial. La arquitectura Bronce/Plata/Oro, el modelo estrella y un grafo deben posponerse hasta tener datos operacionales confiables y preguntas analíticas concretas. Para cada cambio importante conviene registrar autor, fecha, entidad afectada y versión; una auditoría protegida no se sustituye con el historial de `localStorage`.

## 6. Primer flujo de desarrollo recomendado

Implementar una rebanada vertical pequeña pero real: **empresa/faena → comité e integrantes → inspección → hallazgo → acción preventiva → evidencia → cierre verificado**.

Orden sugerido:

1. Convertir esta auditoría en backlog y validar los campos y estados del flujo con quien representa a prevención y al comité. Dejar anotadas las decisiones no confirmadas.
2. Definir empresa/faena, asignaciones de usuario y roles antes de cargar registros; la API debe decidir acceso, nunca el cliente Angular.
3. Crear NestJS, migraciones PostgreSQL y contratos HTTP para faenas, comité, inspecciones, hallazgos y acciones. Usar solo datos sintéticos en desarrollo.
4. Implementar el flujo en servidor con validaciones, evidencia, historial de estado y bitácora. Probar explícitamente que una cuenta de otra faena no puede leer ni modificar los registros.
5. Conectar Angular por servicios HTTP y retirar `DemoRepository` del flujo nuevo. Mantener estados de carga, error, vacío y sin permiso.
6. Con ese modelo confirmado, añadir la continuidad de reuniones/actas y después capacitaciones, comisiones, Excel, PDF, TV y Tauri según prioridad.

Este flujo aprovecha el espacio de faenas y los acuerdos que ya muestra la maqueta, y cubre el vacío funcional más relevante: una inspección no termina en una observación, sino en una acción que se pueda verificar y cerrar.

## 7. Decisiones que conviene cerrar al iniciar

- Proveedor de identidad, sesiones, recuperación y MFA para perfiles con privilegios.
- Jerarquía organizacional exacta y permisos entre VialCorp, contratos y faenas.
- Campos, estados y criterios de cierre de una inspección y sus hallazgos.
- Evidencia admisible, tamaños, retención y quién puede verla o descargarla.
- Qué significa “conservar al equipo”: historial de personas, períodos, responsables y documentos que deben permanecer consultables.
- Plantillas/columnas Excel y diferencia entre acta oficial e informe PDF de gestión.
- Quién revisa y aprueba actas; si requiere firma electrónica y con qué proveedor.
- Qué indicadores se mostrarán en TV y qué datos personales deben excluirse.
- Si Tauri será online-only y en qué sistema operativo se instalará.

La maqueta sirve para plantear estas decisiones, pero no basta para deducirlas. En especial, no se deben migrar los nombres ni contactos sintéticos como si representaran miembros reales.

## 8. Evidencias de código relacionadas

- `apps/web/src/app/app.ts`: navegación, login de demo, fecha fija de vencimientos, formularios genéricos, generación de CSV, impresión, asistente local y guardado de preferencias.
- `apps/web/src/app/repository.ts`: datos iniciales y persistencia de demostración en `localStorage`.
- `apps/web/src/app/app.html`: campos y textos visibles de módulos, advertencias de demo y valores ilustrativos de reportes.
- `apps/web/docs/SDD.md`: limitaciones y criterios conocidos de la maqueta.
- `apps/web/docs/API.md`: contrato propuesto; declara expresamente que los endpoints no están implementados.

## 9. Conclusión

La maqueta de Vercel está lista para comunicar la idea y discutir los flujos. El siguiente paso técnico no es ampliar reportes o animaciones: es acordar el modelo de acceso y terminar un flujo preventivo completo con API y PostgreSQL. Hasta que eso exista, deben mantenerse los datos ficticios y las advertencias de demostración visibles.
