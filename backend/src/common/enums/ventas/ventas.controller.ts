import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../../../authorization/jwt.guard';
import { PermissionGuard } from '../../../authorization/permission.guard';
import { Permission } from '../../../authorization/permission.decorator';

@Controller('finanzas')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // Este endpoint ahora usa la lógica correcta de VentasService
  @Post('transacciones')
  @Permission('Finanzas.Crear')
  async create(@Body() createVentaDto: CreateVentaDto) {
    const data = await this.ventasService.create(createVentaDto);
    return { success: true, message: 'Venta registrada con éxito.', data };
  }

  // Este endpoint ahora devuelve los datos formateados correctamente
  @Get('transacciones')
  @Permission('Finanzas.Ver')
  async findAll() {
    const data = await this.ventasService.findAll();
    return { success: true, data };
  }

  // El resto de los endpoints se mantienen igual
  @Get('estadisticas')
  @Permission('Finanzas.Ver')
  async getEstadisticas() {
    const data = await this.ventasService.getEstadisticas();
    return { success: true, data };
  }

  @Get('flujo-mensual')
  @Permission('Finanzas.Ver')
  async getFlujoMensual() {
    const data = await this.ventasService.getFlujoMensual();
    return { success: true, data };
  }

  @Get('distribucion-egresos')
  @Permission('Finanzas.Ver')
  async getDistribucionEgresos() {
    const data = await this.ventasService.getDistribucionEgresos();
    return { success: true, data };
  }
}