import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './entities/sensore.entity';
import { CreateSensoreDto } from './dto/create-sensore.dto';
import { UpdateSensoreDto } from './dto/update-sensore.dto';
import { Surco } from '../surcos/entities/surco.entity';
import { TipoSensor } from '../tipo_sensor/entities/tipo_sensor.entity';

@Injectable()
export class SensoresService {
  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @InjectRepository(Surco)
    private readonly surcoRepo: Repository<Surco>,
    @InjectRepository(TipoSensor)
    private readonly tipoSensorRepo: Repository<TipoSensor>,
  ) {}

  // --- El método findOne es necesario para update y remove ---
  async findOne(id: number): Promise<Sensor> {
    const sensor = await this.sensorRepo.findOne({
      where: { id },
      relations: ['surco', 'tipoSensor', 'surco.lote'],
    });
    if (!sensor) {
      throw new NotFoundException(`Sensor con ID ${id} no encontrado.`);
    }
    return sensor;
  }

  async create(createSensoreDto: CreateSensoreDto): Promise<Sensor> {
    const { surcoId, tipoSensorId } = createSensoreDto;
    const surco = await this.surcoRepo.findOne({ where: { id: surcoId } });
    if (!surco) throw new NotFoundException(`El surco con ID ${surcoId} no fue encontrado.`);
    const tipoSensor = await this.tipoSensorRepo.findOne({ where: { id: tipoSensorId } });
    if (!tipoSensor) throw new NotFoundException(`El tipo de sensor con ID ${tipoSensorId} no fue encontrado.`);
    const nuevoSensor = this.sensorRepo.create({ ...createSensoreDto, surco, tipoSensor });
    return this.sensorRepo.save(nuevoSensor);
  }

  async findAll(): Promise<Sensor[]> {
    return this.sensorRepo.find({ relations: ['surco', 'tipoSensor', 'surco.lote'] });
  }

  // --- LÓGICA PARA ACTUALIZAR (EDITAR) ---
  async update(id: number, updateSensoreDto: UpdateSensoreDto): Promise<Sensor> {
    const sensor = await this.findOne(id); // Primero, busca el sensor
    
    // Si se envía un nuevo surcoId o tipoSensorId, los actualiza
    const { surcoId, tipoSensorId } = updateSensoreDto;
    if (surcoId) {
      const surco = await this.surcoRepo.findOne({ where: { id: surcoId } });
      if (!surco) throw new NotFoundException(`El surco con ID ${surcoId} no fue encontrado.`);
      sensor.surco = surco;
    }
    if (tipoSensorId) {
      const tipoSensor = await this.tipoSensorRepo.findOne({ where: { id: tipoSensorId } });
      if (!tipoSensor) throw new NotFoundException(`El tipo de sensor con ID ${tipoSensorId} no fue encontrado.`);
      sensor.tipoSensor = tipoSensor;
    }
    
    // Combina los datos nuevos con los existentes
    Object.assign(sensor, updateSensoreDto);
    return this.sensorRepo.save(sensor);
  }

  // --- LÓGICA PARA ELIMINAR ---
  async remove(id: number): Promise<void> {
    const sensor = await this.findOne(id); // Asegura que el sensor exista
    await this.sensorRepo.remove(sensor); // Lo elimina
  }
}