// src/features/cultivos/pages/DashboardProduccion.tsx
import { useState, useEffect } from 'react';
// ✅ 1. Importa Link y el icono ArrowLeft
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DollarSign, BarChart, Edit, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from '@heroui/react';
import { getProduccionesPorCultivo, getStatsPorCultivo, deleteProduccion, createProduccion, updateProduccion } from '../api/produccionApi';
import { getPagosByCultivo } from '../../pagos/api/pagosApi';
import { getMaterialCosts } from '../api/cultivosApi';
import ProduccionForm from '../components/ProduccionForm';
import type { Produccion, Stats} from '../interfaces/cultivos';
import { formatDateOnly } from '../../../utils/dateUtils';

const StatCard = ({ title, value, icon, isCurrency = true }: any) => {
  const formattedValue = isCurrency
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
    : `${value.toLocaleString('es-CO')} kg`;

  return (
    <Card className="p-6">
      <CardBody className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-green-100 text-green-700">{icon}</div>
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="font-bold text-2xl">{formattedValue}</p>
        </div>
      </CardBody>
    </Card>
  );
};

export default function DashboardProduccion() {
  const { cultivoId } = useParams<{ cultivoId: string }>();
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [totalLaborCosts, setTotalLaborCosts] = useState<number>(0);
  const [totalMaterialCosts, setTotalMaterialCosts] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduccion, setEditingProduccion] = useState<Produccion | null>(null);

  const fetchData = async () => {
    if (!cultivoId) return;
    try {
      const id = parseInt(cultivoId);
      const [produccionesRes, statsRes, pagosRes, materialCostsRes] = await Promise.all([
        getProduccionesPorCultivo(id),
        getStatsPorCultivo(id),
        getPagosByCultivo(id),
        getMaterialCosts(id)
      ]);
      setProducciones(produccionesRes.data || []);
      setStats(statsRes.data);

      // Calcular total de costos de mano de obra (pagos a pasantes)
      const laborCosts = pagosRes.data ? pagosRes.data.reduce((sum: number, pago: any) => sum + Number(pago.monto), 0) : 0;
      setTotalLaborCosts(laborCosts);

      // Calcular total de costos de materiales
      const materialCosts = materialCostsRes.data?.totalMaterialCosts || 0;
      setTotalMaterialCosts(materialCosts);
    } catch (error) {
      toast.error("Error al cargar los datos de producción.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [cultivoId]);
  
  const getStatusColor = (estado: string) => {
      switch (estado) {
          case 'Cosechado': return 'bg-green-100 text-green-800';
          case 'En Proceso': return 'bg-yellow-100 text-yellow-800';
          case 'Programado': return 'bg-blue-100 text-blue-800';
          default: return 'bg-gray-100 text-gray-800';
      }
  };

  const handleOpenModal = (produccion: Produccion | null = null) => {
      setEditingProduccion(produccion);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setEditingProduccion(null);
      setIsModalOpen(false);
  };

  const handleSave = async (data: any) => {
      const toastId = toast.loading('Guardando...');
      try {
          if (editingProduccion) {
              await updateProduccion(editingProduccion.id, data);
          } else {
              await createProduccion(data);
          }
          toast.success('Guardado con éxito', { id: toastId });
          fetchData(); 
          handleCloseModal();
      } catch {
          toast.error('Error al guardar', { id: toastId });
      }
  };

  const handleDelete = (id: number) => {
    toast.warning("¿Seguro que quieres eliminar este registro?", {
        action: { label: 'Eliminar', onClick: async () => {
            try {
                await deleteProduccion(id);
                toast.success("Registro eliminado.");
                setProducciones(prev => prev.filter(p => p.id !== id));
            } catch {
                toast.error("No se pudo eliminar el registro.");
            }
        }},
       cancel: { label: 'Cancelar', onClick: () => {} },
    })
  }

  if (!cultivoId) return <div>ID de cultivo no proporcionado.</div>;

  return (
    <div className="h-full flex flex-col space-y-6 p-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Producción del Cultivo</h1>
      </div>

      {/* Navigation and Actions */}
      <div className="flex justify-between items-center">
        <Link to="/gestion-cultivos" className="flex items-center gap-2 text-green-600 hover:underline font-semibold">
          <ArrowLeft size={18} />
          Volver a Gestión de Cultivos
        </Link>
        <Button onClick={() => handleOpenModal()} color="primary" startContent={<Plus />}>
           Registrar Cosecha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Cosechado" value={stats?.totalCosechado || 0} icon={<BarChart/>} isCurrency={false}/>
        <StatCard title="Ingresos Totales" value={stats?.ingresosTotales || 0} icon={<DollarSign/>}/>
        <StatCard title="Gastos Totales" value={(stats?.gastosTotales || 0) + totalLaborCosts + totalMaterialCosts} icon={<DollarSign/>}/>
        <StatCard title="Cosecha Vendida" value={stats?.cosechaVendida || 0} icon={<DollarSign/>} isCurrency={false}/>
      </div>

      <div className="bg-white shadow-xl rounded-xl p-6 w-full">
        <h2 className="text-lg font-semibold text-gray-600 mb-4">Historial de Cosechas</h2>
        <Table aria-label="Historial de cosechas">
          <TableHeader>
            <TableColumn>ID Registro</TableColumn>
            <TableColumn>Fecha Cosecha</TableColumn>
            <TableColumn align="center">Estado</TableColumn>
            <TableColumn align="end">Cosecha Total (kg)</TableColumn>
            <TableColumn align="end">Cosecha Vendida (kg)</TableColumn>
            <TableColumn align="end">Disponible (kg)</TableColumn>
            <TableColumn align="center">Acciones</TableColumn>
          </TableHeader>
          <TableBody>
            {producciones.map((p) => {
              const cosechaVendida = (p.cantidadOriginal || 0) - p.cantidad;
              const disponible = p.cantidad;
              const isSoldOut = disponible === 0;

              return (
                <TableRow key={p.id} className={isSoldOut ? 'bg-red-50' : ''}>
                  <TableCell className="font-medium">PROD-{p.id}</TableCell>
                  <TableCell>{formatDateOnly(p.fecha)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={p.estado === 'Cosechado' ? 'success' : p.estado === 'En Proceso' ? 'warning' : 'default'}
                      >
                        {p.estado}
                      </Chip>
                      {isSoldOut && <span className="text-red-600 text-xs font-medium">VENDIDO</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{(p.cantidadOriginal || p.cantidad).toLocaleString('es-CO')} kg</TableCell>
                  <TableCell className="text-right font-semibold">{cosechaVendida.toLocaleString('es-CO')} kg</TableCell>
                  <TableCell className="text-right font-semibold">{disponible.toLocaleString('es-CO')} kg</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="primary"
                        onClick={() => handleOpenModal(p)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
       <Modal isOpen={isModalOpen} onOpenChange={handleCloseModal} size="2xl">
         <ModalContent>
           <ModalHeader>
             {editingProduccion ? "Editar Cosecha" : "Registrar Cosecha"}
           </ModalHeader>
           <ModalBody>
             <ProduccionForm
               onSave={handleSave}
               onCancel={handleCloseModal}
               initialData={editingProduccion || undefined}
               cultivoId={parseInt(cultivoId)}
             />
           </ModalBody>
         </ModalContent>
       </Modal>
    </div>
  );
}