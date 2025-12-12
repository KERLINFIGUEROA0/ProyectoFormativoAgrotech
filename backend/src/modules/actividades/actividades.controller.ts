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
   ParseIntPipe,
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
import { DevolverMaterialesFinalDto } from './dto/devolver-materiales-final.dto';
import { CreateRespuestaDto, CalificarRespuestaDto, MaterialDevueltoDto } from './dto/create-respuesta.dto';
import { CalificarActividadDto } from './dto/calificar-actividad.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';
import { plainToInstance } from 'class-transformer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('actividades')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  // ✅ Crear actividad con imágenes y usuario autenticado
  @Post('registrar')
  @Permission('Actividades.Crear')
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
  @Get('listar')
  @Permission('Actividades.Ver')
  findAll(@Req() req) {
    const userIdentificacion = req.user?.identificacion;
    return this.actividadesService.findAll(userIdentificacion);
  }

  // ✅ Buscar por término (id, título, descripción)
  @Get('search')
  @Permission('Actividades.Ver')
  search(@Query() query: SearchActividadDto) {
    return this.actividadesService.search(query);
  }

  // ✅ Buscar una sola actividad por ID
  @Get('listar/:id')
  @Permission('Actividades.Ver')
  findOne(@Param('id') id: string) {
    const result = this.actividadesService.findOne(Number(id));
    return result;
  }

  // --- INICIO DE LA CORRECCIÓN ---
  // ✅ Actualizar actividad
  @Patch(':id')
  @Permission('Actividades.Editar')
  @UseInterceptors(AnyFilesInterceptor(multerConfigActividades)) // Configuración específica para actividades
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
  @Permission('Actividades.Eliminar')
  remove(@Param('id') id: string) {
    return this.actividadesService.remove(Number(id));
  }
  
  // ✅ Enviar respuesta a actividad (aprendices)
  @Post(':id/respuesta')
  @Permission('Actividades.Ver')
  @UseInterceptors(AnyFilesInterceptor(multerConfigActividades))
  async enviarRespuesta(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any, // Recibir como any para procesar FormData
    @Req() req,
  ) {
    const userIdentificacion = req.user?.identificacion;
    const imagenes = files?.map((file) => file.filename) ?? [];

    // Procesar DTO manualmente desde FormData
    const dto = new CreateRespuestaDto();
    dto.descripcion = body.descripcion || '';
    dto.archivos = imagenes.length > 0 ? JSON.stringify(imagenes) : (body.archivos || '');

    // Parsear materialesDevueltos si existe
    if (body.materialesDevueltos && typeof body.materialesDevueltos === 'string') {
      try {
        const parsedMateriales = JSON.parse(body.materialesDevueltos);
        if (Array.isArray(parsedMateriales)) {
          dto.materialesDevueltos = parsedMateriales.map((item: any) =>
            plainToInstance(MaterialDevueltoDto, item)
          );
        }
      } catch (e) {
        console.error('Error al parsear materialesDevueltos:', e);
        dto.materialesDevueltos = undefined;
      }
    }

    return this.actividadesService.enviarRespuesta(Number(id), dto, userIdentificacion);
  }

  // ✅ Obtener respuestas de una actividad
  @Get(':id/respuestas')
  @Permission('Actividades.Ver')
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
  @Patch('respuesta/:respuestaId/calificar')
  @Permission('Actividades.Editar')
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
  @Patch(':id/calificar')
  @Permission('Actividades.Editar')
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
  @Get('descargar/:filename')
  @Permission('Actividades.Ver')
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

  // ✅ Obtener reporte de actividad
  @Get(':id/reporte')
  @Permission('Actividades.Ver')
  async obtenerReporteActividad(@Param('id') id: string, @Req() req) {
    const userIdentificacion = req.user?.identificacion;
    const user = await this.actividadesService['usuarioRepository'].findOne({
      where: { identificacion: userIdentificacion },
      relations: ['tipoUsuario'],
    });
    const userRole = user?.tipoUsuario?.nombre;
    if (userRole?.toLowerCase() !== 'instructor' && userRole?.toLowerCase() !== 'admin') {
      throw new BadRequestException('Solo instructores y administradores pueden ver reportes.');
    }
    return this.actividadesService.generarReporteActividad(Number(id));
  }

  // ✅ Descargar reporte de actividad en Excel
  @Get(':id/reporte/excel')
  @Permission('Actividades.Ver')
  async descargarReporteExcel(@Param('id') id: string, @Req() req, @Res() res: Response) {
    const userIdentificacion = req.user?.identificacion;
    const user = await this.actividadesService['usuarioRepository'].findOne({
      where: { identificacion: userIdentificacion },
      relations: ['tipoUsuario'],
    });
    const userRole = user?.tipoUsuario?.nombre;
    if (userRole?.toLowerCase() !== 'instructor' && userRole?.toLowerCase() !== 'admin') {
      throw new BadRequestException('Solo instructores y administradores pueden descargar reportes.');
    }

    const buffer = await this.actividadesService.generarReporteExcel(Number(id));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-actividad-${id}.xlsx`);
    res.send(buffer);
  }

  // ✅ Devolver materiales finales (solo responsable cuando actividad completada)
  @Post(':id/devolver-materiales-final')
  @Permission('Actividades.Editar')
  async devolverMaterialesFinal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverMaterialesFinalDto,
    @Req() req,
  ) {
    const userIdentificacion = req.user.identificacion;
    return this.actividadesService.devolverMaterialesFinal(id, dto, userIdentificacion);
  }

  // ✅ Asignar actividad a aprendices
 @Post('asignar')
 @Permission('Actividades.Asignar')
 @UseInterceptors(AnyFilesInterceptor(multerConfigActividades))
 asignarActividad(
   @UploadedFiles() files: Express.Multer.File[],
   @Body() body: any, // Recibir como any para procesar FormData
   @Req() req,
 ) {
   // Convertir manualmente los tipos desde FormData
   const dto = new AsignarActividadDto();

   dto.cultivo = parseInt(body.cultivo, 10);
   if (body.lote) dto.lote = parseInt(body.lote, 10);
   if (body.sublote) dto.sublote = parseInt(body.sublote, 10);
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

   if (body.responsable) dto.responsable = parseInt(body.responsable, 10);

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

   const usuarioIdentificacion = req.user?.identificacion;
   return this.actividadesService.asignarActividad(dto, usuarioIdentificacion);
 }

 // ✅ Endpoints para datos necesarios en asignación (usando permisos de Actividades)
 @Get('cultivos-disponibles')
 @Permission('Actividades.Ver')
 async obtenerCultivosParaAsignacion() {
   const cultivos = await this.actividadesService.obtenerCultivosDisponibles();
   return { success: true, data: cultivos };
 }

 @Get('lotes-disponibles')
 @Permission('Actividades.Ver')
 async obtenerLotesParaAsignacion() {
   const lotes = await this.actividadesService.obtenerLotesDisponibles();
   return { success: true, data: lotes };
 }

 @Get('sublotes-disponibles/:loteId')
 @Permission('Actividades.Ver')
 async obtenerSublotesParaAsignacion(@Param('loteId', ParseIntPipe) loteId: number) {
   const sublotes = await this.actividadesService.obtenerSublotesDisponibles(loteId);
   return { success: true, data: sublotes };
 }

 @Get('materiales-disponibles')
 @Permission('Actividades.Ver')
 async obtenerMaterialesParaAsignacion() {
   const materiales = await this.actividadesService.obtenerMaterialesDisponibles();
   return { success: true, data: materiales };
 }


}
