---
title: "Despliegue"
---

# Despliegue del Proyecto

El proyecto se despliega usando Docker para contenerización, con PostgreSQL y Redis como servicios auxiliares. El backend usa un Dockerfile multi-stage para optimizar la imagen. A continuación, pasos detallados y diagrama.

## Requisitos Previos
- Docker y Docker Compose instalados.
- Puerto 3000 libre para el backend.
- Puertos 5433 (DB) y 6379 (Redis) libres.

## Pasos de Despliegue Local
1. **Clonar el repositorio**:
   ```
   git clone <url-del-repo>
   cd ProyectoFormativoAgrotech
   ```

2. **Levantar servicios con Docker Compose**:
   ```
   cd backend
   docker-compose up -d
   ```
   Esto inicia PostgreSQL (puerto 5433) y Redis (puerto 6379).

3. **Construir la imagen del backend**:
   ```
   docker build -t backend-agro .
   ```

4. **Ejecutar el contenedor del backend**:
   ```
   docker run -p 3000:3000 --env-file .env backend-agro
   ```

5. **Verificar**: Acceder a `http://localhost:3000` para endpoints del backend.

## Variables de Entorno (.env)
Crear un archivo `.env` en `backend/` con:
- `DB_HOST=localhost`
- `DB_PORT=5433`
- `DB_USERNAME=myuser`
- `DB_PASSWORD=mypassword`
- `DB_NAME=bdproyectoformativo`
- `JWT_SECRET=tu_secreto_jwt`
- `REDIS_URL=redis://localhost:6379`
- `PORT=3000`

## Diagrama de Despliegue
```mermaid
graph LR
    Developer[Desarrollador] --> DockerCompose[docker-compose up<br>(Levanta DB y Redis)]
    DockerCompose --> Postgres[PostgreSQL<br>Container<br>Puerto 5433]
    DockerCompose --> Redis[Redis<br>Container<br>Puerto 6379]
    Developer --> DockerBuild[docker build<br>(Construye backend)]
    DockerBuild --> BackendImage[Imagen Backend<br>(NestJS multi-stage)]
    BackendImage --> DockerRun[docker run -p 3000:3000<br>(Ejecuta app)]
    BackendImage --> Postgres
    BackendImage --> Redis
    Frontend[Frontend<br>(Astro/React)] --> BackendImage
```

### Descripción
- **Multi-stage Dockerfile**: Etapa de build instala dependencias y compila; etapa de prod solo incluye dist y deps de prod para menor tamaño.
- **Servicios**: DB persiste datos en volumen; Redis cachea sesiones.
- **Producción**: Subir imagen a registry (ej. Docker Hub) y usar en Kubernetes/AWS.

## Notas Adicionales
- Para desarrollo, usar `npm run start:dev` sin Docker.
- Monitorear logs: `docker logs <container-id>`.
- Actualizar documentación al cambiar despliegue.