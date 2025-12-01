import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardBody,
  CardHeader,
  Progress,
  Badge
} from "@heroui/react";
import {
  Activity,
  TrendingUp,
  Package,
  Leaf,
  MapPin,
  DollarSign,
  Thermometer,
  Clock,
  BarChart3
} from "lucide-react";

// APIs
import { obtenerTransacciones } from "../features/finanzas/api/transaccionesApi";
import { listarMateriales } from "../features/inventario/api/inventarioApi";
import { getLatestSensorData } from "../features/iot/api/sensoresApi";
import { listarCultivos } from "../features/cultivos/api/cultivosApi";
import { obtenerEstadisticasLotes } from "../features/cultivos/api/lotesApi";
import type { LatestSensorData } from "../features/iot/interfaces/iot";

interface Movimiento {
  id: string | number;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
  monto: number;
  fecha: string;
}

interface LotesStats {
  total: number;
  enPreparacion: number;
  parcialmenteOcupado: number;
  enCultivo: number;
  enMantenimiento: number;
}

interface StatsData {
  cultivosActivos: number;
  movimientosRecientes: Movimiento[];
  productosInventario: number;
  sensoresActivos: number;
  lotesStats: LotesStats;
}

export default function HomePage() {
  const { userData } = useAuth();
  const [statsData, setStatsData] = useState<StatsData>({
    cultivosActivos: 0,
    movimientosRecientes: [],
    productosInventario: 0,
    sensoresActivos: 0,
    lotesStats: {
      total: 0,
      enPreparacion: 0,
      parcialmenteOcupado: 0,
      enCultivo: 0,
      enMantenimiento: 0
    }
  });
  const [sensorsData, setSensorsData] = useState<LatestSensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [
        transaccionesRes,
        cultivosRes,
        inventarioRes,
        sensorsRes,
        lotesStatsRes
      ] = await Promise.allSettled([
        obtenerTransacciones(),
        listarCultivos(),
        listarMateriales(),
        getLatestSensorData(),
        obtenerEstadisticasLotes(),
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
        const cultivos = cultivosRes.value.data || [];
        cultivosActivos = cultivos.length;
      }

      // Process inventory data
      let productosInventario = 0;
      if (inventarioRes.status === 'fulfilled') {
        const materiales = inventarioRes.value.data || [];
        productosInventario = materiales.length;
      }

      // Process sensors data
      let sensors: any[] = [];
      let sensoresActivos = 0;

      if (sensorsRes.status === 'fulfilled') {
        sensors = sensorsRes.value || [];
        sensoresActivos = sensors.length;
      }

      // Process lotes stats
      let lotesStats: LotesStats = {
        total: 0,
        enPreparacion: 0,
        parcialmenteOcupado: 0,
        enCultivo: 0,
        enMantenimiento: 0
      };

      if (lotesStatsRes.status === 'fulfilled') {
        const stats = lotesStatsRes.value.data || {};
        lotesStats = {
          total: stats.total || 0,
          enPreparacion: stats.enPreparacion || 0,
          parcialmenteOcupado: stats.parcialmenteOcupado || 0,
          enCultivo: stats.enCultivo || 0,
          enMantenimiento: stats.enMantenimiento || 0
        };
      }

      setStatsData({
        cultivosActivos,
        movimientosRecientes,
        productosInventario,
        sensoresActivos,
        lotesStats,
      });

      setSensorsData(sensors);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const getSensorUnit = (topic: string | null) => {
    if (!topic) return '';
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('temp')) return '°C';
    if (topicLower.includes('hum')) return '%';
    if (topicLower.includes('wind')) return 'km/h';
    if (topicLower.includes('soil')) return '%';
    if (topicLower.includes('ph')) return '';
    return '';
  };

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
    <div className="h-full flex flex-col space-y-6 p-6 bg-gray-50">
      {/* Welcome Banner */}
      <div className="w-full bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              ¡Bienvenido{userData ? ` ${userData.nombres?.split(' ')[0] || 'Usuario'}` : ''}!
            </h2>
            <p className="text-green-100">Sistema de Monitoreo Agrícola - Dashboard Principal</p>
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
        {/* Lotes Stats */}
        <Card className="border-l-4 border-l-green-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lotes Activos</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.lotesStats.enCultivo}</p>
                <p className="text-xs text-gray-500">de {statsData.lotesStats.total} total</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress
              value={(statsData.lotesStats.enCultivo / Math.max(statsData.lotesStats.total, 1)) * 100}
              className="mt-3"
              color="success"
              size="sm"
              aria-label={`Progreso de lotes en cultivo: ${statsData.lotesStats.enCultivo} de ${statsData.lotesStats.total}`}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sensor Monitoring */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Thermometer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Monitoreo de Sensores</h3>
                <p className="text-sm text-gray-600">Datos en tiempo real</p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {sensorsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sensorsData.slice(0, 6).map((sensor, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{sensor.nombre || sensor.topic || `Sensor ${index + 1}`}</span>
                      <Badge color="success" variant="flat" size="sm">Activo</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Valor actual:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {sensor.valor !== null ? `${sensor.valor} ${getSensorUnit(sensor.topic)}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Rango:</span>
                        <span className="text-xs text-gray-500">
                          {sensor.valorMinimo} - {sensor.valorMaximo}
                        </span>
                      </div>
                      {sensor.fechaRegistro && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Última lectura:</span>
                          <span className="text-xs text-gray-500">
                            {new Date(sensor.fechaRegistro).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay datos de sensores disponibles</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Movimientos Financieros</h3>
                <p className="text-sm text-gray-600">Últimas transacciones</p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {statsData.movimientosRecientes.length > 0 ? (
                statsData.movimientosRecientes.map((movimiento) => (
                  <div key={movimiento.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${movimiento.tipo === 'ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                        <TrendingUp className={`h-3 w-3 ${movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-32">{movimiento.descripcion}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(movimiento.fecha).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {movimiento.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(movimiento.monto)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay movimientos recientes</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lotes Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Estado de Lotes</h3>
              <p className="text-sm text-gray-600">Distribución por estado actual</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray={`${(statsData.lotesStats.parcialmenteOcupado / Math.max(statsData.lotesStats.total, 1)) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{statsData.lotesStats.parcialmenteOcupado}</span>
                </div>
              </div>
              <h4 className="font-semibold text-gray-800">Parcialmente Ocupado</h4>
              <p className="text-sm text-gray-600">Algunos cultivos</p>
            </div>

            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray={`${(statsData.lotesStats.enCultivo / Math.max(statsData.lotesStats.total, 1)) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{statsData.lotesStats.enCultivo}</span>
                </div>
              </div>
              <h4 className="font-semibold text-gray-800">En Cultivo</h4>
              <p className="text-sm text-gray-600">Completamente activos</p>
            </div>

            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray={`${(statsData.lotesStats.enPreparacion / Math.max(statsData.lotesStats.total, 1)) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{statsData.lotesStats.enPreparacion}</span>
                </div>
              </div>
              <h4 className="font-semibold text-gray-800">En Preparación</h4>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>

            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeDasharray={`${(statsData.lotesStats.enMantenimiento / Math.max(statsData.lotesStats.total, 1)) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{statsData.lotesStats.enMantenimiento}</span>
                </div>
              </div>
              <h4 className="font-semibold text-gray-800">En Mantenimiento</h4>
              <p className="text-sm text-gray-600">Requieren atención</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}