// src/modules/producciones/producciones.controller.ts

import { Controller, Get, Post, Body, Param, ParseIntPipe, Put, Delete } from '@nestjs/common';
import { ProduccionesService } from './producciones.service';
import { CreateProduccioneDto } from './dto/create-produccione.dto';
import { UpdateProduccioneDto } from './dto/update-produccione.dto'; // Importamos el DTO de actualización

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

  // --- ✅ NUEVO: Endpoint para obtener producciones por cultivo ---
  @Get('cultivo/:cultivoId')
  async findAllByCultivo(@Param('cultivoId', ParseIntPipe) cultivoId: number) {
    const data = await this.produccionesService.findAllByCultivo(cultivoId);
    return { success: true, data };
  }

  // --- ✅ NUEVO: Endpoint para obtener las estadísticas por cultivo ---
  @Get('cultivo/:cultivoId/stats')
  async getStatsByCultivo(@Param('cultivoId', ParseIntPipe) cultivoId: number) {
    const data = await this.produccionesService.getStatsByCultivo(cultivoId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.produccionesService.findOne(id);
    return { success: true, data };
  }
  
  // --- ✅ IMPLEMENTADO: Endpoint para actualizar ---
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateProduccioneDto: UpdateProduccioneDto) {
    const data = await this.produccionesService.update(id, updateProduccioneDto);
    return { success: true, message: 'Producción actualizada con éxito.', data };
  }

  // --- ✅ IMPLEMENTADO: Endpoint para eliminar ---
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.produccionesService.remove(id);
    return { success: true, message: 'Producción eliminada con éxito.' };
  }

  // --- ✅ NUEVO: Endpoint para obtener producciones disponibles para venta ---
  @Get('available-for-sale')
  async findAvailableForSale() {
    const data = await this.produccionesService.findAvailableForSale();
    return { success: true, data };
  }
}