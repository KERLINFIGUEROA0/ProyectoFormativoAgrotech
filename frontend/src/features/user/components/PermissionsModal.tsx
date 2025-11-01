
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, X, Shield, Users, Settings, Filter } from "lucide-react";
import type { PermisoRol, PermisoUsuario } from "../interfaces/usuarios";
import {
  getPermissionsByRoleDetallado,
  getPermissionsForUser,
  toggleRolePermission,
  toggleUserPermission,
} from "../api/permissions";

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
        .catch(() => toast.error("Error al cargar los datos"))
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in-0 duration-300">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {target.type === "usuario" && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mx-6 mt-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800 font-medium">
                Permisos adicionales para usuario
              </p>
            </div>
            <p className="text-xs text-amber-700 mt-1">
             Permisos adicionales solo para este usuario .
            </p>
          </div>
        )}

        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar permisos o módulos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {target.type === "rol" && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[200px]"
                >
                  <option value="all">Todos los módulos</option>
                  {Array.from(new Set(permissions.map(p => p.modulo?.nombre || "Sin módulo").filter(name => name !== "Sin módulo"))).map((moduleName) => (
                    <option key={moduleName} value={moduleName}>
                      {moduleName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando permisos...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => (
                <div key={moduleName} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">{moduleName}</h4>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {modulePermissions.length} permisos
                    </span>
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
                          <div
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                              perm.activo ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            onClick={() => handleToggle(perm.permisoId, !perm.activo)}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                perm.activo ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </div>
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
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredPermissions.length}</span> de{" "}
              <span className="font-medium">{permissions.length}</span> permisos mostrados
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
