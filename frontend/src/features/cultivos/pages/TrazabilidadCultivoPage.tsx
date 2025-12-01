import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Sprout, ClipboardList, Package, DollarSign, ArrowLeft, FileText } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react';
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

  // Obtener la fecha de plantado para establecer el mínimo en los inputs de fecha
  const fechaPlantado = data?.cultivo?.Fecha_Plantado || '';

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

  useEffect(() => {
    if (isModalOpen) {
      setFechaInicio(fechaPlantado);
    }
  }, [isModalOpen, fechaPlantado]);


  const handleGenerarPdf = async () => {
    if (!cultivoId) return;

    setGeneratingPdf(true);
    try {
      const pdfBlob = await generarPdfTrazabilidad(
        Number(cultivoId),
        fechaInicio || fechaPlantado,
        fechaFin
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
        toast.error('Estás seleccionando una fecha que no corresponde a este cultivo. La fecha de inicio debe ser posterior o igual a la fecha de plantado.');
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
              <p className="text-sm text-gray-500">{item.fecha}</p>
              <h3 className="font-bold text-lg text-gray-800">{item.titulo}</h3>
              <p className="text-gray-600">{item.descripcion}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para generar PDF */}
      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent>
          <ModalHeader>Generar PDF de Trazabilidad</ModalHeader>
          <ModalBody>
            <Input
              label="Fecha Inicio (opcional)"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              min={fechaPlantado}
            />
            <Input
              label="Fecha Fin (opcional)"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaPlantado}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => setIsModalOpen(false)}
              disabled={generatingPdf}
              variant="light"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerarPdf}
              disabled={generatingPdf}
              color="primary"
            >
              {generatingPdf ? 'Generando...' : 'Generar PDF'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}