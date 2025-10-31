import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ProduccionesService } from './producciones.service';
import { CreateProduccioneDto } from './dto/create-produccione.dto';

@Controller('producciones')
export class ProduccionesController {
  constructor(private readonly produccionesService: ProduccionesService) {}

  @Post()
  async create(@Body() createProduccioneDto: CreateProduccioneDto) {
    const data = await this.produccionesService.create(createProduccioneDto);
    return { success: true, message: 'Producción registrada con éxito.', data };
  }

  @Get()
  async findAll() {
    const data = await this.produccionesService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.produccionesService.findOne(id);
    return { success: true, data };
  }
  
  // Los endpoints Patch y Delete se mantienen como estaban, puedes implementarlos después.
}