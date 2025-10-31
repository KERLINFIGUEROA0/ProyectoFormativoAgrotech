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
import { UsuarioPermisoService } from './usuarios_permisos.service';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard'; 
import { Permission } from '../../authorization/permission.decorator'; 

@Controller('usuario-permisos')
@UseGuards(JwtAuthGuard, PermissionGuard) 
export class UsuarioPermisoController {
  constructor(private readonly usuarioPermisoService: UsuarioPermisoService) {}

  @Get('usuario/:usuarioId')
  @Permission('Usuarios.Ver') 
  async getPermissionsForUser(@Param('usuarioId') usuarioId: string) {
    try {
      const permissions =
        await this.usuarioPermisoService.getPermissionsForUser(+usuarioId);
      return {
        success: true,
        message: `Permisos para el usuario ${usuarioId} obtenidos.`,
        data: permissions,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener los permisos del usuario.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('toggle')
  @Permission('Usuarios.Asignar') 
  async togglePermission(
    @Body() dto: { usuarioId: number; permisoId: number; estado: boolean },
  ) {
    try {
      const result = await this.usuarioPermisoService.togglePermission(dto);
      return {
        success: true,
        message: 'Permiso de usuario actualizado correctamente.',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar el permiso del usuario.',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
