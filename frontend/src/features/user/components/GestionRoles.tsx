// s/features/user/components/GestionRoles.tsx

import { useState, type ReactElement, useEffect } from "react";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUserCog, FaUsers, FaShieldAlt } from "react-icons/fa";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getRoles, createRole, updateRole, deleteRole } from "../api/roles";
import { getUsuariosTodos as getUsuarios } from "../../auth/api/auth";
import type { Rol, Usuario } from "../interfaces/usuarios";
import PermissionsModal from "./PermissionsModal";
import { SmartPermissionWrapper } from "../../../components/PermissionWrapper";
import {
  Input,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";

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

    // Verificar si es un rol predeterminado
    const defaultRoles = ['aprendiz', 'pasante', 'invitado', 'instructor'];
    if (defaultRoles.includes(deletingRole.nombre.toLowerCase())) {
      toast.error("No se puede eliminar este rol predeterminado del sistema.");
      closeDeleteModal();
      return;
    }

    // Verificar si tiene usuarios asociados
    if (deletingRole.usuariosAsignados && deletingRole.usuariosAsignados > 0) {
      toast.error("No se puede eliminar el rol porque tiene usuarios asociados.");
      closeDeleteModal();
      return;
    }

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
    <div className="bg-white shadow-xl rounded-xl p-4 md:p-6 w-full flex flex-col h-full animate-in fade-in-0 duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 md:mb-6 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-700">Gestión de Roles</h2>
          <p className="text-sm text-gray-500 mt-1">Administra los roles y sus permisos en el sistema</p>
        </div>
        <SmartPermissionWrapper module="Usuarios" action="Crear">
          <Button
            onClick={() => { setEditingId(null); setForm({}); setIsModalOpen(true); }}
            color="success"
            startContent={<FaPlus size={16} />}
            size="sm"
            className="w-full sm:w-auto font-bold text-white"
          >
            Nuevo Rol
          </Button>
        </SmartPermissionWrapper>
      </div>
      <div className="mb-4 md:mb-6 flex items-center gap-3 flex-shrink-0">
        <Input
          type="text"
          placeholder="Buscar rol..."
          startContent={<FaSearch className="text-gray-400" />}
          className="flex-1 max-w-md"
          size="sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="overflow-auto flex-grow min-h-0 rounded-lg border border-gray-200 bg-white shadow-sm">
        <Table aria-label="Tabla de roles" removeWrapper className="min-w-[800px]">
          <TableHeader>
            <TableColumn className="min-w-[150px] py-2 px-3 text-xs font-semibold">Nombre del Rol</TableColumn>
            <TableColumn className="min-w-[200px] py-2 px-3 text-xs font-semibold">Descripción</TableColumn>
            <TableColumn className="min-w-[120px] py-2 px-3 text-xs font-semibold">Usuarios</TableColumn>
            <TableColumn className="min-w-[100px] py-2 px-3 text-xs font-semibold text-center">Acciones</TableColumn>
            <TableColumn className="min-w-[80px] py-2 px-3 text-xs font-semibold text-center">Permisos</TableColumn>
          </TableHeader>
          <TableBody>
            {filteredRoles.map((r) => (
              <TableRow key={r.id} className="h-12">
                <TableCell className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      <FaShieldAlt size={10} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{r.nombre}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 max-w-xs">
                  <span className="line-clamp-2 text-sm" title={r.descripcion}>
                    {r.descripcion || 'Sin descripción'}
                  </span>
                </TableCell>
                <TableCell className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-gray-400" size={12} />
                    <span className="font-medium text-gray-900 text-sm">{r.usuariosAsignados || 0}</span>
                    <span className="text-xs text-gray-500">usuario{(r.usuariosAsignados || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 text-center">
                  <div className="flex justify-center gap-1">
                    <SmartPermissionWrapper module="Usuarios" action="Editar">
                      <Button
                        isIconOnly
                        variant="light"
                        color="primary"
                        size="sm"
                        onClick={() => { setEditingId(r.id); setForm(r); setIsModalOpen(true); }}
                        title="Editar rol"
                        className="w-8 h-8"
                      >
                        <FaEdit size={14} />
                      </Button>
                    </SmartPermissionWrapper>
                    {!['aprendiz', 'pasante', 'invitado', 'instructor'].includes(r.nombre.toLowerCase()) && (
                      <SmartPermissionWrapper module="Usuarios" action="EliminarRol">
                        <Button
                          isIconOnly
                          variant="light"
                          color="danger"
                          size="sm"
                          onClick={() => openDeleteModal(r)}
                          title="Eliminar rol"
                          className="w-8 h-8"
                        >
                          <FaTrash size={14} />
                        </Button>
                      </SmartPermissionWrapper>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 text-center">
                  <SmartPermissionWrapper module="Usuarios" action="Asignar">
                    <Button
                      isIconOnly
                      variant="light"
                      color="default"
                      size="sm"
                      onClick={() => openPermModal(r)}
                      title="Gestionar permisos del rol"
                      className="w-8 h-8"
                    >
                      <FaUserCog size={16}/>
                    </Button>
                  </SmartPermissionWrapper>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Modal isOpen={isModalOpen} onOpenChange={closeModal} size="2xl" scrollBehavior="inside" className="max-h-[80vh]">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaShieldAlt className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Editar Rol' : 'Crear Nuevo Rol'}
                </h3>
                <p className="text-sm text-gray-600">Configure los permisos y características del rol</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* Información del Rol */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Información del Rol
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Rol
                    </label>
                    <Input
                      type="text"
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
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={closeModal}
              color="default"
              variant="light"
              className="font-normal text-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              color="success"
              className="font-bold text-white"
            >
              {editingId ? 'Actualizar Rol' : 'Crear Rol'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {isDeleteOpen && deletingRole && (
        <Modal isOpen={isDeleteOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDeleteOpen(false);
            setDeletingRole(null);
          }
        }}>
          <ModalContent>
            <ModalHeader className="flex flex-col items-center justify-center text-center pb-2">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <h4 className="text-lg font-semibold text-center">¿Eliminar rol?</h4>
              </div>
            </ModalHeader>
            <ModalBody className="text-center">
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 mx-auto max-w-xs">
                <div className="font-medium">{deletingRole.nombre}</div>
                <div className="text-xs text-gray-500 mt-1">Rol del sistema</div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Esta acción no se puede deshacer. Se eliminará permanentemente el rol.</p>
              <div className="flex gap-3 mt-4 w-full justify-center">
                <Button onClick={closeDeleteModal} color="default" variant="light" className="flex-1 max-w-[120px]">Cancelar</Button>
                <Button onClick={handleDelete} color="danger" className="flex-1 max-w-[120px]">Eliminar</Button>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
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
