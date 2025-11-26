import { api } from "../../../lib/axios";
import type {
  Broker,
  CreateBrokerDto,
  CreateSubscripcionDto,
  Subscripcion,
  Surco,
} from "../interfaces/iot";

// --- API para Brokers ---

export const listarBrokers = async (): Promise<Broker[]> => {
  const response = await api.get("/mqtt-config/brokers");
  return response.data.data; // Los datos están en response.data.data
};

export const crearBroker = async (data: CreateBrokerDto): Promise<Broker> => {
  const response = await api.post("/mqtt-config/brokers", data);
  return response.data.data;
};

export const actualizarBroker = async (id: number, data: CreateBrokerDto): Promise<Broker> => {
  const response = await api.put(`/mqtt-config/brokers/${id}`, data);
  return response.data.data;
};

export const eliminarBroker = async (id: number): Promise<void> => {
  await api.delete(`/mqtt-config/brokers/${id}`);
};

export const actualizarEstadoBroker = async (id: number, estado: 'Activo' | 'Inactivo'): Promise<Broker> => {
  const response = await api.put(`/mqtt-config/brokers/${id}/estado`, { estado });
  return response.data.data;
};

// --- API para Subscripciones (Tópicos) ---

export const crearSubscripcion = async (
  data: CreateSubscripcionDto,
): Promise<Subscripcion> => {
  const response = await api.post("/mqtt-config/subscripciones", data);
  return response.data.data;
};

export const eliminarSubscripcion = async (id: number): Promise<void> => {
  await api.delete(`/mqtt-config/subscripciones/${id}`);
};

// --- API para probar conexión ---
export const probarConexionBroker = async (data: CreateBrokerDto): Promise<{ connected: boolean; message: string }> => {
  const response = await api.post("/mqtt-config/brokers/test-connection", data);
  return response.data; // Retorna { success: true, message: string, connected: boolean }
};

// --- API para Surcos ---
export const listarSurcos = async (): Promise<Surco[]> => {
  const response = await api.get("/surcos/listar");
  return response.data.data;
};