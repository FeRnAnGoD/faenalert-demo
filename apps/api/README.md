# API local

NestJS modular, PostgreSQL y SQL parametrizado. Desde la raíz: pnpm db:up, pnpm db:migrate, pnpm db:seed y pnpm dev. Configurar antes .env y apps/api/.env desde sus ejemplos. El usuario de desarrollo es propietario del esquema; separar roles SQL para producción.

Base http://127.0.0.1:3000/api/v1. Swagger de rutas en /api/docs (solo desarrollo; los contratos de cuerpo se describen en docs/API_LOCAL.md). Health /health/live y /health/ready. Identidad local POST /auth/login. `sites` representa faenas; `site_access` asigna usuarios a cada faena y referencia el catálogo `roles`. El API lee los permisos del catálogo para autorizar cada acción. Los perfiles técnicos iniciales son ADMIN, EDITOR, REVIEWER y VIEWER; los nombres y alcances de negocio siguen sujetos a validación.

### Estructura de empresas y faenas

Los datos operativos siguen el modelo `organizations` (empresa cliente) → `sites` (faenas o espacios operativos). Reuniones, integrantes, acuerdos, incidentes y otros registros quedan asociados a una `site_id`; `site_access` asigna usuarios y roles por faena. El catálogo `roles` define los permisos, de modo que una persona puede tener alcances distintos en faenas distintas.

Las faenas reales que aparecen en la demo son referencias públicas y usan tablas separadas: `reference_companies` → `faena_references`, con materias primas en `reference_commodities` / `faena_reference_commodities` y créditos, licencias y rutas de fotos en `faena_reference_media`. La ruta autenticada `GET /faena-references` entrega ese catálogo de solo lectura. Estas referencias no son empresas clientes, no crean accesos en `site_access` y no reciben registros operativos.

Los módulos de prevención, operaciones e integrantes utilizan la misma autorización y auditoría transaccional. Las transiciones de acciones tienen versión y bloqueo de fila. Las listas operacionales están paginadas, máximo 100 registros.

Comandos:
- pnpm --filter @faenalert/api test
- pnpm --filter @faenalert/api test:integration (crea una DB temporal, migra y carga seed; prueba API en 3001/3002 y elimina la DB al terminar)
- pnpm --filter @faenalert/api build
- docker build -f apps/api/Dockerfile -t faenalert-api:local .

La autenticación local falla al habilitarse en NODE_ENV=production. No presentar esta implementación como identidad productiva.
