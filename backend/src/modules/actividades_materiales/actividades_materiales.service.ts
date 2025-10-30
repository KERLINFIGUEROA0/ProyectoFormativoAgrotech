import { Injectable } from '@nestjs/common';
import { CreateActividadesMaterialeDto } from './dto/create-actividades_materiale.dto';
import { UpdateActividadesMaterialeDto } from './dto/update-actividades_materiale.dto';

@Injectable()
export class ActividadesMaterialesService {
  create(createActividadesMaterialeDto: CreateActividadesMaterialeDto) {
    return 'This action adds a new actividadesMateriale';
  }

  findAll() {
    return `This action returns all actividadesMateriales`;
  }

  findOne(id: number) {
    return `This action returns a #${id} actividadesMateriale`;
  }

  update(id: number, updateActividadesMaterialeDto: UpdateActividadesMaterialeDto) {
    return `This action updates a #${id} actividadesMateriale`;
  }

  remove(id: number) {
    return `This action removes a #${id} actividadesMateriale`;
  }
}

