import { Controller, Get, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { TrazabilidadService } from './trazabilidad.service';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('trazabilidad')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TrazabilidadController {
  constructor(private readonly trazabilidadService: TrazabilidadService) {}

  @Get('cultivo/:id')
  @Permission('Cultivos.Ver') // Reutilizamos el permiso de ver cultivos
  async obtenerTrazabilidad(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userIdentificacion = req.user?.identificacion;
    const data = await this.trazabilidadService.obtenerTrazabilidadPorCultivo(id, userIdentificacion);
    return {
      success: true,
      data,
    };
  }
}