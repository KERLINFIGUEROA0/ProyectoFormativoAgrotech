import { Controller, Get, Post, Body } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Controller('finanzas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // Este endpoint ahora usa la lógica correcta de VentasService
  @Post('transacciones')
  async create(@Body() createVentaDto: CreateVentaDto) {
    const data = await this.ventasService.create(createVentaDto);
    return { success: true, message: 'Venta registrada con éxito.', data };
  }

  // Este endpoint ahora devuelve los datos formateados correctamente
  @Get('transacciones')
  async findAll() {
    const data = await this.ventasService.findAll();
    return { success: true, data };
  }

  // El resto de los endpoints se mantienen igual
  @Get('estadisticas')
  async getEstadisticas() {
    const data = await this.ventasService.getEstadisticas();
    return { success: true, data };
  }

  @Get('flujo-mensual')
  async getFlujoMensual() {
    const data = await this.ventasService.getFlujoMensual();
    return { success: true, data };
  }

  @Get('distribucion-egresos')
  async getDistribucionEgresos() {
    const data = await this.ventasService.getDistribucionEgresos();
    return { success: true, data };
  }
}