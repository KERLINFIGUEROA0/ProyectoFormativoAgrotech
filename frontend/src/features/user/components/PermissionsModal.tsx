
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Shield, Users, Settings, Filter } from "lucide-react";
import type { PermisoRol, PermisoUsuario } from "../interfaces/usuarios";
import {
  getPermissionsByRoleDetallado,
  getPermissionsForUser,
  toggleRolePermission,
  toggleUserPermission,
} from "../api/permissions";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Button,
  Switch,
  Chip,
} from "@heroui/react";

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: { id: number; nombre: string; type: "rol" | "usuario" };
}

export default function PermissionsModal({
  isOpen,
  onClose,
  target,
}: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<(PermisoRol | PermisoUsuario)[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setSearchTerm("");
      setSelectedModule("all");

      (target.type === "rol"
        ? getPermissionsByRoleDetallado(target.id)
        : getPermissionsForUser(target.id))
        .then((permissionsRes) => {
          setPermissions(permissionsRes);
        })
        .catch((error) => {
          console.error("Error loading permissions:", error);
          toast.error("Error al cargar los datos");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, target]);

  const handleToggle = (permisoId: number, estado: boolean) => {
    const togglePromise = target.type === "rol"
      ? toggleRolePermission(target.id, permisoId, estado)
      : toggleUserPermission(target.id, permisoId, estado);

    togglePromise
      .then(() => {
        setPermissions((prev) =>
          prev.map((p) =>
            p.permisoId === permisoId ? { ...p, activo: estado } : p
          )
        );
        toast.success(estado ? "Permiso activado" : "Permiso desactivado");
      })
      .catch((error) => {
        console.error("Error al actualizar el permiso:", error);
        toast.error("Error al actualizar el permiso");
      });
  };

  const filteredPermissions = permissions.filter((perm) => {
    const permModuleName = perm.modulo?.nombre || "Sin módulo";

    const matchesSearch = searchTerm === "" ||
      perm.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permModuleName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = target.type === "usuario" || selectedModule === "all" ||
      permModuleName === selectedModule;

    return matchesSearch && matchesModule;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const moduleName = perm.modulo?.nombre || "Sin módulo";
    if (!acc[moduleName]) {
      acc[moduleName] = [];
    }
    acc[moduleName].push(perm);
    return acc;
  }, {} as Record<string, (PermisoRol | PermisoUsuario)[]>);

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="5xl" scrollBehavior="inside" className="max-h-[90vh]">
      <ModalContent className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl bg-white">
        <ModalHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {target.type === "rol" ? (
                <Shield className="h-6 w-6 text-blue-600" />
              ) : (
                <Users className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Gestión de Permisos
              </h3>
              <p className="text-sm text-gray-600">
                {target.type === "rol" ? "Rol:" : "Usuario:"} {target.nombre}
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          {target.type === "usuario" && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800 font-medium">
                  Permisos adicionales para usuario
                </p>
              </div>
              <p className="text-xs text-amber-700 mt-1">
               Permisos adicionales solo para este usuario.
              </p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Buscar permisos o módulos..."
                startContent={<Search className="text-gray-400 h-4 w-4" />}
                className="bg-gray"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {target.type === "rol" && (
                <Select
                  placeholder="Todos los módulos"
                  startContent={<Filter className="text-gray-400 h-4 w-4" />}
                  className="bg-gray"
                  selectedKeys={new Set([selectedModule])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    setSelectedModule(selected as string);
                  }}
                >
                  {[
                    <SelectItem key="all">Todos los módulos</SelectItem>,
                    ...Array.from(new Set(permissions.map(p => p.modulo?.nombre || "Sin módulo").filter(name => name !== "Sin módulo"))).map((moduleName) => (
                      <SelectItem key={moduleName}>{moduleName}</SelectItem>
                    ))
                  ]}
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando permisos...</span>
              </div>
            ) : (
              <>
                {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => (
                  <div key={moduleName} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">{moduleName}</h4>
                      <Chip color="default" variant="flat" size="sm">
                        {modulePermissions.length} permisos
                      </Chip>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modulePermissions.map((perm) => (
                        <div
                          key={perm.permisoId}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                            perm.activo
                              ? "border-green-200 bg-green-50 shadow-sm"
                              : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{perm.nombre}</p>
                            <p className="text-sm text-gray-600 mt-1">{perm.descripcion}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              size="sm"
                              color="success"
                              isSelected={perm.activo}
                              onValueChange={(checked) => handleToggle(perm.permisoId, checked)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {Object.keys(groupedPermissions).length === 0 && (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron permisos.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ModalBody>

        <ModalFooter className="bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredPermissions.length}</span> de{" "}
              <span className="font-medium">{permissions.length}</span> permisos mostrados
            </div>
            <Button
              onClick={onClose}
              color="primary"
            >
              Cerrar
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
