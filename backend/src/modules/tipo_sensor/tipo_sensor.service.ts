import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoSensor } from './entities/tipo_sensor.entity';
// --- CORRECCIÓN AQUÍ: Cambia el guion bajo (_) por un guion medio (-) ---
import { CreateTipoSensorDto } from './dto/create-tipo_sensor.dto';
import { UpdateTipoSensorDto } from './dto/update-tipo_sensor.dto';

@Injectable()
export class TipoSensorService {
  constructor(
    @InjectRepository(TipoSensor)
    private readonly tipoSensorRepo: Repository<TipoSensor>,
  ) {}

  create(createTipoSensorDto: CreateTipoSensorDto) {
    const nuevoTipo = this.tipoSensorRepo.create(createTipoSensorDto);
    return this.tipoSensorRepo.save(nuevoTipo);
  }

  async findAll(): Promise<TipoSensor[]> {
    return this.tipoSensorRepo.find();
  }
  
  // ... (el resto del código sigue igual)
  findOne(id: number) {
    return this.tipoSensorRepo.findOne({ where: { id } });
  }

  async update(id: number, updateTipoSensorDto: UpdateTipoSensorDto) {
    await this.tipoSensorRepo.update(id, updateTipoSensorDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.tipoSensorRepo.delete(id);
    return { success: true, message: `Tipo de sensor con ID ${id} eliminado.` };
  }
}