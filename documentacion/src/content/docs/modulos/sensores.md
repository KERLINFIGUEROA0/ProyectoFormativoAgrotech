---
title: "Módulo Sensores"
---

# Módulo Sensores

## Endpoints

### POST /sensores/crear
**Descripción**: Crea un nuevo sensor IoT en el sistema.

**URL completa:** `http://localhost:3000/sensores/crear`

**Request Body:**
```json
{
  "nombre": "Sensor Temperatura Surco 1",
  "surcoId": 1,
  "fecha_instalacion": "2024-01-15",
  "valor_minimo_alerta": 10.0,
  "valor_maximo_alerta": 35.0,
  "estado": "Activo",
  "topic": "agrotech/surco1/temperatura",
  "broker": {
    "nombre": "Broker Principal",
    "protocolo": "mqtt",
    "host": "192.168.1.100",
    "puerto": 1883,
    "usuario": "sensor_user",
    "password": "sensor_pass"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor \"Sensor Temperatura Surco 1\" creado.",
  "data": {
    "id": 1,
    "nombre": "Sensor Temperatura Surco 1",
    "surcoId": 1,
    "fecha_instalacion": "2024-01-15T00:00:00.000Z",
    "valor_minimo_alerta": 10.0,
    "valor_maximo_alerta": 35.0,
    "estado": "Activo",
    "topic": "agrotech/surco1/temperatura",
    "tipo_sensor": {
      "id": 1,
      "nombre": "Temperatura"
    },
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /sensores/listar
**Descripción**: Lista todos los sensores del sistema con sus relaciones.

**URL completa:** `http://localhost:3000/sensores/listar`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Sensor Temperatura Surco 1",
      "surcoId": 1,
      "fecha_instalacion": "2024-01-15T00:00:00.000Z",
      "valor_minimo_alerta": 10.0,
      "valor_maximo_alerta": 35.0,
      "estado": "Activo",
      "topic": "agrotech/surco1/temperatura",
      "surco": {
        "id": 1,
        "nombre": "Surco Norte",
        "lote": {
          "id": 1,
          "nombre": "Lote Principal"
        }
      },
      "tipo_sensor": {
        "id": 1,
        "nombre": "Temperatura"
      }
    }
  ]
}
```

### PUT /sensores/actualizar/:id
**Descripción**: Actualiza la información completa de un sensor.

**URL completa:** `http://localhost:3000/sensores/actualizar/:id`

**Parámetros URL:**
- `id` (number): ID del sensor

**Request Body:**
```json
{
  "nombre": "Sensor Temperatura Surco 1 - Actualizado",
  "valor_minimo_alerta": 8.0,
  "valor_maximo_alerta": 38.0,
  "topic": "agrotech/surco1/temp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor con ID 1 actualizado.",
  "data": {
    "id": 1,
    "nombre": "Sensor Temperatura Surco 1 - Actualizado",
    "valor_minimo_alerta": 8.0,
    "valor_maximo_alerta": 38.0,
    "topic": "agrotech/surco1/temp"
  }
}
```

### PATCH /sensores/actualizar/:id/estado
**Descripción**: Actualiza solo el estado de un sensor.

**URL completa:** `http://localhost:3000/sensores/actualizar/:id/estado`

**Parámetros URL:**
- `id` (number): ID del sensor

**Request Body:**
```json
{
  "estado": "Inactivo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "El estado del sensor se actualizó a \"Inactivo\"",
  "data": {
    "id": 1,
    "estado": "Inactivo"
  }
}
```

### DELETE /sensores/eliminar/:id
**Descripción**: Elimina un sensor del sistema.

**URL completa:** `http://localhost:3000/sensores/eliminar/:id`

**Parámetros URL:**
- `id` (number): ID del sensor

**Response:**
```json
{
  "success": true,
  "message": "Sensor con ID 1 eliminado correctamente."
}
```

## Entidad Sensor

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Sensor Temperatura Surco 1",
  "surcoId": 1,
  "fecha_instalacion": "2024-01-15T00:00:00.000Z",
  "valor_minimo_alerta": 10.0,
  "valor_maximo_alerta": 35.0,
  "estado": "Activo",
  "topic": "agrotech/surco1/temperatura",
  "surco": {
    "id": 1,
    "nombre": "Surco Norte",
    "lote": {
      "id": 1,
      "nombre": "Lote Principal"
    }
  },
  "tipo_sensor": {
    "id": 1,
    "nombre": "Temperatura"
  },
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

## Estados de Sensor

- **Activo**: Sensor funcionando normalmente
- **Inactivo**: Sensor temporalmente fuera de servicio
- **Mantenimiento**: Sensor en proceso de mantenimiento

## DTOs y Validaciones

### 📝 CreateSensoreDto
| Campo | Tipo | 🔒 Validaciones | ⚠️ Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `surcoId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `fecha_instalacion` | `string` | `@IsDateString, @IsNotEmpty` | - |
| `valor_minimo_alerta` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `valor_maximo_alerta` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `estado` | `string` | `@IsString, @IsOptional` | - |
| `topic` | `string` | `@IsString, @IsNotEmpty` | - |
| `broker` | `BrokerDto` | `@IsObject, @ValidateNested, @Type(() => BrokerDto), @IsOptional` | - |

### 📝 UpdateSensoreDto
| Campo | Tipo | 🔒 Validaciones | ⚠️ Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsOptional, @IsString` | - |
| `surcoId` | `number` | `@IsOptional, @IsNumber` | - |
| `fecha_instalacion` | `string` | `@IsOptional, @IsDateString` | - |
| `valor_minimo_alerta` | `number` | `@IsOptional, @IsNumber` | - |
| `valor_maximo_alerta` | `number` | `@IsOptional, @IsNumber` | - |
| `estado` | `string` | `@IsOptional, @IsString` | - |
| `topic` | `string` | `@IsOptional, @IsString` | - |

### 📝 UpdateSensoreEstadoDto
| Campo | Tipo | 🔒 Validaciones | ⚠️ Mensaje de Error |
|-------|------|----------------|-------------------|
| `estado` | `string` | `@IsString, @IsNotEmpty, @IsIn(['Activo', 'Inactivo', 'Mantenimiento'])` | - |

## Funcionalidades IoT

- **Monitoreo en Tiempo Real**: Sensores conectados via MQTT
- **Alertas Automáticas**: Notificaciones cuando valores exceden límites
- **Control de Estados**: Activación/desactivación remota
- **Asociación Espacial**: Vinculación con surcos y lotes específicos
- **Configuración Flexible**: Tópicos MQTT personalizables

## Tipos de Sensores Soportados

- **Temperatura**: Monitoreo de temperatura ambiente/suelo
- **Humedad**: Medición de humedad relativa
- **pH del Suelo**: Análisis químico del terreno
- **Luminosidad**: Intensidad de luz solar
- **Precipitación**: Medición de lluvia
- **Velocidad del Viento**: Condiciones atmosféricas

## Integración MQTT

Los sensores se conectan a brokers MQTT para transmisión de datos en tiempo real. Cada sensor tiene un tópico único para publicar lecturas y recibir comandos de control.