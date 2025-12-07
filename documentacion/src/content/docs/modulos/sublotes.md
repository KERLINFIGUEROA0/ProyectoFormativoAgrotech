---
title: "Módulo Sublotes"
---

# Módulo Sublotes

## Endpoints

### POST /sublotes/crear
**Descripción**: Crea un nuevo sublote dentro de un lote.

**URL completa:** `http://localhost:3000/sublotes/crear`

**Request Body:**
```json
{
  "nombre": "Sublote Norte - Sección A",
  "coordenadas": {
    "type": "point",
    "coordinates": { "lat": 4.6097, "lng": -74.0817 }
  },
  "loteId": 1,
  "cultivoId": 1,
  "brokerId": 1,
  "activo_mqtt": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "El sublote \"Sublote Norte - Sección A\" se creó correctamente",
  "data": {
    "id": 1,
    "nombre": "Sublote Norte - Sección A",
    "coordenadas": {
      "type": "point",
      "coordinates": { "lat": 4.6097, "lng": -74.0817 }
    },
    "loteId": 1,
    "cultivoId": 1,
    "brokerId": 1,
    "activo_mqtt": true,
    "estado": "Disponible",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /sublotes/listar
**Descripción**: Lista todos los sublotes del sistema con sus relaciones.

**URL completa:** `http://localhost:3000/sublotes/listar`

**Response:**
```json
{
  "success": true,
  "total": 5,
  "data": [
    {
      "id": 1,
      "nombre": "Sublote Norte - Sección A",
      "estado": "Disponible",
      "activo_mqtt": true,
      "lote": {
        "id": 1,
        "nombre": "Lote Principal",
        "area": 1500.5
      },
      "cultivo": {
        "id": 1,
        "nombre": "Tomates cherry",
        "estado": "Activo"
      },
      "sensores": [
        {
          "id": 1,
          "nombre": "Sensor Temperatura",
          "estado": "Activo"
        }
      ]
    }
  ]
}
```

### GET /sublotes/lotes/:loteId/sublotes
**Descripción**: Lista todos los sublotes de un lote específico.

**URL completa:** `http://localhost:3000/sublotes/lotes/:loteId/sublotes`

**Parámetros URL:**
- `loteId` (number): ID del lote

**Response:**
```json
{
  "success": true,
  "total": 3,
  "data": [
    {
      "id": 1,
      "nombre": "Sublote Norte - Sección A",
      "estado": "Disponible",
      "cultivo": {
        "id": 1,
        "nombre": "Tomates cherry"
      }
    }
  ]
}
```

### GET /sublotes/lotes/:loteId/disponibles
**Descripción**: Lista todos los sublotes disponibles de un lote específico.

**URL completa:** `http://localhost:3000/sublotes/lotes/:loteId/disponibles`

**Parámetros URL:**
- `loteId` (number): ID del lote

**Response:**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "id": 1,
      "nombre": "Sublote Norte - Sección A",
      "estado": "Disponible"
    }
  ]
}
```

### GET /sublotes/:id
**Descripción**: Obtiene un sublote específico por ID con todas sus relaciones.

**URL completa:** `http://localhost:3000/sublotes/:id`

**Parámetros URL:**
- `id` (number): ID del sublote

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Sublote Norte - Sección A",
    "estado": "Disponible",
    "activo_mqtt": true,
    "lote": {
      "id": 1,
      "nombre": "Lote Principal"
    },
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry",
      "sensores": [...]
    }
  }
}
```

### PUT /sublotes/actualizar/:id
**Descripción**: Actualiza la información completa de un sublote.

**URL completa:** `http://localhost:3000/sublotes/actualizar/:id`

**Parámetros URL:**
- `id` (number): ID del sublote

**Request Body:**
```json
{
  "nombre": "Sublote Norte - Sección A - Actualizado",
  "cultivoId": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "El sublote con ID 1 se actualizó correctamente",
  "data": {
    "id": 1,
    "nombre": "Sublote Norte - Sección A - Actualizado",
    "cultivoId": 2
  }
}
```

### DELETE /sublotes/eliminar/:id
**Descripción**: Elimina un sublote del sistema.

**URL completa:** `http://localhost:3000/sublotes/eliminar/:id`

**Parámetros URL:**
- `id` (number): ID del sublote

**Response:**
```json
{
  "success": true,
  "message": "El sublote con ID 1 fue eliminado correctamente"
}
```

### PATCH /sublotes/actualizar/:id/estado
**Descripción**: Actualiza el estado operativo de un sublote.

**URL completa:** `http://localhost:3000/sublotes/actualizar/:id/estado`

**Parámetros URL:**
- `id` (number): ID del sublote

**Request Body:**
```json
{
  "estado": "En siembra"
}
```

**Response:**
```json
{
  "success": true,
  "message": "El estado del sublote se actualizó a \"En siembra\"",
  "data": {
    "id": 1,
    "estado": "En siembra"
  }
}
```

### PATCH /sublotes/actualizar/:id/mqtt
**Descripción**: Activa o desactiva la recepción de datos MQTT para el sublote.

**URL completa:** `http://localhost:3000/sublotes/actualizar/:id/mqtt`

**Parámetros URL:**
- `id` (number): ID del sublote

**Request Body:**
```json
{
  "activo_mqtt": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "La recepción de datos MQTT del sublote se desactivó",
  "data": {
    "id": 1,
    "activo_mqtt": false
  }
}
```

### POST /sublotes/:id/sincronizar
**Descripción**: Sincroniza los sensores asociados al sublote.

**URL completa:** `http://localhost:3000/sublotes/:id/sincronizar`

**Parámetros URL:**
- `id` (number): ID del sublote

**Response:**
```json
{
  "success": true,
  "message": "Sensores sincronizados correctamente",
  "data": {
    "sensores_activos": 5,
    "sensores_inactivos": 1
  }
}
```

## Entidad Sublote

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Sublote Norte - Sección A",
  "estado": "Disponible",
  "coordenadas": {
    "type": "point",
    "coordinates": { "lat": 4.6097, "lng": -74.0817 }
  },
  "activo_mqtt": true,
  "lote": {
    "id": 1,
    "nombre": "Lote Principal",
    "area": 1500.5
  },
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry",
    "estado": "Activo"
  },
  "sensores": [
    {
      "id": 1,
      "nombre": "Sensor Temperatura",
      "estado": "Activo",
      "topic": "agrotech/sublote1/temp"
    }
  ],
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

## Estados de Sublote

- **Disponible**: Sublote listo para asignar cultivo
- **En siembra**: Proceso de plantación activo
- **En cosecha**: Cultivo maduro listo para cosecha
- **Mantenimiento**: Sublote en mantenimiento o reparación

## DTOs y Validaciones

###  CreateSubloteDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `coordenadas` | `object` | `@IsOptional, @IsObject` | - |
| `loteId` | `number` | `@IsNumber, @IsNotEmpty, @Type(() => Number)` | - |
| `cultivoId` | `number` | `@IsOptional, @ValidateIf, @IsNumber` | `cultivoId debe ser un número válido` |
| `brokerId` | `number` | `@IsOptional, @ValidateIf, @IsNumber` | `brokerId debe ser un número válido` |
| `activo_mqtt` | `boolean` | `@IsBoolean, @IsOptional, @Transform` | - |

###  UpdateSubloteDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsOptional, @IsString` | - |
| `cultivoId` | `number` | `@IsOptional, @IsNumber` | - |
| `brokerId` | `number` | `@IsOptional, @IsNumber` | - |
| `activo_mqtt` | `boolean` | `@IsOptional, @IsBoolean` | - |

###  UpdateSubloteEstadoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `estado` | `string` | `@IsString, @IsNotEmpty, @IsIn(['Disponible', 'En siembra', 'En cosecha', 'Mantenimiento'])` | El estado proporcionado no es válido. |

###  UpdateSubloteMqttDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `activo_mqtt` | `boolean` | `@IsBoolean, @IsNotEmpty` | - |

## Funcionalidades Avanzadas

- **Control de Estados**: Seguimiento del ciclo de vida del sublote
- **Integración IoT**: Control de recepción de datos MQTT
- **Asociación Dinámica**: Cambio de cultivos y brokers en tiempo real
- **Sincronización**: Alineación automática de sensores asociados
- **Monitoreo Espacial**: Vinculación directa con coordenadas de lotes

## Ciclo de Vida de un Sublote

1. **Creación**: Sublote registrado en sistema con coordenadas
2. **Asignación**: Cultivo asignado al sublote
3. **Siembra**: Estado cambia a "En siembra"
4. **Monitoreo**: Sensores activos recolectando datos
5. **Cosecha**: Estado cambia a "En cosecha"
6. **Mantenimiento**: Preparación para siguiente ciclo

## Integración con IoT

Los sublotes sirven como puente entre el mundo físico (terreno) y digital (sistema). Cada sublote puede tener múltiples sensores que reportan datos ambientales críticos para el monitoreo y control automatizado de cultivos.