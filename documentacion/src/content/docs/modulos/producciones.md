---
title: "Módulo Producciones"
---

# Módulo Producciones

## Endpoints

### POST /producciones
**Descripción**: Registra una nueva producción de un cultivo.

**URL completa:** `http://localhost:3000/producciones`

**Request Body:**
```json
{
  "cantidad": 200,
  "fecha": "2024-01-20T10:30:00.000Z",
  "cultivoId": 1,
  "estado": "Cosechado"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Producción registrada con éxito.",
  "data": {
    "id": 5,
    "cantidad": 200,
    "cantidadOriginal": 200,
    "fecha": "2024-01-20T10:30:00.000Z",
    "estado": "Cosechado",
    "cultivo": {
      "id": 1,
      "nombre": "Tomate cherry"
    }
  }
}
```

### GET /producciones
**Descripción**: Lista todas las producciones con relaciones a cultivos.

**URL completa:** `http://localhost:3000/producciones`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cantidad": 150,
      "cantidadOriginal": 200,
      "fecha": "2024-01-15T08:00:00.000Z",
      "estado": "Cosechado",
      "cultivo": {
        "id": 1,
        "nombre": "Tomate cherry"
      }
    },
    {
      "id": 2,
      "cantidad": 80,
      "cantidadOriginal": 120,
      "fecha": "2024-01-18T09:15:00.000Z",
      "estado": "En Proceso",
      "cultivo": {
        "id": 2,
        "nombre": "Lechuga romana"
      }
    }
  ]
}
```

### GET /producciones/cultivo/:cultivoId
**Descripción**: Lista todas las producciones de un cultivo específico.

**URL completa:** `http://localhost:3000/producciones/cultivo/:cultivoId`

**Parámetros URL**:
- `cultivoId` (number): ID del cultivo

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cantidad": 150,
      "cantidadOriginal": 200,
      "fecha": "2024-01-15T08:00:00.000Z",
      "estado": "Cosechado",
      "cultivo": {
        "id": 1,
        "nombre": "Tomate cherry"
      }
    },
    {
      "id": 3,
      "cantidad": 180,
      "cantidadOriginal": 180,
      "fecha": "2024-01-22T07:45:00.000Z",
      "estado": "Cosechado",
      "cultivo": {
        "id": 1,
        "nombre": "Tomate cherry"
      }
    }
  ]
}
```

### GET /producciones/cultivo/:cultivoId/stats
**Descripción**: Obtiene estadísticas de producciones para un cultivo específico.

**URL completa:** `http://localhost:3000/producciones/cultivo/:cultivoId/stats`

**Parámetros URL**:
- `cultivoId` (number): ID del cultivo

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCosechado": 380,
    "ingresosTotales": 1520000,
    "gastosTotales": 456000,
    "cosechaVendida": 190
  }
}
```

### GET /producciones/:id
**Descripción**: Obtiene una producción específica con ventas y gastos.

**URL completa:** `http://localhost:3000/producciones/:id`

**Parámetros URL**:
- `id` (number): ID de la producción

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cantidad": 150,
    "cantidadOriginal": 200,
    "fecha": "2024-01-15T08:00:00.000Z",
    "estado": "Cosechado",
    "cultivo": {
      "id": 1,
      "nombre": "Tomate cherry"
    },
    "ventas": [
      {
        "id": 1,
        "descripcion": "Venta al mercado local",
        "cantidadVenta": 50,
        "valorTotalVenta": 200000,
        "fecha": "2024-01-16"
      }
    ],
    "gastos": [
      {
        "id": 1,
        "descripcion": "Fertilizante orgánico",
        "monto": 75000,
        "fecha": "2024-01-10"
      }
    ]
  }
}
```

### PUT /producciones/:id
**Descripción**: Actualiza una producción existente.

**URL completa:** `http://localhost:3000/producciones/:id`

**Parámetros URL**:
- `id` (number): ID de la producción

**Request Body:**
```json
{
  "cantidad": 180,
  "estado": "Cosechado"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Producción actualizada con éxito.",
  "data": {
    "id": 1,
    "cantidad": 180,
    "cantidadOriginal": 200,
    "fecha": "2024-01-15T08:00:00.000Z",
    "estado": "Cosechado",
    "cultivo": {
      "id": 1,
      "nombre": "Tomate cherry"
    }
  }
}
```

### DELETE /producciones/:id
**Descripción**: Elimina una producción.

**URL completa:** `http://localhost:3000/producciones/:id`

**Parámetros URL**:
- `id` (number): ID de la producción

**Response:**
```json
{
  "success": true,
  "message": "Producción eliminada con éxito."
}
```

### GET /producciones/available-for-sale
**Descripción**: Lista producciones disponibles para venta (con cantidad > 0).

**URL completa:** `http://localhost:3000/producciones/available-for-sale`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cantidad": 150,
      "cantidadOriginal": 200,
      "fecha": "2024-01-15T08:00:00.000Z",
      "estado": "Cosechado",
      "cultivo": {
        "id": 1,
        "nombre": "Tomate cherry"
      }
    },
    {
      "id": 3,
      "cantidad": 180,
      "cantidadOriginal": 180,
      "fecha": "2024-01-22T07:45:00.000Z",
      "estado": "Cosechado",
      "cultivo": {
        "id": 1,
        "nombre": "Tomate cherry"
      }
    }
  ]
}
```

## Entidad Produccion

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "cantidad": 150,
  "cantidadOriginal": 200,
  "fecha": "2024-01-15T08:00:00.000Z",
  "estado": "Cosechado",
  "cultivo": {
    "id": 1,
    "nombre": "Tomate cherry"
  },
  "ventas": [
    {
      "id": 1,
      "descripcion": "Venta al mercado local",
      "cantidadVenta": 50,
      "valorTotalVenta": 200000,
      "fecha": "2024-01-16"
    }
  ],
  "gastos": [
    {
      "id": 1,
      "descripcion": "Fertilizante orgánico",
      "monto": 75000,
      "fecha": "2024-01-10"
    }
  ]
}
```

## Estados de Producción

- **Programado**: Producción planificada
- **En Proceso**: Producción en curso
- **Cosechado**: Producción completada
- **Vendido**: Toda la producción ha sido vendida

## DTOs y Validaciones

### CreateProduccioneDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `cantidad` | `number` | `@IsInt, @IsPositive, @IsNotEmpty` | La cantidad debe ser un número entero positivo. La cantidad es obligatoria. |
| `fecha` | `string` | `@IsDateString, @IsNotEmpty` | La fecha debe tener un formato válido (YYYY-MM-DD). La fecha es obligatoria. |
| `cultivoId` | `number` | `@IsInt, @IsNotEmpty` | El ID del cultivo debe ser un número entero. El ID del cultivo es obligatorio. |
| `estado` | `string` | `@IsString, @IsOptional, @IsIn(['Programado', 'En Proceso', 'Cosechado'])` | - |

### UpdateProduccioneDto
Similar a CreateProduccioneDto.

## Funcionalidades Adicionales

- **Gestión de Inventario**: Seguimiento de cantidad disponible vs original
- **Estadísticas**: Cálculos automáticos de ingresos, gastos y rendimiento
- **Relaciones**: Conectado con cultivos, ventas y gastos para trazabilidad
- **Validación**: Cantidades positivas, fechas válidas
- **Disponibilidad**: Endpoint específico para producciones vendibles