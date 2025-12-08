---
title: "Módulo EPA Tratamiento"
---

# Módulo EPA Tratamiento

## Endpoints

### POST /epa-tratamiento
**Descripción**: Crea un nuevo tratamiento con EPA para un cultivo.

**URL completa:** `http://localhost:3000/epa-tratamiento`

**Request Body:**
```json
{
  "cultivoId": 1,
  "epaId": 1,
  "dosisAplicada": 2.5,
  "unidad": "L/ha",
  "fechaAplicacion": "2024-01-20",
  "motivo": "Prevención de hongos"
}
```

**Response:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosisAplicada": 2.5,
  "unidad": "L/ha",
  "fechaAplicacion": "2024-01-20T00:00:00.000Z",
  "motivo": "Prevención de hongos",
  "cultivo": { "id": 1, "nombre": "Tomates cherry" },
  "epa": { "id": 1, "nombre": "Fungicida X" }
}
```

### GET /epa-tratamiento
**Descripción**: Lista todos los tratamientos EPA aplicados.

**URL completa:** `http://localhost:3000/epa-tratamiento`

**Response:**
```json
[
  {
    "id": 1,
    "cultivoId": 1,
    "epaId": 1,
    "dosisAplicada": 2.5,
    "unidad": "L/ha",
    "fechaAplicacion": "2024-01-20T00:00:00.000Z",
    "motivo": "Prevención de hongos",
    "cultivo": { "id": 1, "nombre": "Tomates cherry" },
    "epa": { "id": 1, "nombre": "Fungicida X" }
  }
]
```

### GET /epa-tratamiento/:id
**Descripción**: Obtiene un tratamiento EPA específico.

**URL completa:** `http://localhost:3000/epa-tratamiento/:id`

**Parámetros URL:**
- `id` (number): ID del tratamiento

**Response:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosisAplicada": 2.5,
  "unidad": "L/ha",
  "fechaAplicacion": "2024-01-20T00:00:00.000Z",
  "motivo": "Prevención de hongos",
  "cultivo": { "id": 1, "nombre": "Tomates cherry" },
  "epa": { "id": 1, "nombre": "Fungicida X" }
}
```

### PATCH /epa-tratamiento/:id
**Descripción**: Actualiza un tratamiento EPA.

**URL completa:** `http://localhost:3000/epa-tratamiento/:id`

**Parámetros URL:**
- `id` (number): ID del tratamiento

**Request Body:**
```json
{
  "dosisAplicada": 3.0,
  "motivo": "Tratamiento preventivo actualizado"
}
```

**Response:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosisAplicada": 3.0,
  "unidad": "L/ha",
  "fechaAplicacion": "2024-01-20T00:00:00.000Z",
  "motivo": "Tratamiento preventivo actualizado",
  "cultivo": { "id": 1, "nombre": "Tomates cherry" },
  "epa": { "id": 1, "nombre": "Fungicida X" }
}
```

### DELETE /epa-tratamiento/:id
**Descripción**: Elimina un tratamiento EPA.

**URL completa:** `http://localhost:3000/epa-tratamiento/:id`

**Parámetros URL:**
- `id` (number): ID del tratamiento

**Response:**
```json
{
  "message": "Tratamiento EPA eliminado correctamente"
}
```

## Entidad EpaTratamiento

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "cultivoId": 1,
  "epaId": 1,
  "dosisAplicada": 2.5,
  "unidad": "L/ha",
  "fechaAplicacion": "2024-01-20T00:00:00.000Z",
  "motivo": "Prevención de hongos",
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry",
    "estado": "Activo",
    "tipoCultivo": {
      "id": 1,
      "nombre": "Hortaliza"
    }
  },
  "epa": {
    "id": 1,
    "nombre": "Fungicida X",
    "tipo": "Fungicida",
    "concentracion": "500g/L"
  }
}
```

## DTOs y Validaciones

### CreateEpaTratamientoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `cultivoId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `epaId` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `dosisAplicada` | `number` | `@IsNumber, @IsOptional` | - |
| `unidad` | `string` | `@IsString, @IsOptional` | - |
| `fechaAplicacion` | `string` | `@IsDateString, @IsOptional` | - |
| `motivo` | `string` | `@IsString, @IsOptional` | - |

### UpdateEpaTratamientoDto
Extiende `CreateEpaTratamientoDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Registro de Aplicaciones**: Historial de tratamientos fitosanitarios
- **Control de Dosis**: Seguimiento de cantidades aplicadas
- **Registro Temporal**: Fechas de aplicación y motivos
- **Trazabilidad**: Vinculación con cultivos específicos

## Flujo de Trabajo

1. **Planificación**: Definir tratamiento necesario para cultivo
2. **Aplicación**: Registrar dosis, fecha y motivo del tratamiento
3. **Registro**: Almacenar tratamiento para seguimiento histórico

## Integración con Otros Módulos

- **Cultivos**: Asociación con cultivos tratados
- **EPA**: Referencia a productos aplicados
- **Cultivos EPA**: Validación de dosis recomendadas
- **Trazabilidad**: Inclusión en historial del cultivo