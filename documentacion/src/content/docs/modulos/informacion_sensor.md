---
title: "Módulo Información Sensor"
---

# Módulo Información Sensor

## Endpoints

### POST /informacion-sensor
**Descripción**: Crea un nuevo registro de sensor.

**URL completa:** `http://localhost:3000/informacion-sensor`

**Request Body:**
```json
{
  "sensorKey": "temperatura",
  "valor": 25.5,
  "unidad": "°C",
  "loteId": 1,
  "sensorId": 1,
  "tipo": "regular",
  "fechaRegistro": "2024-01-15T10:00:00.000Z"
}
```

**Response:**
```json
{
  "id": 1,
  "sensorKey": "temperatura",
  "valor": 25.5,
  "unidad": "°C",
  "lote": {
    "id": 1,
    "nombre": "Lote Principal"
  },
  "sensor": {
    "id": 1,
    "nombre": "Sensor de Temperatura"
  },
  "tipo": "regular",
  "fechaRegistro": "2024-01-15T10:00:00.000Z"
}
```

### GET /informacion-sensor
**Descripción**: Lista todos los registros de sensores.

**URL completa:** `http://localhost:3000/informacion-sensor`

**Response:**
```json
[
  {
    "id": 1,
    "sensorKey": "temperatura",
    "valor": 25.5,
    "unidad": "°C",
    "lote": {
      "id": 1,
      "nombre": "Lote Principal"
    },
    "sensor": {
      "id": 1,
      "nombre": "Sensor de Temperatura"
    },
    "tipo": "regular",
    "fechaRegistro": "2024-01-15T10:00:00.000Z"
  }
]
```

### GET /informacion-sensor/:id
**Descripción**: Obtiene un registro específico de sensor.

**URL completa:** `http://localhost:3000/informacion-sensor/:id`

**Parámetros URL:**
- `id` (number): ID del registro

**Response:**
```json
{
  "id": 1,
  "sensorKey": "temperatura",
  "valor": 25.5,
  "unidad": "°C",
  "lote": {
    "id": 1,
    "nombre": "Lote Principal"
  },
  "sensor": {
    "id": 1,
    "nombre": "Sensor de Temperatura"
  },
  "tipo": "regular",
  "fechaRegistro": "2024-01-15T10:00:00.000Z"
}
```

### PATCH /informacion-sensor/:id
**Descripción**: Actualiza un registro de sensor.

**URL completa:** `http://localhost:3000/informacion-sensor/:id`

**Parámetros URL:**
- `id` (number): ID del registro

**Request Body:**
```json
{
  "valor": 26.0,
  "tipo": "alerta"
}
```

**Response:**
```json
{
  "id": 1,
  "sensorKey": "temperatura",
  "valor": 26.0,
  "unidad": "°C",
  "lote": {
    "id": 1,
    "nombre": "Lote Principal"
  },
  "sensor": {
    "id": 1,
    "nombre": "Sensor de Temperatura"
  },
  "tipo": "alerta",
  "fechaRegistro": "2024-01-15T10:00:00.000Z"
}
```

### DELETE /informacion-sensor/:id
**Descripción**: Elimina un registro de sensor.

**URL completa:** `http://localhost:3000/informacion-sensor/:id`

**Parámetros URL:**
- `id` (number): ID del registro

**Response:**
```json
{
  "message": "Registro de sensor eliminado correctamente"
}
```

## Entidad InformacionSensor

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "sensorKey": "temperatura",
  "valor": 25.5,
  "unidad": "°C",
  "lote": {
    "id": 1,
    "nombre": "Lote Principal",
    "area": 1500.5
  },
  "sensor": {
    "id": 1,
    "nombre": "Sensor de Temperatura",
    "estado": "Activo",
    "valor_minimo_alerta": 10,
    "valor_maximo_alerta": 35
  },
  "tipo": "regular",
  "fechaRegistro": "2024-01-15T10:00:00.000Z"
}
```

## DTOs y Validaciones

### CreateInformacionSensorDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `sensorKey` | `string` | `@IsString, @IsNotEmpty` | - |
| `valor` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `unidad` | `string` | `@IsString, @IsOptional` | - |
| `loteId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `sensorId` | `number` | `@IsNumber, @IsOptional` | - |
| `tipo` | `string` | `@IsString, @IsOptional` | - |
| `fechaRegistro` | `string` | `@IsDateString, @IsOptional` | - |

### UpdateInformacionSensorDto
Extiende `CreateInformacionSensorDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Monitoreo IoT**: Recepción automática de datos MQTT
- **Alertas Inteligentes**: Detección automática de valores fuera de rango
- **Historial Temporal**: Registro cronológico de lecturas
- **Asociación con Lotes**: Vinculación geográfica de sensores

## Flujo de Trabajo

1. **Recepción**: Datos llegan vía MQTT desde sensores físicos
2. **Procesamiento**: Validación y conversión de unidades
3. **Almacenamiento**: Registro en base de datos con timestamp
4. **Notificación**: Alertas en tiempo real si es necesario

## Integración con Otros Módulos

- **MQTT**: Recepción de datos en tiempo real
- **Sensores**: Configuración y calibración de dispositivos
- **Lotes**: Asociación geográfica de lecturas
- **Trazabilidad**: Inclusión en análisis históricos