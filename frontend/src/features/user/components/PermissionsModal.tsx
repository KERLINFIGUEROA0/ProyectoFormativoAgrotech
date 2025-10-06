// src/features/user/components/PermissionsModal.tsx

import { useState, useEffect } from "react";
import { Switch } from "@heroui/react";
import { toast } from "sonner";
import { api } from "../../../lib/axios";
import type { PermisoRol, PermisoUsuario } from "../interfaces/usuarios";

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

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const endpoint =
        target.type === "rol"
          ? `/rol-permisos/rol/${target.id}`
          : `/usuario-permisos/usuario/${target.id}`;
      api
        .get(endpoint)
        .then((res) => setPermissions(res.data.data))
        .catch(() => toast.error("Error al cargar los permisos"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, target]);

  const handleToggle = (permisoId: number, estado: boolean) => {
    const endpoint =
      target.type === "rol" ? "/rol-permisos/toggle" : "/usuario-permisos/toggle";
    const payload =
      target.type === "rol"
        ? { rolId: target.id, permisoId, estado }
        : { usuarioId: target.id, permisoId, estado };

    api
      .post(endpoint, payload)
      .then(() => {
        setPermissions((prev) =>
          prev.map((p) =>
            p.permisoId === permisoId ? { ...p, activo: estado } : p
          )
        );
        toast.success(estado ? "Permiso activado" : "Permiso desactivado");
      })
      .catch(() => toast.error("Error al actualizar el permiso"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white border border-gray-200 h-9 w-9 rounded-full flex items-center justify-center shadow-sm"
        >
          <span className="text-gray-600">✕</span>
        </button>
        <h3 className="text-xl font-semibold mb-1">
          Gestión de Permisos - {target.type === "rol" ? "ROL" : "USUARIO"}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {target.type === "rol"
            ? `Configura los permisos para el rol: ${target.nombre}`
            : `Configura permisos ADICIONALES para el usuario: ${target.nombre} (permisos no heredados del rol)`
          }
        </p>
        {target.type === "usuario" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>{target.nombre} - permisos adicionales para usuario</strong>
            </p>
          </div>
        )}

        {loading ? (
          <p>Cargando permisos...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {permissions.map((perm) => (
              <div
                key={perm.permisoId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-semibold">{perm.nombre}</p>
                  <p className="text-xs text-gray-500">{perm.descripcion}</p>
                </div>
                <Switch
                  isSelected={perm.activo}
                  onValueChange={(isSelected) => handleToggle(perm.permisoId, isSelected)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}