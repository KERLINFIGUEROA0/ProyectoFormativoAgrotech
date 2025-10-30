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

  async searchExternal(query: string): Promise<Partial<Epa>[]> {
    const apiKey = process.env.TREFLE_API_KEY || 'INVALID_KEY'; // Usamos una clave inválida a propósito
    const url = `https://trefle.io/api/v1/plants/search?token=${apiKey}&q=${query}`;
    

    const observable = this.httpService.get(url).pipe(
      catchError(error => {
   
        this.logger.error(`Error al conectar con la API externa: ${error.message}. Se usarán datos de simulación.`);
        return of({ data: null });
      }),
    );


    const { data } = await firstValueFrom(observable);
 


    if (data && data.data) {
      this.logger.log('Respuesta recibida de la API externa.');
      return data.data.map((item: any) => ({
        id: -Math.floor(Math.random() * 10000),
        nombre: `${item.common_name || 'Desconocido'} (Externa)`,
        descripcion: `Nombre científico: ${item.scientific_name}`,
        tipoEnfermedad: 'Plaga',
        img: item.image_url,
      }));
    }


    this.logger.log('Devolviendo datos de simulación (mockData).');
    const mockData = {
      data: [
        { common_name: 'Roya del Café', scientific_name: 'Hemileia vastatrix', image_url: 'https://placehold.co/600x400/orange/white?text=Roya+(Externa)' },
        { common_name: 'Broca del Café', scientific_name: 'Hypothenemus hampei', image_url: 'https://placehold.co/600x400/8B4513/white?text=Broca+(Externa)' },
        { common_name: 'Pulgón Verde', scientific_name: 'Aphis gossypii', image_url: 'https://placehold.co/600x400/228B22/white?text=Pulgón+(Externa)' },
      ]
    };
    
    return mockData.data.map((item: any) => ({
      id: -Math.floor(Math.random() * 10000),
      nombre: `${item.common_name} (Externa)`,
      descripcion: `Nombre científico: ${item.scientific_name}`,
      tipoEnfermedad: item.common_name.toLowerCase().includes('roya') ? 'Enfermedad' : 'Plaga',
      img: item.image_url,
    }));
  }

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

  async findTratamientosByEpaId(id: number): Promise<Tratamiento[]> {
    const epa = await this.epaRepo.findOne({
      where: { id },
      relations: ['tratamientos', 'tratamientos.tratamiento'],
    });

    if (!epa) {
      throw new NotFoundException(`EPA con ID ${id} no encontrada.`);
    }

    return epa.tratamientos.map(et => et.tratamiento).filter(t => t !== null) as Tratamiento[];
  }
}