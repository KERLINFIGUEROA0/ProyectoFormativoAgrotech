import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Epa } from './entities/epa.entity';
import { CreateEpaDto } from './dto/create-epa.dto';
import { UpdateEpaDto } from './dto/update-epa.dto';
import { Tratamiento } from '../tratamientos/entities/tratamiento.entity';

@Injectable()
export class EpaService {
  private readonly logger = new Logger(EpaService.name);

  constructor(
    @InjectRepository(Epa)
    private readonly epaRepo: Repository<Epa>,
    private readonly httpService: HttpService,
  ) {}

  // --- MODIFICACIÓN: DESHABILITAR API EXTERNA ---
  // Hacemos que la función devuelva un array vacío inmediatamente.
  async searchExternal(query: string): Promise<Partial<Epa>[]> {
    this.logger.log(
      `Búsqueda externa deshabilitada. Omitiendo búsqueda para: ${query}`,
    );
    return Promise.resolve([]);
  }
  // --- FIN DE LA MODIFICACIÓN ---

  // --- El resto de los métodos no cambian ---

  async create(dto: CreateEpaDto): Promise<Epa> {
    const epa = this.epaRepo.create(dto);
    return this.epaRepo.save(epa);
  }

  async findAll(): Promise<Epa[]> {
    return this.epaRepo.find();
  }

  async findOne(id: number): Promise<Epa> {
    const epa = await this.epaRepo.findOne({ where: { id } });
    if (!epa) {
      throw new NotFoundException(`EPA con ID ${id} no encontrada.`);
    }
    return epa;
  }

  async update(id: number, dto: UpdateEpaDto): Promise<Epa> {
    const epa = await this.findOne(id);
    this.epaRepo.merge(epa, dto);
    return this.epaRepo.save(epa);
  }

  async remove(id: number): Promise<void> {
    const epa = await this.findOne(id);
    await this.epaRepo.remove(epa);
  }

  // --- AÑADIR ESTE NUEVO MÉTODO ---
  async actualizarImagen(id: number, imgUrl: string): Promise<Epa> {
    const epa = await this.findOne(id);
    epa.img = imgUrl;
    return this.epaRepo.save(epa);
  }
  // --- FIN DEL NUEVO MÉTODO ---

  async findTratamientosByEpaId(id: number): Promise<Tratamiento[]> {
    const epa = await this.epaRepo.findOne({
      where: { id },
      relations: ['tratamientos', 'tratamientos.tratamiento'],
    });

    if (!epa) {
      throw new NotFoundException(`EPA con ID ${id} no encontrada.`);
    }

    return epa.tratamientos
      .map((et) => et.tratamiento)
      .filter((t) => t !== null) as Tratamiento[];
  }
}