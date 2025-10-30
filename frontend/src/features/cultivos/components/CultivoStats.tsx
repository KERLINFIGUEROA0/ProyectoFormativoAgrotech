import { useState, useEffect } from 'react';
import { getStatsPorCultivo } from '../api/produccionApi';
import type { Stats } from '../interfaces/cultivos';

interface CultivoStatsProps {
  cultivoId: number;
}

export default function CultivoStats({ cultivoId }: CultivoStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getStatsPorCultivo(cultivoId);
        setStats(response.data);
      } catch (error) {
        console.error('Error al cargar estadísticas del cultivo:', error);
      }
    };

    fetchStats();
  }, [cultivoId]);

  if (!stats) return <div>Cargando estadísticas...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Cosecha Total</h3>
        <p className="text-2xl font-bold text-gray-900">{stats.totalCosechado} kg</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Cosecha Vendida</h3>
        <p className="text-2xl font-bold text-gray-900">{stats.cosechaVendida} kg</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Ingresos Totales</h3>
        <p className="text-2xl font-bold text-green-600">${stats.ingresosTotales}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Gastos Totales</h3>
        <p className="text-2xl font-bold text-red-600">${stats.gastosTotales}</p>
      </div>
    </div>
  );
}