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
} from '@nestjs/common';
import { SurcosService } from './surcos.service';
import { CreateSurcoDto } from './dto/create-surco.dto';
import { UpdateSurcoDto } from './dto/update-surco.dto';
import { UpdateSurcoEstadoDto } from './dto/update-surco-estado.dto';
import { UpdateSurcoMqttDto } from './dto/update-surco-mqtt.dto';

@Controller('surcos')
export class SurcosController {
  constructor(private readonly surcosService: SurcosService) {}

  @Post('crear')
  async crear(@Body() data: CreateSurcoDto) {
    const nuevo = await this.surcosService.crear(data);
    return {
      success: true,
      message: `El surco "${nuevo.nombre}" se creó correctamente`,
      data: nuevo,
    };
  }

  @Get('listar')
  async listar() {
    const lista = await this.surcosService.listar();
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get('lotes/:loteId/surcos')
  async listarPorLote(@Param('loteId', ParseIntPipe) loteId: number) {
    const lista = await this.surcosService.listarPorLote(loteId);
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const surco = await this.surcosService.buscarPorId(id);
    return {
      success: true,
      data: surco,
    };
  }

  @Put('actualizar/:id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateSurcoDto,
  ) {
    const actualizado = await this.surcosService.actualizar(id, data);
    return {
      success: true,
      message: `El surco con ID ${id} se actualizó correctamente`,
      data: actualizado,
    };
  }

  @Delete('eliminar/:id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.surcosService.eliminar(id);
    return {
      success: true,
      message: `El surco con ID ${id} fue eliminado correctamente`,
    };
  }

  @Patch('actualizar/:id/estado')
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateSurcoEstadoDto,
  ) {
    const actualizado = await this.surcosService.actualizarEstado(id, data);
    return {
      success: true,
      message: `El estado del surco se actualizó a "${actualizado.estado}"`,
      data: actualizado,
    };
  }

  @Patch('actualizar/:id/mqtt')
  async actualizarMqtt(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateSurcoMqttDto,
  ) {
    const actualizado = await this.surcosService.actualizarMqtt(id, data);
    return {
      success: true,
      message: `La recepción de datos MQTT del surco se ${actualizado.activo_mqtt ? 'activó' : 'desactivó'}`,
      data: actualizado,
    };
  }

  @Post(':id/sincronizar')
  sincronizarSensores(@Param('id') id: string) {
    return this.surcosService.sincronizarSensores(+id);
  }
}
