import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
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
    });

    // --- 👇 INICIO DE LA CORRECCIÓN ---
    // El error estaba aquí. Se pedía una relación anidada ('produccion.cultivo')
    // que no es necesaria y causaba el fallo. Ahora solo se pide 'produccion'.
    const gastos = await this.gastoRepository.find({
        relations: ['produccion'],
    });
    // --- 👆 FIN DE LA CORRECCIÓN ---

    const transacciones = [
      ...ventas.map(v => ({
        id: `venta-${v.id}`,
        tipo: 'ingreso' as const,
        descripcion: v.descripcion || `Venta de ${v.produccion?.cultivo?.nombre || 'producto'}`,
        monto: parseFloat(v.valorTotalVenta as any),
        fecha: v.fecha,
        cantidad: v.cantidadVenta,
        precioUnitario: parseFloat(v.precioUnitario as any)
      })),
      ...gastos.map(g => ({
        id: `gasto-${g.id}`,
        tipo: 'egreso' as const,
        descripcion: g.descripcion,
        monto: parseFloat(g.monto as any),
        fecha: g.fecha,
        cantidad: 1, 
        precioUnitario: parseFloat(g.monto as any)
      }))
    ];

    transacciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return transacciones;
  }

  async getEstadisticas() {
    const ingresos = await this.ventaRepository.sum('valorTotalVenta') || 0;
    const egresos = await this.gastoRepository.sum('monto') || 0;
    const balance = Number(ingresos) - Number(egresos);
    
    return { 
        ingresos: parseFloat(ingresos.toString()), 
        egresos: parseFloat(egresos.toString()), 
        balance 
    };
  }

  async getFlujoMensual() {
    const flujoData: { mes: string, ingresos: string, egresos: string }[] = await this.ventaRepository.query(`
      SELECT
        mes,
        SUM(ingresos) as ingresos,
        SUM(egresos) as egresos
      FROM (
        SELECT
          TO_CHAR("Fecha", 'YYYY-MM') as mes,
          "Valor_Total_Venta" as ingresos,
          0 as egresos
        FROM ventas
        UNION ALL
        SELECT
          TO_CHAR("Fecha", 'YYYY-MM') as mes,
          0 as ingresos,
          "Monto" as egresos
        FROM gastos
      ) as transacciones
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6;
    `);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    return flujoData.map(item => ({
        mes: monthNames[new Date(item.mes + '-02').getUTCMonth()],
        ingresos: parseFloat(item.ingresos),
        egresos: parseFloat(item.egresos)
    })).reverse();
  }
  
  async getDistribucionEgresos() {
    const distribucion: { nombre: string, monto: string }[] = await this.gastoRepository.query(`
      SELECT 
          "Descripcion" as nombre,
          SUM("Monto") as monto
      FROM gastos
      GROUP BY "Descripcion"
      ORDER BY monto DESC
      LIMIT 5;
    `);
    
    return distribucion.map(item => ({
        ...item,
        monto: parseFloat(item.monto)
    }));
  }
}