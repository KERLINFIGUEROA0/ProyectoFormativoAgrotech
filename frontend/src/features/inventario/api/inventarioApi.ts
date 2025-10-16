import { api } from "../../../lib/axios";
import type { MaterialData, MovimientoData } from '../interfaces/inventario';

// --- API para Materiales (Productos de Inventario) ---

export const listarMateriales = async () => {
  const response = await api.get("/materiales");
  return response.data;
};

export const crearMaterial = async (data: Partial<MaterialData>) => {
  const response = await api.post("/materiales", data);
  return response.data;
};
export const obtenerMaterialPorId = async (id: number) => {
  const response = await api.get(`/materiales/${id}`);
  return response.data;
};

export const actualizarMaterial = async (id: number, data: Partial<MaterialData>) => {
  const response = await api.patch(`/materiales/${id}`, data);
  return response.data;
};

export const subirImagenMaterial = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/materiales/${id}/imagen`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const desactivarMaterial = async (id: number) => {
    // Asumimos un endpoint PATCH para cambiar el estado a inactivo
    const response = await api.patch(`/materiales/${id}/desactivar`);
    return response.data;
}

// Y creamos una función para reactivarlo
export const reactivarMaterial = async (id: number) => {
    // Asumimos un endpoint PATCH para cambiar el estado a activo
    const response = await api.patch(`/materiales/${id}/reactivar`);
    return response.data;
}
// --- API para Movimientos de Inventario ---

export const listarMovimientos = async () => {
    const response = await api.get('/inventario/movimientos/historial');
    return response.data;
}

// --- ✅ FUNCIÓN AÑADIDA ---
export const listarMovimientosPorMaterial = async (materialId: number) => {
  const response = await api.get(`/inventario/movimientos/historial/${materialId}`);
  return response.data;
};

export const registrarMovimiento = async (data: MovimientoData) => {
  // El backend necesita el usuarioId. Asumimos que el objeto 'user' con su 'id'
  // se guarda en localStorage después del login.
  const userString = localStorage.getItem("user"); 
  const user = userString ? JSON.parse(userString) : {};
  
  const payload = { ...data, usuarioId: user.id };
  const response = await api.post('/inventario/movimientos/registrar', payload);
  return response.data;
};

// --- ✅ FUNCIÓN AÑADIDA ---
// API para Reportes
export const listarMaterialesConStockBajo = async (limite: number = 5) => {
    const response = await api.get(`/materiales/reportes/stock-bajo?limite=${limite}`);
    return response.data;
}