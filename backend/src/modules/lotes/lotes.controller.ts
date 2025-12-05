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
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { LotesService } from './lotes.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { UpdateLoteEstadoDto } from './dto/update-lote-estado.dto';

@Controller('lotes')
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

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

  // ✅ ELIMINADOS: Endpoints de eliminación y archivado
  // Los lotes se reutilizan cambiando coordenadas, nunca se eliminan
  // Esto preserva toda la trazabilidad histórica
}
