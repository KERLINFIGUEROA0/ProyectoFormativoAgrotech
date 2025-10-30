import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { TipoSensorService } from './tipo_sensor.service';
// --- CORRECCIÓN AQUÍ: Cambia el guion bajo (_) por un guion medio (-) ---
import { CreateTipoSensorDto } from './dto/create-tipo_sensor.dto';
import { UpdateTipoSensorDto } from './dto/update-tipo_sensor.dto';

@Controller('tipo-sensor')
export class TipoSensorController {
  constructor(private readonly tipoSensorService: TipoSensorService) {}

  @Post('crear')
  async create(@Body() createTipoSensorDto: CreateTipoSensorDto) {
    const nuevo = await this.tipoSensorService.create(createTipoSensorDto);
    return {
      success: true,
      message: `Tipo de sensor "${nuevo.nombre}" creado con éxito.`,
      data: nuevo,
    };
  }

  @Get('listar')
  async findAll() {
    const tipos = await this.tipoSensorService.findAll();
    return {
      success: true,
      data: tipos,
    };
  }

  // ... (el resto del código sigue igual)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const tipo = await this.tipoSensorService.findOne(id);
    if (!tipo) {
        throw new NotFoundException(`El tipo de sensor con ID ${id} no fue encontrado.`);
    }
    return {
      success: true,
      data: tipo,
    };
  }

  @Patch('actualizar/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateTipoSensorDto: UpdateTipoSensorDto) {
    const actualizado = await this.tipoSensorService.update(id, updateTipoSensorDto);
    return {
        success: true,
        message: `Tipo de sensor con ID ${id} actualizado.`,
        data: actualizado
    };
  }

  @Delete('eliminar/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const resultado = await this.tipoSensorService.remove(id);
    return resultado;
  }
}