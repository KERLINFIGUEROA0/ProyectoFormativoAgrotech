import { Injectable,NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Actividad } from './entities/actividade.entity';
import { CreateActividadDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';

@Injectable()
export class ActividadesService {
  constructor(
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
  ) {}
  
  async create(dto: CreateActividadDto, usuarioIdentificacion: number) {
    const actividad = this.actividadRepository.create({
      ...dto,
      usuario: { identificacion: usuarioIdentificacion },
      cultivo: dto.cultivo ? { id: dto.cultivo } : undefined,
      estado: dto.estado || 'pendiente', 
    });

    const saved = await this.actividadRepository.save(actividad);
    return saved;
  }

  async findAll() {
    const actividades = await this.actividadRepository.find({
      relations: ['usuario', 'cultivo'],
    });
    actividades.forEach((act, index) => {
    });
    return actividades;
  }

  async findOne(id: number) {
    const actividad = await this.actividadRepository.findOne({
      where: { id },
      relations: ['usuario', 'cultivo'],
    });
    return actividad;
  }

  async update(id: number, dto: UpdateActividadDto) {
    const updateData: any = {};

    if (dto.titulo !== undefined) updateData.titulo = dto.titulo;
    if (dto.fecha !== undefined) updateData.fecha = dto.fecha;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.img !== undefined) updateData.img = dto.img;
    if (dto.estado !== undefined) updateData.estado = dto.estado;

    if (dto.usuario !== undefined) {
      updateData.usuario = { identificacion: dto.usuario };
    }
    if (dto.cultivo !== undefined) {
      updateData.cultivo = { id: dto.cultivo };
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No hay campos válidos para actualizar');
    }

    await this.actividadRepository.update(id, updateData);
    return this.findOne(id);
  }
  
  async remove(id: number) {
    const actividad = await this.findOne(id);
    if (!actividad) {
      return { message: 'Actividad no encontrada' };
    }
    await this.actividadRepository.delete(id);
    return { message: 'Actividad eliminada correctamente' };
  }

  async search(dto: SearchActividadDto) {
  }
 async asignarActividad(dto: AsignarActividadDto) {
    const { cultivo: cultivoId, aprendices, titulo, descripcion, fecha } = dto;

    // 1. Verificar que el cultivo exista
    const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
    if (!cultivo) {
        throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);
    }

    // 2. Verificar que todos los aprendices existan
    if (aprendices.length === 0) {
        throw new BadRequestException('Debe seleccionar al menos un aprendiz.');
    }
    const usuariosEncontrados = await this.usuarioRepository.find({
        where: { identificacion: In(aprendices) }
    });
    if (usuariosEncontrados.length !== aprendices.length) {
        const idsEncontrados = usuariosEncontrados.map(u => u.identificacion);
        const idsNoEncontrados = aprendices.filter(id => !idsEncontrados.includes(id));
        throw new NotFoundException(`Los siguientes aprendices no existen: ${idsNoEncontrados.join(', ')}`);
    }

    // 3. Si todo es válido, crear las actividades
    const fechaActividad = new Date(fecha);
    const actividadesAGuardar: Actividad[] = [];

    for (const identificacion of aprendices) {
        const nuevaActividad = this.actividadRepository.create({
            titulo,
            descripcion,
            fecha: fechaActividad,
            cultivo, // Usar la entidad completa
            usuario: { identificacion }, // TypeORM se encarga de la relación
            estado: 'pendiente',
        });
        actividadesAGuardar.push(nuevaActividad);
    }

    return this.actividadRepository.save(actividadesAGuardar);
}
}