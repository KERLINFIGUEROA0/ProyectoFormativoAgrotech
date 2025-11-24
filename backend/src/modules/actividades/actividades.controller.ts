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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { multerConfigActividades } from '../../config/multer/multer.config';
import { ActividadesService } from './actividades.service';
// --- 2. Importa MaterialUsadoDto y plainToInstance ---
import { CreateActividadDto, MaterialUsadoDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';
import { CreateRespuestaDto, CalificarRespuestaDto } from './dto/create-respuesta.dto';
import { CalificarActividadDto } from './dto/calificar-actividad.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  // ✅ Crear actividad con imágenes y usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Post('registrar')
  @UseInterceptors(AnyFilesInterceptor(multerConfigActividades))
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

  // ✅ Listar actividades filtradas por usuario (con relaciones)
  @UseGuards(JwtAuthGuard)
  @Get('listar')
  findAll(@Req() req) {
    const userIdentificacion = req.user?.identificacion;
    return this.actividadesService.findAll(userIdentificacion);
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
  @UseInterceptors(AnyFilesInterceptor(multerConfigActividades)) // Configuración específica para actividades
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
  
  // ✅ Enviar respuesta a actividad (aprendices)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor(multerConfigActividades))
  @Post(':id/respuesta')
  async enviarRespuesta(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateRespuestaDto,
    @Req() req,
  ) {
    const userIdentificacion = req.user?.identificacion;
    const imagenes = files?.map((file) => file.filename) ?? [];

    // SIEMPRE usar los archivos nuevos si se subieron, sino usar los del body
    // Esto asegura que los nuevos archivos REEMPLAZAN completamente los anteriores
    const archivos = imagenes.length > 0 ? JSON.stringify(imagenes) : (dto.archivos || '');

    console.log('Archivos finales a guardar:', archivos);

    console.log('Archivos finales a guardar:', archivos);

    return this.actividadesService.enviarRespuesta(Number(id), { ...dto, archivos }, userIdentificacion);
  }

  // ✅ Obtener respuestas de una actividad
  @UseGuards(JwtAuthGuard)
  @Get(':id/respuestas')
  async obtenerRespuestasPorActividad(@Param('id') id: string, @Req() req) {
    const userIdentificacion = req.user?.identificacion;
    const user = await this.actividadesService['usuarioRepository'].findOne({
      where: { identificacion: userIdentificacion },
      relations: ['tipoUsuario'],
    });
    const userRole = user?.tipoUsuario?.nombre;
    return this.actividadesService.obtenerRespuestasPorActividad(Number(id), userIdentificacion, userRole);
  }

  // ✅ Calificar respuesta (instructores)
  @UseGuards(JwtAuthGuard)
  @Patch('respuesta/:respuestaId/calificar')
  async calificarRespuesta(
    @Param('respuestaId') respuestaId: string,
    @Body() dto: CalificarRespuestaDto,
    @Req() req,
  ) {
    const userIdentificacion = req.user?.identificacion;
    const user = await this.actividadesService['usuarioRepository'].findOne({
      where: { identificacion: userIdentificacion },
      relations: ['tipoUsuario'],
    });
    const userRole = user?.tipoUsuario?.nombre;
    return this.actividadesService.calificarRespuesta(Number(respuestaId), dto, userRole);
  }

  // ✅ Calificar actividad (instructores)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/calificar')
  async calificarActividad(
    @Param('id') id: string,
    @Body() dto: CalificarActividadDto,
    @Req() req,
  ) {
    const userIdentificacion = req.user?.identificacion;
    const user = await this.actividadesService['usuarioRepository'].findOne({
      where: { identificacion: userIdentificacion },
      relations: ['tipoUsuario'],
    });
    const userRole = user?.tipoUsuario?.nombre;
    return this.actividadesService.calificarActividad(Number(id), dto, userRole);
  }


  // ✅ Descargar archivo de evidencia
  @UseGuards(JwtAuthGuard)
  @Get('descargar/:filename')
  async descargarArchivo(@Param('filename') filename: string, @Query('nombre') nombreOriginal: string, @Res() res: Response) {
    try {
      // Usar el directorio temp-uploads del proyecto
      const filePath = path.resolve(process.cwd(), 'temp-uploads', 'actividades', filename);

      // Verificar si el archivo existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      // Usar el nombre original proporcionado por query param, o extraerlo del filename
      let finalName = nombreOriginal;
      if (!finalName) {
        // Fallback: extraer del filename
        if (filename.includes('___')) {
          const parts = filename.split('___');
          finalName = parts.length >= 3 ? parts[2] : filename;
        } else if (filename.includes('-')) {
          const parts = filename.split('-');
          finalName = parts.length >= 3 ? parts.slice(2).join('-') : filename;
        } else {
          finalName = filename;
        }
      }

      // Configurar headers para descarga con el nombre original
      res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // Enviar el archivo
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // ✅ Asignar actividad a aprendices
  @UseInterceptors(AnyFilesInterceptor(multerConfigActividades))
  @Post('asignar')
  asignarActividad(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any, // Recibir como any para procesar FormData
  ) {
    // Convertir manualmente los tipos desde FormData
    const dto = new AsignarActividadDto();

    dto.cultivo = parseInt(body.cultivo, 10);
    dto.titulo = body.titulo;
    dto.descripcion = body.descripcion;
    dto.fecha = body.fecha;

    // Convertir aprendices de JSON string a array de números
    if (body.aprendices) {
      try {
        dto.aprendices = JSON.parse(body.aprendices);
      } catch (e) {
        dto.aprendices = [];
      }
    } else {
      dto.aprendices = [];
    }

    // Convertir materiales de JSON string a array de objetos
    if (body.materiales) {
      try {
        const parsedMateriales = JSON.parse(body.materiales);
        if (Array.isArray(parsedMateriales)) {
          dto.materiales = parsedMateriales.map(item =>
            plainToInstance(MaterialUsadoDto, item)
          );
        }
      } catch (e) {
        dto.materiales = undefined;
      }
    }

    // Estado opcional
    if (body.estado) {
      dto.estado = body.estado;
    }

    // Archivo inicial opcional
    const archivos = files?.map((file) => file.filename) ?? [];
    const archivoInicial = archivos.length > 0 ? JSON.stringify(archivos) : undefined;
    dto.archivoInicial = archivoInicial;

    return this.actividadesService.asignarActividad(dto);
  }


}