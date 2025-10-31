import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { TipoUsuarioService } from './tipo_usuario.service';
import { CreateTipoUsuarioDto } from './dto/create-tipo_usuario.dto';
import { UpdateTipoUsuarioDto } from './dto/update-tipo_usuario.dto';

@Controller('roles')
export class TipoUsuarioController {
  constructor(private readonly tipoUsuarioService: TipoUsuarioService) {}

  @Post()
  create(@Body() dto: CreateTipoUsuarioDto) {
    return this.tipoUsuarioService.create(dto);
  }

  @Get()
  async findAll() {
    return await this.tipoUsuarioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tipoUsuarioService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTipoUsuarioDto) {
    return this.tipoUsuarioService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tipoUsuarioService.remove(+id);
  }
}

