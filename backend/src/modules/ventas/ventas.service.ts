import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
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
    private readonly dataSource: DataSource,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    private readonly pdfService: PdfService,
  ) {}

  async create(dto: CreateVentaDto): Promise<Venta> {
    return this.dataSource.transaction(async (entityManager) => {
      const produccionRepo = entityManager.getRepository(Produccion);
      const ventaRepo = entityManager.getRepository(Venta);

      const produccion = await produccionRepo.findOne({
        where: { id: dto.produccionId },
        relations: ['cultivo'],
      });

      if (!produccion) {
        throw new NotFoundException(`La producción con ID ${dto.produccionId} no fue encontrada.`);
      }

      if (dto.cantidad > produccion.cantidad) {
        throw new BadRequestException(
          `No puedes vender ${dto.cantidad} kg. Cantidad disponible: ${produccion.cantidad} kg.`
        );
      }

      // Restamos la cantidad vendida de la cantidad disponible
      produccion.cantidad -= dto.cantidad;

      // Si la cantidad llega a 0, marcamos la producción como vendida
      if (produccion.cantidad === 0) {
        produccion.estado = 'Vendido';
      }

      // Mantenemos el cantidadOriginal como estaba
      if (!produccion.cantidadOriginal) {
        produccion.cantidadOriginal = produccion.cantidad + dto.cantidad;
      }
      
      await produccionRepo.save(produccion);

      const nuevaVenta = ventaRepo.create({
        descripcion: dto.descripcion || `Venta de ${produccion.cultivo?.nombre || 'producto'}`,
        fecha: dto.fecha,
        precioUnitario: dto.monto,
        cantidadVenta: dto.cantidad,
        valorTotalVenta: dto.monto * (dto.cantidad || 0),
        tipo: TipoMovimiento.INGRESO,
        produccion: produccion,
      });

      const ventaGuardada = await ventaRepo.save(nuevaVenta);
      
      const rutaPdf = await this.pdfService.generarFacturaPdf(ventaGuardada);
      ventaGuardada.rutaFacturaPdf = rutaPdf;
      
      return ventaRepo.save(ventaGuardada);
    });
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

  async findByProduccionIds(produccionIds: number[]): Promise<Venta[]> {
    if (produccionIds.length === 0) {
      return [];
    }
    return this.ventaRepository.find({
      where: {
        produccion: { id: In(produccionIds) },
      },
      relations: ['produccion'],
    });
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

    const combined: Record<string, { mes: string, ingresos: number, egresos: number }> = {};
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

    const result = Object.values(combined).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return result.map((item) => ({
      mes: monthNames[new Date(item.mes + '-02').getUTCMonth()],
      ingresos: item.ingresos,
      egresos: item.egresos
    }));
  }

  // --- 👇 CORRECCIÓN 5: Se añade el método 'remove' que faltaba ---
  async remove(id: number): Promise<void> {
    const venta = await this.ventaRepository.findOneBy({ id });
    if (!venta) {
      throw new NotFoundException(`La venta con ID ${id} no fue encontrada.`);
    }

    // Eliminar el archivo PDF si existe
    if (venta.rutaFacturaPdf && fs.existsSync(venta.rutaFacturaPdf)) {
      try {
        fs.unlinkSync(venta.rutaFacturaPdf);
      } catch (error) {
        console.error(`Error al eliminar el archivo PDF: ${error.message}`);
      }
    }

    await this.ventaRepository.delete(id);
  }
}