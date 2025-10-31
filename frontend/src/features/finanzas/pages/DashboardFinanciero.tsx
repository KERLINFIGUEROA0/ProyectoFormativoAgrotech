import { useState, useEffect, type ReactElement } from 'react';
import { Link } from "react-router-dom";
import { toast } from 'sonner';
import { Search, Bell } from 'lucide-react';
import { obtenerTransacciones, obtenerFlujoMensual, obtenerDistribucionEgresos } from '../api/transaccionesApi';
import FlujoMensualChart from '../components/FlujoMensualChart';
import DistribucionEgresosChart from '../components/DistribucionEgresosChart';
import type { Transaccion } from '../interfaces/finanzas';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function DashboardFinanciero(): ReactElement {
  const [recentMovs, setRecentMovs] = useState<Transaccion[]>([]);
  const [flujoData, setFlujoData] = useState([]);
  const [distribucionData, setDistribucionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movsRes, flujoRes, distRes] = await Promise.all([
          obtenerTransacciones(),
          obtenerFlujoMensual(),
          obtenerDistribucionEgresos(),
        ]);
        
        // El backend ya devuelve los datos en el formato correcto y ordenados
        setRecentMovs((movsRes.data || []).slice(0, 4));
        setFlujoData(flujoRes.data || []);
        setDistribucionData(distRes.data || []);

      } catch (error) {
        toast.error("Error al cargar los datos del dashboard.");
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-full font-sans">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard de Finanzas</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <button className="p-2 rounded-lg border hover:bg-gray-100">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-10">Cargando datos...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Flujo de Efectivo Mensual</h2>
              <FlujoMensualChart data={flujoData} />
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Distribución de Egresos</h2>
              {/* Como no hay egresos, mostramos un mensaje */}
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No hay datos de egresos para mostrar.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Ventas Recientes</h3>
              <Link to="/egresos" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm shadow-sm">
                Ver Todas
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 font-medium">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-right">Cantidad</th>
                    <th className="py-3 px-4 text-right">Precio Unit.</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovs.map((mov) => (
                    <tr key={mov.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600">{new Date(mov.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-3 px-4 font-medium text-gray-800">{mov.descripcion}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{mov.cantidad}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{currencyFormatter.format(mov.precioUnitario || 0)}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-600">
                        {currencyFormatter.format(mov.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}