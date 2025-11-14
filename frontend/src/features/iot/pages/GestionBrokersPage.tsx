import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Globe, MoreVertical } from 'lucide-react';
import {
  listarBrokers,
  eliminarBroker,
} from '../api/mqttConfigApi';
import BrokerFormModal from '../components/BrokerFormModal';
import type { Broker } from '../interfaces/iot';

// --- Componente de Tarjeta de Broker ---
interface BrokerCardProps {
  broker: Broker;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function BrokerCard({ broker, isSelected, onSelect, onEdit, onDelete }: BrokerCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected ? 'bg-green-50 border-green-500 shadow-lg' : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isSelected ? 'bg-green-200' : 'bg-gray-100'}`}>
            <Globe className={`w-6 h-6 ${isSelected ? 'text-green-700' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">{broker.nombre}</h3>
            <p className="text-sm text-gray-500">{`${broker.protocolo}${broker.host}:${broker.puerto}`}</p>
          </div>
        </div>
        <div className="flex-shrink-0 relative">
          <MoreVertical size={20} className="text-gray-400" />
          {/* Aquí se podrían poner los botones de editar/borrar en un dropdown */}
        </div>
      </div>
      <div className="mt-4 flex justify-end items-center">
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full" title="Editar Broker">
            <Edit size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full" title="Eliminar Broker">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal ---
export default function GestionBrokersPage(): ReactElement {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);

  const fetchData = async () => {
    try {
      const data = await listarBrokers();
      setBrokers(data || []);
    } catch (error) {
      toast.error("Error al cargar las configuraciones de brokers.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const handleDeleteBroker = (broker: Broker) => {
    toast.warning(`¿Eliminar el broker "${broker.nombre}"?`, {
      description: 'Esto eliminará también todos sus tópicos suscritos.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const toastId = toast.loading("Eliminando broker...");
          try {
            await eliminarBroker(broker.id);
            toast.success("Broker eliminado.", { id: toastId });
            await fetchData();
          } catch (error) {
            toast.error("No se pudo eliminar el broker.", { id: toastId });
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }, // ✅ CORRECCIÓN AQUÍ
    });
  };

  const openBrokerModal = (broker: Broker | null = null) => {
    setEditingBroker(broker);
    setIsBrokerModalOpen(true);
  };
  const closeBrokerModal = () => {
    setIsBrokerModalOpen(false);
    setEditingBroker(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Configuración de Brokers MQTT</h1>
        <button onClick={() => openBrokerModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow">
          <Plus /> Nuevo Broker
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brokers.length > 0 ? (
          brokers.map(broker => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              isSelected={false}
              onSelect={() => {}}
              onEdit={() => openBrokerModal(broker)}
              onDelete={() => handleDeleteBroker(broker)}
            />
          ))
        ) : (
          <div className="col-span-full">
            <p className="text-gray-500 text-center py-8">No hay brokers configurados. Crea uno nuevo para comenzar.</p>
          </div>
        )}
      </div>

      <BrokerFormModal
        isOpen={isBrokerModalOpen}
        onClose={closeBrokerModal}
        onSuccess={fetchData}
        broker={editingBroker}
      />
    </div>
  );
}