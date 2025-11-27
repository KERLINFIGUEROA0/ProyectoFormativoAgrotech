---
title: "Módulo Lotes"
---

# Módulo Lotes

## Endpoints

### GET /lotes/estadisticas
**Descripción**: Obtiene estadísticas generales de los lotes (total, en cultivo, en preparación, alertas).

**URL completa:** `http://localhost:3000/lotes/estadisticas`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "enCultivo": 7,
    "enPreparacion": 2,
    "alertas": 1
  }
}
```

### GET /lotes/listar
**Descripción**: Lista todos los lotes con sus surcos y cultivos relacionados.

**URL completa:** `http://localhost:3000/lotes/listar`

**Response:**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "id": 1,
      "localizacion": null,
      "nombre": "Lote Norte",
      "area": "1500.50",
      "estado": "Activo",
      "coordenadas": {
        "type": "polygon",
        "coordinates": [
          { "lat": 4.6097, "lng": -74.0817 },
          { "lat": 4.6107, "lng": -74.0817 },
          { "lat": 4.6107, "lng": -74.0807 },
          { "lat": 4.6097, "lng": -74.0807 }
        ]
      },
      "surcos": [
        {
          "id": 1,
          "numero": 1,
          "cultivo": {
            "id": 1,
            "nombre": "Tomate cherry"
          }
        }
      ]
    },
    {
      "id": 2,
      "localizacion": null,
      "nombre": "Lote Sur",
      "area": "800.25",
      "estado": "En preparación",
      "coordenadas": null,
      "surcos": []
    }
  ]
}
```

### GET /lotes/:id
**Descripción**: Obtiene un lote específico por ID con sus surcos.

**URL completa:** `http://localhost:3000/lotes/:id`

**Parámetros URL**:
- `id` (number): ID del lote

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "localizacion": null,
    "nombre": "Lote Norte",
    "area": "1500.50",
    "estado": "Activo",
    "coordenadas": {
      "type": "polygon",
      "coordinates": [
        { "lat": 4.6097, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0807 },
        { "lat": 4.6097, "lng": -74.0807 }
      ]
    },
    "surcos": [
      {
        "id": 1,
        "numero": 1,
        "cultivo": {
          "id": 1,
          "nombre": "Tomate cherry"
        }
      }
    ]
  }
}
```

### POST /lotes/crear
**Descripción**: Crea un nuevo lote.

**URL completa:** `http://localhost:3000/lotes/crear`

**Request Body:**
```json
{
  "nombre": "Lote Este",
  "area": 2000.75,
  "estado": "En preparación",
  "coordenadas": {
    "type": "polygon",
    "coordinates": [
      { "lat": 4.6097, "lng": -74.0817 },
      { "lat": 4.6107, "lng": -74.0817 },
      { "lat": 4.6107, "lng": -74.0807 },
      { "lat": 4.6097, "lng": -74.0807 }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "El lote \"Lote Este\" se creó correctamente",
  "data": {
    "id": 3,
    "localizacion": null,
    "nombre": "Lote Este",
    "area": "2000.75",
    "estado": "En preparación",
    "coordenadas": {
      "type": "polygon",
      "coordinates": [
        { "lat": 4.6097, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0807 },
        { "lat": 4.6097, "lng": -74.0807 }
      ]
    },
    "surcos": []
  }
}
```

### PUT /lotes/actualizar/:id
**Descripción**: Actualiza un lote existente.

**URL completa:** `http://localhost:3000/lotes/actualizar/:id`

**Parámetros URL**:
- `id` (number): ID del lote

**Request Body:**
```json
{
  "nombre": "Lote Este Premium",
  "area": 2200.00,
  "estado": "Activo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "El lote con ID 3 se actualizó correctamente",
  "data": {
    "id": 3,
    "localizacion": null,
    "nombre": "Lote Este Premium",
    "area": "2200.00",
    "estado": "Activo",
    "coordenadas": {
      "type": "polygon",
      "coordinates": [
        { "lat": 4.6097, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0807 },
        { "lat": 4.6097, "lng": -74.0807 }
      ]
    },
    "surcos": []
  }
}
```

### PATCH /lotes/:id/estado
**Descripción**: Actualiza solo el estado de un lote.

**URL completa:** `http://localhost:3000/lotes/:id/estado`

**Parámetros URL**:
- `id` (number): ID del lote

**Request Body:**
```json
{
  "estado": "Activo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "El estado del lote con ID 3 se actualizó a \"Activo\"",
  "data": {
    "id": 3,
    "localizacion": null,
    "nombre": "Lote Este Premium",
    "area": "2200.00",
    "estado": "Activo",
    "coordenadas": {
      "type": "polygon",
      "coordinates": [
        { "lat": 4.6097, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0817 },
        { "lat": 4.6107, "lng": -74.0807 },
        { "lat": 4.6097, "lng": -74.0807 }
      ]
    },
    "surcos": []
  }
}
```

## Entidad Lote

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "localizacion": null,
  "nombre": "Lote Norte",
  "area": "1500.50",
  "estado": "Activo",
  "coordenadas": {
    "type": "polygon",
    "coordinates": [
      { "lat": 4.6097, "lng": -74.0817 },
      { "lat": 4.6107, "lng": -74.0817 },
      { "lat": 4.6107, "lng": -74.0807 },
      { "lat": 4.6097, "lng": -74.0807 }
    ]
  },
  "surcos": [
    {
      "id": 1,
      "numero": 1,
      "estado": "Activo",
      "cultivoId": 1,
      "loteId": 1
    }
  ]
}
```

## DTOs y Validaciones

###  CreateLoteDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | El nombre del lote es requerido. |
| `area` | `number` | `@IsNumber, @IsNotEmpty, @Max(3000)` | El área es requerida. El área del lote no puede superar los 3000 m². |
| `estado` | `string` | `@IsString, @IsOptional, @IsIn(['Activo', 'Inactivo', 'En preparación'])` | - |
| `coordenadas` | `CoordenadasDto` | `@IsObject, @ValidateNested, @Type(() => CoordenadasDto), @IsOptional` | - |

### UpdateLoteDto
Similar a CreateLoteDto.

###  UpdateLoteEstadoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `estado` | `string` | `@IsString, @IsNotEmpty, @IsIn(['Activo', 'Inactivo', 'En preparación'])` | El estado debe ser "Activo", "Inactivo" o "En preparación". |

## Funcionalidades Adicionales

- **Cache**: Los endpoints de estadísticas y listado usan cache Redis (TTL: 5-60 min)
- **Coordenadas Geoespaciales**: Soporte para puntos y polígonos usando JSONB en PostgreSQL
- **Reutilización**: Los lotes no se eliminan, solo cambian de estado para preservar trazabilidad
- **Validación**: Área máxima de 3000 m² por lote