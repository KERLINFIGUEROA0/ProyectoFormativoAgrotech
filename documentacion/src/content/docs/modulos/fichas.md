---
title: "Módulo Fichas"
---

# Módulo Fichas

## Endpoints

### POST /fichas
**Descripción**: Crea una nueva ficha de formación.

**URL completa:** `http://localhost:3000/fichas`

**Request Body:**
```json
{
  "nombre": "Ficha Técnica Agrícola",
  "id_ficha": "12345678",
  "descripcion": "Programa de formación en técnicas agrícolas modernas",
  "estado": "Activo"
}
```

**Response:**
```json
{
  "id": 1,
  "nombre": "Ficha Técnica Agrícola",
  "id_ficha": "12345678",
  "descripcion": "Programa de formación en técnicas agrícolas modernas",
  "estado": "Activo"
}
```

### GET /fichas
**Descripción**: Lista todas las fichas de formación.

**URL completa:** `http://localhost:3000/fichas`

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Ficha Técnica Agrícola",
    "id_ficha": "12345678",
    "descripcion": "Programa de formación en técnicas agrícolas modernas",
    "estado": "Activo"
  }
]
```

### GET /fichas/:id
**Descripción**: Obtiene una ficha específica.

**URL completa:** `http://localhost:3000/fichas/:id`

**Parámetros URL:**
- `id` (number): ID de la ficha

**Response:**
```json
{
  "id": 1,
  "nombre": "Ficha Técnica Agrícola",
  "id_ficha": "12345678",
  "descripcion": "Programa de formación en técnicas agrícolas modernas",
  "estado": "Activo"
}
```

### PATCH /fichas/:id
**Descripción**: Actualiza una ficha existente.

**URL completa:** `http://localhost:3000/fichas/:id`

**Parámetros URL:**
- `id` (number): ID de la ficha

**Request Body:**
```json
{
  "descripcion": "Programa actualizado de formación en técnicas agrícolas modernas",
  "estado": "Inactivo"
}
```

**Response:**
```json
{
  "id": 1,
  "nombre": "Ficha Técnica Agrícola",
  "id_ficha": "12345678",
  "descripcion": "Programa actualizado de formación en técnicas agrícolas modernas",
  "estado": "Inactivo"
}
```

### DELETE /fichas/:id
**Descripción**: Elimina una ficha.

**URL completa:** `http://localhost:3000/fichas/:id`

**Parámetros URL:**
- `id` (number): ID de la ficha

**Response:**
```json
{
  "message": "Ficha eliminada correctamente"
}
```

## Entidad Ficha

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Ficha Técnica Agrícola",
  "id_ficha": "12345678",
  "descripcion": "Programa de formación en técnicas agrícolas modernas",
  "estado": "Activo",
  "usuarios": [
    {
      "identificacion": 123456789,
      "nombre": "Juan Pérez",
      "apellidos": "García",
      "tipoUsuario": {
        "id": 2,
        "nombre": "Pasante"
      }
    }
  ]
}
```

## DTOs y Validaciones

### CreateFichaDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `id_ficha` | `string` | `@IsString, @IsNotEmpty` | - |
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `estado` | `string` | `@IsString, @IsOptional` | - |

### UpdateFichaDto
Extiende `CreateFichaDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Gestión de Programas**: Administración de fichas de formación
- **Control de Estado**: Activación/desactivación de programas
- **Identificación Única**: Códigos únicos para cada ficha
- **Asociación con Usuarios**: Vinculación de aprendices a programas

## Flujo de Trabajo

1. **Creación**: Definir nueva ficha con información completa
2. **Configuración**: Establecer estado y descripción
3. **Asignación**: Vincular usuarios al programa de formación

## Integración con Otros Módulos

- **Usuarios**: Asociación de aprendices con fichas de formación
- **Actividades**: Programas formativos relacionados con actividades
- **Tipo Usuario**: Diferenciación de roles por ficha