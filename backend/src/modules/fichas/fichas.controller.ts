import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { FichasService } from './fichas.service';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';
import { JwtAuthGuard } from '../../authorization/jwt.guard';


@Controller('fichas')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FichasController {
  constructor(private readonly fichasService: FichasService) {}

  @Post()
  @Permission('Usuarios.Crear')
  async create(@Body() createFichaDto: CreateFichaDto) {
    try {
      const ficha = await this.fichasService.create(createFichaDto);
      return {
        success: true,
        message: 'Ficha creada exitosamente',
        data: ficha,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al crear la ficha',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permission('Usuarios.Ver')
  async findAll() {
    try {
      const fichas = await this.fichasService.findAll();
      return {
        success: true,
        message: fichas.length > 0 ? 'Lista de fichas obtenida' : 'No hay fichas registradas',
        data: fichas,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al listar fichas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('opciones')
  async getOpciones() {
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

  @Get(':id')
  @Permission(' Usuarios.Ver')
  async findOne(@Param('id') id: string) {
    try {
      const ficha = await this.fichasService.findOne(+id);
      return {
        success: true,
        message: `Ficha con id ${id} encontrada`,
        data: ficha,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Ficha con id ${id} no encontrada`,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id')
  @Permission('Usuarios.Editar')
  async update(@Param('id') id: string, @Body() updateFichaDto: UpdateFichaDto) {
    try {
      const ficha = await this.fichasService.update(+id, updateFichaDto);
      return {
        success: true,
        message: `Ficha con id ${id} actualizada exitosamente`,
        data: ficha,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Error al actualizar la ficha con id ${id}`,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @Permission('Usuarios.EliminarFichas')
  async remove(@Param('id') id: string) {
    try {
      await this.fichasService.remove(+id);
      return {
        success: true,
        message: `Ficha con id ${id} eliminada exitosamente`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Error al eliminar la ficha con id ${id}`,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
