import { Controller, Get, Post, Body, Param, Res, ParseIntPipe, Delete, UseGuards} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('ventas')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @Permission('Finanzas.Crear')
  async create(@Body() createVentaDto: CreateVentaDto) {
    const data = await this.ventasService.create(createVentaDto);
    return { success: true, message: 'Venta registrada con éxito.', data };
  }

  @Get()
  @Permission('Finanzas.Ver')
  async findAll() {
    const data = await this.ventasService.findAll();
    return { success: true, data };
  }

  @Get(':id/factura')
  @Permission('Finanzas.Ver')
  async descargarFactura(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
      const filePath = await this.ventasService.findFactura(id);
      const file = createReadStream(join(process.cwd(), filePath));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura-venta-${id}.pdf`);
      file.pipe(res);
  }

  @Get('flujo-mensual')
  @Permission('Finanzas.Ver')
  async getFlujoMensual() {
    const data = await this.ventasService.getFlujoMensual();
    return { success: true, data };
  }


  @Delete(':id')
  @Permission('Finanzas.Eliminar')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ventasService.remove(id);
    return { success: true, message: 'Venta eliminada con éxito.' };
  }
}