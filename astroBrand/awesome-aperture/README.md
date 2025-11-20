# Documentación de la API - Proyecto Agrotech

## Arquitectura General

### Backend
- **Framework**: NestJS (v11.x)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL
- **ORM**: TypeORM (v0.3.26)
- **Autenticación**: JWT (Passport-JWT)
- **WebSockets**: Socket.io para notificaciones en tiempo real
- **Cache**: Redis con @nestjs/cache-manager
- **Documentación**: Swagger integrada
- **Otros**: Multer para uploads, Puppeteer para PDFs, ExcelJS para reportes

### Arquitectura del Backend
- **Estructura**: Modular con controladores, servicios, DTOs y entidades
- **Autenticación**: Guards JWT y permisos basados en roles
- **Relaciones**: TypeORM con entidades relacionadas (Cultivos, Producciones, Ventas, etc.)
- **Validación**: class-validator para DTOs
- **Excepciones**: Manejo centralizado de errores
- **Logs**: Winston para logging

### Frontend
- **Framework**: React (con Vite)
- **Lenguaje**: TypeScript
- **Estado**: Context API / Hooks personalizados
- **UI**: Componentes reutilizables
- **Rutas**: React Router
- **HTTP**: Axios para llamadas API
- **Estilos**: CSS Modules / Styled Components

### Arquitectura del Frontend
- **Estructura**: Feature-based con páginas, componentes y hooks
- **Autenticación**: JWT tokens almacenados en localStorage
- **Permisos**: Guards basados en roles del usuario
- **Estado Global**: Context para usuario y permisos
- **Notificaciones**: WebSockets para actualizaciones en tiempo real

## Tecnologías Utilizadas

### Backend
- NestJS: Framework Node.js para APIs escalables
- TypeORM: ORM para TypeScript con soporte PostgreSQL
- PostgreSQL: Base de datos relacional
- JWT: Autenticación stateless
- Socket.io: Comunicación bidireccional
- Redis: Cache para optimización
- Multer: Manejo de archivos
- Puppeteer: Generación de PDFs
- ExcelJS: Creación de reportes Excel
- Nodemailer: Envío de correos
- Bcrypt: Hashing de contraseñas

### Frontend
- React: Biblioteca para interfaces de usuario
- Vite: Build tool rápido para desarrollo
- TypeScript: Tipado estático
- Axios: Cliente HTTP
- React Router: Navegación SPA
- Context API: Gestión de estado global

## Módulos Principales

Los módulos documentados incluyen:
- Cultivos
- Lotes
- Materiales
- Ventas
- Producciones
- Usuarios

Cada módulo tiene su propia documentación con endpoints, DTOs y descripciones detalladas.