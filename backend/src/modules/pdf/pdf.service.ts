import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { Venta } from '../ventas/entities/venta.entity';

@Injectable()
export class PdfService {
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
                <h1>AgroTIC Yamboró</h1>
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
    html = html.replace('{{fecha}}', new Date(venta.fecha).toLocaleDateString('es-ES'));
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
   * Genera una URL de imagen para el gráfico usando QuickChart.io
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

  async generarReporteTrazabilidad(data: any): Promise<Buffer> {

    // --- 🧠 FUNCIÓN DE DIAGNÓSTICO INTELIGENTE (PRIORIDAD: ÚLTIMO VALOR + UMBRALES PERSONALIZADOS) ---
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
            const umbralCriticoBajo = umbralMin || 200;
            const umbralAlertaAlto = umbralMax || 800;

            if (valorEvaluar === 0) {
                 mensaje = `⚠️ Aviso: Sensor marca 0.0${unidad} (Oscuridad total o fallo).`;
                 accion = "Verificar si es de noche o revisar sensor.";
                 nivel = "alerta";
            } else if (valorEvaluar < umbralCriticoBajo) {
                mensaje = `⚠️ Baja luminosidad actual (${valorEvaluar}${unidad}).`;
                accion = "Revisar sombras u obstrucciones.";
                nivel = "alerta";
            } else if (valorEvaluar > umbralAlertaAlto) {
                mensaje = `⚠️ Exceso de radiación (${valorEvaluar}${unidad}).`;
                accion = "Evaluar protección solar.";
                nivel = "alerta";
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
                accion = "Sin acciones.";
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

    // --- ✅ FUNCIÓN HELPER PARA PRECIOS PEQUEÑOS ---
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
        <style>
            body {
                font-family: 'Arial', sans-serif;
                color: #333;
                font-size: 11px;
                margin: 20px;
                line-height: 1.4;
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #2E7D32;
                margin-bottom: 30px;
                padding-bottom: 20px;
            }
            .header h1 {
                margin: 0;
                color: #1B5E20;
                font-size: 24px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .header p {
                margin: 5px 0;
                font-size: 14px;
                color: #555;
            }

            .card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                page-break-inside: avoid;
            }

            .card-title {
                font-size: 18px;
                font-weight: bold;
                color: #2E7D32;
                border-bottom: 2px solid #2E7D32;
                padding-bottom: 8px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
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
                font-size: 10px;
                margin-top: 8px;
            }

            th {
                background-color: #f8f9fa;
                color: #495057;
                font-weight: bold;
                padding: 8px 6px;
                border-bottom: 2px solid #dee2e6;
                text-align: left;
                font-size: 9px;
            }

            td {
                padding: 6px;
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
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #dee2e6;
            }

            .kpi-value {
                font-size: 18px;
                font-weight: bold;
                display: block;
                margin-top: 5px;
            }

            .section-break {
                page-break-before: always;
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
        <div class="header">
            <h1>Reporte de Trazabilidad y Gestión - AgroTech</h1>
            <p><strong>Lote:</strong> ${data.lote} | <strong>Cultivos incluidos:</strong> ${data.cultivos.length} | <strong>Periodo:</strong> ${data.rango}</p>
            <p><strong>Generado el:</strong> ${new Date(data.fechaGeneracion).toLocaleString('es-ES')}</p>
        </div>

        <div class="card" style="margin-bottom: 20px; background-color: #f8f9fa;">
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
                    <span class="kpi-value" style="color: #dc3545">${formatCurrency(data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalInversion, 0))}</span>
                </div>
                <div class="kpi-card">
                    Ventas Totales
                    <span class="kpi-value" style="color: #28a745">${formatCurrency(data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.totalVentas, 0))}</span>
                </div>
                <div class="kpi-card">
                    Rentabilidad Neta
                    <span class="kpi-value ${data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.gananciaNeta, 0) >= 0 ? 'profit' : 'loss'}">
                        ${formatCurrency(data.cultivos.reduce((sum, c) => sum + c.resumenFinanciero.gananciaNeta, 0))}
                    </span>
                </div>
                <div class="kpi-card">
                    Inventario Pendiente
                    <span class="kpi-value">${data.cultivos.reduce((sum, c) => sum + (c.cosechas ? c.cosechas.reduce((sumCo, co) => sumCo + co.cantidadRestante, 0) : 0), 0).toLocaleString()} Kg</span>
                </div>
            </div>
            <div style="text-align: center; font-size: 12px; color: #6c757d;">
                <strong>Este reporte incluye todos los cultivos del lote, tanto los cultivados directamente como los de sublotes asociados.</strong>
            </div>
        </div>

        ${data.cultivos.map(c => `
            <div class="card">
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
                                <td>${new Date(co.fecha).toLocaleDateString('es-ES')}</td>
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
                                        <td>${new Date(m.fecha).toLocaleDateString('es-ES')}</td>
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
                                        <td>${new Date(v.fecha).toLocaleDateString('es-ES')}</td>
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
                                <td>${new Date(a.fecha).toLocaleDateString('es-ES')}</td>
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

        <div class="section-break"></div>

        <h2 style="color: #1B5E20; margin-top: 30px; text-align: center; border-bottom: 2px solid #2E7D32; padding-bottom: 10px;">
            📡 Análisis Profundo de Sensores y Clima
        </h2>
        <p style="font-size: 10px; color: #666; margin-bottom: 15px; text-align: center;">
            Este análisis permite identificar eventos extremos y tendencias para la toma de decisiones preventivas.
        </p>

        ${Object.entries(data.sensores).map(([sensor, info]: [string, any]) => {
            // 1. OBTENER EL ÚLTIMO VALOR REAL (TIEMPO REAL - Inyectado desde backend)
            let ultimoRegistro = null;
            let ultimoValor = 0;
            let fechaUltimo = 'Sin datos';

            // ✅ PRIORIDAD: Usar el dato real inyectado desde el backend
            if (info.ultimoRegistro) {
                ultimoRegistro = info.ultimoRegistro;
                ultimoValor = Number(info.ultimoRegistro.valor);
                fechaUltimo = new Date(info.ultimoRegistro.fecha).toLocaleString('es-ES');
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
                        fechaUltimo = ultimoRegistro ? new Date((ultimoRegistro as any).hora || (ultimoRegistro as any).fecha).toLocaleString('es-ES') : 'N/A';
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

            // Simulación de "Top 10" combinando lo que tenemos si no viene crudo
            const top10Max = info.picosAltos ? info.picosAltos.slice(0, 10) : [];
            const top10Min = info.picosBajos ? info.picosBajos.slice(0, 10) : [];

            return `
            <div class="card">
                <div class="card-title">
                    <span>📊 ${sensor} (${info.unidad})</span>
                    <span style="font-size: 12px; color: #555;">${info.stats.totalRegistros} registros</span>
                </div>

                <div class="kpi-grid">
                    <div class="kpi-card" style="border: 2px solid ${diagnosis.nivel === 'critico' ? '#d32f2f' : (diagnosis.nivel === 'alerta' ? '#f57c00' : '#2E7D32')}; background-color: #fff;">
                        <span class="kpi-label" style="font-weight:bold; color:#333;">LECTURA ACTUAL</span>
                        <span class="kpi-value" style="font-size: 22px; color: ${diagnosis.nivel === 'critico' ? '#d32f2f' : '#333'};">
                            ${ultimoValor} ${info.unidad}
                        </span>
                        <span style="font-size: 10px; color: #666;">
                            ${fechaUltimo}
                        </span>
                    </div>

                    <div class="kpi-card">
                        <span class="kpi-label">Mínimo Histórico</span>
                        <span class="kpi-value" style="color: #1976d2;">${info.stats.minimo} ${info.unidad}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Promedio Global</span>
                        <span class="kpi-value">${info.stats.promedio} ${info.unidad}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Máximo Histórico</span>
                        <span class="kpi-value" style="color: #d32f2f;">${info.stats.maximo} ${info.unidad}</span>
                    </div>
                </div>

                <div class="diagnosis-box diagnosis-${diagnosis.nivel}">
                    <div style="display: flex; gap: 10px; align-items: start;">
                        <div style="font-size: 20px;">${diagnosis.nivel === 'critico' ? '🚨' : (diagnosis.nivel === 'alerta' ? '⚠️' : '✅')}</div>
                        <div>
                            <span style="font-weight: bold; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 2px;">ANÁLISIS Y ACCIÓN REQUERIDA:</span>
                            <strong>Conclusión:</strong> ${diagnosis.mensaje}<br>
                            <strong>Acción Inmediata:</strong> ${diagnosis.accion}
                        </div>
                    </div>
                </div>

                <div class="grid-2" style="margin-top: 15px;">
                    <div class="col">
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #d32f2f;">🔥 Top 10 Valores Máximos</h4>
                        <table>
                            <thead><tr><th>Fecha</th><th class="text-right">Valor</th></tr></thead>
                            <tbody>
                                ${top10Max.length > 0 ? top10Max.map(d => `
                                    <tr>
                                        <td>${new Date(d.fecha).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</td>
                                        <td class="text-right"><span style="background: #ffebee; color: #c62828; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${d.valor}</span></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="2">Datos insuficientes</td></tr>'}
                            </tbody>
                        </table>

                        <h4 style="margin: 10px 0 5px 0; font-size: 11px; color: #1976d2;">❄️ Top 10 Valores Mínimos</h4>
                        <table>
                            <thead><tr><th>Fecha</th><th class="text-right">Valor</th></tr></thead>
                            <tbody>
                                ${top10Min.length > 0 ? top10Min.map(d => `
                                    <tr>
                                        <td>${new Date(d.fecha).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</td>
                                        <td class="text-right"><span style="background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${d.valor}</span></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="2">Datos insuficientes</td></tr>'}
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
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                                    // Obtener los últimos 10 registros de cualquier fuente disponible
                                    let ultimosRegistros: Array<{fecha: string | Date, valor: number}> = [];

                                    // Intentar obtener de muestreoDiario primero (datos más recientes)
                                    if (info.muestreoDiario && info.muestreoDiario.length > 0) {
                                        // Tomar los datos más recientes de los últimos días
                                        const datosRecientes = info.muestreoDiario
                                            .sort((a, b) => new Date(b.dia).getTime() - new Date(a.dia).getTime())
                                            .slice(0, 3) // Últimos 3 días
                                            .flatMap(d => d.datos || [])
                                            .sort((a, b) => new Date(b.hora || b.fecha || 0).getTime() - new Date(a.hora || a.fecha || 0).getTime())
                                            .slice(0, 10);

                                        ultimosRegistros = datosRecientes.map(d => ({
                                            fecha: d.fecha || `${d.dia} ${d.hora}`,
                                            valor: Number(d.valor)
                                        }));
                                    }

                                    // Si no hay datos en muestreoDiario, intentar con picosAltos/picosBajos
                                    if (ultimosRegistros.length === 0) {
                                        const todosLosDatos: Array<{fecha: string | Date, valor: number}> = [
                                            ...(info.picosAltos || []).map(d => ({ fecha: d.fecha, valor: d.valor })),
                                            ...(info.picosBajos || []).map(d => ({ fecha: d.fecha, valor: d.valor }))
                                        ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                        .slice(0, 10);

                                        ultimosRegistros = todosLosDatos;
                                    }

                                    // Si aún no hay datos, mostrar mensaje
                                    if (ultimosRegistros.length === 0) {
                                        return '<tr><td colspan="2" style="text-align: center; color: #6c757d;">No hay registros recientes</td></tr>';
                                    }

                                    return ultimosRegistros.map(r => `
                                        <tr>
                                            <td>${new Date(r.fecha).toLocaleString('es-ES', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</td>
                                            <td class="text-center"><strong>${r.valor} ${info.unidad}</strong></td>
                                        </tr>
                                    `).join('');
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
                                <th class="text-center">Tendencia</th>
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

                                // Flecha de tendencia vs día anterior
                                let icon = "➖";
                                if (index > 0) {
                                    const prevProm = arr[index-1].promedioCalculado || 0;
                                    if (prom > prevProm) icon = "↗️";
                                    if (prom < prevProm) icon = "↘️";
                                }

                                return `
                                <tr>
                                    <td>${new Date(d.dia).toLocaleDateString('es-ES')}</td>
                                    <td class="text-center"><strong>${prom.toFixed(1)} ${info.unidad}</strong></td>
                                    <td class="text-center">${icon}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            `;
        }).join('')}

        <div class="footer">
            <p>⚠️ Este reporte es una herramienta de apoyo. Verifique siempre las condiciones en campo antes de aplicar correctivos mayores.</p>
            <p>AgroTech System - Generado el ${new Date().toLocaleString()}</p>
        </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Aumentamos el timeout porque cargar las imágenes de QuickChart requiere internet y unos segundos
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}