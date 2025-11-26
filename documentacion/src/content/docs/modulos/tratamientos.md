---
title: "Módulo Tratamientos"
---

# Módulo Tratamientos

## Endpoints

### POST /tratamientos
**Descripción**: Crea un nuevo tratamiento fitosanitario.

**URL completa:** `http://localhost:3000/tratamientos`

**Request Body:**
```json
{
  "descripcion": "Aplicación de fungicida preventivo",
  "fechaInicio": "2024-01-15T08:00:00.000Z",
  "fechaFinal": "2024-01-15T12:00:00.000Z",
  "tipo": "Fungicida",
  "estado": "Planificado",
  "cultivoId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tratamiento creado exitosamente",
  "data": {
    "id": 1,
    "descripcion": "Aplicación de fungicida preventivo",
    "fechaInicio": "2024-01-15T08:00:00.000Z",
    "fechaFinal": "2024-01-15T12:00:00.000Z",
    "tipo": "Fungicida",
    "estado": "Planificado",
    "cultivoId": 1,
    "created_at": "2024-01-14T10:30:00.000Z"
  }
}
```

### GET /tratamientos
**Descripción**: Lista todos los tratamientos del sistema.

**URL completa:** `http://localhost:3000/tratamientos`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "descripcion": "Aplicación de fungicida preventivo",
      "fechaInicio": "2024-01-15T08:00:00.000Z",
      "fechaFinal": "2024-01-15T12:00:00.000Z",
      "tipo": "Fungicida",
      "estado": "Completado",
      "cultivo": {
        "id": 1,
        "nombre": "Tomates cherry",
        "lote": {
          "nombre": "Lote Principal"
        }
      },
      "epaTratamientos": [
        {
          "epa": {
            "nombre": "Mildiu",
            "tipoEnfermedad": "Fúngica"
          }
        }
      ]
    }
  ]
}
```

### GET /tratamientos/:id
**Descripción**: Obtiene un tratamiento específico por ID.

**URL completa:** `http://localhost:3000/tratamientos/:id`

**Parámetros URL:**
- `id` (number): ID del tratamiento

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "descripcion": "Aplicación de fungicida preventivo",
    "fechaInicio": "2024-01-15T08:00:00.000Z",
    "fechaFinal": "2024-01-15T12:00:00.000Z",
    "tipo": "Fungicida",
    "estado": "Completado",
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry",
      "estado": "Activo"
    },
    "epaTratamientos": [...],
    "created_at": "2024-01-14T10:30:00.000Z",
    "updated_at": "2024-01-15T14:00:00.000Z"
  }
}
```

### PATCH /tratamientos/:id
**Descripción**: Actualiza un tratamiento existente.

**URL completa:** `http://localhost:3000/tratamientos/:id`

**Parámetros URL:**
- `id` (number): ID del tratamiento

**Request Body:**
```json
{
  "descripcion": "Aplicación de fungicida preventivo - Actualizado",
  "estado": "En Curso",
  "fechaFinal": "2024-01-15T14:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tratamiento actualizado exitosamente",
  "data": {
    "id": 1,
    "descripcion": "Aplicación de fungicida preventivo - Actualizado",
    "estado": "En Curso",
    "fechaFinal": "2024-01-15T14:00:00.000Z"
  }
}
```

### DELETE /tratamientos/:id
**Descripción**: Elimina un tratamiento del sistema.

**URL completa:** `http://localhost:3000/tratamientos/:id`

**Parámetros URL:**
- `id` (number): ID del tratamiento

**Response:**
```json
{
  "success": true,
  "message": "Tratamiento eliminado exitosamente"
}
```

## Entidad Tratamiento

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "descripcion": "Aplicación de fungicida preventivo contra mildiu",
  "fechaInicio": "2024-01-15T08:00:00.000Z",
  "fechaFinal": "2024-01-15T12:00:00.000Z",
  "tipo": "Fungicida",
  "estado": "Completado",
  "cultivoId": 1,
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry",
    "tipoCultivo": {
      "nombre": "Hortaliza"
    },
    "lote": {
      "id": 1,
      "nombre": "Lote Principal",
      "area": 1500.5
    }
  },
  "epaTratamientos": [
    {
      "id": 1,
      "epa": {
        "id": 1,
        "nombre": "Mildiu",
        "tipoEnfermedad": "Fúngica",
        "descripcion": "Enfermedad fúngica común en tomates"
      }
    }
  ],
  "created_at": "2024-01-14T10:30:00.000Z",
  "updated_at": "2024-01-15T14:00:00.000Z"
}
```

## Estados de Tratamiento

- **Planificado**: Tratamiento programado pero no iniciado
- **En Curso**: Tratamiento en ejecución
- **Completado**: Tratamiento finalizado exitosamente
- **Cancelado**: Tratamiento cancelado

## Tipos de Tratamiento

- **Fungicida**: Contra enfermedades fúngicas
- **Insecticida**: Contra insectos plaga
- **Herbicida**: Contra malezas
- **Fertilizante**: Para nutrición de cultivos
- **Bactericida**: Contra enfermedades bacterianas
- **Acaricida**: Contra ácaros

## DTOs y Validaciones

### 📝 CreateTratamientoDto
| Campo | Tipo | 🔒 Validaciones | ⚠️ Mensaje de Error |
|-------|------|----------------|-------------------|
| `descripcion` | `string` | `@IsOptional, @IsString` | - |
| `fechaInicio` | `Date` | `@Type(() => Date), @IsDate` | - |
| `fechaFinal` | `Date` | `@Type(() => Date), @IsDate, @IsOptional` | - |
| `tipo` | `string` | `@IsString, @IsNotEmpty` | - |
| `estado` | `string` | `@IsOptional, @IsString, @IsIn(['Planificado', 'En Curso', 'Finalizado'])` | - |
| `cultivoId` | `number` | `@IsOptional, @IsNumber` | - |

### 📝 UpdateTratamientoDto
| Campo | Tipo | 🔒 Validaciones | ⚠️ Mensaje de Error |
|-------|------|----------------|-------------------|
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `fechaInicio` | `Date` | `@Type(() => Date), @IsDate, @IsOptional` | - |
| `fechaFinal` | `Date` | `@Type(() => Date), @IsDate, @IsOptional` | - |
| `tipo` | `string` | `@IsString, @IsOptional` | - |
| `estado` | `string` | `@IsString, @IsOptional, @IsIn(['Planificado', 'En Curso', 'Finalizado'])` | - |
| `cultivoId` | `number` | `@IsOptional, @IsNumber` | - |

## Funcionalidades del Sistema Fitosanitario

- **Prevención**: Tratamientos preventivos antes de aparición de síntomas
- **Curación**: Tratamientos correctivos una vez detectados los problemas
- **Monitoreo**: Seguimiento del estado de tratamientos aplicados
- **Historial**: Registro completo de intervenciones fitosanitarias
- **Asociación EPA**: Vinculación con problemas de salud vegetal diagnosticados

## Ciclo de Tratamiento

1. **Diagnóstico**: Identificación del problema fitosanitario (EPA)
2. **Planificación**: Diseño del tratamiento adecuado
3. **Aplicación**: Ejecución del tratamiento en campo
4. **Seguimiento**: Monitoreo de efectividad
5. **Evaluación**: Análisis de resultados y ajustes futuros

## Integración con Otros Módulos

- **EPA**: Problemas fitosanitarios que requieren tratamiento
- **Cultivos**: Plantaciones que reciben los tratamientos
- **Materiales**: Productos fitosanitarios utilizados
- **Actividades**: Registro de aplicación de tratamientos
- **Sensores**: Monitoreo de efectividad de tratamientos