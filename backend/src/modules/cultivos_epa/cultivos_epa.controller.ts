import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CultivosEpaService } from './cultivos_epa.service';
import { CreateCultivosEpaDto } from './dto/create-cultivos_epa.dto';
import { UpdateCultivosEpaDto } from './dto/update-cultivos_epa.dto';

@Controller('cultivos-epa')
export class CultivosEpaController {
  constructor(private readonly cultivosEpaService: CultivosEpaService) {}

  @Post()
  create(@Body() createCultivosEpaDto: CreateCultivosEpaDto) {
    return this.cultivosEpaService.create(createCultivosEpaDto);
  }

  @Get()
  findAll() {
    return this.cultivosEpaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cultivosEpaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCultivosEpaDto: UpdateCultivosEpaDto) {
    return this.cultivosEpaService.update(+id, updateCultivosEpaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cultivosEpaService.remove(+id);
  }
}

