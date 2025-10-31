// s/features/user/components/GestionUsuario.tsx

import { useState, useEffect, type ReactElement, useRef } from "react";
import { ChevronLeft, ChevronRight, UserPlus, FileSpreadsheet, FileUp, Pencil, UserCog, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search } from "lucide-react";
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
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const applyFilter = (usersToFilter: Usuario[]) => {
    let filtered = usersToFilter;
    const newActiveFilters: string[] = [];

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
      newActiveFilters.push(`Búsqueda: "${searchTerm}"`);
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter(user => user.estado);
      newActiveFilters.push('Estado: Activos');
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(user => !user.estado);
      newActiveFilters.push('Estado: Inactivos');
    }

    if (filterRol !== null) {
      const rolName = roles.find(r => r.id === filterRol)?.nombre;
      filtered = filtered.filter(user => user.tipoUsuario?.id === filterRol);
      newActiveFilters.push(`Rol: ${rolName}`);
    }

    if (filterFicha !== null) {
      filtered = filtered.filter(user => user.ficha?.id_ficha === filterFicha);
      newActiveFilters.push(`Ficha: ${filterFicha}`);
    }

    // Aplicar ordenamiento
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case 'identificacion':
            aValue = a.identificacion;
            bValue = b.identificacion;
            break;
          case 'nombre':
            aValue = `${a.nombre} ${a.apellidos || ''}`.toLowerCase();
            bValue = `${b.nombre} ${b.apellidos || ''}`.toLowerCase();
            break;
          case 'correo':
            aValue = a.correo.toLowerCase();
            bValue = b.correo.toLowerCase();
            break;
          case 'rol':
            aValue = a.tipoUsuario?.nombre.toLowerCase() || '';
            bValue = b.tipoUsuario?.nombre.toLowerCase() || '';
            break;
          case 'ficha':
            aValue = a.ficha?.id_ficha?.toLowerCase() || '';
            bValue = b.ficha?.id_ficha?.toLowerCase() || '';
            break;
          case 'estado':
            aValue = a.estado;
            bValue = b.estado;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setUsuarios(filtered);
    setActiveFilters(newActiveFilters);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case 'search':
        setSearchTerm('');
        break;
      case 'status':
        setFilterStatus('all');
        break;
      case 'rol':
        setFilterRol(null);
        break;
      case 'ficha':
        setFilterFicha(null);
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterRol(null);
    setFilterFicha(null);
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
    <div className="bg-white shadow-xl rounded-xl p-6 w-full h-full flex flex-col animate-in fade-in-0 duration-300">
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-700">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-500 mt-1">Administra usuarios, roles y permisos del sistema</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm text-sm transition-colors"
            >
              <UserPlus size={16} /> Nuevo Usuario
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm text-sm transition-colors"
            >
              <FileSpreadsheet size={16} /> Cargar Excel
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-sm text-sm transition-colors"
            >
              <FileUp size={16} /> Exportar
            </button>
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
        <div className="flex flex-col gap-4 mb-4">
          {/* Filtros principales */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, ID, rol o ficha..."
                className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterRol || ''}
              onChange={(e) => setFilterRol(e.target.value ? Number(e.target.value) : null)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none md:w-48"
            >
              <option value="">Todos los roles</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>{rol.nombre}</option>
              ))}
            </select>

            <select
              value={filterFicha || ''}
              onChange={(e) => setFilterFicha(e.target.value || null)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none md:w-48"
            >
              <option value="">Todas las fichas</option>
              {fichasOpciones.map((ficha) => (
                <option key={ficha.value} value={ficha.value}>{ficha.label}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none md:w-40"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {/* Chips de filtros activos */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Filtros activos:</span>
              {activeFilters.map((filter, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
                >
                  <span>{filter}</span>
                  <button
                    onClick={() => {
                      if (filter.includes('Búsqueda:')) clearFilter('search');
                      else if (filter.includes('Estado:')) clearFilter('status');
                      else if (filter.includes('Rol:')) clearFilter('rol');
                      else if (filter.includes('Ficha:')) clearFilter('ficha');
                    }}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-800 text-xs font-medium underline"
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-grow overflow-x-auto relative rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
           <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-700 uppercase text-xs sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className="px-4 py-4 text-left font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort('identificacion')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Identificación
                  {sortField === 'identificacion' && (
                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {sortField !== 'identificacion' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </th>
              <th className="px-4 py-4 text-left font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort('nombre')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Nombres y Apellidos
                  {sortField === 'nombre' && (
                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {sortField !== 'nombre' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </th>
              <th className="px-4 py-4 text-left font-semibold">
                <button
                  onClick={() => handleSort('correo')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Correo
                  {sortField === 'correo' && (
                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {sortField !== 'correo' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </th>
              <th className="px-4 py-4 text-left font-semibold">Teléfono</th>
              <th className="px-4 py-4 text-left font-semibold">
                <button
                  onClick={() => handleSort('rol')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Rol
                  {sortField === 'rol' && (
                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {sortField !== 'rol' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </th>
              <th className="px-4 py-4 text-left font-semibold">
                <button
                  onClick={() => handleSort('ficha')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Ficha
                  {sortField === 'ficha' && (
                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {sortField !== 'ficha' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </th>
              <th className="px-4 py-4 text-center font-semibold">
                <button
                  onClick={() => handleSort('estado')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Estado
                  {sortField === 'estado' && (
                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {sortField !== 'estado' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </th>
              <th className="px-4 py-4 text-center font-semibold">Acciones</th>
              <th className="px-4 py-4 text-center font-semibold">Permisos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentUsuarios.map((usuario, index) => (
              <tr key={usuario.id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-4 py-4 whitespace-nowrap font-mono text-sm text-gray-800">{usuario.identificacion}</td>
                <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {usuario.nombre[0]}{usuario.apellidos?.[0] || ''}
                    </div>
                    <span>{usuario.nombre} {usuario.apellidos}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-700 truncate max-w-xs" title={usuario.correo}>
                  <span className="cursor-help">{usuario.correo}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-700 font-mono">
                  {`+57 ${String(usuario.telefono).slice(0, 3)} ${String(usuario.telefono).slice(3, 6)} ${String(usuario.telefono).slice(6)}`}
                </td>
                <td className="px-4 py-4 text-gray-800">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                    usuario.tipoUsuario?.nombre === 'Admin' ? 'bg-red-100 text-red-800 border border-red-200' :
                    usuario.tipoUsuario?.nombre === 'Instructor' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {usuario.tipoUsuario?.nombre || 'No asignado'}
                  </span>
                </td>
                <td className="px-4 py-4 text-gray-700">
                  {usuario.ficha?.id_ficha ? (
                    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      {usuario.ficha.id_ficha}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Sin ficha</span>
                  )}
                </td>
                <td className="px-4 py-4 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    usuario.estado
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${usuario.estado ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    {usuario.estado ? 'Activo' : 'Inactivo'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-center items-center gap-2">
                    <button
                      onClick={() => openEditModal(usuario)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Editar usuario"
                    >
                      <Pencil size={16} />
                    </button>
                    <label className="flex items-center cursor-pointer" title={usuario.estado ? "Desactivar usuario" : "Activar usuario"}>
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={usuario.estado}
                          onChange={() => handleToggleActive(usuario)}
                        />
                        <div className={`block w-12 h-6 rounded-full transition-all duration-300 ${
                          usuario.estado ? 'bg-green-400' : 'bg-gray-300'
                        }`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${
                          usuario.estado ? 'transform translate-x-6' : ''
                        }`}></div>
                      </div>
                    </label>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => { setPermUser(usuario); setIsPermOpen(true); }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title={`Gestionar permisos - ${userRolePermissions[usuario.tipoUsuario?.id || 0] || 0} activos`}
                  >
                    <UserCog size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200 gap-4 bg-gray-50/50 px-4 py-3 rounded-lg">
         <div className="text-sm text-gray-600">
           <span className="font-medium">Mostrando {Math.min(indexOfLastItem, usuarios.length)} de {usuarios.length} usuarios</span>
           {activeFilters.length > 0 && (
             <span className="ml-2 text-blue-600 font-medium">({activeFilters.length} filtro{activeFilters.length !== 1 ? 's' : ''} activo{activeFilters.length !== 1 ? 's' : ''})</span>
           )}
         </div>
         {totalPages > 1 && (
           <div className="flex items-center gap-2">
             <button
               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
               disabled={currentPage === 1}
               className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
             >
               <ChevronLeft size={14}/>
               Anterior
             </button>

             <div className="flex items-center gap-1">
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                 if (pageNum > totalPages) return null;
                 return (
                   <button
                     key={pageNum}
                     onClick={() => setCurrentPage(pageNum)}
                     className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                       currentPage === pageNum
                         ? 'bg-blue-600 text-white'
                         : 'border border-gray-300 hover:bg-gray-50'
                     }`}
                   >
                     {pageNum}
                   </button>
                 );
               })}
             </div>

             <button
               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
               disabled={currentPage === totalPages}
               className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
             >
               Siguiente
               <ChevronRight size={14}/>
             </button>
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