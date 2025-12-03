import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, Clock, FileText, Edit, RefreshCw, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';
import { obtenerTodosPagos, actualizarPago } from '../api/actividadesapi';

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
  const { userData } = useAuth();
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
      if (updatedPago.horasTrabajadas !== undefined) updateData.horasTrabajadas = updatedPago.horasTrabajadas;
      if (updatedPago.tarifaHora !== undefined) updateData.tarifaHora = updatedPago.tarifaHora;
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
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Historial de Pagos</h2>
              <p className="text-sm text-gray-600 mt-1">
                Mostrando todos los pagos del sistema
              </p>
            </div>
            <button
              onClick={cargarPagos}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>
        </div>

        {pagos.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No hay pagos registrados
            </h3>
            <p className="text-gray-500">
              Los pagos aparecerán aquí cuando se registren en el sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {/* Columna explícita para el Beneficiario */}
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      Beneficiario (Aprendiz)
                    </div>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actividad
                  </th>

                  {/* Columna explícita para el Instructor */}
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <UserCheck size={14} />
                      Instructor Responsable
                    </div>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Horas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Tarifa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagos.map((pago) => {
                  // El instructor es quien creó/asignó la actividad (usuario)
                  const nombreInstructor = pago.actividad.usuario
                    ? `${pago.actividad.usuario.nombre} ${pago.actividad.usuario.apellidos}`
                    : 'No asignado';

                  return (
                    <tr key={pago.id} className="hover:bg-gray-50 transition-colors">

                      {/* 1. BENEFICIARIO (El que recibe el pago - pago.usuario) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {pago.usuario.nombre} {pago.usuario.apellidos}
                          </span>
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1">
                            {pago.usuario.tipoUsuario.nombre}
                          </span>
                        </div>
                      </td>

                      {/* 2. ACTIVIDAD */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {pago.actividad.titulo}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]" title={pago.descripcion}>
                          {pago.descripcion}
                        </div>
                      </td>

                      {/* 3. INSTRUCTOR (El que gestiona la actividad) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-800 font-medium">
                          {nombreInstructor}
                        </div>
                        <div className="text-xs text-gray-500">
                          Responsable
                        </div>
                      </td>

                      {/* OTROS DATOS */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {formatDate(pago.fechaPago)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 font-medium bg-gray-100 px-2 py-1 rounded">
                            {pago.horasTrabajadas}h
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(pago.tarifaHora)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                          {formatCurrency(pago.monto)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditarPago(pago)}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full p-2 transition-all"
                          title="Editar pago"
                        >
                          <Edit size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de edición de pago */}
        {showEditModal && editingPago && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md transform transition-all">
              <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Editar Información de Pago</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horas Trabajadas
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={editingPago.horasTrabajadas}
                    onChange={(e) => {
                      const newHoras = parseFloat(e.target.value) || 0;
                      setEditingPago(prev => prev ? { ...prev, horasTrabajadas: newHoras } : null);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarifa por Hora
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    defaultValue={editingPago.tarifaHora}
                    onChange={(e) => {
                      const newTarifa = parseFloat(e.target.value) || 0;
                      setEditingPago(prev => prev ? { ...prev, tarifaHora: newTarifa } : null);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    defaultValue={editingPago.descripcion}
                    onChange={(e) => {
                      const newDesc = e.target.value;
                      setEditingPago(prev => prev ? { ...prev, descripcion: newDesc } : null);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    defaultValue={editingPago.fechaPago.split('T')[0]}
                    onChange={(e) => {
                      const newFecha = e.target.value;
                      setEditingPago(prev => prev ? { ...prev, fechaPago: newFecha } : null);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600 block">Nuevo Monto Total:</span>
                  <span className="text-xl font-bold text-green-600 block mt-1">
                    {formatCurrency((editingPago.horasTrabajadas || 0) * (editingPago.tarifaHora || 0))}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPago(null);
                  }}
                  className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveEdit(editingPago)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionPagosPage;