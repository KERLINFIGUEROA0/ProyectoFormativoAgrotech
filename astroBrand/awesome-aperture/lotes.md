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

## DTOs y Validaciones

### CreateLoteDto
<table>
  <thead>
    <tr>
      <th>Campo</th>
      <th>Tipo</th>
      <th>Validaciones</th>
      <th>Mensaje de Error</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>nombre</td>
      <td>string</td>
      <td>@IsString, @IsNotEmpty</td>
      <td>El nombre del lote es requerido.</td>
    </tr>
    <tr>
      <td>area</td>
      <td>number</td>
      <td>@IsNumber, @IsNotEmpty, @Max(3000)</td>
      <td>El área es requerida. El área del lote no puede superar los 3000 m².</td>
    </tr>
    <tr>
      <td>estado</td>
      <td>string</td>
      <td>@IsString, @IsOptional, @IsIn(['Activo', 'Inactivo', 'En preparación'])</td>
      <td>-</td>
    </tr>
    <tr>
      <td>coordenadas</td>
      <td>CoordenadasDto</td>
      <td>@IsObject, @ValidateNested, @Type(() => CoordenadasDto), @IsOptional</td>
      <td>-</td>
    </tr>
  </tbody>
</table>

### UpdateLoteDto
Similar a CreateLoteDto.

### UpdateLoteEstadoDto
<table>
  <thead>
    <tr>
      <th>Campo</th>
      <th>Tipo</th>
      <th>Validaciones</th>
      <th>Mensaje de Error</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>estado</td>
      <td>string</td>
      <td>@IsString, @IsNotEmpty, @IsIn(['Activo', 'Inactivo', 'En preparación'])</td>
      <td>El estado debe ser "Activo", "Inactivo" o "En preparación".</td>
    </tr>
  </tbody>
</table>

## Funcionalidades Adicionales

- **Cache**: Los endpoints de estadísticas y listado usan cache Redis (TTL: 5-60 min)
- **Coordenadas Geoespaciales**: Soporte para puntos y polígonos usando JSONB en PostgreSQL
- **Reutilización**: Los lotes no se eliminan, solo cambian de estado para preservar trazabilidad
- **Validación**: Área máxima de 3000 m² por lote