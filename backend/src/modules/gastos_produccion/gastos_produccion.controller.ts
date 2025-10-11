import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { GastosProduccionService } from './gastos_produccion.service';
import { CreateGastosProduccionDto } from './dto/create-gastos_produccion.dto';
import { UpdateGastosProduccionDto } from './dto/update-gastos_produccion.dto';

@Controller('gastos-produccion')
export class GastosProduccionController {
  constructor(private readonly gastosProduccionService: GastosProduccionService) {}

  @Post()
  async create(@Body() createGastosProduccionDto: CreateGastosProduccionDto) {
    const data = await this.gastosProduccionService.create(createGastosProduccionDto);
    return { success: true, message: 'Gasto registrado con éxito.', data };
  }

  @Get()
  async findAll() {
    const data = await this.gastosProduccionService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.gastosProduccionService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateGastosProduccionDto: UpdateGastosProduccionDto) {
    const data = await this.gastosProduccionService.update(id, updateGastosProduccionDto);
    return { success: true, message: 'Gasto actualizado con éxito.', data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.gastosProduccionService.remove(id);
    return { success: true, message: 'Gasto eliminado con éxito.' };
  }
}

