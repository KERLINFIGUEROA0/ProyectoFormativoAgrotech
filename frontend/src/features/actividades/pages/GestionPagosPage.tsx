import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, Clock, Edit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { obtenerTodosPagos, actualizarPago } from '../api/actividadesapi';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';

// Actualizamos la interfaz para incluir 'responsable' en la actividad
interface Pago {
  id: number;
  idUsuario: number;
  idActividad: number;
  monto: number;
  horasTrabajadas: number;
  tarifaHora: number;
  descripcion: string;
  fechaPago: string;
  fechaCreacion: string;
  actividad: {
    id: number;
    titulo: string;
    fecha: string;
    // El usuario creador (puede ser instructor o admin)
    usuario?: {
      identificacion: number;
      nombre: string;
      apellidos: string;
    };
    // El responsable asignado (El Instructor encargado)
    responsable?: {
      identificacion: number;
      nombre: string;
      apellidos: string;
    };
  };
  // El usuario que recibe el pago (El Pasante/Aprendiz)
  usuario: {
    identificacion: number;
    nombre: string;
    apellidos: string;
    tipoUsuario: {
      nombre: string;
    };
  };
}

const GestionPagosPage: React.FC = () => {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    try {
      const data = await obtenerTodosPagos();
      setPagos(data);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      toast.error('Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEditarPago = (pago: Pago) => {
    setEditingPago(pago);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedPago: Partial<Pago>) => {
    if (!editingPago) return;

    try {
      const updateData: any = {};
      if (updatedPago.horasTrabajadas !== undefined) updateData.horasTrabajadas = Number(updatedPago.horasTrabajadas);
      if (updatedPago.tarifaHora !== undefined) updateData.tarifaHora = Number(updatedPago.tarifaHora);
      if (updatedPago.descripcion !== undefined) updateData.descripcion = updatedPago.descripcion;
      if (updatedPago.fechaPago !== undefined) updateData.fechaPago = updatedPago.fechaPago;

      await actualizarPago(editingPago.id, updateData);
      toast.success('Pago actualizado correctamente');
      setShowEditModal(false);
      setEditingPago(null);
      cargarPagos();
    } catch (error: any) {
      console.error('Error al actualizar pago:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar el pago');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Pagos</h1>
            <p className="text-blue-600 font-medium">Administración completa del sistema</p>
          </div>
        </div>
        <p className="text-gray-600 mt-2">
          Visualiza quién realizó el pago (Instructor) y quién lo recibió (Beneficiario).
        </p>
      </div>

      {/* Tabla de pagos */}
      <Card className="shadow-lg">
        <CardHeader className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Historial de Pagos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Mostrando todos los pagos del sistema
            </p>
          </div>
          <Button
            color="primary"
            startContent={<RefreshCw size={16} />}
            onPress={cargarPagos}
          >
            Actualizar
          </Button>
        </CardHeader>

        <CardBody>
          <Table aria-label="Tabla de pagos" className="min-h-[400px]">
            <TableHeader>
              <TableColumn>Instructor</TableColumn>
              <TableColumn>Pasante</TableColumn>
              <TableColumn>Actividad</TableColumn>
              <TableColumn>Fecha</TableColumn>
              <TableColumn>Horas</TableColumn>
              <TableColumn>Tarifa/Hora</TableColumn>
              <TableColumn>Monto</TableColumn>
              <TableColumn>Descripción</TableColumn>
              <TableColumn>Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent={"No hay pagos registrados"}>
              {pagos.map((pago) => {
                // El instructor es siempre quien creó/asignó la actividad (usuario)
                const instructorDisplay = pago.actividad?.usuario
                  ? `${pago.actividad.usuario.nombre} ${pago.actividad.usuario.apellidos}`
                  : 'No asignado';

                return (
                  <TableRow key={pago.id}>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {instructorDisplay}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {pago.usuario ? `${pago.usuario.nombre} ${pago.usuario.apellidos}` : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {pago.usuario?.tipoUsuario.nombre}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {pago.actividad.titulo}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {pago.actividad.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatDate(pago.fechaPago)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {pago.horasTrabajadas}h
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {formatCurrency(pago.tarifaHora)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(pago.monto)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {pago.descripcion}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => handleEditarPago(pago)}
                        title="Editar pago"
                      >
                        <Edit size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

        {/* Modal de edición de pago */}
        {showEditModal && editingPago && (
          <Modal isOpen={showEditModal} onOpenChange={() => {
            setShowEditModal(false);
            setEditingPago(null);
          }} size="md">
            <ModalContent>
              <ModalHeader>
                <h3 className="text-xl font-bold text-gray-800">Editar Información de Pago</h3>
              </ModalHeader>

              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Horas Trabajadas"
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={editingPago.horasTrabajadas.toString()}
                    onChange={(e) => {
                      const newHoras = parseFloat(e.target.value) || 0;
                      setEditingPago(prev => prev ? { ...prev, horasTrabajadas: newHoras } : null);
                    }}
                  />
                  <Input
                    label="Tarifa por Hora"
                    type="number"
                    min="0"
                    step="100"
                    defaultValue={editingPago.tarifaHora.toString()}
                    onChange={(e) => {
                      const newTarifa = parseFloat(e.target.value) || 0;
                      setEditingPago(prev => prev ? { ...prev, tarifaHora: newTarifa } : null);
                    }}
                  />
                  <Textarea
                    label="Descripción"
                    defaultValue={editingPago.descripcion}
                    onChange={(e) => {
                      const newDesc = e.target.value;
                      setEditingPago(prev => prev ? { ...prev, descripcion: newDesc } : null);
                    }}
                  />
                  <Input
                    label="Fecha de Pago"
                    type="date"
                    defaultValue={editingPago.fechaPago.split('T')[0]}
                    onChange={(e) => {
                      const newFecha = e.target.value;
                      setEditingPago(prev => prev ? { ...prev, fechaPago: newFecha } : null);
                    }}
                  />
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600 block">Nuevo Monto Total:</span>
                    <span className="text-xl font-bold text-green-600 block mt-1">
                      {formatCurrency((editingPago.horasTrabajadas || 0) * (editingPago.tarifaHora || 0))}
                    </span>
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button
                  variant="light"
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingPago(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 text-white font-bold hover:bg-green-700"
                  onPress={() => handleSaveEdit(editingPago)}
                >
                  Guardar Cambios
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </div>
  );
};

export default GestionPagosPage;