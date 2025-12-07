---
title: "Módulo PDF"
---

# Módulo PDF

## Descripción General

El módulo PDF es un servicio utilitario que proporciona funcionalidades para generar reportes en formato PDF utilizando Puppeteer. Incluye generación de facturas de venta, reportes de trazabilidad completos y exportación de datos en formato CSV.

## Métodos del Servicio

### generarFacturaPdf(venta: Venta): Promise<string>
**Descripción**: Genera una factura PDF para una venta específica.

**Parámetros:**
- `venta` (Venta): Objeto de venta con todos sus datos

**Retorno:** Ruta del archivo PDF generado

**Funcionalidad:**
- Crea HTML template con datos de la venta
- Convierte HTML a PDF usando Puppeteer
- Guarda el archivo en `uploads/facturas/`
- Retorna la ruta del archivo generado

### generarReporteTrazabilidadCSV(data: any): Promise<string>
**Descripción**: Genera un reporte de trazabilidad en formato CSV.

**Parámetros:**
- `data` (any): Datos del lote para el reporte

**Retorno:** Contenido CSV como string

**Funcionalidad:**
- Crea secciones para resumen ejecutivo, pagos, cultivos, sensores
- Formatea datos en formato CSV
- Incluye cálculos de rentabilidad y estadísticas

### generarReporteTrazabilidad(data: any): Promise<Buffer>
**Descripción**: Genera un reporte completo de trazabilidad en formato PDF.

**Parámetros:**
- `data` (any): Datos completos del lote incluyendo cultivos, sensores, pagos

**Retorno:** Buffer del PDF generado

**Funcionalidad:**
- Genera HTML complejo con múltiples secciones
- Incluye gráficos usando Chart.js
- Crea diagnóstico inteligente de sensores
- Formatea datos financieros y de producción
- Genera PDF multipágina con headers y footers

## Funcionalidades Avanzadas

- **Generación de Facturas**: Creación automática de facturas PDF para ventas
- **Reportes de Trazabilidad**: Análisis completo de lotes con datos históricos
- **Diagnóstico Inteligente**: Análisis automático de lecturas de sensores con recomendaciones
- **Gráficos Interactivos**: Visualización de datos usando Chart.js embebido
- **Exportación CSV**: Formato alternativo para análisis de datos
- **Gestión de Imágenes**: Incrustación de logos y elementos visuales

## Flujo de Trabajo

1. **Recepción de Datos**: El servicio recibe datos estructurados del módulo correspondiente
2. **Procesamiento**: Se procesan y formatean los datos según el tipo de reporte
3. **Generación HTML**: Se crea template HTML con estilos y datos incrustados
4. **Conversión PDF**: Puppeteer convierte HTML a PDF con configuraciones específicas
5. **Almacenamiento**: Los archivos se guardan en el sistema de archivos

## Integración con Otros Módulos

- **Ventas**: Generación de facturas para transacciones comerciales
- **Cultivos**: Reportes de producción y análisis financiero
- **Información Sensor**: Datos de monitoreo IoT con diagnóstico inteligente
- **Pagos**: Registro de pagos a pasantes en reportes
- **Trazabilidad**: Reportes completos de seguimiento de lotes