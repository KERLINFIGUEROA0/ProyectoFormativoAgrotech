import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pagos')
@UseGuards(JwtAuthGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  create(@Body() createPagoDto: CreatePagoDto | CreatePagoDto[]) {
    // Si es un array, crear múltiples pagos
    if (Array.isArray(createPagoDto)) {
      return this.pagosService.createMultiple(createPagoDto);
    }
    // Si es un solo pago, crear uno
    return this.pagosService.create(createPagoDto);
  }

  @Get()
  findAll() {
    return this.pagosService.findAll();
  }

  @Get('usuario/:id')
  findByUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findByUsuario(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findOne(id);
  }
}