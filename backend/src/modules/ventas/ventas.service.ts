import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { PdfService } from '../pdf/pdf.service';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import * as fs from 'fs';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    private readonly pdfService: PdfService,
  ) {}

  async create(dto: CreateVentaDto): Promise<Venta> {
    const produccion = await this.produccionRepository.findOne({ where: { id: dto.produccionId }, relations: ['cultivo'] });
    if (!produccion) {
      throw new NotFoundException(`La producción con ID ${dto.produccionId} no fue encontrada.`);
    }

    const nuevaVenta = this.ventaRepository.create({
      descripcion: dto.descripcion || `Venta de ${produccion.cultivo?.nombre || 'producto'}`,
      fecha: dto.fecha,
      precioUnitario: dto.monto,
      cantidadVenta: dto.cantidad,
      valorTotalVenta: dto.monto * (dto.cantidad || 0),
      tipo: TipoMovimiento.INGRESO,
      produccion: produccion,
    });

    const ventaGuardada = await this.ventaRepository.save(nuevaVenta);
    const rutaPdf = await this.pdfService.generarFacturaPdf(ventaGuardada);
    ventaGuardada.rutaFacturaPdf = rutaPdf;
    return this.ventaRepository.save(ventaGuardada);
  }

  async findAll(): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      relations: ['produccion', 'produccion.cultivo'],
      order: { fecha: 'DESC' },
    });

    return ventas.map(v => ({
      id: v.id,
      descripcion: v.descripcion || `Venta de ${v.produccion?.cultivo?.nombre || 'producto'}`,
      monto: parseFloat(v.valorTotalVenta as any),
      fecha: v.fecha,
      cantidad: v.cantidadVenta,
      precioUnitario: parseFloat(v.precioUnitario as any),
      tipo: v.tipo,
      rutaFacturaPdf: v.rutaFacturaPdf,
    }));
  }

  async findFactura(id: number): Promise<string> {
    const venta = await this.ventaRepository.findOneBy({ id });
    if (!venta || !venta.rutaFacturaPdf) {
        throw new NotFoundException(`No se encontró una factura para la venta con ID ${id}.`);
    }
    if (!fs.existsSync(venta.rutaFacturaPdf)) {
        const rutaRegenerada = await this.pdfService.generarFacturaPdf(venta);
        venta.rutaFacturaPdf = rutaRegenerada;
        await this.ventaRepository.save(venta);
        return rutaRegenerada;
    }
    return venta.rutaFacturaPdf;
  }

  async getFlujoMensual() {
    // Consultas para ingresos y egresos
    const ingresosData: any[] = await this.ventaRepository.query(`
      SELECT
        TO_CHAR("Fecha", 'YYYY-MM') as mes,
        SUM("Valor_Total_Venta") as ingresos
      FROM ventas
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6;
    `);

    const egresosData: any[] = await this.gastoRepository.query(`
      SELECT
        TO_CHAR("Fecha", 'YYYY-MM') as mes,
        SUM("Monto") as egresos
      FROM gastos
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6;
    `);

    // Combinar ingresos y egresos por mes
    const combined = {};
    ingresosData.forEach(item => {
      combined[item.mes] = { mes: item.mes, ingresos: parseFloat(item.ingresos) || 0, egresos: 0 };
    });
    egresosData.forEach(item => {
      if (combined[item.mes]) {
        combined[item.mes].egresos = parseFloat(item.egresos) || 0;
      } else {
        combined[item.mes] = { mes: item.mes, ingresos: 0, egresos: parseFloat(item.egresos) || 0 };
      }
    });

    // Convertir a array y ordenar por mes ascendente
    const result = Object.values(combined).sort((a: any, b: any) => a.mes.localeCompare(b.mes)).slice(-6);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return result.map((item: any) => ({
      mes: monthNames[new Date(item.mes + '-02').getUTCMonth()],
      ingresos: item.ingresos,
      egresos: item.egresos
    }));
  }
}