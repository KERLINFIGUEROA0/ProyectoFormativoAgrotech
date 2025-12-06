import {
  Controller,
  UseGuards,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  HttpException,
  HttpStatus,
  Req,
  Res,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../../config/multer/multer.config';


import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { FichasService } from '../../modules/fichas/fichas.service';


@Controller('usuarios')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly fichasService: FichasService,
  ) {}
  @Post('crear')
  @Permission('Usuarios.Crear')
  
  async crear(@Body() data: CreateUsuarioDto) {
    try {
      const usuario = await this.usuariosService.crear(data);
      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: usuario,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al registrar el usuario',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Post('cargar-excel')
  @UseInterceptors(FileInterceptor('file'))
  @Permission('Usuarios.Crear')
  
  async cargarExcel(@UploadedFile() file: Express.Multer.File) {
    try {
      const resultado = await this.usuariosService.cargarDesdeExcel(file);
      return {
        success: true,
        message: `Carga de usuarios desde Excel completada. Creados: ${resultado.creados}. Errores: ${resultado.errores.length}`,
        data: resultado,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al cargar usuarios desde Excel',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Get('exportar-excel')
  @Permission('Usuarios.Ver')
  
  async exportarExcel(@Res() res: Response) {
    try {
      const buffer = await this.usuariosService.exportarExcel();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=usuarios.xlsx');
      res.send(buffer);
    } catch (error) {
      throw new HttpException(
        'Error al generar el archivo Excel.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Permission('Usuarios.Ver')
  
  async buscarTodos() {
    try {
      const usuarios = await this.usuariosService.buscarTodos();
      return {
        success: true,
        message:
          usuarios.length > 0
            ? 'Lista de usuarios obtenida'
            : 'No hay usuarios registrados',
        data: usuarios,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al listar usuarios',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('buscar')
  @Permission('Usuarios.Ver')
  
  async buscar(
    @Query() criterios: { nombre?: string; identificacion?: string; rol?: string },
  ) {
    try {
      const usuarios = await this.usuariosService.buscar(criterios);
      return {
        success: true,
        message:
          usuarios.length > 0
            ? 'Usuarios encontrados según los criterios.'
            : 'No se encontraron usuarios con los criterios de búsqueda.',
        data: usuarios,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al buscar usuarios',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('asignables')
  @Permission('Usuarios.Ver') // Reutilizamos el permiso de ver usuarios
  async getAssignableUsers() {
    try {
      const usuarios = await this.usuariosService.findAssignableUsers();
      // Mapeamos para que coincida con la interfaz UsuarioSimple del frontend
      const data = usuarios.map(u => ({
        id: u.id,
        identificacion: u.identificacion,
        nombre: u.nombre,
        apellidos: u.apellidos,
        ficha: u.ficha ? {
          id: u.ficha.id,
          nombre: u.ficha.nombre,
          id_ficha: u.ficha.id_ficha,
        } : undefined,
      }));
      
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener usuarios asignables',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('buscar/:id')
  @Permission('Usuarios.Ver')
  
  async buscarPorId(@Param('id') id: number) {
    try {
      const usuario = await this.usuariosService.buscarPorId(id);
      return {
        success: true,
        message: `Usuario con id ${id} encontrado`,
        data: usuario,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Usuario con id ${id} no encontrado`,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
  @Put('actualizar/:id')
  @Permission('Usuarios.Editar')

  async actualizar(@Param('id') id: number, @Body() data: UpdateUsuarioDto) {
    try {
      const usuario = await this.usuariosService.actualizar(id, data);
      return {
        success: true,
        message: `Usuario con id ${id} actualizado exitosamente`,
        data: usuario,
        note: data.tipoUsuario ? 'Los permisos del usuario se actualizarán en el próximo login' : undefined,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Error al actualizar el usuario con id ${id}`,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Delete('eliminar/:id')
  @Permission('Usuarios.Eliminar')
  
  async eliminar(@Param('id') id: number) {
    try {
      await this.usuariosService.eliminar(id);
      return {
        success: true,
        message: `Usuario con id ${id} eliminado exitosamente`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Error al eliminar el usuario con id ${id}`,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
  @Patch('reactivar/:id')
  @Permission('Usuarios.Editar')

  async reactivar(@Param('id') id: number) {
    try {
      await this.usuariosService.reactivar(id);
      return {
        success: true,
        message: `Usuario con id ${id} reactivado exitosamente`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Error al reactivar el usuario con id ${id}`,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete('eliminar-permanente/:id')
  @Permission('Usuarios.Eliminar')

  async eliminarPermanente(@Param('id') id: number) {
    try {
      await this.usuariosService.deleteUsuario(id);
      return {
        success: true,
        message: `Usuario con id ${id} eliminado permanentemente`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Error al eliminar permanentemente el usuario con id ${id}`,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
  @Get('identificacion/:identificacion')
  @Permission('Usuarios.Ver')
  
  async findByIdentificacion(@Param('identificacion') identificacion: string) {
    try {
      const usuario =
        await this.usuariosService.findByIdentificacion(identificacion);
      if (!usuario) {
        throw new HttpException(
          {
            success: false,
            message: 'Usuario no encontrado',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: 'Usuario encontrado',
        data: usuario,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al buscar usuario',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Post('cambiarpassword')
  
  async cambiarPassword(@Req() req, @Body() body: CambiarPasswordDto) {
    try {
      const usuarioId = req.user.id;
      const result = await this.usuariosService.cambiarPassword(
        usuarioId,
        body.actual,
        body.nueva,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al cambiar la contraseña',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Get('perfil')

   async obtenerPerfil(@Req() req) {
     try {
       const usuarioId = req.user.id;
       const usuario = await this.usuariosService.buscarPorId(usuarioId);

       // Obtener permisos del rol
       const permisosRol = (usuario.tipoUsuario?.rolPermisos ?? [])
         .map((rp) => rp.permiso?.nombre)
         .filter(Boolean) as string[];

       // Obtener permisos individuales del usuario
       const permisosUsuario = (usuario.usuarioPermisos ?? [])
         .map((up) => up.permiso?.nombre)
         .filter(Boolean) as string[];

       // Combinar permisos únicos
       const permisos = Array.from(new Set([...permisosRol, ...permisosUsuario]));

       // Agrupar permisos por módulo
       const modulos = (usuario.tipoUsuario?.rolPermisos ?? [])
         .map((rp) => rp.permiso)
         .concat((usuario.usuarioPermisos ?? []).map((up) => up.permiso))
         .filter(Boolean)
         .reduce((acc: Record<string, string[]>, p: any) => {
           const moduloNombre = p?.modulo?.nombre || 'General';
           acc[moduloNombre] = acc[moduloNombre] || [];
           if (!acc[moduloNombre].includes(p.nombre)) {
             acc[moduloNombre].push(p.nombre);
           }
           return acc;
         }, {});

       return {
         success: true,
         message: 'Perfil obtenido correctamente',
         data: {
           tipoIdentificacion: usuario.Tipo_Identificacion,
           identificacion: usuario.identificacion,
           nombres: usuario.nombre,
           apellidos: usuario.apellidos,
           correo: usuario.correo,
           telefono: usuario.telefono,
           rolNombre: usuario.tipoUsuario?.nombre || 'Usuario',
           permisos,
           modulos,
         },
       };
     } catch (error) {
       throw new HttpException(
         {
           success: false,
           message: 'Error al obtener perfil',
           error: error.message,
         },
         HttpStatus.BAD_REQUEST,
       );
     }
   }
  @Put('editarperfil')

  async editarPerfil(@Req() req, @Body() data: UpdatePerfilDto) {
    try {
      const usuarioId = req.user.id;
      const usuario = await this.usuariosService.actualizarPerfil(
        usuarioId,
        data,
      );
      return {
        success: true,
        message: 'Perfil actualizado correctamente',
        data: usuario,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar perfil',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Post('fotoperfil')
  @UseInterceptors(FileInterceptor('file', multerConfig))

  async uploadProfilePic(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const userId = req.user.id;
    return this.usuariosService.updateProfilePic(userId, file.filename);
  }
  @Get('fotoperfil')

  async getProfilePic(@Req() req: any, @Res() res: any) {
    const userId = req.user.id;
    return this.usuariosService.getProfilePic(userId, res);
  }

  @Get('fichas/opciones')
  @Permission('Usuarios.Ver')
  async getFichasOpciones() {
    try {
      const opciones = await this.fichasService.getOpciones();
      return {
        success: true,
        message: 'Opciones de fichas obtenidas',
        data: opciones,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener opciones de fichas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('exportar-excel-filtrado')
  @Permission('Usuarios.Ver')
  async exportarExcelFiltrado(@Body() filtros: any, @Res() res: Response) {
    try {
      const buffer = await this.usuariosService.exportarExcelFiltrado(filtros);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=usuarios_filtrados.xlsx');
      res.send(buffer);
    } catch (error) {
      throw new HttpException(
        'Error al generar el archivo Excel filtrado.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
