import { Controller, Get, Post, Put, Body, Param, Delete, UseGuards, ParseIntPipe, Res } from '@nestjs/common';
import { Permission } from '../../authorization/permission.decorator';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { FinanzasService } from './finanzas.service';
import { VentasService } from '../ventas/ventas.service';
import { CreateVentaDto } from '../ventas/dto/create-venta.dto';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('finanzas')
@UseGuards(JwtAuthGuard)
export class FinanzasController {
  constructor(
    private readonly finanzasService: FinanzasService,
    private readonly ventasService: VentasService,
  ) {}

  @Get('cosechas-disponibles')
  @Permission('Finanzas.Ver')
  async obtenerCosechasDisponibles() {
    return this.finanzasService.obtenerCosechasDisponibles();
  }

  @Get('materiales-disponibles')
  @Permission('Finanzas.Ver')
  async obtenerMaterialesDisponibles() {
    return this.finanzasService.obtenerMaterialesDisponibles();
  }

  // Endpoints de transacciones (ventas)
  @Post('transacciones')
  @Permission('Finanzas.Crear')
  async createVenta(@Body() createVentaDto: CreateVentaDto) {
    const data = await this.ventasService.create(createVentaDto);
    return { success: true, message: 'Venta registrada con éxito.', data };
  }

  @Get('transacciones')
  @Permission('Finanzas.Ver')
  async findAllVentas() {
    const data = await this.ventasService.findAll();
    return { success: true, data };
  }

  @Put('transacciones/:id')
  @Permission('Finanzas.Editar')
  async updateVenta(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateVentaDto>) {
    const data = await this.ventasService.update(id, dto);
    return { success: true, message: 'Venta actualizada con éxito.', data };
  }

  @Delete('transacciones/:id')
  @Permission('Finanzas.Eliminar')
  async removeVenta(@Param('id', ParseIntPipe) id: number) {
    await this.ventasService.remove(id);
    return { success: true, message: 'Venta eliminada con éxito.' };
  }

  @Get('transacciones/:id/factura')
  @Permission('Finanzas.Exportar')
  async descargarFacturaVenta(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const filePath = await this.ventasService.findFactura(id);
    const file = createReadStream(join(process.cwd(), filePath));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-venta-${id}.pdf`);
    file.pipe(res);
  }

  // Estadísticas y flujo
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

  @Get('cultivos-disponibles')
  @Permission('Finanzas.Exportar')
  async obtenerCultivosDisponibles() {
    const cultivos = await this.finanzasService.obtenerCultivosDisponibles();
    return { success: true, data: cultivos };
  }
}