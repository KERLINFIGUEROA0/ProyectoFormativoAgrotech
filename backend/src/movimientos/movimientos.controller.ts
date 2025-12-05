import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { JwtAuthGuard } from '../authorization/jwt.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { Permission } from '../authorization/permission.decorator';

@Controller('inventario/movimientos')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Get('historial')
  @Permission('Inventario.Ver')
  async obtenerHistorial() {
    const movimientos = await this.movimientosService.obtenerHistorial();
    return {
      success: true,
      data: movimientos,
      total: movimientos.length,
    };
  }

  @Get('historial/:materialId')
  @Permission('Inventario.Ver')
  async obtenerHistorialPorMaterial(@Param('materialId', ParseIntPipe) materialId: number) {
    const movimientos = await this.movimientosService.obtenerHistorial(materialId);
    return {
      success: true,
      data: movimientos,
      total: movimientos.length,
    };
  }

  @Post('registrar')
  @Permission('Inventario.Crear')
  async registrarMovimiento(@Body() data: {
    tipo: string;
    cantidad: number;
    materialId: number;
    descripcion: string;
    referencia?: string;
    usuarioId: number;
  }) {
    const movimiento = await this.movimientosService.registrarMovimiento(
      data.tipo as any,
      data.cantidad,
      data.materialId,
      data.descripcion,
      data.referencia,
      data.usuarioId,
    );
    return {
      success: true,
      message: 'Movimiento registrado exitosamente.',
      data: movimiento,
    };
  }
}
