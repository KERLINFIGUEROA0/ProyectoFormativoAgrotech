---
title: "Módulo Surcos"
---

# Módulo Surcos

## Endpoints

### POST /surcos/crear
**Descripción**: Crea un nuevo surco dentro de un lote.

**URL completa:** `http://localhost:3000/surcos/crear`

**Request Body:**
```json
{
  "nombre": "Surco Norte - Sección A",
  "descripcion": "Surco principal para cultivo de tomates",
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
  "message": "El surco \"Surco Norte - Sección A\" se creó correctamente",
  "data": {
    "id": 1,
    "nombre": "Surco Norte - Sección A",
    "descripcion": "Surco principal para cultivo de tomates",
    "loteId": 1,
    "cultivoId": 1,
    "brokerId": 1,
    "activo_mqtt": true,
    "estado": "Disponible",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /surcos/listar
**Descripción**: Lista todos los surcos del sistema con sus relaciones.

**URL completa:** `http://localhost:3000/surcos/listar`

**Response:**
```json
{
  "success": true,
  "total": 5,
  "data": [
    {
      "id": 1,
      "nombre": "Surco Norte - Sección A",
      "descripcion": "Surco principal para cultivo de tomates",
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

### GET /surcos/lotes/:loteId/surcos
**Descripción**: Lista todos los surcos de un lote específico.

**URL completa:** `http://localhost:3000/surcos/lotes/:loteId/surcos`

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
      "nombre": "Surco Norte - Sección A",
      "estado": "Disponible",
      "cultivo": {
        "id": 1,
        "nombre": "Tomates cherry"
      }
    }
  ]
}
```

### GET /surcos/:id
**Descripción**: Obtiene un surco específico por ID con todas sus relaciones.

**URL completa:** `http://localhost:3000/surcos/:id`

**Parámetros URL:**
- `id` (number): ID del surco

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Surco Norte - Sección A",
    "descripcion": "Surco principal para cultivo de tomates",
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
    },
    "broker": {
      "id": 1,
      "nombre": "Broker Principal",
      "host": "192.168.1.100"
    }
  }
}
```

### PUT /surcos/actualizar/:id
**Descripción**: Actualiza la información completa de un surco.

**URL completa:** `http://localhost:3000/surcos/actualizar/:id`

**Parámetros URL:**
- `id` (number): ID del surco

**Request Body:**
```json
{
  "nombre": "Surco Norte - Sección A - Actualizado",
  "descripcion": "Surco principal actualizado",
  "cultivoId": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "El surco con ID 1 se actualizó correctamente",
  "data": {
    "id": 1,
    "nombre": "Surco Norte - Sección A - Actualizado",
    "descripcion": "Surco principal actualizado",
    "cultivoId": 2
  }
}
```

### DELETE /surcos/eliminar/:id
**Descripción**: Elimina un surco del sistema.

**URL completa:** `http://localhost:3000/surcos/eliminar/:id`

**Parámetros URL:**
- `id` (number): ID del surco

**Response:**
```json
{
  "success": true,
  "message": "El surco con ID 1 fue eliminado correctamente"
}
```

### PATCH /surcos/actualizar/:id/estado
**Descripción**: Actualiza el estado operativo de un surco.

**URL completa:** `http://localhost:3000/surcos/actualizar/:id/estado`

**Parámetros URL:**
- `id` (number): ID del surco

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
  "message": "El estado del surco se actualizó a \"En siembra\"",
  "data": {
    "id": 1,
    "estado": "En siembra"
  }
}
```

### PATCH /surcos/actualizar/:id/mqtt
**Descripción**: Activa o desactiva la recepción de datos MQTT para el surco.

**URL completa:** `http://localhost:3000/surcos/actualizar/:id/mqtt`

**Parámetros URL:**
- `id` (number): ID del surco

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
  "message": "La recepción de datos MQTT del surco se desactivó",
  "data": {
    "id": 1,
    "activo_mqtt": false
  }
}
```

### POST /surcos/:id/sincronizar
**Descripción**: Sincroniza los sensores asociados al surco.

**URL completa:** `http://localhost:3000/surcos/:id/sincronizar`

**Parámetros URL:**
- `id` (number): ID del surco

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

## Entidad Surco

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Surco Norte - Sección A",
  "descripcion": "Surco principal para cultivo de tomates",
  "loteId": 1,
  "cultivoId": 1,
  "brokerId": 1,
  "activo_mqtt": true,
  "estado": "Disponible",
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
      "topic": "agrotech/surco1/temp"
    }
  ],
  "broker": {
    "id": 1,
    "nombre": "Broker Principal",
    "host": "192.168.1.100",
    "puerto": 1883
  },
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

## Estados de Surco

- **Disponible**: Surco listo para asignar cultivo
- **En siembra**: Proceso de plantación activo
- **En cosecha**: Cultivo maduro listo para cosecha
- **Mantenimiento**: Surco en mantenimiento o reparación

## DTOs y Validaciones

###  CreateSurcoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `loteId` | `number` | `@IsNumber, @IsNotEmpty, @Type(() => Number)` | - |
| `cultivoId` | `number` | `@IsOptional, @ValidateIf, @IsNumber` | `cultivoId debe ser un número válido` |
| `brokerId` | `number` | `@IsOptional, @ValidateIf, @IsNumber` | `brokerId debe ser un número válido` |
| `activo_mqtt` | `boolean` | `@IsBoolean, @IsOptional, @Transform` | - |

###  UpdateSurcoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsOptional, @IsString` | - |
| `descripcion` | `string` | `@IsOptional, @IsString` | - |
| `cultivoId` | `number` | `@IsOptional, @IsNumber` | - |
| `brokerId` | `number` | `@IsOptional, @IsNumber` | - |
| `activo_mqtt` | `boolean` | `@IsOptional, @IsBoolean` | - |

###  UpdateSurcoEstadoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `estado` | `string` | `@IsString, @IsNotEmpty, @IsIn(['Disponible', 'En siembra', 'En cosecha', 'Mantenimiento'])` | El estado proporcionado no es válido. |

###  UpdateSurcoMqttDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `activo_mqtt` | `boolean` | `@IsBoolean, @IsNotEmpty` | - |

## Funcionalidades Avanzadas

- **Control de Estados**: Seguimiento del ciclo de vida del surco
- **Integración IoT**: Control de recepción de datos MQTT
- **Asociación Dinámica**: Cambio de cultivos y brokers en tiempo real
- **Sincronización**: Alineación automática de sensores asociados
- **Monitoreo Espacial**: Vinculación directa con coordenadas de lotes

## Ciclo de Vida de un Surco

1. **Creación**: Surco registrado en sistema con coordenadas
2. **Asignación**: Cultivo asignado al surco
3. **Siembra**: Estado cambia a "En siembra"
4. **Monitoreo**: Sensores activos recolectando datos
5. **Cosecha**: Estado cambia a "En cosecha"
6. **Mantenimiento**: Preparación para siguiente ciclo

## Integración con IoT

Los surcos sirven como puente entre el mundo físico (terreno) y digital (sistema). Cada surco puede tener múltiples sensores que reportan datos ambientales críticos para el monitoreo y control automatizado de cultivos.