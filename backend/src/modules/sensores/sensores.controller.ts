import { Controller, Get, Post, Body, Put, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { SensoresService } from './sensores.service';
import { CreateSensoreDto } from './dto/create-sensore.dto';
import { UpdateSensoreDto } from './dto/update-sensore.dto';
import { UpdateSensoreEstadoDto } from './dto/update-sensore-estado.dto';

@Controller('sensores')
export class SensoresController {
  constructor(private readonly sensoresService: SensoresService) {}

  @Post('crear')
  async create(@Body() createSensoreDto: CreateSensoreDto) {
    const nuevo = await this.sensoresService.create(createSensoreDto);
    return { success: true, message: `Sensor "${nuevo.nombre}" creado.`, data: nuevo };
  }

  @Get('listar')
  async findAll() {
    const sensores = await this.sensoresService.findAll();
    return { success: true, data: sensores };
  }

  // --- ENDPOINT PARA ACTUALIZAR ---
  // Usa Put para reemplazar/actualizar el recurso completo.
  @Put('actualizar/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateSensoreDto: UpdateSensoreDto) {
    const actualizado = await this.sensoresService.update(id, updateSensoreDto);
    return {
      success: true,
      message: `Sensor con ID ${id} actualizado.`,
      data: actualizado,
    };
  }

  // --- ENDPOINT PARA ACTIVAR/DESACTIVAR SENSOR ---
  @Patch('actualizar/:id/estado')
  async updateEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSensoreEstadoDto) {
    const actualizado = await this.sensoresService.updateEstado(id, dto.estado);
    return {
      success: true,
      message: `El estado del sensor se actualizó a "${dto.estado}"`,
      data: actualizado,
    };
  }

  // --- ENDPOINT PARA ELIMINAR ---
  @Delete('eliminar/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sensoresService.remove(id);
    return {
      success: true,
      message: `Sensor con ID ${id} eliminado correctamente.`,
    };
  }
}