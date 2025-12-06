---
title: "Módulo Usuarios Permisos"
---

# Módulo Usuarios Permisos

## Endpoints

### GET /usuario-permisos/usuario/:usuarioId
**Descripción**: Obtiene los permisos adicionales asignados individualmente a un usuario (excluyendo permisos de rol).

**URL completa:** `http://localhost:3000/usuario-permisos/usuario/:usuarioId`

**Parámetros URL:**
- `usuarioId` (number): ID del usuario

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Permisos para el usuario 1 obtenidos.",
  "data": [
    {
      "permisoId": 5,
      "nombre": "Reportes.Ver",
      "descripcion": "Permite ver reportes avanzados",
      "activo": true
    },
    {
      "permisoId": 6,
      "nombre": "Configuracion.Editar",
      "descripcion": "Permite editar configuraciones del sistema",
      "activo": false
    }
  ]
}
```

### POST /usuario-permisos/toggle
**Descripción**: Activa o desactiva un permiso individual para un usuario específico.

**URL completa:** `http://localhost:3000/usuario-permisos/toggle`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "usuarioId": 1,
  "permisoId": 5,
  "estado": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permiso de usuario actualizado correctamente.",
  "data": {
    "id_usuario_permiso": 1,
    "usuario": {
      "id": 1,
      "nombre": "Juan Pérez"
    },
    "permiso": {
      "id": 5,
      "nombre": "Reportes.Ver"
    }
  }
}
```

## Entidad UsuarioPermiso

**Ejemplo completo en formato JSON:**
```json
{
  "id_usuario_permiso": 1,
  "usuario": {
    "id": 1,
    "identificacion": 123456789,
    "nombre": "Juan Pérez",
    "apellidos": "García",
    "correo": "juan.perez@agrotech.edu",
    "telefono": "3001234567",
    "tipoUsuario": {
      "id": 2,
      "nombre": "Instructor",
      "descripcion": "Usuario con permisos para gestionar actividades"
    },
    "ficha": {
      "id": 1,
      "nombre": "Ficha Técnica Agrícola"
    }
  },
  "permiso": {
    "id": 5,
    "nombre": "Reportes.Ver",
    "descripcion": "Permite ver reportes avanzados",
    "modulo": {
      "id": 3,
      "nombre": "Reportes",
      "descripcion": "Módulo de reportes y análisis"
    }
  }
}
```

## Funcionalidades Avanzadas

- **Permisos Individuales**: Asignación de permisos específicos por usuario
- **Exclusión de Roles**: Gestión de permisos adicionales a los del rol
- **Notificaciones en Tiempo Real**: Actualización automática de permisos para usuarios conectados
- **Control de Acceso Granular**: Permisos específicos independientes del rol

## Flujo de Trabajo

1. **Consulta**: Obtener permisos adicionales disponibles para un usuario
2. **Asignación**: Activar permisos específicos según necesidades
3. **Notificación**: Actualización automática de permisos en el sistema
4. **Verificación**: Confirmación de cambios aplicados

## Integración con Otros Módulos

- **Usuarios**: Asociación de permisos individuales con usuarios específicos
- **Permisos**: Definición de permisos disponibles en el sistema
- **Tipo Usuario**: Complemento a permisos de rol
- **Authorization**: Control de acceso basado en permisos individuales
- **Notifications**: Notificación de cambios de permisos en tiempo real