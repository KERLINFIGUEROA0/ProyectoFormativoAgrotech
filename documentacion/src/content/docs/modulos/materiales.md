---
title: "Módulo Materiales"
---

# Módulo Materiales

## Endpoints

### GET /materiales/reportes/stock-bajo
**Descripción**: Obtiene reporte de materiales con stock bajo.

**URL completa:** `http://localhost:3000/materiales/reportes/stock-bajo`

**Parámetros Query**:
- `limite` (number, opcional): Límite de stock para considerar "bajo" (default: 5)

**Response:**
```json
{
  "success": true,
  "message": "Se encontraron 3 materiales con stock bajo.",
  "data": [
    {
      "id": 1,
      "nombre": "Fertilizante orgánico",
      "cantidad": 3,
      "tipoCategoria": "FERTILIZANTES",
      "tipoMaterial": "ORGANICO",
      "medidasDeContenido": "KG",
      "tipoEmpaque": "BOLSA",
      "precio": 25000,
      "estado": true
    },
    {
      "id": 5,
      "nombre": "Semillas de tomate",
      "cantidad": 2,
      "tipoCategoria": "SEMILLAS",
      "tipoMaterial": "ORGANICO",
      "medidasDeContenido": "UNIDADES",
      "tipoEmpaque": "BOLSA",
      "precio": 15000,
      "estado": true
    }
  ]
}
```

### POST /materiales
**Descripción**: Crea un nuevo material.

**URL completa:** `http://localhost:3000/materiales`

**Request Body:**
```json
{
  "nombre": "Fertilizante NPK 20-20-20",
  "cantidad": 50,
  "tipoCategoria": "FERTILIZANTES",
  "tipoMaterial": "QUIMICO",
  "medidasDeContenido": "KG",
  "tipoEmpaque": "BOLSA",
  "precio": 45000,
  "pesoPorUnidad": 25,
  "descripcion": "Fertilizante balanceado para cultivos",
  "ubicacion": "Bodega A - Estante 3",
  "proveedor": "AgroQuímicos S.A.",
  "fechaVencimiento": "2025-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Material \"Fertilizante NPK 20-20-20\" creado exitosamente.",
  "data": {
    "id": 10,
    "nombre": "Fertilizante NPK 20-20-20",
    "cantidad": 50,
    "tipoCategoria": "FERTILIZANTES",
    "tipoMaterial": "QUIMICO",
    "medidasDeContenido": "KG",
    "tipoEmpaque": "BOLSA",
    "precio": 45000,
    "pesoPorUnidad": 25,
    "descripcion": "Fertilizante balanceado para cultivos",
    "ubicacion": "Bodega A - Estante 3",
    "proveedor": "AgroQuímicos S.A.",
    "fechaVencimiento": "2025-12-31T00:00:00.000Z",
    "estado": true
  }
}
```

### GET /materiales
**Descripción**: Lista todos los materiales.

**URL completa:** `http://localhost:3000/materiales`

**Response:**
```json
{
  "success": true,
  "total": 8,
  "data": [
    {
      "id": 1,
      "nombre": "Fertilizante orgánico",
      "cantidad": 25,
      "tipoCategoria": "FERTILIZANTES",
      "tipoMaterial": "ORGANICO",
      "medidasDeContenido": "KG",
      "tipoEmpaque": "BOLSA",
      "precio": 25000,
      "estado": true
    },
    {
      "id": 2,
      "nombre": "Semillas de lechuga",
      "cantidad": 100,
      "tipoCategoria": "SEMILLAS",
      "tipoMaterial": "ORGANICO",
      "medidasDeContenido": "UNIDADES",
      "tipoEmpaque": "BOLSA",
      "precio": 8000,
      "estado": true
    }
  ]
}
```

### GET /materiales/:id
**Descripción**: Obtiene un material específico por ID.

**URL completa:** `http://localhost:3000/materiales/:id`

**Parámetros URL**:
- `id` (number): ID del material

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Fertilizante orgánico",
    "cantidad": 25,
    "tipoCategoria": "FERTILIZANTES",
    "tipoMaterial": "ORGANICO",
    "medidasDeContenido": "KG",
    "tipoEmpaque": "BOLSA",
    "precio": 25000,
    "pesoPorUnidad": 20,
    "descripcion": "Fertilizante 100% orgánico",
    "ubicacion": "Bodega A - Estante 1",
    "proveedor": "AgroOrgánico Ltda.",
    "fechaVencimiento": "2025-06-30T00:00:00.000Z",
    "estado": true
  }
}
```

### PATCH /materiales/:id
**Descripción**: Actualiza un material existente.

**URL completa:** `http://localhost:3000/materiales/:id`

**Parámetros URL**:
- `id` (number): ID del material

**Request Body:**
```json
{
  "cantidad": 30,
  "precio": 28000,
  "descripcion": "Fertilizante 100% orgánico premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Material con ID 1 actualizado correctamente.",
  "data": {
    "id": 1,
    "nombre": "Fertilizante orgánico",
    "cantidad": 30,
    "tipoCategoria": "FERTILIZANTES",
    "tipoMaterial": "ORGANICO",
    "medidasDeContenido": "KG",
    "tipoEmpaque": "BOLSA",
    "precio": 28000,
    "pesoPorUnidad": 20,
    "descripcion": "Fertilizante 100% orgánico premium",
    "ubicacion": "Bodega A - Estante 1",
    "proveedor": "AgroOrgánico Ltda.",
    "fechaVencimiento": "2025-06-30T00:00:00.000Z",
    "estado": true
  }
}
```

### POST /materiales/:id/imagen
**Descripción**: Sube una imagen para un material específico.

**URL completa:** `http://localhost:3000/materiales/:id/imagen`

**Parámetros URL**:
- `id` (number): ID del material

**Request Body (form-data):**
```
file: [Archivo de imagen]
```

**Response:**
```json
{
  "success": true,
  "message": "Imagen del producto actualizada.",
  "data": {
    "id": 1,
    "nombre": "Fertilizante orgánico",
    "img": "materiales-pic/1643723400000-fertilizante.jpg"
  }
}
```

### PATCH /materiales/:id/desactivar
**Descripción**: Desactiva un material (soft delete).

**URL completa:** `http://localhost:3000/materiales/:id/desactivar`

**Parámetros URL**:
- `id` (number): ID del material

**Response:**
```json
{
  "success": true,
  "message": "Material \"Fertilizante orgánico\" ha sido desactivado.",
  "data": {
    "id": 1,
    "nombre": "Fertilizante orgánico",
    "estado": false
  }
}
```

### PATCH /materiales/:id/reactivar
**Descripción**: Reactiva un material desactivado.

**URL completa:** `http://localhost:3000/materiales/:id/reactivar`

**Parámetros URL**:
- `id` (number): ID del material

**Response:**
```json
{
  "success": true,
  "message": "Material \"Fertilizante orgánico\" ha sido reactivado.",
  "data": {
    "id": 1,
    "nombre": "Fertilizante orgánico",
    "estado": true
  }
}
```

## Entidad Material

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "nombre": "Fertilizante orgánico",
  "precio": 25000,
  "descripcion": "Fertilizante 100% orgánico",
  "cantidad": 25,
  "img": "uploads/materiales-pic/fertilizante.jpg",
  "ubicacion": "Bodega A - Estante 1",
  "proveedor": "AgroOrgánico Ltda.",
  "fechaVencimiento": "2025-06-30T00:00:00.000Z",
  "pesoPorUnidad": 20,
  "estado": true,
  "tipoCategoria": "FERTILIZANTES",
  "tipoMaterial": "ORGANICO",
  "medidasDeContenido": "KG",
  "tipoEmpaque": "BOLSA",
  "actividadMaterial": [
    {
      "id": 1,
      "cantidadUsada": 5,
      "actividadId": 1
    }
  ]
}
```

## Enums Utilizados

### TipoCategoria
- SEMILLAS
- FERTILIZANTES
- PESTICIDAS
- HERRAMIENTAS
- MAQUINARIA
- OTROS

### TipoMaterial
- ORGANICO
- QUIMICO
- BIOLOGICO
- MECANICO
- MANUAL

### MedidasDeContenido
- KG
- LITROS
- UNIDADES
- GRAMOS
- MILILITROS

### TipoEmpaque
- BOLSA
- BOTELLA
- CAJA
- SACO
- BIDON
- OTROS

## DTOs y Validaciones

### 📝 CreateMaterialeDto
| Campo | Tipo | 🔒 Validaciones | ⚠️ Mensaje de Error |
|-------|------|----------------|-------------------|
| `nombre` | `string` | `@IsString, @IsNotEmpty, @MaxLength(50)` | El nombre del producto es obligatorio. |
| `cantidad` | `number` | `@IsNumber, @IsNotEmpty, @Min(0)` | La cantidad es obligatoria. |
| `tipoCategoria` | `TipoCategoria` | `@IsEnum(TipoCategoria), @IsNotEmpty` | La categoría principal es obligatoria. |
| `tipoMaterial` | `TipoMaterial` | `@IsEnum(TipoMaterial), @IsOptional` | - |
| `medidasDeContenido` | `MedidasDeContenido` | `@IsEnum(MedidasDeContenido), @IsOptional` | - |
| `tipoEmpaque` | `TipoEmpaque` | `@IsEnum(TipoEmpaque), @IsNotEmpty` | El tipo de empaque es obligatorio. |
| `precio` | `number` | `@IsNumber, @IsOptional, @Min(0)` | - |
| `pesoPorUnidad` | `number` | `@IsNumber, @IsOptional, @Min(0)` | - |
| `descripcion` | `string` | `@IsString, @IsOptional, @MaxLength(255)` | - |
| `ubicacion` | `string` | `@IsString, @IsOptional` | - |
| `proveedor` | `string` | `@IsString, @IsOptional` | - |
| `fechaVencimiento` | `string` | `@IsDateString, @IsOptional` | - |

### UpdateMaterialeDto
Similar a CreateMaterialeDto, con campos opcionales.

## Funcionalidades Adicionales

- **Gestión de Stock**: Reportes de stock bajo con umbrales configurables
- **Estados**: Soft delete con desactivación/reactivación
- **Categorización**: Sistema jerárquico de categorías y subcategorías
- **Imágenes**: Upload de imágenes con almacenamiento en `uploads/materiales-pic/`
- **Validación**: Validaciones estrictas en DTOs con class-validator