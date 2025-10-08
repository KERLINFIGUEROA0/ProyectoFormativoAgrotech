import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Actividad } from './entities/actividade.entity';
import { CreateActividadDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';

@Injectable()
export class ActividadesService {
  constructor(
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
  ) {}

  async create(dto: CreateActividadDto) {
    const actividad = this.actividadRepository.create({
      ...dto,
      usuario: dto.usuario ? { identificacion: dto.usuario } : undefined,
      cultivo: dto.cultivo ? { id: dto.cultivo } : undefined,
    });
    return this.actividadRepository.save(actividad);
  }

  async findAll() {
    // Cargar relaciones si las necesitas
    return this.actividadRepository.find({
      relations: ['usuario', 'cultivo'],
    });
  }

  async findOne(id: number) {
    return this.actividadRepository.findOne({
      where: { id },
      relations: ['usuario', 'cultivo'],
    });
  }

  async update(id: number, dto: UpdateActividadDto) {
  const updateData = {
    ...dto,
    // ✅ LA CORRECCIÓN ES EN LA SIGUIENTE LÍNEA:
    usuario: dto.usuario ? { identificacion: dto.usuario } : undefined, // Cambiamos 'id' por 'identificacion'
    cultivo: dto.cultivo ? { id: dto.cultivo } : undefined,
  };
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
    const { q } = dto;

    if (!q) {
      // Si no hay término de búsqueda, retorna todo
      return this.actividadRepository.find({
        relations: ['usuario', 'cultivo'],
      });
    }

    return this.actividadRepository.find({
      where: [
        { id: Number(q) || 0 }, // Busca por id si es número
        { titulo: ILike(`%${q}%`) }, // Busca por título (insensible a mayúsculas)
        { descripcion: ILike(`%${q}%`) }, // Busca por descripción si existe ese campo
        // Agrega más campos si lo necesitas
      ],
      relations: ['usuario', 'cultivo'],
    });
  }

  async asignarActividad(dto: AsignarActividadDto) {
    const actividades: Actividad[] = [];

    for (const identificacion of dto.aprendices) {
      const actividad = this.actividadRepository.create({
        titulo: dto.titulo, // Agrega el título aquí
        descripcion: dto.descripcion,
        fecha: dto.fecha,
        cultivo: { id: dto.cultivo },
        usuario: { identificacion },
      });
      actividades.push(actividad);
    }

    return this.actividadRepository.save(actividades);
  }
}

