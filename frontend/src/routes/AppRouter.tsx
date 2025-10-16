// src/routes/AppRouter.tsx

import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom"; 
import LoginPage from "../features/auth/pages/LoginPage";
import RecuperarPage from "../features/auth/pages/RecuperarPage";
import ResetPasswordSent from "../features/auth/pages/ResetPasswordSent";
import NuevaContraseñaPage from "../features/auth/pages/NuevaContraseña";
import Layout from "../components/Layout";
import HomePage from "../pages/home";
import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute";
import UsuarioPage from "../features/user/pages/Usuario";
import GestionRolesPage from "../features/user/pages/GestionRoles";
import GestionUsuariosPage from "../features/user/pages/GestionUsuario";
import GestionLotes from "../features/cultivos/pages/GestionLotes";
import GestionSurcos from "../features/cultivos/pages/GestionSurcos";
import DashboardFinanciero from "../features/finanzas/pages/DashboardFinanciero";
import GestionTransaccionesPage from "../features/finanzas/pages/GestionTransacciones";
import GestionCultivosPage from "../features/cultivos/pages/GestionCultivos";
import GestionSensoresPage from "../features/iot/pages/GestionSensores";
import DashboardProduccion from "../features/cultivos/pages/DashboardProduccion";
import TrazabilidadCultivoPage from "../features/cultivos/pages/TrazabilidadCultivoPage";
import ActividadesPrincipal from "../features/actividades/pages/PrincipalAcvidades";
import GestionActiviadesPage from "../features/actividades/pages/GestionActividadesPage";
import GestionInventarioPage from "../features/inventario/pages/GestionInventarioPage";

// --- ✅ 1. AÑADE LA IMPORTACIÓN QUE FALTA ---
import DetalleMaterialPage from "../features/inventario/pages/DetalleMaterialPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas (sin cambios) */}
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

        {/* Rutas privadas */}
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
          <Route path="/cultivos/:cultivoId/produccion" element={<DashboardProduccion />} /> 
          <Route path="/ingresos" element={<DashboardFinanciero />} />
          <Route path="/egresos" element={<GestionTransaccionesPage />} />
          <Route path="/gestion-actividades" element={<ActividadesPrincipal />} />
          <Route path="/cultivos/:cultivoId/trazabilidad" element={<TrazabilidadCultivoPage />} />
          <Route path="/cronograma" element={<GestionActiviadesPage />} />
          
          <Route path="/stock" element={<GestionInventarioPage />} />
          
          {/* --- ✅ 2. AÑADE LA RUTA PARA EL DETALLE DEL MATERIAL --- */}
          <Route path="/stock/:materialId" element={<DetalleMaterialPage />} />

          <Route path="/movimientos" element={
              <div className="text-center p-8">
                <h1 className="text-2xl font-bold">Movimientos de Inventario</h1>
                <p>Esta sección está en construcción.</p>
              </div>
            } 
          />
        </Route>

        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </BrowserRouter>
  );
}