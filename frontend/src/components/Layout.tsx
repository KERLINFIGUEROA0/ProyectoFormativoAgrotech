// src/components/Layout.tsx

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner"; 

export default function Layout() {
  const [activeSection, setActiveSection] = useState("home");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // 1. Importamos y usamos el hook de ubicación

  useEffect(() => {
    const currentPath = location.pathname.substring(1); 
    setActiveSection(currentPath || "home");
  }, [location]); // Se ejecuta cada vez que la URL cambia

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Has cerrado sesión");
  };

  return (
    <div className="flex h-screen w-full bg-gray-50"> 
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogout}
      />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Pasamos handleLogout en el contexto para que la página de perfil pueda usarlo */}
        <Outlet context={{ handleLogout }} />
      </main>
    </div>
  );
}