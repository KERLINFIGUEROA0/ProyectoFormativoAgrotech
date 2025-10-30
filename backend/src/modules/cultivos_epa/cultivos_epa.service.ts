import { Injectable } from '@nestjs/common';
import { CreateCultivosEpaDto } from './dto/create-cultivos_epa.dto';
import { UpdateCultivosEpaDto } from './dto/update-cultivos_epa.dto';

@Injectable()
export class CultivosEpaService {
  create(createCultivosEpaDto: CreateCultivosEpaDto) {
    return 'This action adds a new cultivosEpa';
  }

  findAll() {
    return `This action returns all cultivosEpa`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cultivosEpa`;
  }

  update(id: number, updateCultivosEpaDto: UpdateCultivosEpaDto) {
    return `This action updates a #${id} cultivosEpa`;
  }

  remove(id: number) {
    return `This action removes a #${id} cultivosEpa`;
  }
}

