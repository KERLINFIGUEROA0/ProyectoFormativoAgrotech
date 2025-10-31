// s/features/user/components/GestionUsuario.tsx

import { useState, useEffect, type ReactElement, useRef } from "react";
import { ChevronLeft, ChevronRight, UserPlus, FileSpreadsheet, FileUp, Pencil, UserCog } from "lucide-react";
import { toast } from "sonner";
import type { Usuario, Rol } from "../interfaces/usuarios";
import type { FichaOption } from "../../fichas/interfaces/fichas";
import { crearUsuario, getRoles, getUsuariosTodos, updateUsuario, obtenerPerfil, deleteUsuario, reactivarUsuario, exportarUsuariosExcel, cargarUsuariosExcel } from "../../auth/api/auth";
import { getFichasOpcionesFromUsuarios } from "../../fichas/api/fichas";
import Modal from "../../../components/Modal";
import UserForm from "./UserForm";
import PermissionsModal from "./PermissionsModal";
import { api } from "../../../lib/axios";

export default function GestionUsuarios(): ReactElement {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [allUsuarios, setAllUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<Usuario & { rolId?: number }>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [permUser, setPermUser] = useState<Usuario | null>(null);
  const [userRolePermissions, setUserRolePermissions] = useState<Record<number, number>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRol, setFilterRol] = useState<number | null>(null);
  const [filterFicha, setFilterFicha] = useState<string | null>(null);
  const [fichasOpciones, setFichasOpciones] = useState<FichaOption[]>([]);

  const applyFilter = (usersToFilter: Usuario[]) => {
    let filtered = usersToFilter;
    if (searchTerm.trim() !== '') {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        const nombreCompleto = `${user.nombre} ${user.apellidos || ''}`.toLowerCase();
        const identificacion = String(user.identificacion).toLowerCase();
        const rol = user.tipoUsuario?.nombre.toLowerCase() || '';
        const ficha = user.ficha?.id_ficha?.toLowerCase() || '';
        return nombreCompleto.includes(lowercasedTerm) ||
               identificacion.includes(lowercasedTerm) ||
               rol.includes(lowercasedTerm) ||
               ficha.includes(lowercasedTerm);
      });
    }
    if (filterStatus === 'active') {
      filtered = filtered.filter(user => user.estado);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(user => !user.estado);
    }
    if (filterRol !== null) {
      filtered = filtered.filter(user => user.tipoUsuario?.id === filterRol);
    }
    if (filterFicha !== null) {
      filtered = filtered.filter(user => user.ficha?.id_ficha === filterFicha);
    }
    setUsuarios(filtered);
  };

  const fetchRolePermissions = async () => {
    try {
      const rolesList: Rol[] = Array.isArray(roles) ? roles : [];
      const rolePermissions: Record<number, number> = {};

      for (const role of rolesList) {
        try {
          const response = await api.get(`/rol-permisos/rol/${role.id}`);
          const activePermissions = response.data.data.filter((p: any) => p.activo).length;
          rolePermissions[role.id] = activePermissions;
        } catch (error) {
          console.error(`Error cargando permisos del rol ${role.id}:`, error);
          rolePermissions[role.id] = 0;
        }
      }

      setUserRolePermissions(rolePermissions);
    } catch (error) {
      console.error("Error cargando permisos de roles:", error);
    }
  };

  const fetchData = async () => {
    try {
      const [perfilData, usuariosData, rolesData] = await Promise.all([
        obtenerPerfil(),
        getUsuariosTodos(),
        getRoles(),
        getFichasOpcionesFromUsuarios()
      ]);
      const loggedInUserIdentificacion = perfilData?.identificacion;

      let allUsers: Usuario[] = (usuariosData?.data && Array.isArray(usuariosData.data)) ? usuariosData.data : (Array.isArray(usuariosData) ? usuariosData : []);

      const filteredUsers = allUsers.filter(user => {
        const isNotAdmin = user.tipoUsuario?.nombre.toLowerCase() !== 'admin';
        const isNotLoggedInUser = loggedInUserIdentificacion ? String(user.identificacion) !== String(loggedInUserIdentificacion) : true;
        return isNotAdmin && isNotLoggedInUser;
      });

      setAllUsuarios(filteredUsers);
      applyFilter(filteredUsers);

      const rolesList: Rol[] = Array.isArray(rolesData) ? rolesData : [];
      setRoles(rolesList.filter((rol: Rol) => rol.nombre.toLowerCase() !== 'admin'));

      // Cargar opciones de fichas
      const fichasData = await getFichasOpcionesFromUsuarios();
      setFichasOpciones(fichasData);

      // Cargar permisos de roles después de tener los roles
      await fetchRolePermissions();
    } catch (error: unknown) {
      console.error("Error cargando datos:", error);
      const errorMessage = (error as any).response?.data?.message || "Error al cargar datos.";
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (roles.length > 0) {
      fetchRolePermissions();
    }
  }, [roles]);

  useEffect(() => {
    setCurrentPage(1);
    const delayDebounceFn = setTimeout(() => {
      applyFilter(allUsuarios);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, allUsuarios, filterStatus, filterRol, filterFicha]);

  const openModal = () => {
    setEditingId(null);
    setFormInitialData({});
    setIsModalOpen(true);
  };

  const isCurrentUserAdmin = () => {
    // Verificar si el usuario actual es admin basado en sus permisos o rol
    // Por ahora, asumiremos que si puede acceder a esta página, NO es admin
    // para que aparezca el campo de ficha
    return false;
  };

  const openEditModal = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setFormInitialData({
      identificacion: usuario.identificacion,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rolId: usuario.tipoUsuario?.id,
      tipo: usuario.tipo,
      // Nota: Para edición, no incluimos id_ficha ya que no se debe cambiar
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (formData: any) => {
    const dataPayload = {
      Tipo_Identificacion: formData.tipo ?? "CC",
      identificacion: Number(formData.identificacion),
      nombre: formData.nombre,
      apellidos: formData.apellidos,
      correo: formData.correo,
      telefono: formData.telefono,
      tipoUsuario: formData.rolId,
      ...(formData.id_ficha && { id_ficha: formData.id_ficha }),
    };
    const toastId = toast.loading(editingId != null ? 'Actualizando usuario...' : 'Creando usuario...');
    try {
      if (editingId != null) {
        await updateUsuario(editingId, dataPayload);
      } else {
        await crearUsuario({ ...dataPayload, password: String(formData.identificacion) });
      }
      toast.success(editingId != null ? 'Usuario actualizado con éxito' : 'Usuario creado con éxito', { id: toastId });
      await fetchData();
      closeModal();
    } catch (error: unknown) {
      console.error("Error guardando usuario:", error);
      const apiErrors = (error as any).response?.data?.message;
      let errorMessage = editingId != null ? 'Error al actualizar.' : 'Error al crear.';
      if (Array.isArray(apiErrors)) { errorMessage = apiErrors.join('. '); }
      else if (typeof apiErrors === 'string') { errorMessage = apiErrors; }
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleToggleActive = async (usuario: Usuario) => {
    const toastId = toast.loading(usuario.estado ? "Desactivando..." : "Activando...");
    try {
      if (usuario.estado) {
        await deleteUsuario(usuario.id);
      } else {
        await reactivarUsuario(usuario.id);
      }
      toast.success(usuario.estado ? "Usuario desactivado" : "Usuario activado", { id: toastId });
      await fetchData();
    } catch (error: unknown) {
      console.error("Error cambiando estado:", error);
      const errorMessage = (error as any).response?.data?.message || "Error al cambiar estado.";
      toast.error(errorMessage, { id: toastId });
    }
  };
  
  const handleExportExcel = async () => {
    const toastId = toast.loading("Exportando a Excel...");
    try {
      // Aplicar filtros actuales antes de exportar
      let usuariosFiltrados = allUsuarios;

      // Aplicar filtros de búsqueda
      if (searchTerm.trim() !== '') {
        const lowercasedTerm = searchTerm.toLowerCase();
        usuariosFiltrados = usuariosFiltrados.filter(user => {
          const nombreCompleto = `${user.nombre} ${user.apellidos || ''}`.toLowerCase();
          const identificacion = String(user.identificacion).toLowerCase();
          const rol = user.tipoUsuario?.nombre.toLowerCase() || '';
          const ficha = user.ficha?.id_ficha?.toLowerCase() || '';
          return nombreCompleto.includes(lowercasedTerm) ||
                 identificacion.includes(lowercasedTerm) ||
                 rol.includes(lowercasedTerm) ||
                 ficha.includes(lowercasedTerm);
        });
      }

      // Aplicar filtro de estado
      if (filterStatus === 'active') {
        usuariosFiltrados = usuariosFiltrados.filter(user => user.estado);
      } else if (filterStatus === 'inactive') {
        usuariosFiltrados = usuariosFiltrados.filter(user => !user.estado);
      }

      // Aplicar filtro de rol
      if (filterRol !== null) {
        usuariosFiltrados = usuariosFiltrados.filter(user => user.tipoUsuario?.id === filterRol);
      }

      // Aplicar filtro de ficha
      if (filterFicha !== null) {
        usuariosFiltrados = usuariosFiltrados.filter(user => user.ficha?.id_ficha === filterFicha);
      }

      // Si hay filtros aplicados, exportar solo los filtrados
      if (usuariosFiltrados.length !== allUsuarios.length) {
        // Enviar filtros al backend para exportación filtrada
        const filtros = {
          searchTerm: searchTerm.trim(),
          filterStatus,
          filterRol,
          filterFicha
        };

        const response = await api.post('/usuarios/exportar-excel-filtrado', filtros, {
          responseType: 'blob'
        });

        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'usuarios_filtrados.xlsx');
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(`${usuariosFiltrados.length} usuarios filtrados exportados.`, { id: toastId });
      } else {
        // Sin filtros, exportar todos
        const blob = await exportarUsuariosExcel();
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'usuarios.xlsx');
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Todos los usuarios exportados.", { id: toastId });
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      toast.error("No se pudo exportar.", { id: toastId });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Por favor, seleccione un archivo Excel.");
      return;
    }
    const toastId = toast.loading("Cargando desde Excel...");
    try {
      const resultado = await cargarUsuariosExcel(file);
      const { creados = 0, errores = [] } = resultado.data || {};
      const successMessage = `Carga completada. Creados: ${creados}. Errores: ${errores.length}.`;
      if (errores.length > 0) {
        console.error("Errores en carga Excel:", errores);
        toast.warning(<div><p>{successMessage}</p><p className="text-xs mt-1">Revise la consola para ver los errores.</p></div>, { id: toastId });
      } else {
        toast.success(successMessage, { id: toastId });
      }
      await fetchData();
    } catch (error: unknown) {
      console.error("Error al cargar Excel:", error);
      const errorMessage = (error as any).response?.data?.message || "Error al procesar el archivo.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsuarios = usuarios.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(usuarios.length / itemsPerPage);

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 w-full h-full flex flex-col">
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-700">Gestión de Usuarios</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm transition"><UserPlus size={16} /> Nuevo Usuario</button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm text-sm transition"><FileSpreadsheet size={16} /> Cargar Excel</button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 shadow-sm text-sm transition"><FileUp size={16} /> Exportar</button>
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre, ID, rol o ficha..."
            className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-72 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={filterRol || ''}
            onChange={(e) => setFilterRol(e.target.value ? Number(e.target.value) : null)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos los roles</option>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>{rol.nombre}</option>
            ))}
          </select>

          <select
            value={filterFicha || ''}
            onChange={(e) => setFilterFicha(e.target.value || null)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todas las fichas</option>
            {fichasOpciones.map((ficha) => (
              <option key={ficha.value} value={ficha.value}>{ficha.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex-grow overflow-x-auto relative">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0 z-10">
           <tr>
             <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Identificación</th>
             <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Nombres y Apellidos</th>
             <th className="px-4 py-3 text-left font-medium">Correo</th>
             <th className="px-4 py-3 text-left font-medium">Teléfono</th>
             <th className="px-4 py-3 text-left font-medium">Rol</th>
             <th className="px-4 py-3 text-left font-medium">Ficha</th>
             <th className="px-4 py-3 text-center font-medium">
               <select
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                 className="bg-gray-100 border-none text-center font-medium focus:outline-none"
               >
                 <option value="all">estado</option>
                 <option value="active">Activos</option>
                 <option value="inactive">Inactivos</option>
               </select>
             </th>
             <th className="px-4 py-3 text-center font-medium">Acciones</th>
             <th className="px-4 py-3 text-center font-medium">Permisos</th>
           </tr>
         </thead>
          <tbody className="divide-y divide-gray-200">
            {currentUsuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-blue-50">
                <td className="px-4 py-3 whitespace-nowrap">{usuario.identificacion}</td>
                <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{usuario.nombre} {usuario.apellidos}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{usuario.correo}</td>
                <td className="px-4 py-3 whitespace-nowrap">{`+57 ${String(usuario.telefono).slice(0, 3)} ${String(usuario.telefono).slice(3, 6)} ${String(usuario.telefono).slice(6)}`}</td>
                <td className="px-4 py-3 text-gray-700">{usuario.tipoUsuario?.nombre || 'No asignado'}</td>
                <td className="px-4 py-3 text-gray-700">{usuario.ficha?.id_ficha || 'Sin ficha'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${usuario.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {usuario.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center items-center gap-3">
                    <button onClick={() => openEditModal(usuario)} className="text-blue-600 hover:text-blue-800 transition"><Pencil size={16} /></button>
                    <label className="flex items-center cursor-pointer"><div className="relative"><input type="checkbox" className="sr-only" checked={usuario.estado} onChange={() => handleToggleActive(usuario)} /><div className={`block w-10 h-6 rounded-full ${usuario.estado ? 'bg-green-400' : 'bg-gray-300'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${usuario.estado ? 'transform translate-x-full' : ''}`}></div></div></label>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => { setPermUser(usuario); setIsPermOpen(true); }}
                      className="text-gray-700 hover:text-black transition"
                      title={`Permisos del rol: ${userRolePermissions[usuario.tipoUsuario?.id || 0] || 0} activos`}
                    >
                      <UserCog size={18} />
                    </button>
                    {usuario.tipoUsuario && (
                      <span className="text-xs text-gray-500">
                        Rol: {userRolePermissions[usuario.tipoUsuario.id] || 0}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex-shrink-0 flex justify-between items-center mt-4 pt-4 border-t text-sm text-gray-600">
        <span>Mostrando {Math.min(indexOfLastItem, usuarios.length)} de {usuarios.length} usuarios</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"><ChevronLeft size={16}/></button>
            <span className="font-medium">Página {currentPage} de {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"><ChevronRight size={16}/></button>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Actualizar Usuario' : 'Información de Registro'}>
        <UserForm
          initialData={formInitialData}
          roles={roles}
          onSave={handleSave}
          onCancel={closeModal}
          editingId={editingId}
          isAdmin={isCurrentUserAdmin()}
        />
      </Modal>

      {isPermOpen && permUser && (
        <PermissionsModal
          isOpen={isPermOpen}
          onClose={() => { setIsPermOpen(false); setPermUser(null); }}
          target={{
            id: permUser.id,
            nombre: `${permUser.nombre} ${permUser.apellidos || ''}`,
            type: "usuario",
          }}
        />
      )}
    </div>
  );
}