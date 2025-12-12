import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";
import { Spinner } from "@heroui/react";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}


