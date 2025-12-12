import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardBody,
  CardHeader,
  Progress,
} from "@heroui/react";
import {
  Activity,
  TrendingUp,
  Package,
  Leaf,
  MapPin,
  DollarSign,
  Thermometer,
  Clock
} from "lucide-react";

// APIs
import { api } from "../lib/axios";
import { obtenerTransacciones } from "../features/finanzas/api/transaccionesApi";
import { SensorCarousel } from "../components/home/SensorCarousel";
import type { LatestSensorData, Sensor } from "../features/iot/interfaces/iot";
import PermissionWrapper from "../components/PermissionWrapper";

interface Movimiento {
  id: string | number;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
  monto: number;
  fecha: string;
}


interface StatsData {
  cultivosActivos: number;
  movimientosRecientes: Movimiento[];
  productosInventario: number;
  sensoresActivos: number;
  totalLotes: number;
}

export default function HomePage() {
  const { userData } = useAuth();
  const [statsData, setStatsData] = useState<StatsData>({
    cultivosActivos: 0,
    movimientosRecientes: [],
    productosInventario: 0,
    sensoresActivos: 0,
    totalLotes: 0
  });
  const [, setSensorsData] = useState<Sensor[]>([]);
  const [latestData, setLatestData] = useState<LatestSensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Polling for sensor data (similar to GestionSensores)
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await api.get("/informacion-sensor/dashboard/latest");
        const latestSensorsRes = response.data?.data || response.data || [];
        setLatestData(latestSensorsRes);
      } catch (error) {
      }
    };

    // Initial fetch
    fetchSensorData();

    // Poll every 2 seconds for better responsiveness
    const interval = setInterval(fetchSensorData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel - usando endpoints públicos para dashboard
      const [
        transaccionesRes,
        cultivosRes,
        inventarioRes,
        sensorsRes,
        latestSensorsRes,
        lotesStatsRes
      ] = await Promise.allSettled([
        obtenerTransacciones(),
        api.get("/cultivos/dashboard/listar"),
        api.get("/materiales/dashboard/listar"),
        api.get("/sensores/dashboard/listar"),
        api.get("/informacion-sensor/dashboard/latest"),
        api.get("/lotes/dashboard/estadisticas"),
      ]);

      // Process financial data
      let movimientosRecientes: Movimiento[] = [];

      if (transaccionesRes.status === 'fulfilled') {
        const transacciones = transaccionesRes.value.data || [];
        // Tomar solo los últimos 5 movimientos
        movimientosRecientes = transacciones.slice(0, 5).map((t: any) => ({
          id: t.id,
          tipo: t.tipo || 'ingreso',
          descripcion: t.descripcion || 'Sin descripción',
          monto: t.monto || t.precioUnitario || 0,
          fecha: t.fecha
        }));
      }

      // Process cultivos data
      let cultivosActivos = 0;
      if (cultivosRes.status === 'fulfilled') {
        const cultivos = cultivosRes.value.data?.data || cultivosRes.value.data || [];
        cultivosActivos = cultivos.length;
      }

      // Process inventory data
      let productosInventario = 0;
      if (inventarioRes.status === 'fulfilled') {
        const materiales = inventarioRes.value.data?.data || inventarioRes.value.data || [];
        productosInventario = materiales.length;
      }

      // Process sensors data
      let sensors: Sensor[] = [];
      let latestSensors: LatestSensorData[] = [];
      let sensoresActivos = 0;

      if (sensorsRes.status === 'fulfilled') {
        sensors = sensorsRes.value.data?.data || sensorsRes.value.data || [];
      }

      if (latestSensorsRes.status === 'fulfilled') {
        latestSensors = latestSensorsRes.value.data?.data || latestSensorsRes.value.data || [];
        sensoresActivos = latestSensors.length;
      }

      // Process lotes stats - only get total
      let totalLotes = 0;
      if (lotesStatsRes.status === 'fulfilled') {
        const stats = lotesStatsRes.value.data?.data || lotesStatsRes.value.data || {};
        totalLotes = stats.total || 0;
      }

      setStatsData({
        cultivosActivos,
        movimientosRecientes,
        productosInventario,
        sensoresActivos,
        totalLotes,
      });

      setSensorsData(sensors);
      setLatestData(latestSensors);

    } catch (error) {
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });


  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg relative overflow-hidden">
      {/* Agricultural background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23059669' fill-opacity='0.1'%3E%3Cpath d='M0 0h80v80H0V0zm20 20h40v40H20V20zM30 30h20v20H30V30z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
      {/* Welcome Banner */}
      <div className="w-full bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              ¡Bienvenido{userData ? ` ${userData.nombres?.split(' ')[0] || 'Usuario'}` : ''}!
            </h2>
            <p className="text-green-100">Sistema de Monitoreo y Gestión Agrícola</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-green-100">
            <Clock size={20} />
            <span className="text-sm">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Lotes Stats - Simplified */}
        <Card className="border-l-4 border-l-green-500">
           <CardBody className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-gray-600">Lotes Totales</p>
                 <p className="text-2xl font-bold text-gray-900">{statsData.totalLotes}</p>
                 <p className="text-xs text-gray-500">registrados</p>
               </div>
               <div className="p-3 bg-green-100 rounded-full">
                 <MapPin className="h-6 w-6 text-green-600" />
               </div>
             </div>
             <Progress
               value={Math.min(statsData.totalLotes * 10, 100)}
               className="mt-3"
               color="success"
               size="sm"
               aria-label={`Total de lotes registrados: ${statsData.totalLotes}`}
             />
           </CardBody>
         </Card>

        {/* Cultivos Stats */}
        <Card className="border-l-4 border-l-blue-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cultivos Activos</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.cultivosActivos}</p>
                <p className="text-xs text-gray-500">en producción</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Leaf className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <Progress
              value={Math.min(statsData.cultivosActivos * 10, 100)}
              className="mt-3"
              color="primary"
              size="sm"
              aria-label={`Progreso de cultivos activos: ${statsData.cultivosActivos}`}
            />
          </CardBody>
        </Card>

        {/* Inventario Stats */}
        <Card className="border-l-4 border-l-orange-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productos</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.productosInventario}</p>
                <p className="text-xs text-gray-500">en inventario</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <Progress
              value={Math.min(statsData.productosInventario * 5, 100)}
              className="mt-3"
              color="warning"
              size="sm"
              aria-label={`Progreso de productos en inventario: ${statsData.productosInventario}`}
            />
          </CardBody>
        </Card>

        {/* Sensores Stats */}
        <Card className="border-l-4 border-l-purple-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sensores</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.sensoresActivos}</p>
                <p className="text-xs text-gray-500">activos</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <Progress
              value={Math.min(statsData.sensoresActivos * 20, 100)}
              className="mt-3"
              color="secondary"
              size="sm"
              aria-label={`Progreso de sensores activos: ${statsData.sensoresActivos}`}
            />
          </CardBody>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sensor Monitoring */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-md">
                <Thermometer className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Sensores en Tiempo Real</h3>
                <p className="text-xs text-gray-600">Monitoreo automático</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <SensorCarousel sensors={latestData} />
          </CardBody>
        </Card>

        {/* Financial Summary */}
        <PermissionWrapper module="Finanzas" permission="VerMovimientos">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded-md">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Movimientos</h3>
                  <p className="text-xs text-gray-600">Últimas transacciones</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-2">
                {statsData.movimientosRecientes.length > 0 ? (
                  statsData.movimientosRecientes.slice(0, 3).map((movimiento) => (
                    <div key={movimiento.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${movimiento.tipo === 'ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                          <TrendingUp className={`h-2.5 w-2.5 ${movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900 truncate max-w-24">{movimiento.descripcion}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(movimiento.fecha).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold ${movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {movimiento.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(movimiento.monto)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Sin movimientos</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </PermissionWrapper>
      </div>

    </div>
  );
}
