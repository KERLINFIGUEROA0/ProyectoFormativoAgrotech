import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { Venta } from '../ventas/entities/venta.entity';
import { dateColumnTransformer } from '../../common/utils/date-column.transformer';

// Función helper para convertir imagen a base64
const getImageAsBase64 = (imagePath: string): string => {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('No se pudo cargar el logo:', error.message);
    return '';
  }
};

@Injectable()
export class PdfService {
  // Helper function to handle dates consistently using the transformer logic
  private transformDateForDisplay(date: string | Date | null): Date | null {
    return dateColumnTransformer.from(date);
  }

  // Helper function to format dates for display in Bogota time zone
  private formatDateForDisplay(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  }
  async generarFacturaPdf(venta: Venta): Promise<string> {
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Incrustamos la plantilla HTML directamente en el código para evitar errores de lectura de archivos.
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: sans-serif; margin: 40px; color: #333; }
            .container { border: 1px solid #eee; padding: 30px; }
            .header { text-align: center; margin-bottom: 40px; }
            .header h1 { margin: 0; color: #2E7D32; }
            .header p { margin: 5px 0; color: #777; }
            .details { margin-bottom: 30px; }
            .details table { width: 100%; border-collapse: collapse; }
            .details th, .details td { text-align: left; padding: 8px 0; }
            .details th { color: #555; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th, .items-table td { border-bottom: 1px solid #ddd; padding: 12px; text-align: right; }
            .items-table th { background-color: #f9f9f9; text-align: right; color: #555; font-weight: bold; }
            .items-table th:first-child, .items-table td:first-child { text-align: left; }
            .total { text-align: right; font-size: 1.2em; font-weight: bold; }
            .total td { padding-top: 20px; }
            .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #888; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AgroTECH Yamboró</h1>
                <p>Factura de Venta</p>
            </div>
            <div class="details">
                <table>
                    <tr>
                        <th>Número de Factura:</th>
                        <td>FV-{{facturaId}}</td>
                        <th>Fecha de Emisión:</th>
                        <td>{{fecha}}</td>
                    </tr>
                </table>
            </div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{descripcion}}</td>
                        <td>{{cantidad}}</td>
                        <td>{{precioUnitario}}</td>
                        <td>{{valorTotal}}</td>
                    </tr>
                </tbody>
            </table>
            <table class="total">
                <tr>
                    <td>Total a Pagar:</td>
                    <td>{{valorTotal}}</td>
                </tr>
            </table>
            <div class="footer">
                <p>Gracias por su compra.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    // --- FIN DE LA CORRECCIÓN ---

    let html = htmlTemplate;

    // Reemplazamos los datos
    const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
    html = html.replace('{{facturaId}}', String(venta.id).padStart(4, '0'));
    html = html.replace('{{fecha}}', new Date(venta.fecha).toLocaleDateString('es-ES', { timeZone: 'America/Bogota' }));
    html = html.replace('{{descripcion}}', venta.descripcion);
    html = html.replace('{{cantidad}}', String(venta.cantidadVenta));
    html = html.replace('{{precioUnitario}}', currencyFormatter.format(Number(venta.precioUnitario)));
    // Corregimos el reemplazo doble de valorTotal
    html = html.replace(new RegExp('{{valorTotal}}', 'g'), currencyFormatter.format(Number(venta.valorTotalVenta)));

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfPath = path.join('uploads', 'facturas', `factura-${venta.id}.pdf`);
    
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    return pdfPath;
  }

  /**
   * Genera gráficos usando Chart.js embebido en el HTML
   */
  private generateChartUrl(label: string, labels: string[], data: number[], color: string): string {
    // Simplificamos los datos para que la URL no sea gigante (tomamos máximo 50 puntos distribuidos)
    let finalLabels = labels;
    let finalData = data;

    if (labels.length > 50) {
      const step = Math.ceil(labels.length / 50);
      finalLabels = labels.filter((_, i) => i % step === 0);
      finalData = data.filter((_, i) => i % step === 0);
    }

    const chartConfig = {
      type: 'line',
      data: {
        labels: finalLabels,
        datasets: [{
          label: label,
          data: finalData,
          borderColor: color,
          backgroundColor: 'rgba(0,0,0,0)', // Sin relleno
          fill: false,
          tension: 0.4
        }]
      },
      options: {
        title: { display: true, text: `Comportamiento: ${label}` },
        legend: { display: false },
        scales: {
            xAxes: [{ ticks: { autoSkip: true, maxTicksLimit: 10 } }]
        }
      }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encodedConfig}&w=500&h=300`;
  }

  async generarReporteTrazabilidadCSV(data: any): Promise<string> {
    const csvLines: string[] = [];

    // Header
    csvLines.push('REPORTE DE TRAZABILIDAD - AGROTECH');
    csvLines.push(`Lote: ${data.lote}`);
    csvLines.push(`Rango: ${data.rango}`);
    csvLines.push(`Generado: ${this.formatDateForDisplay(this.transformDateForDisplay(data.fechaGeneracion))}`);
    csvLines.push('');

    // Resumen Ejecutivo
    csvLines.push('RESUMEN EJECUTIVO DEL LOTE');
    csvLines.push('Total Cultivos,Producción Total,Inversión Total,Ventas Totales,Mano de Obra (Pasantes),Rentabilidad Neta,Inventario Pendiente');
    csvLines.push(`${data.cultivos.length},"${data.cultivos.reduce((sum, c) => sum + (c.produccionTotalKg + c.resumenFinanciero.detalleVentas.reduce((sumV, v) => sumV + v.cantidadVendida, 0)), 0).toLocaleString()} Kg","$${(
      data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalInversion, 0) +
      (data.pagos ? data.pagos.reduce((sum, p) => sum + Number(p.monto), 0) : 0)
    ).toLocaleString()}","$${data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalVentas, 0).toLocaleString()}","$${data.pagos ? data.pagos.reduce((sum, p) => sum + Number(p.monto), 0).toLocaleString() : '0'}","$${(
      data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalVentas, 0) -
      (data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalInversion, 0) +
       (data.pagos ? data.pagos.reduce((sum, p) => sum + Number(p.monto), 0) : 0))
    ).toLocaleString()}","${data.cultivos.reduce((sum, c) => sum + (c.cosechas ? c.cosechas.reduce((sumCo, co) => sumCo + co.cantidadRestante, 0) : 0), 0).toLocaleString()} Kg"`);
    csvLines.push('');

    // Pagos a Pasantes
    if (data.pagos && data.pagos.length > 0) {
      csvLines.push('PAGOS A PASANTES');
      csvLines.push('Fecha,Pasante,Actividad,Cultivo,Horas,Tarifa por Hora,Monto Total');
      data.pagos.forEach(p => {
        csvLines.push(`"${this.formatDateForDisplay(this.transformDateForDisplay(p.fecha))}","${p.pasante}","${p.actividad}","${p.cultivo}","${p.horasTrabajadas}","$${p.tarifaHora}","$${p.monto}"`);
      });
      csvLines.push(`"TOTAL PAGOS A PASANTES","","","","","","$${data.pagos.reduce((sum, p) => sum + Number(p.monto), 0)}"`);
      csvLines.push('');
    }

    // Detalle de Cultivos
    data.cultivos.forEach(c => {
      csvLines.push(`CULTIVO: ${c.nombre} (${c.tipo})`);
      csvLines.push(`Dias Sembrado: ${c.diasSembrado}, Estado: ${c.estadoActual}`);
      csvLines.push('');

      // Inventario de Cosechas
      if (c.cosechas && c.cosechas.length > 0) {
        csvLines.push('INVENTARIO DE COSECHAS');
        csvLines.push('Fecha de Cosecha,Inventario Restante,Estado');
        c.cosechas.forEach(co => {
          csvLines.push(`"${this.formatDateForDisplay(this.transformDateForDisplay(co.fecha))}","${co.cantidadRestante.toLocaleString()} Kg","${co.estado}"`);
        });
        csvLines.push(`"INVENTARIO TOTAL PENDIENTE","${c.cosechas.reduce((sum, co) => sum + co.cantidadRestante, 0).toLocaleString()} Kg",""`);
        csvLines.push('');
      }

      // Insumos Aplicados
      if (c.resumenFinanciero.detalleMateriales.length > 0) {
        csvLines.push('INSUMOS APLICADOS (EGRESOS)');
        csvLines.push('Fecha,Material,Cantidad,Precio Unitario,Costo Total');
        c.resumenFinanciero.detalleMateriales.forEach(m => {
          csvLines.push(`"${this.formatDateForDisplay(this.transformDateForDisplay(m.fecha))}","${m.nombre}","${m.cantidad} ${m.unidad || 'unidad'}","$${m.precioUnitario}","$${m.costoTotal}"`);
        });
        csvLines.push(`"TOTAL INSUMOS (EGRESOS)","","","","$${c.resumenFinanciero.detalleMateriales.reduce((sum, m) => sum + m.costoTotal, 0)}"`);
        csvLines.push('');
      }

      // Ventas Realizadas
      if (c.resumenFinanciero.detalleVentas.length > 0) {
        csvLines.push('VENTAS REALIZADAS');
        csvLines.push('Fecha,Descripción,Cantidad Vendida,Precio Unitario,Total');
        c.resumenFinanciero.detalleVentas.forEach(v => {
          csvLines.push(`"${this.formatDateForDisplay(this.transformDateForDisplay(v.fecha))}","${v.descripcion}","${v.cantidadVendida} Kg","$${Number(v.precioUnitario)}","$${v.valorTotal}"`);
        });
        csvLines.push(`"TOTAL VENTAS","","${c.resumenFinanciero.detalleVentas.reduce((sum, v) => sum + v.cantidadVendida, 0)} Kg","","$${c.resumenFinanciero.detalleVentas.reduce((sum, v) => sum + v.valorTotal, 0)}"`);
        csvLines.push('');
      }

      // Balance Financiero
      csvLines.push('BALANCE FINANCIERO');
      csvLines.push('Categoría,Monto');
      csvLines.push(`"Ingresos (Ventas)","$${c.resumenFinanciero.totalVentas}"`);
      csvLines.push(`"Egresos (Inversión)","$${c.resumenFinanciero.totalInversion}"`);
      csvLines.push(`"Ganancia Neta","$${c.resumenFinanciero.gananciaNeta}"`);
      csvLines.push('');
    });

    // Sensores IoT
    if (Object.keys(data.sensores).length > 0) {
      csvLines.push('SENSORES IoT');
      Object.entries(data.sensores).forEach(([sensor, info]: [string, any]) => {
        csvLines.push(`Sensor: ${sensor}`);
        csvLines.push(`Unidad: ${info.unidad}, Total Registros: ${info.stats.totalRegistros}`);
        csvLines.push('Métrica,Valor');
        csvLines.push(`Mínimo Histórico,"${info.stats.minimo} ${info.unidad}"`);
        csvLines.push(`Promedio Global,"${info.stats.promedio} ${info.unidad}"`);
        csvLines.push(`Máximo Histórico,"${info.stats.maximo} ${info.unidad}"`);
        csvLines.push(`Último Valor,"${info.ultimoRegistro ? info.ultimoRegistro.valor + ' ' + info.unidad : 'N/A'}"`);
        csvLines.push('');
      });
    }

    return csvLines.join('\n');
  }

  async generarReporteTrazabilidad(data: any): Promise<Buffer> {

    // ==========================================
    // ESTRUCTURA DEL PDF GENERADO:
    // ==========================================
    // PÁGINA 1:
    //    - Header Grande (contenido HTML): Logo + Info completa del reporte
    //    - Body: Resumen Ejecutivo del Lote
    //    - Footer: Info sistema + paginación
    // PÁGINAS 2+:
    //    - Sin header (maximiza espacio)
    //    - Body 90%: Detalle de cultivos + sensores IoT
    //    - Footer 10%: Info sistema + paginación
    // ==========================================

    // --- LOGO PARA PRIMERA PÁGINA ---
    const logoPath = path.join(process.cwd(), 'uploads', 'logos', 'logo.png');
    const logoBase64 = getImageAsBase64(logoPath);

    // --- 🧠 FUNCIÓN DE DIAGNÓSTICO INTELIGENTE ---
    const generarDiagnostico = (sensor: string, promedio: number, maximo: number, minimo: number, ultimoValor: number, unidad: string, umbralMin?: number, umbralMax?: number) => {
        let mensaje = "";
        let accion = "";
        let nivel = "normal"; // normal, alerta, critico

        const s = sensor.toLowerCase();
        const valorEvaluar = ultimoValor !== null && ultimoValor !== undefined ? ultimoValor : promedio; // Priorizamos el último valor

        if (s.includes('temperatura')) {
            // Usar umbrales configurados o valores por defecto
            const umbralCriticoAlto = umbralMax || 35;
            const umbralAlertaAlto = umbralMax ? umbralMax * 0.8 : 30;
            const umbralAlertaBajo = umbralMin || 10;

            // Evaluamos extremos históricos primero
            if (maximo > (umbralMax || 38)) {
                 mensaje = `Histórico: Picos de calor extremo (${maximo}${unidad}).`;
                 nivel = "alerta";
            }

            // Evaluamos estado ACTUAL (PRIORIDAD)
            if (valorEvaluar > umbralCriticoAlto) {
                mensaje = `🔴 ALERTA ACTUAL: Temperatura crítica (${valorEvaluar}${unidad}). Estrés térmico inminente.`;
                accion = "URGENTE: Activar riego y ventilación inmediatamente.";
                nivel = "critico";
            } else if (valorEvaluar > umbralAlertaAlto) {
                mensaje = `⚠️ Precaución: Temperatura actual elevada (${valorEvaluar}${unidad}).`;
                accion = "Monitorear hidratación.";
                nivel = "alerta";
            } else if (valorEvaluar < umbralAlertaBajo) {
                mensaje = `⚠️ Temperatura baja detectada (${valorEvaluar}${unidad}).`;
                accion = "Proteger contra heladas.";
                nivel = "alerta";
            } else {
                if (nivel === "normal") {
                    mensaje = "✅ Estado actual: Temperatura óptima.";
                    accion = "Mantener monitoreo.";
                }
            }
        }
        else if (s.includes('humedad') && s.includes('suelo')) {
            // Usar umbrales configurados o valores por defecto
            const umbralCriticoBajo = umbralMin || 20;
            const umbralAlertaAlto = umbralMax || 90;

            // Caso específico: Valor 0.0 (Fallo o Sequía extrema)
            if (valorEvaluar === 0) {
                mensaje = `🚨 CRÍTICO: Sensor marca 0.0${unidad}. Suelo totalmente seco o desconexión.`;
                accion = "VERIFICAR INMEDIATAMENTE: Revisar sensor y riego manual urgente.";
                nivel = "critico";
            } else if (valorEvaluar < umbralCriticoBajo) {
                mensaje = `🔴 ALERTA ACTUAL: Suelo muy seco (${valorEvaluar}${unidad}).`;
                accion = "ACTIVAR RIEGO AHORA.";
                nivel = "critico";
            } else if (valorEvaluar > umbralAlertaAlto) {
                mensaje = `⚠️ Alerta: Suelo saturado (${valorEvaluar}${unidad}).`;
                accion = "Suspender riego.";
                nivel = "alerta";
            } else {
                mensaje = "✅ Estado actual: Humedad de suelo óptima.";
                accion = "Sin acciones.";
            }
        }
        else if (s.includes('humedad') && !s.includes('suelo')) {
            // Usar umbrales configurados o valores por defecto
            const umbralAlertaBajo = umbralMin || 40;
            const umbralAlertaAlto = umbralMax || 85;

            if (valorEvaluar < umbralAlertaBajo) {
                mensaje = `⚠️ Humedad ambiental baja (${valorEvaluar}${unidad}).`;
                accion = "Considerar humidificación.";
                nivel = "alerta";
            } else if (valorEvaluar > umbralAlertaAlto) {
                mensaje = `⚠️ Humedad ambiental excesiva (${valorEvaluar}${unidad}).`;
                accion = "Mejorar ventilación.";
                nivel = "alerta";
            } else {
                mensaje = "✅ Estado actual: Humedad ambiental óptima.";
                accion = "Sin acciones.";
            }
        }
        else if (s.includes('luz') || s.includes('radiacion')) {
            // Usar umbrales configurados o valores por defecto
            const umbralCriticoBajo = umbralMin || 15000;
            const umbralAlertaAlto = umbralMax || 75000;

            if (valorEvaluar === 0) {
                 mensaje = `⚠️ Aviso: Sensor marca 0.0${unidad} (Oscuridad total o fallo).`;
                 accion = "Verificar si es de noche o revisar sensor.";
                 nivel = "alerta";
            } else if (valorEvaluar < umbralCriticoBajo) {
                mensaje = `⚠️ ALERTA: Insuficiente luz (${Math.floor(valorEvaluar)}${unidad} < ${Math.floor(umbralCriticoBajo)}${unidad}). Riesgo de crecimiento deficiente.`;
                accion = "URGENTE: Mejorar iluminación o revisar ubicación del cultivo.";
                nivel = "alerta";
            } else if (valorEvaluar > umbralAlertaAlto) {
                mensaje = `🔴 PELIGRO: Exceso de radiación solar (${Math.floor(valorEvaluar)}${unidad} > ${Math.floor(umbralAlertaAlto)}${unidad}). Estrés térmico y quemaduras.`;
                accion = "INMEDIATO: Aplicar protección solar o sombreo urgente.";
                nivel = "critico";
            } else {
                mensaje = "✅ Estado actual: Niveles de luz adecuados.";
                accion = "Sin acciones.";
            }
        }
        else if (s.includes('ph')) {
            if (valorEvaluar < 5.5 || valorEvaluar > 7.5) {
                mensaje = `⚠️ pH fuera de rango óptimo (${valorEvaluar}).`;
                accion = "Realizar corrección del suelo.";
                nivel = "alerta";
            } else {
                mensaje = "✅ Estado actual: pH óptimo.";
                accion = "Sin acciones";
            }
        }
        else {
            // Sensor genérico - usar umbrales configurados
            const limiteInferior = umbralMin || minimo;
            const limiteSuperior = umbralMax || maximo;

            if (valorEvaluar < limiteInferior) {
                 mensaje = `⚠️ Valor actual bajo (${valorEvaluar}${unidad}) - Fuera del rango configurado.`;
                 nivel = "alerta";
                 accion = "Revisar configuración del sensor.";
            } else if (valorEvaluar > limiteSuperior) {
                 mensaje = `⚠️ Valor actual alto (${valorEvaluar}${unidad}) - Fuera del rango configurado.`;
                 nivel = "alerta";
                 accion = "Revisar configuración del sensor.";
            } else {
                 mensaje = `✅ Valor actual dentro del rango configurado.`;
                 accion = "Continuar monitoreo.";
            }
        }

        return { mensaje, accion, nivel };
    };

    // --- ✅ FUNCIÓN HELPER PARA MONEDA ---
    // Si el precio es menor a $50, mostramos hasta 6 decimales para ver el costo de los gramos/mililitros
    const formatCurrency = (valor: number) => {
        const num = Number(valor);
        if (num === 0) return "$0";

        // Si es un valor muy pequeño (ej: costo de 1 gramo), usamos más decimales
        if (Math.abs(num) < 50) {
             return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
            }).format(num);
        }

        // Para valores normales, sin decimales o máximo 2
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    };

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>

            body {
                font-family: 'Arial', sans-serif;
                color: #333;
                font-size: 11px;
                margin: 0;
                padding: 5px 0 0 0;
                line-height: 1.4;
            }

            .card {
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 15px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                page-break-inside: avoid;
                background-color: #fff;
            }

            .card-title {
                font-size: 14px;
                font-weight: bold;
                color: #2E7D32;
                border-bottom: 2px solid #2E7D32;
                padding-bottom: 6px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .badge {
                background: #E8F5E9;
                color: #2E7D32;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: bold;
                font-size: 10px;
            }

            .grid-2 {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }

            .col {
                flex: 1;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8px;
                margin-top: 6px;
            }

            th {
                background-color: #f8f9fa;
                color: #495057;
                font-weight: bold;
                padding: 5px 4px;
                border-bottom: 2px solid #dee2e6;
                text-align: left;
                font-size: 7px;
            }

            td {
                padding: 4px;
                border-bottom: 1px solid #dee2e6;
                vertical-align: top;
            }

            .text-center { text-align: center; }
            .text-right { text-align: right; }

            .profit {
                color: #28a745;
                font-weight: bold;
            }

            .loss {
                color: #dc3545;
                font-weight: bold;
            }

            .warning {
                color: #ffc107;
                font-weight: bold;
            }

            .alert-box {
                background-color: #fff3cd;
                color: #856404;
                padding: 12px;
                border-radius: 6px;
                margin: 15px 0;
                border-left: 4px solid #ffc107;
            }

            .success-box {
                background-color: #d4edda;
                color: #155724;
                padding: 12px;
                border-radius: 6px;
                margin: 15px 0;
                border-left: 4px solid #28a745;
            }

            .status-completed {
                color: #28a745;
                font-weight: bold;
            }

            .status-pending {
                color: #ffc107;
                font-weight: bold;
            }

            .status-failed {
                color: #dc3545;
                font-weight: bold;
            }

            .kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }

            .kpi-card {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid #dee2e6;
            }

            .kpi-value {
                font-size: 14px;
                font-weight: bold;
                display: block;
                margin-top: 3px;
            }

            .section-break {
                page-break-before: always;
            }

            .page-break-inside-avoid {
                page-break-inside: avoid;
            }

            .section-title {
                color: #1B5E20;
                font-size: 16px;
                font-weight: bold;
                margin: 20px 0 10px 0;
                padding-bottom: 5px;
                border-bottom: 2px solid #2E7D32;
            }

            /* Contenedor de la Gráfica */
            .chart-container {
                position: relative;
                height: 200px;
                width: 100%;
                margin: 15px 0;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                background-color: #fff;
            }

            .diagnosis-box {
                padding: 12px;
                border-radius: 6px;
                margin: 15px 0;
                border-left: 4px solid;
                font-size: 11px;
            }

            .diagnosis-critico {
                background-color: #ffebee;
                color: #c62828;
                border-left-color: #d32f2f;
            }

            .diagnosis-alerta {
                background-color: #fff3cd;
                color: #856404;
                border-left-color: #ffc107;
            }

            .diagnosis-normal {
                background-color: #d4edda;
                color: #155724;
                border-left-color: #28a745;
            }

            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                text-align: center;
                font-size: 9px;
                color: #6c757d;
            }
        </style>
    </head>
    <body>

        <!-- HEADER GRANDE SOLO EN PRIMERA PÁGINA -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 2px solid #2E7D32;">
           <div style="flex: 1;">
             <h1 style="margin: 0 0 10px 0; color: #1b5e20; font-size: 28px; font-weight: bold;">REPORTE DE TRAZABILIDAD - AGROTECH</h1>
             <p style="margin: 0 0 8px 0; color: #2E7D32; font-size: 16px; font-weight: 600;">Lote: ${data.lote} | Rango: ${data.rango}</p>
             <p style="margin: 0; color: #666; font-size: 12px;">Cultivos: ${data.cultivos.length} | Generado: ${this.formatDateForDisplay(this.transformDateForDisplay(data.fechaGeneracion))}</p>
           </div>
           ${logoBase64 ? `
           <div style="flex-shrink: 0; margin-left: 20px;">
             <img src="${logoBase64}" alt="Logo AgroTech" style="height: 60px; width: auto;" />
           </div>
           ` : ''}
        </div>

        <!-- ==========================================
             SECCIÓN 1: RESUMEN EJECUTIVO DEL LOTE
             ========================================== -->
        <div class="card" style="margin-bottom: 20px; background-color: #f8f9fa; page-break-inside: avoid;">
            <h2 style="color: #2E7D32; margin-bottom: 15px; text-align: center;">📊 Resumen Ejecutivo del Lote</h2>
            <div class="kpi-grid" style="margin-bottom: 15px;">
                <div class="kpi-card">
                    Total Cultivos
                    <span class="kpi-value">${data.cultivos.length}</span>
                </div>
                <div class="kpi-card">
                    Producción Total
                    <span class="kpi-value">${data.cultivos.reduce((sum, c) => sum + (c.produccionTotalKg + c.resumenFinanciero.detalleVentas.reduce((sumV, v) => sumV + v.cantidadVendida, 0)), 0).toLocaleString()} Kg</span>
                </div>
                <div class="kpi-card">
                    Inversión Total
                    <span class="kpi-value" style="color: #dc3545">${formatCurrency(
                        data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalInversion, 0) +
                        (data.pagos ? data.pagos.reduce((sum, p) => sum + Number(p.monto), 0) : 0)
                    )}</span>
                </div>
                <div class="kpi-card">
                    Ventas Totales
                    <span class="kpi-value" style="color: #28a745">${formatCurrency(data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalVentas, 0))}</span>
                </div>
                <div class="kpi-card">
                    Mano de Obra (Pasantes)
                    <span class="kpi-value" style="color: #dc3545">${formatCurrency(data.pagos ? data.pagos.reduce((sum, p) => sum + Number(p.monto), 0) : 0)}</span>
                </div>
                <div class="kpi-card">
                    Rentabilidad Neta
                    <span class="kpi-value ${(
                        data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalVentas, 0) -
                        (data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalInversion, 0) +
                         (data.pagos ? data.pagos.reduce((sum, p) => sum + Number(p.monto), 0) : 0))
                    ) >= 0 ? 'profit' : 'loss'}">
                        ${formatCurrency(
                            data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalVentas, 0) -
                            (data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalInversion, 0) +
                             (data.pagos ? data.pagos.reduce((sum, p) => sum + Number(p.monto), 0) : 0))
                        )}
                    </span>
                </div>
                <div class="kpi-card">
                    Inventario Pendiente
                    <span class="kpi-value">${data.cultivos.reduce((sum, c) => sum + (c.cosechas ? c.cosechas.reduce((sumCo, co) => sumCo + co.cantidadRestante, 0) : 0), 0).toLocaleString()} Kg</span>
                </div>
            </div>
            <div style="text-align: center; font-size: 12px; color: #6c757d;">
                <strong>Este reporte incluye todos los cultivos del lote, tanto los cultivados directamente como los de sublotes asociados.</strong>
                <br><small>Los pagos a pasantes están incluidos en la inversión total y afectan el cálculo de rentabilidad neta.</small>
            </div>
        </div>

        <!-- ==========================================
             SECCIÓN 2: PAGOS A PASANTES
             ========================================== -->
        <div class="card" style="margin-bottom: 20px; page-break-inside: avoid;">
            <h2 style="color: #2E7D32; margin-bottom: 15px; text-align: center;">💰 Pagos a Pasantes</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Pasante</th>
                        <th>Actividad</th>
                        <th>Cultivo</th>
                        <th>Horas</th>
                        <th>Tarifa/Hora</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.pagos && data.pagos.length > 0 ? data.pagos.map(p => `
                        <tr>
                            <td>${this.formatDateForDisplay(this.transformDateForDisplay(p.fecha))}</td>
                            <td>${p.pasante}</td>
                            <td>${p.actividad}</td>
                            <td>${p.cultivo}</td>
                            <td class="text-center">${p.horasTrabajadas}</td>
                            <td class="text-right">${formatCurrency(p.tarifaHora)}</td>
                            <td class="text-right">${formatCurrency(p.monto)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="7" style="text-align: center; color: #6c757d;">No hay pagos registrados en este período</td></tr>'}
                </tbody>
                ${data.pagos && data.pagos.length > 0 ? `
                <tfoot>
                    <tr style="border-top: 2px solid #2E7D32; background-color: #E8F5E9;">
                        <td colspan="6" style="text-align: center; font-weight: bold; color: #2E7D32;">TOTAL PAGOS A PASANTES</td>
                        <td class="text-right" style="font-weight: bold; color: #2E7D32;">${formatCurrency(data.pagos.reduce((sum, p) => sum + Number(p.monto), 0))}</td>
                    </tr>
                </tfoot>
                ` : ''}
            </table>
        </div>

        <!-- ==========================================
             SECCIÓN 3: DETALLE DE CULTIVOS INDIVIDUALES
             ========================================== -->
        ${data.cultivos.map(c => `
            <!-- === CULTIVO: ${c.nombre} === -->
            <div class="card" style="page-break-inside: avoid;">
                <div class="card-title">
                    🌱 ${c.nombre} (${c.tipo})
                    <span class="badge">${c.diasSembrado} días</span>
                    <span class="badge">${c.estadoActual}</span>
                </div>

                <div class="kpi-grid">
                    <div class="kpi-card">
                        Producción Total
                        <span class="kpi-value">${(c.produccionTotalKg + c.resumenFinanciero.detalleVentas.reduce((sum, v) => sum + v.cantidadVendida, 0)).toLocaleString()} Kg</span>
                    </div>
                    <div class="kpi-card">
                        Inversión Total
                        <span class="kpi-value" style="color: #dc3545">${formatCurrency(c.resumenFinanciero.totalInversion)}</span>
                    </div>
                    <div class="kpi-card">
                        Ventas Totales
                        <span class="kpi-value" style="color: #28a745">${formatCurrency(c.resumenFinanciero.totalVentas)}</span>
                    </div>
                    <div class="kpi-card">
                        Rentabilidad Neta
                        <span class="kpi-value ${c.resumenFinanciero.gananciaNeta >= 0 ? 'profit' : 'loss'}">
                            ${formatCurrency(c.resumenFinanciero.gananciaNeta)}
                        </span>
                    </div>
                </div>

                <h4 style="color: #2E7D32; margin-bottom: 10px;">🌾 Inventario de Cosechas (Pendiente por Vender)</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha de Cosecha</th>
                            <th>Inventario Restante</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${c.cosechas && c.cosechas.length > 0 ? c.cosechas.map(co => `
                            <tr>
                                <td>${this.formatDateForDisplay(this.transformDateForDisplay(co.fecha))}</td>
                                <td class="text-right ${co.cantidadRestante > 0 ? 'warning' : ''}">${co.cantidadRestante.toLocaleString()} Kg</td>
                                <td class="text-center">
                                    <span class="${co.estado === 'Pendiente' ? 'status-pending' : 'status-completed'}">
                                        ${co.estado}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align: center; color: #6c757d;">No hay registros de cosechas</td></tr>'}
                        ${c.cosechas && c.cosechas.length > 0 ? `
                            <tr style="border-top: 2px solid #2E7D32; background-color: #E8F5E9;">
                                <td style="text-align: center; font-weight: bold; color: #2E7D32;">INVENTARIO TOTAL PENDIENTE</td>
                                <td class="text-right" style="font-weight: bold; color: #2E7D32;">${c.cosechas.reduce((sum, co) => sum + co.cantidadRestante, 0).toLocaleString()} Kg</td>
                                <td></td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
                ${c.cosechas && c.cosechas.length > 0 ? `
                    <div style="margin-top: 10px; padding: 10px; background-color: #E8F5E9; border-radius: 5px; text-align: center;">
                        <strong style="color: #2E7D32;">
                            📦 Inventario Pendiente: ${c.cosechas.reduce((sum, co) => sum + co.cantidadRestante, 0).toLocaleString()} Kg sin vender
                            <br><small>(Estas cantidades aparecen detalladas en la sección de ventas)</small>
                        </strong>
                    </div>
                ` : ''}

                <div class="grid-2">
                    <div class="col">
                        <h4 style="color: #2E7D32; margin-bottom: 10px;">📦 Insumos Aplicados (Egresos)</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Material</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unit.</th>
                                    <th>Total Costo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${c.resumenFinanciero.detalleMateriales.map(m => `
                                    <tr>
                                        <td>${this.formatDateForDisplay(this.transformDateForDisplay(m.fecha))}</td>
                                        <td>${m.nombre}</td>
                                        <td class="text-right">${m.cantidad} ${m.unidad || 'unidad'}</td>
                                        <td class="text-right">${formatCurrency(m.precioUnitario)} <span style="font-size:8px; color:#888;">/${m.unidad || 'ud'}</span></td>
                                        <td class="text-right" style="color: #dc3545;">${formatCurrency(m.costoTotal)}</td>
                                    </tr>
                                `).join('')}
                                ${c.resumenFinanciero.detalleMateriales.length > 0 ? `
                                    <tr style="border-top: 2px solid #dc3545; background-color: #f8d7da;">
                                        <td colspan="4" style="text-align: center; font-weight: bold; color: #dc3545;">TOTAL INSUMOS (EGRESOS)</td>
                                        <td class="text-right" style="font-weight: bold; color: #dc3545;">
                                            ${formatCurrency(c.resumenFinanciero.detalleMateriales.reduce((sum, m) => sum + m.costoTotal, 0))}
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                        ${c.resumenFinanciero.detalleMateriales.length > 0 ? `
                            <div style="margin-top: 10px; padding: 10px; background-color: #f8d7da; border-radius: 5px; text-align: center; border-left: 4px solid #dc3545;">
                                <strong style="color: #dc3545;">
                                    💸 Costos de Insumos: ${formatCurrency(c.resumenFinanciero.detalleMateriales.reduce((sum, m) => sum + m.costoTotal, 0))}
                                    <br><small>(Estos costos se descuentan de la ganancia total)</small>
                                </strong>
                            </div>
                        ` : ''}
                    </div>

                    <div class="col">
                        <h4 style="color: #2E7D32; margin-bottom: 10px;">💰 Ventas Realizadas</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Descripción</th>
                                    <th>Cant. Vendida</th>
                                    <th>Precio Unit.</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${c.resumenFinanciero.detalleVentas.map(v => `
                                    <tr>
                                        <td>${this.formatDateForDisplay(this.transformDateForDisplay(v.fecha))}</td>
                                        <td>${v.descripcion}</td>
                                        <td class="text-right">${v.cantidadVendida} Kg</td>
                                        <td class="text-right">${formatCurrency(Number(v.precioUnitario))}</td>
                                        <td class="text-right">${formatCurrency(v.valorTotal)}</td>
                                    </tr>
                                `).join('')}
                                ${c.resumenFinanciero.detalleVentas.length > 0 ? `
                                    <tr style="border-top: 2px solid #2E7D32; background-color: #E8F5E9;">
                                        <td colspan="2" style="text-align: center; font-weight: bold; color: #2E7D32;">TOTAL VENTAS</td>
                                        <td class="text-right" style="font-weight: bold; color: #2E7D32;">
                                            ${c.resumenFinanciero.detalleVentas.reduce((sum, v) => sum + v.cantidadVendida, 0)} Kg
                                        </td>
                                        <td></td>
                                        <td class="text-right" style="font-weight: bold; color: #2E7D32;">
                                            ${formatCurrency(c.resumenFinanciero.detalleVentas.reduce((sum, v) => sum + v.valorTotal, 0))}
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                        ${c.resumenFinanciero.detalleVentas.length > 0 ? `
                            <div style="margin-top: 10px; padding: 10px; background-color: #E8F5E9; border-radius: 5px; text-align: center;">
                                <strong style="color: #2E7D32;">
                                    📊 Resumen: ${c.resumenFinanciero.detalleVentas.length} venta(s) | Total vendido: ${c.resumenFinanciero.detalleVentas.reduce((sum, v) => sum + v.cantidadVendida, 0)} Kg | Ingresos totales: ${formatCurrency(c.resumenFinanciero.detalleVentas.reduce((sum, v) => sum + v.valorTotal, 0))}
                                </strong>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h4 style="color: #2E7D32; margin-bottom: 15px; text-align: center;">💰 Balance Financiero Detallado</h4>
                    <table style="width: 100%; margin-bottom: 10px;">
                        <tr style="background-color: #28a745; color: white;">
                            <td style="padding: 10px; font-weight: bold; text-align: center;">INGRESOS</td>
                            <td style="padding: 10px; font-weight: bold; text-align: center;">EGRESOS</td>
                            <td style="padding: 10px; font-weight: bold; text-align: center;">RESULTADO</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; text-align: center; font-size: 16px; color: #28a745; font-weight: bold;">
                                ${formatCurrency(c.resumenFinanciero.totalVentas)}
                            </td>
                            <td style="padding: 10px; text-align: center; font-size: 16px; color: #dc3545; font-weight: bold;">
                                ${formatCurrency(c.resumenFinanciero.totalInversion)}
                            </td>
                            <td style="padding: 10px; text-align: center; font-size: 16px; font-weight: bold; ${c.resumenFinanciero.gananciaNeta >= 0 ? 'color: #28a745;' : 'color: #dc3545;'}">
                                ${formatCurrency(c.resumenFinanciero.gananciaNeta)}
                            </td>
                        </tr>
                    </table>
                    <div style="font-size: 12px; color: #6c757d; text-align: center; margin-top: 10px;">
                        <strong>Desglose de Egresos:</strong><br>
                        Insumos: ${formatCurrency(c.resumenFinanciero.detalleMateriales.reduce((sum, m) => sum + m.costoTotal, 0))} |
                        Mano de Obra: ${formatCurrency(c.actividadesLog.reduce((sum, a) => sum + a.costoManoObra, 0))} |
                        Otros Gastos: ${formatCurrency(c.resumenFinanciero.detalleGastos.reduce((sum, g) => sum + Number(g.monto), 0))}
                        <br><br>
                        <strong style="color: #2E7D32;">Fórmula de Ganancia Neta:</strong><br>
                        <em>Ingresos Totales - (Insumos + Mano de Obra + Otros Gastos) = ${formatCurrency(c.resumenFinanciero.gananciaNeta)}</em>
                    </div>
                </div>

                <h4 style="color: #2E7D32; margin-bottom: 10px;">📋 Auditoría de Actividades</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tarea</th>
                            <th>Responsable</th>
                            <th>Horas</th>
                            <th>Costo Mano Obra</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${c.actividadesLog.map(a => `
                            <tr>
                                <td>${this.formatDateForDisplay(this.transformDateForDisplay(a.fecha))}</td>
                                <td>${a.tarea}</td>
                                <td>${a.responsable}</td>
                                <td class="text-center">${a.horasTrabajadas}h</td>
                                <td class="text-right">${formatCurrency(a.costoManoObra)}</td>
                                <td class="text-center">
                                    <span class="${a.cumplida ? 'status-completed' : 'status-pending'}">
                                        ${a.estado}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}

        <!-- ==========================================
             SECCIÓN 4: MONITOREO Y ANÁLISIS DE SENSORES IoT
             ========================================== -->
        <div class="section-break"></div>

        <h2 style="color: #1B5E20; margin-top: 30px; text-align: center; border-bottom: 2px solid #2E7D32; padding-bottom: 10px;">
            📊 Monitoreo y Análisis de Sensores IoT
        </h2>
        <p style="font-size: 10px; color: #666; margin-bottom: 15px; text-align: center;">
            Sistema de monitoreo continuo para la toma de decisiones preventivas y gestión agrícola.
        </p>

        ${Object.entries(data.sensores).map(([sensor, info]: [string, any], sensorIndex) => {
            // 1. OBTENER EL ÚLTIMO VALOR REAL (TIEMPO REAL - Inyectado desde backend)
            let ultimoRegistro = null;
            let ultimoValor = 0;
            let fechaUltimo = 'Sin datos';

            // ✅ PRIORIDAD: Usar el dato real inyectado desde el backend
            if (info.ultimoRegistro) {
                ultimoRegistro = info.ultimoRegistro;
                ultimoValor = Number(info.ultimoRegistro.valor);
                fechaUltimo = this.formatDateForDisplay(this.transformDateForDisplay(info.ultimoRegistro.fecha)) || 'Sin fecha';
            } else {
                // Fallback: Intentar extraer de arrays históricos (solo si no hay dato real)
                if (info.muestreoDiario && info.muestreoDiario.length > 0) {
                    const diasOrdenados = info.muestreoDiario.sort((a, b) => new Date(b.dia).getTime() - new Date(a.dia).getTime());
                    const ultimoDia = diasOrdenados[0];
                    if (ultimoDia && ultimoDia.datos && ultimoDia.datos.length > 0) {
                        const datosOrdenados = ultimoDia.datos.sort((a, b) =>
                            new Date(b.hora || b.fecha || 0).getTime() - new Date(a.hora || a.fecha || 0).getTime()
                        );
                        ultimoRegistro = datosOrdenados[0];
                        ultimoValor = ultimoRegistro ? Number((ultimoRegistro as any).valor) : 0;
                        fechaUltimo = ultimoRegistro ? (this.formatDateForDisplay(this.transformDateForDisplay((ultimoRegistro as any).hora || (ultimoRegistro as any).fecha)) || 'N/A') : 'N/A';
                    }
                }

                // Último fallback: usar promedio histórico
                if (!ultimoRegistro) {
                    ultimoValor = info.stats.promedio || 0;
                    fechaUltimo = 'Datos históricos';
                }
            }

            // 2. DIAGNÓSTICO BASADO EN ÚLTIMO VALOR Y UMBRALES CONFIGURADOS
            const diagnosis = generarDiagnostico(sensor, info.stats.promedio, info.stats.maximo, info.stats.minimo, ultimoValor, info.unidad, info.umbralMinimo, info.umbralMaximo);

            // 3. PREPARAR DATOS PARA LA GRÁFICA DE DATOS CRUDOS
            const datosGrafica = (info.historialDetallado || [])
                .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            const etiquetasFechas = datosGrafica.map(d => this.formatDateForDisplay(this.transformDateForDisplay(d.fecha)) || '');
            const valoresDatos = datosGrafica.map(d => Number(d.valor));

            // ID único para el canvas de este sensor
            const chartId = `chart_${sensorIndex}`;

            // Valores que excedieron umbrales
            const valoresSobreUmbralMax = info.valoresSobreUmbralMax ? info.valoresSobreUmbralMax.slice(0, 10) : [];
            const valoresBajoUmbralMin = info.valoresBajoUmbralMin ? info.valoresBajoUmbralMin.slice(0, 10) : [];

            return `
            <div class="card">
                <div class="card-title">
                    ${info.esBomba ? '💧' : '📡'} ${sensor} ${info.esBomba ? '<span style="font-size:12px; color:#666;">(Actuador de Riego)</span>' : ''}
                    <span style="font-size: 12px; color: #555;">${info.stats.totalRegistros} registros</span>
                </div>

                <div class="kpi-grid">
                    ${info.esBomba ? `
                        <div class="kpi-box">
                            <span class="kpi-value">${info.ciclosRiego ? info.ciclosRiego.length : 0}</span>
                            <span class="kpi-label">Veces Encendida</span>
                        </div>
                        <div class="kpi-box">
                            <span class="kpi-value">${info.stats.totalRegistros}</span>
                            <span class="kpi-label">Puntos de Datos</span>
                        </div>
                        <div class="kpi-box" style="background-color: ${info.stats.promedio > 0 ? '#e3f2fd' : '#f8f9fa'}">
                            <span class="kpi-value">${info.stats.promedio > 0 ? 'ACTIVA' : 'INACTIVA'}</span>
                            <span class="kpi-label">Estado Promedio</span>
                        </div>
                    ` : `
                        <div class="kpi-card" style="border: 2px solid ${diagnosis.nivel === 'critico' ? '#d32f2f' : (diagnosis.nivel === 'alerta' ? '#f57c00' : '#2E7D32')}; background-color: #fff;">
                            <span class="kpi-label" style="font-weight:bold; color:#333;">LECTURA ACTUAL</span>
                            <span class="kpi-value" style="font-size: 22px; color: ${diagnosis.nivel === 'critico' ? '#d32f2f' : '#333'};">
                                ${info.esBomba ? (ultimoValor == 1 ? 'Encendido' : 'Apagado') : (sensor.toLowerCase().includes('luz') || sensor.toLowerCase().includes('radiacion') ? Math.floor(ultimoValor) : ultimoValor) + ' ' + info.unidad}
                            </span>
                            <span style="font-size: 10px; color: #666;">
                                ${fechaUltimo}
                            </span>
                        </div>

                        <div class="kpi-card">
                            <span class="kpi-label">Mínimo Histórico</span>
                            <span class="kpi-value" style="color: #1976d2;">${(sensor.toLowerCase().includes('luz') || sensor.toLowerCase().includes('radiacion')) ? Math.floor(info.stats.minimo) : info.stats.minimo} ${info.unidad}</span>
                        </div>
                        <div class="kpi-card">
                            <span class="kpi-label">Promedio Global</span>
                            <span class="kpi-value">${(sensor.toLowerCase().includes('luz') || sensor.toLowerCase().includes('radiacion')) ? Math.floor(info.stats.promedio) : info.stats.promedio} ${info.unidad}</span>
                        </div>
                        <div class="kpi-card">
                            <span class="kpi-label">Máximo Histórico</span>
                            <span class="kpi-value" style="color: #d32f2f;">${(sensor.toLowerCase().includes('luz') || sensor.toLowerCase().includes('radiacion')) ? Math.floor(info.stats.maximo) : info.stats.maximo} ${info.unidad}</span>
                        </div>
                    `}
                </div>

                ${!info.esBomba ? `
                <div class="diagnosis-box diagnosis-${diagnosis.nivel}">
                    <div style="display: flex; gap: 10px; align-items: start;">
                        <div style="font-size: 20px;">${diagnosis.nivel === 'critico' ? '🚨' : (diagnosis.nivel === 'alerta' ? '⚠️' : '✅')}</div>
                        <div>
                            <span style="font-weight: bold; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 2px;">ANÁLISIS Y ACCIÓN REQUERIDA:</span>
                            <strong>Conclusión:</strong> ${diagnosis.mensaje}<br>
                            <strong>Acción Inmediata:</strong> ${diagnosis.accion}
                        </div>
                    </div>
                </div>` : ''}

                <!-- GRÁFICA DE DATOS CRUDOS -->
                <div style="margin-top: 15px; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px; background-color: #f8f9fa;">
                    <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #2E7D32;">📈 Evolución de Datos Crudos (Historial Completo)</h4>
                    <p style="font-size: 8px; color: #666; margin: 0 0 10px 0;">Visualización de todos los registros del sensor para análisis detallado.</p>
                    <div class="chart-container">
                        <canvas id="${chartId}"></canvas>
                    </div>
                </div>

                <div class="grid-2" style="margin-top: 15px;">
                    <div class="col">
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #d32f2f;">⚠️ Valores sobre Umbral Máximo ${info.umbralMaximo ? `(${info.umbralMaximo}${info.unidad})` : '(Sin umbral configurado)'}</h4>
                        <table>
                            <thead><tr><th>Fecha</th><th class="text-right">Valor</th></tr></thead>
                            <tbody>
                                ${valoresSobreUmbralMax.length > 0 ? valoresSobreUmbralMax.map(d => `
                                    <tr>
                                        <td>${this.formatDateForDisplay(this.transformDateForDisplay(d.fecha)) || ''}</td>
                                        <td class="text-right"><span style="background: #ffebee; color: #c62828; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${d.valor}</span></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="2" style="text-align: center; color: #6c757d;">Sin valores sobre umbral</td></tr>'}
                            </tbody>
                        </table>

                        <h4 style="margin: 10px 0 5px 0; font-size: 11px; color: #1976d2;">⚠️ Valores bajo Umbral Mínimo ${info.umbralMinimo ? `(${info.umbralMinimo}${info.unidad})` : '(Sin umbral configurado)'}</h4>
                        <table>
                            <thead><tr><th>Fecha</th><th class="text-right">Valor</th></tr></thead>
                            <tbody>
                                ${valoresBajoUmbralMin.length > 0 ? valoresBajoUmbralMin.map(d => `
                                    <tr>
                                        <td>${this.formatDateForDisplay(this.transformDateForDisplay(d.fecha)) || ''}</td>
                                        <td class="text-right"><span style="background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${d.valor}</span></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="2" style="text-align: center; color: #6c757d;">Sin valores bajo umbral</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="col">
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #2E7D32;">📅 Últimos 10 Registros</h4>
                        <p style="font-size: 9px; color: #777; margin: 0 0 5px 0;">Los registros más recientes para monitoreo en tiempo real.</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th class="text-center">Valor</th>
                                    <th class="text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                                     // 🔥 USAR LA NUEVA LISTA DIRECTA
                                     let listaRegistros = info.ultimos10 || [];

                                     if (listaRegistros.length === 0) {
                                         return '<tr><td colspan="3" style="text-align: center; color: #6c757d;">No hay registros recientes</td></tr>';
                                     }

                                     return listaRegistros.map(r => {
                                         let estadoColor = '#28a745'; // Verde para Normal
                                         let estadoTexto = r.estado || 'Normal';

                                         if (estadoTexto === 'Alto') estadoColor = '#dc3545'; // Rojo
                                         if (estadoTexto === 'Bajo') estadoColor = '#ffc107'; // Amarillo

                                         return `
                                             <tr>
                                                 <td>${this.formatDateForDisplay(this.transformDateForDisplay(r.fecha)) || ''}</td>
                                                 <td class="text-center"><strong>${info.esBomba ? (r.valor == 1 ? 'Encendido' : 'Apagado') : r.valor + ' ' + info.unidad}</strong></td>
                                                 <td class="text-center">
                                                     <span style="background-color: ${estadoColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">
                                                         ${estadoTexto}
                                                     </span>
                                                 </td>
                                             </tr>
                                         `;
                                     }).join('');
                                 })()}
                             </tbody>
                         </table>
                    </div>
                </div>

                <div style="margin-top: 15px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #2E7D32;">📈 Evolución Diaria (Promedios)</h4>
                    <p style="font-size: 9px; color: #777; margin: 0 0 5px 0;">Resumen día a día para análisis de tendencias.</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th class="text-center">Promedio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${info.muestreoDiario.map((d, index, arr) => {
                                // Calcular promedio simple de los datos del día
                                let prom = 0;
                                if (d.promedioCalculado) {
                                    prom = d.promedioCalculado;
                                } else if (d.datos && d.datos.length > 0) {
                                    prom = d.datos.reduce((acc, curr) => acc + Number(curr.valor), 0) / d.datos.length;
                                }

                                return `
                                <tr>
                                     <td>${this.formatDateForDisplay(this.transformDateForDisplay(d.dia))}</td>
                                     <td class="text-center"><strong>${prom.toFixed(1)} ${info.unidad}</strong></td>
                                 </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 25px; border-top: 1px solid #dee2e6; padding-top: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 12px; color: #455a64; text-transform: uppercase;">
                        📋 Historial Detallado de Mediciones (${info.stats.totalRegistros} registros)
                    </h4>

                    <table style="width: 100%; font-size: 9px;">
                        <thead>
                            <tr style="background-color: #eceff1;">
                                <th style="padding: 4px;">Fecha</th>
                                <th style="padding: 4px;">Hora</th>
                                <th style="padding: 4px; text-align: right;">Valor Registrado</th>
                                <th style="padding: 4px; text-align: center;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
                                const historial = info.historialDetallado || [];

                                if (historial.length === 0) {
                                    return '<tr><td colspan="4" style="text-align: center; padding: 10px;">No hay datos en este periodo</td></tr>';
                                }

                                // Limitamos a 500 registros por seguridad de renderizado PDF,
                                // mostramos los últimos 500 registros (más recientes)
                                const limiteVisualizacion = historial.slice(-500);

                                return limiteVisualizacion.map((r, idx) => {
                                    const fechaObj = this.transformDateForDisplay(r.fecha);
                                    const fechaStr = fechaObj?.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) || '';
                                    const horaStr = fechaObj?.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '';

                                    // Determinar si el valor es anómalo para colorearlo
                                    let colorStyle = "";
                                    if (info.umbralMaximo && r.valor > info.umbralMaximo) colorStyle = "color: #d32f2f; font-weight: bold;";
                                    if (info.umbralMinimo && r.valor < info.umbralMinimo) colorStyle = "color: #1976d2; font-weight: bold;";

                                    return `
                                    <tr style="background-color: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
                                        <td style="padding: 3px; border-bottom: 1px solid #eee;">${fechaStr}</td>
                                        <td style="padding: 3px; border-bottom: 1px solid #eee;">${horaStr}</td>
                                        <td style="padding: 3px; text-align: right; border-bottom: 1px solid #eee; ${colorStyle}">
                                            ${info.esBomba ? (r.valor == 1 ? 'Encendido' : 'Apagado') : r.valor + ' ' + info.unidad}
                                        </td>
                                        <td style="padding: 3px; text-align: center; border-bottom: 1px solid #eee;">
                                            ${colorStyle ? '⚠️' : 'OK'}
                                        </td>
                                    </tr>
                                    `;
                                }).join('');
                            })()}
                        </tbody>
                    </table>
                    ${(info.historialDetallado && info.historialDetallado.length > 500)
                        ? `<p style="text-align: center; font-style: italic; color: #777;">... mostrando los últimos 500 registros de ${info.historialDetallado.length} ...</p>`
                        : ''}
                </div>

                <script>
                  (function() {
                    const ctx = document.getElementById('${chartId}').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(etiquetasFechas)},
                            datasets: [{
                                label: '${info.esBomba ? 'Estado de la Bomba' : 'Medición (${info.unidad})'}',
                                data: ${JSON.stringify(valoresDatos)},
                                borderColor: '${info.esBomba ? '#0288d1' : '#2E7D32'}',
                                backgroundColor: '${info.esBomba ? 'rgba(2, 136, 209, 0.2)' : 'rgba(46, 125, 50, 0.1)'}',
                                borderWidth: 2,
                                pointRadius: 0,
                                fill: true,
                                stepper: ${info.esBomba ? 'true' : 'false'},
                                tension: ${info.esBomba ? 0 : 0.1}
                            }]
                        },
                        options: {
                            animation: false,
                            responsive: true,
                            maintainAspectRatio: false,
                            elements: {
                                line: {
                                    tension: 0,
                                    stepped: ${info.esBomba}
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                title: { display: false }
                            },
                            scales: {
                                x: {
                                    display: false,
                                    grid: { display: false }
                                },
                                y: {
                                    beginAtZero: true,
                                    ${info.esBomba ? 'max: 1.5, ticks: { stepSize: 1, callback: function(value) { return value === 1 ? "Encendido" : "Apagado"; } }' : ''}
                                    grid: { color: '#f0f0f0' }
                                }
                            }
                        }
                    });
                  })();
                </script>

                ${info.esBomba && info.ciclosRiego && info.ciclosRiego.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #0277bd; text-transform: uppercase;">
                            🚿 Bitácora de Riego (Encendidos detectados)
                        </h4>
                        <table style="width: 100%; border: 1px solid #b3e5fc;">
                            <thead>
                                <tr style="background-color: #e1f5fe;">
                                    <th style="color: #01579b;">Inicio Riego</th>
                                    <th style="color: #01579b;">Fin Riego</th>
                                    <th style="color: #01579b;">Duración</th>
                                    <th style="color: #01579b;">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${info.ciclosRiego.slice(0, 15).map(ciclo => `
                                    <tr>
                                        <td>${this.transformDateForDisplay(ciclo.inicio)?.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
                                        <td>${this.transformDateForDisplay(ciclo.fin)?.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}</td>
                                        <td style="font-weight:bold;">${ciclo.duracion}</td>
                                        <td style="color: green;">✅ Completado</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${info.ciclosRiego.length > 15 ? '<p style="font-size:9px; text-align:center;">... más registros omitidos ...</p>' : ''}
                    </div>
                ` : ''}
            </div>
            `;
       }).join('')}

        <!-- ==========================================
             PIE DE PÁGINA: NOTAS FINALES Y PAGINACIÓN
             ========================================== -->
        <div class="footer">
            <p>⚠️ Este reporte es una herramienta de apoyo. Verifique siempre las condiciones en campo antes de aplicar correctivos mayores.</p>
            <p>AgroTech - Sistema de Gestión y Monitoreo - Generado el ${this.formatDateForDisplay(this.transformDateForDisplay(data.fechaGeneracion))}</p>
        </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

    // ==========================================
    // CONFIGURACIÓN DE PROPORCIONES DEL PDF:
    // ==========================================
    // PÁGINA 1: Header grande (contenido) + Body + Footer
    // PÁGINAS 2+: Body 90% + Footer 10% (sin header)
    // ==========================================
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: '10px',    // Margen mínimo para maximizar espacio del body en páginas 2+
        right: '20px',
        bottom: '40px', // 5% para footer en todas las páginas
        left: '20px'
      },
      headerTemplate: `<div></div>`, // Header vacío para páginas siguientes (2+)
      footerTemplate: `
        <div style="width: 100%; height: 40px; padding: 4px 15px; font-family: Arial, sans-serif; display: flex; justify-content: space-between; align-items: flex-start; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-top: 2px solid #2E7D32;">
          <div style="flex: 1; text-align: left; font-size: 8px; color: #666;">
            <div style="margin-bottom: 2px;"><strong>AgroTech - Sistema de Gestión y Monitoreo</strong></div>
            <div style="margin-bottom: 1px;">Reporte General de Lote: ${data.lote}</div>
            <div style="font-size: 7px; color: #888;">Generado: ${this.formatDateForDisplay(this.transformDateForDisplay(data.fechaGeneracion))}</div>
          </div>
          <div style="flex-shrink: 0; text-align: center; font-size: 10px; color: #2E7D32; font-weight: bold;">
            <div style="font-size: 12px; margin-bottom: 2px;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
            <div style="font-size: 8px; color: #666;">Agrotech</div>
          </div>
        </div>
      `
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}