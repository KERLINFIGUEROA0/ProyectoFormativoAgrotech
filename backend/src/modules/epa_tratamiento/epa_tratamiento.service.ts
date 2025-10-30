import { Injectable } from '@nestjs/common';
import { CreateEpaTratamientoDto } from './dto/create-epa_tratamiento.dto';
import { UpdateEpaTratamientoDto } from './dto/update-epa_tratamiento.dto';

@Injectable()
export class EpaTratamientoService {
  create(createEpaTratamientoDto: CreateEpaTratamientoDto) {
    return 'This action adds a new epaTratamiento';
  }

  findAll() {
    return `This action returns all epaTratamiento`;
  }

  findOne(id: number) {
    return `This action returns a #${id} epaTratamiento`;
  }

  update(id: number, updateEpaTratamientoDto: UpdateEpaTratamientoDto) {
    return `This action updates a #${id} epaTratamiento`;
  }

  remove(id: number) {
    return `This action removes a #${id} epaTratamiento`;
  }
}

