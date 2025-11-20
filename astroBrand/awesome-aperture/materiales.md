# Módulo Materiales

## Endpoints

### GET /materiales/reportes/stock-bajo
**Descripción**: Obtiene reporte de materiales con stock bajo.

**Parámetros Query**:
- `limite` (number, opcional): Límite de stock para considerar "bajo" (default: 5)

### POST /materiales
**Descripción**: Crea un nuevo material.

**DTO: CreateMaterialeDto**
- `nombre` (string, requerido): Nombre del material (máx. 50 caracteres)
- `cantidad` (number, requerido): Cantidad disponible (mín. 0)
- `tipoCategoria` (TipoCategoria, requerido): Categoría principal del material
- `tipoMaterial` (TipoMaterial, opcional): Subtipo del material
- `medidasDeContenido` (MedidasDeContenido, opcional): Unidad de medida
- `tipoEmpaque` (TipoEmpaque, requerido): Tipo de empaque
- `precio` (number, opcional): Precio unitario
- `pesoPorUnidad` (number, opcional): Peso por unidad en kg
- `descripcion` (string, opcional): Descripción del material
- `ubicacion` (string, opcional): Ubicación en bodega
- `proveedor` (string, opcional): Nombre del proveedor
- `fechaVencimiento` (string, opcional): Fecha de vencimiento en formato ISO

### GET /materiales
**Descripción**: Lista todos los materiales.

### GET /materiales/:id
**Descripción**: Obtiene un material específico por ID.

**Parámetros URL**:
- `id` (number): ID del material

### PATCH /materiales/:id
**Descripción**: Actualiza un material existente.

**Parámetros URL**:
- `id` (number): ID del material

**DTO: UpdateMaterialeDto** (mismos campos que CreateMaterialeDto, todos opcionales)

### POST /materiales/:id/imagen
**Descripción**: Sube una imagen para un material específico.

**Parámetros URL**:
- `id` (number): ID del material

**Body (form-data)**:
- `file` (file): Archivo de imagen a subir

### PATCH /materiales/:id/desactivar
**Descripción**: Desactiva un material (soft delete).

**Parámetros URL**:
- `id` (number): ID del material

### PATCH /materiales/:id/reactivar
**Descripción**: Reactiva un material desactivado.

**Parámetros URL**:
- `id` (number): ID del material

## Entidad Material

```typescript
{
  id: number; // ID único del material
  nombre: string; // Nombre del material
  precio: number; // Precio unitario
  descripcion: string; // Descripción opcional
  cantidad: number; // Cantidad disponible
  img: string; // Ruta de la imagen
  ubicacion: string; // Ubicación en bodega
  proveedor: string; // Proveedor
  fechaVencimiento: Date; // Fecha de vencimiento
  pesoPorUnidad: number; // Peso por unidad en kg
  estado: boolean; // Estado activo/inactivo
  tipoCategoria: TipoCategoria; // Categoría principal
  tipoMaterial: TipoMaterial; // Subtipo
  medidasDeContenido: MedidasDeContenido; // Unidad de contenido
  tipoEmpaque: TipoEmpaque; // Tipo de empaque
  actividadMaterial: ActividadMaterial[]; // Relaciones con actividades
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

## Funcionalidades Adicionales

- **Gestión de Stock**: Reportes de stock bajo con umbrales configurables
- **Estados**: Soft delete con desactivación/reactivación
- **Categorización**: Sistema jerárquico de categorías y subcategorías
- **Imágenes**: Upload de imágenes con almacenamiento en `uploads/materiales-pic/`
- **Validación**: Validaciones estrictas en DTOs con class-validator