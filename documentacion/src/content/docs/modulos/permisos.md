---
title: "Módulo Permisos"
---

# Módulo Permisos

## Endpoints

### POST /permisos
**Descripción**: Crea un nuevo permiso en el sistema.

**URL completa:** `http://localhost:3000/permisos`

**Request Body:**
```json
{
  "nombre": "Usuarios.Crear",
  "descripcion": "Permite crear nuevos usuarios en el sistema"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permiso creado exitosamente",
  "data": {
    "id": 1,
    "nombre": "Usuarios.Crear",
    "descripcion": "Permite crear nuevos usuarios en el sistema",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /permisos
**Descripción**: Lista todos los permisos del sistema.

**URL completa:** `http://localhost:3000/permisos`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Usuarios.Crear",
      "descripcion": "Permite crear nuevos usuarios en el sistema",
      "modulo": {
        "id": 1,
        "nombre": "Usuarios"
      },
      "rolPermisos": [
        {
          "tipoUsuario": {
            "id": 1,
            "nombre": "Administrador"
          }
        }
      ],
      "usuarioPermisos": []
    },
    {
      "id": 2,
      "nombre": "Cultivos.Ver",
      "descripcion": "Permite visualizar información de cultivos",
      "modulo": {
        "id": 2,
        "nombre": "Cultivos"
      }
    }
  ]
}
```

### GET /permisos/:id
**Descripción**: Obtiene un permiso específico por ID.

**URL completa:** `http://localhost:3000/permisos/:id`

**Parámetros URL:**
- `id` (number): ID del permiso

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Usuarios.Crear",
    "descripcion": "Permite crear nuevos usuarios en el sistema",
    "modulo": {
      "id": 1,
      "nombre": "Usuarios"
    },
    "rolPermisos": [...],
    "usuarioPermisos": [...],
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT /permisos/:id
**Descripción**: Actualiza un permiso existente.

**URL completa:** `http://localhost:3000/permisos/:id`

**Parámetros URL:**
- `id` (number): ID del permiso

**Request Body:**
```json
{
  "nombre": "Usuarios.Crear.Editar",
  "descripcion": "Permite crear y editar usuarios en el sistema"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permiso actualizado exitosamente",
  "data": {
    "id": 1,
    "nombre": "Usuarios.Crear.Editar",
    "descripcion": "Permite crear y editar usuarios en el sistema"
  }
}
```

### DELETE /permisos/:id
**Descripción**: Elimina un permiso del sistema.

**URL completa:** `http://localhost:3000/permisos/:id`

**Parámetros URL:**
- `id` (number): ID del permiso

**Response:**
```json
{
  "success": true,
  "message": "Permiso eliminado exitosamente"
}
```

## Entidad Permiso

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Usuarios.Crear",
  "descripcion": "Permite crear nuevos usuarios en el sistema",
  "modulo": {
    "id": 1,
    "nombre": "Usuarios",
    "descripcion": "Gestión de usuarios del sistema"
  },
  "rolPermisos": [
    {
      "id": 1,
      "tipoUsuario": {
        "id": 1,
        "nombre": "Administrador"
      }
    },
    {
      "id": 2,
      "tipoUsuario": {
        "id": 2,
        "nombre": "Instructor"
      }
    }
  ],
  "usuarioPermisos": [
    {
      "id": 1,
      "usuario": {
        "id": 5,
        "nombre": "María García",
        "identificacion": "987654321"
      },
      "estado": true
    }
  ],
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

## Estructura de Nombres de Permisos

Los permisos siguen una convención de nomenclatura jerárquica:

```
[Módulo].[Acción]
```

### Módulos del Sistema:
- **Usuarios**: Gestión de usuarios
- **Cultivos**: Administración de cultivos
- **Lotes**: Control de terrenos
- **Materiales**: Inventario y suministros
- **Producciones**: Cosechas y rendimientos
- **Ventas**: Comercialización
- **Sensores**: Monitoreo IoT
- **Actividades**: Gestión de trabajos
- **Tratamientos**: Control fitosanitario

### Acciones Disponibles:
- **Ver**: Visualizar información
- **Crear**: Agregar nuevos registros
- **Editar**: Modificar registros existentes
- **Eliminar**: Borrar registros
- **Exportar**: Generar reportes/exports
- **Importar**: Cargar datos masivamente

### Ejemplos de Permisos:
- `Usuarios.Ver` - Ver lista de usuarios
- `Cultivos.Crear` - Crear nuevos cultivos
- `Materiales.Editar` - Modificar información de materiales
- `Ventas.Eliminar` - Borrar registros de ventas
- `Sensores.Exportar` - Exportar datos de sensores

## DTOs y Validaciones

###  CreatePermisoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty, @MaxLength(50)` | El nombre del permiso es obligatorio. El nombre no puede tener más de 50 caracteres. |
| `descripcion` | `string` | `@IsString, @IsOptional, @MaxLength(150)` | La descripción no puede tener más de 150 caracteres. |

###  UpdatePermisoDto
Similar a CreatePermisoDto con campos opcionales.

## Sistema de Control de Acceso

### Niveles de Permisos:

1. **Permisos de Rol**: Asignados automáticamente a todos los usuarios de un rol
2. **Permisos Individuales**: Asignados específicamente a usuarios particulares
3. **Permisos Combinados**: Sistema evalúa ambos tipos para determinar acceso

### Evaluación de Acceso:

```javascript
// Pseudocódigo de evaluación
function tienePermiso(usuario, permisoRequerido) {
  // Verificar permisos de rol
  const permisosRol = usuario.tipoUsuario.rolPermisos
    .filter(rp => rp.permiso.nombre === permisoRequerido);

  // Verificar permisos individuales
  const permisosIndividuales = usuario.usuarioPermisos
    .filter(up => up.permiso.nombre === permisoRequerido && up.estado);

  return permisosRol.length > 0 || permisosIndividuales.length > 0;
}
```

## Funcionalidades Avanzadas

- **Herencia de Roles**: Los roles heredan permisos automáticamente
- **Permisos Individuales**: Excepciones específicas por usuario
- **Control Granular**: Permisos específicos por módulo y acción
- **Auditoría**: Registro de cambios en permisos
- **Flexibilidad**: Fácil adición de nuevos permisos sin modificar código

## Integración con Sistema de Autenticación

Los permisos se evalúan en conjunto con el sistema JWT:

1. **Autenticación**: Verificación del token JWT
2. **Autorización**: Evaluación de permisos requeridos
3. **Control de Acceso**: Permitir/denegar operaciones según permisos

## Módulos del Sistema

Cada módulo del sistema tiene sus propios permisos asociados:

| Módulo | Permisos Típicos |
|--------|------------------|
| Usuarios | Ver, Crear, Editar, Eliminar, Exportar, Importar |
| Cultivos | Ver, Crear, Editar, Eliminar |
| Lotes | Ver, Crear, Editar, Eliminar |
| Materiales | Ver, Crear, Editar, Eliminar, Exportar |
| Producciones | Ver, Crear, Editar, Eliminar |
| Ventas | Ver, Crear, Editar, Eliminar, Exportar |
| Sensores | Ver, Crear, Editar, Eliminar, Exportar |
| Actividades | Ver, Crear, Editar, Eliminar, Calificar |
| Tratamientos | Ver, Crear, Editar, Eliminar |

Este sistema asegura que cada usuario tenga exactamente los accesos necesarios para su función dentro del sistema agrícola.