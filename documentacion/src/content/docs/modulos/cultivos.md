---
title: "Módulo Cultivos"
---

# Módulo Cultivos

## Endpoints

### POST /cultivos/crear
**Descripción**: Crea un nuevo cultivo.

**URL completa:** `http://localhost:3000/cultivos/crear`

**Request Body:**
```json
{
  "nombre": "Tomate cherry",
  "cantidad": 100,
  "img": "uploads/cultivos-pic/tomate.jpg",
  "descripcion": "Cultivo de tomate cherry orgánico",
  "tipoCultivoId": 1,
  "Estado": "Activo",
  "Fecha_Plantado": "2024-01-15T08:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cultivo \"Tomate cherry\" creado exitosamente.",
  "data": {
    "id": 1,
    "nombre": "Tomate cherry",
    "cantidad": 100,
    "img": "uploads/cultivos-pic/tomate.jpg",
    "descripcion": "Cultivo de tomate cherry orgánico",
    "Estado": "Activo",
    "Fecha_Plantado": "2024-01-15T08:00:00.000Z",
    "tipoCultivoId": 1
  }
}
```

### GET /cultivos/listar
**Descripción**: Lista todos los cultivos con sus tipos relacionados.

**URL completa:** `http://localhost:3000/cultivos/listar`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Tomate cherry",
      "cantidad": 100,
      "img": "uploads/cultivos-pic/tomate.jpg",
      "descripcion": "Cultivo de tomate cherry orgánico",
      "Estado": "Activo",
      "Fecha_Plantado": "2024-01-15T08:00:00.000Z",
      "tipoCultivo": {
        "id": 1,
        "nombre": "Hortalizas"
      }
    },
    {
      "id": 2,
      "nombre": "Lechuga romana",
      "cantidad": 50,
      "img": null,
      "descripcion": "Cultivo de lechuga",
      "Estado": "Activo",
      "Fecha_Plantado": "2024-01-20T09:00:00.000Z",
      "tipoCultivo": {
        "id": 1,
        "nombre": "Hortalizas"
      }
    }
  ]
}
```

### GET /cultivos/:id
**Descripción**: Obtiene un cultivo específico por ID.

**URL completa:** `http://localhost:3000/cultivos/:id`

**Parámetros URL**:
- `id` (number): ID del cultivo

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Tomate cherry",
    "cantidad": 100,
    "img": "uploads/cultivos-pic/tomate.jpg",
    "descripcion": "Cultivo de tomate cherry orgánico",
    "Estado": "Activo",
    "Fecha_Plantado": "2024-01-15T08:00:00.000Z",
    "tipoCultivo": {
      "id": 1,
      "nombre": "Hortalizas"
    },
    "producciones": [
      {
        "id": 1,
        "cantidad": 80,
        "fecha": "2024-02-01T10:00:00.000Z",
        "estado": "Cosechado"
      }
    ]
  }
}
```

### PUT /cultivos/actualizar/:id
**Descripción**: Actualiza un cultivo existente.

**URL completa:** `http://localhost:3000/cultivos/actualizar/:id`

**Parámetros URL**:
- `id` (number): ID del cultivo

**Request Body:**
```json
{
  "nombre": "Tomate cherry premium",
  "cantidad": 120,
  "descripcion": "Cultivo de tomate cherry orgánico premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cultivo con ID 1 actualizado correctamente.",
  "data": {
    "id": 1,
    "nombre": "Tomate cherry premium",
    "cantidad": 120,
    "img": "uploads/cultivos-pic/tomate.jpg",
    "descripcion": "Cultivo de tomate cherry orgánico premium",
    "Estado": "Activo",
    "Fecha_Plantado": "2024-01-15T08:00:00.000Z",
    "tipoCultivoId": 1
  }
}
```

### DELETE /cultivos/eliminar/:id
**Descripción**: Elimina un cultivo por ID.

**URL completa:** `http://localhost:3000/cultivos/eliminar/:id`

**Parámetros URL**:
- `id` (number): ID del cultivo

**Response:**
```json
{
  "success": true,
  "message": "Cultivo \"Tomate cherry\" eliminado correctamente."
}
```

### POST /cultivos/:id/imagen
**Descripción**: Sube una imagen para un cultivo específico.

**URL completa:** `http://localhost:3000/cultivos/:id/imagen`

**Parámetros URL**:
- `id` (number): ID del cultivo

**Request Body (form-data):**
```
file: [Archivo de imagen]
```

**Response:**
```json
{
  "success": true,
  "message": "Imagen del cultivo actualizada.",
  "data": {
    "id": 1,
    "nombre": "Tomate cherry",
    "img": "uploads/cultivos-pic/tomate-1643723400000.jpg"
  }
}
```

### GET /cultivos/:id/exportar-excel
**Descripción**: Exporta un reporte Excel detallado de un cultivo específico.

**URL completa:** `http://localhost:3000/cultivos/:id/exportar-excel`

**Parámetros URL**:
- `id` (number): ID del cultivo

**Response:** Archivo Excel descargado con nombre `cultivo-1-reporte.xlsx`

### GET /cultivos/exportar-excel/general
**Descripción**: Exporta un reporte Excel general de todos los cultivos con estadísticas.

**URL completa:** `http://localhost:3000/cultivos/exportar-excel/general`

**Response:** Archivo Excel descargado con nombre `cultivos-general-reporte.xlsx`

## Entidad Cultivo

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Tomate cherry",
  "cantidad": 100,
  "img": "uploads/cultivos-pic/tomate.jpg",
  "descripcion": "Cultivo de tomate cherry orgánico",
  "Estado": "Activo",
  "Fecha_Plantado": "2024-01-15T08:00:00.000Z",
  "tipoCultivo": {
    "id": 1,
    "nombre": "Hortalizas"
  },
  "actividades": [
    {
      "id": 1,
      "titulo": "Riego semanal",
      "fecha": "2024-01-20T07:00:00.000Z"
    }
  ],
  "producciones": [
    {
      "id": 1,
      "cantidad": 80,
      "fecha": "2024-02-01T10:00:00.000Z",
      "estado": "Cosechado"
    }
  ],
  "surcos": [
    {
      "id": 1,
      "numero": 1,
      "cultivoId": 1
    }
  ],
  "cultivosEpa": [],
  "gastos": [
    {
      "id": 1,
      "descripcion": "Fertilizante orgánico",
      "monto": 75000,
      "fecha": "2024-01-10"
    }
  ]
}
```

## DTOs y Validaciones

###  CreateCultivoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty` | - |
| `cantidad` | `number` | `@IsInt` | - |
| `img` | `string` | `@IsString, @IsOptional` | - |
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `tipoCultivoId` | `number` | `@IsInt, @IsNotEmpty` | - |
| `Estado` | `string` | `@IsString, @IsOptional` | - |
| `Fecha_Plantado` | `string` | `@IsDateString, @IsOptional` | - |

### UpdateCultivoDto
Similar a CreateCultivoDto, con campos opcionales.

## Funcionalidades Adicionales

- **Exportación Excel**: Genera reportes con múltiples hojas incluyendo información general, producciones, ventas y gastos
- **Gestión de Imágenes**: Upload de imágenes con almacenamiento en `uploads/cultivos-pic/`
- **Relaciones**: Conectado con producciones, ventas, gastos y actividades para trazabilidad completa