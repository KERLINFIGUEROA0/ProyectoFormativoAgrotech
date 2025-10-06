import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { obtenerPerfil } from "../features/auth/api/auth";
import type { UsuarioData } from "../types/auth";

interface AuthContextType {
  token: string | null;
  loading: boolean;
  isLoggingOut: boolean;
  userPermissions: string[] | null;
  userData: UsuarioData | null;
  login: (token: string) => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);
  const [userData, setUserData] = useState<UsuarioData | null>(null);

  const fetchAndSetData = useCallback(async () => {
    if (!token) {
      setUserPermissions(null);
      setUserData(null);
      return;
    }
    try {
      const userProfile = await obtenerPerfil();
      if (userProfile && userProfile.id) {

        const usuario: UsuarioData = {
          tipo: userProfile.tipoIdentificacion || "CC",
          identificacion: userProfile.identificacion,
          nombres: userProfile.nombres || "",
          apellidos: userProfile.apellidos || "",
          email: userProfile.correo || "",
          telefono: userProfile.telefono || "",
          fotoUrl: userProfile.fotoUrl || "",
        };
        setUserData(usuario);
        

        setUserPermissions(userProfile.permisos || []);
        localStorage.setItem('permissions', JSON.stringify(userProfile.permisos || []));
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
      const savedPerms = localStorage.getItem('permissions');
      setUserPermissions(savedPerms ? JSON.parse(savedPerms) : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAndSetData();
  }, [token, fetchAndSetData]);
  
  useEffect(() => {
    let socket: Socket | null = null;

    if (token) {
      socket = io(BACKEND_URL, {
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      socket.on('connect', () => {
        console.log('🔌 Conectado al servidor de WebSockets.');
      });

      socket.on('permissions_updated', (data: { permisos: string[], access_token: string }) => {
        console.log('✨ Permisos y nuevo token recibidos:', data);
        
        if (data.access_token && data.permisos) {
          setUserPermissions(data.permisos);
          localStorage.setItem('permissions', JSON.stringify(data.permisos));
          
          setToken(data.access_token);
          localStorage.setItem('token', data.access_token);
          
          toast.info('Tus permisos han sido actualizados. La sesión se refrescará.');

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Desconectado del servidor de WebSockets.');
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsLoggingOut(false);
  };

  const logout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");
    setToken(null);
    setUserPermissions(null);
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