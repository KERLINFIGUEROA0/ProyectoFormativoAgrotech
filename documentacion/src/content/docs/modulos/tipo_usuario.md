---
title: "Módulo Tipo Usuario"
---

# Módulo Tipo Usuario

## Endpoints

### POST /roles
**Descripción**: Crea un nuevo tipo de usuario (rol).

**URL completa:** `http://localhost:3000/roles`

**Request Body:**
```json
{
  "nombre": "Instructor",
  "descripcion": "Usuario con permisos para gestionar actividades y evaluaciones"
}
```

**Response:**
```json
{
  "id": 2,
  "nombre": "Instructor",
  "descripcion": "Usuario con permisos para gestionar actividades y evaluaciones"
}
```

### GET /roles
**Descripción**: Lista todos los tipos de usuario con sus permisos asociados.

**URL completa:** `http://localhost:3000/roles`

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Administrador",
    "descripcion": "Usuario con acceso completo al sistema",
    "permisos": ["Usuarios.Crear", "Usuarios.Ver", "Usuarios.Editar"]
  },
  {
    "id": 2,
    "nombre": "Instructor",
    "descripcion": "Usuario con permisos para gestionar actividades",
    "permisos": ["Actividades.Crear", "Actividades.Ver"]
  }
]
```

### GET /roles/:id
**Descripción**: Obtiene un tipo de usuario específico con todas sus relaciones.

**URL completa:** `http://localhost:3000/roles/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de usuario

**Response:**
```json
{
  "id": 2,
  "nombre": "Instructor",
  "descripcion": "Usuario con permisos para gestionar actividades y evaluaciones",
  "usuarios": [
    {
      "identificacion": 123456789,
      "nombre": "María García",
      "tipoUsuario": {
        "id": 2,
        "nombre": "Instructor"
      }
    }
  ],
  "rolPermisos": [
    {
      "id_rol_permiso": 1,
      "permiso": {
        "id": 1,
        "nombre": "Actividades.Crear"
      }
    }
  ]
}
```

### PUT /roles/:id
**Descripción**: Actualiza un tipo de usuario existente.

**URL completa:** `http://localhost:3000/roles/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de usuario

**Request Body:**
```json
{
  "nombre": "Instructor Senior",
  "descripcion": "Usuario con permisos avanzados para gestión de actividades"
}
```

**Response:**
```json
{
  "id": 2,
  "nombre": "Instructor Senior",
  "descripcion": "Usuario con permisos avanzados para gestión de actividades",
  "usuarios": [...],
  "rolPermisos": [...]
}
```

### DELETE /roles/:id
**Descripción**: Elimina un tipo de usuario.

**URL completa:** `http://localhost:3000/roles/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de usuario

**Response:**
TipoORM delete result

## Entidad TipoUsuario

**Ejemplo completo en formato JSON:**
```json
{
  "id": 2,
  "nombre": "Instructor",
  "descripcion": "Usuario con permisos para gestionar actividades y evaluaciones",
  "usuarios": [
    {
      "identificacion": 123456789,
      "nombre": "María García",
      "apellidos": "Rodríguez",
      "correo": "maria.garcia@instructor.edu",
      "telefono": "3001234567",
      "tipoUsuario": {
        "id": 2,
        "nombre": "Instructor"
      },
      "ficha": {
        "id": 1,
        "nombre": "Ficha Técnica Agrícola"
      }
    }
  ],
  "rolPermisos": [
    {
      "id_rol_permiso": 1,
      "tipoUsuario": {
        "id": 2,
        "nombre": "Instructor"
      },
      "permiso": {
        "id": 1,
        "nombre": "Actividades.Crear",
        "descripcion": "Permite crear nuevas actividades",
        "modulo": {
          "id": 1,
          "nombre": "Actividades"
        }
      }
    }
  ]
}
```

## DTOs y Validaciones

### CreateTipoUsuarioDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty, @MaxLength(20)` | El nombre debe ser un texto. El nombre del rol es obligatorio. El nombre no puede exceder los 20 caracteres. |
| `descripcion` | `string` | `@IsString, @IsOptional, @MaxLength(150)` | La descripción debe ser un texto. La descripción no puede exceder los 150 caracteres. |

### UpdateTipoUsuarioDto
Extiende `CreateTipoUsuarioDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Gestión de Roles**: Definición de roles de usuario en el sistema
- **Asociación de Permisos**: Vinculación automática con permisos a través de RolPermiso
- **Relación con Usuarios**: Asociación de usuarios a roles específicos
- **Vista Simplificada**: Listado de roles con permisos en formato plano

## Flujo de Trabajo

1. **Definición**: Crear roles según necesidades organizacionales
2. **Asignación de Permisos**: Configurar permisos para cada rol
3. **Asociación de Usuarios**: Asignar usuarios a roles definidos
4. **Mantenimiento**: Actualizar roles y permisos según evolución

## Integración con Otros Módulos

- **Usuarios**: Clasificación de usuarios por tipo/rol
- **Rol Permiso**: Asociación de permisos con roles
- **Permisos**: Definición de permisos disponibles
- **Authorization**: Control de acceso basado en roles y permisos