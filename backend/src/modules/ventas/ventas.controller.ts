import { Controller, Get, Post, Body, Param, Res, ParseIntPipe } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  async create(@Body() createVentaDto: CreateVentaDto) {
    const data = await this.ventasService.create(createVentaDto);
    return { success: true, message: 'Venta registrada con éxito.', data };
  }

  @Get()
  async findAll() {
    const data = await this.ventasService.findAll();
    return { success: true, data };
  }

  @Get(':id/factura')
  async descargarFactura(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
      const filePath = await this.ventasService.findFactura(id);
      const file = createReadStream(join(process.cwd(), filePath));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura-venta-${id}.pdf`);
      file.pipe(res);
  }

  @Get('flujo-mensual')
  async getFlujoMensual() {
    const data = await this.ventasService.getFlujoMensual();
    return { success: true, data };
  }
}