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

@Controller('lotes')
export class LotesController {
  constructor(
    private readonly lotesService: LotesService,
    private readonly pdfService: PdfService,
    private readonly sensoresService: SensoresService,
  ) {}

  @Get('estadisticas')
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

  @Get()
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
  @UseInterceptors(CacheInterceptor)
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const lote = await this.lotesService.buscarPorId(id);
    return {
      success: true,
      data: lote,
    };
  }

  @Post('crear')
  async crear(@Body() data: CreateLoteDto) {
    const nuevo = await this.lotesService.crear(data);
    return {
      success: true,
      message: `El lote "${nuevo.nombre}" se creó correctamente`,
      data: nuevo,
    };
  }

  @Put('actualizar/:id')
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
  async descargarReporte(@Body() dto: GenerarReporteTrazabilidadDto, @Res() res: Response) {
    console.log('Recibiendo solicitud de reporte:', dto);
    try {
      const datos = await this.sensoresService.getFullTraceabilityData(dto);
      console.log('Datos obtenidos, generando reporte...');

      if (dto.formato === 'pdf') {
        console.log('Intentando generar PDF...');
        try {
          const buffer = await this.pdfService.generarReporteTrazabilidad(datos);
          console.log('PDF generado exitosamente, tamaño:', buffer.length);

          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=trazabilidad_${dto.loteId}.pdf`,
            'Content-Length': buffer.length,
          });
          res.end(buffer);
        } catch (pdfError) {
          console.error('Error generando PDF:', pdfError);
          // Si falla el PDF, devolver JSON para debugging
          res.json({
            error: 'Error generando PDF',
            datos: datos,
            pdfError: pdfError.message
          });
        }
      } else if (dto.formato === 'csv') {
        console.log('Generando CSV...');
        try {
          const csvContent = await this.pdfService.generarReporteTrazabilidadCSV(datos);
          console.log('CSV generado exitosamente, tamaño:', csvContent.length);

          res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=trazabilidad_${dto.loteId}.csv`,
          });
          res.send('\uFEFF' + csvContent); // BOM for Excel compatibility
        } catch (csvError) {
          console.error('Error generando CSV:', csvError);
          res.json({
            error: 'Error generando CSV',
            datos: datos,
            csvError: csvError.message
          });
        }
      } else {
        // Devolver JSON para testing
        res.json(datos);
      }
    } catch (error) {
      console.error('Error en descargarReporte:', error);
      res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
  }

  // ✅ ELIMINADOS: Endpoints de eliminación y archivado
  // Los lotes se reutilizan cambiando coordenadas, nunca se eliminan
  // Esto preserva toda la trazabilidad histórica
}
