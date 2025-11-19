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
import GestionSurcos from "../features/cultivos/pages/GestionSurcos";
import DashboardFinanciero from "../features/finanzas/pages/DashboardFinanciero";
import GestionTransaccionesPage from "../features/finanzas/pages/GestionTransacciones";
import GestionCultivosPage from "../features/cultivos/pages/GestionCultivos";
import GestionSensoresPage from "../features/iot/pages/GestionSensores";
import GestionBrokersPage from "../features/iot/pages/GestionBrokersPage";
import DashboardProduccion from "../features/cultivos/pages/DashboardProduccion";
import TrazabilidadCultivoPage from "../features/cultivos/pages/TrazabilidadCultivoPage";
import ActividadesPrincipal from "../features/actividades/pages/PrincipalAcvidades";
import GestionActiviadesPage from "../features/actividades/pages/GestionActividadesPage";
import GestionFitosanitarioPage from "../features/fitosanitario/pages/GestionFitosanitarioPage";
// import GestionTratamientosPage from "../features/fitosanitario/pages/GestionTratamientosPage";
import GestionInventarioPage from "../features/inventario/pages/GestionInventarioPage";
import DetalleMaterialPage from "../features/inventario/pages/DetalleMaterialPage";
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

          {/* Usuarios - Requiere permisos de Usuarios */}
          <Route path="/gestion-roles" element={
            <PermissionRoute module="Usuarios">
              <GestionRolesPage />
            </PermissionRoute>
          } />
          <Route path="/gestion-usuarios" element={
            <PermissionRoute module="Usuarios">
              <GestionUsuariosPage />
            </PermissionRoute>
          } />
          <Route path="/gestion-fichas" element={
            <PermissionRoute module="Usuarios">
              <GestionFichasPage />
            </PermissionRoute>
          } />

          {/* IoT - Requiere permisos de Iot */}
          <Route path="/gestion-brokers" element={
            <PermissionRoute module="Iot">
              <GestionBrokersPage />
            </PermissionRoute>
          } />
          <Route path="/gestion-sensores" element={
            <PermissionRoute module="Iot">
              <GestionSensoresPage />
            </PermissionRoute>
          } />

          {/* Cultivos - Requiere permisos de Cultivos */}
          <Route path="/gestion-cultivos" element={
            <PermissionRoute module="Cultivos">
              <GestionCultivosPage />
            </PermissionRoute>
          } />
          <Route path="/gestion-lotes" element={
            <PermissionRoute module="Cultivos">
              <GestionLotes />
            </PermissionRoute>
          } />
          <Route path="/gestion-surcos" element={
            <PermissionRoute module="Cultivos">
              <GestionSurcos />
            </PermissionRoute>
          } />
          <Route path="/cultivos/:cultivoId/produccion" element={
            <PermissionRoute module="Cultivos">
              <DashboardProduccion />
            </PermissionRoute>
          } />
          <Route path="/cultivos/:cultivoId/trazabilidad" element={
            <PermissionRoute module="Cultivos">
              <TrazabilidadCultivoPage />
            </PermissionRoute>
          } />

          {/* Inventario - Requiere permisos de Inventario */}
          <Route path="/stock" element={
            <PermissionRoute module="Inventario">
              <GestionInventarioPage />
            </PermissionRoute>
          } />
          <Route path="/stock/:materialId" element={
            <PermissionRoute module="Inventario">
              <DetalleMaterialPage />
            </PermissionRoute>
          } />
          <Route path="/movimientos" element={
            <PermissionRoute module="Inventario">
              <div className="text-center p-8">
                <h1 className="text-2xl font-bold">Movimientos de Inventario</h1>
                <p>Esta sección está en construcción.</p>
              </div>
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
        </Route>

        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </BrowserRouter>
  );
}