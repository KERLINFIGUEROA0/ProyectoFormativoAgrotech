import { Injectable } from '@nestjs/common';
import { CreateGastosProduccionDto } from './dto/create-gastos_produccion.dto';
import { UpdateGastosProduccionDto } from './dto/update-gastos_produccion.dto';

@Injectable()
export class GastosProduccionService {
  create(createGastosProduccionDto: CreateGastosProduccionDto) {
    return 'This action adds a new gastosProduccion';
  }

  findAll() {
    return `This action returns all gastosProduccion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} gastosProduccion`;
  }

  update(id: number, updateGastosProduccionDto: UpdateGastosProduccionDto) {
    return `This action updates a #${id} gastosProduccion`;
  }

  remove(id: number) {
    return `This action removes a #${id} gastosProduccion`;
  }
}

