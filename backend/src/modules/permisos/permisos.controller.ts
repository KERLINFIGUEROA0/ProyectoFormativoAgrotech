import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('permisos')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Post()
  @Permission('Modulos.Crear')
  create(@Body() dto: CreatePermisoDto) {
    return this.permisosService.create(dto);
  }

  @Get()
  @Permission('Modulos.Ver')
  findAll() {
    return this.permisosService.findAll();
  }

  @Get(':id')
  @Permission('Modulos.Ver')
  findOne(@Param('id') id: string) {
    return this.permisosService.findOne(+id);
  }

  @Put(':id')
  @Permission('Modulos.Editar')
  update(@Param('id') id: string, @Body() dto: UpdatePermisoDto) {
    return this.permisosService.update(+id, dto);
  }

  @Delete(':id')
  @Permission('Modulos.Eliminar')
  remove(@Param('id') id: string) {
    return this.permisosService.remove(+id);
  }
}

