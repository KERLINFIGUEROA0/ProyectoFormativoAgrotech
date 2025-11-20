import axios from "axios";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

// Detectar si estamos en una plataforma nativa
const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();
const isEmulator = platform === 'android' && navigator.userAgent.includes('Android SDK built for x86');

// Detectar el entorno de desarrollo
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// URLs configurables para diferentes entornos
const getApiUrl = () => {
  if (isNative) {
    // Para dispositivos móviles nativos
    if (isEmulator) {
      // En emulador Android, usar 10.0.2.2 para acceder al localhost de la máquina host
      return import.meta.env.VITE_EMULATOR_BACKEND_URL || "http://10.0.2.2:3000";
    }
    
    // En dispositivo físico o emulador iOS
    const mobileBackendUrl = import.meta.env.VITE_MOBILE_BACKEND_URL;
    if (mobileBackendUrl) {
      return mobileBackendUrl;
    }
    
    // Fallback: intentar detectar IP local
    console.warn("⚠️ VITE_MOBILE_BACKEND_URL no configurado. Usando fallback.");
    return "http://192.168.1.10:3000"; // Ajusta esta IP según tu red
  }
  
  // Para desarrollo web
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
};

// Configuración base de axios
const API_URL = getApiUrl();
console.log(`🔗 API URL configurada: ${API_URL} (Plataforma: ${Capacitor.getPlatform()})`);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Agregar timestamp para evitar problemas de caché
    config.headers['X-Request-Time'] = new Date().toISOString();
    
    return config;
  },
  (error) => {
    console.error("❌ Error en interceptor de request:", error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Manejar errores de red
    if (!error.response) {
      console.error("🌐 Error de red:", error.message);
      
      // Verificar si es un error de conectividad
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        if (isNative) {
          toast.error("Sin conexión a internet. Verifica tu conexión de red móvil.");
        } else {
          toast.error("Error de red. Verifica tu conexión a internet.");
        }
      } else {
        toast.error("No se puede conectar al servidor. Verifica que el backend esté ejecutándose.");
      }
      
      return Promise.reject(error);
    }
    
    // Manejar errores de autenticación (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log("🔑 Token expirado, cerrando sesión...");
      localStorage.removeItem("token");
      localStorage.removeItem("permissions");
      
      // Redirigir al login si no estamos ya ahí
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    // Manejar errores de servidor (500, etc.)
    if (error.response?.status >= 500) {
      console.error("🚨 Error del servidor:", error.response.data);
      toast.error("Error interno del servidor. Inténtalo de nuevo más tarde.");
    }
    
    // Log detallado de errores para debugging
    console.error("❌ Error de API:", {
      url: originalRequest.url,
      method: originalRequest.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    return Promise.reject(error);
  }
);

// Función para cambiar la URL de la API dinámicamente (útil para testing)
export const updateApiUrl = (newUrl: string) => {
  api.defaults.baseURL = newUrl;
  console.log(`🔄 URL de API actualizada a: ${newUrl}`);
};

// Función para verificar conectividad con el backend
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error("❌ Backend no disponible:", error);
    return false;
  }
};

// Función para obtener la URL actual de la API
export const getCurrentApiUrl = (): string => {
  return api.defaults.baseURL || API_URL;
};