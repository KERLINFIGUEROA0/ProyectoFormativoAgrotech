# Módulo Ventas

## Endpoints

### POST /ventas
**Descripción**: Registra una nueva venta y actualiza el inventario de producción.

**DTO: CreateVentaDto**
- `descripcion` (string, opcional): Descripción de la venta
- `monto` (number, requerido): Precio unitario de venta
- `fecha` (string, requerido): Fecha de la venta en formato ISO
- `cantidad` (number, requerido): Cantidad vendida
- `produccionId` (number, requerido): ID de la producción a vender
- `tipo` (TipoMovimiento, opcional): Tipo de movimiento (default: INGRESO)

### GET /ventas
**Descripción**: Lista todas las ventas con información de producción y cultivo.

### GET /ventas/:id/factura
**Descripción**: Descarga la factura PDF de una venta específica.

**Parámetros URL**:
- `id` (number): ID de la venta

### GET /ventas/flujo-mensual
**Descripción**: Obtiene el flujo mensual de ingresos y egresos de los últimos 6 meses.

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "mes": "Ene",
      "ingresos": 1500000,
      "egresos": 800000
    }
  ]
}
```

### DELETE /ventas/:id
**Descripción**: Elimina una venta y elimina el archivo PDF asociado.

**Parámetros URL**:
- `id` (number): ID de la venta

## Entidad Venta

```typescript
{
  id: number; // ID único de la venta
  descripcion: string; // Descripción opcional
  fecha: string; // Fecha de la venta
  precioUnitario: number; // Precio unitario
  cantidadVenta: number; // Cantidad vendida
  valorTotalVenta: number; // Valor total calculado
  rutaFacturaPdf: string; // Ruta del archivo PDF generado
  tipo: TipoMovimiento; // Tipo de movimiento (INGRESO/EGRESO)
  produccion: Produccion; // Producción relacionada
}
```

## Funcionalidades Adicionales

- **Transacciones**: Las ventas se procesan en transacciones para garantizar consistencia
- **Actualización de Inventario**: Al vender, se reduce la cantidad disponible en la producción
- **Estado de Producción**: Si la cantidad llega a 0, la producción se marca como "Vendido"
- **Facturación Automática**: Genera PDF automáticamente usando Puppeteer
- **Flujo Financiero**: Reportes mensuales de ingresos vs egresos
- **Relaciones**: Conectado con producciones para trazabilidad completa