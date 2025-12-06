---
title: "Módulo MQTT Config"
---

# Módulo MQTT Config

## Endpoints

### POST /mqtt-config/brokers
**Descripción**: Crea un nuevo broker MQTT con configuración opcional de lote y tópicos.

**URL completa:** `http://localhost:3000/mqtt-config/brokers`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "nombre": "Broker Principal",
  "protocolo": "mqtt",
  "host": "broker.hivemq.com",
  "puerto": 1883,
  "usuario": "usuario",
  "password": "password",
  "loteId": 1,
  "prefijoTopicos": "agrotech/",
  "topicosAdicionales": [
    "temperatura",
    {"topic": "humedad", "min": 30, "max": 85}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Broker guardado.",
  "data": {
    "id": 1,
    "nombre": "Broker Principal",
    "protocolo": "mqtt",
    "host": "broker.hivemq.com",
    "puerto": 1883,
    "estado": "Activo",
    "brokerLotes": []
  }
}
```

### GET /mqtt-config/brokers
**Descripción**: Lista todos los brokers configurados.

**URL completa:** `http://localhost:3000/mqtt-config/brokers`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Broker Principal",
      "protocolo": "mqtt",
      "host": "broker.hivemq.com",
      "puerto": 1883,
      "estado": "Activo"
    }
  ]
}
```

### PUT /mqtt-config/brokers/:id
**Descripción**: Actualiza un broker existente.

**URL completa:** `http://localhost:3000/mqtt-config/brokers/:id`

**Parámetros URL:**
- `id` (number): ID del broker

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "nombre": "Broker Actualizado",
  "host": "nuevo.host.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Broker actualizado.",
  "data": { ... }
}
```

### DELETE /mqtt-config/brokers/:id
**Descripción**: Elimina un broker y todas sus dependencias.

**URL completa:** `http://localhost:3000/mqtt-config/brokers/:id`

**Parámetros URL:**
- `id` (number): ID del broker

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Broker eliminado."
}
```

### PUT /mqtt-config/brokers/:id/estado
**Descripción**: Cambia el estado de un broker (Activo/Inactivo).

**URL completa:** `http://localhost:3000/mqtt-config/brokers/:id/estado`

**Parámetros URL:**
- `id` (number): ID del broker

**Headers:**
```
Authorization: Bearer <jwt_token>
```

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
  "message": "Estado del broker actualizado.",
  "data": { ... }
}
```

### POST /mqtt-config/brokers/test-connection
**Descripción**: Prueba la conexión a un broker MQTT.

**URL completa:** `http://localhost:3000/mqtt-config/brokers/test-connection`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "nombre": "Test Broker",
  "protocolo": "mqtt",
  "host": "broker.hivemq.com",
  "puerto": 1883,
  "usuario": "usuario",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conexión exitosa al broker MQTT.",
  "connected": true
}
```

### POST /mqtt-config/subscripciones
**Descripción**: Crea una nueva subscripción a un tópico.

**URL completa:** `http://localhost:3000/mqtt-config/subscripciones`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "brokerId": 1,
  "topic": "agrotech/temperatura",
  "qos": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tópico guardado.",
  "data": {
    "id": 1,
    "topic": "agrotech/temperatura",
    "qos": 0
  }
}
```

### DELETE /mqtt-config/subscripciones/:id
**Descripción**: Elimina una subscripción.

**URL completa:** `http://localhost:3000/mqtt-config/subscripciones/:id`

**Parámetros URL:**
- `id` (number): ID de la subscripción

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Tópico eliminado."
}
```

### POST /mqtt-config/broker-lotes
**Descripción**: Crea una configuración Broker-Lote con tópicos y genera sensores automáticamente.

**URL completa:** `http://localhost:3000/mqtt-config/broker-lotes`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "brokerId": 1,
  "loteId": 1,
  "topicos": [
    "temperatura",
    {"topic": "humedad", "min": 30, "max": 85}
  ],
  "puerto": 1883,
  "topicPrueba": "test/topic"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuración Broker-Lote creada y sensores generados.",
  "data": {
    "id": 1,
    "broker": { ... },
    "lote": { ... },
    "topicos": ["temperatura", "humedad"],
    "puerto": 1883,
    "topicPrueba": "test/topic"
  }
}
```

### GET /mqtt-config/broker-lotes/lote/:loteId
**Descripción**: Obtiene configuraciones Broker-Lote por lote.

**URL completa:** `http://localhost:3000/mqtt-config/broker-lotes/lote/:loteId`

**Parámetros URL:**
- `loteId` (number): ID del lote

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "broker": { ... },
      "lote": { ... },
      "topicos": ["temperatura", "humedad"],
      "puerto": 1883
    }
  ]
}
```

### GET /mqtt-config/broker-lotes/broker/:brokerId
**Descripción**: Obtiene configuraciones Broker-Lote por broker.

**URL completa:** `http://localhost:3000/mqtt-config/broker-lotes/broker/:brokerId`

**Parámetros URL:**
- `brokerId` (number): ID del broker

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ]
}
```

### PUT /mqtt-config/broker-lotes/:id
**Descripción**: Actualiza una configuración Broker-Lote.

**URL completa:** `http://localhost:3000/mqtt-config/broker-lotes/:id`

**Parámetros URL:**
- `id` (number): ID de la configuración

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "topicos": [
    "temperatura",
    {"topic": "humedad", "min": 20, "max": 90},
    "luz"
  ],
  "puerto": 1884
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuración Broker-Lote actualizada.",
  "data": { ... }
}
```

### DELETE /mqtt-config/broker-lotes/:id
**Descripción**: Elimina una configuración Broker-Lote.

**URL completa:** `http://localhost:3000/mqtt-config/broker-lotes/:id`

**Parámetros URL:**
- `id` (number): ID de la configuración

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Configuración Broker-Lote eliminada."
}
```

### POST /mqtt-config/broker-lotes/test-connection
**Descripción**: Prueba la conexión y tópicos de una configuración Broker-Lote.

**URL completa:** `http://localhost:3000/mqtt-config/broker-lotes/test-connection`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "brokerId": 1,
  "puerto": 1883,
  "topicos": ["temperatura", "humedad"],
  "topicPrueba": "test/topic"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conexión exitosa. 2/2 tópicos disponibles. Datos del sensor recibido en: temperatura, humedad.",
  "connected": true,
  "topicsAvailable": ["temperatura", "humedad"],
  "jsonReceived": ["temperatura", "humedad"],
  "activeTopicsCount": 2,
  "topicPruebaReceived": true
}
```

## Entidad Broker

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Broker Principal",
  "protocolo": "mqtt",
  "host": "broker.hivemq.com",
  "puerto": 1883,
  "usuario": "usuario",
  "password": "password",
  "prefijoTopicos": "agrotech/",
  "estado": "Activo",
  "umbrales": {
    "temperatura": { "minimo": 10, "maximo": 35 },
    "humedad": { "minimo": 30, "maximo": 85 }
  },
  "sslConfig": {
    "enabled": false,
    "rejectUnauthorized": true
  },
  "brokerLotes": [
    {
      "id": 1,
      "lote": {
        "id": 1,
        "nombre": "Lote Principal"
      },
      "topicos": ["temperatura", "humedad"],
      "puerto": 1883
    }
  ],
  "subscripciones": [
    {
      "id": 1,
      "topic": "agrotech/temperatura",
      "qos": 0
    }
  ]
}
```

## Entidad BrokerLote

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "broker": {
    "id": 1,
    "nombre": "Broker Principal",
    "protocolo": "mqtt",
    "host": "broker.hivemq.com",
    "puerto": 1883,
    "estado": "Activo"
  },
  "lote": {
    "id": 1,
    "nombre": "Lote Principal",
    "area": 1500.5
  },
  "topicos": ["temperatura", "humedad", "luz"],
  "puerto": 1883,
  "topicPrueba": "test/topic",
  "isActive": true
}
```

## Entidad Subscripcion

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "topic": "agrotech/temperatura",
  "qos": 0,
  "broker": {
    "id": 1,
    "nombre": "Broker Principal"
  }
}
```

## Estados de Broker

- **Activo**: Broker operativo y recibiendo datos
- **Inactivo**: Broker desconectado y sin recibir datos

## DTOs y Validaciones

### CreateBrokerDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `protocolo` | `string` | `@IsString, @IsNotEmpty` | - |
| `host` | `string` | `@IsString, @IsNotEmpty` | - |
| `puerto` | `number` | `@IsInt, @Min(1), @Max(65535)` | - |
| `usuario` | `string` | `@IsString, @IsOptional` | - |
| `password` | `string` | `@IsString, @IsOptional` | - |
| `loteId` | `number` | `@IsInt, @IsNotEmpty` | - |
| `prefijoTopicos` | `string` | `@IsString, @IsOptional` | - |
| `topicosAdicionales` | `(string \| TopicoConfigDto)[]` | `@IsArray, @IsOptional, @IsValidTopico` | Cada tópico debe ser un string o un objeto con topic (string requerido) y min/max (números opcionales >= 0) |

### TopicoConfigDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `topic` | `string` | `@IsString, @IsNotEmpty` | - |
| `min` | `number` | `@IsInt, @IsOptional, @Min(0)` | - |
| `max` | `number` | `@IsInt, @IsOptional, @Min(0)` | - |

### CreateBrokerLoteDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `brokerId` | `number` | `@IsNotEmpty, @IsNumber` | - |
| `loteId` | `number` | `@IsNotEmpty, @IsNumber` | - |
| `topicos` | `(string \| TopicoConfigDto)[]` | `@IsArray, @IsNotEmpty, @ValidateNested` | - |
| `puerto` | `number` | `@IsOptional, @IsNumber` | - |
| `topicPrueba` | `string` | `@IsOptional, @IsString` | - |

### CreateSubscripcionDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `brokerId` | `number` | `@IsInt, @IsNotEmpty` | - |
| `topic` | `string` | `@IsString, @IsNotEmpty` | - |
| `qos` | `number` | `@IsInt, @Min(0), @Max(2)` | - |

### UpdateMqttConfigDto
Extiende `CreateBrokerDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Configuración Multi-Protocolo**: Soporte para MQTT, MQTTS, HTTP, HTTPS, WS, WSS
- **Gestión de Tópicos Dinámicos**: Configuración personalizada de tópicos con umbrales
- **Creación Automática de Sensores**: Generación automática de sensores basada en tópicos
- **Pruebas de Conexión**: Verificación de conectividad y disponibilidad de tópicos
- **Gestión de Subscripciones**: Control de QoS y tópicos suscritos
- **Configuración SSL/TLS**: Soporte para conexiones seguras

## Flujo de Trabajo

1. **Configuración del Broker**: Crear broker con protocolo, host y credenciales
2. **Configuración por Lote**: Asignar broker a lote específico con tópicos
3. **Generación de Sensores**: Creación automática de sensores para cada tópico
4. **Pruebas de Conexión**: Verificar conectividad y recepción de datos
5. **Monitoreo**: Recibir datos en tiempo real a través del módulo MQTT

## Integración con Otros Módulos

- **Sensores**: Creación automática de sensores basada en configuración MQTT
- **Información Sensor**: Almacenamiento de lecturas MQTT procesadas
- **Lotes**: Asociación de brokers con lotes específicos
- **MQTT**: Procesamiento y emisión de datos MQTT en tiempo real