import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UsuariosService } from '../usuarios/usuarios.service';

@Controller('pagos')
@UseGuards(JwtAuthGuard)
export class PagosController {
  constructor(
    private readonly pagosService: PagosService,
    private readonly usuariosService: UsuariosService,
  ) {}

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
  async findAll(@Request() req: any) {
    const user = await this.usuariosService.findByIdentificacion(req.user.identificacion);
    let userRole = user?.tipoUsuario?.nombre;
    if (!userRole) userRole = req.user.rolNombre;
    return this.pagosService.findAll(user?.identificacion, userRole);
  }

  @Get('usuario/:id')
  findByUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findByUsuario(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePagoDto: UpdatePagoDto, @Request() req: any) {
    const user = await this.usuariosService.findByIdentificacion(req.user.identificacion);
    let userRole = user?.tipoUsuario?.nombre;
    if (!userRole) userRole = req.user.rolNombre;
    return this.pagosService.update(id, updatePagoDto, userRole);
  }
}