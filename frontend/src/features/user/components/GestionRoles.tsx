// s/features/user/components/GestionRoles.tsx

import { useState, type ReactElement, useEffect } from "react";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUserCog, FaExclamationTriangle } from "react-icons/fa";
import { Input } from "@heroui/react";
import { toast } from "sonner";
import { getRoles, createRole, updateRole, deleteRole } from "../api/roles";
import { getUsuariosTodos as getUsuarios } from "../../auth/api/auth";
import type { Rol, Usuario } from "../interfaces/usuarios";
import PermissionsModal from "./PermissionsModal";

export default function GestionRoles(): ReactElement {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Rol[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Rol>>({});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Rol | null>(null);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<Rol | null>(null);

  const fetchRoles = async () => {
    try {
      const [rolesData, usuariosResponse] = await Promise.all([ getRoles(), getUsuarios() ]);
      
      const usuariosData: Usuario[] = usuariosResponse.data || [];

      const rolesWithUserCounts = rolesData.map(role => {
        const usersInRole = usuariosData.filter((user: Usuario) => user.tipoUsuario?.id === role.id);
        return { ...role, usuariosAsignados: usersInRole.length };
      });

      const finalRoles = rolesWithUserCounts.filter(role => role.nombre.toLowerCase() !== 'admin');
      setRoles(finalRoles);
      setFilteredRoles(finalRoles);
    } catch (error) {
      console.error("Error al obtener roles y usuarios:", error);
      toast.error("No se pudieron cargar los datos de roles.");
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const newFilteredRoles = roles.filter(role =>
      role.nombre.toLowerCase().includes(lowercasedSearchTerm) ||
      (role.descripcion && role.descripcion.toLowerCase().includes(lowercasedSearchTerm))
    );
    setFilteredRoles(newFilteredRoles);
  }, [searchTerm, roles]);

  const openPermModal = (r: Rol) => {
    setPermRole(r);
    setIsPermOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({});
  };

  const handleSave = async () => {
    const toastId = toast.loading(editingId != null ? 'Actualizando rol...' : 'Creando rol...');
    try {
      const roleDataToSend: Partial<Rol> = { nombre: form.nombre, descripcion: form.descripcion };
      if (editingId != null) {
        await updateRole(editingId, roleDataToSend);
        toast.success("Rol actualizado con éxito.", { id: toastId });
      } else {
        await createRole(roleDataToSend);
        toast.success("Rol creado con éxito.", { id: toastId });
      }
      fetchRoles();
      closeModal();
    } catch (error: unknown) {
      let errorMessage = "Error al guardar el rol.";
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as any).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        }
      }
      toast.error(errorMessage, { id: toastId });
    }
  };

  const openDeleteModal = (r: Rol) => { setDeletingRole(r); setIsDeleteOpen(true); };
  const closeDeleteModal = () => { setDeletingRole(null); setIsDeleteOpen(false); };

  const handleDelete = async () => {
    if (!deletingRole) return;
    const toastId = toast.loading("Eliminando rol...");
    try {
      await deleteRole(deletingRole.id);
      toast.success("Rol eliminado con éxito.", { id: toastId });
      fetchRoles();
      closeDeleteModal();
    } catch (error: unknown) {
      let errorMessage = "Error al eliminar el rol.";
       if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as any).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        }
      }
      toast.error(errorMessage, { id: toastId });
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 w-full flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-700">Gestión de Roles</h2>
        <button onClick={() => { setEditingId(null); setForm({}); setIsModalOpen(true); }} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
          <FaPlus /> Nuevo Rol
        </button>
      </div>
      <div className="mb-4 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 w-80 gap-2">
          <FaSearch className="text-gray-400" />
          <input
            className="flex-1 text-sm focus:outline-none"
            placeholder="Buscar rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-auto flex-grow min-h-0">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left">Nombre del Rol</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Usuarios Asignados</th>
              <th className="px-4 py-3 text-center">Acciones</th>
              <th className="px-4 py-3 text-center">Permisos</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoles.map((r) => (
              <tr key={r.id} className="border-t hover:bg-blue-50">
                <td className="px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center text-sm font-semibold">{r.nombre[0]}</div>
                  <div className="font-medium text-gray-700">{r.nombre}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.descripcion}</td>
                <td className="px-4 py-3">{r.usuariosAsignados || 0} usuarios</td>
                <td className="px-4 py-3 text-center flex justify-center gap-3">
                  <button onClick={() => { setEditingId(r.id); setForm(r); setIsModalOpen(true); }} className="text-yellow-600 hover:text-yellow-800"><FaEdit /></button>
                  <button onClick={() => openDeleteModal(r)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
                </td>
                <td className="px-4 py-3 text-center">
                    <button onClick={() => openPermModal(r)} className="text-gray-700 hover:text-blue-700" title="Gestionar Permisos">
                        <FaUserCog size={18}/>
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg">
            <button onClick={closeModal} className="absolute top-4 right-4 bg-white border border-gray-200 h-9 w-9 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-gray-600">✕</span>
            </button>
            <h3 className="text-center text-xl font-semibold mb-4">{editingId ? 'Actualizar rol' : 'Registrar rol'}</h3>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Nombre"
                value={String(form.nombre ?? "")}
                onChange={(e) => setForm((s) => ({ ...s, nombre: (e.target as HTMLInputElement).value }))}
                className="text-sm"
              />
              <label className="text-sm block">
                <div className="text-xs text-gray-500 mb-1">Descripción</div>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                  value={String(form.descripcion ?? "")}
                  onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
                />
              </label>
              <div className="flex justify-center mt-2">
                <button onClick={handleSave} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium">{editingId ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isDeleteOpen && deletingRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <h4 className="text-lg font-semibold">¿Eliminar rol?</h4>
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700">{deletingRole.nombre}</div>
              <p className="text-xs text-gray-500">Esta acción no se puede deshacer. Se eliminará permanentemente el rol.</p>
              <div className="flex gap-3 mt-4 w-full">
                <button onClick={closeDeleteModal} className="flex-1 px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isPermOpen && permRole && (
        <PermissionsModal
          isOpen={isPermOpen}
          onClose={() => setIsPermOpen(false)}
          target={{ id: permRole.id, nombre: permRole.nombre, type: "rol" }}
        />
      )}
    </div>
  );
}