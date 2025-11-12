import { Injectable, NotFoundException } from '@nestjs/common';
import { CultivosService } from '../cultivos/cultivos.service';
import { ActividadesService } from '../actividades/actividades.service';
import { ProduccionesService } from '../producciones/producciones.service';
import { VentasService } from '../ventas/ventas.service';

@Injectable()
export class TrazabilidadService {
  constructor(
    private readonly cultivosService: CultivosService,
    private readonly actividadesService: ActividadesService,
    private readonly produccionesService: ProduccionesService,
    private readonly ventasService: VentasService,
  ) {}

  async obtenerTrazabilidadPorCultivo(cultivoId: number) {
    const cultivo = await this.cultivosService.buscarPorId(cultivoId);
    if (!cultivo) {
      throw new NotFoundException(`Cultivo con ID ${cultivoId} no encontrado.`);
    }

    const actividades = (await this.actividadesService.findAll()).filter(
      (act) => act.cultivo?.id === cultivoId,
    );

    const producciones = await this.produccionesService.findAllByCultivo(cultivoId);

    // ✅ CORRECCIÓN: Usamos la nueva función para obtener las ventas completas
    const idsProduccion = producciones.map((p) => p.id);
    const ventas = await this.ventasService.findByProduccionIds(idsProduccion);

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
    actividades.forEach((act) => {
      if (act.fecha) { // Solo añadimos si tiene fecha
        
        // 1. Añadir descripción base
        let descripcionCompleta = act.descripcion || 'Actividad registrada.';

        // 2. Añadir el usuario asignado (si existe)
        if (act.usuario) {
          descripcionCompleta += `\nAsignado a: ${act.usuario.nombre} ${act.usuario.apellidos}.`;
        }

        // 3. Añadir los materiales usados (si existen)
        if (act.actividadMaterial && act.actividadMaterial.length > 0) {
          const materialesList = act.actividadMaterial
            .map(am => `${am.material?.nombre || 'Material desconocido'} (x${am.cantidadUsada})`)
            .join(', ');
          descripcionCompleta += `\nMateriales: ${materialesList}.`;
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
    });

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

    // ✅ CORRECCIÓN: Hacemos el ordenamiento más seguro
    // Si alguna fecha fuera nula, se trata como la fecha más antigua para evitar errores.
    timeline.sort((a, b) => new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime());

    return {
      cultivo,
      timeline,
    };
  }
}