// src/routes/PublicRoute.tsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";
import { Spinner } from "@heroui/react";

export default function PublicRoute({ children }: { children: JSX.Element }): JSX.Element {
  const { token, loading } = useAuth();

  // Mientras se verifica el token, mostramos un indicador de carga para evitar parpadeos
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Spinner size="lg" />
      </div>
    );
  }

  // Si el usuario YA tiene un token, lo redirigimos a la página de inicio
  if (token) {
    return <Navigate to="/home" replace />;
  }

  // Si no hay token, el usuario no ha iniciado sesión, así que mostramos la ruta pública
  return children;
}