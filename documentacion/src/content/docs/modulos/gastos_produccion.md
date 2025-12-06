---
title: "Módulo Gastos Producción"
---

# Módulo Gastos Producción

## Endpoints

### POST /gastos-produccion
**Descripción**: Crea un nuevo gasto de producción.

**URL completa:** `http://localhost:3000/gastos-produccion`

**Request Body:**
```json
{
  "descripcion": "Compra de fertilizantes",
  "monto": 150000,
  "fecha": "2024-01-15",
  "tipo": "Egreso",
  "cantidad": 50,
  "unidad": "kg",
  "precioUnitario": 3000,
  "cultivoId": 1
}
```

**Response:**
```json
{
  "id": 1,
  "descripcion": "Compra de fertilizantes",
  "monto": 150000,
  "fecha": "2024-01-15T00:00:00.000Z",
  "tipo": "Egreso",
  "cantidad": 50,
  "unidad": "kg",
  "precioUnitario": 3000,
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry"
  }
}
```

### GET /gastos-produccion
**Descripción**: Lista todos los gastos de producción.

**URL completa:** `http://localhost:3000/gastos-produccion`

**Response:**
```json
[
  {
    "id": 1,
    "descripcion": "Compra de fertilizantes",
    "monto": 150000,
    "fecha": "2024-01-15T00:00:00.000Z",
    "tipo": "Egreso",
    "cantidad": 50,
    "unidad": "kg",
    "precioUnitario": 3000,
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry"
    }
  }
]
```

### GET /gastos-produccion/:id
**Descripción**: Obtiene un gasto específico.

**URL completa:** `http://localhost:3000/gastos-produccion/:id`

**Parámetros URL:**
- `id` (number): ID del gasto

**Response:**
```json
{
  "id": 1,
  "descripcion": "Compra de fertilizantes",
  "monto": 150000,
  "fecha": "2024-01-15T00:00:00.000Z",
  "tipo": "Egreso",
  "cantidad": 50,
  "unidad": "kg",
  "precioUnitario": 3000,
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry"
  }
}
```

### PATCH /gastos-produccion/:id
**Descripción**: Actualiza un gasto existente.

**URL completa:** `http://localhost:3000/gastos-produccion/:id`

**Parámetros URL:**
- `id` (number): ID del gasto

**Request Body:**
```json
{
  "monto": 160000,
  "descripcion": "Compra actualizada de fertilizantes"
}
```

**Response:**
```json
{
  "id": 1,
  "descripcion": "Compra actualizada de fertilizantes",
  "monto": 160000,
  "fecha": "2024-01-15T00:00:00.000Z",
  "tipo": "Egreso",
  "cantidad": 50,
  "unidad": "kg",
  "precioUnitario": 3000,
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry"
  }
}
```

### DELETE /gastos-produccion/:id
**Descripción**: Elimina un gasto de producción.

**URL completa:** `http://localhost:3000/gastos-produccion/:id`

**Parámetros URL:**
- `id` (number): ID del gasto

**Response:**
```json
{
  "message": "Gasto eliminado correctamente"
}
```

## Entidad GastoProduccion

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "descripcion": "Compra de fertilizantes",
  "monto": 150000,
  "fecha": "2024-01-15T00:00:00.000Z",
  "tipo": "Egreso",
  "cantidad": 50,
  "unidad": "kg",
  "precioUnitario": 3000,
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry",
    "estado": "Activo"
  }
}
```

## DTOs y Validaciones

### CreateGastoProduccionDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `descripcion` | `string` | `@IsString, @IsNotEmpty` | - |
| `monto` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `fecha` | `string` | `@IsDateString, @IsNotEmpty` | - |
| `tipo` | `string` | `@IsString, @IsNotEmpty` | - |
| `cantidad` | `number` | `@IsNumber, @IsOptional` | - |
| `unidad` | `string` | `@IsString, @IsOptional` | - |
| `precioUnitario` | `number` | `@IsNumber, @IsOptional` | - |
| `cultivoId` | `number` | `@IsNumber, @IsOptional` | - |

### UpdateGastoProduccionDto
Extiende `CreateGastoProduccionDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Registro de Gastos**: Control de egresos por cultivo
- **Cálculo de Costos**: Precio unitario y cantidades
- **Asociación por Cultivo**: Vinculación con producciones específicas
- **Tipos de Movimiento**: Ingresos y egresos

## Flujo de Trabajo

1. **Registro**: Ingresar gasto con descripción y monto
2. **Clasificación**: Asignar tipo (ingreso/egreso) y cultivo
3. **Cálculo**: Determinar costos unitarios y totales

## Integración con Otros Módulos

- **Cultivos**: Asociación de gastos con producciones específicas
- **Pagos**: Complemento de costos de mano de obra
- **Actividades Materiales**: Costos de materiales utilizados
- **Trazabilidad**: Inclusión en análisis financiero