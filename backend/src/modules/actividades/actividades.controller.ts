import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { ActividadesService } from './actividades.service';
import { CreateActividadDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { Actividad } from './entities/actividade.entity';

@Controller('actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  @Post('registrar')
  create(@Body() dto: CreateActividadDto) {
    return this.actividadesService.create(dto);
  }

  @Get('listar')
  findAll() {
    return this.actividadesService.findAll();
  }

  @Get('search')
  search(@Query() query: SearchActividadDto) {
    return this.actividadesService.search(query);
  }

  @Get('listar/:id')
  findOne(@Param('id') id: string) {
    return this.actividadesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActividadDto) {
    return this.actividadesService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actividadesService.remove(Number(id));
  }
}
