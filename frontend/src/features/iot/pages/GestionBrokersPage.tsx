import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Globe, MoreVertical, Power, PowerOff } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import {
  listarBrokers,
  eliminarBroker,
  actualizarEstadoBroker,
} from '../api/mqttConfigApi';
import BrokerFormModal from '../components/BrokerFormModal';
import type { Broker } from '../interfaces/iot';
import { Button } from "@heroui/react";
import PermissionWrapper from "../../../components/PermissionWrapper";
import { usePermissionGuard } from '../../../hooks/usePermissionGuard';

// --- Componente de Tarjeta de Broker ---
interface BrokerCardProps {
  broker: Broker;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEstado: () => void;
}

function BrokerCard({ broker, isSelected, onSelect, onEdit, onDelete, onToggleEstado }: BrokerCardProps) {
  const isActive = broker.estado === 'Activo';

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-green-50 border-green-500 shadow-lg' : 'bg-white border-gray-200 hover:shadow-md'
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
            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {broker.estado}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 relative">
          <MoreVertical size={20} className="text-gray-400" />
          {/* Aquí se podrían poner los botones de editar/borrar en un dropdown */}
        </div>
      </div>
      <div className="mt-4 flex justify-end items-center">
        <div className="flex gap-2">
          <PermissionWrapper module="Iot" permission="Editar">
            <button onClick={(e) => { e.stopPropagation(); onToggleEstado(); }} className={`p-1.5 rounded-full ${isActive ? 'text-yellow-500 hover:bg-yellow-100' : 'text-green-500 hover:bg-green-100'}`} title={isActive ? 'Desactivar Broker' : 'Activar Broker'}>
              {isActive ? <PowerOff size={16} /> : <Power size={16} />}
            </button>
          </PermissionWrapper>
          <PermissionWrapper module="Iot" permission="Editar">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full" title="Editar Broker">
              <Edit size={16} />
            </button>
          </PermissionWrapper>
          <PermissionWrapper module="Iot" permission="Eliminar">
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full" title="Eliminar Broker">
              <Trash2 size={16} />
            </button>
          </PermissionWrapper>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal ---
export default function GestionBrokersPage(): ReactElement {
  // Protección de permisos en tiempo real
  usePermissionGuard({ module: 'Iot' });

  const [brokers, setBrokers] = useState<Broker[]>([]);

  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingBroker, setDeletingBroker] = useState<Broker | null>(null);

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
    setDeletingBroker(broker);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBroker = async () => {
    if (!deletingBroker) return;

    const toastId = toast.loading("Eliminando broker...");
    try {
      await eliminarBroker(deletingBroker.id);
      toast.success("Broker eliminado.", { id: toastId });
      await fetchData();
      setIsDeleteModalOpen(false);
      setDeletingBroker(null);
    } catch (error) {
      toast.error("No se pudo eliminar el broker.", { id: toastId });
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingBroker(null);
  };

  const handleToggleEstado = async (broker: Broker) => {
    const nuevoEstado = broker.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const toastId = toast.loading(`Cambiando estado del broker...`);
    try {
      await actualizarEstadoBroker(broker.id, nuevoEstado);
      toast.success(`Broker ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'} correctamente.`, { id: toastId });
      await fetchData();
    } catch (error) {
      toast.error("No se pudo cambiar el estado del broker.", { id: toastId });
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Configuración de Brokers </h1>
        <PermissionWrapper module="Iot" permission="Crear">
          <button onClick={() => openBrokerModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow">
            <Plus /> Nuevo Broker
          </button>
        </PermissionWrapper>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brokers.length > 0 ? (
          brokers.map(broker => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              isSelected={false}
              onSelect={() => { }}
              onEdit={() => openBrokerModal(broker)}
              onDelete={() => handleDeleteBroker(broker)}
              onToggleEstado={() => handleToggleEstado(broker)}
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

      {isDeleteModalOpen && deletingBroker && (
        <Modal isOpen={isDeleteModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDeleteModalOpen(false);
            setDeletingBroker(null);
          }
        }}>
          <ModalContent>
            <ModalHeader className="flex flex-col items-center justify-center text-center pb-2">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <h4 className="text-lg font-semibold text-center">¿Eliminar broker?</h4>
              </div>
            </ModalHeader>
            <ModalBody className="text-center">
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 mx-auto max-w-xs">
                <div className="font-medium">{deletingBroker.nombre}</div>
                <div className="text-xs text-gray-500 mt-1">Broker MQTT</div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Esta acción no se puede deshacer. Se eliminará permanentemente el broker y todos sus tópicos suscritos.</p>
              <div className="flex gap-3 mt-4 w-full justify-center">
                <Button
                  onClick={closeDeleteModal}
                  color="default"
                  variant="light"
                  className="flex-1 max-w-[120px]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDeleteBroker}
                  color="danger"
                  className="flex-1 max-w-[120px]"
                >
                  Eliminar
                </Button>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}