---
title: "Módulo Tipo Sensor"
---

# Módulo Tipo Sensor

## Endpoints

### POST /tipo-sensor/crear
**Descripción**: Crea un nuevo tipo de sensor.

**URL completa:** `http://localhost:3000/tipo-sensor/crear`

**Request Body:**
```json
{
  "nombre": "Temperatura"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tipo de sensor \"Temperatura\" creado con éxito.",
  "data": {
    "id": 1,
    "nombre": "Temperatura"
  }
}
```

### GET /tipo-sensor/listar
**Descripción**: Lista todos los tipos de sensor.

**URL completa:** `http://localhost:3000/tipo-sensor/listar`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Temperatura"
    },
    {
      "id": 2,
      "nombre": "Humedad"
    }
  ]
}
```

### GET /tipo-sensor/:id
**Descripción**: Obtiene un tipo de sensor específico por ID.

**URL completa:** `http://localhost:3000/tipo-sensor/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de sensor

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Temperatura"
  }
}
```

### PATCH /tipo-sensor/actualizar/:id
**Descripción**: Actualiza un tipo de sensor existente.

**URL completa:** `http://localhost:3000/tipo-sensor/actualizar/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de sensor

**Request Body:**
```json
{
  "nombre": "Temperatura Ambiental"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tipo de sensor con ID 1 actualizado.",
  "data": {
    "id": 1,
    "nombre": "Temperatura Ambiental"
  }
}
```

### DELETE /tipo-sensor/eliminar/:id
**Descripción**: Elimina un tipo de sensor.

**URL completa:** `http://localhost:3000/tipo-sensor/eliminar/:id`

**Parámetros URL:**
- `id` (number): ID del tipo de sensor

**Response:**
```json
{
  "success": true,
  "message": "Tipo de sensor con ID 1 eliminado."
}
```

## Entidad TipoSensor

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Temperatura"
}
```

## DTOs y Validaciones

### CreateTipoSensorDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty, @MaxLength(100)` | El nombre del tipo de sensor es obligatorio. |

### UpdateTipoSensorDto
Extiende `CreateTipoSensorDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Categorización de Sensores**: Clasificación de dispositivos IoT por tipo
- **Validación de Nombres**: Control de unicidad y formato de nombres
- **Gestión Simplificada**: Operaciones CRUD básicas para mantenimiento

## Flujo de Trabajo

1. **Definición**: Crear tipos de sensor según necesidades del sistema
2. **Clasificación**: Asignar sensores a categorías específicas
3. **Mantenimiento**: Actualizar o eliminar tipos según evolución del sistema

## Integración con Otros Módulos

- **Sensores**: Clasificación de sensores por tipo (aunque actualmente no hay relación directa)
- **Información Sensor**: Categorización de datos por tipo de sensor
- **MQTT Config**: Configuración de tópicos por tipo de medición