
# BITCRAFT.COM

Plataforma web distribuida para la creación y ejecución de automatizaciones entre servicios externos.

## Estructura del proyecto

- apps/frontend: interfaz desarrollada con Vue 3.
- apps/web: API y servidor web.
- apps/worker: trabajador independiente para tareas asíncronas.
- packages/providers: adaptadores para servicios externos.
- packages/queue: configuración del broker de mensajería.
- packages/shared: código compartido.
- prisma: esquema de la base de datos.