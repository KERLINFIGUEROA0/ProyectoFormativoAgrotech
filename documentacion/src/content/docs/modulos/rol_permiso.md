---
title: "Módulo Rol Permiso"
---

# Módulo Rol Permiso

## Endpoints

### GET /rol-permisos/rol/:rolId
**Descripción**: Obtiene todos los permisos disponibles y su estado de asignación para un rol específico (requiere autenticación JWT y permiso Usuarios.VerPermisos).

**URL completa:** `http://localhost:3000/rol-permisos/rol/:rolId`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parámetros URL:**
- `rolId` (number): ID del rol (tipo de usuario)

**Response:**
```json
{
  "success": true,
  "message": "Permisos para el rol 1 obtenidos.",
  "data": [
    {
      "permisoId": 1,
      "nombre": "Usuarios.Crear",
      "descripcion": "Permite crear nuevos usuarios",
      "activo": true
    },
    {
      "permisoId": 2,
      "nombre": "Usuarios.Ver",
      "descripcion": "Permite ver lista de usuarios",
      "activo": false
    }
  ]
}
```

### POST /rol-permisos/toggle
**Descripción**: Activa o desactiva un permiso para un rol específico (requiere autenticación JWT y permiso Usuarios.Asignar).

**URL completa:** `http://localhost:3000/rol-permisos/toggle`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "rolId": 1,
  "permisoId": 2,
  "estado": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permiso actualizado correctamente.",
  "data": {
    "id_rol_permiso": 5,
    "tipoUsuario": {
      "id": 1,
      "nombre": "Administrador"
    },
    "permiso": {
      "id": 2,
      "nombre": "Usuarios.Ver",
      "descripcion": "Permite ver lista de usuarios"
    }
  }
}
```

### GET /rol-permisos/rol/:rolId/detallado
**Descripción**: Obtiene todos los permisos disponibles con información detallada incluyendo el módulo al que pertenecen y su estado de asignación para un rol específico (requiere autenticación JWT y permiso Usuarios.VerPermisos).

**URL completa:** `http://localhost:3000/rol-permisos/rol/:rolId/detallado`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parámetros URL:**
- `rolId` (number): ID del rol (tipo de usuario)

**Response:**
```json
{
  "success": true,
  "message": "Permisos detallados para el rol 1 obtenidos.",
  "data": [
    {
      "permisoId": 1,
      "nombre": "Usuarios.Crear",
      "descripcion": "Permite crear nuevos usuarios",
      "activo": true,
      "modulo": {
        "id": 1,
        "nombre": "Usuarios",
        "descripcion": "Módulo de gestión de usuarios"
      }
    },
    {
      "permisoId": 2,
      "nombre": "Usuarios.Ver",
      "descripcion": "Permite ver lista de usuarios",
      "activo": false,
      "modulo": {
        "id": 1,
        "nombre": "Usuarios",
        "descripcion": "Módulo de gestión de usuarios"
      }
    }
  ]
}
```

## Entidad RolPermiso

**Ejemplo completo en formato JSON:**
```json
{
  "id_rol_permiso": 1,
  "tipoUsuario": {
    "id": 1,
    "nombre": "Administrador",
    "descripcion": "Usuario con acceso completo al sistema"
  },
  "permiso": {
    "id": 1,
    "nombre": "Usuarios.Crear",
    "descripcion": "Permite crear nuevos usuarios",
    "modulo": {
      "id": 1,
      "nombre": "Usuarios",
      "descripcion": "Módulo de gestión de usuarios"
    }
  }
}
```

## DTOs y Validaciones

### CreateRolPermisoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `tipoUsuarioId` | `number` | `@IsNotEmpty, @IsNumber` | - |
| `permisoId` | `number` | `@IsNotEmpty, @IsNumber` | - |

### UpdateRolPermisoDto
Similar a CreateRolPermisoDto con campos opcionales.

## Funcionalidades Avanzadas

- **Gestión de Permisos por Rol**: Asignación y desasignación de permisos específicos a roles de usuario
- **Vista Detallada**: Información completa incluyendo módulos asociados
- **Notificaciones en Tiempo Real**: Actualización automática de permisos para usuarios afectados
- **Control de Acceso Granular**: Sistema de permisos basado en roles y módulos

## Flujo de Trabajo

1. **Consulta**: Administrador consulta permisos asignados a un rol
2. **Modificación**: Se activa o desactiva permisos según necesidades
3. **Actualización**: Sistema notifica cambios a usuarios del rol afectado
4. **Aplicación**: Nuevos permisos se aplican inmediatamente en el sistema

## Integración con Otros Módulos

- **Tipo Usuario**: Define los roles disponibles en el sistema
- **Permisos**: Gestiona los permisos individuales y sus módulos
- **Módulos**: Organiza permisos por funcionalidades del sistema
- **Usuarios**: Aplica permisos basados en el rol asignado
- **Authorization**: Controla el acceso basado en permisos asignados