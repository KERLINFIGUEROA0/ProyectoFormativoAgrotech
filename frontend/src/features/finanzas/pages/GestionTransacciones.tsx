import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { obtenerTransacciones, crearTransaccion } from '../api/transaccionesApi'; // 👈 CAMBIO: Se importa crearTransaccion
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
      toast.error("Error al cargar las transacciones.");
    }
  };

  useEffect(() => { fetchData() }, []);

  const handleSave = async (data: TransaccionData) => {
    const toastId = toast.loading("Registrando transacción...");
    try {
      // 🔽 CAMBIO: Se utiliza la función de API en lugar del fetch manual
      await crearTransaccion(data);
      // 🔼 FIN DEL CAMBIO

      const successMessage = data.tipo === 'ingreso' ? "Venta registrada" : "Gasto registrado";
      toast.success(successMessage, { id: toastId });
      closeModal();
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Error al guardar la transacción";
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
        <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow">
          <FaPlus /> Nueva Transacción
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
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Precio Unitario</th>
              <th className="px-4 py-3 text-right">Valor Total</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransacciones.map((t) => (
              t && t.id && (
                <tr key={t.id} className="border-t hover:bg-blue-50">
                  <td className="px-4 py-3">{new Date(t.fecha).toLocaleDateString('es-ES')}</td>
                  <td className="px-4 py-3 font-medium">{t.descripcion}</td>
                  <td className="px-4 py-3">
                    {t.tipo && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        t.tipo === 'ingreso'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{t.cantidad}</td>
                  <td className="px-4 py-3 text-right">{currencyFormatter.format(t.precioUnitario || 0)}</td>
                  <td className="px-4 py-3 font-semibold text-right">
                    <span className={t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}>
                        {currencyFormatter.format(t.monto)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-3">
                    <button disabled className="text-red-300 cursor-not-allowed"><FaTrash /></button>
                  </td>
                </tr>
              )
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
    </div>
  );
}