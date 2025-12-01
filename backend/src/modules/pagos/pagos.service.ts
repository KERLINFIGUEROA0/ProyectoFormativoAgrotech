import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { CreatePagoDto } from './dto/create-pago.dto';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
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

    return this.pagoRepository.save(pago);
  }

  async createMultiple(createPagoDtos: CreatePagoDto[]) {
    const pagos: Pago[] = [];

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
    }

    // Guardar todos los pagos
    return this.pagoRepository.save(pagos);
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

  async findAll() {
    return this.pagoRepository.find({
      relations: ['usuario', 'actividad'],
      order: { fechaPago: 'DESC' },
    });
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
}