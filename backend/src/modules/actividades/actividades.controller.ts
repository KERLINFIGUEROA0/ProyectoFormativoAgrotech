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
      console.log('📨 Request body recibido:', dto);
      console.log('📁 Files recibidos:', files?.length || 0);

      // ✅ Obtener usuario autenticado desde el token
      console.log('🔍 req.user completo:', req.user);
      const usuarioIdentificacion = req.user?.identificacion;
      console.log('👤 Usuario autenticado ID:', usuarioIdentificacion);
      if (!usuarioIdentificacion) {
        throw new Error('No se pudo identificar el usuario autenticado. Verifica que el token JWT sea válido.');
      }

      // ✅ Procesar imágenes (guardar nombres)
      const imagenes = files?.map((file) => file.filename) ?? [];
      console.log('🖼️ Imágenes procesadas:', imagenes);

      // ✅ Pasar al servicio incluyendo imágenes
      const result = await this.actividadesService.create(
        { ...dto, img: JSON.stringify(imagenes) },
        usuarioIdentificacion,
      );

      console.log('✅ Actividad creada exitosamente:', result);
      return result;
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
  @UseInterceptors(AnyFilesInterceptor())
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActividadDto, @UploadedFiles() files?: Express.Multer.File[]) {
    // Si hay archivos, procesarlos (aunque para update probablemente no se usen)
    if (files && files.length > 0) {
      const imagenes = files.map((file) => file.filename);
      dto.img = JSON.stringify(imagenes);
    }
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
