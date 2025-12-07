---
title: "Módulo Cultivos EPA"
---

# Módulo Cultivos EPA

## Endpoints

### POST /cultivos-epa
**Descripción**: Crea una nueva relación entre cultivo y EPA.

**URL completa:** `http://localhost:3000/cultivos-epa`

**Request Body:**
```json
{
  "cultivoId": 1,
  "epaId": 1,
  "dosis": 2.5,
  "unidad": "L/ha"
}
```

**Response:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosis": 2.5,
  "unidad": "L/ha",
  "cultivo": { "id": 1, "nombre": "Tomates cherry" },
  "epa": { "id": 1, "nombre": "Fungicida X" }
}
```

### GET /cultivos-epa
**Descripción**: Lista todas las relaciones cultivo-EPA.

**URL completa:** `http://localhost:3000/cultivos-epa`

**Response:**
```json
[
  {
    "id": 1,
    "cultivoId": 1,
    "epaId": 1,
    "dosis": 2.5,
    "unidad": "L/ha",
    "cultivo": { "id": 1, "nombre": "Tomates cherry" },
    "epa": { "id": 1, "nombre": "Fungicida X" }
  }
]
```

### GET /cultivos-epa/:id
**Descripción**: Obtiene una relación cultivo-EPA específica.

**URL completa:** `http://localhost:3000/cultivos-epa/:id`

**Parámetros URL:**
- `id` (number): ID de la relación

**Response:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosis": 2.5,
  "unidad": "L/ha",
  "cultivo": { "id": 1, "nombre": "Tomates cherry" },
  "epa": { "id": 1, "nombre": "Fungicida X" }
}
```

### PATCH /cultivos-epa/:id
**Descripción**: Actualiza una relación cultivo-EPA.

**URL completa:** `http://localhost:3000/cultivos-epa/:id`

**Parámetros URL:**
- `id` (number): ID de la relación

**Request Body:**
```json
{
  "dosis": 3.0,
  "unidad": "L/ha"
}
```

**Response:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosis": 3.0,
  "unidad": "L/ha",
  "cultivo": { "id": 1, "nombre": "Tomates cherry" },
  "epa": { "id": 1, "nombre": "Fungicida X" }
}
```

### DELETE /cultivos-epa/:id
**Descripción**: Elimina una relación cultivo-EPA.

**URL completa:** `http://localhost:3000/cultivos-epa/:id`

**Parámetros URL:**
- `id` (number): ID de la relación

**Response:**
```json
{
  "message": "Relación cultivo-EPA eliminada correctamente"
}
```

## Entidad CultivosEpa

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosis": 2.5,
  "unidad": "L/ha",
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry",
    "estado": "Activo",
    "tipoCultivo": {
      "id": 1,
      "nombre": "Hortaliza"
    }
  },
  "epa": {
    "id": 1,
    "nombre": "Fungicida X",
    "tipo": "Fungicida",
    "concentracion": "500g/L"
  }
}
```

## DTOs y Validaciones

### CreateCultivosEpaDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `cultivoId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `epaId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `dosis` | `number` | `@IsNumber, @IsOptional` | - |
| `unidad` | `string` | `@IsString, @IsOptional` | - |

### UpdateCultivosEpaDto
Extiende `CreateCultivosEpaDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Relación Cultivo-EPA**: Asociación de productos fitosanitarios con cultivos
- **Control de Dosis**: Especificación de cantidades y unidades de aplicación
- **Validación de Compatibilidad**: Verificación de cultivos y EPAs válidos

## Flujo de Trabajo

1. **Asociación**: Vincular EPA específico con cultivo determinado
2. **Dosificación**: Definir dosis recomendada y unidad de medida
3. **Registro**: Almacenar relación para referencia en tratamientos

## Integración con Otros Módulos

- **Cultivos**: Asociación con cultivos específicos
- **EPA**: Referencia a productos fitosanitarios
- **EPA Tratamiento**: Base para aplicación de tratamientos