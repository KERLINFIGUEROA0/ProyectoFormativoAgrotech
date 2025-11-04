import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { FaPlus, FaTrash, FaDownload, FaArrowUp, FaArrowDown, FaFileExcel } from 'react-icons/fa';
import { obtenerTransacciones, eliminarTransaccion } from '../api/transaccionesApi';
import { exportarExcelCultivo } from '../api/excelApi';
import Modal from '../../../components/Modal';
import TransaccionForm from '../components/TransaccionForm';
import type { Transaccion, TransaccionData } from '../interfaces/finanzas';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const API_URL = import.meta.env.VITE_BACKEND_URL;

interface Cultivo {
  id: number;
  nombre: string;
}

export default function GestionTransaccionesPage(): ReactElement {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: { id: number; tipo: string } | null }>({ isOpen: false, item: null });
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [selectedCultivoId, setSelectedCultivoId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const transRes = await obtenerTransacciones();

      const transacciones = (transRes.data || []).map((t: any) => ({
        ...t,
        tipo: t.tipo || 'ingreso',
        cantidad: t.cantidad || 1,
        precioUnitario: t.precioUnitario || t.monto,
      }));

      setTransacciones(transacciones);
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

  const handleDelete = (id: number, tipo: string) => {
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
          <button
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm text-sm hover:bg-blue-700"
          >
            <FaFileExcel /> Exportar Excel
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm text-sm hover:bg-green-700"
          >
            <FaPlus /> Nueva Venta
          </button>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 w-64"
          value={selectedCultivoId || ''}
          onChange={(e) => setSelectedCultivoId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Seleccionar Cultivo</option>
          {cultivos.map(cultivo => (
            <option key={cultivo.id} value={cultivo.id}>
              {cultivo.nombre}
            </option>
          ))}
        </select>

        <input 
          type="text" 
          placeholder="Buscar por descripción..." 
          className="border border-gray-300 rounded-lg px-4 py-2 w-72"
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
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Precio Unitario</th>
              <th className="px-4 py-3 text-right">Valor Total</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransacciones.map((t, index) => (
              <tr key={t.id} className={`border-t transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 hover:shadow-sm`}>
                <td className="px-4 py-3">{new Date(t.fecha).toLocaleDateString('es-ES')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    t.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {t.tipo === 'ingreso' ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                    {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{t.descripcion}</td>
                <td className="px-4 py-3 text-right">{t.cantidad}</td>
                <td className="px-4 py-3 text-right">{currencyFormatter.format(t.precioUnitario || 0)}</td>
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
       <Modal isOpen={isModalOpen} onClose={closeModal} title={''}>
           <TransaccionForm
               onSave={handleSave}
               onCancel={closeModal}
           />
       </Modal>

       <Modal isOpen={deleteModal.isOpen} onClose={cancelDelete} title="Confirmar Eliminación">
         <p className="text-center mb-4">
           ¿Estás seguro de que quieres eliminar esta {deleteModal.item?.tipo === 'ingreso' ? 'venta' : 'gasto'}?
         </p>
         <div className="flex justify-center gap-4">
           <button
             onClick={cancelDelete}
             className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
           >
             Cancelar
           </button>
           <button
             onClick={confirmDelete}
             className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
           >
             Eliminar
           </button>
         </div>
       </Modal>
   </div>
 );
}