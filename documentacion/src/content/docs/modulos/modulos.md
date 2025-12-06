---
title: "Módulo Módulos"
---

# Módulo Módulos

## Endpoints

### POST /modulos
**Descripción**: Crea un nuevo módulo del sistema.

**URL completa:** `http://localhost:3000/modulos`

**Request Body:**
```json
{
  "nombre": "Usuarios",
  "descripcion": "Gestión de usuarios del sistema",
  "estado": "Activo"
}
```

**Response:**
```json
{
  "id": 1,
  "nombre": "Usuarios",
  "descripcion": "Gestión de usuarios del sistema",
  "estado": "Activo"
}
```

### GET /modulos
**Descripción**: Lista todos los módulos del sistema.

**URL completa:** `http://localhost:3000/modulos`

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Usuarios",
    "descripcion": "Gestión de usuarios del sistema",
    "estado": "Activo"
  }
]
```

### GET /modulos/:id
**Descripción**: Obtiene un módulo específico.

**URL completa:** `http://localhost:3000/modulos/:id`

**Parámetros URL:**
- `id` (number): ID del módulo

**Response:**
```json
{
  "id": 1,
  "nombre": "Usuarios",
  "descripcion": "Gestión de usuarios del sistema",
  "estado": "Activo"
}
```

### PATCH /modulos/:id
**Descripción**: Actualiza un módulo existente.

**URL completa:** `http://localhost:3000/modulos/:id`

**Parámetros URL:**
- `id` (number): ID del módulo

**Request Body:**
```json
{
  "descripcion": "Gestión completa de usuarios del sistema",
  "estado": "Inactivo"
}
```

**Response:**
```json
{
  "id": 1,
  "nombre": "Usuarios",
  "descripcion": "Gestión completa de usuarios del sistema",
  "estado": "Inactivo"
}
```

### DELETE /modulos/:id
**Descripción**: Elimina un módulo.

**URL completa:** `http://localhost:3000/modulos/:id`

**Parámetros URL:**
- `id` (number): ID del módulo

**Response:**
```json
{
  "message": "Módulo eliminado correctamente"
}
```

## Entidad Modulo

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Usuarios",
  "descripcion": "Gestión de usuarios del sistema",
  "estado": "Activo",
  "permisos": [
    {
      "id": 1,
      "nombre": "Usuarios.Crear",
      "descripcion": "Permite crear nuevos usuarios"
    }
  ]
}
```

## DTOs y Validaciones

### CreateModuloDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `estado` | `string` | `@IsString, @IsOptional` | - |

### UpdateModuloDto
Extiende `CreateModuloDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Organización del Sistema**: Estructuración modular de funcionalidades
- **Control de Estado**: Activación/desactivación de módulos
- **Asociación de Permisos**: Vinculación con permisos específicos
- **Gestión de Áreas**: Agrupación lógica de funcionalidades

## Flujo de Trabajo

1. **Definición**: Crear módulos según arquitectura del sistema
2. **Configuración**: Establecer estado y descripción
3. **Asignación**: Vincular permisos al módulo correspondiente

## Integración con Otros Módulos

- **Permisos**: Asociación de permisos con módulos específicos
- **Rol Permiso**: Control de acceso basado en módulos
- **Authorization**: Validación de permisos por módulo