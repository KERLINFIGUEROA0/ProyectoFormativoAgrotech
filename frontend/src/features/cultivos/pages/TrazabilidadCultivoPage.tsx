import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Sprout, ClipboardList, Package, DollarSign, ArrowLeft, FileText } from 'lucide-react';
import { obtenerTrazabilidad, generarPdfTrazabilidad } from '../api/cultivosApi';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

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

  const handleGenerarPdf = async () => {
    if (!cultivoId) return;

    setGeneratingPdf(true);
    try {
      const pdfBlob = await generarPdfTrazabilidad(
        Number(cultivoId),
        fechaInicio || undefined,
        fechaFin || undefined
      );

      // Crear URL para el blob y descargar
      const url = window.URL.createObjectURL(new Blob([pdfBlob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trazabilidad-cultivo-${cultivoId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF generado y descargado exitosamente.');
      setIsModalOpen(false);
      setFechaInicio('');
      setFechaFin('');
    } catch (error: any) {
      console.log('Error recibido en frontend al generar PDF:', error);
      console.log('Error status:', error.response?.status);
      console.log('Error data:', error.response?.data);
      console.log('Error message:', error.response?.data?.message);
      if (error.response && error.response.status === 400) {
        const errorMessage = error.response.data?.message || 'Error de validación en la solicitud';
        toast.error(`Error de validación: ${errorMessage}`);
      } else {
        toast.error('Error al generar el PDF.');
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Trazabilidad del Cultivo</h1>
            <p className="text-xl font-semibold text-green-700">{data.cultivo.nombre}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileText size={18} />
            Generar PDF de Trazabilidad
          </button>
        </div>
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

      {/* Modal para generar PDF */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generar PDF de Trazabilidad</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio (opcional)
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin (opcional)
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={generatingPdf}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerarPdf}
                disabled={generatingPdf}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPdf ? 'Generando...' : 'Generar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}