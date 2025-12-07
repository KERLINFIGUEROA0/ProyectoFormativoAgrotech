---
title: "Módulo Movimientos"
---

# Módulo Movimientos

## Endpoints

### POST /movimientos
**Descripción**: Crea un nuevo movimiento de inventario.

**URL completa:** `http://localhost:3000/movimientos`

**Request Body:**
```json
{
  "materialId": 1,
  "tipo": "INGRESO",
  "cantidad": 50,
  "unidad": "kg",
  "referencia": "Compra de fertilizantes",
  "fecha": "2024-01-15"
}
```

**Response:**
```json
{
  "id": 1,
  "material": {
    "id": 1,
    "nombre": "Fertilizante orgánico"
  },
  "tipo": "INGRESO",
  "cantidad": 50,
  "unidad": "kg",
  "referencia": "Compra de fertilizantes",
  "fecha": "2024-01-15T00:00:00.000Z"
}
```

### GET /movimientos
**Descripción**: Lista todos los movimientos de inventario.

**URL completa:** `http://localhost:3000/movimientos`

**Response:**
```json
[
  {
    "id": 1,
    "material": {
      "id": 1,
      "nombre": "Fertilizante orgánico"
    },
    "tipo": "INGRESO",
    "cantidad": 50,
    "unidad": "kg",
    "referencia": "Compra de fertilizantes",
    "fecha": "2024-01-15T00:00:00.000Z"
  }
]
```

### GET /movimientos/:id
**Descripción**: Obtiene un movimiento específico.

**URL completa:** `http://localhost:3000/movimientos/:id`

**Parámetros URL:**
- `id` (number): ID del movimiento

**Response:**
```json
{
  "id": 1,
  "material": {
    "id": 1,
    "nombre": "Fertilizante orgánico"
  },
  "tipo": "INGRESO",
  "cantidad": 50,
  "unidad": "kg",
  "referencia": "Compra de fertilizantes",
  "fecha": "2024-01-15T00:00:00.000Z"
}
```

### PATCH /movimientos/:id
**Descripción**: Actualiza un movimiento existente.

**URL completa:** `http://localhost:3000/movimientos/:id`

**Parámetros URL:**
- `id` (number): ID del movimiento

**Request Body:**
```json
{
  "cantidad": 60,
  "referencia": "Compra actualizada de fertilizantes"
}
```

**Response:**
```json
{
  "id": 1,
  "material": {
    "id": 1,
    "nombre": "Fertilizante orgánico"
  },
  "tipo": "INGRESO",
  "cantidad": 60,
  "unidad": "kg",
  "referencia": "Compra actualizada de fertilizantes",
  "fecha": "2024-01-15T00:00:00.000Z"
}
```

### DELETE /movimientos/:id
**Descripción**: Elimina un movimiento.

**URL completa:** `http://localhost:3000/movimientos/:id`

**Parámetros URL:**
- `id` (number): ID del movimiento

**Response:**
```json
{
  "message": "Movimiento eliminado correctamente"
}
```

## Entidad Movimiento

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "material": {
    "id": 1,
    "nombre": "Fertilizante orgánico",
    "tipoEmpaque": "Saco 50kg",
    "cantidad": 100,
    "unidadBase": "GRAMO"
  },
  "tipo": "INGRESO",
  "cantidad": 50,
  "unidad": "kg",
  "referencia": "Compra de fertilizantes",
  "fecha": "2024-01-15T00:00:00.000Z"
}
```

## DTOs y Validaciones

### CreateMovimientoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `materialId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `tipo` | `string` | `@IsString, @IsNotEmpty` | - |
| `cantidad` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `unidad` | `string` | `@IsString, @IsOptional` | - |
| `referencia` | `string` | `@IsString, @IsOptional` | - |
| `fecha` | `string` | `@IsDateString, @IsOptional` | - |

### UpdateMovimientoDto
Extiende `CreateMovimientoDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Control de Inventario**: Seguimiento de entradas y salidas
- **Referencias Cruzadas**: Vinculación con actividades y procesos
- **Historial Completo**: Registro cronológico de movimientos
- **Tipos de Movimiento**: Ingresos y egresos diferenciados

## Flujo de Trabajo

1. **Registro**: Ingresar movimiento con tipo y cantidad
2. **Referencia**: Asociar con actividad o proceso específico
3. **Validación**: Verificar consistencia con inventario
4. **Almacenamiento**: Guardar en historial de movimientos

## Integración con Otros Módulos

- **Materiales**: Actualización automática de stock
- **Actividades Materiales**: Registro de consumos
- **Trazabilidad**: Seguimiento de devoluciones y uso