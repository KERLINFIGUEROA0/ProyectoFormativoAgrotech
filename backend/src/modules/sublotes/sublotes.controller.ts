import {
  Controller,
  Get,
  Post,
  Put,
  Patch, // <-- Importar Patch
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SublotesService } from './sublotes.service';
import { CreateSubloteDto } from './dto/create-sublote.dto';
import { UpdateSubloteDto } from './dto/update-sublote.dto';
import { UpdateSubloteEstadoDto } from './dto/update-sublote-estado.dto';
import { UpdateSubloteMqttDto } from './dto/update-sublote-mqtt.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('sublotes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SublotesController {
  constructor(private readonly sublotesService: SublotesService) {}

  @Post('crear')
  @Permission('Sublotes.Crear')
  async crear(@Body() data: CreateSubloteDto) {
    const nuevo = await this.sublotesService.crear(data);
    return {
      success: true,
      message: `El sublote "${nuevo.nombre}" se creó correctamente`,
      data: nuevo,
    };
  }

  @Get('listar')
  @Permission('Sublotes.Ver')
  async listar() {
    const lista = await this.sublotesService.listar();
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get('lotes/:loteId/sublotes')
  @Permission('Sublotes.Ver')
  async listarPorLote(@Param('loteId', ParseIntPipe) loteId: number) {
    const lista = await this.sublotesService.listarPorLote(loteId);
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get('lotes/:loteId/disponibles')
  @Permission('Sublotes.Ver')
  async listarDisponiblesPorLote(@Param('loteId', ParseIntPipe) loteId: number) {
    const lista = await this.sublotesService.listarDisponiblesPorLote(loteId);
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get(':id')
  @Permission('Sublotes.Ver')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const sublote = await this.sublotesService.buscarPorId(id);
    return {
      success: true,
      data: sublote,
    };
  }

  @Put('actualizar/:id')
  @Permission('Sublotes.Editar')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateSubloteDto,
  ) {
    const actualizado = await this.sublotesService.actualizar(id, data);
    return {
      success: true,
      message: `El sublote con ID ${id} se actualizó correctamente`,
      data: actualizado,
    };
  }

  @Delete('eliminar/:id')
  @Permission('Sublotes.Eliminar')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.sublotesService.eliminar(id);
    return {
      success: true,
      message: `El sublote con ID ${id} fue eliminado correctamente`,
    };
  }

  @Patch('actualizar/:id/estado')
  @Permission('Sublotes.Editar')
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateSubloteEstadoDto,
  ) {
    const actualizado = await this.sublotesService.actualizarEstado(id, data);
    return {
      success: true,
      message: `El estado del sublote se actualizó a "${actualizado.estado}"`,
      data: actualizado,
    };
  }

  @Patch('actualizar/:id/mqtt')
  @Permission('Sublotes.Editar')
  async actualizarMqtt(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateSubloteMqttDto,
  ) {
    const actualizado = await this.sublotesService.actualizarMqtt(id, data);
    return {
      success: true,
      message: `La recepción de datos MQTT del sublote se ${actualizado.activo_mqtt ? 'activó' : 'desactivó'}`,
      data: actualizado,
    };
  }

  @Post(':id/sincronizar')
  @Permission('Sublotes.Editar')
  sincronizarSensores(@Param('id') id: string) {
    return this.sublotesService.sincronizarSensores(+id);
  }
}
