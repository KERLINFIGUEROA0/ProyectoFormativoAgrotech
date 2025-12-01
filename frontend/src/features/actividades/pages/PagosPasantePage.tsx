import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, Clock, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';

interface Pago {
  id: number;
  idUsuario: number;
  idActividad: number;
  monto: number;
  horasTrabajadas: number;
  tarifaHora: number;
  descripcion: string;
  fechaPago: string;
  fechaCreacion: string;
  actividad: {
    id: number;
    titulo: string;
    fecha: string;
  };
}

const PagosPasantePage: React.FC = () => {
  const { userData } = useAuth();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPagos: 0,
    totalMonto: 0,
    promedioHora: 0,
    totalHoras: 0,
  });

  useEffect(() => {
    // Verificar que el usuario sea pasante
    if (userData?.rolNombre?.toLowerCase() !== 'pasante') {
      toast.error('Esta página solo está disponible para pasantes');
      return;
    }
    cargarPagos();
  }, [userData]);

  const cargarPagos = async () => {
    try {
      if (!userData?.identificacion) {
        toast.error('No se pudo obtener la información del usuario');
        return;
      }

      const token = localStorage.getItem('token');
      const userId = userData.identificacion;

      const response = await fetch(`/pagos/usuario/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar pagos');
      }

      const data = await response.json();
      setPagos(data);

      // Calcular estadísticas
      const totalMonto = data.reduce((sum: number, pago: Pago) => sum + Number(pago.monto), 0);
      const totalHoras = data.reduce((sum: number, pago: Pago) => sum + Number(pago.horasTrabajadas), 0);
      const promedioHora = totalHoras > 0 ? totalMonto / totalHoras : 0;

      setStats({
        totalPagos: data.length,
        totalMonto,
        promedioHora,
        totalHoras,
      });
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      toast.error('Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Verificar permisos antes de renderizar
  if (userData?.rolNombre?.toLowerCase() !== 'pasante') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">Esta página solo está disponible para pasantes.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mis Pagos</h1>
        <p className="text-gray-600">Historial de pagos por actividades realizadas</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pagos</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalPagos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Recibido</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalMonto)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Horas Totales</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalHoras}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Promedio/Hora</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.promedioHora)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Historial de Pagos</h2>
        </div>

        {pagos.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No hay pagos registrados</h3>
            <p className="text-gray-500">Cuando completes actividades, aparecerán aquí tus pagos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarifa/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {pago.actividad.titulo}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {pago.actividad.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {formatDate(pago.fechaPago)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {pago.horasTrabajadas}h
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(pago.tarifaHora)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(pago.monto)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {pago.descripcion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PagosPasantePage;