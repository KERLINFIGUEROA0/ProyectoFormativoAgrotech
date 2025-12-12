import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { api } from "../lib/axios";
import type { UsuarioData } from "../types/auth";
import websocketService from "../services/websocket.service";

interface AuthContextType {
  loading: boolean;
  isLoggingOut: boolean;
  isAuthenticated: boolean;
  userPermissions: string[] | null;
  userModules: Record<string, string[]> | null;
  userData: UsuarioData | null;
  login: (identificacion: string, password: string, id_ficha?: string) => Promise<void>;
  logout: (reason?: 'manual' | 'expired') => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);
  const [userModules, setUserModules] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [userData, setUserData] = useState<UsuarioData | null>(null);

  // Función para verificar autenticación usando la cookie
  const checkAuth = useCallback(async () => {
    try {
      // Llamar al endpoint protegido que usa la cookie
      const { data } = await api.get("/auth/profile");

      // data contiene: { id, identificacion, rolId, rolNombre, permisos, modulos }
      if (data) {
        setUserPermissions(data.permisos || []);
        setUserModules(data.modulos || {});
        setIsAuthenticated(true);

        // Obtener datos completos del perfil
        try {
          const profileRes = await api.get("/usuarios/perfil");
          const userProfile = profileRes.data.data;

          if (userProfile && userProfile.identificacion) {
            const usuario: UsuarioData = {
              tipo: userProfile.tipoIdentificacion || "CC",
              identificacion: userProfile.identificacion,
              nombres: userProfile.nombres || "",
              apellidos: userProfile.apellidos || "",
              email: userProfile.correo || "",
              telefono: userProfile.telefono || "",
              fotoUrl: userProfile.fotoUrl || "",
              rolNombre: userProfile.rolNombre || data.rolNombre || "",
            };
            setUserData(usuario);
          }
        } catch (profileError) {
          // Crear userData básico desde el token
          setUserData({
            tipo: "CC",
            identificacion: data.identificacion || "",
            nombres: "",
            apellidos: "",
            email: "",
            telefono: "",
            fotoUrl: "",
            rolNombre: data.rolNombre || "",
          });
        }
      }
    } catch (error) {
      // No hay sesión válida
      setIsAuthenticated(false);
      setUserPermissions(null);
      setUserModules(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar sesión al montar el componente
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Conectar WebSocket cuando hay autenticación
  useEffect(() => {
    if (isAuthenticated) {
      // Conectar WebSocket usando cookies automáticamente
      websocketService.connect();
    } else {
      websocketService.disconnect();
    }

    // Escuchar actualizaciones de permisos
    const unsubscribePermissions = websocketService.on(
      "permissions_updated",
      async (data: unknown) => {
        const payload = data as {
          permisos: string[];
          modulos: Record<string, string[]>;
          access_token?: string;
        };

        if (payload?.permisos && payload?.modulos) {
          // 1. Actualizar estado de React (UI inmediata)
          setUserPermissions(payload.permisos);
          setUserModules(payload.modulos);

          // 2. Actualizar cookie JWT inmediatamente con el token del WebSocket
          let cookieUpdated = false;
          if (payload.access_token) {
            try {
              document.cookie = `Authentication=${payload.access_token}; path=/; max-age=${8 * 60 * 60}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''
                }`;
              cookieUpdated = true;
            } catch (error) {
            }
          }

          // 3. Llamar a /auth/refresh como respaldo si es necesario
          if (!cookieUpdated) {
            try {
              await api.post('/auth/refresh');
            } catch (error) {
              toast.error("Error actualizando permisos. Por favor, recarga la página.");
              return;
            }
          }

          // 4. Emitir evento personalizado
          window.dispatchEvent(
            new CustomEvent("permissionsChanged", {
              detail: { permisos: payload.permisos, modulos: payload.modulos },
            })
          );

          // 5. Notificar al usuario
          toast.info("Tus permisos han sido actualizados.");
        }
      }
    );

    // Escuchar evento de token expirado
    const handleTokenExpired = () => {
      logout('expired');
    };

    window.addEventListener("tokenExpired", handleTokenExpired);

    return () => {
      unsubscribePermissions();
      window.removeEventListener("tokenExpired", handleTokenExpired);
    };
  }, [isAuthenticated]); // ✅ CRITICAL: Solo ejecutar cuando cambia isAuthenticated

  const login = async (identificacion: string, password: string, id_ficha?: string) => {
    try {
      // Llamar al endpoint de login - el backend establecerá la cookie
      const { data } = await api.post("/auth/login", {
        identificacion,
        password,
        id_ficha,
      });

      // data contiene { message, user, permisos, modulos } pero NO el token
      if (data.user && data.user.estado === false) {
        throw new Error("Usuario inactivo. Por favor, contacte al administrador.");
      }

      // Guardar datos en memoria (React state)
      setUserPermissions(data.permisos || []);
      setUserModules(data.modulos || {});
      setIsAuthenticated(true);
      setIsLoggingOut(false);

      // Obtener perfil completo
      await checkAuth();

      toast.success(data.message || "Ha iniciado sesión correctamente");
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async (reason: 'manual' | 'expired' = 'manual') => {
    try {
      setIsLoggingOut(true);

      // Llamar al endpoint de logout para borrar la cookie
      await api.post("/auth/logout");

      // Limpiar estado (memoria)
      setIsAuthenticated(false);
      setUserPermissions(null);
      setUserModules(null);
      setUserData(null);

      websocketService.disconnect();

      // Mostrar notificación basada en la razón del logout
      if (reason === 'expired') {
        toast.error("Debe iniciar sesión nuevamente");
      } else {
        toast.success("Has cerrado sesión");
      }
    } catch (error) {
    } finally {
      setIsLoggingOut(false);
    }
  };

  const refreshPermissions = async () => {
    await checkAuth();
  };

  const refreshUserData = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        isLoggingOut,
        isAuthenticated,
        userPermissions,
        userModules,
        userData,
        login,
        logout,
        refreshPermissions,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
