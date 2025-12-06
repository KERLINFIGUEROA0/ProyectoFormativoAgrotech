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
import { Pago } from '../pagos/entities/pago.entity';
import { CultivosService } from './cultivos.service';
import { PagosService } from '../pagos/pagos.service';

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
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    private readonly cultivosService: CultivosService,
    private readonly pagosService: PagosService,
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
    let pagos: any[] = [];

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

    try {
      const actividadIds = actividades.map(act => act.id);
      pagos = await this.pagosService.findByActividades(actividadIds);
      if (fechaInicio && fechaFin) {
        const start = new Date(fechaInicio);
        const end = new Date(fechaFin);
        pagos = pagos.filter(p => p.fechaPago >= start && p.fechaPago <= end);
      }
    } catch (error) {
      console.error('Error obteniendo pagos:', error);
      pagos = [];
    }

    // Crear mapa de costos de mano de obra por actividad
    const pagosPorActividad = pagos.reduce((map, pago) => {
      const actId = pago.actividad?.id;
      if (actId) {
        map[actId] = (map[actId] || 0) + Number(pago.monto);
      }
      return map;
    }, {} as Record<number, number>);

    // Procesar actividades con materiales
    const actividadesData = actividades.map(actividad => ({
      fecha: (() => {
        let fecha = actividad.createdAt;
        if (fecha && typeof fecha === 'string') fecha = new Date(fecha);
        if (fecha instanceof Date && !isNaN(fecha.getTime())) {
          fecha = new Date(fecha.getTime() - 5 * 60 * 60 * 1000);
          return fecha.toLocaleString('es-CO');
        }
        return '';
      })(),
      titulo: actividad.titulo || '',
      estado: actividad.estado || '',
      costoManoObra: (pagosPorActividad[actividad.id] || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }),
      materiales: actividad.actividadMaterial?.map(am => ({
        nombre: am.material.nombre,
        cantidad: am.cantidadUsada,
        unidad: am.material.medidasDeContenido || 'unidades'
      })) || []
    }));

    // Procesar recursos utilizados (materiales agregados de actividades)
    const recursosData = actividades.flatMap(act => act.actividadMaterial?.map(am => ({
      fecha: (() => {
        let fecha = act.createdAt;
        if (fecha && typeof fecha === 'string') fecha = new Date(fecha);
        if (fecha instanceof Date && !isNaN(fecha.getTime())) {
          fecha = new Date(fecha.getTime() - 5 * 60 * 60 * 1000);
          return fecha.toLocaleString('es-CO');
        }
        return '';
      })(),
      descripcion: am.material.nombre,
      cantidad: am.cantidadUsada ?? 0,
      unidad: am.material.medidasDeContenido || 'unidades',
      costo: Number(am.costo) || 0
    })) || []);

    // Procesar producciones y ventas
    const produccionesData = producciones.map(produccion => {
      const ventasProduccion = produccion.ventas || [];
      const totalVentas = ventasProduccion.reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);
      const cantidadVendida = ventasProduccion.reduce((sum, v) => sum + (Number(v.cantidadVenta) || 0), 0);
      const cantidadProducida = Number(produccion.cantidadOriginal) || Number(produccion.cantidad) || 0;
      const precioUnitario = cantidadVendida > 0 ? totalVentas / cantidadVendida : 0;

      return {
        fecha: produccion.fecha ? produccion.fecha.toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '',
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
        fechaPlantado: cultivo.Fecha_Plantado ? new Date(cultivo.Fecha_Plantado).toISOString().split('T')[0] : '',
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
      gastos: gastos,
      pagos: pagos
    };
  }

  calculateFinancials(data: any): { costos: number, ingresos: number, rentabilidad: number, gastosPorCategoria: any[], rentabilidadClass: string } {
    // Calcular ingresos totales
    const ingresos = data.producciones.reduce((sum, p) => sum + parseFloat(p.totalVentas), 0);

    // Calcular costos de mano de obra
    const laborCost = data.fullActividades.reduce((sum, act) => sum + ((Number(act.horas) || 0) * (Number(act.tarifaHora) || 0)), 0);

    // Calcular costos de pagos a pasantes
    const pagosCost = data.pagos.reduce((sum, p) => sum + Number(p.monto), 0);

    // Calcular costos de materiales
    const materialesCost = data.fullActividades.reduce((sum, act) => {
      return sum + (act.actividadMaterial?.reduce((subSum, am) => subSum + (Number(am.costo) || 0), 0) || 0);
    }, 0);

    // Calcular costos de gastos directos
    const directGastosCost = data.gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

    // Calcular costos totales
    const costos = laborCost + pagosCost + materialesCost + directGastosCost;

    // Calcular rentabilidad
    const rentabilidad = ingresos - costos;

    // Agrupar gastos por categoría
    const gastosPorCategoriaMap = new Map();

    // Agregar mano de obra
    if (laborCost > 0) {
      gastosPorCategoriaMap.set('Mano de obra', laborCost);
    }

    // Agregar pagos a pasantes
    if (pagosCost > 0) {
      gastosPorCategoriaMap.set('Pagos a pasantes', pagosCost);
    }

    // Agregar gastos de materiales
    data.recursos.forEach(recurso => {
      const categoria = 'Materiales'; // Agrupar todos los materiales bajo una categoría común
      if (!gastosPorCategoriaMap.has(categoria)) {
        gastosPorCategoriaMap.set(categoria, 0);
      }
      const current = gastosPorCategoriaMap.get(categoria);
      gastosPorCategoriaMap.set(categoria, current + recurso.costo);
    });

    // Agregar gastos directos categorizados por descripción
    data.gastos.forEach(gasto => {
      let categoria = 'Otros Gastos';
      const desc = gasto.descripcion.toLowerCase();
      if (desc.includes('mano') || desc.includes('pasante') || desc.includes('labor') || desc.includes('trabajador') || desc.startsWith('pago a')) {
        categoria = 'Mano de obra';
      } else if (desc.startsWith('consumo')) {
        categoria = 'Materiales';
      } else {
        categoria = gasto.descripcion.split(' ')[0] || 'Otros Gastos';
      }
      if (!gastosPorCategoriaMap.has(categoria)) {
        gastosPorCategoriaMap.set(categoria, 0);
      }
      const current = gastosPorCategoriaMap.get(categoria);
      gastosPorCategoriaMap.set(categoria, current + Number(gasto.monto));
    });

    const totalGastos = Array.from(gastosPorCategoriaMap.values()).reduce((sum, val) => sum + val, 0);
    const gastosPorCategoria = Array.from(gastosPorCategoriaMap.entries()).map(([categoria, total]) => {
      return {
        categoria,
        total: total.toFixed(2),
        porcentaje: totalGastos > 0 ? ((total / totalGastos) * 100).toFixed(1) : '0'
      };
    });

    return {
      costos: totalGastos,
      ingresos,
      rentabilidad: ingresos - totalGastos,
      gastosPorCategoria,
      rentabilidadClass: (ingresos - totalGastos) >= 0 ? 'positive' : 'negative'
    };
  }

  async generatePdf(id: number, fechaInicio?: string, fechaFin?: string): Promise<Buffer> {
    await this.countTotalActivities();
    const cultivo = await this.cultivoRepository.findOne({ where: { id } });
    if (!cultivo) {
      throw new NotFoundException(`Cultivo con ID ${id} no encontrado`);
    }
    if (!cultivo.Fecha_Plantado) {
      throw new BadRequestException('La fecha de plantado del cultivo es requerida y no puede ser null');
    }
    if (fechaInicio) {
      // Comparar solo las fechas YYYY-MM-DD, ajustando a mediodía para evitar problemas de zona horaria
      const fechaInicioDate = new Date(fechaInicio + 'T12:00:00.000Z');
      const fechaPlantadoDate = new Date(cultivo.Fecha_Plantado);
      const fechaInicioStr = fechaInicioDate.toISOString().split('T')[0];
      const fechaPlantadoStr = fechaPlantadoDate.toISOString().split('T')[0];
      if (fechaInicioStr < fechaPlantadoStr) {
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
      'fechaGeneracion': new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
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
    data.pagos = data.pagos || [];
    analisis.gastosPorCategoria = analisis.gastosPorCategoria || [];

    // Para actividades
    const actividadesHtml = data.actividades.map(act => `
      <tr>
        <td>${act.fecha}</td>
        <td>${act.titulo}</td>
        <td>${act.estado}</td>
        <td>${act.costoManoObra}</td>
        <td>${act.materiales.map(m => `${m.nombre} (${Number(m.cantidad).toFixed(0)} ${m.unidad})`).join(', ')}</td>
      </tr>
    `).join('');
    html = html.replace('{{#each actividades}}{{/each}}', actividadesHtml);

    // Para pagos a pasantes
    const pagosHtml = data.pagos.map(pago => `
      <tr>
        <td>${pago.fechaPago ? pago.fechaPago.toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : ''}</td>
        <td>${pago.usuario ? `${pago.usuario.nombre} ${pago.usuario.apellidos}` : ''}</td>
        <td>${pago.actividad ? pago.actividad.titulo : ''}</td>
        <td>${pago.horasTrabajadas}</td>
        <td>${pago.tarifaHora.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
        <td>${pago.monto.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
      </tr>
    `).join('');
    html = html.replace('{{#each pagos}}{{/each}}', pagosHtml);

    // Para recursos
    const recursosHtml = data.recursos.map(rec => {
      const cantidadNum = parseFloat(rec.cantidad);
      const formattedCantidad = Number.isInteger(cantidadNum) ? cantidadNum.toString() : cantidadNum.toFixed(2);
      return `
      <tr>
        <td>${rec.fecha}</td>
        <td>${rec.descripcion}</td>
        <td>${formattedCantidad} ${rec.unidad}</td>
        <td>${Number(rec.costo).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
      </tr>
    `;
    }).join('');
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
    await page.evaluate((title) => { document.title = title; }, `Reporte Cultivo - ${data.cultivo.nombre}`);

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '40px',
        left: '20px'
      }
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}