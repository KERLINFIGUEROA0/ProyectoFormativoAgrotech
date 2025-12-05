import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { InformacionSensorService } from './informacion_sensor.service';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';
import { UpdateInformacionSensorDto } from './dto/update-informacion_sensor.dto';

@Controller('informacion-sensor')
export class InformacionSensorController {
  constructor(private readonly informacionSensorService: InformacionSensorService) { }

  /**
   * ✅ NUEVO: Devuelve el último dato de CADA sensor.
   * Solo muestra datos recientes (configurable via query param).
   * (Ideal para un dashboard)
   */
  @Get('latest')
  async getLatestData(@Query('maxAgeMinutes', new ParseIntPipe({ optional: true })) maxAgeMinutes?: number) {
    const data = await this.informacionSensorService.getLatestData(maxAgeMinutes || 2);
    return { success: true, data };
  }

  /**
   * ✅ NUEVO: Devuelve el historial de un sensor específico por su ID.
   */
  @Get('sensor/:id')
  async findAllBySensor(
    @Param('id', ParseIntPipe) id: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    const data = await this.informacionSensorService.findAllBySensor(id, take || 100);
    return { success: true, data };
  }

  // --- Tus métodos existentes ---
  @Post()
  create(@Body() createInformacionSensorDto: CreateInformacionSensorDto) {
    return this.informacionSensorService.create(createInformacionSensorDto);
  }

  /**
   * 🔧 ENDPOINT DE PRUEBA: Inserta datos de prueba para un sensor
   * IMPORTANTE: Esta ruta debe estar ANTES de @Get(':id') para que funcione
   */
  @Post('test/:sensorId')
  async insertTestData(@Param('sensorId', ParseIntPipe) sensorId: number) {
    const valor = Math.random() * 50 + 10; // Valor aleatorio entre 10 y 60
    const data = await this.informacionSensorService.create({
      sensorId,
      valor: Number(valor.toFixed(2)),
    });
    return { success: true, message: 'Dato de prueba insertado', data };
  }

  @Get()
  findAll() {
    return this.informacionSensorService.findAll();
  }

  /**
    * Generate advanced report with statistics and chart data
    */
   @Get('report')
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.informacionSensorService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInformacionSensorDto: UpdateInformacionSensorDto) {
    return this.informacionSensorService.update(+id, updateInformacionSensorDto);
  }
  
  @Get('cultivo/:id')
  findByCultivo(@Param('id', ParseIntPipe) id: number) {
    return this.informacionSensorService.findByCultivo(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.informacionSensorService.remove(+id);
  }


}
