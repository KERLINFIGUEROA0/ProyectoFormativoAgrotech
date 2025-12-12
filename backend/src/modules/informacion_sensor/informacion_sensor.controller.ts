import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { InformacionSensorService } from './informacion_sensor.service';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';
import { UpdateInformacionSensorDto } from './dto/update-informacion_sensor.dto';
import { JwtAuthGuard } from '../../authorization/jwt.guard';
import { PermissionGuard } from '../../authorization/permission.guard';
import { Permission } from '../../authorization/permission.decorator';

@Controller('informacion-sensor')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InformacionSensorController {
  constructor(private readonly informacionSensorService: InformacionSensorService) { }

  /**
   * ✅ NUEVO: Devuelve el último dato de CADA sensor.
   * Solo muestra datos recientes (configurable via query param).
   * (Ideal para un dashboard)
   */
  @Get('latest')
  @Permission('Iot.Ver')
  async getLatestData(@Query('maxAgeMinutes', new ParseIntPipe({ optional: true })) maxAgeMinutes?: number) {
    const data = await this.informacionSensorService.getLatestData(maxAgeMinutes || 2);
    return { success: true, data };
  }

  // Endpoint público para dashboard - solo requiere autenticación
  @Get('dashboard/latest')
  async getLatestDataParaDashboard(@Query('maxAgeMinutes', new ParseIntPipe({ optional: true })) maxAgeMinutes?: number) {
    const data = await this.informacionSensorService.getLatestData(maxAgeMinutes || 2);
    return { success: true, data };
  }

  /**
   * ✅ NUEVO: Devuelve el historial de un sensor específico por su ID.
   */
  @Get('sensor/:id')
  @Permission('Iot.Ver')
  async findAllBySensor(
    @Param('id', ParseIntPipe) id: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    const data = await this.informacionSensorService.findAllBySensor(id, take || 100);
    return { success: true, data };
  }

  // --- Tus métodos existentes ---
  @Post()
  @Permission('Iot.Crear')
  create(@Body() createInformacionSensorDto: CreateInformacionSensorDto) {
    return this.informacionSensorService.create(createInformacionSensorDto);
  }

  /**
   * 🔧 ENDPOINT DE PRUEBA: Inserta datos de prueba para un sensor
   * IMPORTANTE: Esta ruta debe estar ANTES de @Get(':id') para que funcione
   */
  @Post('test/:sensorId')
  @Permission('Iot.Crear')
  async insertTestData(@Param('sensorId', ParseIntPipe) sensorId: number) {
    const valor = Math.random() * 50 + 10; // Valor aleatorio entre 10 y 60
    const data = await this.informacionSensorService.create({
      sensorId,
      valor: Number(valor.toFixed(2)),
    });
    return { success: true, message: 'Dato de prueba insertado', data };
  }

  @Get()
  @Permission('Iot.Ver')
  findAll() {
    return this.informacionSensorService.findAll();
  }

  /**
    * Generate advanced report with statistics and chart data
    */
   @Get('report')
   @Permission('Iot.Ver')
   async generateReport(
     @Query('scope') scope: 'sublote' | 'cultivo',
     @Query('scopeId', ParseIntPipe) scopeId: number,
     @Query('timeFilter') timeFilter: 'day' | 'date' | 'month',
     @Query('date') date?: string,
     @Query('sensorId', new ParseIntPipe({ optional: true })) sensorId?: number,
   ) {
     const report = await this.informacionSensorService.generateReport(scope, scopeId, timeFilter, date, sensorId);
     return { success: true, data: report };
   }

  @Get(':id')
  @Permission('Iot.Ver')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.informacionSensorService.findOne(id);
  }

  @Patch(':id')
  @Permission('Iot.Editar')
  update(@Param('id') id: string, @Body() updateInformacionSensorDto: UpdateInformacionSensorDto) {
    return this.informacionSensorService.update(+id, updateInformacionSensorDto);
  }
  
  @Get('cultivo/:id')
  @Permission('Iot.Ver')
  findByCultivo(@Param('id', ParseIntPipe) id: number) {
    return this.informacionSensorService.findByCultivo(id);
  }

  @Delete(':id')
  @Permission('Iot.Eliminar')
  remove(@Param('id') id: string) {
    return this.informacionSensorService.remove(+id);
  }


}
