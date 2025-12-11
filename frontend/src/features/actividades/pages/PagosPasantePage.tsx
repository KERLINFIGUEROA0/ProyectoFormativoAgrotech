import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, FileText, TrendingUp, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';
import { obtenerPagosUsuario, obtenerTodosPagos, actualizarPago } from '../api/actividadesapi';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import PermissionWrapper from '../../../components/PermissionWrapper';

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
    usuario?: {
      identificacion: number;
      nombre: string;
      apellidos: string;
    };
    responsable?: {
      identificacion: number;
      nombre: string;
      apellidos: string;
    };
  };
  usuario?: {
    identificacion: number;
    nombre: string;
    apellidos: string;
    tipoUsuario: {
      nombre: string;
    };
  };
}

const PagosPasantePage: React.FC = () => {
  const { userData, userPermissions, userModules } = useAuth();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPagos: 0,
    totalMonto: 0,
    promedioHora: 0,
    totalHoras: 0,
  });
  const [isInstructor, setIsInstructor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Determinar si es instructor/admin basado en permisos y módulos
    const esInstructor = (userPermissions && userPermissions.some(p =>
      p.includes('actividades') || p.includes('admin')
    )) || (userModules && userModules['Actividades'] && userModules['Actividades'].length > 0) || false;

    // También verificar por rol como fallback
    const rol = userData?.rolNombre?.toLowerCase();
    const esInstructorPorRol = rol === 'instructor';
    const esAdminPorRol = rol === 'admin' || rol === 'administrador';

    // Lógica simplificada basada en el rol del usuario
    if (rol === 'pasante') {
      setIsInstructor(false);
      setIsAdmin(false);
    } else if (rol === 'admin' || rol === 'administrador') {
      setIsInstructor(false);
      setIsAdmin(true);
    } else if (rol === 'instructor') {
      setIsInstructor(true);
      setIsAdmin(false);
    } else {
      // Fallback: si no hay rol claro, verificar permisos
      const tienePermisosInstructor = esInstructor || esInstructorPorRol;
      const tienePermisosAdmin = esAdminPorRol || (userPermissions && userPermissions.some(p => p.includes('admin'))) || false;
      setIsInstructor(tienePermisosInstructor);
      setIsAdmin(tienePermisosAdmin);
    }
  }, [userData, userPermissions, userModules]);

  // Segundo useEffect para cargar pagos después de que se seteen los estados
  useEffect(() => {
    const rol = userData?.rolNombre?.toLowerCase();
    const tieneAcceso = rol === 'pasante' || rol === 'instructor' || rol === 'admin' || rol === 'administrador';

    // Solo cargar pagos si tenemos acceso y los estados están definidos
    if (tieneAcceso && isInstructor !== undefined && isAdmin !== undefined) {
      cargarPagos();
    }
  }, [isInstructor, isAdmin, userData]);


  const cargarPagos = async () => {
    try {
      let responseData: { success: boolean; data: Pago[] };
      const rol = userData?.rolNombre?.toLowerCase();

      if (rol === 'admin' || rol === 'administrador' || rol === 'instructor') {
        // Administradores e instructores ven todos los pagos (cada uno según sus permisos en el backend)
        responseData = await obtenerTodosPagos();
      } else if (rol === 'pasante') {
        // Pasantes ven solo sus pagos
        if (!userData?.identificacion) {
          toast.error('No se pudo obtener la información del usuario');
          return;
        }
        responseData = await obtenerPagosUsuario(userData.identificacion);
      } else {
        // Usuario sin rol definido
        toast.error('Rol de usuario no reconocido');
        return;
      }

      const data = responseData.data || [];
      setPagos(data);

      // Calcular estadísticas
      const totalMonto = data.reduce((sum: number, pago: Pago) => sum + Number(pago.monto), 0);
      const totalHoras = data.reduce((sum: number, pago: Pago) => sum + Number(pago.horasTrabajadas), 0);
      const promedioHora = totalHoras > 0 ? totalMonto / totalHoras : 0;

      setStats({
        totalPagos: data.length,
        totalMonto,
        promedioHora,
        totalHoras,
      });
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
      cargarPagos(); // Recargar datos
    } catch (error: any) {
      console.error('Error al actualizar pago:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar el pago');
    }
  };

  // Verificar permisos antes de renderizar
  const rol = userData?.rolNombre?.toLowerCase();
  const tieneAcceso = rol === 'pasante' || rol === 'instructor' || rol === 'admin' || rol === 'administrador';


  if (!tieneAcceso) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PermissionWrapper module="Actividades" permission="VerPagos">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {(isAdmin || isInstructor) && (
            <>
            
                <DollarSign className="w-8 h-8 text-green-600" />
              
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Pagos</h1>
                <p className="text-blue-600 font-medium">
                  {isAdmin ? '' : 'Actividades que has asignado'}
                </p>
              </div>
            </>
          )}
          {!isAdmin && !isInstructor && (
            <>
                 <div>
                <h1 className="text-3xl font-bold text-gray-800">Mis Pagos</h1>
              </div>
            </>
          )}
        </div>
        <p className="text-gray-600 mt-2">
          {(isAdmin || isInstructor)
            ? 'Vista completa de pagos para gestión y edición.'
            : 'Historial de pagos por actividades realizadas.'
          }
        </p>
      </div>

      {/* Estadísticas solo para pasantes */}
      {!isAdmin && !isInstructor && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="rounded-lg shadow-md p-6 bg-green-50 border border-green-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mis Pagos</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalPagos}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg shadow-md p-6 bg-green-50 border border-green-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Recibido</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalMonto)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg shadow-md p-6 bg-green-50 border border-green-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mis Horas</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalHoras}h</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg shadow-md p-6 bg-green-50 border border-green-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Promedio/Hora</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.promedioHora)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de pagos */}
      <>
      <Card className="shadow-lg">
        <CardHeader className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Historial de Pagos</h2>
            <p className="text-sm text-gray-600 mt-1">
              {(isAdmin || isInstructor)
                ? 'Mostrando pagos para gestión y edición'
                : 'Mostrando tus pagos personales'
              }
            </p>
          </div>
        </CardHeader>

        <CardBody>
          <Table aria-label="Tabla de pagos" className="min-h-[400px]">
            <TableHeader>
              {isAdmin || isInstructor ? (
                <>
                  <TableColumn>Instructor</TableColumn>
                  <TableColumn>Pasante</TableColumn>
                  <TableColumn>Actividad</TableColumn>
                  <TableColumn>Fecha</TableColumn>
                  <TableColumn>Horas</TableColumn>
                  <TableColumn>Tarifa/Hora</TableColumn>
                  <TableColumn>Monto</TableColumn>
                  <TableColumn>Descripción</TableColumn>
                  <TableColumn>Acciones</TableColumn>
                </>
              ) : (
                <>
                  <TableColumn>Actividad</TableColumn>
                  <TableColumn>Fecha</TableColumn>
                  <TableColumn>Horas</TableColumn>
                  <TableColumn>Tarifa/Hora</TableColumn>
                  <TableColumn>Monto</TableColumn>
                  <TableColumn>Descripción</TableColumn>
                </>
              )}
            </TableHeader>
            <TableBody emptyContent={(isAdmin || isInstructor) ? "No hay pagos para gestionar" : "No hay pagos registrados"}>
              {pagos.map((pago) => (
                isAdmin || isInstructor ? (
                  <TableRow key={pago.id}>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {pago.actividad?.usuario ? `${pago.actividad.usuario.nombre} ${pago.actividad.usuario.apellidos}` : 'N/A'}
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
                      <span className="text-sm text-gray-900">
                        {formatDate(pago.fechaPago)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {pago.horasTrabajadas}h
                      </span>
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
                ) : (
                  <TableRow key={pago.id}>
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
                      <span className="text-sm text-gray-900">
                        {formatDate(pago.fechaPago)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {pago.horasTrabajadas}h
                      </span>
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
                  </TableRow>
                )
              ))}
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
                <h3 className="text-lg font-bold text-gray-800">Editar Información de Pago</h3>
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
      </>
    </div>
    </PermissionWrapper>
  );
};

export default PagosPasantePage;