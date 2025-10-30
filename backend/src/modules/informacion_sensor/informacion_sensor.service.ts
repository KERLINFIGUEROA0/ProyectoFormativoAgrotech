import { Injectable } from '@nestjs/common';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';
import { UpdateInformacionSensorDto } from './dto/update-informacion_sensor.dto';

@Injectable()
export class InformacionSensorService {
  create(createInformacionSensorDto: CreateInformacionSensorDto) {
    return 'This action adds a new informacionSensor';
  }

  findAll() {
    return `This action returns all informacionSensor`;
  }

  findOne(id: number) {
    return `This action returns a #${id} informacionSensor`;
  }

  update(id: number, updateInformacionSensorDto: UpdateInformacionSensorDto) {
    return `This action updates a #${id} informacionSensor`;
  }

  remove(id: number) {
    return `This action removes a #${id} informacionSensor`;
  }
}
