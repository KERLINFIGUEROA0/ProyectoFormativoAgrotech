import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Spinner } from "@heroui/react";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const { token, loading, isLoggingOut } = useAuth();

  useEffect(() => {
    if (!loading && !token && !isLoggingOut) {
      toast.error("Debes iniciar sesión primero");
    }
  }, [token, loading, isLoggingOut]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return token ? children : <Navigate to="/" replace />;
}


