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
  UseGuards,
  // --- FIN DE IMPORTS ---
} from '@nestjs/common';
// --- AÑADIR ESTE IMPORT ---
import { FileInterceptor } from '@nestjs/platform-express';
// --- FIN DE IMPORT ---
import { EpaService } from './epa.service';
import { CreateEpaDto } from './dto/create-epa.dto';
import { UpdateEpaDto } from './dto/update-epa.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('epa')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EpaController {
  constructor(private readonly epaService: EpaService) {}

  @Post()
  @Permission('Fitosanitario.Crear')
  create(@Body() createEpaDto: CreateEpaDto) {
    return this.epaService.create(createEpaDto);
  }

  // --- AÑADIR ESTE NUEVO ENDPOINT ---
  @Post(':id/imagen')
  @Permission('Fitosanitario.Crear')
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
  @Permission('Fitosanitario.Ver')
  findAll() {
    return this.epaService.findAll();
  }

  @Get(':id')
  @Permission('Fitosanitario.Ver')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.epaService.findOne(id);
  }

  @Patch(':id')
  @Permission('Fitosanitario.Editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEpaDto: UpdateEpaDto,
  ) {
    return this.epaService.update(id, updateEpaDto);
  }

  @Delete(':id')
  @Permission('Fitosanitario.Eliminar')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.epaService.remove(id);
  }

  @Get(':id/tratamientos')
  @Permission('Fitosanitario.Ver')
  findTratamientos(@Param('id', ParseIntPipe) id: number) {
    return this.epaService.findTratamientosByEpaId(id);
  }
}