# Proyecto Formativo - AgroTech

Asegúrate de tener instalados los siguientes programas en tu computador:

- Git
- Node.js (que incluye npm)
- Docker

## Clonar el Repositorio
Primero, clona el repositorio de GitHub en tu máquina local usando el siguiente comando:

```
git clone https://github.com/KERLINFIGUEROA0/ProyectoFormativoAgrotech.git
```

## Backend
Sigue estos pasos para poner en marcha el backend:

1. Navega a la carpeta del backend:
   ```
   cd backend
   ```

2. Instala las dependencias de Node.js:
   ```
   npm install
   ```

3. Levanta los servicios de Docker (PostgreSQL y Redis):
   ```
   docker-compose up -d
   ```

4. Ejecuta el "seed" para insertar el administrador en la base de datos:
   ```
   npm run seed
   ```

5. Inicia el servidor del backend:
   ```
   npm run start:dev
   ```

## Frontend
Sigue estos pasos para poner en marcha el frontend:

1. Navega a la carpeta del frontend:
   ```
   cd frontend
   ```

2. Instala las dependencias de Node.js:
   ```
   npm install
   ```

3. Inicia el servidor de desarrollo del frontend:
   ```
   npm run dev
   ```

## Documentación
Para más detalles técnicos:

- [DTOs y Validaciones](astroBrand/awesome-aperture/docs/DTOs.md): Tablas con campos, tipos y validaciones de todos los módulos.
- [Arquitectura del Backend](astroBrand/awesome-aperture/docs/Arquitectura.md): Diagramas Mermaid de la estructura general, ER y flujos por módulo.
- [Despliegue](astroBrand/awesome-aperture/docs/Despliegue.md): Pasos para desplegar con Docker, diagrama y variables de entorno.

## Hecho por
- Andres Orlando Peña Guzman (El bendito)
- Juan Camilo Brand
- Julian David Rojas
- Kerlin Jerlen Figueroa
- Einer David Sanchez
- Juan Esteban Zemanate
