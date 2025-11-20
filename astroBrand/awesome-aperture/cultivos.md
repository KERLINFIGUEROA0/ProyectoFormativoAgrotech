# Módulo Cultivos

## Endpoints

### POST /cultivos/crear
**Descripción**: Crea un nuevo cultivo.

**DTO: CreateCultivoDto**
- `nombre` (string, requerido): Nombre del cultivo (máx. 20 caracteres)
- `cantidad` (number, requerido): Cantidad inicial del cultivo
- `img` (string, opcional): Ruta de la imagen del cultivo
- `descripcion` (string, opcional): Descripción del cultivo
- `tipoCultivoId` (number, requerido): ID del tipo de cultivo relacionado
- `Estado` (string, opcional): Estado del cultivo (ej: "Activo", "Inactivo")
- `Fecha_Plantado` (string, opcional): Fecha de plantado en formato ISO

### GET /cultivos/listar
**Descripción**: Lista todos los cultivos con sus tipos relacionados.

### GET /cultivos/:id
**Descripción**: Obtiene un cultivo específico por ID.

**Parámetros URL**:
- `id` (number): ID del cultivo

### PUT /cultivos/actualizar/:id
**Descripción**: Actualiza un cultivo existente.

**Parámetros URL**:
- `id` (number): ID del cultivo

**DTO: UpdateCultivoDto** (mismos campos que CreateCultivoDto, todos opcionales)

### DELETE /cultivos/eliminar/:id
**Descripción**: Elimina un cultivo por ID.

**Parámetros URL**:
- `id` (number): ID del cultivo

### POST /cultivos/:id/imagen
**Descripción**: Sube una imagen para un cultivo específico.

**Parámetros URL**:
- `id` (number): ID del cultivo

**Body (form-data)**:
- `file` (file): Archivo de imagen a subir

### GET /cultivos/:id/exportar-excel
**Descripción**: Exporta un reporte Excel detallado de un cultivo específico.

**Parámetros URL**:
- `id` (number): ID del cultivo

### GET /cultivos/exportar-excel/general
**Descripción**: Exporta un reporte Excel general de todos los cultivos con estadísticas.

## Entidad Cultivo

```typescript
{
  id: number; // ID único del cultivo
  nombre: string; // Nombre del cultivo
  cantidad: number; // Cantidad disponible
  img: string; // Ruta de la imagen
  descripcion: string; // Descripción opcional
  Estado: string; // Estado del cultivo
  Fecha_Plantado: Date; // Fecha de plantado
  tipoCultivo: TipoCultivo; // Relación con tipo de cultivo
  actividades: Actividad[]; // Actividades relacionadas
  producciones: Produccion[]; // Producciones del cultivo
  surcos: Surco[]; // Surcos asignados
  cultivosEpa: CultivoEpa[]; // Tratamientos EPA
  gastos: Gasto[]; // Gastos asociados
}
```

## Funcionalidades Adicionales

- **Exportación Excel**: Genera reportes con múltiples hojas incluyendo información general, producciones, ventas y gastos
- **Gestión de Imágenes**: Upload de imágenes con almacenamiento en `uploads/cultivos-pic/`
- **Relaciones**: Conectado con producciones, ventas, gastos y actividades para trazabilidad completa