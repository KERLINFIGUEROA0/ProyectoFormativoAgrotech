---
title: "Módulo EPA"
---

# Módulo EPA

## Endpoints

### POST /epa
**Descripción**: Crea un nuevo producto fitosanitario (EPA).

**URL completa:** `http://localhost:3000/epa`

**Request Body:**
```json
{
  "nombre": "Fungicida X",
  "tipo": "Fungicida",
  "concentracion": "500g/L",
  "principioActivo": "Tebuconazole",
  "fabricante": "AgroChem S.A.",
  "registroIca": "12345-ABC"
}
```

**Response:**
```json
{
  "id": 1,
  "nombre": "Fungicida X",
  "tipo": "Fungicida",
  "concentracion": "500g/L",
  "principioActivo": "Tebuconazole",
  "fabricante": "AgroChem S.A.",
  "registroIca": "12345-ABC"
}
```

### GET /epa
**Descripción**: Lista todos los productos EPA registrados.

**URL completa:** `http://localhost:3000/epa`

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Fungicida X",
    "tipo": "Fungicida",
    "concentracion": "500g/L",
    "principioActivo": "Tebuconazole",
    "fabricante": "AgroChem S.A.",
    "registroIca": "12345-ABC"
  }
]
```

### GET /epa/:id
**Descripción**: Obtiene un producto EPA específico.

**URL completa:** `http://localhost:3000/epa/:id`

**Parámetros URL:**
- `id` (number): ID del EPA

**Response:**
```json
{
  "id": 1,
  "nombre": "Fungicida X",
  "tipo": "Fungicida",
  "concentracion": "500g/L",
  "principioActivo": "Tebuconazole",
  "fabricante": "AgroChem S.A.",
  "registroIca": "12345-ABC"
}
```

### PATCH /epa/:id
**Descripción**: Actualiza un producto EPA.

**URL completa:** `http://localhost:3000/epa/:id`

**Parámetros URL:**
- `id` (number): ID del EPA

**Request Body:**
```json
{
  "concentracion": "600g/L",
  "principioActivo": "Tebuconazole actualizado"
}
```

**Response:**
```json
{
  "id": 1,
  "nombre": "Fungicida X",
  "tipo": "Fungicida",
  "concentracion": "600g/L",
  "principioActivo": "Tebuconazole actualizado",
  "fabricante": "AgroChem S.A.",
  "registroIca": "12345-ABC"
}
```

### DELETE /epa/:id
**Descripción**: Elimina un producto EPA.

**URL completa:** `http://localhost:3000/epa/:id`

**Parámetros URL:**
- `id` (number): ID del EPA

**Response:**
```json
{
  "message": "Producto EPA eliminado correctamente"
}
```

## Entidad Epa

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Fungicida X",
  "tipo": "Fungicida",
  "concentracion": "500g/L",
  "principioActivo": "Tebuconazole",
  "fabricante": "AgroChem S.A.",
  "registroIca": "12345-ABC",
  "cultivosEpa": [
    {
      "id": 1,
      "cultivoId": 1,
      "dosis": 2.5,
      "unidad": "L/ha",
      "cultivo": {
        "id": 1,
        "nombre": "Tomates cherry"
      }
    }
  ],
  "epaTratamientos": [
    {
      "id": 1,
      "cultivoId": 1,
      "dosisAplicada": 2.5,
      "fechaAplicacion": "2024-01-20T00:00:00.000Z",
      "motivo": "Prevención de hongos"
    }
  ]
}
```

## DTOs y Validaciones

### CreateEpaDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `tipo` | `string` | `@IsString, @IsOptional` | - |
| `concentracion` | `string` | `@IsString, @IsOptional` | - |
| `principioActivo` | `string` | `@IsString, @IsOptional` | - |
| `fabricante` | `string` | `@IsString, @IsOptional` | - |
| `registroIca` | `string` | `@IsString, @IsOptional` | - |

### UpdateEpaDto
Extiende `CreateEpaDto` con todos los campos opcionales.

## Funcionalidades Avanzadas

- **Catálogo de Productos**: Registro completo de productos fitosanitarios
- **Información Técnica**: Principios activos, concentraciones y fabricantes
- **Registro ICA**: Control de productos autorizados
- **Clasificación por Tipo**: Fungicidas, insecticidas, herbicidas, etc.

## Flujo de Trabajo

1. **Registro**: Ingresar información completa del producto EPA
2. **Validación**: Verificar registro ICA y datos técnicos
3. **Almacenamiento**: Guardar en catálogo para uso en tratamientos

## Integración con Otros Módulos

- **Cultivos EPA**: Asociación con cultivos y dosis recomendadas
- **EPA Tratamiento**: Registro de aplicaciones reales
- **Materiales**: Posible integración con inventario de productos