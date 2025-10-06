import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Produccion } from '../../../modules/producciones/entities/produccione.entity';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
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
      produccion: produccion,
    });

    return this.ventaRepository.save(nuevaVenta);
  }

  async findAll(): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      relations: ['produccion', 'produccion.cultivo'],
      order: { fecha: 'DESC' },
    });

    return ventas.map(v => {
      const descripcionSegura = v.descripcion || `Venta de ${v.produccion?.cultivo?.nombre || 'producto no especificado'}`;
      return {
        id: `venta-${v.id}`,
        descripcion: descripcionSegura,
        monto: parseFloat(v.valorTotalVenta as any),
        fecha: v.fecha,
        cantidad: v.cantidadVenta,
        precioUnitario: parseFloat(v.precioUnitario as any)
      };
    });
  }

  async getEstadisticas() {
    const ingresos = await this.ventaRepository.sum('valorTotalVenta') || 0;
    return { ingresos, egresos: 0, balance: ingresos };
  }

  async getFlujoMensual() {
    // --- INICIO DE LA CORRECCIÓN ---
    // Se cambia la consulta a una compatible con PostgreSQL (TO_CHAR)
    // y se usan comillas dobles para los nombres de columnas con mayúsculas.
    const rawData: any[] = await this.ventaRepository.query(`
      SELECT
        TO_CHAR("Fecha", 'YYYY-MM') as mes,
        SUM("Valor_Total_Venta") as ingresos
      FROM ventas
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6;
    `);
    // --- FIN DE LA CORRECCIÓN ---
    
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return rawData.map(item => ({
        mes: monthNames[new Date(item.mes + '-02').getUTCMonth()],
        ingresos: parseFloat(item.ingresos),
        egresos: 0 
    })).reverse();
  }
  
  async getDistribucionEgresos() {
    return [];
  }
}