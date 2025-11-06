import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { FichasService } from './fichas.service';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';

@Controller('fichas')
export class FichasController {
  constructor(private readonly fichasService: FichasService) {}

  @Post()
  create(@Body() createFichaDto: CreateFichaDto) {
    return this.fichasService.create(createFichaDto);
  }

  @Get()
  findAll() {
    return this.fichasService.findAll();
  }

  @Get('opciones')
  async getOpciones() {
    return this.fichasService.getOpciones();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fichasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFichaDto: UpdateFichaDto) {
    return this.fichasService.update(+id, updateFichaDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.fichasService.remove(+id);
      return {
        success: true,
        message: 'Ficha eliminada exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Error al eliminar la ficha',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
