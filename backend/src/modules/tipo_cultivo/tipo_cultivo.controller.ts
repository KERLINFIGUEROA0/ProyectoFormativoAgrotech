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
  UseGuards,
} from '@nestjs/common';
import { TipoCultivoService } from './tipo_cultivo.service';
import { CreateTipoCultivoDto } from './dto/create-tipo_cultivo.dto';
import { UpdateTipoCultivoDto } from './dto/update-tipo_cultivo.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('tipo-cultivo')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TipoCultivoController {
  constructor(private readonly tipoCultivoService: TipoCultivoService) {}

  @Post('crear')
  @Permission('TipoCultivo.Crear')
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
  @Permission('TipoCultivo.Ver')
  async listar() {
    const lista = await this.tipoCultivoService.listar();
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get(':id')
  @Permission('TipoCultivo.Ver')
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
  @Permission('TipoCultivo.Editar')
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
  @Permission('TipoCultivo.Eliminar')
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
