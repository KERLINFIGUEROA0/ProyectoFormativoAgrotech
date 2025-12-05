import { api } from "../../../lib/axios";
import type {
  Broker,
  CreateBrokerDto,
  CreateSubscripcionDto,
  Subscripcion,
  Lote,
  BrokerLote,
  CreateBrokerLoteDto,
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

// --- API para Lotes ---
export const listarLotes = async (): Promise<Lote[]> => {
  const response = await api.get("/lotes");
  return response.data.data;
};


// --- API para BrokerLote (Configuraciones por Lote) ---

export const crearBrokerLote = async (data: CreateBrokerLoteDto): Promise<BrokerLote> => {
  const response = await api.post("/mqtt-config/broker-lotes", data);
  return response.data.data;
};

export const listarBrokerLotesPorLote = async (loteId: number): Promise<BrokerLote[]> => {
  const response = await api.get(`/mqtt-config/broker-lotes/lote/${loteId}`);
  return response.data.data;
};

export const listarBrokerLotesPorBroker = async (brokerId: number): Promise<BrokerLote[]> => {
  const response = await api.get(`/mqtt-config/broker-lotes/broker/${brokerId}`);
  return response.data.data;
};

export const actualizarBrokerLote = async (id: number, data: { topicos: (string | { topic: string; min?: number; max?: number })[]; puerto?: number; topicPrueba?: string }): Promise<BrokerLote> => {
  const response = await api.put(`/mqtt-config/broker-lotes/${id}`, data);
  return response.data.data;
};

export const eliminarBrokerLote = async (id: number): Promise<void> => {
  await api.delete(`/mqtt-config/broker-lotes/${id}`);
};