import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { toast } from 'sonner';
import { jwtDecode } from 'jwt-decode';
import { obtenerPerfil } from "../features/auth/api/auth";
import type { UsuarioData } from "../types/auth";
import websocketService from '../services/websocket.service';

interface AuthContextType {
  token: string | null;
  loading: boolean;
  isLoggingOut: boolean;
  userPermissions: string[] | null;
  userModules: Record<string, string[]> | null;
  userData: UsuarioData | null;
  login: (token: string) => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);
  const [userModules, setUserModules] = useState<Record<string, string[]> | null>(null);
  const [userData, setUserData] = useState<UsuarioData | null>(null);

  const fetchAndSetData = useCallback(async () => {
    if (!token) {
      setUserPermissions(null);
      setUserData(null);
      return;
    }
    try {
      const userProfile = await obtenerPerfil();

      if (userProfile && userProfile.identificacion) {
        const usuario: UsuarioData = {
          tipo: userProfile.tipoIdentificacion || "CC",
          identificacion: userProfile.identificacion,
          nombres: userProfile.nombres || "",
          apellidos: userProfile.apellidos || "",
          email: userProfile.correo || "",
          telefono: userProfile.telefono || "",
          fotoUrl: userProfile.fotoUrl || "",
          rolNombre: userProfile.rolNombre || "",
        };
        setUserData(usuario);

        setUserPermissions(userProfile.permisos || []);
        setUserModules(userProfile.modulos || {});
        localStorage.setItem('permissions', JSON.stringify(userProfile.permisos || []));
        localStorage.setItem('modules', JSON.stringify(userProfile.modulos || {}));
      } else {
        console.warn("⚠️ User profile missing identificacion:", userProfile);
      }
    } catch (error) {
      console.error("Error fetching user data or permissions:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("permissions");
      setToken(null);
      setUserPermissions(null);
      setUserData(null);
    }
  }, [token]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);

      // Decodificar el token para obtener el nombre del usuario
      try {
        const decoded: any = jwtDecode(savedToken);
        if (decoded.nombre) {
          setUserData(prev => prev ? { ...prev, nombres: decoded.nombre } : {
            tipo: "CC",
            identificacion: decoded.identificacion || "",
            nombres: decoded.nombre,
            apellidos: "",
            email: decoded.username || "",
            telefono: "",
            fotoUrl: "",
            rolNombre: decoded.rolNombre || "",
          });
        }
      } catch (error) {
        console.error("Error decodificando token guardado:", error);
      }

      const savedPerms = localStorage.getItem('permissions');
      const savedModules = localStorage.getItem('modules');
      setUserPermissions(savedPerms ? JSON.parse(savedPerms) : []);
      setUserModules(savedModules ? JSON.parse(savedModules) : {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAndSetData();
  }, [token, fetchAndSetData]);
  
  useEffect(() => {
    // Solo conectar WebSocket si hay token válido
    if (token) {
      websocketService.connect(token);
    } else {
      websocketService.disconnect();
    }

    // Escuchar actualizaciones de permisos
    const unsubscribePermissions = websocketService.on('permissions_updated', (data: { permisos: string[], modulos: Record<string, string[]>, access_token: string }) => {
      console.log('✨ Permisos y nuevo token recibidos:', data);

      if (data.access_token && data.permisos && data.modulos) {
        setUserPermissions(data.permisos);
        setUserModules(data.modulos);
        localStorage.setItem('permissions', JSON.stringify(data.permisos));
        localStorage.setItem('modules', JSON.stringify(data.modulos));

        setToken(data.access_token);
        localStorage.setItem('token', data.access_token);

        // Emitir evento personalizado para que otros componentes sepan que los permisos cambiaron
        window.dispatchEvent(new CustomEvent('permissionsChanged', {
          detail: { permisos: data.permisos, modulos: data.modulos }
        }));

        toast.info('Tus permisos han sido actualizados.');
      }
    });

    return () => {
      // Limpiar listeners al desmontar
      unsubscribePermissions();
    };
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsLoggingOut(false);

    // Decodificar el token para obtener el nombre del usuario
    try {
      const decoded: any = jwtDecode(newToken);
      if (decoded.nombre) {
        // Actualizar userData con el nombre del token
        setUserData(prev => prev ? { ...prev, nombres: decoded.nombre } : {
          tipo: "CC",
          identificacion: decoded.identificacion || "",
          nombres: decoded.nombre,
          apellidos: "",
          email: decoded.username || "",
          telefono: "",
          fotoUrl: "",
          rolNombre: decoded.rolNombre || "",
        });
      }
    } catch (error) {
      console.error("Error decodificando token:", error);
    }
  };

  const logout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");
    localStorage.removeItem("modules");
    setToken(null);
    setUserPermissions(null);
    setUserModules(null);
    setUserData(null);
  };

  const refreshPermissions = async () => {
    await fetchAndSetData();
  };

  const refreshUserData = async () => {
    await fetchAndSetData();
  };

  return (
    <AuthContext.Provider value={{
      token,
      loading,
      isLoggingOut,
      userPermissions,
      userModules,
      userData,
      login,
      logout,
      refreshPermissions,
      refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
