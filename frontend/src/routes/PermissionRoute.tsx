import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useModulePermissions } from "../features/user/hooks/useModulePermissions";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@heroui/react";

interface PermissionRouteProps {
  children: JSX.Element;
  module?: string;
  permission?: string;
  requireAll?: boolean;
}

export default function PermissionRoute({
  children,
  module,
  permission,
  requireAll = false
}: PermissionRouteProps) {
  const { token, loading: authLoading } = useAuth();
  const { hasPermissionInModule, hasAnyPermissionInModule, loading: permLoading } = useModulePermissions();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [redirectReason, setRedirectReason] = useState<string>("");

  // Verificar permisos
  useEffect(() => {
    if (authLoading || permLoading) return;

    let access = true;
    let reason = "";

    // Si requiere módulo específico
    if (module) {
      if (permission) {
        // Verificar permiso específico en módulo
        access = hasPermissionInModule(module, permission);
        reason = `No tienes permisos para acceder a ${module}`;
      } else {
        // Verificar cualquier permiso en módulo
        access = hasAnyPermissionInModule(module);
        reason = `No tienes acceso al módulo ${module}`;
      }
    }

    setHasAccess(access);
    setRedirectReason(reason);

    // Si pierde acceso mientras está en la página, mostrar mensaje y redirigir
    if (!access && hasAccess === true) {
      toast.error(reason + ". Has sido redirigido al inicio.", {
        duration: 5000,
      });
    }
  }, [module, permission, hasPermissionInModule, hasAnyPermissionInModule, authLoading, permLoading, location.pathname, hasAccess]);

  // Loading state
  if (authLoading || permLoading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // No autenticado
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Sin permisos
  if (!hasAccess) {
    return <Navigate to="/home" replace state={{ from: location, reason: redirectReason }} />;
  }

  // Acceso permitido
  return children;
}