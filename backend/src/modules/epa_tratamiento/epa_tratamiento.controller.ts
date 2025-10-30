import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EpaTratamientoService } from './epa_tratamiento.service';
import { CreateEpaTratamientoDto } from './dto/create-epa_tratamiento.dto';
import { UpdateEpaTratamientoDto } from './dto/update-epa_tratamiento.dto';

@Controller('epa-tratamiento')
export class EpaTratamientoController {
  constructor(private readonly epaTratamientoService: EpaTratamientoService) {}

  @Post()
  create(@Body() createEpaTratamientoDto: CreateEpaTratamientoDto) {
    return this.epaTratamientoService.create(createEpaTratamientoDto);
  }

  @Get()
  findAll() {
    return this.epaTratamientoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.epaTratamientoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEpaTratamientoDto: UpdateEpaTratamientoDto) {
    return this.epaTratamientoService.update(+id, updateEpaTratamientoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.epaTratamientoService.remove(+id);
  }
}

