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
  BadRequestException, // <-- 1. Importa BadRequestException
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ActividadesService } from './actividades.service';
// --- 2. Importa MaterialUsadoDto y plainToInstance ---
import { CreateActividadDto, MaterialUsadoDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';

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
      const usuarioIdentificacion = req.user?.identificacion;
      if (!usuarioIdentificacion) {
        throw new Error('No se pudo identificar el usuario autenticado. Verifica que el token JWT sea válido.');
      }

      // ✅ Procesar imágenes (guardar nombres)
      const imagenes = files?.map((file) => file.filename) ?? [];

      // ✅ Pasar al servicio incluyendo imágenes
      const result = await this.actividadesService.create(
        { ...dto, img: JSON.stringify(imagenes) },
        usuarioIdentificacion,
      );

      return result;
    } catch (error) {
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
    const result = this.actividadesService.findOne(Number(id));
    return result;
  }

  // --- INICIO DE LA CORRECCIÓN ---
  // ✅ Actualizar actividad
  @UseInterceptors(AnyFilesInterceptor()) // Sigue usando AnyFilesInterceptor
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: any, // 3. Recibe el body crudo como 'any'
    @UploadedFiles() files?: Express.Multer.File[]
  ) {

    // 4. Creamos una instancia del DTO manualmente
    const dto = new UpdateActividadDto();

    // 5. Copiamos todos los campos simples (titulo, descripcion, estado)
    Object.assign(dto, body);

    // 6. Parseamos manualmente los campos que vienen como 'string' desde FormData
    
    // Convertir 'materiales' (string) de nuevo a un Array de DTO
    if (body.materiales && typeof body.materiales === 'string') {
      try {
        const parsedMateriales = JSON.parse(body.materiales);
        if (Array.isArray(parsedMateriales)) {
          // Convertimos cada objeto plano en una instancia de MaterialUsadoDto
          // Esto es clave para que funcione la validación y el servicio
          dto.materiales = parsedMateriales.map(item =>
            plainToInstance(MaterialUsadoDto, item)
          );
        }
      } catch (e) {
        throw new BadRequestException('El formato de materiales es incorrecto.');
      }
    }

    // Convertir 'cultivo' y 'usuario' de string a number
    if (body.cultivo) {
      dto.cultivo = parseInt(body.cultivo, 10);
    }
    if (body.usuario) {
      dto.usuario = parseInt(body.usuario, 10);
    }
    if (body.horas) {
      dto.horas = parseFloat(body.horas);
    }
    if (body.tarifaHora) {
      dto.tarifaHora = parseFloat(body.tarifaHora);
    }
    // 7. Manejamos las imágenes como lo hacías antes
    if (files && files.length > 0) {
      const imagenes = files.map((file) => file.filename);
      // OJO: Esta lógica REEMPLAZA las imágenes anteriores.
      // Si quieres AÑADIR a las existentes, la lógica debe ser más compleja
      // (ej. recibir un campo 'imagenesExistentes' y hacer merge).
      // Por ahora, lo dejo como lo tenías:
      dto.img = JSON.stringify(imagenes);
    }

    // 8. Pasamos el DTO (ahora sí, bien formado) al servicio
    return this.actividadesService.update(Number(id), dto);
  }
  // --- FIN DE LA CORRECCIÓN ---

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