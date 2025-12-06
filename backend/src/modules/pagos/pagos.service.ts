import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
  ) {}

  async create(createPagoDto: CreatePagoDto) {
    // Verificar que el usuario existe y es pasante
    const usuario = await this.usuarioRepository.findOne({
      where: { identificacion: createPagoDto.idUsuario },
      relations: ['tipoUsuario'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${createPagoDto.idUsuario} no encontrado`);
    }

    if (usuario.tipoUsuario.nombre.toLowerCase() !== 'pasante') {
      throw new BadRequestException('Solo se pueden registrar pagos para pasantes');
    }

    // Verificar que la actividad existe
    const actividad = await this.actividadRepository.findOne({
      where: { id: createPagoDto.idActividad },
      relations: ['cultivo'],
    });

    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${createPagoDto.idActividad} no encontrada`);
    }

    // Verificar que el usuario participó en la actividad
    if (actividad.asignados) {
      try {
        const asignados = JSON.parse(actividad.asignados);
        const nombreCompleto = `${usuario.nombre} ${usuario.apellidos}`.trim();
        if (!asignados.includes(nombreCompleto)) {
          throw new BadRequestException('El usuario no participó en esta actividad');
        }
      } catch (error) {
        throw new BadRequestException('Error al verificar participación en la actividad');
      }
    }

    // Verificar que no existe un pago previo para esta actividad y usuario
    const pagoExistente = await this.pagoRepository.findOne({
      where: {
        idUsuario: createPagoDto.idUsuario,
        idActividad: createPagoDto.idActividad,
      },
    });

    if (pagoExistente) {
      throw new BadRequestException('Ya existe un pago registrado para este usuario y actividad');
    }

    // Crear el pago
    const pago = this.pagoRepository.create({
      ...createPagoDto,
      fechaPago: new Date(createPagoDto.fechaPago),
    });

    const pagoGuardado = await this.pagoRepository.save(pago);

    // Crear el gasto correspondiente para el cultivo
    const gasto = this.gastoRepository.create({
      descripcion: `Pago a ${usuario.nombre} ${usuario.apellidos} por actividad: ${actividad.titulo}`,
      monto: pagoGuardado.monto,
      fecha: pagoGuardado.fechaPago,
      tipo: TipoMovimiento.EGRESO,
      cantidad: pagoGuardado.horasTrabajadas,
      unidad: 'horas',
      precioUnitario: pagoGuardado.tarifaHora,
      cultivo: actividad.cultivo,
    });

    await this.gastoRepository.save(gasto);

    return pagoGuardado;
  }

  async createMultiple(createPagoDtos: CreatePagoDto[]) {
    const pagos: Pago[] = [];
    const pagoData: { pago: Pago; usuario: Usuario; actividad: Actividad }[] = [];

    for (const createPagoDto of createPagoDtos) {
      // Usar la lógica de validación del método create para cada pago
      const usuario = await this.usuarioRepository.findOne({
        where: { identificacion: createPagoDto.idUsuario },
        relations: ['tipoUsuario'],
      });

      if (!usuario) {
        throw new NotFoundException(`Usuario con ID ${createPagoDto.idUsuario} no encontrado`);
      }

      if (usuario.tipoUsuario.nombre.toLowerCase() !== 'pasante') {
        throw new BadRequestException('Solo se pueden registrar pagos para pasantes');
      }

      const actividad = await this.actividadRepository.findOne({
        where: { id: createPagoDto.idActividad },
        relations: ['cultivo'],
      });

      if (!actividad) {
        throw new NotFoundException(`Actividad con ID ${createPagoDto.idActividad} no encontrada`);
      }

      // Verificar participación en la actividad
      if (actividad.asignados) {
        try {
          const asignados = JSON.parse(actividad.asignados);
          const nombreCompleto = `${usuario.nombre} ${usuario.apellidos}`.trim();
          if (!asignados.includes(nombreCompleto)) {
            throw new BadRequestException(`El usuario ${nombreCompleto} no participó en la actividad ${actividad.titulo}`);
          }
        } catch (error) {
          throw new BadRequestException('Error al verificar participación en la actividad');
        }
      }

      // Verificar pago duplicado
      const pagoExistente = await this.pagoRepository.findOne({
        where: {
          idUsuario: createPagoDto.idUsuario,
          idActividad: createPagoDto.idActividad,
        },
      });

      if (pagoExistente) {
        throw new BadRequestException(`Ya existe un pago registrado para el usuario ${usuario.nombre} ${usuario.apellidos} en la actividad ${actividad.titulo}`);
      }

      // Crear el pago
      const pago = this.pagoRepository.create({
        ...createPagoDto,
        fechaPago: new Date(createPagoDto.fechaPago),
      });

      pagos.push(pago);
      pagoData.push({ pago, usuario, actividad });
    }

    // Guardar todos los pagos
    try {
      const savedPagos = await this.pagoRepository.save(pagos);

      // Crear los gastos correspondientes para cada pago
      const gastos: Gasto[] = [];
      for (let i = 0; i < savedPagos.length; i++) {
        const { usuario, actividad } = pagoData[i];
        const pago = savedPagos[i];
        const gasto = this.gastoRepository.create({
          descripcion: `Pago a ${usuario.nombre} ${usuario.apellidos} por actividad: ${actividad.titulo}`,
          monto: pago.monto,
          fecha: pago.fechaPago,
          tipo: TipoMovimiento.EGRESO,
          cantidad: pago.horasTrabajadas,
          unidad: 'horas',
          precioUnitario: pago.tarifaHora,
          cultivo: actividad.cultivo,
        });
        gastos.push(gasto);
      }

      await this.gastoRepository.save(gastos);

      return savedPagos;
    } catch (error) {
      throw error;
    }
  }

  async findByUsuario(idUsuario: number) {
    // Verificar que el usuario existe y es pasante
    const usuario = await this.usuarioRepository.findOne({
      where: { identificacion: idUsuario },
      relations: ['tipoUsuario'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${idUsuario} no encontrado`);
    }

    if (usuario.tipoUsuario.nombre.toLowerCase() !== 'pasante') {
      throw new BadRequestException('Esta funcionalidad solo está disponible para pasantes');
    }

    return this.pagoRepository.find({
      where: { idUsuario },
      relations: ['actividad'],
      order: { fechaPago: 'DESC' },
    });
  }

  async findAll(userIdentificacion?: number, userRole?: string) {
    const role = userRole?.toLowerCase();

    // Si es admin o administrador, ver todos los pagos
    if (role === 'admin' || role === 'administrador') {
      const pagos = await this.pagoRepository.find({
        relations: ['usuario', 'actividad', 'usuario.tipoUsuario', 'actividad.usuario', 'actividad.responsable', 'actividad.usuario.tipoUsuario'],
        order: { fechaPago: 'DESC' },
      });
      return pagos;
    }

    // Si es instructor, ver pagos de actividades que creó o asignó
    if (role === 'instructor' && userIdentificacion) {
      const pagos = await this.pagoRepository.find({
        where: [
          {
            actividad: {
              usuario: {
                identificacion: userIdentificacion
              }
            }
          },
          {
            actividad: {
              responsable: {
                identificacion: userIdentificacion
              }
            }
          }
        ],
        relations: ['usuario', 'actividad', 'usuario.tipoUsuario', 'actividad.usuario', 'actividad.responsable', 'actividad.usuario.tipoUsuario'],
        order: { fechaPago: 'DESC' },
      });
      return pagos;
    }

    // Si es pasante, solo ver sus propios pagos
    if (userIdentificacion && role === 'pasante') {
      const pagos = await this.pagoRepository.find({
        where: { idUsuario: userIdentificacion },
        relations: ['usuario', 'actividad', 'usuario.tipoUsuario'],
        order: { fechaPago: 'DESC' },
      });
      return pagos;
    }

    // Por defecto, devolver vacío si no hay usuario identificado
    return [];
  }

  async findOne(id: number) {
    const pago = await this.pagoRepository.findOne({
      where: { id },
      relations: ['usuario', 'actividad'],
    });

    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return pago;
  }

  async update(id: number, updatePagoDto: UpdatePagoDto, userRole?: string) {
    // Validar permisos - solo instructores y administradores pueden editar pagos
    if (userRole?.toLowerCase() !== 'instructor' && userRole?.toLowerCase() !== 'admin') {
      throw new BadRequestException('Solo instructores y administradores pueden editar pagos');
    }

    const pago = await this.pagoRepository.findOne({
      where: { id },
      relations: ['usuario', 'actividad'],
    });

    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    // Actualizar campos proporcionados
    if (updatePagoDto.monto !== undefined) {
      pago.monto = updatePagoDto.monto;
    }
    if (updatePagoDto.horasTrabajadas !== undefined) {
      pago.horasTrabajadas = updatePagoDto.horasTrabajadas;
    }
    if (updatePagoDto.tarifaHora !== undefined) {
      pago.tarifaHora = updatePagoDto.tarifaHora;
    }
    if (updatePagoDto.descripcion !== undefined) {
      pago.descripcion = updatePagoDto.descripcion;
    }
    if (updatePagoDto.fechaPago !== undefined) {
      pago.fechaPago = new Date(updatePagoDto.fechaPago);
    }

    // Recalcular monto si se cambiaron horas o tarifa
    if (updatePagoDto.horasTrabajadas !== undefined || updatePagoDto.tarifaHora !== undefined) {
      const horas = updatePagoDto.horasTrabajadas !== undefined ? updatePagoDto.horasTrabajadas : pago.horasTrabajadas;
      const tarifa = updatePagoDto.tarifaHora !== undefined ? updatePagoDto.tarifaHora : pago.tarifaHora;
      pago.monto = horas * tarifa;
    }

    return this.pagoRepository.save(pago);
  }

  async findByActividades(actividadIds: number[]) {
    return this.pagoRepository.find({
      where: { idActividad: In(actividadIds) },
      relations: ['usuario', 'actividad'],
      order: { fechaPago: 'ASC' },
    });
  }
}