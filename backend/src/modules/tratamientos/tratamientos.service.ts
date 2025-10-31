import { Injectable } from '@nestjs/common';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';

@Injectable()
export class TratamientosService {
  create(createTratamientoDto: CreateTratamientoDto) {
    return 'This action adds a new tratamiento';
  }

  findAll() {
    return `This action returns all tratamientos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tratamiento`;
  }

  update(id: number, updateTratamientoDto: UpdateTratamientoDto) {
    return `This action updates a #${id} tratamiento`;
  }

  remove(id: number) {
    return `This action removes a #${id} tratamiento`;
  }
}

