import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produccion } from './entities/produccione.entity';
import { CreateProduccioneDto } from './dto/create-produccione.dto';
import { UpdateProduccioneDto } from './dto/update-produccione.dto';
import { Cultivo } from '../cultivos/entities/cultivo.entity'; // 👈 Importamos la entidad Cultivo

@Injectable()
export class ProduccionesService {
  constructor(
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Cultivo) // 👈 Inyectamos el repositorio de Cultivo
    private readonly cultivoRepository: Repository<Cultivo>,
  ) {}

  async create(createProduccioneDto: CreateProduccioneDto): Promise<Produccion> {
    const { cultivoId, ...produccionData } = createProduccioneDto;

    // Buscamos el cultivo para asegurarnos de que existe
    const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
    if (!cultivo) {
      throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);
    }

    // Creamos la nueva instancia de Produccion
    const nuevaProduccion = this.produccionRepository.create({
      ...produccionData,
      cultivo: cultivo, // Asignamos la relación completa
    });

    // Guardamos en la base de datos
    return this.produccionRepository.save(nuevaProduccion);
  }

  findAll(): Promise<Produccion[]> {
    // Devolvemos todas las producciones, incluyendo el cultivo relacionado
    return this.produccionRepository.find({ relations: ['cultivo'] });
  }

  async findOne(id: number): Promise<Produccion> {
    const produccion = await this.produccionRepository.findOne({
      where: { id },
      relations: ['cultivo'],
    });
    if (!produccion) {
      throw new NotFoundException(`Producción con ID ${id} no encontrada.`);
    }
    return produccion;
  }
  
  // Las funciones update y remove se pueden implementar de manera similar en el futuro
  update(id: number, updateProduccioneDto: UpdateProduccioneDto) {
    return `This action updates a #${id} produccione`;
  }

  remove(id: number) {
    return `This action removes a #${id} produccione`;
  }
}