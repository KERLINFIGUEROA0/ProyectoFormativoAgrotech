---
title: "Módulo Trazabilidad"
---

# Módulo Trazabilidad

## Endpoints

### GET /trazabilidad/cultivo/:id
**Descripción**: Obtiene la trazabilidad completa de un cultivo, incluyendo línea de tiempo con actividades, producciones, ventas y pagos.

**URL completa:** `http://localhost:3000/trazabilidad/cultivo/:id`

**Parámetros URL:**
- `id` (number): ID del cultivo

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry",
      "estado": "Activo",
      "Fecha_Plantado": "2024-01-15T00:00:00.000Z",
      "cantidad": 1000
    },
    "timeline": [
      {
        "tipo": "Siembra",
        "fecha": "15 de enero de 2024",
        "titulo": "Inicio del cultivo: Tomates cherry",
        "descripcion": "Se plantaron 1000 unidades.",
        "icono": "Sprout"
      },
      {
        "tipo": "Actividad",
        "fecha": "20 de enero de 2024",
        "titulo": "Preparación del suelo",
        "descripcion": "Actividad registrada.\nAsignados: Juan Pérez, María García.\nResponsable: Carlos Instructor.\nMateriales utilizados: Fertilizante orgánico (50 kg), Pala (2 unidades).\nMateriales devueltos: Pala (1 devueltos).",
        "estado": "completado",
        "icono": "ClipboardList"
      },
      {
        "tipo": "Cosecha",
        "fecha": "15 de abril de 2024",
        "titulo": "Registro de Cosecha",
        "descripcion": "Se cosecharon 850 kg.",
        "icono": "Package"
      },
      {
        "tipo": "Venta",
        "fecha": "20 de abril de 2024",
        "titulo": "Venta registrada (Factura #1)",
        "descripcion": "Venta de tomates cherry. Cantidad vendida: 500 kg. Total: $2.500.000",
        "icono": "DollarSign"
      },
      {
        "tipo": "Pago",
        "fecha": "25 de abril de 2024",
        "titulo": "Pago registrado a Juan Pérez García",
        "descripcion": "Pago por actividad \"Preparación del suelo\". Monto: $150.000. Horas trabajadas: 4.",
        "icono": "CreditCard"
      }
    ]
  }
}
```

## Funcionalidades Avanzadas

- **Línea de Tiempo Completa**: Cronología ordenada de todos los eventos del cultivo
- **Agregación de Datos**: Consolidación de información de múltiples módulos
- **Formateo de Fechas**: Presentación de fechas en zona horaria local (Bogotá)
- **Análisis de Materiales**: Seguimiento de uso y devoluciones de insumos
- **Integración Financiera**: Vinculación con ventas y pagos

## Flujo de Trabajo

1. **Consulta**: Solicitar trazabilidad de un cultivo específico
2. **Agregación**: Recopilar datos de cultivos, actividades, producciones, ventas y pagos
3. **Procesamiento**: Construir línea de tiempo cronológica con descripciones detalladas
4. **Formateo**: Adaptar fechas y montos a formato local
5. **Respuesta**: Devolver datos estructurados para visualización

## Integración con Otros Módulos

- **Cultivos**: Información base del cultivo y siembra
- **Actividades**: Registro de tareas realizadas con asignaciones y materiales
- **Producciones**: Eventos de cosecha y cantidades
- **Ventas**: Transacciones comerciales con facturación
- **Pagos**: Compensaciones a pasantes por actividades
- **Movimientos**: Seguimiento de devoluciones de materiales