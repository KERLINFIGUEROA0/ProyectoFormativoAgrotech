import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ActividadesMaterialesService } from './actividades_materiales.service';
import { CreateActividadesMaterialeDto } from './dto/create-actividades_materiale.dto';
import { UpdateActividadesMaterialeDto } from './dto/update-actividades_materiale.dto';

@Controller('actividades-materiales')
export class ActividadesMaterialesController {
  constructor(private readonly actividadesMaterialesService: ActividadesMaterialesService) {}

  @Post()
  create(@Body() createActividadesMaterialeDto: CreateActividadesMaterialeDto) {
    return this.actividadesMaterialesService.create(createActividadesMaterialeDto);
  }

  @Get()
  findAll() {
    return this.actividadesMaterialesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actividadesMaterialesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActividadesMaterialeDto: UpdateActividadesMaterialeDto) {
    return this.actividadesMaterialesService.update(+id, updateActividadesMaterialeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actividadesMaterialesService.remove(+id);
  }
}

