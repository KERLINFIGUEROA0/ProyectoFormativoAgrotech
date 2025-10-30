import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TipoCultivoService } from './tipo_cultivo.service';
import { CreateTipoCultivoDto } from './dto/create-tipo_cultivo.dto';
import { UpdateTipoCultivoDto } from './dto/update-tipo_cultivo.dto';

@Controller('tipo-cultivo')
export class TipoCultivoController {
  constructor(private readonly tipoCultivoService: TipoCultivoService) {}

  @Post('crear')
  async crear(@Body() data: CreateTipoCultivoDto) {
    try {
      const nuevo = await this.tipoCultivoService.crear(data);
      return {
        success: true,
        message: `El tipo de cultivo "${nuevo.nombre}" se creó correctamente`,
        data: nuevo,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error al crear el tipo de cultivo: ${error.message}`,
      );
    }
  }

  @Get('listar')
  async listar() {
    const lista = await this.tipoCultivoService.listar();
    if (!lista || lista.length === 0) {
      throw new NotFoundException('No hay tipos de cultivo registrados');
    }
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const cultivo = await this.tipoCultivoService.buscarPorId(id);
    if (!cultivo) {
      throw new NotFoundException(
        `El tipo de cultivo con ID ${id} no existe`,
      );
    }
    return {
      success: true,
      data: cultivo,
    };
  }

  @Put('actualizar/:id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTipoCultivoDto,
  ) {
    const actualizado = await this.tipoCultivoService.actualizar(id, data);
    if (!actualizado) {
      throw new NotFoundException(
        `No se pudo actualizar. El tipo de cultivo con ID ${id} no existe`,
      );
    }
    return {
      success: true,
      message: `El tipo de cultivo con ID ${id} se actualizó correctamente`,
      data: actualizado,
    };
  }

  @Delete('eliminar/:id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    const eliminado = await this.tipoCultivoService.eliminar(id);
    if (!eliminado) {
      throw new NotFoundException(
        `No se pudo eliminar. El tipo de cultivo con ID ${id} no existe`,
      );
    }
    return {
      success: true,
      message: `🗑️ El tipo de cultivo con ID ${id} se eliminó correctamente`,
    };
  }
}
