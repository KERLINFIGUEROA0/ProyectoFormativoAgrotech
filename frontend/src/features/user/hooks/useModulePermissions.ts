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

    // Si pide Ver específicamente, validar directamente
    if (permission === 'Ver') {
      const fullPermissionName = `${moduleName}.Ver`;
      return modules[moduleName].permissions.includes(fullPermissionName);
    }

    // Para cualquier otro permiso, PRIMERO validar que tenga Ver
    const viewPermission = `${moduleName}.Ver`;
    const hasView = modules[moduleName].permissions.includes(viewPermission);

    if (permission && !hasView) {
      return false; // Sin Ver, no puede usar otros permisos
    }

    // Si solo pregunta por módulo (sin permiso específico), verificar si tiene Ver
    if (!permission) {
      return hasView;
    }

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

  const hasPermissionByAction = (action: string): boolean => {
    if (loading || !userModules) return false;

    // Buscar en todos los módulos si alguno tiene el permiso de la acción específica
    const modules = getModulePermissions();

    for (const [moduleName, moduleData] of Object.entries(modules)) {
      const fullPermissionName = `${moduleName}.${action}`;
      if (moduleData.permissions.includes(fullPermissionName)) {
        return true;
      }
    }

    return false;
  };

  const getModulesWithPermission = (action: string): string[] => {
    if (loading || !userModules) return [];

    const modules = getModulePermissions();
    const modulesWithPermission: string[] = [];

    for (const [moduleName, moduleData] of Object.entries(modules)) {
      const fullPermissionName = `${moduleName}.${action}`;
      if (moduleData.permissions.includes(fullPermissionName)) {
        modulesWithPermission.push(moduleName);
      }
    }

    return modulesWithPermission;
  };

  return {
    modulePermissions: getModulePermissions(),
    hasPermissionInModule,
    hasAnyPermissionInModule,
    hasPermissionByAction,
    getModulesWithPermission,
    getActiveModules,
    loading,
  };
};