import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useModulePermissions } from '../features/user/hooks/useModulePermissions';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface UsePermissionGuardOptions {
  module?: string;
  permission?: string;
  redirectTo?: string;
  checkInterval?: number; // en milisegundos
}

export const usePermissionGuard = ({
  module,
  permission,
  redirectTo = '/home',
  checkInterval = 30000 // 30 segundos por defecto
}: UsePermissionGuardOptions = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermissionInModule, hasAnyPermissionInModule, loading } = useModulePermissions();
  const { userModules } = useAuth();

  const lastPermissionCheck = useRef<string>('');

  // Función para verificar permisos actuales
  const checkCurrentPermissions = () => {
    if (loading || !userModules) return true;

    let hasAccess = true;

    if (module) {
      if (permission) {
        hasAccess = hasPermissionInModule(module, permission);
      } else {
        hasAccess = hasAnyPermissionInModule(module);
      }
    }

    return hasAccess;
  };

  // Crear hash de permisos actuales para comparación
  const getPermissionsHash = () => {
    if (!userModules) return '';
    return JSON.stringify(userModules);
  };

  // Efecto para escuchar cambios de permisos en tiempo real
  useEffect(() => {
    if (!module) return;

    const handlePermissionsChanged = (event: CustomEvent) => {
      console.log('🔄 Permissions changed event received:', event.detail);
      const hasAccess = checkCurrentPermissions();

      if (!hasAccess) {
        toast.error(`Tus permisos han cambiado. Ya no tienes acceso a ${module}.`, {
          duration: 5000,
        });
        navigate(redirectTo, {
          replace: true,
          state: {
            from: location,
            reason: `Permisos revocados para ${module}`
          }
        });
      }
    };

    window.addEventListener('permissionsChanged', handlePermissionsChanged as EventListener);

    return () => {
      window.removeEventListener('permissionsChanged', handlePermissionsChanged as EventListener);
    };
  }, [module, permission, navigate, redirectTo, location, userModules]);

  // Efecto para verificar cambios periódicos (como respaldo)
  useEffect(() => {
    if (!module) return;

    const interval = setInterval(() => {
      const currentHash = getPermissionsHash();
      const hasAccess = checkCurrentPermissions();

      // Si los permisos cambiaron y ya no tiene acceso
      if (lastPermissionCheck.current && currentHash !== lastPermissionCheck.current && !hasAccess) {
        toast.error(`Tus permisos han cambiado. Ya no tienes acceso a ${module}.`, {
          duration: 5000,
        });
        navigate(redirectTo, {
          replace: true,
          state: {
            from: location,
            reason: `Permisos revocados para ${module}`
          }
        });
      }

      lastPermissionCheck.current = currentHash;
    }, checkInterval);

    return () => clearInterval(interval);
  }, [module, permission, navigate, redirectTo, location, loading, userModules]);

  // Verificación inicial
  useEffect(() => {
    lastPermissionCheck.current = getPermissionsHash();
  }, [userModules]);

  return {
    hasAccess: checkCurrentPermissions(),
    isChecking: loading
  };
};