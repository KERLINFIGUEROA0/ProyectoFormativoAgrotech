import {
  Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException, Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MaterialesService } from './materiales.service';
import { CreateMaterialeDto } from './dto/create-materiale.dto';
import { UpdateMaterialeDto } from './dto/update-materiale.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('materiales')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  // --- OBTENER REPORTE DE STOCK BAJO ---
  @Get('reportes/stock-bajo')
  @Permission('Inventario.Ver')
  async getLowStockReport(@Query('limite', new ParseIntPipe({ optional: true })) limite?: number) {
    const data = await this.materialesService.findLowStock(limite);
    return {
      success: true,
      message: `Se encontraron ${data.length} materiales con stock bajo.`,
      data,
    };
  }

  // --- CREAR UN NUEVO MATERIAL (SOLO DATOS) ---
  @Post()
  @Permission('Inventario.Crear')
  async create(@Body() createMaterialeDto: CreateMaterialeDto) {
    const material = await this.materialesService.create(createMaterialeDto);
    return {
      success: true,
      message: `Material "${material.nombre}" creado exitosamente.`,
      data: material,
    };
  }

  // --- LISTAR TODOS LOS MATERIALES ---
  @Get()
  @Permission('Inventario.Ver')
  async findAll() {
    const materiales = await this.materialesService.findAll();
    return { success: true, total: materiales.length, data: materiales };
  }

  // --- OBTENER UN MATERIAL POR SU ID ---
  @Get(':id')
  @Permission('Inventario.Ver')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const material = await this.materialesService.findOne(id);
    return { success: true, data: material };
  }

  // --- ACTUALIZAR UN MATERIAL (MÉTODO QUE FALTABA) ---
  @Patch(':id')
  @Permission('Inventario.Editar')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateMaterialeDto: UpdateMaterialeDto) {
    const material = await this.materialesService.update(id, updateMaterialeDto);
    return {
      success: true,
      message: `Material con ID ${id} actualizado correctamente.`,
      data: material,
    };
  }
  
  // --- SUBIR O ACTUALIZAR LA IMAGEN DE UN MATERIAL ---
  @Post(':id/imagen')
  @Permission('Inventario.Editar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/materiales-pic',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
        cb(null, uniqueName);
      },
    }),
  }))
  async subirImagen(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');

    // Validaciones adicionales del archivo
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG, GIF y WebP.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo es demasiado grande. El tamaño máximo permitido es 5MB.');
    }

    const relativePath = `materiales-pic/${file.filename}`;
    const material = await this.materialesService.actualizarImagen(id, relativePath);
    return { success: true, message: 'Imagen del producto actualizada.', data: material };
  }

  @Patch(':id/desactivar')
  @Permission('Inventario.Editar') // Reutilizamos el permiso de editar
  async desactivar(@Param('id', ParseIntPipe) id: number) {
    const material = await this.materialesService.desactivar(id);
    return {
      success: true,
      message: `Material "${material.nombre}" ha sido desactivado.`,
      data: material,
    };
  }

  @Patch(':id/reactivar')
  @Permission('Inventario.Editar') // Reutilizamos el permiso de editar
  async reactivar(@Param('id', ParseIntPipe) id: number) {
    const material = await this.materialesService.reactivar(id);
    return {
      success: true,
      message: `Material "${material.nombre}" ha sido reactivado.`,
      data: material,
    };
  }

  // --- ACTUALIZAR STOCK (AGREGAR EMPAQUES) ---
  @Post(':id/actualizar-stock')
  @Permission('Inventario.Editar')
  async actualizarStock(@Param('id', ParseIntPipe) id: number, @Body() body: { cantidadEmpaques: number }) {
    const { cantidadEmpaques } = body;
    if (cantidadEmpaques <= 0) {
      throw new BadRequestException('La cantidad de empaques debe ser mayor a 0.');
    }
    const result = await this.materialesService.actualizarStock(id, cantidadEmpaques);
    return {
      success: true,
      message: `Stock actualizado. Se agregaron ${cantidadEmpaques} empaques.`,
      data: result,
    };
  }
}