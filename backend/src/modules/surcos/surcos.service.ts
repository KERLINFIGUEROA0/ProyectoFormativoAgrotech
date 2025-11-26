// src/modules/surcos/surcos.service.ts
import {
  Injectable, NotFoundException, BadRequestException,
  Inject,      // <--- IMPORTANTE
  forwardRef   // <--- IMPORTANTE
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surco } from './entities/surco.entity';
import { CreateSurcoDto } from './dto/create-surco.dto';
import { UpdateSurcoDto } from './dto/update-surco.dto';
import { UpdateSurcoEstadoDto } from './dto/update-surco-estado.dto';
import { UpdateSurcoMqttDto } from './dto/update-surco-mqtt.dto';
import { Lote } from '../lotes/entities/lote.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { MqttConfigService } from '../mqtt-config/mqtt-config.service'; // Importarar el servicio

@Injectable()
export class SurcosService {
  constructor(
    @InjectRepository(Surco)
    private readonly surcoRepository: Repository<Surco>,
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(Broker)
    private readonly brokerRepository: Repository<Broker>,
    @Inject(forwardRef(() => MqttConfigService))
    private readonly mqttConfigService: MqttConfigService,

  ) { }

  async crear(dto: CreateSurcoDto): Promise<Surco> {
    const { loteId, cultivoId, activo_mqtt } = dto;

    const lote = await this.loteRepository.findOne({ where: { id: loteId } });
    if (!lote) {
      throw new NotFoundException(`El lote con ID ${loteId} no existe`);
    }

    const cultivo = cultivoId
      ? await this.cultivoRepository.findOne({ where: { id: cultivoId } })
      : null;
    if (cultivoId && !cultivo) {
      throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe`);
    }

    const surco = this.surcoRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      lote,
      cultivo: cultivo || null,
      activo_mqtt: activo_mqtt ?? true, // Por defecto activo
    });

    const surcoGuardado = await this.surcoRepository.save(surco);
    console.log('Surco guardado:', surcoGuardado.id);

    return surcoGuardado;
  }

  async listar(): Promise<Surco[]> {
    return await this.surcoRepository.find({ relations: ['lote', 'cultivo'] });
  }

  async buscarPorId(id: number): Promise<Surco> {
    const surco = await this.surcoRepository.findOne({
      where: { id },
      relations: ['lote', 'cultivo'],
    });
    if (!surco) {
      throw new NotFoundException(`El surco con ID ${id} no existe`);
    }
    return surco;
  }

  async actualizar(id: number, dto: UpdateSurcoDto): Promise<Surco> {
    const { loteId, cultivoId, ...restoDto } = dto;
    const surco = await this.buscarPorId(id);

    // Si se intenta enviar un loteId diferente, se lanza un error.
    if (loteId && loteId !== surco.lote.id) {
      throw new BadRequestException('No se puede cambiar el lote de un surco existente.');
    }

    // Se actualizan los campos permitidos (nombre, descripción, etc.)
    Object.assign(surco, restoDto);

    // Se actualiza la relación con el cultivo si se proporciona un nuevo cultivoId
    if (cultivoId !== undefined) {
      if (cultivoId === null || cultivoId === undefined || cultivoId === 0) {
        surco.cultivo = null;
      } else {
        const cultivo = await this.cultivoRepository.findOne({ where: { id: cultivoId } });
        if (!cultivo) {
          throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe`);
        }
        surco.cultivo = cultivo;
      }
    }

    return await this.surcoRepository.save(surco);
  }
async sincronizarSensores(id: number): Promise<{ message: string, sensoresCreados: number }> {
   // 1. Buscar el surco con su lote y brokers
   const surco = await this.surcoRepository.findOne({
     where: { id },
     relations: ['lote', 'lote.brokers', 'sensores'] // Traemos sensores para no duplicar si ya existen
   });

   if (!surco) throw new NotFoundException(`Surco #${id} no encontrado`);
   if (!surco.lote.brokers || surco.lote.brokers.length === 0) throw new BadRequestException(`El lote "${surco.lote.nombre}" no tiene brokers asignados`);

   // Usar el primer broker del lote
   const broker = surco.lote.brokers[0];
   const topicos = broker.topicosAdicionales;
   if (!topicos || topicos.length === 0) {
     throw new BadRequestException(`El Broker "${broker.nombre}" no tiene tópicos configurados`);
   }

   // 2. Filtrar tópicos que YA tienen un sensor creado en este surco (para evitar duplicados)
   const topicosExistentes = surco.sensores.map(s => s.topic);
   const topicosFaltantes = topicos.filter(t => !topicosExistentes.includes(t));

   if (topicosFaltantes.length === 0) {
     return { message: 'Todos los sensores ya están creados y sincronizados.', sensoresCreados: 0 };
   }

   // 3. Llamar al servicio MQTT para crear SOLO los faltantes
   await this.mqttConfigService.crearSensoresParaTopicos(
     broker,
     surco.lote.id, // Usar loteId en lugar de surcoId
     topicosFaltantes
   );

   return {
     message: `Se crearon ${topicosFaltantes.length} sensores nuevos correctamente.`,
     sensoresCreados: topicosFaltantes.length
   };
 }
  async eliminar(id: number): Promise<void> {
    const surco = await this.buscarPorId(id);
    await this.surcoRepository.remove(surco);
  }

  async listarPorLote(loteId: number): Promise<Surco[]> {
    return await this.surcoRepository.find({
      where: { lote: { id: loteId } },
      relations: ['lote', 'cultivo']
    });
  }

  async actualizarEstado(id: number, dto: UpdateSurcoEstadoDto): Promise<Surco> {
    const surco = await this.buscarPorId(id);
    surco.estado = dto.estado;
    return await this.surcoRepository.save(surco);
  }

  async actualizarMqtt(id: number, dto: UpdateSurcoMqttDto): Promise<Surco> {
    const surco = await this.buscarPorId(id);
    surco.activo_mqtt = dto.activo_mqtt;
    return await this.surcoRepository.save(surco);
  }
}
