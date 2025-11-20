// api/auth.ts

import { api, getCurrentApiUrl, checkBackendConnection } from "../../../lib/axios";
import type { Permiso, UpdatePerfilDto, LoginResponse, User } from "../interfaces/InterAuth";

// Usar la misma instancia de api configurada en lib/axios.ts
// para mantener la consistencia en interceptors y manejo de errores

const API_URL = getCurrentApiUrl();

// Función para verificar conectividad del backend
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn("⚠️ Backend no disponible para health check:", error);
    return false;
  }
};

// Función para obtener la URL actual del backend
export const getBackendUrl = (): string => {
  return API_URL;
};

export const login = async (identifier: string, password: string): Promise<LoginResponse> => {
  const res = await api.post(`/auth/login`, {
    identificacion: identifier,
    password,
  });

  if (res.data.user && res.data.user.estado === false) { // Corregido: 'usuario' a 'user' según la respuesta del backend
    throw new Error("Usuario inactivo. Por favor, contacte al administrador.");
  }

  return res.data;
};

export const solicitarRecuperacion = async (identificacion: string) => {
  const res = await api.post(`/recuperacion/solicitar`, {
    identificacion,
  });
  return res.data;
};

// Verificar token
export const verificarToken = async (token: string) => {
  const res = await api.get(`/recuperacion/verificar/${token}`);
  return res.data;
};

// Restablecer contraseña
export const restablecerPassword = async (token: string, nueva: string) => {
  const res = await api.post(`/recuperacion/restablecer`, {
    token,
    nueva,
  });
  return res.data;
};

// Cambiar password
export const cambiarPassword = async (actual: string, nueva: string) => {
  const res = await api.post("/usuarios/cambiarpassword", { actual, nueva });
  return res.data;
};

// Obtener perfil 
export const obtenerPerfil = async (): Promise<User> => {
  const res = await api.get("/usuarios/perfil");
  return res.data.data;
};

// Editar perfil
export const editarPerfil = async (data: UpdatePerfilDto): Promise<User> => {
  const res = await api.put("/usuarios/editarperfil", data);
  return res.data.data;
};

// Subir foto de perfil
export const uploadProfilePic = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/usuarios/fotoperfil", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// Ver foto de perfil
export const getProfilePic = async () => {
  try {
    const res = await api.get("/usuarios/fotoperfil", {
      responseType: 'blob',
    });
    return res.data;
  } catch (error: any) {
    // Si es 404, significa que no hay foto de perfil, lanzamos un error específico
    if (error.response?.status === 404) {
      throw new Error('NO_PROFILE_PIC');
    }
    throw error;
  }
};

// Crear rol
export const createRole = async (data: any) => {
  const res = await api.post("/roles", data);
  return res.data;
};

// Actualizar rol
export const updateRole = async (id: number, data: any) => {
  const res = await api.put(`/roles/${id}`, data);
  return res.data;
};

// Eliminar rol
export const deleteRole = async (id: number) => {
  const res = await api.delete(`/roles/${id}`);
  return res.data;
};

// Crear usuario
export const crearUsuario = async (data: any) => {
  const res = await api.post("/usuarios/crear", data);
  return res.data;
};

// Obtener usuarios
export const getUsuarios = async () => {
  const res = await api.get("/usuarios")
  console.log("API Response for getUsuarios:", res.data)
  return res.data
};

// Obtener todos los usuarios (activos e inactivos)
export const getUsuariosTodos = async () => {
  const res = await api.get("/usuarios");
  return res.data;
};

// Actualizar usuario
export const updateUsuario = async (id: number, data: any) => {
  const res = await api.put(`/usuarios/actualizar/${id}`, data);
  return res.data;
};

// Eliminar usuario (desactivar)
export const deleteUsuario = async (id: number) => {
  const res = await api.delete(`/usuarios/eliminar/${id}`);
  return res.data;
};

// Eliminar usuario permanentemente
export const deleteUsuarioPermanente = async (id: number) => {
  const res = await api.delete(`/usuarios/eliminar-permanente/${id}`);
  return res.data;
};

// Reactivar usuario
export const reactivarUsuario = async (id: number) => {
  const res = await api.patch(`/usuarios/reactivar/${id}`);
  return res.data;
};


// Obtener roles
export const getRoles = async () => {
  try {
    const res = await api.get("/roles");
    console.log("API Response for getRoles:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in getRoles API call:", error);
    throw error;
  }
};

// Exportar usuarios a Excel
export const exportarUsuariosExcel = async () => {
  const res = await api.get("/usuarios/exportar-excel", {
    responseType: 'blob',
  });
  return res.data;
};

// Cargar usuarios desde Excel
export const cargarUsuariosExcel = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/usuarios/cargar-excel", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// Obtener permisos de un usuario
export const getUsuarioPermisos = async (userId: number): Promise<Permiso[]> => {
  const res = await api.get(`/usuarios/${userId}/permisos`);
  return res.data.data;
};

// Actualizar permisos de un usuario
export const updateUsuarioPermisos = async (
  userId: number,
  permisos: Permiso[]
): Promise<Permiso[]> => {
  const res = await api.put(`/usuarios/${userId}/permisos`, { permisos });
  return res.data.data;
};