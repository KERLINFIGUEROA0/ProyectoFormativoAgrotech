import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';

@Controller('tratamientos')
export class TratamientosController {
  constructor(private readonly tratamientosService: TratamientosService) {}

  @Post()
  create(@Body() createTratamientoDto: CreateTratamientoDto) {
    return this.tratamientosService.create(createTratamientoDto);
  }

  @Get()
  findAll() {
    return this.tratamientosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tratamientosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTratamientoDto: UpdateTratamientoDto) {
    return this.tratamientosService.update(id, updateTratamientoDto);
  }

  // Endpoint temporal sin DTO para probar
  @Patch('test-update/:id')
  testUpdate(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    console.log('Test update - Body received:', body);
    console.log('Test update - ID:', id);
    return { message: 'Test successful', received: body, id: id };
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tratamientosService.remove(id);
  }

  // Endpoint de prueba sin DTO
  @Patch('test-update/:id')
  testUpdateWithoutDto(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    console.log('Test endpoint - Body received:', body);
    console.log('Test endpoint - ID:', id);
    return { message: 'Test successful', received: body, id: id };
  }
}