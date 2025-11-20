# Módulo Lotes

## Endpoints

### GET /lotes/estadisticas
**Descripción**: Obtiene estadísticas generales de los lotes (total, en cultivo, en preparación, alertas).

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "enCultivo": 7,
    "enPreparacion": 2,
    "alertas": 1
  }
}
```

### GET /lotes/listar
**Descripción**: Lista todos los lotes con sus surcos y cultivos relacionados.

### GET /lotes/:id
**Descripción**: Obtiene un lote específico por ID con sus surcos.

**Parámetros URL**:
- `id` (number): ID del lote

### POST /lotes/crear
**Descripción**: Crea un nuevo lote.

**DTO: CreateLoteDto**
- `nombre` (string, requerido): Nombre del lote
- `area` (number, requerido): Área del lote en m² (máx. 3000)
- `estado` (string, opcional): Estado del lote ("Activo", "Inactivo", "En preparación")
- `coordenadas` (object, opcional): Coordenadas geográficas
  - `type`: "point" | "polygon"
  - `coordinates`: Para point: {lat: number, lng: number}, para polygon: Array<{lat: number, lng: number}>

### PUT /lotes/actualizar/:id
**Descripción**: Actualiza un lote existente.

**Parámetros URL**:
- `id` (number): ID del lote

**DTO: UpdateLoteDto** (mismos campos que CreateLoteDto, todos opcionales)

### PATCH /lotes/:id/estado
**Descripción**: Actualiza solo el estado de un lote.

**Parámetros URL**:
- `id` (number): ID del lote

**DTO: UpdateLoteEstadoDto**
- `estado` (string, requerido): Nuevo estado ("Activo", "Inactivo", "En preparación")

## Entidad Lote

```typescript
{
  id: number; // ID único del lote
  localizacion: number; // Ubicación geográfica
  nombre: string; // Nombre del lote
  area: string; // Área en m² (almacenado como string)
  estado: string; // Estado actual
  coordenadas?: {
    type: 'point' | 'polygon';
    coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
  }; // Coordenadas geográficas
  surcos: Surco[]; // Surcos asociados al lote
}
```

## Funcionalidades Adicionales

- **Cache**: Los endpoints de estadísticas y listado usan cache Redis (TTL: 5-60 min)
- **Coordenadas Geoespaciales**: Soporte para puntos y polígonos usando JSONB en PostgreSQL
- **Reutilización**: Los lotes no se eliminan, solo cambian de estado para preservar trazabilidad
- **Validación**: Área máxima de 3000 m² por lote