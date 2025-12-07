import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { FaPlus, FaTrash, FaDownload, FaArrowUp, FaArrowDown, FaFileExcel } from 'react-icons/fa';
import { Trash2 } from 'lucide-react';
import { obtenerTransacciones, eliminarTransaccion } from '../api/transaccionesApi';
import { exportarExcelCultivo, exportarExcelGeneral } from '../api/excelApi';
import TransaccionForm from '../components/TransaccionForm';
import type { Transaccion, TransaccionData } from '../interfaces/finanzas';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
// ✅ IMPORTAR HELPER DE FECHAS
import { formatToTable } from '../../../utils/dateUtils.ts';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const API_URL = import.meta.env.VITE_BACKEND_URL;

interface Cultivo {
  id: number;
  nombre: string;
}

export default function GestionTransaccionesPage(): ReactElement {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: { id: number | string; tipo: string } | null }>({ isOpen: false, item: null });
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [selectedCultivoId, setSelectedCultivoId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const transRes = await obtenerTransacciones();
      // Ya viene mapeado desde la API, solo asignamos
      setTransacciones(transRes.data || []);
    } catch (error) {
      toast.error("Error al cargar las transacciones.");
    }
  };

  useEffect(() => { 
    fetchData();
    cargarCultivos();
  }, []);

  const cargarCultivos = async () => {
    try {
      const response = await fetch(`${API_URL}/cultivos/listar`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCultivos(data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar cultivos:', error);
      toast.error("Error al cargar los cultivos");
    }
  };

  const handleDelete = (id: number | string, tipo: string) => {
    setDeleteModal({ isOpen: true, item: { id, tipo } });
  };

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    const { id, tipo } = deleteModal.item;
    try {
      await eliminarTransaccion(id);
      toast.success(`${tipo === 'ingreso' ? 'Venta' : 'Gasto'} eliminada con éxito.`);
      fetchData();
    } catch (error) {
      toast.error(`Error al eliminar la ${tipo === 'ingreso' ? 'venta' : 'gasto'}.`);
      console.error('Error al eliminar:', error);
    } finally {
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, item: null });
  };

  const handleSave = async (data: TransaccionData) => {
    const toastId = toast.loading("Registrando transacción...");
    try {
      const endpoint = data.tipo === 'egreso' ? '/gastos-produccion' : '/ventas';
      const payload = data.tipo === 'egreso' ? {
        descripcion: data.descripcion,
        monto: data.monto,
        fecha: data.fecha,
        produccion: data.produccionId
      } : data;

      const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error del servidor');
      }

      toast.success("Transacción registrada con éxito", { id: toastId });
      closeModal();
      fetchData();
    } catch (error: any) {
      const errorMessage = error.message || "Error al guardar la transacción";
      toast.error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, { id: toastId });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTransacciones = transacciones.filter(t => 
    t && t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700">Gestión de Transacciones</h1>
        <div className="flex gap-4">
          <Button
            onClick={async () => {
              if (selectedCultivoId) {
                try {
                  await exportarExcelCultivo(selectedCultivoId);
                  toast.success('Reporte Excel generado con éxito');
                } catch (error) {
                  toast.error('Error al generar el reporte Excel');
                }
              } else {
                toast.error("Por favor seleccione un cultivo primero");
              }
            }}
            color="success"
            startContent={<FaFileExcel />}
          >
            Exportar Excel por Cultivo
          </Button>
          <Button
            onClick={async () => {
              try {
                await exportarExcelGeneral();
                toast.success('Reporte Excel general generado con éxito');
              } catch (error) {
                toast.error('Error al generar el reporte Excel general');
              }
            }}
            color="success"
            startContent={<FaFileExcel />}
          >
            Exportar Excel General
          </Button>
          <Button
            onClick={openModal}
            color="success"
            startContent={<FaPlus />}
          >
            Nueva Venta
          </Button>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <Select
          placeholder="Seleccionar Cultivo"
          className="w-64"
          selectedKeys={selectedCultivoId ? [selectedCultivoId.toString()] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            setSelectedCultivoId(selected ? Number(selected) : null);
          }}
        >
          {cultivos.map(cultivo => (
            <SelectItem key={cultivo.id.toString()}>
              {cultivo.nombre}
            </SelectItem>
          ))}
        </Select>

        <Input
          type="text"
          placeholder="Buscar por descripción..."
          className="w-72"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="overflow-auto flex-grow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left w-1/3">Descripción</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-center">Unidad</th> {/* ✅ Nueva columna */}
              <th className="px-4 py-3 text-right">Precio Unitario</th>
              <th className="px-4 py-3 text-right">Valor Total</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransacciones.map((t, index) => (
              <tr key={t.id} className={`border-t transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 hover:shadow-sm`}>
                <td className="px-4 py-3">{formatToTable(t.fecha)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    t.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {t.tipo === 'ingreso' ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                    {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium truncate max-w-xs" title={t.descripcion}>
                  {t.descripcion}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {t.cantidad}
                </td>
                <td className="px-4 py-3 text-center text-gray-500"> {/* ✅ Nueva celda */}
                  {t.unidad || '-'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">
                  {currencyFormatter.format(t.precioUnitario || 0)}
                </td>
                <td className={`px-4 py-3 font-semibold text-right ${t.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                  {t.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(t.monto)}
                </td>
                <td className="px-4 py-3 text-center flex justify-center gap-4">
                  {t.rutaFacturaPdf && (
                    <a
                      href={`${API_URL}/ventas/${t.id}/factura`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Descargar Factura"
                    >
                      <FaDownload />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(t.id, t.tipo)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                    title={`Eliminar ${t.tipo === 'ingreso' ? 'venta' : 'gasto'}`}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       <Modal isOpen={isModalOpen} onOpenChange={closeModal} size="4xl" scrollBehavior="inside">
         <ModalContent>
           <ModalBody>
             <TransaccionForm
               onSave={handleSave}
               onCancel={closeModal}
             />
           </ModalBody>
         </ModalContent>
       </Modal>

       <Modal isOpen={deleteModal.isOpen} onOpenChange={cancelDelete}>
         <ModalContent>
           <ModalHeader className="flex flex-col items-center justify-center text-center pb-2">
             <div className="flex flex-col items-center gap-3">
               <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                 <Trash2 className="text-red-600" size={20} />
               </div>
               <h4 className="text-lg font-semibold text-center">¿Eliminar transacción?</h4>
             </div>
           </ModalHeader>
           <ModalBody className="text-center">
             <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 mx-auto max-w-xs">
               <div className="font-medium">{deleteModal.item?.tipo === 'ingreso' ? 'Venta' : 'Gasto'}</div>
               <div className="text-xs text-gray-500 mt-1">Transacción financiera</div>
             </div>
             <p className="text-xs text-gray-500 mt-3">Esta acción no se puede deshacer.</p>
             <div className="flex gap-3 mt-4 w-full justify-center">
               <Button
                 onClick={cancelDelete}
                 color="default"
                 variant="light"
                 className="flex-1 max-w-[120px]"
               >
                 Cancelar
               </Button>
               <Button
                 onClick={confirmDelete}
                 color="danger"
                 className="flex-1 max-w-[120px]"
               >
                 Eliminar
               </Button>
             </div>
           </ModalBody>
         </ModalContent>
       </Modal>
   </div>
 );
}