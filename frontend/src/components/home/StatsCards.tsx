import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Package, Activity, ArrowUp, ArrowDown } from 'lucide-react';

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

interface StatsCardsProps {
  data: StatsData;
  loading: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function StatsCards({ data, loading }: StatsCardsProps) {
  const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const stats = [
    {
      title: 'Cultivos Activos',
      value: data.cultivosActivos.toString(),
      icon: <DollarSign size={24} />,
      color: 'bg-green-500',
      change: '+12%'
    },
    {
      title: 'Productos Inventario',
      value: data.productosInventario.toString(),
      icon: <Package size={24} />,
      color: 'bg-orange-500',
      change: '+8%'
    },
    {
      title: 'Sensores Activos',
      value: data.sensoresActivos.toString(),
      icon: <Activity size={24} />,
      color: 'bg-purple-500',
      change: '100%'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="w-12 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-20 h-6 bg-gray-200 rounded mb-2"></div>
            <div className="w-16 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tarjetas normales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-full text-white ${stat.color}`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-green-100 text-green-800' :
                stat.change.startsWith('-') ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {stat.change}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tarjeta especial para movimientos recientes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full text-white bg-blue-500">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Movimientos Recientes</h3>
            <p className="text-xs text-gray-600">{data.movimientosRecientes.length} movimientos</p>
          </div>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.movimientosRecientes.length > 0 ? (
            data.movimientosRecientes.map((movimiento, index) => (
              <div key={movimiento.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {movimiento.tipo === 'ingreso' ? (
                    <ArrowUp size={14} className="text-green-600" />
                  ) : (
                    <ArrowDown size={14} className="text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                      {movimiento.descripcion}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(movimiento.fecha).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {movimiento.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(movimiento.monto)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No hay movimientos recientes</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}