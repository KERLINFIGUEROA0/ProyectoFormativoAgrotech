import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { CultivosService } from './cultivos.service';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';

@Controller('cultivos')
export class CultivosController {
  constructor(private readonly cultivosService: CultivosService) {}

  @Post('crear')
  async crear(@Body() data: CreateCultivoDto) {
    const nuevo = await this.cultivosService.crear(data);
    return {
      success: true,
      message: `El cultivo "${nuevo.nombre}" se creó correctamente`,
      data: nuevo,
    };
  }

  @Get('listar')
  async listar() {
    const lista = await this.cultivosService.listar();
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const cultivo = await this.cultivosService.buscarPorId(id);
    return {
      success: true,
      data: cultivo,
    };
  }

  @Put('actualizar/:id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateCultivoDto,
  ) {
    const actualizado = await this.cultivosService.actualizar(id, data);
    return {
      success: true,
      message: `El cultivo con ID ${id} se actualizó correctamente`,
      data: actualizado,
    };
  }

  @Delete('eliminar/:id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.cultivosService.eliminar(id);
    return {
      success: true,
      message: `El cultivo con ID ${id} fue eliminado correctamente`,
    };
  }
}

