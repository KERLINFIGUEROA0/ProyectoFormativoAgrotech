import { api } from "../../../lib/axios";
import type { TransaccionData } from "../interfaces/finanzas";


export const obtenerTransacciones = async () => {
  // Obtener ingresos, egresos y pagos por separado y combinarlos
  const [ventasRes, gastosRes, pagosRes] = await Promise.all([
    api.get("/ventas"),
    api.get("/gastos-produccion"),
    api.get("/pagos")
  ]);


  const ingresos = (ventasRes.data?.data || []).map((v: any) => ({
    ...v,
    id: v.id,
    tipo: 'ingreso',
    cantidad: v.cantidad || 1,
    unidad: v.unidadMedida || 'kg', // Las cosechas se miden en kg
    precioUnitario: v.precioUnitario || v.monto,
  }));

  const egresos = (gastosRes.data?.data || []).map((g: any) => ({
    ...g,
    id: `gasto-${g.id}`,
    tipo: 'egreso',
    // ✅ Aquí recuperamos los datos calculados del backend
    cantidad: g.cantidad !== null ? Number(g.cantidad) : 1,
    unidad: g.unidad || '-',
    precioUnitario: g.precioUnitario !== null ? Number(g.precioUnitario) : g.monto,
  }));

  const pagosEgresos = (pagosRes.data || []).map((p: any) => ({
    ...p,
    id: `pago-${p.id}`,
    tipo: 'egreso',
    descripcion: p.descripcion || `Pago a ${p.usuario?.nombre} ${p.usuario?.apellidos} por actividad ${p.actividad?.titulo}`,
    fecha: p.fechaPago,
    cantidad: p.horasTrabajadas || 1,
    unidad: 'horas',
    precioUnitario: p.tarifaHora || p.monto,
    monto: p.monto,
  }));


  // Combinar y ordenar por fecha descendente
  const allTransacciones = [...ingresos, ...egresos, ...pagosEgresos].sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());


  return { data: allTransacciones };
};

export const crearTransaccion = async (data: TransaccionData) => {
  if (data.tipo === 'egreso') {
    const payload = {
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: data.fecha,
      produccion: data.produccionId
    };
    const response = await api.post("/gastos-produccion", payload);
    return response.data;
  } else {
    const response = await api.post("/ventas", data);
    return response.data;
  }
};

export const actualizarTransaccion = async (id: string | number, data: Partial<TransaccionData>) => {
  // Asumimos que el id indica el tipo: si es string con 'gasto-' es egreso
  const isEgreso = typeof id === 'string' && id.startsWith('gasto-');
  const actualId = isEgreso ? id.replace('gasto-', '') : id;

  if (isEgreso) {
    const response = await api.patch(`/gastos-produccion/${actualId}`, data);
    return response.data;
  } else {
    const response = await api.patch(`/ventas/${actualId}`, data);
    return response.data;
  }
};

export const eliminarTransaccion = async (id: string | number) => {
  // Similar lógica para determinar el tipo
  const isGasto = typeof id === 'string' && id.startsWith('gasto-');
  const isPago = typeof id === 'string' && id.startsWith('pago-');
  let actualId: string | number = id;

  if (isGasto) {
    actualId = id.replace('gasto-', '');
    const response = await api.delete(`/gastos-produccion/${actualId}`);
    return response.data;
  } else if (isPago) {
    actualId = id.replace('pago-', '');
    const response = await api.delete(`/pagos/${actualId}`);
    return response.data;
  } else {
    const response = await api.delete(`/ventas/${actualId}`);
    return response.data;
  }
};

export const obtenerEstadisticasFinancieras = async () => {
  const response = await api.get("/finanzas/estadisticas");
  return response.data; // Asumimos que la API devuelve { data: { ingresos, egresos, balance } }
};

// NUEVA FUNCIÓN para el gráfico de barras
export const obtenerFlujoMensual = async () => {
  // Este endpoint debería devolver datos como: { data: [{ mes: 'Ene', ingresos: 1000, egresos: 500 }, ...] }
  const response = await api.get("/ventas/flujo-mensual");
  return response.data;
};

// NUEVA FUNCIÓN para el gráfico de pie
export const obtenerDistribucionEgresos = async () => {
  // Este endpoint debería devolver: { data: [{ nombre: 'Semillas', monto: 3500 }, ...] }
  const response = await api.get("/finanzas/distribucion-egresos");
  return response.data;
};

// Nueva función para obtener gastos
export const obtenerGastos = async () => {
  const response = await api.get("/gastos-produccion");
  return response.data; // Asumimos que devuelve { data: [...] }
};