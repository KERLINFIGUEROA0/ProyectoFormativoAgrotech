import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Sprout, ClipboardList, Package, DollarSign, ArrowLeft } from 'lucide-react';
import { obtenerTrazabilidad } from '../api/cultivosApi';

// Mapeo de iconos para cada tipo de evento
const iconMap: any = {
  Siembra: <Sprout className="w-5 h-5" />,
  Actividad: <ClipboardList className="w-5 h-5" />,
  Cosecha: <Package className="w-5 h-5" />,
  Venta: <DollarSign className="w-5 h-5" />,
};

export default function TrazabilidadCultivoPage() {
  const { cultivoId } = useParams<{ cultivoId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cultivoId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await obtenerTrazabilidad(Number(cultivoId));
        setData(response.data);
      } catch (error) {
        toast.error('Error al cargar la trazabilidad del cultivo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cultivoId]);

  if (loading) {
    return <div className="text-center p-8">Cargando línea de tiempo...</div>;
  }

  if (!data) {
    return <div className="text-center p-8">No se encontraron datos de trazabilidad.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <Link to="/gestion-cultivos" className="flex items-center gap-2 text-green-600 hover:underline mb-4">
        <ArrowLeft size={18} />
        Volver a Gestión de Cultivos
      </Link>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Trazabilidad del Cultivo</h1>
        <p className="text-xl font-semibold text-green-700">{data.cultivo.nombre}</p>
      </div>

      <div className="relative pl-8">
        {/* Línea vertical de la línea de tiempo */}
        <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {data.timeline.map((item: any, index: number) => (
          <div key={index} className="mb-8 flex items-start">
            <div className="absolute left-10 -ml-4 mt-1 flex-shrink-0 bg-white border-2 border-green-500 rounded-full h-8 w-8 flex items-center justify-center text-green-500">
              {iconMap[item.tipo] || <Sprout className="w-5 h-5" />}
            </div>
            <div className="ml-10 w-full">
              <p className="text-sm text-gray-500">{new Date(item.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <h3 className="font-bold text-lg text-gray-800">{item.titulo}</h3>
              <p className="text-gray-600">{item.descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}