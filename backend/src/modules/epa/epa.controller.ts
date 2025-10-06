import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EpaService } from './epa.service';
import { CreateEpaDto } from './dto/create-epa.dto';
import { UpdateEpaDto } from './dto/update-epa.dto';

@Controller('epa')
export class EpaController {
  constructor(private readonly epaService: EpaService) {}

  @Post()
  create(@Body() createEpaDto: CreateEpaDto) {
    return this.epaService.create(createEpaDto);
  }

  @Get()
  findAll() {
    return this.epaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.epaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEpaDto: UpdateEpaDto) {
    return this.epaService.update(+id, updateEpaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.epaService.remove(+id);
  }
}

