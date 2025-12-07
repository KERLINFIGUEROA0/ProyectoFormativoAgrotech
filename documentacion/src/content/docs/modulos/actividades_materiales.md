---
title: "Módulo Actividades Materiales"
---

# Módulo Actividades Materiales

## Endpoints

### POST /actividades-materiales
**Descripción**: Asigna un material a una actividad, descontando del inventario y calculando costos.

**URL completa:** `http://localhost:3000/actividades-materiales`

**Request Body:**
```json
{
  "materialId": 1,
  "actividadId": 1,
  "cantidadUsada": 5,
  "unidadMedida": "KILOGRAMO"
}
```

**Response:**
```json
{
  "id": 1,
  "cantidadUsada": 5,
  "unidadMedida": "KILOGRAMO",
  "costo": 25000,
  "cantidadUsadaBase": 5000,
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates"
  },
  "material": {
    "id": 1,
    "nombre": "Semillas de tomate"
  }
}
```

### GET /actividades-materiales
**Descripción**: Lista todas las asignaciones de materiales a actividades.

**URL completa:** `http://localhost:3000/actividades-materiales`

**Response:**
```json
[
  {
    "id": 1,
    "cantidadUsada": 5,
    "unidadMedida": "KILOGRAMO",
    "costo": 25000,
    "cantidadUsadaBase": 5000,
    "actividad": {
      "id": 1,
      "titulo": "Siembra de tomates"
    },
    "material": {
      "id": 1,
      "nombre": "Semillas de tomate"
    }
  }
]
```

### GET /actividades-materiales/:id
**Descripción**: Obtiene una asignación específica de material a actividad.

**URL completa:** `http://localhost:3000/actividades-materiales/:id`

**Parámetros URL:**
- `id` (number): ID de la asignación

**Response:**
```json
{
  "id": 1,
  "cantidadUsada": 5,
  "unidadMedida": "KILOGRAMO",
  "costo": 25000,
  "cantidadUsadaBase": 5000,
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates"
  },
  "material": {
    "id": 1,
    "nombre": "Semillas de tomate"
  }
}
```

### PATCH /actividades-materiales/:id
**Descripción**: Actualiza una asignación de material, recalculando stock y costos.

**URL completa:** `http://localhost:3000/actividades-materiales/:id`

**Parámetros URL:**
- `id` (number): ID de la asignación

**Request Body:**
```json
{
  "cantidadUsada": 6,
  "unidadMedida": "KILOGRAMO"
}
```

**Response:**
```json
{
  "id": 1,
  "cantidadUsada": 6,
  "unidadMedida": "KILOGRAMO",
  "costo": 30000,
  "cantidadUsadaBase": 6000,
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates"
  },
  "material": {
    "id": 1,
    "nombre": "Semillas de tomate"
  }
}
```

### DELETE /actividades-materiales/:id
**Descripción**: Elimina una asignación de material, devolviendo el stock al inventario.

**URL completa:** `http://localhost:3000/actividades-materiales/:id`

**Parámetros URL:**
- `id` (number): ID de la asignación

**Response:**
```json
{
  "message": "ActividadMaterial eliminado correctamente"
}
```

## Entidad ActividadMaterial

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "cantidadUsada": 5,
  "unidadMedida": "KILOGRAMO",
  "cantidadUsadaBase": 5000,
  "costo": 25000,
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates",
    "descripcion": "Proceso completo de siembra manual en sublotes preparados",
    "fecha": "2024-01-15T08:00:00.000Z",
    "estado": "completado",
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry"
    }
  },
  "material": {
    "id": 1,
    "nombre": "Semillas de tomate",
    "tipoEmpaque": "Bolsa 1kg",
    "precio": 5000,
    "cantidad": 100,
    "unidadBase": "GRAMO",
    "pesoPorUnidad": 1000,
    "tipoConsumo": "CONSUMIBLE"
  }
}
```

## DTOs y Validaciones

### CreateActividadesMaterialeDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `materialId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `actividadId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `cantidadUsada` | `number` | `@IsNumber, @IsOptional` | - |
| `unidadMedida` | `UnidadMedida` | `@IsEnum(UnidadMedida), @IsOptional` | - |

### UpdateActividadesMaterialeDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `cantidadUsada` | `number` | `@IsNumber, @IsOptional` | - |
| `unidadMedida` | `UnidadMedida` | `@IsEnum(UnidadMedida), @IsOptional` | - |

## Funcionalidades Avanzadas

- **Conversión de Unidades**: Conversión automática entre unidades de medida
- **Control de Stock**: Validación y descuento automático de inventario
- **Cálculo de Costos**: Cálculo proporcional de costos por uso
- **Devolución de Materiales**: Restauración de stock al eliminar asignaciones
- **Soporte para Empaques**: Manejo especial de unidades de empaque

## Flujo de Trabajo

1. **Asignación**: Seleccionar material y cantidad para actividad específica
2. **Conversión**: Convertir unidades a base del material
3. **Validación**: Verificar stock disponible
4. **Cálculo**: Determinar costo proporcional
5. **Actualización**: Descontar del inventario y registrar asignación

## Integración con Otros Módulos

- **Actividades**: Asociación de materiales utilizados en tareas
- **Materiales**: Gestión de inventario y control de stock
- **Movimientos**: Registro de salidas por uso en actividades
- **Gastos de Producción**: Incorporación de costos de materiales