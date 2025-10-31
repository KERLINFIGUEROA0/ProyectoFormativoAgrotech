import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MaterialesService } from './materiales.service';
import { CreateMaterialeDto } from './dto/create-materiale.dto';
import { UpdateMaterialeDto } from './dto/update-materiale.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('materiales')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  @Post()
  @Permission('Inventario.Crear')
  async create(@Body() createMaterialeDto: CreateMaterialeDto) {
    const material = await this.materialesService.create(createMaterialeDto);
    return {
      success: true,
      message: `Material "${material.nombre}" creado exitosamente.`,
      data: material,
    };
  }

  @Get()
  @Permission('Inventario.Ver')
  async findAll() {
    const materiales = await this.materialesService.findAll();
    return {
      success: true,
      total: materiales.length,
      data: materiales,
    };
  }

  @Get(':id')
  @Permission('Inventario.Ver')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const material = await this.materialesService.findOne(id);
    return {
      success: true,
      data: material,
    };
  }

  @Patch(':id')
  @Permission('Inventario.Editar')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateMaterialeDto: UpdateMaterialeDto) {
    const material = await this.materialesService.update(id, updateMaterialeDto);
    return {
      success: true,
      message: `Material con ID ${id} actualizado correctamente.`,
      data: material,
    };
  }

  @Delete(':id')
  @Permission('Inventario.Eliminar')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.materialesService.remove(id);
    return {
      success: true,
      message: `Material con ID ${id} eliminado correctamente.`,
    };
  }
}
