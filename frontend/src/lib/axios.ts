import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CLAVE: Enviar cookies automáticamente en cada petición
});

// ❌ ELIMINADO: El interceptor que leía el token de localStorage
// El token ahora viaja en la cookie HttpOnly automáticamente
