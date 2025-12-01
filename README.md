# Proyecto Formativo - AgroTech

Sistema integral de gestión agrícola con IoT que permite el control completo de cultivos, lotes, materiales, actividades formativas, sensores en tiempo real, y más. Desarrollado con tecnologías modernas para optimizar la producción agrícola y el aprendizaje.

## Tecnologías Utilizadas

### Backend
- **NestJS**: 11.1.6 (Framework Node.js)
- **TypeScript**: 5.7.3
- **PostgreSQL**: 15 (Base de datos)
- **Redis**: Alpine (Cache)
- **MQTT**: 5.14.1 (Mensajería IoT)
- **TypeORM**: 0.3.26 (ORM)
- **JWT**: Autenticación
- **Node.js**: v22.20.0

### Frontend
- **React**: Framework para interfaz de usuario
- **TypeScript**: Tipado estático

### Infraestructura
- **Docker & Docker Compose**: Contenerización y orquestación
- **MQTT Broker**: Comunicación IoT

### Documentación
- **Astro**: 5.6.1 (Generador de sitio estático)
- **Starlight**: 0.36.3 (Tema de documentación)
- **Mermaid**: Diagramas integrados

## Requisitos Previos

Asegúrate de tener instalados los siguientes programas:

- Git
- Node.js v22.20.0 (incluye npm)
- Docker y Docker Compose

## Instalación y Configuración

### Clonar el Repositorio
```bash
git clone https://github.com/KERLINFIGUEROA0/ProyectoFormativoAgrotech.git
cd ProyectoFormativoAgrotech
```

### Backend
```bash
cd backend
npm install
docker-compose up -d  # Levanta PostgreSQL y Redis
npm run seed          # Inserta usuario administrador
npm run start:dev     # Inicia servidor en modo desarrollo
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Inicia servidor de desarrollo
```

## Documentación Técnica

La documentación completa está disponible en un sitio dedicado construido con Astro y Starlight.

### Ejecutar Documentación Local
```bash
cd documentacion
npm install
npm run dev  # Servidor en http://localhost:4321
```

### Contenido de la Documentación

- **Inicio**: Visión general del sistema y tecnologías
- **Despliegue**: Guías completas de instalación, Docker, variables de entorno y troubleshooting
- **Arquitectura Backend**: Diagramas ER detallados, flujos de datos, casos de uso por roles
- **DTOs**: Referencia completa de validaciones y tipos para todos los módulos
- **Módulos**: Documentación detallada de cada módulo del backend:
  - Actividades (formativas)
  - Cultivos y Producciones
  - Lotes y Surcos
  - Materiales e Inventario
  - Usuarios y Permisos
  - Sensores IoT
  - Ventas y Tratamientos

## Arquitectura General

El sistema sigue una arquitectura modular con:
- **Backend REST API** en NestJS con TypeORM
- **Frontend React** para interfaz de usuario
- **Base de datos PostgreSQL** con 25+ entidades relacionadas
- **Redis** para cache y sesiones
- **MQTT** para comunicación con dispositivos IoT
- **Autenticación JWT** con roles (Administrador, Agricultor, Aprendiz)

## Desarrollado por
- Andres Orlando Peña Guzman (El bendito)
- Juan Camilo Brand
- Julian David Rojas
- Kerlin Jerlen Figueroa
- Einer David Sanchez
- Juan Esteban Zemanate
