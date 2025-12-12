import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Patch,
  Body,
  ParseIntPipe,
  UseInterceptors,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { LotesService } from './lotes.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { UpdateLoteEstadoDto } from './dto/update-lote-estado.dto';
import { PdfService } from '../pdf/pdf.service';
import { SensoresService } from '../sensores/sensores.service';
import { GenerarReporteTrazabilidadDto } from '../sensores/dto/generar-reporte.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('lotes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LotesController {
  constructor(
    private readonly lotesService: LotesService,
    private readonly pdfService: PdfService,
    private readonly sensoresService: SensoresService,
  ) {}

  @Get('estadisticas')
  @Permission('Cultivo.Ver')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('lotes_estadisticas')
  @CacheTTL(300000)
  async getEstadisticas() {
    const data = await this.lotesService.obtenerEstadisticas();
    return {
      success: true,
      data,
    };
  }

  // Endpoint público para dashboard - solo requiere autenticación
  @Get('dashboard/estadisticas')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('lotes_dashboard_estadisticas')
  @CacheTTL(300000)
  async getDashboardEstadisticas() {
    const data = await this.lotesService.obtenerEstadisticas();
    return {
      success: true,
      data,
    };
  }

  @Get()
  @Permission('Cultivo.Ver')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('lotes_todos')
  @CacheTTL(60000)
  async findAll() {
    const lista = await this.lotesService.listar();
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get('listar')
  @Permission('Cultivo.Ver')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('lotes_todos_alt')
  @CacheTTL(60000)
  async listar() {
    const lista = await this.lotesService.listar();
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get('disponibles')
  @Permission('Cultivo.Ver')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('lotes_disponibles')
  @CacheTTL(30000) // Cache más corto para datos dinámicos
  async obtenerDisponibles() {
    const lista = await this.lotesService.obtenerDisponibles();
    return {
      success: true,
      total: lista.length,
      data: lista,
    };
  }

  @Get(':id')
  @Permission('Cultivo.Ver')
  @UseInterceptors(CacheInterceptor)
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const lote = await this.lotesService.buscarPorId(id);
    return {
      success: true,
      data: lote,
    };
  }

  @Post('crear')
  @Permission('Cultivo.Crear')
  async crear(@Body() data: CreateLoteDto) {
    const nuevo = await this.lotesService.crear(data);
    return {
      success: true,
      message: `El lote "${nuevo.nombre}" se creó correctamente`,
      data: nuevo,
    };
  }

  @Put('actualizar/:id')
  @Permission('Cultivo.Editar')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLoteDto,
  ) {
    const actualizado = await this.lotesService.actualizar(id, data);
    return {
      success: true,
      message: `El lote con ID ${id} se actualizó correctamente`,
      data: actualizado,
    };
  }

  @Patch(':id/estado')
  @Permission('Cultivo.Editar')
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLoteEstadoDto,
  ) {
    const actualizado = await this.lotesService.actualizarEstado(id, data);
    return {
      success: true,
      message: `El estado del lote con ID ${id} se actualizó a "${actualizado.estado}"`,
      data: actualizado,
    };
  }

  @Post('reporte-trazabilidad')
  @Permission('Cultivo.DescargarPdf')
  async descargarReporte(@Body() dto: GenerarReporteTrazabilidadDto, @Res() res: Response) {
    try {
      // 1. Obtener datos (El servicio ahora garantizará que no sean null)
      const datos = await this.sensoresService.getFullTraceabilityData(dto);

      if (dto.formato === 'pdf') {

        // 2. Generar Buffer
        const buffer = await this.pdfService.generarReporteTrazabilidad(datos);

        // 3. Configurar cabeceras CRÍTICAS para evitar "PDF corrupto" y caché
        const filename = `trazabilidad_lote_${dto.loteId}_${new Date().getTime()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length.toString());

        // Evitar caché del navegador (Soluciona el "Actualizar no sirve")
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // 4. Enviar el archivo
        res.end(buffer);

      } else if (dto.formato === 'csv') {
        // ... lógica CSV existente ...
        const csvContent = await this.pdfService.generarReporteTrazabilidadCSV(datos);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=trazabilidad_${dto.loteId}.csv`);
        res.send('\uFEFF' + csvContent);
      } else {
        res.json(datos);
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      // En caso de error fatal, enviar un JSON claro en vez de un PDF roto
      res.status(500).json({
        message: 'Error generando el reporte. Posiblemente faltan datos críticos.',
        error: error.message
      });
    }
  }

}
