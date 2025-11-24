# Módulo Producciones

## Endpoints

### POST /producciones
**Descripción**: Registra una nueva producción de un cultivo.

**DTO: CreateProduccioneDto**
- `cantidad` (number, requerido): Cantidad producida (entero positivo)
- `fecha` (string, requerido): Fecha de la producción en formato ISO
- `cultivoId` (number, requerido): ID del cultivo relacionado
- `estado` (string, opcional): Estado de la producción ("Programado", "En Proceso", "Cosechado")

### GET /producciones
**Descripción**: Lista todas las producciones con relaciones a cultivos.

### GET /producciones/cultivo/:cultivoId
**Descripción**: Lista todas las producciones de un cultivo específico.

**Parámetros URL**:
- `cultivoId` (number): ID del cultivo

### GET /producciones/cultivo/:cultivoId/stats
**Descripción**: Obtiene estadísticas de producciones para un cultivo específico.

**Parámetros URL**:
- `cultivoId` (number): ID del cultivo

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "totalCosechado": 1500,
    "ingresosTotales": 7500000,
    "gastosTotales": 3200000,
    "cosechaVendida": 1200
  }
}
```

### GET /producciones/:id
**Descripción**: Obtiene una producción específica con ventas y gastos.

**Parámetros URL**:
- `id` (number): ID de la producción

### PUT /producciones/:id
**Descripción**: Actualiza una producción existente.

**Parámetros URL**:
- `id` (number): ID de la producción

**DTO: UpdateProduccioneDto** (mismos campos que CreateProduccioneDto, todos opcionales)

### DELETE /producciones/:id
**Descripción**: Elimina una producción.

**Parámetros URL**:
- `id` (number): ID de la producción

### GET /producciones/available-for-sale
**Descripción**: Lista producciones disponibles para venta (con cantidad > 0).

## Entidad Produccion

```typescript
{
  id: number; // ID único de la producción
  cantidad: number; // Cantidad actual disponible
  cantidadOriginal: number; // Cantidad original cosechada
  fecha: Date; // Fecha de la producción
  estado: string; // Estado actual
  cultivo: Cultivo; // Cultivo relacionado
  ventas: Venta[]; // Ventas realizadas
  gastos: Gasto[]; // Gastos asociados
}
```

## Estados de Producción

- **Programado**: Producción planificada
- **En Proceso**: Producción en curso
- **Cosechado**: Producción completada
- **Vendido**: Toda la producción ha sido vendida

## DTOs y Validaciones

### CreateProduccioneDto
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
      <td>cantidad</td>
      <td>number</td>
      <td>@IsInt, @IsPositive, @IsNotEmpty</td>
      <td>La cantidad debe ser un número entero positivo. La cantidad es obligatoria.</td>
    </tr>
    <tr>
      <td>fecha</td>
      <td>string</td>
      <td>@IsDateString, @IsNotEmpty</td>
      <td>La fecha debe tener un formato válido (YYYY-MM-DD). La fecha es obligatoria.</td>
    </tr>
    <tr>
      <td>cultivoId</td>
      <td>number</td>
      <td>@IsInt, @IsNotEmpty</td>
      <td>El ID del cultivo debe ser un número entero. El ID del cultivo es obligatorio.</td>
    </tr>
    <tr>
      <td>estado</td>
      <td>string</td>
      <td>@IsString, @IsOptional, @IsIn(['Programado', 'En Proceso', 'Cosechado'])</td>
      <td>-</td>
    </tr>
  </tbody>
</table>

### UpdateProduccioneDto
Similar a CreateProduccioneDto.

## Funcionalidades Adicionales

- **Gestión de Inventario**: Seguimiento de cantidad disponible vs original
- **Estadísticas**: Cálculos automáticos de ingresos, gastos y rendimiento
- **Relaciones**: Conectado con cultivos, ventas y gastos para trazabilidad
- **Validación**: Cantidades positivas, fechas válidas
- **Disponibilidad**: Endpoint específico para producciones vendibles