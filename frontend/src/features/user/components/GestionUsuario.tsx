 
import { useState, useEffect, type ReactElement, useRef } from "react";
import {
  UserPlus,
  FileSpreadsheet,
  FileUp,
  Pencil,
  UserCog,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Usuario, Rol } from "../interfaces/usuarios";
import type { FichaOption } from "../../fichas/interfaces/fichas";
import {
  crearUsuario,
  getRoles,
  getUsuariosTodos,
  updateUsuario,
  obtenerPerfil,
  deleteUsuario,
  reactivarUsuario,
  exportarUsuariosExcel,
  cargarUsuariosExcel,
} from "../../auth/api/auth";
import { getFichasOpcionesFromUsuarios } from "../../fichas/api/fichas";
import UserForm from "./UserForm";
import PermissionsModal from "./PermissionsModal";
import { api } from "../../../lib/axios";
import PermissionWrapper from "../../../components/PermissionWrapper";
import {
  Input,
  Select,
  SelectItem,
  Button,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Switch,
} from "@heroui/react";

export default function GestionUsuarios(): ReactElement {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [allUsuarios, setAllUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<
    Partial<Usuario & { rolId?: number }>
  >({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [permUser, setPermUser] = useState<Usuario | null>(null);
  const [userRolePermissions, setUserRolePermissions] = useState<
    Record<number, number>
  >({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterRol, setFilterRol] = useState<number | null>(null);
  const [filterFicha, setFilterFicha] = useState<string | null>(null);
  const [fichasOpciones, setFichasOpciones] = useState<FichaOption[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const applyFilter = (usersToFilter: Usuario[]) => {
    let filtered = usersToFilter;
    const newActiveFilters: string[] = [];

    if (searchTerm.trim() !== "") {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((user) => {
        const nombreCompleto = `${user.nombre} ${
          user.apellidos || ""
        }`.toLowerCase();
        const identificacion = String(user.identificacion).toLowerCase();
        const rol = user.tipoUsuario?.nombre.toLowerCase() || "";
        const ficha = user.ficha?.id_ficha?.toLowerCase() || "";
        return (
          nombreCompleto.includes(lowercasedTerm) ||
          identificacion.includes(lowercasedTerm) ||
          rol.includes(lowercasedTerm) ||
          ficha.includes(lowercasedTerm)
        );
      });
      newActiveFilters.push(`Búsqueda: "${searchTerm}"`);
    }

    if (filterStatus === "active") {
      filtered = filtered.filter((user) => user.estado);
      newActiveFilters.push("Estado: Activos");
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((user) => !user.estado);
      newActiveFilters.push("Estado: Inactivos");
    }

    if (filterRol !== null) {
      const rolName = roles.find((r) => r.id === filterRol)?.nombre;
      filtered = filtered.filter((user) => user.tipoUsuario?.id === filterRol);
      newActiveFilters.push(`Rol: ${rolName}`);
    }

    if (filterFicha !== null) {
      filtered = filtered.filter(
        (user) => user.ficha?.id_ficha === filterFicha
      );
      newActiveFilters.push(`Ficha: ${filterFicha}`);
    }

    // Aplicar ordenamiento
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case "identificacion":
            aValue = a.identificacion;
            bValue = b.identificacion;
            break;
          case "nombre":
            aValue = `${a.nombre} ${a.apellidos || ""}`.toLowerCase();
            bValue = `${b.nombre} ${b.apellidos || ""}`.toLowerCase();
            break;
          case "correo":
            aValue = a.correo.toLowerCase();
            bValue = b.correo.toLowerCase();
            break;
          case "rol":
            aValue = a.tipoUsuario?.nombre.toLowerCase() || "";
            bValue = b.tipoUsuario?.nombre.toLowerCase() || "";
            break;
          case "ficha":
            aValue = a.ficha?.id_ficha?.toLowerCase() || "";
            bValue = b.ficha?.id_ficha?.toLowerCase() || "";
            break;
          case "estado":
            aValue = a.estado;
            bValue = b.estado;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setUsuarios(filtered);
    setActiveFilters(newActiveFilters);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case "search":
        setSearchTerm("");
        break;
      case "status":
        setFilterStatus("all");
        break;
      case "rol":
        setFilterRol(null);
        break;
      case "ficha":
        setFilterFicha(null);
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
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
          const activePermissions = response.data.data.filter(
            (p: any) => p.activo
          ).length;
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
        getFichasOpcionesFromUsuarios(),
      ]);
      const loggedInUserIdentificacion = perfilData?.identificacion;

      const allUsers: Usuario[] =
        usuariosData?.data && Array.isArray(usuariosData.data)
          ? usuariosData.data
          : Array.isArray(usuariosData)
          ? usuariosData
          : [];

      const filteredUsers = allUsers.filter((user) => {
        const isNotAdmin = user.tipoUsuario?.nombre.toLowerCase() !== "admin";
        const isNotLoggedInUser = loggedInUserIdentificacion
          ? String(user.identificacion) !== String(loggedInUserIdentificacion)
          : true;
        return isNotAdmin && isNotLoggedInUser;
      });

      setAllUsuarios(filteredUsers);
      applyFilter(filteredUsers);

      const rolesList: Rol[] = Array.isArray(rolesData) ? rolesData : [];
      setRoles(
        rolesList.filter((rol: Rol) => rol.nombre.toLowerCase() !== "admin")
      );

      // Cargar opciones de fichas
      const fichasData = await getFichasOpcionesFromUsuarios();
      setFichasOpciones(fichasData);

      // Cargar permisos de roles después de tener los roles
      await fetchRolePermissions();
    } catch (error: unknown) {
      console.error("Error cargando datos:", error);
      const errorMessage =
        (error as any).response?.data?.message || "Error al cargar datos.";
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

  // Función removida ya que no se usa

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
    const toastId = toast.loading(
      editingId != null ? "Actualizando usuario..." : "Creando usuario..."
    );
    try {
      if (editingId != null) {
        await updateUsuario(editingId, dataPayload);
      } else {
        await crearUsuario({
          ...dataPayload,
          password: String(formData.identificacion),
        });
      }
      toast.success(
        editingId != null
          ? "Usuario actualizado con éxito"
          : "Usuario creado con éxito",
        { id: toastId }
      );
      await fetchData();
      closeModal();
    } catch (error: unknown) {
      console.error("Error guardando usuario:", error);
      const apiErrors = (error as any).response?.data?.message;
      let errorMessage =
        editingId != null ? "Error al actualizar." : "Error al crear.";
      if (Array.isArray(apiErrors)) {
        errorMessage = apiErrors.join(". ");
      } else if (typeof apiErrors === "string") {
        errorMessage = apiErrors;
      }
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleToggleActive = async (usuario: Usuario) => {
    const toastId = toast.loading(
      usuario.estado ? "Desactivando..." : "Activando..."
    );
    try {
      if (usuario.estado) {
        await deleteUsuario(usuario.id);
      } else {
        await reactivarUsuario(usuario.id);
      }
      toast.success(
        usuario.estado ? "Usuario desactivado" : "Usuario activado",
        { id: toastId }
      );
      await fetchData();
    } catch (error: unknown) {
      console.error("Error cambiando estado:", error);
      const errorMessage =
        (error as any).response?.data?.message || "Error al cambiar estado.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleExportExcel = async () => {
    const toastId = toast.loading("Exportando a Excel...");
    try {
      // Aplicar filtros actuales antes de exportar
      let usuariosFiltrados = allUsuarios;

      // Aplicar filtros de búsqueda
      if (searchTerm.trim() !== "") {
        const lowercasedTerm = searchTerm.toLowerCase();
        usuariosFiltrados = usuariosFiltrados.filter((user) => {
          const nombreCompleto = `${user.nombre} ${
            user.apellidos || ""
          }`.toLowerCase();
          const identificacion = String(user.identificacion).toLowerCase();
          const rol = user.tipoUsuario?.nombre.toLowerCase() || "";
          const ficha = user.ficha?.id_ficha?.toLowerCase() || "";
          return (
            nombreCompleto.includes(lowercasedTerm) ||
            identificacion.includes(lowercasedTerm) ||
            rol.includes(lowercasedTerm) ||
            ficha.includes(lowercasedTerm)
          );
        });
      }

      // Aplicar filtro de estado
      if (filterStatus === "active") {
        usuariosFiltrados = usuariosFiltrados.filter((user) => user.estado);
      } else if (filterStatus === "inactive") {
        usuariosFiltrados = usuariosFiltrados.filter((user) => !user.estado);
      }

      // Aplicar filtro de rol
      if (filterRol !== null) {
        usuariosFiltrados = usuariosFiltrados.filter(
          (user) => user.tipoUsuario?.id === filterRol
        );
      }

      // Aplicar filtro de ficha
      if (filterFicha !== null) {
        usuariosFiltrados = usuariosFiltrados.filter(
          (user) => user.ficha?.id_ficha === filterFicha
        );
      }

      // Si hay filtros aplicados, exportar solo los filtrados
      if (usuariosFiltrados.length !== allUsuarios.length) {
        // Enviar filtros al backend para exportación filtrada
        const filtros = {
          searchTerm: searchTerm.trim(),
          filterStatus,
          filterRol,
          filterFicha,
        };

        const response = await api.post(
          "/usuarios/exportar-excel-filtrado",
          filtros,
          {
            responseType: "blob",
          }
        );

        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "usuarios_filtrados.xlsx");
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(
          `${usuariosFiltrados.length} usuarios filtrados exportados exitosamente.`,
          { id: toastId }
        );
      } else {
        // Sin filtros, exportar todos (filtrados por roles permitidos)
        const blob = await exportarUsuariosExcel();
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "usuarios.xlsx");
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Usuarios exportados exitosamente.", { id: toastId });
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      toast.error("Error al exportar usuarios. Intente nuevamente.", { id: toastId });
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validación local: formato del archivo
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Por favor, seleccione un archivo Excel válido (.xlsx o .xls).");
      return;
    }

    // Validación local: tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("El archivo es demasiado grande. Máximo 10MB permitido.");
      return;
    }

    const toastId = toast.loading("Validando y cargando desde Excel...");
    try {
      const resultado = await cargarUsuariosExcel(file);
      const { creados = 0, errores = [] } = resultado.data || {};

      if (errores.length > 0) {
        // Mostrar errores detallados con Sonner
        const errorMessages = errores.map((err: any) =>
          `Fila ${err.fila}: ${err.mensaje}`
        ).join('\n');

        toast.error(
          <div className="max-w-md">
            <p className="font-semibold text-red-800 mb-2">⚠️ Errores en la carga del Excel</p>
            <div className="bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-y-auto">
              <div className="text-sm text-red-700 whitespace-pre-wrap">
                {errorMessages}
              </div>
            </div>
            {creados > 0 && (
              <p className="text-green-700 font-medium mt-2 text-sm">
                ✅ Usuarios creados exitosamente: {creados}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              Revisa el archivo Excel y corrige los errores antes de volver a intentar.
            </p>
          </div>,
          { id: toastId, duration: 10000 }
        );
      } else {
        toast.success(`Carga completada exitosamente. Usuarios creados: ${creados}.`, { id: toastId });
      }
      await fetchData();
    } catch (error: unknown) {
      console.error("Error al cargar Excel:", error);
      const errorMessage =
        (error as any).response?.data?.message ||
        "Error al procesar el archivo. Verifique el formato y los datos.";
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
    <>
      <div className="bg-white shadow-xl rounded-xl p-4 md:p-6 w-full h-full flex flex-col animate-in fade-in-0 duration-300">
        <div className="flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 md:mb-6 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-700">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Administra usuarios, roles y permisos del sistema
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PermissionWrapper module="Usuarios" permission="Crear">
                <Button
                  onClick={openModal}
                  color="success"
                  startContent={<UserPlus size={16} />}
                  size="sm"
                  className="text-sm font-bold text-white"
                >
                  <span className="hidden sm:inline">Nuevo Usuario</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </PermissionWrapper>
              <PermissionWrapper module="Usuarios" permission="Crear">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  color="success"
                  startContent={<FileSpreadsheet size={16} />}
                  size="sm"
                  className="text-sm font-bold text-white"
                >
                  <span className="hidden sm:inline">Cargar Excel</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
              </PermissionWrapper>
              <PermissionWrapper module="Usuarios" permission="Ver">
                <Button
                  onClick={handleExportExcel}
                  color="default"
                  startContent={<FileUp size={16} />}
                  size="sm"
                  className="text-sm"
                >
                  <span className="hidden sm:inline">Exportar</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </PermissionWrapper>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".xlsx, .xls"
          />
          <div className="flex flex-col gap-3 md:gap-4 mb-4">
            {/* Filtros principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Input
                type="text"
                placeholder="Buscar por nombre, ID, rol o ficha..."
                startContent={<Search className="text-gray-400 h-4 w-4" />}
                className="w-full"
                size="sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Select
                placeholder="Todos los roles"
                className="w-full"
                size="sm"
                selectedKeys={filterRol ? new Set([filterRol.toString()]) : new Set()}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  setFilterRol(selected ? Number(selected) : null);
                }}
              >
                {roles.map((rol) => (
                  <SelectItem key={rol.id.toString()}>
                    {rol.nombre}
                  </SelectItem>
                ))}
              </Select>

              <Select
                placeholder="Todas las fichas"
                className="w-full"
                size="sm"
                selectedKeys={filterFicha ? new Set([filterFicha]) : new Set()}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  setFilterFicha(selected as string || null);
                }}
              >
                {fichasOpciones.map((ficha) => (
                  <SelectItem key={ficha.value}>
                    {ficha.label}
                  </SelectItem>
                ))}
              </Select>

              <Select
                placeholder="Todos los estados"
                className="w-full"
                size="sm"
                selectedKeys={new Set([filterStatus])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as "all" | "active" | "inactive";
                  setFilterStatus(selected);
                }}
              >
                <SelectItem key="all">Todos los estados</SelectItem>
                <SelectItem key="active">Activos</SelectItem>
                <SelectItem key="inactive">Inactivos</SelectItem>
              </Select>
            </div>

            {/* Chips de filtros activos */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">
                  Filtros activos:
                </span>
                {activeFilters.map((filter, index) => (
                  <Chip
                    key={index}
                    color="primary"
                    variant="flat"
                    onClose={() => {
                      if (filter.includes("Búsqueda:")) clearFilter("search");
                      else if (filter.includes("Estado:")) clearFilter("status");
                      else if (filter.includes("Rol:")) clearFilter("rol");
                      else if (filter.includes("Ficha:")) clearFilter("ficha");
                    }}
                    className="text-xs"
                  >
                    {filter}
                  </Chip>
                ))}
                <Button
                  onClick={clearAllFilters}
                  color="danger"
                  variant="light"
                  size="sm"
                >
                  Limpiar todo
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-auto flex-grow min-h-0 rounded-lg border border-gray-200 bg-white shadow-sm">
          <Table aria-label="Tabla de usuarios" className="min-w-[1200px]" removeWrapper>
            <TableHeader>
              <TableColumn className="min-w-[110px] py-2 px-3 text-xs font-semibold">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => handleSort("identificacion")}
                  endContent={
                    sortField === "identificacion" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null
                  }
                  className="h-6 text-xs font-semibold p-0"
                >
                  ID
                </Button>
              </TableColumn>
              <TableColumn className="min-w-[180px] py-2 px-3 text-xs font-semibold">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => handleSort("nombre")}
                  endContent={
                    sortField === "nombre" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null
                  }
                  className="h-6 text-xs font-semibold p-0"
                >
                  Nombre
                </Button>
              </TableColumn>
              <TableColumn className="min-w-[180px] py-2 px-3 text-xs font-semibold">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => handleSort("correo")}
                  endContent={
                    sortField === "correo" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null
                  }
                  className="h-6 text-xs font-semibold p-0"
                >
                  Correo
                </Button>
              </TableColumn>
              <TableColumn className="min-w-[120px] py-2 px-3 text-xs font-semibold">Teléfono</TableColumn>
              <TableColumn className="min-w-[100px] py-2 px-3 text-xs font-semibold">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => handleSort("rol")}
                  endContent={
                    sortField === "rol" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null
                  }
                  className="h-6 text-xs font-semibold p-0"
                >
                  Rol
                </Button>
              </TableColumn>
              <TableColumn className="min-w-[90px] py-2 px-3 text-xs font-semibold">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => handleSort("ficha")}
                  endContent={
                    sortField === "ficha" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null
                  }
                  className="h-6 text-xs font-semibold p-0"
                >
                  Ficha
                </Button>
              </TableColumn>
              <TableColumn className="min-w-[90px] py-2 px-3 text-xs font-semibold">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => handleSort("estado")}
                  endContent={
                    sortField === "estado" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null
                  }
                  className="h-6 text-xs font-semibold p-0"
                >
                  Estado
                </Button>
              </TableColumn>
              <TableColumn className="min-w-[100px] py-2 px-3 text-xs font-semibold">Acciones</TableColumn>
              <TableColumn className="min-w-[80px] py-2 px-3 text-xs font-semibold">Permisos</TableColumn>
            </TableHeader>
            <TableBody>
              {currentUsuarios.map((usuario) => (
                <TableRow key={usuario.id} className="h-12">
                  <TableCell className="py-2 px-3 font-mono text-xs">
                    {usuario.identificacion}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {usuario.nombre[0]}
                        {usuario.apellidos?.[0] || ""}
                      </div>
                      <span className="font-medium text-sm truncate max-w-[140px]" title={`${usuario.nombre} ${usuario.apellidos}`}>
                        {usuario.nombre} {usuario.apellidos}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3 truncate max-w-xs text-sm" title={usuario.correo}>
                    {usuario.correo}
                  </TableCell>
                  <TableCell className="py-2 px-3 font-mono text-xs">
                    {`+57 ${String(usuario.telefono).slice(0, 3)} ${String(
                      usuario.telefono
                    ).slice(3, 6)} ${String(usuario.telefono).slice(6)}`}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <Chip color="warning" variant="flat" size="sm" className="text-xs px-2 py-1 h-6">
                      {usuario.tipoUsuario?.nombre || "No asignado"}
                    </Chip>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {usuario.ficha?.id_ficha ? (
                      <Chip color="secondary" variant="flat" size="sm" className="text-xs px-2 py-1 h-6">
                        {usuario.ficha.id_ficha}
                      </Chip>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin ficha</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-center">
                    <Chip
                      color={usuario.estado ? "success" : "danger"}
                      variant="flat"
                      size="sm"
                      className="text-xs px-2 py-1 h-6"
                      startContent={
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            usuario.estado ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                      }
                    >
                      {usuario.estado ? "Activo" : "Inactivo"}
                    </Chip>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <div className="flex justify-center items-center gap-1">
                      <PermissionWrapper module="Usuarios" permission="Editar">
                        <Button
                          isIconOnly
                          variant="light"
                          color="primary"
                          size="sm"
                          onClick={() => openEditModal(usuario)}
                          title="Editar usuario"
                          className="w-8 h-8"
                        >
                          <Pencil size={14} />
                        </Button>
                      </PermissionWrapper>
                      <PermissionWrapper module="Usuarios" permission="Editar">
                        <Switch
                          size="sm"
                          color="success"
                          isSelected={usuario.estado}
                          onValueChange={() => handleToggleActive(usuario)}
                          title={
                            usuario.estado
                              ? "Desactivar usuario"
                              : "Activar usuario"
                          }
                        />
                      </PermissionWrapper>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3 text-center">
                    <PermissionWrapper module="Usuarios" permission="Asignar">
                      <Button
                        isIconOnly
                        variant="light"
                        color="default"
                        size="sm"
                        onClick={() => {
                          setPermUser(usuario);
                          setIsPermOpen(true);
                        }}
                        title={`Gestionar permisos - ${
                          userRolePermissions[usuario.tipoUsuario?.id || 0] || 0
                        } activos`}
                        className="w-8 h-8"
                      >
                        <UserCog size={16} />
                      </Button>
                    </PermissionWrapper>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-200 gap-3 md:gap-4 bg-gray-50/50 px-3 md:px-4 py-2 md:py-3 rounded-lg">
          <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
            <span className="font-medium">
              Mostrando {Math.min(indexOfLastItem, usuarios.length)} de{" "}
              {usuarios.length} usuarios
            </span>
            {activeFilters.length > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({activeFilters.length} filtro
                {activeFilters.length !== 1 ? "s" : ""} activo
                {activeFilters.length !== 1 ? "s" : ""})
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <Pagination
              total={totalPages}
              page={currentPage}
              onChange={setCurrentPage}
              showControls
              showShadow
              color="primary"
              size="sm"
              className="justify-center sm:justify-end"
            />
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onOpenChange={closeModal} size="3xl" scrollBehavior="inside" className="max-h-[85vh]">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? "Actualizar Usuario" : "Registrar Nuevo Usuario"}
                </h3>
                <p className="text-sm text-gray-600">
                  Complete toda la información requerida
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <UserForm
              initialData={formInitialData}
              roles={roles}
              onSave={handleSave}
              onCancel={closeModal}
              editingId={editingId}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {isPermOpen && permUser && (
        <PermissionsModal
          isOpen={isPermOpen}
          onClose={() => {
            setIsPermOpen(false);
            setPermUser(null);
          }}
          target={{
            id: permUser.id,
            nombre: `${permUser.nombre} ${permUser.apellidos || ""}`,
            type: "usuario",
          }}
        />
      )}
    </>
  );
}
