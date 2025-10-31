import { Injectable } from '@nestjs/common';
import { CreateTipoSensorDto } from './dto/create-tipo_sensor.dto';
import { UpdateTipoSensorDto } from './dto/update-tipo_sensor.dto';

@Injectable()
export class TipoSensorService {
  create(createTipoSensorDto: CreateTipoSensorDto) {
    return 'This action adds a new tipoSensor';
  }

  findAll() {
    return `This action returns all tipoSensor`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tipoSensor`;
  }

  update(id: number, updateTipoSensorDto: UpdateTipoSensorDto) {
    return `This action updates a #${id} tipoSensor`;
  }

  remove(id: number) {
    return `This action removes a #${id} tipoSensor`;
  }
}

