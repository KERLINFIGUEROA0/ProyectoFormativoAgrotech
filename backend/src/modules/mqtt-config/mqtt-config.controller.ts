import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { MqttConfigService } from './mqtt-config.service';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { CreateSubscripcionDto } from './dto/create-subscripcion.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('mqtt-config')
@UseGuards(JwtAuthGuard, PermissionGuard) // Protegemos todo el módulo
export class MqttConfigController {
  constructor(private readonly configService: MqttConfigService) {}

  // --- Endpoints para Brokers ---

  @Post('brokers')
  @Permission('Iot.Crear') // Asumiendo que tienes permisos de Iot
  async createBroker(@Body() dto: CreateBrokerDto) {
    const data = await this.configService.createBroker(dto);
    return { success: true, message: 'Broker guardado.', data };
  }

  @Get('brokers')
  @Permission('Iot.Ver')
  async findAllBrokers() {
    const data = await this.configService.findAllBrokers();
    return { success: true, data };
  }

  @Put('brokers/:id')
  @Permission('Iot.Editar')
  async updateBroker(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateBrokerDto) {
    const data = await this.configService.updateBroker(id, dto);
    return { success: true, message: 'Broker actualizado.', data };
  }

  @Delete('brokers/:id')
  @Permission('Iot.Eliminar')
  async deleteBroker(@Param('id', ParseIntPipe) id: number) {
    await this.configService.deleteBroker(id);
    return { success: true, message: 'Broker eliminado.' };
  }

  @Put('brokers/:id/estado')
  @Permission('Iot.Editar')
  async updateBrokerEstado(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: 'Activo' | 'Inactivo') {
    const data = await this.configService.updateBrokerEstado(id, estado);
    return { success: true, message: 'Estado del broker actualizado.', data };
  }

  @Post('brokers/test-connection')
  @Permission('Iot.Crear')
  async testBrokerConnection(@Body() dto: CreateBrokerDto) {
    const result = await this.configService.testBrokerConnection(dto);
    return { success: true, message: result.message, connected: result.connected };
  }

  // --- Endpoints para Subscripciones (Tópicos) ---

  @Post('subscripciones')
  @Permission('Iot.Crear')
  async createSubscripcion(@Body() dto: CreateSubscripcionDto) {
    const data = await this.configService.createSubscripcion(dto);
    return { success: true, message: 'Tópico guardado.', data };
  }

  @Delete('subscripciones/:id')
  @Permission('Iot.Eliminar')
  async deleteSubscripcion(@Param('id', ParseIntPipe) id: number) {
    await this.configService.deleteSubscripcion(id);
    return { success: true, message: 'Tópico eliminado.' };
  }
}