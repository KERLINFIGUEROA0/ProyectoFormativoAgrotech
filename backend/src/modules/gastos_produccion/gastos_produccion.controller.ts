import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GastosProduccionService } from './gastos_produccion.service';
import { CreateGastosProduccionDto } from './dto/create-gastos_produccion.dto';
import { UpdateGastosProduccionDto } from './dto/update-gastos_produccion.dto';

@Controller('gastos-produccion')
export class GastosProduccionController {
  constructor(private readonly gastosProduccionService: GastosProduccionService) {}

  @Post()
  create(@Body() createGastosProduccionDto: CreateGastosProduccionDto) {
    return this.gastosProduccionService.create(createGastosProduccionDto);
  }

  @Get()
  findAll() {
    return this.gastosProduccionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gastosProduccionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGastosProduccionDto: UpdateGastosProduccionDto) {
    return this.gastosProduccionService.update(+id, updateGastosProduccionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gastosProduccionService.remove(+id);
  }
}

