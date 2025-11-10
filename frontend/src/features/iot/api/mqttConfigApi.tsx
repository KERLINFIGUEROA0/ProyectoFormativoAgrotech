import { api } from "../../../lib/axios";
import type {
  Broker,
  CreateBrokerDto,
  CreateSubscripcionDto,
  Subscripcion,
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

export const eliminarBroker = async (id: number): Promise<void> => {
  await api.delete(`/mqtt-config/brokers/${id}`);
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