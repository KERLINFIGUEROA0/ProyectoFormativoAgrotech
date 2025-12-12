import { api } from "../../../lib/axios";
import type { TransaccionData } from "../interfaces/finanzas";


export const obtenerTransacciones = async () => {
  // Obtener ingresos, egresos y pagos por separado y combinarlos
  // Usar Promise.allSettled para manejar errores de permisos individualmente
  const [ventasRes, gastosRes, pagosRes] = await Promise.allSettled([
    api.get("/finanzas/transacciones"), // ✅ Endpoint correcto para ventas
    api.get("/gastos-produccion"),      // ✅ Endpoint correcto para gastos
    api.get("/pagos")                   // ✅ Mantener pagos como está
  ]);


  // Extraer datos de las respuestas, manejando errores de permisos
  const ventasData = ventasRes.status === 'fulfilled' ? (ventasRes.value.data?.data || ventasRes.value.data || []) : [];
  const gastosData = gastosRes.status === 'fulfilled' ? (gastosRes.value.data?.data || gastosRes.value.data || []) : [];
  const pagosData = pagosRes.status === 'fulfilled' ? (pagosRes.value.data?.data || pagosRes.value.data || []) : [];

  const ingresos = ventasData.map((v: any) => ({
    ...v,
    id: v.id,
    tipo: 'ingreso',
    cantidad: v.cantidad || 1,
    unidad: v.unidadMedida || 'kg', // Las cosechas se miden en kg
    precioUnitario: v.precioUnitario || v.monto,
    fecha: v.fecha, // Ya es string YYYY-MM-DD
  }));

  const egresos = gastosData.map((g: any) => ({
    ...g,
    id: `gasto-${g.id}`,
    tipo: 'egreso',
    // ✅ Aquí recuperamos los datos calculados del backend
    cantidad: g.cantidad !== null ? Number(g.cantidad) : 1,
    unidad: g.unidad || '-',
    precioUnitario: g.precioUnitario !== null ? Number(g.precioUnitario) : g.monto,
    fecha: new Date(g.fecha).toISOString().split('T')[0], // Convertir a string YYYY-MM-DD
  }));

  const pagosEgresos = pagosData.map((p: any) => ({
    ...p,
    id: `pago-${p.id}`,
    tipo: 'egreso',
    descripcion: p.descripcion || `Pago a ${p.usuario?.nombre} ${p.usuario?.apellidos} por actividad ${p.actividad?.titulo}`,
    fecha: p.fechaPago ? new Date(p.fechaPago).toISOString().split('T')[0] : null, // Convertir a string YYYY-MM-DD
    cantidad: p.horasTrabajadas || 1,
    unidad: 'horas',
    precioUnitario: p.tarifaHora || p.monto,
    monto: p.monto,
  }));


  // Combinar y ordenar por fecha descendente, filtrando fechas nulas o inválidas
  const allTransacciones = [...ingresos, ...egresos, ...pagosEgresos]
    .filter((t: any) => t.fecha && !isNaN(new Date(t.fecha).getTime()))
    .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());


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
    const payload = {
      descripcion: data.descripcion,
      cantidad: data.cantidad,
      monto: data.monto,
      fecha: data.fecha,
      produccionId: data.produccionId
    };
    const response = await api.post("/finanzas/transacciones", payload);
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
    const payload = {
      descripcion: data.descripcion,
      cantidad: data.cantidad,
      monto: data.monto,
      fecha: data.fecha,
      produccionId: data.produccionId
    };
    const response = await api.put(`/finanzas/transacciones/${actualId}`, payload);
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
    const response = await api.delete(`/finanzas/transacciones/${actualId}`);
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

// Nuevas funciones para obtener datos limitados con permisos compuestos
export const obtenerCosechasDisponibles = async () => {
  const response = await api.get("/finanzas/cosechas-disponibles");
  return response.data; // Devuelve cosechas disponibles para venta
};

export const obtenerMaterialesDisponibles = async () => {
  const response = await api.get("/finanzas/materiales-disponibles");
  return response.data; // Devuelve materiales disponibles para gastos
};
