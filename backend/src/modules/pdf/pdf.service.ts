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
    // Colores para las gráficas dinámicas
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];
    let colorIndex = 0;
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: sans-serif; margin: 40px; color: #333; font-size: 12px; }
            .container { border: 1px solid #eee; padding: 30px; }
            .header { text-align: center; margin-bottom: 40px; }
            .header h1 { margin: 0; color: #2E7D32; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #2E7D32; border-bottom: 2px solid #2E7D32; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f9f9f9; font-weight: bold; }
            .total { font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Informe de Trazabilidad Integral - AgroTech</h1>
                <p>Lote: ${data.loteNombre} | Rango: ${data.fechaInicio} - ${data.fechaFin}</p>
            </div>

            <div class="section">
                <h2>Resumen Ejecutivo</h2>
                <table>
                    <tr><th>Total Cultivos</th><td>${data.resumen.totalCultivos}</td></tr>
                    <tr><th>Días Sembrado</th><td>${data.resumen.diasSembrado}</td></tr>
                    <tr><th>Producción Total</th><td>${data.resumen.totalProduccionKg} Kg</td></tr>
                    <tr><th>Total Inversión</th><td>$${data.resumen.totalInversion.toLocaleString('es-CO')}</td></tr>
                    <tr><th>Total Ventas</th><td>$${data.resumen.totalVentas.toLocaleString('es-CO')}</td></tr>
                    <tr><th>Ganancia Neta</th><td class="total">$${data.resumen.gananciaNeta.toLocaleString('es-CO')}</td></tr>
                </table>
            </div>

            <div class="section">
                <h2>Cultivos en el Lote</h2>
                <table>
                    <thead>
                        <tr><th>Nombre</th><th>Tipo</th><th>Fecha Siembra</th><th>Producción Total</th></tr>
                    </thead>
                    <tbody>
                        ${data.cultivos.map(c => `
                            <tr>
                                <td>${c.nombre}</td>
                                <td>${c.tipo}</td>
                                <td>${new Date(c.fechaSiembra).toLocaleDateString('es-ES')}</td>
                                <td>${c.produccionTotal} Kg</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h2>Análisis de Sensores</h2>
                ${Object.keys(data.datosSensores).length === 0 ? '<p>No hay datos de sensores disponibles para este rango.</p>' : ''}

                ${Object.entries(data.datosSensores).map(([sensor, datos]: [string, any]) => `
                    <h3>Sensor: ${sensor}</h3>
                    <table>
                        <tr><th>Unidad</th><td>${datos.unidad}</td></tr>
                        <tr><th>Mínimo</th><td>${datos.estadisticas.minimo}</td></tr>
                        <tr><th>Máximo</th><td>${datos.estadisticas.maximo}</td></tr>
                        <tr><th>Promedio</th><td>${datos.estadisticas.promedio}</td></tr>
                        <tr><th>Total Registros</th><td>${datos.totalRegistros}</td></tr>
                    </table>

                    <h4>Top 5 Valores Más Altos</h4>
                    <table>
                        <thead><tr><th>Fecha</th><th>Valor</th></tr></thead>
                        <tbody>${datos.picosAltos.slice(0,5).map(p => `<tr><td>${new Date(p.fechaRegistro).toLocaleString()}</td><td>${p.valor}</td></tr>`).join('')}</tbody>
                    </table>

                    <h4>Top 5 Valores Más Bajos</h4>
                    <table>
                        <thead><tr><th>Fecha</th><th>Valor</th></tr></thead>
                        <tbody>${datos.picosBajos.slice(0,5).map(p => `<tr><td>${new Date(p.fechaRegistro).toLocaleString()}</td><td>${p.valor}</td></tr>`).join('')}</tbody>
                    </table>
                `).join('')}
            </div>
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