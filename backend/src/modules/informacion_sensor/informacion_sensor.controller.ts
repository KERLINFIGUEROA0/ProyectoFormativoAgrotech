import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InformacionSensorService } from './informacion_sensor.service';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';
import { UpdateInformacionSensorDto } from './dto/update-informacion_sensor.dto';

@Controller('informacion-sensor')
export class InformacionSensorController {
  constructor(private readonly informacionSensorService: InformacionSensorService) {}

  @Post()
  create(@Body() createInformacionSensorDto: CreateInformacionSensorDto) {
    return this.informacionSensorService.create(createInformacionSensorDto);
  }

  @Get()
  findAll() {
    return this.informacionSensorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.informacionSensorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInformacionSensorDto: UpdateInformacionSensorDto) {
    return this.informacionSensorService.update(+id, updateInformacionSensorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.informacionSensorService.remove(+id);
  }
}
