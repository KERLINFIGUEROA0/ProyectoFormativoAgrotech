import { Injectable } from '@nestjs/common';
import { CreateEpaDto } from './dto/create-epa.dto';
import { UpdateEpaDto } from './dto/update-epa.dto';

@Injectable()
export class EpaService {
  create(createEpaDto: CreateEpaDto) {
    return 'This action adds a new epa';
  }

  findAll() {
    return `This action returns all epa`;
  }

  findOne(id: number) {
    return `This action returns a #${id} epa`;
  }

  update(id: number, updateEpaDto: UpdateEpaDto) {
    return `This action updates a #${id} epa`;
  }

  remove(id: number) {
    return `This action removes a #${id} epa`;
  }
}

