import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker } from './entities/broker.entity';
import { Subscripcion } from './entities/subscripcion.entity';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { CreateSubscripcionDto } from './dto/create-subscripcion.dto';

@Injectable()
export class MqttConfigService {
  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @InjectRepository(Subscripcion)
    private readonly subRepo: Repository<Subscripcion>,
  ) {}

  // --- Lógica de Brokers ---
  async createBroker(dto: CreateBrokerDto): Promise<Broker> {
    const nuevoBroker = this.brokerRepo.create(dto);
    return this.brokerRepo.save(nuevoBroker);
  }

  async findAllBrokers(): Promise<Broker[]> {
    return this.brokerRepo.find();
  }

  async findOneBroker(id: number): Promise<Broker> {
    const broker = await this.brokerRepo.findOneBy({ id });
    if (!broker) {
      throw new NotFoundException(`Broker con ID ${id} no encontrado.`);
    }
    return broker;
  }

  async deleteBroker(id: number): Promise<void> {
    const broker = await this.findOneBroker(id);
    await this.brokerRepo.remove(broker);
  }

  // --- Lógica de Subscripciones ---
  async createSubscripcion(dto: CreateSubscripcionDto): Promise<Subscripcion> {
    const { brokerId, topic, qos } = dto;
    const broker = await this.findOneBroker(brokerId);
    const nuevaSub = this.subRepo.create({ topic, qos, broker });
    return this.subRepo.save(nuevaSub);
  }

  async deleteSubscripcion(id: number): Promise<void> {
    const sub = await this.subRepo.findOneBy({ id });
    if (!sub) {
      throw new NotFoundException(`Subscripción con ID ${id} no encontrada.`);
    }
    await this.subRepo.remove(sub);
  }
}