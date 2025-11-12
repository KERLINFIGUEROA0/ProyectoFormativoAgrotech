import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  // --- AÑADIR ESTOS IMPORTS ---
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  // --- FIN DE IMPORTS ---
} from '@nestjs/common';
// --- AÑADIR ESTE IMPORT ---
import { FileInterceptor } from '@nestjs/platform-express';
// --- FIN DE IMPORT ---
import { EpaService } from './epa.service';
import { CreateEpaDto } from './dto/create-epa.dto';
import { UpdateEpaDto } from './dto/update-epa.dto';

@Controller('epa')
export class EpaController {
  constructor(private readonly epaService: EpaService) {}

  @Post()
  create(@Body() createEpaDto: CreateEpaDto) {
    return this.epaService.create(createEpaDto);
  }

  // --- AÑADIR ESTE NUEVO ENDPOINT ---
  @Post(':id/imagen')
  @UseInterceptors(FileInterceptor('file')) // 'file' debe coincidir con el nombre en el FormData
  async subirImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    // Guardamos la ruta relativa
    const relativePath = `epa-pic/${file.filename}`;
    return this.epaService.actualizarImagen(id, relativePath);
  }
  // --- FIN DEL ENDPOINT ---

  /* --- DESHABILITAR API EXTERNA (OPCIONAL PERO RECOMENDADO) ---
  @Get('buscar-externo')
  searchExternal(@Query('q') query: string) {
    return this.epaService.searchExternal(query);
  }
  */

  @Get()
  findAll() {
    return this.epaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.epaService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEpaDto: UpdateEpaDto,
  ) {
    return this.epaService.update(id, updateEpaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.epaService.remove(id);
  }

  @Get(':id/tratamientos')
  findTratamientos(@Param('id', ParseIntPipe) id: number) {
    return this.epaService.findTratamientosByEpaId(id);
  }
}