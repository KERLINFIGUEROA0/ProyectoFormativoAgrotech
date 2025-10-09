import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ActividadesService } from './actividades.service';
import { CreateActividadDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  // ✅ Crear actividad con imágenes y usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Post('registrar')
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateActividadDto,
    @Req() req,
  ) {
    try {
      // ✅ Obtener usuario autenticado desde el token
      const usuarioIdentificacion = req.user.identificacion;

      // ✅ Procesar imágenes (guardar nombres)
      const imagenes = files?.map((file) => file.filename) ?? [];

      // ✅ Pasar al servicio incluyendo imágenes
      return this.actividadesService.create(
        { ...dto, img: JSON.stringify(imagenes) },
        usuarioIdentificacion,
      );
    } catch (error) {
      console.error('❌ Error al crear actividad:', error);
      throw error;
    }
  }

  // ✅ Listar todas las actividades (con relaciones)
  @Get('listar')
  findAll() {
    return this.actividadesService.findAll();
  }

  // ✅ Buscar por término (id, título, descripción)
  @Get('search')
  search(@Query() query: SearchActividadDto) {
    return this.actividadesService.search(query);
  }

  // ✅ Buscar una sola actividad por ID
  @Get('listar/:id')
  findOne(@Param('id') id: string) {
    return this.actividadesService.findOne(Number(id));
  }

  // ✅ Actualizar actividad
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActividadDto) {
    return this.actividadesService.update(Number(id), dto);
  }

  // ✅ Eliminar actividad
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actividadesService.remove(Number(id));
  }
  // ✅ Asignar actividad a aprendices
  @Post('asignar')
  asignarActividad(@Body() dto: AsignarActividadDto) {
    return this.actividadesService.asignarActividad(dto);
  }

}
