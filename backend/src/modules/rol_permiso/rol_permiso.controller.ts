import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RolPermisoService } from './rol_permiso.service';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('rol-permisos')
@UseGuards(JwtAuthGuard, PermissionGuard) // <-- AÑADIR SEGURIDAD
export class RolPermisoController {
  constructor(private readonly rolPermisoService: RolPermisoService) {}

  @Get('rol/:rolId')
  @Permission('Usuarios.VerPermisos') // <-- AÑADIR PERMISO
  async getPermissionsByRole(@Param('rolId') rolId: string) {
    try {
      const permissions = await this.rolPermisoService.getPermissionsByRole(
        +rolId,
      );
      return {
        success: true,
        message: `Permisos para el rol ${rolId} obtenidos.`,
        data: permissions,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener los permisos del rol.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('toggle')
  @Permission('Usuarios.Asignar') // <-- AÑADIR PERMISO
  async togglePermission(
    @Body() dto: { rolId: number; permisoId: number; estado: boolean },
  ) {
    try {
      const result = await this.rolPermisoService.togglePermission(dto);
      return {
        success: true,
        message: 'Permiso actualizado correctamente.',
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('rol/:rolId/detallado')
  @Permission('Usuarios.VerPermisos') // <-- AÑADIR PERMISO
  async getPermissionsByRoleDetallado(@Param('rolId') rolId: string) {
    try {
      const permissions = await this.rolPermisoService.getPermissionsByRoleDetallado(
        +rolId,
      );
      return {
        success: true,
        message: `Permisos detallados para el rol ${rolId} obtenidos.`,
        data: permissions,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener los permisos detallados del rol.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


