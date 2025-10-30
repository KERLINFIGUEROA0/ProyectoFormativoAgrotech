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
}