import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TipoUsuarioService } from './tipo_usuario.service';
import { CreateTipoUsuarioDto } from './dto/create-tipo_usuario.dto';
import { UpdateTipoUsuarioDto } from './dto/update-tipo_usuario.dto';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';
import { JwtAuthGuard } from '../../authorization/jwt.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TipoUsuarioController {
  constructor(private readonly tipoUsuarioService: TipoUsuarioService) {}

  @Post()
  @Permission('Usuarios.Crear')
  async crear(@Body() dto: CreateTipoUsuarioDto) {
    try {
      const rol = await this.tipoUsuarioService.create(dto);
      return {
        success: true,
        message: 'Rol registrado exitosamente',
        data: rol,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al registrar el rol',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permission('Usuarios.Ver')
  async findAll() {
    return await this.tipoUsuarioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tipoUsuarioService.findOne(+id);
  }

  @Put(':id')
  @Permission('Usuarios.Editar')
  update(@Param('id') id: string, @Body() dto: UpdateTipoUsuarioDto) {
    return this.tipoUsuarioService.update(+id, dto);
  }

  @Delete(':id')
  @Permission('Usuarios.EliminarRol')
  remove(@Param('id') id: string) {
    return this.tipoUsuarioService.remove(+id);
  }
}

