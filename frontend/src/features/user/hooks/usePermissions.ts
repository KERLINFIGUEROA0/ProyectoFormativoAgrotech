// features/user/hooks/usePermissions.ts

import { useAuth } from "../../../context/AuthContext";

export const usePermissions = () => {
  const { userPermissions, loading } = useAuth();

  const hasPermission = (permissionName: string): boolean => {
    if (loading || !userPermissions) {
      return false; 
    }
    
    // Tu AuthContext ahora provee un array de strings, 
    // por lo tanto, usamos .includes() para verificar si el permiso existe.
    return userPermissions.includes(permissionName);
  };

  return { hasPermission, userPermissions, loading };
};