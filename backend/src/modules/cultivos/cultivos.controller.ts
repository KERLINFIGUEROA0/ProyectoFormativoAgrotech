import {
  Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile, BadRequestException, Res, Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import { CultivosService } from './cultivos.service';
import { PdfService } from './pdf.service';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';

@Controller('cultivos')
export class CultivosController {
  constructor(
    private readonly cultivosService: CultivosService,
    private readonly pdfService: PdfService
  ) {}

  @Post('crear')
  async crear(@Body() data: CreateCultivoDto) {
    const nuevo = await this.cultivosService.crear(data);
    return { success: true, message: `El cultivo se creó correctamente`, data: nuevo };
  }

  @Get('listar')
  async listar() {
    const lista = await this.cultivosService.listar();
    return { success: true, total: lista.length, data: lista };
  }

  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    const cultivo = await this.cultivosService.buscarPorId(id);
    return { success: true, data: cultivo };
  }

  @Put('actualizar/:id')
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateCultivoDto) {
    const actualizado = await this.cultivosService.actualizar(id, data);
    return { success: true, message: `El cultivo se actualizó`, data: actualizado };
  }

  @Put('finalizar/:id')
  async finalizar(@Param('id', ParseIntPipe) id: number, @Body() body: { fechaFin: string }) {
    if (!body.fechaFin) throw new BadRequestException("La fecha de finalización es obligatoria");

    const cultivo = await this.cultivosService.finalizarCultivo(id, body.fechaFin);
    return { success: true, message: 'Cultivo finalizado y terrenos liberados', data: cultivo };
  }

  @Post('registrar-cosecha/:id')
  async registrarCosecha(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fecha: string; cantidad: number; esFinal: boolean }
  ) {
    if (!body.fecha) throw new BadRequestException("La fecha es obligatoria");
    if (body.cantidad < 0) throw new BadRequestException("La cantidad no puede ser negativa");

    const cultivo = await this.cultivosService.registrarCosecha(id, body.fecha, body.cantidad, body.esFinal);
    return {
      success: true,
      message: body.esFinal ? 'Cosecha final registrada y terrenos liberados' : 'Cosecha parcial registrada',
      data: cultivo
    };
  }

  @Delete('eliminar/:id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.cultivosService.eliminar(id);
    return { success: true, message: `El cultivo fue eliminado` };
  }

  // --- ✅ CORRECCIÓN DEFINITIVA AQUÍ ---
  @Post(':id/imagen')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/cultivos-pic',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
        cb(null, uniqueName);
      },
    }),
  }))
  async subirImagen(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    
    // Construimos la ruta relativa que se guardará en la base de datos.
    // Ejemplo: "cultivos-pic/1678886400000-tomate.jpg"
    const relativePath = `cultivos-pic/${file.filename}`;
    
    const cultivo = await this.cultivosService.actualizarImagen(id, relativePath);
    return { success: true, message: 'Imagen subida con éxito', data: cultivo };
  }

  @Get(':id/exportar-excel')
  async exportarExcel(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const excelBuffer = await this.cultivosService.generarExcelCultivo(id);
    
    // Añadir fecha al nombre del archivo: YYYY-MM-DD_HHMM
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=cultivo-${id}-reporte-${dateStr}.xlsx`,
      'Content-Length': excelBuffer.length,
    });
    
    res.send(excelBuffer);
  }

  @Get('exportar-excel/general')
  async exportarExcelGeneral(@Res() res: Response) {
    const excelBuffer = await this.cultivosService.exportarExcelGeneral();

    // Añadir fecha al nombre del archivo: YYYY-MM-DD_HHMM
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=cultivos-reporte-general-${dateStr}.xlsx`,
      'Content-Length': excelBuffer.length,
    });

    res.send(excelBuffer);
  }

  @Post('actualizar-estados-lotes')
  async actualizarEstadosLotes() {
    const resultado = await this.cultivosService.actualizarEstadosLotes();
    return {
      success: true,
      message: resultado.message,
      data: { lotesActualizados: resultado.lotesActualizados }
    };
  }

  @Get('diagnosticar-estados-lotes')
  async diagnosticarEstadosLotes() {
    const diagnostico = await this.cultivosService.diagnosticarEstadosLotes();
    return {
      success: true,
      data: diagnostico
    };
  }

  @Get(':id/pdf-trazabilidad')
  async generarPdfTrazabilidad(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    const pdfBuffer = await this.pdfService.generatePdf(id, fechaInicio, fechaFin);

    // Añadir fecha al nombre del archivo
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=cultivo-${id}-trazabilidad-${dateStr}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}