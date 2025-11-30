import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Bell, ArrowUp, ArrowDown } from 'lucide-react';
import { obtenerTransacciones, obtenerFlujoMensual } from '../api/transaccionesApi';
import FlujoMensualChart from '../components/FlujoMensualChart';
import type { Transaccion } from '../interfaces/finanzas';
import { Input, Button } from "@heroui/react";

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function DashboardFinanciero(): ReactElement {
  const navigate = useNavigate();
  const [recentMovs, setRecentMovs] = useState<Transaccion[]>([]);
  const [flujoData, setFlujoData] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movsRes, flujoRes] = await Promise.all([
          obtenerTransacciones(),
          obtenerFlujoMensual(),
        ]);

        const allMovs = (movsRes.data || []).map((t: any) => ({
          ...t,
          tipo: t.tipo || 'ingreso',
          cantidad: t.cantidad || 1,
          precioUnitario: t.precioUnitario || t.monto,
        })).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        setRecentMovs(allMovs.slice(0, 4));
        setFlujoData(flujoRes.data || []);

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
        <h1 className="text-3xl font-bold text-gray-800">Finanzas</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Input
            type="text"
            placeholder="Buscar..."
            startContent={<Search size={20} />}
            className="flex-grow"
          />
          <Button isIconOnly variant="light">
            <Bell size={20} />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-10">Cargando datos...</div>
      ) : (
        <>
          {/* --- INICIO DE LA CORRECCIÓN --- */}
          {/* Hacemos que el gráfico de flujo mensual ocupe todo el ancho */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Flujo de Efectivo Mensual </h2>
              <FlujoMensualChart data={flujoData} />
            </div>
          </div>
          {/* --- FIN DE LA CORRECCIÓN --- */}

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Transacciones Recientes</h3>
              <Button onClick={() => navigate('/egresos')} color="success">Ver Todas</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 font-medium">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-right">Cantidad</th>
                    <th className="py-3 px-4 text-right">Precio Unit.</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovs.map((mov, index) => (
                    <tr key={mov.id} className={`border-t transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 hover:shadow-sm`}>
                      <td className="py-3 px-4 text-gray-600">{new Date(mov.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mov.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {mov.tipo === 'ingreso' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{mov.descripcion}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{mov.cantidad}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{currencyFormatter.format(mov.precioUnitario || 0)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${mov.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                        {mov.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(mov.monto)}
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