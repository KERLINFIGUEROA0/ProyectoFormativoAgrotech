import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { DraculaService } from './dracula.service';
import { CreateDraculaDto } from './dto/create-dracula.dto';
import { UpdateDraculaDto } from './dto/update-dracula.dto';

@Controller('dracula')
export class DraculaController {
  constructor(private readonly draculaService: DraculaService) {}

  @Post('crear')
  async crear(@Body() data: CreateDraculaDto) {
    const nuevo = await this.draculaService.crear(data);
    return { success: true, message: `El dracula se creó correctamente`, data: nuevo };
  }

  @Get('listar')
  async listar() {
    const lista = await this.draculaService.listar();
    return { success: true, total: lista.length, data: lista };
  }

  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const dracula = await this.draculaService.buscarPorId(id);
    return { success: true, data: dracula };
  }

  @Put('actualizar/:id')
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateDraculaDto) {
    const actualizado = await this.draculaService.actualizar(id, data);
    return { success: true, message: `El dracula se actualizó`, data: actualizado };
  }

  @Delete('eliminar/:id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.draculaService.eliminar(id);
    return { success: true, message: `El dracula fue eliminado` };
  }
}