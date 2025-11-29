import { useState, useEffect } from "react";
import { toast } from "sonner";
import HeroSection from "../components/home/HeroSection.tsx";
import StatsCards from "../components/home/StatsCards";
import SensorCarousel from "../components/home/SensorCarousel.tsx";

// APIs
import { obtenerTransacciones } from "../features/finanzas/api/transaccionesApi";
import { listarMateriales } from "../features/inventario/api/inventarioApi";
import { getLatestSensorData } from "../features/iot/api/sensoresApi";
import { listarCultivos } from "../features/cultivos/api/cultivosApi";
import type { LatestSensorData } from "../features/iot/interfaces/iot";

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
}

export default function HomePage() {
  const [statsData, setStatsData] = useState<StatsData>({
    cultivosActivos: 0,
    movimientosRecientes: [],
    productosInventario: 0,
    sensoresActivos: 0,
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
        sensorsRes
      ] = await Promise.allSettled([
        obtenerTransacciones(),
        listarCultivos(),
        listarMateriales(),
        getLatestSensorData(),
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

      setStatsData({
        cultivosActivos,
        movimientosRecientes,
        productosInventario,
        sensoresActivos,
      });

      setSensorsData(sensors);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <HeroSection />
      <StatsCards data={statsData} loading={loading} />
      <SensorCarousel sensors={sensorsData} loading={loading} />
    </div>
  );
}