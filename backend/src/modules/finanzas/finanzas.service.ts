import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';

@Injectable()
export class FinanzasService {
  constructor(
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
  ) {}

  async obtenerCosechasDisponibles() {
    // Obtener producciones con cantidad disponible para venta
    const producciones = await this.produccionRepository.find({
      where: {
        estado: 'Cosechado'
      },
      relations: ['cultivo', 'cultivo.tipoCultivo', 'ventas'],
    });

    // Calcular cantidad disponible (original - vendida)
    return producciones.map(prod => {
      const cantidadVendida = prod.ventas?.reduce((sum, venta) => sum + (venta.cantidadVenta || 0), 0) || 0;
      const cantidadOriginal = prod.cantidadOriginal || prod.cantidad || 0;
      const cantidadDisponible = cantidadOriginal - cantidadVendida;

      return {
        id: prod.id,
        cultivoId: prod.cultivo.id,
        cultivoNombre: prod.cultivo.nombre,
        tipoCultivo: prod.cultivo.tipoCultivo?.nombre || 'Sin tipo',
        fechaCosecha: prod.fecha,
        cantidadOriginal,
        cantidadDisponible
      };
    }).filter(prod => prod.cantidadDisponible > 0);
  }

  async obtenerMaterialesDisponibles() {
    // Obtener materiales con cantidad disponible para gastos
    const materiales = await this.materialRepository.find({
      where: {
        estado: true
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        cantidad: true,
        precio: true,
        unidadBase: true
      }
    });

    return materiales.filter(material => (material.cantidad || 0) > 0);
  }

  async obtenerCultivosDisponibles() {
    const cultivos = await this.cultivoRepository.find({
      order: { nombre: 'ASC' },
    });

    return cultivos.map(c => ({
      id: c.id,
      nombre: c.nombre,
    }));
  }
}