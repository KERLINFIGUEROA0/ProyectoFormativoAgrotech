import { api } from "../../../lib/axios";
import type { PermisoRol, PermisoUsuario } from "../interfaces/usuarios";

export const getPermissionsByRole = async (rolId: number): Promise<PermisoRol[]> => {
  const response = await api.get(`/rol-permisos/rol/${rolId}`);
  return response.data.data;
};

export const getPermissionsByRoleDetallado = async (rolId: number): Promise<PermisoRol[]> => {
  const response = await api.get(`/rol-permisos/rol/${rolId}/detallado`);
  return response.data.data;
};

export const toggleRolePermission = async (rolId: number, permisoId: number, estado: boolean): Promise<void> => {
  await api.post("/rol-permisos/toggle", { rolId, permisoId, estado });
};

export const getPermissionsForUser = async (usuarioId: number): Promise<PermisoUsuario[]> => {
  const response = await api.get(`/usuario-permisos/usuario/${usuarioId}`);
  return response.data.data;
};

export const toggleUserPermission = async (usuarioId: number, permisoId: number, estado: boolean): Promise<void> => {
  await api.post("/usuario-permisos/toggle", { usuarioId, permisoId, estado });
};