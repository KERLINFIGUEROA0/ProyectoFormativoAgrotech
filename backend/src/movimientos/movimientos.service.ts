import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movimiento } from './entities/movimiento.entity';
import { TipoMovimiento } from '../common/enums/tipo-movimiento.enum';
import { DateUtil } from '../common/utils/date.util';

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(Movimiento)
    private readonly movimientoRepository: Repository<Movimiento>,
  ) {}

  // Registrar un movimiento
  async registrarMovimiento(
    tipo: TipoMovimiento,
    cantidad: number,
    materialId: number,
    descripcion: string,
    referencia?: string,
    usuarioId?: number,
  ): Promise<Movimiento> {
    // Generar fecha actual en zona horaria de Colombia
    const fechaActual = DateUtil.getCurrentDate();

    // Crear el movimiento usando SQL directo para evitar problemas con relaciones
    const result = await this.movimientoRepository.query(`
      INSERT INTO movimientos (tipo, cantidad, descripcion, referencia, material_id, usuario_id, fecha)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "Id_Movimiento"
    `, [tipo, cantidad, descripcion, referencia || null, materialId, usuarioId || null, fechaActual]);

    const movimientoId = result[0].Id_Movimiento;

    // Obtener el movimiento creado con relaciones
    const movimiento = await this.movimientoRepository.findOne({
      where: { id: movimientoId },
      relations: ['material', 'usuario'],
    });

    if (!movimiento) {
      throw new Error('Error al crear el movimiento');
    }

    return movimiento;
  }

  // Obtener historial de movimientos
  async obtenerHistorial(materialId?: number): Promise<Movimiento[]> {
    const query = this.movimientoRepository.createQueryBuilder('movimiento')
      .leftJoinAndSelect('movimiento.material', 'material')
      .leftJoinAndSelect('movimiento.usuario', 'usuario')
      .orderBy('movimiento.fecha', 'DESC');

    if (materialId) {
      query.where('movimiento.material = :materialId', { materialId });
    }

    return query.getMany();
  }
}
