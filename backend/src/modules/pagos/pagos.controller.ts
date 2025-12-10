import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';
import { UsuariosService } from '../usuarios/usuarios.service';

@Controller('pagos')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PagosController {
  constructor(
    private readonly pagosService: PagosService,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Post()
  @Permission('Pagos.Crear')
  create(@Body() createPagoDto: CreatePagoDto | CreatePagoDto[]) {
    // Si es un array, crear múltiples pagos
    if (Array.isArray(createPagoDto)) {
      return this.pagosService.createMultiple(createPagoDto);
    }
    // Si es un solo pago, crear uno
    return this.pagosService.create(createPagoDto);
  }

  @Get()
  @Permission('Pagos.Ver')
  async findAll(@Request() req: any) {
    const user = await this.usuariosService.findByIdentificacion(req.user.identificacion);
    let userRole = user?.tipoUsuario?.nombre;
    if (!userRole) userRole = req.user.rolNombre;
    return this.pagosService.findAll(user?.identificacion, userRole);
  }

  @Get('usuario/:id')
  @Permission('Pagos.Ver')
  findByUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findByUsuario(id);
  }

  @Get('cultivo/:id')
  @Permission('Pagos.Ver')
  findByCultivo(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findByCultivo(id);
  }

  @Get('actividad/:id')
  @Permission('Pagos.Ver')
  findByActividad(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findByActividad(id);
  }

  @Get(':id')
  @Permission('Pagos.Ver')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findOne(id);
  }

  @Put(':id')
  @Permission('Pagos.Editar')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePagoDto: UpdatePagoDto, @Request() req: any) {
    const user = await this.usuariosService.findByIdentificacion(req.user.identificacion);
    let userRole = user?.tipoUsuario?.nombre;
    if (!userRole) userRole = req.user.rolNombre;
    return this.pagosService.update(id, updatePagoDto, userRole);
  }
}