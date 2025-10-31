import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TipoSensorService } from './tipo_sensor.service';
import { CreateTipoSensorDto } from './dto/create-tipo_sensor.dto';
import { UpdateTipoSensorDto } from './dto/update-tipo_sensor.dto';

@Controller('tipo-sensor')
export class TipoSensorController {
  constructor(private readonly tipoSensorService: TipoSensorService) {}

  @Post()
  create(@Body() createTipoSensorDto: CreateTipoSensorDto) {
    return this.tipoSensorService.create(createTipoSensorDto);
  }

  @Get()
  findAll() {
    return this.tipoSensorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tipoSensorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTipoSensorDto: UpdateTipoSensorDto) {
    return this.tipoSensorService.update(+id, updateTipoSensorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tipoSensorService.remove(+id);
  }
}

