// components/PermissionWrapper.tsx

import type { ReactNode } from "react";
import { useModulePermissions } from "../features/user/hooks/useModulePermissions";

interface PermissionWrapperProps {
  module?: string;
  permission?: string;
  requireAll?: boolean; // Si true, requiere TODOS los permisos; si false, al menos uno
  permissions?: string[]; // Array de permisos alternativos
  fallback?: ReactNode; // Qué mostrar si no tiene permisos
  children: ReactNode;
}

export default function PermissionWrapper({
  module,
  permission,
  requireAll = false,
  permissions = [],
  fallback = null,
  children,
}: PermissionWrapperProps) {
  const { hasPermissionInModule, hasAnyPermissionInModule, loading } = useModulePermissions();

  // Si está cargando, no mostrar nada o mostrar loading
  if (loading) {
    return null;
  }

  // Si especifica módulo y permiso
  if (module && permission) {
    if (!hasPermissionInModule(module, permission)) {
      return <>{fallback}</>;
    }
  }

  // Si especifica solo módulo (cualquier permiso en el módulo)
  else if (module && !permission) {
    if (!hasAnyPermissionInModule(module)) {
      return <>{fallback}</>;
    }
  }

  // Si especifica array de permisos
  else if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? permissions.every(p => {
          // Asumir que permisos están en formato "modulo.permiso" o solo "permiso"
          const [mod, perm] = p.includes('.') ? p.split('.') : [undefined, p];
          return mod ? hasPermissionInModule(mod, perm) : false; // Si no tiene módulo, no verificar
        })
      : permissions.some(p => {
          const [mod, perm] = p.includes('.') ? p.split('.') : [undefined, p];
          return mod ? hasPermissionInModule(mod, perm) : false;
        });

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  // Si no especifica nada, mostrar siempre
  return <>{children}</>;
}

// Componente específico para módulos
export function ModuleWrapper({
  module,
  fallback = null,
  children
}: {
  module: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PermissionWrapper module={module} fallback={fallback}>
      {children}
    </PermissionWrapper>
  );
}

// Componente específico para permisos individuales
export function PermissionGate({
  permission,
  module,
  fallback = null,
  children
}: {
  permission: string;
  module?: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PermissionWrapper
      module={module}
      permission={permission}
      fallback={fallback}
    >
      {children}
    </PermissionWrapper>
  );
}