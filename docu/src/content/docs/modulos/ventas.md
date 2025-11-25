---
title: "Módulo Ventas"
---

# Módulo Ventas

## Endpoints

### POST /ventas
**Descripción**: Registra una nueva venta y actualiza el inventario de producción.

**URL completa:** `http://localhost:3000/ventas`

**Request Body:**
```json
{
  "descripcion": "Venta de tomate cherry al mercado local",
  "monto": 8000,
  "fecha": "2024-01-20",
  "cantidad": 25,
  "produccionId": 1,
  "tipo": "INGRESO"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Venta registrada con éxito.",
  "data": {
    "id": 5,
    "descripcion": "Venta de tomate cherry al mercado local",
    "fecha": "2024-01-20",
    "precioUnitario": 8000,
    "cantidadVenta": 25,
    "valorTotalVenta": 200000,
    "tipo": "INGRESO",
    "rutaFacturaPdf": "uploads/facturas/factura-5.pdf",
    "produccion": {
      "id": 1,
      "cantidad": 75,
      "cultivo": {
        "id": 1,
        "nombre": "Tomate cherry"
      }
    }
  }
}
```

### GET /ventas
**Descripción**: Lista todas las ventas con información de producción y cultivo.

**URL completa:** `http://localhost:3000/ventas`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "descripcion": "Venta de lechuga al restaurante",
      "monto": 120000,
      "fecha": "2024-01-15",
      "cantidad": 50,
      "precioUnitario": 2400,
      "tipo": "INGRESO",
      "rutaFacturaPdf": "uploads/facturas/factura-1.pdf"
    },
    {
      "id": 2,
      "descripcion": "Venta de tomate al supermercado",
      "monto": 160000,
      "fecha": "2024-01-18",
      "cantidad": 40,
      "precioUnitario": 4000,
      "tipo": "INGRESO",
      "rutaFacturaPdf": "uploads/facturas/factura-2.pdf"
    }
  ]
}
```

### GET /ventas/:id/factura
**Descripción**: Descarga la factura PDF de una venta específica.

**URL completa:** `http://localhost:3000/ventas/:id/factura`

**Parámetros URL**:
- `id` (number): ID de la venta

**Response:** Archivo PDF descargado con nombre `factura-venta-1.pdf`

### GET /ventas/flujo-mensual
**Descripción**: Obtiene el flujo mensual de ingresos y egresos de los últimos 6 meses.

**URL completa:** `http://localhost:3000/ventas/flujo-mensual`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "mes": "Ago",
      "ingresos": 2500000,
      "egresos": 1200000
    },
    {
      "mes": "Sep",
      "ingresos": 3200000,
      "egresos": 1500000
    },
    {
      "mes": "Oct",
      "ingresos": 2800000,
      "egresos": 1350000
    },
    {
      "mes": "Nov",
      "ingresos": 3500000,
      "egresos": 1600000
    },
    {
      "mes": "Dic",
      "ingresos": 4200000,
      "egresos": 1800000
    },
    {
      "mes": "Ene",
      "ingresos": 3800000,
      "egresos": 1700000
    }
  ]
}
```

### DELETE /ventas/:id
**Descripción**: Elimina una venta y elimina el archivo PDF asociado.

**URL completa:** `http://localhost:3000/ventas/:id`

**Parámetros URL**:
- `id` (number): ID de la venta

**Response:**
```json
{
  "success": true,
  "message": "Venta eliminada con éxito."
}
```

## Entidad Venta

**Ejemplo en formato JSON:**
```json
{
  "id": 1,
  "descripcion": "Venta de lechuga al restaurante",
  "fecha": "2024-01-15",
  "precioUnitario": 2400,
  "cantidadVenta": 50,
  "valorTotalVenta": 120000,
  "rutaFacturaPdf": "uploads/facturas/factura-1.pdf",
  "tipo": "INGRESO",
  "produccion": {
    "id": 1,
    "cantidad": 150,
    "fecha": "2024-01-10T08:00:00.000Z",
    "estado": "Cosechado",
    "cultivo": {
      "id": 1,
      "nombre": "Lechuga romana"
    }
  }
}
```

## DTOs y Validaciones

### 📝 CreateVentaDto
| Campo | Tipo | 🔒 Validaciones | ⚠️ Mensaje de Error |
|-------|------|----------------|-------------------|
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `monto` | `number` | `@IsNumber, @IsNotEmpty` | El monto (precio unitario) es obligatorio. |
| `fecha` | `string` | `@IsDateString, @IsNotEmpty` | La fecha es obligatoria. |
| `cantidad` | `number` | `@IsInt, @IsNotEmpty` | La cantidad es obligatoria. |
| `produccionId` | `number` | `@IsInt, @IsNotEmpty` | El ID de producción es obligatorio. |
| `tipo` | `TipoMovimiento` | `@IsEnum(TipoMovimiento), @IsOptional` | - |

### UpdateVentaDto
Similar a CreateVentaDto.

## Funcionalidades Adicionales

- **Transacciones**: Las ventas se procesan en transacciones para garantizar consistencia
- **Actualización de Inventario**: Al vender, se reduce la cantidad disponible en la producción
- **Estado de Producción**: Si la cantidad llega a 0, la producción se marca como "Vendido"
- **Facturación Automática**: Genera PDF automáticamente usando Puppeteer
- **Flujo Financiero**: Reportes mensuales de ingresos vs egresos
- **Relaciones**: Conectado con producciones para trazabilidad completa