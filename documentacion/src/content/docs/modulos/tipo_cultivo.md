---
title: "Módulo Tipo Cultivo"
---

# Módulo Tipo Cultivo

## Endpoints

### POST /tipo-cultivo/crear
**Descripción**: Crea un nuevo tipo de cultivo.

**URL completa:** `http://localhost:3000/tipo-cultivo/crear`

**Request Body:**
```json
{
  "nombre": "Hortaliza",
  "descripcion": "Cultivos de hortalizas como tomates, lechugas, etc."
}
```

**Response:**
```json
{
  "success": true,
  "message": "El tipo de cultivo \"Hortaliza\" se creó correctamente",
  "data": {
    "id": 1,
    "nombre": "Hortaliza",
    "descripcion": "Cultivos de hortalizas como tomates, lechugas, etc.",
    "cultivos": []
  }
}
```

### GET /tipo-cultivo/listar
**Descripción**: Lista todos los tipos de cultivo con sus cultivos asociados.

**URL completa:** `http://localhost:3000/tipo-cultivo/listar`

**Response:**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "id": 1,
      "nombre": "Hortaliza",
      "descripcion": "Cultivos de hortalizas como tomates, lechugas, etc.",
      "cultivos": [
        {
          "id": 1,
          "nombre": "Tomates cherry",
          "estado": "Activo"
        }
      ]
    }
  ]
}
```

### GET /tipo-cultivo/:id
**Descripción**: Obtiene un tipo de cultivo específico por ID.

**URL completa:** `http://localhost:3000/tipo-cultivo/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de cultivo

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Hortaliza",
    "descripcion": "Cultivos de hortalizas como tomates, lechugas, etc.",
    "cultivos": []
  }
}
```

### PUT /tipo-cultivo/actualizar/:id
**Descripción**: Actualiza un tipo de cultivo existente.

**URL completa:** `http://localhost:3000/tipo-cultivo/actualizar/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de cultivo

**Request Body:**
```json
{
  "nombre": "Hortalizas",
  "descripcion": "Cultivos de hortalizas actualizada"
}
```

**Response:**
```json
{
  "success": true,
  "message": "El tipo de cultivo con ID 1 se actualizó correctamente",
  "data": {
    "id": 1,
    "nombre": "Hortalizas",
    "descripcion": "Cultivos de hortalizas actualizada",
    "cultivos": []
  }
}
```

### DELETE /tipo-cultivo/eliminar/:id
**Descripción**: Elimina un tipo de cultivo.

**URL completa:** `http://localhost:3000/tipo-cultivo/eliminar/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de cultivo

**Response:**
```json
{
  "success": true,
  "message": "🗑️ El tipo de cultivo con ID 1 se eliminó correctamente"
}
```

## Entidad TipoCultivo

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Hortaliza",
  "descripcion": "Cultivos de hortalizas como tomates, lechugas, etc.",
  "cultivos": [
    {
      "id": 1,
      "nombre": "Tomates cherry",
      "descripcion": "Cultivo de tomates cherry en invernadero",
      "estado": "Activo",
      "fechaSiembra": "2024-01-15T00:00:00.000Z",
      "fechaCosechaEstimada": "2024-04-15T00:00:00.000Z",
      "areaSembrada": 100.5,
      "tipoCultivo": {
        "id": 1,
        "nombre": "Hortaliza"
      },
      "lote": {
        "id": 1,
        "nombre": "Lote Principal"
      },
      "surco": {
        "id": 1,
        "nombre": "Surco Norte"
      }
    }
  ]
}
```

## DTOs y Validaciones

### CreateTipoCultivoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty, @MaxLength(20)` | - |
| `descripcion` | `string` | `@IsString, @IsOptional, @MaxLength(150)` | - |

### UpdateTipoCultivoDto
Extiende `CreateTipoCultivoDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Relación con Cultivos**: Asociación automática con cultivos existentes
- **Validación de Unicidad**: Control de nombres únicos para tipos de cultivo
- **Gestión de Descripciones**: Información adicional para categorización

## Flujo de Trabajo

1. **Creación**: Definir nuevos tipos de cultivo con nombre y descripción
2. **Asociación**: Los cultivos se asignan automáticamente al tipo correspondiente
3. **Consulta**: Listado completo de tipos con cultivos asociados
4. **Mantenimiento**: Actualización y eliminación según necesidades

## Integración con Otros Módulos

- **Cultivos**: Clasificación de cultivos por tipo
- **Lotes/Surcos**: Organización espacial por tipo de cultivo
- **Actividades**: Planificación de actividades por tipo de cultivo
- **Reportes**: Agrupación de datos por categorías de cultivo