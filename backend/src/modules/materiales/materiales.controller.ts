import {
  Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MaterialesService } from './materiales.service';
import { CreateMaterialeDto } from './dto/create-materiale.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('materiales')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

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

  @Get()
  @Permission('Inventario.Ver')
  async findAll() {
    const materiales = await this.materialesService.findAll();
    return { success: true, total: materiales.length, data: materiales };
  }

  @Get(':id')
  @Permission('Inventario.Ver')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const material = await this.materialesService.findOne(id);
    return { success: true, data: material };
  }

 
  @Delete(':id')
  @Permission('Inventario.Eliminar')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.materialesService.remove(id);
    return { success: true, message: `Material con ID ${id} eliminado.` };
  }

  @Post('upload/:id')
  @Permission('Inventario.Editar')
  @UseInterceptors(FileInterceptor('img', {
    storage: diskStorage({
      destination: './uploads/materiales',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new BadRequestException('Solo se permiten archivos de imagen (jpg, jpeg, png)'), false);
      }
      cb(null, true);
    }
  }))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No se ha enviado ninguna imagen');
    }
    const imageUrl = file.filename;
    const material = await this.materialesService.actualizarImagen(id, imageUrl);
    return {
      success: true,
      message: 'Imagen subida correctamente',
      data: material
    };
  }

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
    const relativePath = `materiales-pic/${file.filename}`;
    const material = await this.materialesService.actualizarImagen(id, relativePath);
    return { success: true, message: 'Imagen del producto actualizada.', data: material };
  }
}