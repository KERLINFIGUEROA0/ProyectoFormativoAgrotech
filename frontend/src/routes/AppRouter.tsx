// src/routes/AppRouter.tsx

import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom"; 
import LoginPage from "../features/auth/pages/LoginPage";
import RecuperarPage from "../features/auth/pages/RecuperarPage";
import ResetPasswordSent from "../features/auth/pages/ResetPasswordSent";
import NuevaContraseñaPage from "../features/auth/pages/NuevaContraseña";
import Layout from "../components/Layout";
import HomePage from "../pages/home";
import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute"; // 👈 1. Importa el nuevo componente
import UsuarioPage from "../features/user/pages/Usuario";
import GestionRolesPage from "../features/user/pages/GestionRoles";
import GestionUsuariosPage from "../features/user/pages/GestionUsuario";
import GestionLotes from "../features/cultivos/pages/GestionLotes";
import GestionSurcos from "../features/cultivos/pages/GestionSurcos";
import DashboardFinanciero from "../features/finanzas/pages/DashboardFinanciero";
import GestionTransaccionesPage from "../features/finanzas/pages/GestionTransacciones";
import GestionCultivosPage from "../features/cultivos/pages/GestionCultivos";
import GestionSensoresPage from "../features/iot/pages/GestionSensores";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 👇 2. Envuelve tus rutas públicas con el nuevo componente */}
        <Route element={
            <PublicRoute>
              <Outlet />
            </PublicRoute>
          }
        >
          <Route path="/" element={<LoginPage />} />
          <Route path="/recuperar" element={<RecuperarPage />} />
          <Route path="/send" element={<ResetPasswordSent />} />
          <Route path="/restablecer" element={<NuevaContraseñaPage />} />
        </Route>


        {/* Rutas privadas (esto se mantiene igual) */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/usuario" element={<UsuarioPage />} />
          <Route path="/gestion-roles" element={<GestionRolesPage />} />
          <Route path="/gestion-usuarios" element={<GestionUsuariosPage />} />
          <Route path="/gestion-lotes" element={<GestionLotes />} />
          <Route path="/gestion-surcos" element={<GestionSurcos />} />
          <Route path="/gestion-sensores" element={<GestionSensoresPage />} />
          <Route path="/gestion-cultivos" element={<GestionCultivosPage />} />
          <Route path="/ingresos" element={<DashboardFinanciero />} />
          <Route path="/egresos" element={<GestionTransaccionesPage />} />
          
          {/* --- NUEVAS RUTAS DE ACTIVIDADES --- */}
          <Route path="/cronograma" element={
              <div className="text-center p-8">
                <h1 className="text-2xl font-bold">Cronograma de Actividades</h1>
                <p>Esta sección está en construcción.</p>
              </div>
            } 
          />
          <Route path="/tareas" element={
              <div className="text-center p-8">
                <h1 className="text-2xl font-bold">Gestión de Tareas</h1>
                <p>Esta sección está en construcción.</p>
              </div>
            }
          />
          {/* ------------------------------------- */}

        </Route>

        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

// Nota: Es posible que necesites importar `Outlet` de `react-router-dom`
// import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";