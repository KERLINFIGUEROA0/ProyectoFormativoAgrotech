---
title: "Módulo Usuarios"
---

# Módulo Usuarios

## Endpoints

### POST /usuarios/crear
**Descripción**: Crea un nuevo usuario en el sistema.

**URL completa:** `http://localhost:3000/usuarios/crear`

**Request Body:**
```json
{
  "Tipo_Identificacion": "CC",
  "identificacion": "123456789",
  "nombre": "Juan",
  "apellidos": "Pérez",
  "telefono": "3001234567",
  "correo": "juan.perez@email.com",
  "password": "password123",
  "tipoUsuario": 1,
  "id_ficha": "12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "id": 1,
    "Tipo_Identificacion": "CC",
    "identificacion": "123456789",
    "nombre": "Juan",
    "apellidos": "Pérez",
    "telefono": "3001234567",
    "correo": "juan.perez@email.com",
    "tipoUsuario": {
      "id": 1,
      "nombre": "Administrador"
    },
    "estado": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /usuarios/cargar-excel
**Descripción**: Carga usuarios masivamente desde un archivo Excel.

**URL completa:** `http://localhost:3000/usuarios/cargar-excel`

**Content-Type:** `multipart/form-data`

**Parámetros:**
- `file`: Archivo Excel con usuarios

**Response:**
```json
{
  "success": true,
  "message": "Carga de usuarios desde Excel completada. Creados: 10. Errores: 0",
  "data": {
    "creados": 10,
    "errores": []
  }
}
```

### GET /usuarios/exportar-excel
**Descripción**: Exporta todos los usuarios a un archivo Excel.

**URL completa:** `http://localhost:3000/usuarios/exportar-excel`

**Response:** Archivo Excel descargable

### GET /usuarios
**Descripción**: Lista todos los usuarios del sistema.

**URL completa:** `http://localhost:3000/usuarios`

**Response:**
```json
{
  "success": true,
  "message": "Lista de usuarios obtenida",
  "data": [
    {
      "id": 1,
      "Tipo_Identificacion": "CC",
      "identificacion": "123456789",
      "nombre": "Juan",
      "apellidos": "Pérez",
      "correo": "juan.perez@email.com",
      "telefono": "3001234567",
      "estado": true,
      "tipoUsuario": {
        "id": 1,
        "nombre": "Administrador"
      },
      "ficha": {
        "id": 1,
        "nombre": "Ficha 1",
        "id_ficha": "12345678"
      }
    }
  ]
}
```

### GET /usuarios/buscar
**Descripción**: Busca usuarios por criterios específicos.

**URL completa:** `http://localhost:3000/usuarios/buscar`

**Query Parameters:**
- `nombre` (opcional): Nombre del usuario
- `identificacion` (opcional): Número de identificación
- `rol` (opcional): Nombre del rol

**Response:**
```json
{
  "success": true,
  "message": "Usuarios encontrados según los criterios.",
  "data": [...]
}
```

### GET /usuarios/asignables
**Descripción**: Lista usuarios que pueden ser asignados a actividades.

**URL completa:** `http://localhost:3000/usuarios/asignables`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "identificacion": "123456789",
      "nombre": "Juan",
      "apellidos": "Pérez",
      "ficha": {
        "id": 1,
        "nombre": "Ficha 1",
        "id_ficha": "12345678"
      }
    }
  ]
}
```

### GET /usuarios/buscar/:id
**Descripción**: Obtiene un usuario específico por ID.

**URL completa:** `http://localhost:3000/usuarios/buscar/:id`

**Parámetros URL:**
- `id` (number): ID del usuario

**Response:**
```json
{
  "success": true,
  "message": "Usuario con id 1 encontrado",
  "data": {
    "id": 1,
    "Tipo_Identificacion": "CC",
    "identificacion": "123456789",
    "nombre": "Juan",
    "apellidos": "Pérez",
    "correo": "juan.perez@email.com",
    "estado": true
  }
}
```

### PUT /usuarios/actualizar/:id
**Descripción**: Actualiza la información de un usuario.

**URL completa:** `http://localhost:3000/usuarios/actualizar/:id`

**Parámetros URL:**
- `id` (number): ID del usuario

**Request Body:**
```json
{
  "nombre": "Juan Carlos",
  "telefono": "3009876543",
  "tipoUsuario": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usuario con id 1 actualizado exitosamente",
  "data": { ... },
  "note": "Los permisos del usuario se actualizarán en el próximo login"
}
```

### DELETE /usuarios/eliminar/:id
**Descripción**: Desactiva un usuario (soft delete).

**URL completa:** `http://localhost:3000/usuarios/eliminar/:id`

**Parámetros URL:**
- `id` (number): ID del usuario

**Response:**
```json
{
  "success": true,
  "message": "Usuario con id 1 eliminado exitosamente"
}
```

### PATCH /usuarios/reactivar/:id
**Descripción**: Reactiva un usuario previamente desactivado.

**URL completa:** `http://localhost:3000/usuarios/reactivar/:id`

**Parámetros URL:**
- `id` (number): ID del usuario

**Response:**
```json
{
  "success": true,
  "message": "Usuario con id 1 reactivado exitosamente"
}
```

### DELETE /usuarios/eliminar-permanente/:id
**Descripción**: Elimina permanentemente un usuario de la base de datos.

**URL completa:** `http://localhost:3000/usuarios/eliminar-permanente/:id`

**Parámetros URL:**
- `id` (number): ID del usuario

**Response:**
```json
{
  "success": true,
  "message": "Usuario con id 1 eliminado permanentemente"
}
```

### GET /usuarios/identificacion/:identificacion
**Descripción**: Busca un usuario por número de identificación.

**URL completa:** `http://localhost:3000/usuarios/identificacion/:identificacion`

**Parámetros URL:**
- `identificacion` (string): Número de identificación

**Response:**
```json
{
  "success": true,
  "message": "Usuario encontrado",
  "data": { ... }
}
```

### POST /usuarios/cambiarpassword
**Descripción**: Permite a un usuario cambiar su contraseña.

**URL completa:** `http://localhost:3000/usuarios/cambiarpassword`

**Request Body:**
```json
{
  "actual": "oldpassword123",
  "nueva": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña cambiada exitosamente"
}
```

### GET /usuarios/perfil
**Descripción**: Obtiene el perfil completo del usuario autenticado.

**URL completa:** `http://localhost:3000/usuarios/perfil`

**Response:**
```json
{
  "success": true,
  "message": "Perfil obtenido correctamente",
  "data": {
    "tipoIdentificacion": "CC",
    "identificacion": "123456789",
    "nombres": "Juan",
    "apellidos": "Pérez",
    "correo": "juan.perez@email.com",
    "telefono": "3001234567",
    "rolNombre": "Administrador",
    "permisos": ["Usuarios.Ver", "Usuarios.Crear", "Usuarios.Editar"],
    "modulos": {
      "Usuarios": ["Ver", "Crear", "Editar", "Eliminar"],
      "Cultivos": ["Ver", "Crear"]
    }
  }
}
```

### PUT /usuarios/editarperfil
**Descripción**: Actualiza el perfil del usuario autenticado.

**URL completa:** `http://localhost:3000/usuarios/editarperfil`

**Request Body:**
```json
{
  "nombres": "Juan Carlos",
  "telefono": "3009876543"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Perfil actualizado correctamente",
  "data": { ... }
}
```

### POST /usuarios/fotoperfil
**Descripción**: Sube una foto de perfil para el usuario.

**URL completa:** `http://localhost:3000/usuarios/fotoperfil`

**Content-Type:** `multipart/form-data`

**Parámetros:**
- `file`: Imagen de perfil

**Response:**
```json
{
  "success": true,
  "message": "Foto de perfil actualizada"
}
```

### GET /usuarios/fotoperfil
**Descripción**: Obtiene la foto de perfil del usuario.

**URL completa:** `http://localhost:3000/usuarios/fotoperfil`

**Response:** Imagen de perfil

### GET /usuarios/fichas/opciones
**Descripción**: Obtiene opciones disponibles de fichas académicas.

**URL completa:** `http://localhost:3000/usuarios/fichas/opciones`

**Response:**
```json
{
  "success": true,
  "message": "Opciones de fichas obtenidas",
  "data": [
    {
      "id": 1,
      "nombre": "Ficha Técnica en Agronomía",
      "id_ficha": "12345678"
    }
  ]
}
```

### POST /usuarios/exportar-excel-filtrado
**Descripción**: Exporta usuarios filtrados a Excel.

**URL completa:** `http://localhost:3000/usuarios/exportar-excel-filtrado`

**Request Body:**
```json
{
  "estado": true,
  "tipoUsuario": 1
}
```

**Response:** Archivo Excel descargable

## Entidad Usuario

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "Tipo_Identificacion": "CC",
  "identificacion": "123456789",
  "nombre": "Juan",
  "apellidos": "Pérez",
  "telefono": "3001234567",
  "correo": "juan.perez@email.com",
  "estado": true,
  "tipoUsuario": {
    "id": 1,
    "nombre": "Administrador"
  },
  "ficha": {
    "id": 1,
    "nombre": "Ficha Técnica",
    "id_ficha": "12345678"
  },
  "usuarioPermisos": [],
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

## Estados de Usuario

- **true**: Usuario activo
- **false**: Usuario inactivo (soft delete)

## DTOs y Validaciones

###  CreateUsuarioDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `Tipo_Identificacion` | `string` | `@IsString, @IsNotEmpty, @IsIn(['CC', 'TI'])` | El tipo de identificación debe ser "CC" o "TI". |
| `identificacion` | `number` | `@IsNumber, @IsNotEmpty` | La identificación es obligatoria. |
| `nombre` | `string` | `@IsString, @IsNotEmpty` | El nombre es obligatorio. |
| `apellidos` | `string` | `@IsString, @IsNotEmpty` | Los apellidos son obligatorios. |
| `telefono` | `string` | `@IsString, @IsNotEmpty, @Length(10,10)` | El teléfono debe tener 10 dígitos. |
| `correo` | `string` | `@IsEmail, @IsNotEmpty` | El formato del correo no es válido. |
| `password` | `string` | `@IsString, @IsNotEmpty, @MinLength(8)` | La contraseña debe tener al menos 8 caracteres. |
| `tipoUsuario` | `number` | `@IsNumber, @IsNotEmpty` | El rol es obligatorio. |
| `id_ficha` | `string` | `@IsString, @IsOptional, @Length(6,8), @Matches(/^\d+$/)` | El id_ficha debe tener entre 6 y 8 caracteres y contener solo números. |

###  UpdateUsuarioDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `Tipo_Identificacion` | `string` | `@IsOptional, @IsString, @IsIn(['CC', 'TI'])` | El tipo de identificación debe ser "CC" o "TI". |
| `identificacion` | `number` | `@IsOptional, @IsNumber` | - |
| `nombre` | `string` | `@IsOptional, @IsString` | El nombre debe ser un texto. |
| `apellidos` | `string` | `@IsOptional, @IsString` | Los apellidos deben ser un texto. |
| `telefono` | `string` | `@IsOptional, @IsString, @Length(10,10)` | El teléfono debe tener 10 dígitos. |
| `correo` | `string` | `@IsOptional, @IsEmail` | El formato del correo no es válido. |
| `password` | `string` | `@IsOptional, @IsString, @MinLength(8)` | La contraseña debe tener al menos 8 caracteres. |
| `tipoUsuario` | `number` | `@IsOptional, @IsNumber` | El ID del rol debe ser un número. |
| `id_ficha` | `string` | `@IsOptional, @IsString, @Length(6,8), @Matches(/^\d+$/)` | El id_ficha debe tener entre 6 y 8 caracteres y contener solo números. |

###  CambiarPasswordDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `actual` | `string` | `@IsString` | - |
| `nueva` | `string` | `@IsString, @MinLength(8)` | La nueva contraseña debe tener al menos 8 caracteres. |

###  UpdatePerfilDto
Similar a UpdateUsuarioDto pero con campos específicos del perfil.

## Funcionalidades Adicionales

- **Gestión de Perfiles**: Usuarios pueden actualizar su información personal
- **Control de Accesos**: Sistema de permisos basado en roles
- **Fotos de Perfil**: Upload y gestión de imágenes de usuario
- **Importación/Exportación**: Carga masiva desde Excel y exportación filtrada
- **Soft Delete**: Eliminación lógica con opción de reactivación
- **Búsqueda Avanzada**: Filtros por nombre, identificación y rol
- **Integración Fichas**: Vinculación con información académica