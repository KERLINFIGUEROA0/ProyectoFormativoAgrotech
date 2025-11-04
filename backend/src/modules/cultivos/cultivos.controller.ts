import {
  Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile, BadRequestException, Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import { CultivosService } from './cultivos.service';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';

@Controller('cultivos')
export class CultivosController {
  constructor(private readonly cultivosService: CultivosService) {}

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
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=cultivo-${id}-reporte.xlsx`,
      'Content-Length': excelBuffer.length,
    });
    
    res.send(excelBuffer);
  }
}