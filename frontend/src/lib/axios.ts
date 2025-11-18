import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Detectar si estamos en una plataforma nativa
const isNative = Capacitor.isNativePlatform();

// Usar la IP de tu computadora en la red local cuando estés en móvil
// Reemplaza 'localhost' con la IP de tu computadora (ej: 192.168.1.100)
const API_URL = isNative
  ? "http://192.168.1.2:3000" // Para emulador Android (10.0.2.2 apunta a localhost de la máquina host)
  : import.meta.env.VITE_BACKEND_URL;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});