import { Injectable } from '@nestjs/common';
import { CreateSensoreDto } from './dto/create-sensore.dto';
import { UpdateSensoreDto } from './dto/update-sensore.dto';

@Injectable()
export class SensoresService {
  create(createSensoreDto: CreateSensoreDto) {
    return 'This action adds a new sensore';
  }

  findAll() {
    return `This action returns all sensores`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sensore`;
  }

  update(id: number, updateSensoreDto: UpdateSensoreDto) {
    return `This action updates a #${id} sensore`;
  }

  remove(id: number) {
    return `This action removes a #${id} sensore`;
  }
}

