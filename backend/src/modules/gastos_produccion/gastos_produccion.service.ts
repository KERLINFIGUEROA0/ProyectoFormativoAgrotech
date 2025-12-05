import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gasto } from './entities/gastos_produccion.entity';
import { CreateGastosProduccionDto } from './dto/create-gastos_produccion.dto';
import { UpdateGastosProduccionDto } from './dto/update-gastos_produccion.dto';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { DateUtil } from '../../common/utils/date.util';

@Injectable()
export class GastosProduccionService {
  constructor(
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Cultivo) // <-- 2. INYECTAR REPOSITORIO DE CULTIVO
    private readonly cultivoRepository: Repository<Cultivo>,
  ) {}

  // --- 3. REFACTORIZAR MÉTODO CREATE ---
  async create(createGastosProduccionDto: CreateGastosProduccionDto): Promise<Gasto> {
    const { produccion: produccionId, cultivo: cultivoId, ...restoDto } = createGastosProduccionDto;
    
    let produccion: Produccion | null = null;
    let cultivo: Cultivo | null = null;

    if (produccionId) {
      produccion = await this.produccionRepository.findOne({ where: { id: produccionId } });
      if (!produccion) {
        throw new NotFoundException(`La producción con ID ${produccionId} no fue encontrada.`);
      }
    } else if (cultivoId) {
      cultivo = await this.cultivoRepository.findOne({ where: { id: cultivoId } });
      if (!cultivo) {
        throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);
      }
    }
    // Si no viene ninguno, es un gasto general (lo cual está bien)

    const nuevoGasto = this.gastoRepository.create({
      ...restoDto,
      tipo: TipoMovimiento.EGRESO,
      produccion: produccion, // Asignar la entidad o null
      cultivo: cultivo,       // Asignar la entidad o null
      fecha: restoDto.fecha ? DateUtil.fromISO(restoDto.fecha) : DateUtil.getCurrentDate(),
    });

    return this.gastoRepository.save(nuevoGasto);
  }

  // --- 4. ACTUALIZAR MÉTODO FINDALL ---
  async findAll(): Promise<any[]> {
    const gastos = await this.gastoRepository.find({
      relations: ['produccion', 'cultivo'], // <-- Añadir 'cultivo'
      order: { fecha: 'DESC' },
    });

    return gastos.map(g => ({
      id: g.id,
      descripcion: g.descripcion,
      monto: parseFloat(g.monto as any),
      fecha: g.fecha,
      tipo: g.tipo,
      // ✅ NUEVOS CAMPOS PARA EL DESGLOSE FINANCIERO
      cantidad: g.cantidad,
      unidad: g.unidad,
      precioUnitario: g.precioUnitario,
      // Opcional: añadir info de a qué está ligado
      asociadoA: g.produccion ? `Producción ID: ${g.produccion.id}` : (g.cultivo ? `Cultivo: ${g.cultivo.nombre}` : 'General')
    }));
  }

  // --- 5. ACTUALIZAR MÉTODO FINDONE ---
  async findOne(id: number): Promise<Gasto> {
    const gasto = await this.gastoRepository.findOne({ 
      where: { id }, 
      relations: ['produccion', 'cultivo'] // <-- Añadir 'cultivo'
    });
    if (!gasto) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado.`);
    }
    return gasto;
  }

  async update(id: number, updateGastosProduccionDto: UpdateGastosProduccionDto): Promise<Gasto> {
    // ... (este método no necesita cambios para esta lógica)
    const gasto = await this.findOne(id);
    Object.assign(gasto, updateGastosProduccionDto);
    return this.gastoRepository.save(gasto);
  }

  async remove(id: number): Promise<void> {
    // ... (este método no necesita cambios)
    const gasto = await this.gastoRepository.findOneBy({ id });
    if (!gasto) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado.`);
    }
    await this.gastoRepository.delete(id);
  }
}