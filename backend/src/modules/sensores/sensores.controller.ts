import { Controller, Get, Post, Body, Put, Patch, Param, Delete, ParseIntPipe, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SensoresService } from './sensores.service';
import { CreateSensoreDto } from './dto/create-sensore.dto';
import { UpdateSensoreDto } from './dto/update-sensore.dto';
import { UpdateSensoreEstadoDto } from './dto/update-sensore-estado.dto';
import { GenerarReporteTrazabilidadDto } from './dto/generar-reporte.dto';
import { PdfService } from '../pdf/pdf.service';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('sensores')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SensoresController {
  constructor(
    private readonly sensoresService: SensoresService,
    private readonly pdfService: PdfService,
  ) { }

  @Post('crear')
  @Permission('Iot.Crear')
  async create(@Body() createSensoreDto: CreateSensoreDto) {
    const nuevo = await this.sensoresService.create(createSensoreDto);
    return { success: true, message: `Sensor "${nuevo.nombre}" creado.`, data: nuevo };
  }

  @Get('listar')
  @Permission('Iot.Ver')
  async findAll() {
    const sensores = await this.sensoresService.findAll();
    return { success: true, data: sensores };
  }

  // Endpoint público para dashboard - solo requiere autenticación
  @Get('dashboard/listar')
  async findAllParaDashboard() {
    const sensores = await this.sensoresService.findAll();
    return { success: true, data: sensores };
  }

  // --- ENDPOINT PARA ACTUALIZAR ---
  // Usa Put para reemplazar/actualizar el recurso completo.
  @Put('actualizar/:id')
  @Permission('Iot.Editar')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateSensoreDto: UpdateSensoreDto) {
    const actualizado = await this.sensoresService.update(id, updateSensoreDto);
    return {
      success: true,
      message: `Sensor con ID ${id} actualizado.`,
      data: actualizado,
    };
  }

  // --- ENDPOINT PARA ACTIVAR/DESACTIVAR SENSOR ---
  @Patch('actualizar/:id/estado')
  @Permission('Iot.Editar')
  async updateEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSensoreEstadoDto) {
    const actualizado = await this.sensoresService.updateEstado(id, dto.estado);
    return {
      success: true,
      message: `El estado del sensor se actualizó a "${dto.estado}"`,
      data: actualizado,
    };
  }

  // --- ENDPOINT PARA ELIMINAR ---
  @Delete('eliminar/:id')
  @Permission('Iot.Eliminar')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sensoresService.remove(id);
    return {
      success: true,
      message: `Sensor con ID ${id} eliminado correctamente.`,
    };
  }

  // --- ENDPOINT PARA ELIMINAR SENSORES AUTOMÁTICOS ---
  @Delete('eliminar-automaticos')
  @Permission('Iot.Eliminar')
  async eliminarSensoresAutomaticos() {
    const resultado = await this.sensoresService.eliminarSensoresAutomaticos();
    return {
      success: true,
      message: resultado.mensaje,
      eliminados: resultado.eliminados
    };
  }
  /**
   * Obtiene sensores por cultivo
   */
  @Get('por-cultivo/:cultivoId')
  @Permission('Iot.Ver')
  async findByCultivo(@Param('cultivoId', ParseIntPipe) cultivoId: number) {
    const sensores = await this.sensoresService.findByCultivo(cultivoId);
    return { success: true, data: sensores };
  }


  /**
   * Elimina un sensor específico de un lote
   */
  @Delete('eliminar-de-lote/:sensorId')
  @Permission('Iot.Eliminar')
  async eliminarSensorDeLote(@Param('sensorId', ParseIntPipe) sensorId: number) {
    await this.sensoresService.eliminarSensorDeLote(sensorId);
    return {
      success: true,
      message: `Sensor eliminado del lote correctamente.`
    };
  }

  @Get('cultivos-activos-lote/:loteId')
  @Permission('Iot.Ver')
  async getCultivosActivosLote(@Param('loteId', ParseIntPipe) loteId: number) {
    const cultivos = await this.sensoresService.getCultivosActivosLote(loteId);
    return { success: true, data: cultivos };
  }

  @Post('reporte-trazabilidad')
  @Permission('Iot.DescargarPdf')
  async descargarReporte(@Body() dto: GenerarReporteTrazabilidadDto, @Res() res: Response) {
    try {
      // Intentar obtener datos de trazabilidad
      let datos: any;

      try {
        datos = await this.sensoresService.getFullTraceabilityData(dto);
      } catch (dataError) {
        console.warn('No se pudieron obtener datos completos, generando reporte vacío:', dataError.message);

        // Si no hay datos, crear un objeto de reporte vacío pero válido
        datos = {
          lote: `Lote #${dto.loteId}`,
          rango: `${dto.fechaInicio} al ${dto.fechaFin}`,
          fechaGeneracion: new Date().toISOString(),
          cultivos: [],
          sensores: {},
          pagos: []
        };
      }

      if (dto.formato === 'pdf') {
        try {
          // Generar PDF (vacío o con datos)
          const buffer = await this.pdfService.generarReporteTrazabilidad(datos);

          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=trazabilidad_iot_${dto.loteId}.pdf`,
            'Content-Length': buffer.length,
          });
          res.end(buffer);
        } catch (pdfError) {
          console.error('Error generando PDF IoT:', pdfError);
          res.status(500).json({
            success: false,
            message: 'Error generando el PDF de trazabilidad',
            error: pdfError.message,
            datos: datos
          });
        }
      } else {
        // Si el formato es JSON o CSV, retornar los datos directamente
        res.json({ success: true, data: datos });
      }
    } catch (error) {
      console.error('Error en descargarReporte IoT:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al generar el reporte',
        error: error.message
      });
    }
  }
}