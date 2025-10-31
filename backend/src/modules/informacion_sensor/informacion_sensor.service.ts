import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InformacionSensor } from './entities/informacion_sensor.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';
import { UpdateInformacionSensorDto } from './dto/update-informacion_sensor.dto';

@Injectable()
export class InformacionSensorService {
  private readonly logger = new Logger(InformacionSensorService.name);

  constructor(
    @InjectRepository(InformacionSensor)
    private readonly infoRepo: Repository<InformacionSensor>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
  ) {}

  /**
   * Crea un nuevo registro de información de sensor.
   */
  async create(createDto: CreateInformacionSensorDto): Promise<InformacionSensor> {
    const { sensorId, valor } = createDto;

    // 1. Busca el sensor al que pertenecen los datos
    const sensor = await this.sensorRepo.findOneBy({ id: sensorId });
    if (!sensor) {
      this.logger.error(`Sensor con ID ${sensorId} no fue encontrado.`);
      throw new NotFoundException(`Sensor con ID ${sensorId} no fue encontrado.`);
    }

    // 2. Crea la nueva entrada de información
    const nuevaInfo = this.infoRepo.create({
      valor,
      sensor,
      // fechaRegistro se llena automáticamente gracias a @CreateDateColumn
    });

    // 3. Guarda en la base de datos
    return this.infoRepo.save(nuevaInfo);
  }

  /**
   * Devuelve los últimos 50 registros (para la API REST)
   */
  async findAll(): Promise<InformacionSensor[]> {
    return this.infoRepo.find({
      relations: ['sensor'],
      order: { fechaRegistro: 'DESC' },
      take: 50,
    });
  }

  // --- Métodos placeholder que ya tenías ---

  findOne(id: number) {
    return `This action returns a #${id} informacionSensor`;
  }

  update(id: number, updateDto: UpdateInformacionSensorDto) {
    return `This action updates a #${id} informacionSensor`;
  }

  remove(id: number) {
    return `This action removes a #${id} informacionSensor`;
  }
}