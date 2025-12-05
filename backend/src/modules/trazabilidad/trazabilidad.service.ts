import { Injectable, NotFoundException } from '@nestjs/common';
import { CultivosService } from '../cultivos/cultivos.service';
import { ActividadesService } from '../actividades/actividades.service';
import { ProduccionesService } from '../producciones/producciones.service';
import { VentasService } from '../ventas/ventas.service';
import { PagosService } from '../pagos/pagos.service';
import { MovimientosService } from '../../movimientos/movimientos.service';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';

@Injectable()
export class TrazabilidadService {
  constructor(
    private readonly cultivosService: CultivosService,
    private readonly actividadesService: ActividadesService,
    private readonly produccionesService: ProduccionesService,
    private readonly ventasService: VentasService,
    private readonly pagosService: PagosService,
    private readonly movimientosService: MovimientosService,
  ) {}

  // Función auxiliar para formatear fechas con zona horaria America/Bogota
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  }

  // Método auxiliar para buscar devoluciones de materiales por actividad
  private async buscarDevolucionesPorActividad(actividadId: number) {
    // Buscar movimientos de ingreso con referencia que contenga la actividad
    const movimientos = await this.movimientosService.obtenerHistorial();
    return movimientos.filter(mov =>
      mov.tipo === TipoMovimiento.INGRESO &&
      mov.referencia &&
      (mov.referencia.includes(`devolucion-final-actividad-${actividadId}`) ||
       mov.referencia.includes(`devolucion-actividad-${actividadId}`))
    );
  }

  async obtenerTrazabilidadPorCultivo(cultivoId: number, userIdentificacion?: number) {
    const cultivo = await this.cultivosService.buscarPorId(cultivoId);
    if (!cultivo) {
      throw new NotFoundException(`Cultivo con ID ${cultivoId} no encontrado.`);
    }

    const actividades = (await this.actividadesService.findAll(userIdentificacion)).filter(
      (act) => act.cultivo?.id === cultivoId,
    );

    const producciones = await this.produccionesService.findAllByCultivo(cultivoId);

    // ✅ CORRECCIÓN: Usamos la nueva función para obtener las ventas completas
    const idsProduccion = producciones.map((p) => p.id);
    const ventas = await this.ventasService.findByProduccionIds(idsProduccion);

    // Consultar pagos relacionados con las actividades del cultivo
    const idsActividad = actividades.map((a) => a.id);
    const pagos = await this.pagosService.findByActividades(idsActividad);

    // Definimos el array de la línea de tiempo
    const timeline: any[] = [];

    // --- LÓGICA CORREGIDA PARA CONSTRUIR LA LÍNEA DE TIEMPO ---

    // Evento inicial: Siembra (solo si la fecha existe)
    if (cultivo.Fecha_Plantado) {
      timeline.push({
        tipo: 'Siembra',
        fecha: cultivo.Fecha_Plantado,
        titulo: `Inicio del cultivo: ${cultivo.nombre}`,
        descripcion: `Se plantaron ${cultivo.cantidad} unidades.`,
        icono: 'Sprout',
      });
    }

    // Eventos de Actividades
    for (const act of actividades) {
      if (act.fecha) { // Solo añadimos si tiene fecha

        // 1. Añadir descripción base
        let descripcionCompleta = act.descripcion || 'Actividad registrada.';

        // 2. Añadir las personas asignadas
        if (act.asignados) {
          try {
            const asignados = JSON.parse(act.asignados);
            if (Array.isArray(asignados) && asignados.length > 0) {
              descripcionCompleta += `\nAsignados: ${asignados.join(', ')}.`;
            }
          } catch (error) {
            // Si hay error al parsear, continuar sin asignados
          }
        }

        // 3. Añadir persona responsable si existe
        if (act.responsable) {
          descripcionCompleta += `\nResponsable: ${act.responsable.nombre} ${act.responsable.apellidos}.`;
        }

        // 4. Añadir los materiales usados (si existen)
        if (act.actividadMaterial && act.actividadMaterial.length > 0) {
          const materialesList = act.actividadMaterial
            .map(am => `${am.material?.nombre || 'Material desconocido'} (${Number(am.cantidadUsada).toFixed(0)} ${am.material?.medidasDeContenido || 'unidades'})`)
            .join(', ');
          descripcionCompleta += `\nMateriales utilizados: ${materialesList}.`;

          // 5. Buscar devoluciones de materiales para esta actividad
          const devoluciones = await this.buscarDevolucionesPorActividad(act.id);
          if (devoluciones.length > 0) {
            const devolucionesList = devoluciones
              .map(dev => `${dev.material?.nombre || 'Material desconocido'} (${dev.cantidad} devueltos)`)
              .join(', ');
            descripcionCompleta += `\nMateriales devueltos: ${devolucionesList}.`;
          }
        }

        timeline.push({
          tipo: 'Actividad',
          fecha: act.fecha,
          titulo: act.titulo,
          descripcion: descripcionCompleta, // <-- Usamos la nueva descripción
          estado: act.estado,
          icono: 'ClipboardList',
        });
      }
    }

    // Eventos de Producción (Cosecha)
    producciones.forEach((prod) => {
      if (prod.fecha) { // Solo añadimos si tiene fecha
        timeline.push({
          tipo: 'Cosecha',
          fecha: prod.fecha,
          titulo: 'Registro de Cosecha',
          descripcion: `Se cosecharon ${prod.cantidadOriginal || prod.cantidad} kg.`,
          icono: 'Package',
        });
      }
    });
    
    // Eventos de Venta
    ventas.forEach((venta) => {
      if (venta.fecha) { // Solo añadimos si tiene fecha
        timeline.push({
          tipo: 'Venta',
          fecha: venta.fecha,
          titulo: `Venta registrada (Factura #${venta.id})`,
          // Usamos 'valorTotalVenta' que viene de la entidad e incluimos cantidad vendida
          descripcion: `${venta.descripcion}. Cantidad vendida: ${venta.cantidadVenta} kg. Total: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(Number(venta.valorTotalVenta))}`,
          icono: 'DollarSign',
        });
      }
    });

    // Eventos de Pago
    pagos.forEach((pago) => {
      if (pago.fechaPago) { // Solo añadimos si tiene fecha
        timeline.push({
          tipo: 'Pago',
          fecha: pago.fechaPago,
          titulo: `Pago registrado a ${pago.usuario.nombre} ${pago.usuario.apellidos}`,
          descripcion: `Pago por actividad "${pago.actividad.titulo}". Monto: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(Number(pago.monto))}. Horas trabajadas: ${pago.horasTrabajadas}.`,
          icono: 'CreditCard',
        });
      }
    });

    // ✅ CORRECCIÓN: Ordenamiento cronológico correcto
    // Si alguna fecha fuera nula, se trata como la fecha más antigua para evitar errores.
    timeline.sort((a, b) => new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime());

    // ✅ CORRECCIÓN: Formatear fechas con zona horaria America/Bogota
    timeline.forEach(item => {
      item.fecha = this.formatDate(item.fecha);
    });

    return {
      cultivo,
      timeline,
    };
  }
}