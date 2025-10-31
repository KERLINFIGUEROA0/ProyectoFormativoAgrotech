// src/modules/informacion_sensor/informacion_sensor.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { InformacionSensorService } from './informacion_sensor.service';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';

@Controller('informacion-sensor')
export class InformacionSensorController {
  constructor(private readonly infoSensorService: InformacionSensorService) {}

  @Post('registrar')
  create(@Body() createDto: CreateInformacionSensorDto) {
    return this.infoSensorService.create(createDto);
  }
}
