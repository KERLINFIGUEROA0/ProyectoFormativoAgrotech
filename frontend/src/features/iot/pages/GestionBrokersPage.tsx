import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Globe, Power, PowerOff } from 'lucide-react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Chip
} from "@heroui/react";
import {
  listarBrokers,
  eliminarBroker,
  actualizarEstadoBroker,
} from '../api/mqttConfigApi';
import BrokerFormModal from '../components/BrokerFormModal';
import type { Broker } from '../interfaces/iot';

// --- Componente de Tarjeta de Broker ---
interface BrokerCardProps {
  broker: Broker;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEstado: () => void;
}

function BrokerCard({ broker, onEdit, onDelete, onToggleEstado }: BrokerCardProps) {
  const isActive = broker.estado === 'Activo';

  return (
    <Card className={`border-2 transition-all hover:shadow-md ${isActive ? 'border-green-500/20' : 'border-gray-200'}`}>
      <CardHeader className="flex justify-between items-start pb-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">{broker.nombre}</h3>
            <p className="text-small text-default-500">{`${broker.protocolo}${broker.host}:${broker.puerto}`}</p>
          </div>
        </div>
        <Chip
          color={isActive ? "success" : "warning"}
          variant="flat"
          size="sm"
          className="capitalize"
        >
          {broker.estado}
        </Chip>
      </CardHeader>

      <CardBody className="py-4">
        {/* Aquí se podría agregar más información si fuera necesario, como tópicos suscritos */}
        <p className="text-tiny text-gray-400 italic">ID: {broker.id}</p>
      </CardBody>

      <CardFooter className="flex justify-end gap-2 pt-0">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color={isActive ? "warning" : "success"}
          onPress={onToggleEstado}
          title={isActive ? 'Desactivar Broker' : 'Activar Broker'}
        >
          {isActive ? <PowerOff size={18} /> : <Power size={18} />}
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="primary"
          onPress={onEdit}
          title="Editar Broker"
        >
          <Edit size={18} />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="danger"
          onPress={onDelete}
          title="Eliminar Broker"
        >
          <Trash2 size={18} />
        </Button>
      </CardFooter>
    </Card>
  );
}

// --- Componente Principal ---
export default function GestionBrokersPage(): ReactElement {
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
        <Button
          onPress={() => openBrokerModal()}
          color="success"
          className="text-white shadow-md font-medium"
          endContent={<Plus size={20} />}
        >
          Nuevo Broker
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brokers.length > 0 ? (
          brokers.map(broker => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              onEdit={() => openBrokerModal(broker)}
              onDelete={() => handleDeleteBroker(broker)}
              onToggleEstado={() => handleToggleEstado(broker)}
            />
          ))
        ) : (
          <div className="col-span-full">
            <Card className="py-12 bg-gray-50 border-dashed border-2 border-gray-300 shadow-none">
              <CardBody className="text-center text-gray-400">
                <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No hay brokers configurados.</p>
                <p className="text-sm">Crea uno nuevo para comenzar a recibir datos.</p>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      <BrokerFormModal
        isOpen={isBrokerModalOpen}
        onClose={closeBrokerModal}
        onSuccess={fetchData}
        broker={editingBroker}
      />

      {/* Modal de Eliminación */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 items-center">
                <div className="p-3 bg-red-100 rounded-full mb-2">
                  <Trash2 className="text-red-500 w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">¿Eliminar broker?</h3>
              </ModalHeader>
              <ModalBody className="text-center">
                <p className="text-gray-500">
                  ¿Estás seguro que deseas eliminar el broker
                  <span className="font-bold text-gray-800 mx-1">{deletingBroker?.nombre}</span>?
                </p>
                <p className="text-small text-gray-400">Esta acción no se puede deshacer y se perderán las suscripciones asociadas.</p>
              </ModalBody>
              <ModalFooter className="justify-center">
                <Button color="default" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="danger" onPress={confirmDeleteBroker}>
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}