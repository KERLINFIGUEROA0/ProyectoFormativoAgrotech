import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { obtenerTransacciones } from '../api/transaccionesApi';
import Modal from '../../../components/Modal';
import TransaccionForm from '../components/TransaccionForm';
import type { Transaccion, TransaccionData } from '../interfaces/finanzas';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function GestionTransaccionesPage(): ReactElement {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const transRes = await obtenerTransacciones();
      setTransacciones(transRes.data || []);
    } catch (error) {
      toast.error("Error al cargar las ventas.");
    }
  };

  useEffect(() => { fetchData() }, []);

  const handleSave = async (data: TransaccionData) => {
    const toastId = toast.loading("Registrando venta...");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/finanzas/transacciones`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
      });
      
      // --- INICIO DE LA CORRECCIÓN ---
      // Verificamos si la respuesta del servidor no fue exitosa (ej. error 400 o 500)
      if (!response.ok) {
          // Si no fue exitosa, leemos el cuerpo del error como JSON
          const errorData = await response.json();
          // Lanzamos un nuevo error con el mensaje que nos dio el backend
          throw new Error(errorData.message || 'Error del servidor');
      }
      // --- FIN DE LA CORRECCIÓN ---

      toast.success("Venta registrada con éxito", { id: toastId });
      closeModal();
      fetchData();
    } catch (error: any) {
      // Ahora el 'catch' recibirá el error con el mensaje correcto del backend
      const errorMessage = error.message || "Error al guardar la venta";
      // Si el mensaje es un array (como a veces envía NestJS), lo unimos
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
        <h1 className="text-2xl font-bold text-gray-700">Gestión de Ventas</h1>
        <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow">
          <FaPlus /> Nueva Venta
        </button>
      </div>
      <input 
        type="text" 
        placeholder="Buscar por descripción..." 
        className="border border-gray-300 rounded-lg px-4 py-2 w-72 mb-4"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <div className="overflow-auto flex-grow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Precio Unitario</th>
              <th className="px-4 py-3 text-right">Valor Total</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransacciones.map((t) => (
              <tr key={t.id} className="border-t hover:bg-blue-50">
                <td className="px-4 py-3">{new Date(t.fecha).toLocaleDateString('es-ES')}</td>
                <td className="px-4 py-3 font-medium">{t.descripcion}</td>
                <td className="px-4 py-3 text-right">{t.cantidad}</td>
                <td className="px-4 py-3 text-right">{currencyFormatter.format(t.precioUnitario || 0)}</td>
                <td className="px-4 py-3 font-semibold text-right text-green-600">
                  {currencyFormatter.format(t.monto)}
                </td>
                <td className="px-4 py-3 text-center flex justify-center gap-3">
                  <button disabled className="text-red-300 cursor-not-allowed"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title={'Nueva Venta'}>
          <TransaccionForm 
              onSave={handleSave}
              onCancel={closeModal}
          />
      </Modal>
    </div>
  );
}