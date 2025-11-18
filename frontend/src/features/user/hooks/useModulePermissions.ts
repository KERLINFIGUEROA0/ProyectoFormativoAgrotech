// features/user/hooks/useModulePermissions.ts

import { useAuth } from "../../../context/AuthContext";

export interface ModulePermissions {
  [moduleName: string]: {
    permissions: string[];
    hasAnyPermission: boolean;
  };
}

export const useModulePermissions = () => {
  const { userModules, loading } = useAuth();

  const getModulePermissions = (): ModulePermissions => {
    if (loading || !userModules) {
      return {};
    }

    const modules: ModulePermissions = {};

    // Usar los módulos ya agrupados desde el backend
    Object.entries(userModules).forEach(([moduleName, permissions]) => {
      modules[moduleName] = {
        permissions: permissions || [],
        hasAnyPermission: (permissions || []).length > 0,
      };
    });

    return modules;
  };

  const hasPermissionInModule = (moduleName: string, permission?: string): boolean => {
    if (loading || !userModules) return false;

    const modules = getModulePermissions();

    if (!modules[moduleName]?.hasAnyPermission) return false;

    if (!permission) return true; // Si solo pregunta por módulo, verificar si tiene algún permiso

    const fullPermissionName = `${moduleName}.${permission}`;
    return modules[moduleName].permissions.includes(fullPermissionName);
  };

  const getActiveModules = (): string[] => {
    const modules = getModulePermissions();
    return Object.keys(modules).filter(moduleName => modules[moduleName].hasAnyPermission);
  };

  const hasAnyPermissionInModule = (moduleName: string): boolean => {
    return hasPermissionInModule(moduleName);
  };

  return {
    modulePermissions: getModulePermissions(),
    hasPermissionInModule,
    hasAnyPermissionInModule,
    getActiveModules,
    loading,
  };
};