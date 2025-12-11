import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CultivosEpaService } from './cultivos_epa.service';
import { CreateCultivosEpaDto } from './dto/create-cultivos_epa.dto';
import { UpdateCultivosEpaDto } from './dto/update-cultivos_epa.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('cultivos-epa')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CultivosEpaController {
  constructor(private readonly cultivosEpaService: CultivosEpaService) {}

  @Post()
  @Permission('Fitosanitario.Crear')
  create(@Body() createCultivosEpaDto: CreateCultivosEpaDto) {
    return this.cultivosEpaService.create(createCultivosEpaDto);
  }

  @Get()
  @Permission('Fitosanitario.Ver')
  findAll() {
    return this.cultivosEpaService.findAll();
  }

  @Get(':id')
  @Permission('Fitosanitario.Ver')
  findOne(@Param('id') id: string) {
    return this.cultivosEpaService.findOne(+id);
  }

  @Patch(':id')
  @Permission('Fitosanitario.Editar')
  update(@Param('id') id: string, @Body() updateCultivosEpaDto: UpdateCultivosEpaDto) {
    return this.cultivosEpaService.update(+id, updateCultivosEpaDto);
  }

  @Delete(':id')
  @Permission('Fitosanitario.Eliminar')
  remove(@Param('id') id: string) {
    return this.cultivosEpaService.remove(+id);
  }
}

