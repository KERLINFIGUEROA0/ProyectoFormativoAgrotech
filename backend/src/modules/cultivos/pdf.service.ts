import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { Cultivo } from './entities/cultivo.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Venta } from '../../common/enums/ventas/entities/venta.entity';
import { CultivosService } from './cultivos.service';

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    private readonly cultivosService: CultivosService,
  ) {}

  async countTotalActivities(): Promise<void> {
    const count = await this.actividadRepository.count();
  }

  async getCultivoData(id: number, fechaInicio?: string, fechaFin?: string): Promise<any> {
    const cultivo = await this.cultivoRepository.findOne({
      where: { id },
      relations: ['tipoCultivo', 'lote']
    });

    if (!cultivo) {
      throw new NotFoundException(`Cultivo con ID ${id} no encontrado`);
    }

    let actividades: Actividad[] = [];
    let producciones: Produccion[] = [];
    let gastos: Gasto[] = [];

    try {
      actividades = await this.cultivosService.getActividadesWithMateriales(id, fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error obteniendo actividades con materiales:', error);
      actividades = [];
    }

    try {
      producciones = await this.cultivosService.getProduccionesWithVentasYGastos(id, fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error obteniendo producciones con ventas y gastos:', error);
      producciones = [];
    }

    if (fechaInicio && fechaFin) {
      try {
        gastos = await this.cultivosService.getGastosDirectos(id, fechaInicio, fechaFin);
      } catch (error) {
        console.error('Error obteniendo gastos directos:', error);
        gastos = [];
      }
    }

    // Procesar actividades con materiales
    const actividadesData = actividades.map(actividad => ({
      fecha: (() => {
        let fecha = actividad.fecha;
        if (fecha && typeof fecha === 'string') fecha = new Date(fecha);
        return (fecha instanceof Date && !isNaN(fecha.getTime())) ? fecha.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '';
      })(),
      titulo: actividad.titulo || '',
      estado: actividad.estado || '',
      materiales: actividad.actividadMaterial?.map(am => ({
        nombre: am.material.nombre,
        cantidad: am.cantidadUsada,
        unidad: am.material.medidasDeContenido || 'unidades'
      })) || []
    }));

    // Procesar recursos utilizados (materiales agregados de actividades)
    const recursosData = actividades.flatMap(act => act.actividadMaterial?.map(am => ({
      fecha: (() => {
        let fecha = act.fecha;
        if (fecha && typeof fecha === 'string') fecha = new Date(fecha);
        return (fecha instanceof Date && !isNaN(fecha.getTime())) ? fecha.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '';
      })(),
      descripcion: am.material.nombre,
      cantidad: am.cantidadUsada ?? 0,
      unidad: am.material.medidasDeContenido || 'unidades',
      costo: am.material.precio ? (am.cantidadUsada ?? 0) * am.material.precio : 0
    })) || []);

    // Procesar producciones y ventas
    const produccionesData = producciones.map(produccion => {
      const ventasProduccion = produccion.ventas || [];
      const totalVentas = ventasProduccion.reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);
      const cantidadVendida = ventasProduccion.reduce((sum, v) => sum + (Number(v.cantidadVenta) || 0), 0);
      const cantidadProducida = Number(produccion.cantidadOriginal) || Number(produccion.cantidad) || 0;
      const precioUnitario = cantidadVendida > 0 ? totalVentas / cantidadVendida : 0;

      return {
        fecha: produccion.fecha ? produccion.fecha.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
        cantidadProducida,
        cantidadVendida,
        precioUnitario: precioUnitario.toFixed(2),
        totalVentas: totalVentas.toFixed(2)
      };
    });

    // Calcular cantidad cosechada como suma de producciones.cantidadOriginal
    const cantidadCosechada = producciones.reduce((sum, p) => sum + (Number(p.cantidadOriginal) || 0), 0);

    return {
      cultivo: {
        nombre: cultivo.nombre,
        tipoCultivo: cultivo.tipoCultivo?.nombre || '',
        fechaPlantado: cultivo.Fecha_Plantado ? new Date(cultivo.Fecha_Plantado).toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' }) : '',
        estado: cultivo.Estado || '',
        lote: cultivo.lote?.nombre || '',
        cantidad: cultivo.cantidad || 0,
        cantidadCosechada: cantidadCosechada,
        descripcion: cultivo.descripcion || ''
      },
      fullActividades: actividades, // full activities for calculations
      actividades: actividadesData, // processed for template
      recursos: recursosData,
      producciones: produccionesData,
      gastos: gastos
    };
  }

  calculateFinancials(data: any): { costos: number, ingresos: number, rentabilidad: number, gastosPorCategoria: any[], rentabilidadClass: string } {
    // Calcular ingresos totales
    const ingresos = data.producciones.reduce((sum, p) => sum + parseFloat(p.totalVentas), 0);

    // Calcular costos de mano de obra
    const laborCost = data.fullActividades.reduce((sum, act) => sum + ((act.horas || 0) * (act.tarifaHora || 0)), 0);

    // Calcular costos de materiales
    const materialesCost = data.fullActividades.reduce((sum, act) => {
      return sum + (act.actividadMaterial?.reduce((subSum, am) => subSum + (am.cantidadUsada * (am.material?.precio || 0)), 0) || 0);
    }, 0);

    // Calcular costos de gastos directos
    const directGastosCost = data.gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

    // Calcular costos totales
    const costos = laborCost + materialesCost + directGastosCost;

    // Calcular rentabilidad
    const rentabilidad = ingresos - costos;

    // Agrupar gastos por categoría
    const gastosPorCategoriaMap = new Map();

    // Agregar mano de obra
    if (laborCost > 0) {
      gastosPorCategoriaMap.set('Mano de obra', laborCost);
    }

    // Agregar gastos de materiales
    data.recursos.forEach(recurso => {
      const categoria = recurso.descripcion.split(' ')[0] || 'Otros'; // Primera palabra como categoría
      if (!gastosPorCategoriaMap.has(categoria)) {
        gastosPorCategoriaMap.set(categoria, 0);
      }
      gastosPorCategoriaMap.set(categoria, gastosPorCategoriaMap.get(categoria) + recurso.costo);
    });

    // Agregar gastos directos
    if (directGastosCost > 0) {
      gastosPorCategoriaMap.set('Gastos Directos', directGastosCost);
    }

    const totalGastos = costos;
    const gastosPorCategoria = Array.from(gastosPorCategoriaMap.entries()).map(([categoria, total]) => ({
      categoria,
      total: total.toFixed(2),
      porcentaje: totalGastos > 0 ? ((total / totalGastos) * 100).toFixed(1) : '0'
    }));

    return {
      costos,
      ingresos,
      rentabilidad,
      gastosPorCategoria,
      rentabilidadClass: rentabilidad >= 0 ? 'positive' : 'negative'
    };
  }

  async generatePdf(id: number, fechaInicio?: string, fechaFin?: string): Promise<Buffer> {
    await this.countTotalActivities();
    const cultivo = await this.cultivoRepository.findOne({ where: { id } });
    if (!cultivo) {
      throw new NotFoundException(`Cultivo con ID ${id} no encontrado`);
    }
    cultivo.Fecha_Plantado = new Date(cultivo.Fecha_Plantado);
    if (!cultivo.Fecha_Plantado) {
      throw new BadRequestException('La fecha de plantado del cultivo es requerida y no puede ser null');
    }
    if (fechaInicio) {
      const fechaInicioFormatted = new Date(fechaInicio).toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
      const fechaPlantadoFormatted = cultivo.Fecha_Plantado.toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
      if (fechaInicioFormatted < fechaPlantadoFormatted) {
        throw new BadRequestException('Estás seleccionando una fecha que no corresponde a este cultivo. La fecha de inicio debe ser posterior o igual a la fecha de plantado.');
      }
    }
    const data = await this.getCultivoData(id, fechaInicio, fechaFin);
    const analisis = this.calculateFinancials(data);

    // Leer template HTML
    const templatePath = path.join(process.cwd(), 'src/templates/trazabilidad-cultivo.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Reemplazar placeholders simples
    const replacements = {
      'cultivo.nombre': data.cultivo.nombre,
      'cultivo.tipoCultivo.nombre': data.cultivo.tipoCultivo,
      'cultivo.fechaPlantado': data.cultivo.fechaPlantado,
      'cultivo.estado': data.cultivo.estado,
      'cultivo.lote.nombre': data.cultivo.lote,
      'cultivo.cantidad': data.cultivo.cantidad.toString(),
      'cultivo.cantidadCosechada': data.cultivo.cantidadCosechada.toString(),
      'cultivo.descripcion': data.cultivo.descripcion,
      'fechaGeneracion': new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
      'periodo': (() => {
        if (fechaInicio && fechaFin) {
          return `Período del Reporte: desde ${fechaInicio} hasta ${fechaFin}`;
        } else if (fechaInicio) {
          return `Período del Reporte: desde ${fechaInicio}`;
        } else if (fechaFin) {
          return `Período del Reporte: hasta ${fechaFin}`;
        } else {
          return '';
        }
      })(),
      'analisis.ingresos': analisis.ingresos.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }),
      'analisis.costos': analisis.costos.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }),
      'analisis.rentabilidad': analisis.rentabilidad.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }),
      'analisis.rentabilidadClass': analisis.rentabilidadClass
    };

    // Reemplazar placeholders simples
    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Reemplazar arrays complejos (simplificado, en producción usar handlebars)
    // Verificar y asignar arrays vacíos si son undefined
    data.actividades = data.actividades || [];
    data.recursos = data.recursos || [];
    data.producciones = data.producciones || [];
    analisis.gastosPorCategoria = analisis.gastosPorCategoria || [];

    // Para actividades
    const actividadesHtml = data.actividades.map(act => `
      <tr>
        <td>${act.fecha}</td>
        <td>${act.titulo}</td>
        <td>${act.estado}</td>
        <td>${act.materiales.map(m => `${m.nombre} (${m.cantidad} ${m.unidad})`).join(', ')}</td>
      </tr>
    `).join('');
    html = html.replace('{{#each actividades}}{{/each}}', actividadesHtml);

    // Para recursos
    const recursosHtml = data.recursos.map(rec => `
      <tr>
        <td>${rec.fecha}</td>
        <td>${rec.descripcion}</td>
        <td>${rec.cantidad}</td>
        <td>${rec.unidad}</td>
        <td>${Number(rec.costo).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
      </tr>
    `).join('');
    html = html.replace('{{#each recursos}}{{/each}}', recursosHtml);

    // Para producciones
    const produccionesHtml = data.producciones.map(prod => `
      <tr>
        <td>${prod.fecha}</td>
        <td>${prod.cantidadProducida}</td>
        <td>${prod.cantidadVendida}</td>
        <td>${parseFloat(prod.precioUnitario).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
        <td>${parseFloat(prod.totalVentas).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
      </tr>
    `).join('');
    html = html.replace('{{#each producciones}}{{/each}}', produccionesHtml);

    // Para gastos por categoría
    const gastosCategoriaHtml = analisis.gastosPorCategoria.map(g => `
      <tr>
        <td>${g.categoria}</td>
        <td>${parseFloat(g.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
        <td>${g.porcentaje}%</td>
      </tr>
    `).join('');
    html = html.replace('{{#each analisis.gastosPorCategoria}}{{/each}}', gastosCategoriaHtml);

    // Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}