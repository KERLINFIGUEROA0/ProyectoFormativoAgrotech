import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EpaTratamientoService } from './epa_tratamiento.service';
import { CreateEpaTratamientoDto } from './dto/create-epa_tratamiento.dto';
import { UpdateEpaTratamientoDto } from './dto/update-epa_tratamiento.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('epa-tratamiento')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EpaTratamientoController {
  constructor(private readonly epaTratamientoService: EpaTratamientoService) {}

  @Post()
  @Permission('Fitosanitario.Crear')
  create(@Body() createEpaTratamientoDto: CreateEpaTratamientoDto) {
    return this.epaTratamientoService.create(createEpaTratamientoDto);
  }

  @Get()
  @Permission('Fitosanitario.Ver')
  findAll() {
    return this.epaTratamientoService.findAll();
  }

  @Get(':id')
  @Permission('Fitosanitario.Ver')
  findOne(@Param('id') id: string) {
    return this.epaTratamientoService.findOne(+id);
  }

  @Patch(':id')
  @Permission('Fitosanitario.Editar')
  update(@Param('id') id: string, @Body() updateEpaTratamientoDto: UpdateEpaTratamientoDto) {
    return this.epaTratamientoService.update(+id, updateEpaTratamientoDto);
  }

  @Delete(':id')
  @Permission('Fitosanitario.Eliminar')
  remove(@Param('id') id: string) {
    return this.epaTratamientoService.remove(+id);
  }
}

