// s/features/user/components/GestionRoles.tsx

import { useState, type ReactElement, useEffect } from "react";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUserCog, FaExclamationTriangle, FaUsers, FaShieldAlt } from "react-icons/fa";
import { X } from "lucide-react";
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
    <div className="bg-white shadow-xl rounded-xl p-6 w-full flex flex-col h-full animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-700">Gestión de Roles</h2>
          <p className="text-sm text-gray-500 mt-1">Administra los roles y sus permisos en el sistema</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm({}); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <FaPlus size={16} /> Nuevo Rol
        </button>
      </div>
      <div className="mb-6 flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Buscar rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-auto flex-grow min-h-0 rounded-lg border border-gray-200">
        <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-700 uppercase text-xs sticky top-0 z-10">
             <tr>
               <th className="px-4 py-4 text-left font-semibold">Nombre del Rol</th>
               <th className="px-4 py-4 text-left font-semibold">Descripción</th>
               <th className="px-4 py-4 text-left font-semibold">Usuarios Asignados</th>
               <th className="px-4 py-4 text-center font-semibold">Acciones</th>
               <th className="px-4 py-4 text-center font-semibold">Permisos</th>
             </tr>
           </thead>
           <tbody>
             {filteredRoles.map((r, index) => (
               <tr key={r.id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                 <td className="px-4 py-4 flex items-center gap-3">
                   <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                     <FaShieldAlt size={14} />
                   </div>
                   <div>
                     <div className="font-semibold text-gray-900">{r.nombre}</div>
                   </div>
                 </td>
                 <td className="px-4 py-4 text-gray-700 max-w-xs">
                   <span className="line-clamp-2" title={r.descripcion}>
                     {r.descripcion || 'Sin descripción'}
                   </span>
                 </td>
                 <td className="px-4 py-4">
                   <div className="flex items-center gap-2">
                     <FaUsers className="text-gray-400" size={14} />
                     <span className="font-medium text-gray-900">{r.usuariosAsignados || 0}</span>
                     <span className="text-sm text-gray-500">usuario{(r.usuariosAsignados || 0) !== 1 ? 's' : ''}</span>
                   </div>
                 </td>
                 <td className="px-4 py-4 text-center">
                   <div className="flex justify-center gap-2">
                     <button
                       onClick={() => { setEditingId(r.id); setForm(r); setIsModalOpen(true); }}
                       className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                       title="Editar rol"
                     >
                       <FaEdit size={16} />
                     </button>
                     <button
                       onClick={() => openDeleteModal(r)}
                       className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                       title="Eliminar rol"
                     >
                       <FaTrash size={16} />
                     </button>
                   </div>
                 </td>
                 <td className="px-4 py-4 text-center">
                     <button
                       onClick={() => openPermModal(r)}
                       className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                       title="Gestionar permisos del rol"
                     >
                         <FaUserCog size={18}/>
                     </button>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Rol' : 'Crear Nuevo Rol'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-6">
              {/* Información del Rol */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 animate-in slide-in-from-left-2 duration-400 delay-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-in scale-in duration-200 delay-50"></div>
                  Información del Rol
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Rol
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={String(form.nombre ?? "")}
                      onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                      placeholder="Ej: Administrador, Instructor, Aprendiz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción del Rol
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      rows={3}
                      value={String(form.descripcion ?? "")}
                      onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
                      placeholder="Describa las responsabilidades y funciones de este rol en el sistema"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Proporcione una descripción clara de las funciones del rol
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 animate-in slide-in-from-bottom-2 duration-400 delay-600">
                <button
                  onClick={closeModal}
                  className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors animate-in slide-in-from-left-3 duration-300 delay-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm animate-in slide-in-from-right-3 duration-300 delay-800"
                >
                  {editingId ? 'Actualizar Rol' : 'Crear Rol'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isDeleteOpen && deletingRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <h4 className="text-lg font-semibold">¿Eliminar rol?</h4>
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700">{deletingRole.nombre}</div>
              <p className="text-xs text-gray-500">Esta acción no se puede deshacer. Se eliminará permanentemente el rol.</p>
              <div className="flex gap-3 mt-4 w-full">
                <button onClick={closeDeleteModal} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isPermOpen && permRole && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in-0 duration-500 ease-out ${isPermOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className={`w-full max-w-4xl bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out z-[60] ${isPermOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Gestionar Permisos - {permRole.nombre}
              </h3>
              <button
                onClick={() => setIsPermOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <PermissionsModal
              isOpen={isPermOpen}
              onClose={() => setIsPermOpen(false)}
              target={{ id: permRole.id, nombre: permRole.nombre, type: "rol" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}