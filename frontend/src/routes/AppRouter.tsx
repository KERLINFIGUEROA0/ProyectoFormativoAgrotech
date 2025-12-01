// src/routes/AppRouter.tsx

import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom"; 
import LoginPage from "../features/auth/pages/LoginPage";
import RecuperarPage from "../features/auth/pages/RecuperarPage";
import ResetPasswordSent from "../features/auth/pages/ResetPasswordSent";
import NuevaContraseñaPage from "../features/auth/pages/NuevaContraseña";
import Layout from "../components/Layout";
import HomePage from "../pages/home";
import PrivateRoute from "./PrivateRoute";
import PermissionRoute from "./PermissionRoute";
import PublicRoute from "./PublicRoute";
import UsuarioPage from "../features/user/pages/Usuario";
import GestionRolesPage from "../features/user/pages/GestionRoles";
import GestionUsuariosPage from "../features/user/pages/GestionUsuario";
import GestionLotes from "../features/cultivos/pages/GestionLotes";
import GestionProduccion from "../features/cultivos/pages/GestionProduccion";
import DashboardFinanciero from "../features/finanzas/pages/DashboardFinanciero";
import GestionTransaccionesPage from "../features/finanzas/pages/GestionTransacciones";
import GestionCultivosPage from "../features/cultivos/pages/GestionCultivos";
import GestionSensoresPage from "../features/iot/pages/GestionSensores";
import GestionBrokersPage from "../features/iot/pages/GestionBrokersPage";
import ReportesSensoresPage from "../features/iot/pages/ReportesSensoresPage";
import DashboardProduccion from "../features/cultivos/pages/DashboardProduccion";
import TrazabilidadCultivoPage from "../features/cultivos/pages/TrazabilidadCultivoPage";
import ActividadesPrincipal from "../features/actividades/pages/PrincipalAcvidades";
import GestionActiviadesPage from "../features/actividades/pages/GestionActividadesPage";
import PagosPasantePage from "../features/actividades/pages/PagosPasantePage";
import GestionFitosanitarioPage from "../features/fitosanitario/pages/GestionFitosanitarioPage";
import GestionInventarioPage from "../features/inventario/pages/GestionInventarioPage";
import DetalleMaterialPage from "../features/inventario/pages/DetalleMaterialPage";
import GestionMovimientosPage from "../features/inventario/pages/GestionMovimientosPage";
import GestionFichasPage from "../features/fichas/pages/GestionFichas";

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
          <Route path="/gestion-Sublotes" element={<GestionProduccion />} />
          <Route path="/gestion-brokers" element={<GestionBrokersPage />} />
          <Route path="/gestion-sensores" element={<GestionSensoresPage />} />
          <Route path="/reportes-sensores" element={<ReportesSensoresPage />} />
          <Route path="/gestion-cultivos" element={<GestionCultivosPage />} />
          <Route path="/cultivos/:cultivoId/produccion" element={<DashboardProduccion />} /> 
          <Route path="/ingresos" element={<DashboardFinanciero />} />
          <Route path="/egresos" element={<GestionTransaccionesPage />} />
          <Route path="/gestion-actividades" element={<ActividadesPrincipal />} />
          <Route path="/cultivos/:cultivoId/trazabilidad" element={<TrazabilidadCultivoPage />} />
          <Route path="/cronograma" element={<GestionActiviadesPage />} />
          <Route path="/fitosanitario" element={<GestionFitosanitarioPage />} />
          <Route path="/stock" element={<GestionInventarioPage />} />
          <Route path="/stock/:materialId" element={<DetalleMaterialPage />} />
           <Route path="/gestion-fichas" element={<GestionFichasPage />} />
          <Route path="/movimientos" element={
            <PermissionRoute module="Inventario">
              <GestionMovimientosPage />
            </PermissionRoute>
          } />

          {/* Finanzas - Requiere permisos de Finanzas */}
          <Route path="/ingresos" element={
            <PermissionRoute module="Finanzas">
              <DashboardFinanciero />
            </PermissionRoute>
          } />
          <Route path="/egresos" element={
            <PermissionRoute module="Finanzas">
              <GestionTransaccionesPage />
            </PermissionRoute>
          } />

          {/* Fitosanitario - Requiere permisos de Fitosanitario */}
          <Route path="/fitosanitario" element={
            <PermissionRoute module="Fitosanitario">
              <GestionFitosanitarioPage />
            </PermissionRoute>
          } />

          {/* Actividades - Requiere permisos de Actividades */}
          <Route path="/gestion-actividades" element={
            <PermissionRoute module="Actividades">
              <ActividadesPrincipal />
            </PermissionRoute>
          } />
          <Route path="/cronograma" element={
            <PermissionRoute module="Actividades">
              <GestionActiviadesPage />
            </PermissionRoute>
          } />
          <Route path="/pagos-pasante" element={
            <PermissionRoute module="Actividades">
              <PagosPasantePage />
            </PermissionRoute>
          } />
        </Route>

        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </BrowserRouter>
  );
}