// --- MODIFICACIÓN: Añadir 'DollarSign' ---
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList,
  Loader2,
  CheckCircle,
  Calendar,
  User,
  Bell,
  Package,
  Users,
  DollarSign, // <-- AÑADIDO
  Trash2, // <-- AÑADIDO para el modal de eliminación
} from 'lucide-react';

import ActividadCard from '../components/ActividadCard';
import FormularioActividad from '../components/FormularioActividad';
import ModalResponderActividad from '../components/ModalResponderActividad';
import ModalVerRespuestas from '../components/ModalVerRespuestas';
import ModalPagoPasante from '../components/ModalPagoPasante';
import { useAuth } from '../../../context/AuthContext';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Select, SelectItem, Card,CardBody } from '@heroui/react';
import PermissionWrapper from '../../../components/PermissionWrapper';
import type {
  Actividad,
  UpdateActividadPayload,
  EstadoActividad,
  UsuarioSimple,
  CultivoSimple,
} from '../interfaces/actividades';
import {
  listarActividades,
  registrarActividad,
  actualizarActividad,
  eliminarActividad,
  obtenerUsuariosParaActividades,
  obtenerCultivosParaActividades,
} from '../api/actividadesapi';
import { getEstadoTexto } from '../utils/estadoUtils';
// ✅ IMPORTAR HELPER DE FECHAS
import { formatDateOnly } from '../../../utils/dateUtils.ts';

// --- INICIO: Componente ModalDetalles (MODIFICADO) ---
interface ModalDetallesProps {
  actividad: Actividad | null;
  onClose: () => void;
  onEdit: (actividad: Actividad) => void;
}

const ModalDetalles: React.FC<ModalDetallesProps> = ({
  actividad,
  onClose,
}) => {
  // Lógica de 'aprendicesAsignados' usando el campo asignados
  const aprendicesAsignados: UsuarioSimple[] = useMemo(() => {
    if (!actividad) return [];

    // Si el backend ya incluye usuariosAsignados con ficha, usar eso
    if (actividad.usuariosAsignados && actividad.usuariosAsignados.length > 0) {
      return actividad.usuariosAsignados;
    }

    // Crear un mapa de usuarios por nombre completo para acceder a la ficha
    if (!actividad) return [];

    // Crear un mapa de usuarios por nombre completo para acceder a la ficha
    const usuariosMap = new Map<string, any>();
    actividad.respuestas?.forEach(respuesta => {
      const nombreCompleto = `${respuesta.usuario.nombre} ${respuesta.usuario.apellidos}`.trim();
      usuariosMap.set(nombreCompleto, respuesta.usuario);
    });

    try {
      if (actividad.asignados) {
        // Si hay asignados guardados, intentar parsear y crear objetos UsuarioSimple
        const nombres = JSON.parse(actividad.asignados);
        return nombres.map((nombre: string, index: number) => {
          // Buscar el usuario real por nombre para obtener la ficha
          const usuarioReal = usuariosMap.get(nombre.trim());
          if (usuarioReal) {
            return usuarioReal;
          }
          // Fallback: crear usuario temporal sin ficha
          return {
            id: index + 1, // ID temporal
            identificacion: index + 1, // Identificación temporal
            nombre: nombre.split(' ')[0] || 'Usuario',
            apellidos: nombre.split(' ').slice(1).join(' ') || '',
            ficha: null
          };
        });
      }
    } catch {
      // Si falla el parseo, usar respuestas como fallback
    }
    // Fallback: usar respuestas si no hay asignados
    return actividad.respuestas?.map(r => r.usuario) || [];
  }, [actividad]);

  if (!actividad) return null;

  // (Lógica de parsear 'imagenes' sin cambios)
  let imagenes: string[] = [];
  if (actividad.img) {
    try {
      const parsedImgs = JSON.parse(actividad.img);
      if (Array.isArray(parsedImgs)) {
        imagenes = parsedImgs;
      } else if (typeof parsedImgs === 'string') {
        imagenes = [parsedImgs];
      }
    } catch (e) {
      if (typeof actividad.img === 'string') {
        imagenes = [actividad.img];
      }
    }
  }

  const estadoTexto = getEstadoTexto(actividad.estado);
  const fechaProgramada = formatDateOnly(actividad.fecha);

  // --- INICIO DE CORRECCIÓN: Lógica de Costos y Pago ---
  const costoManoDeObra = actividad.costoManoObra ?? ((actividad.totalHoras || actividad.horas || 0) * (actividad.promedioTarifa || actividad.tarifaHora || 0));
  // Basamos el estado del pago en el estado de la actividad
  const estadoPago = actividad.estado === 'completado' ? 'Pagado' : 'Pendiente de Pago';
  const colorEstadoPago = actividad.estado === 'completado' ? 'text-green-600' : 'text-yellow-600';
  // --- FIN DE CORRECCIÓN ---

  return (
    <Modal isOpen={!!actividad} onOpenChange={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent className="overflow-hidden rounded-xl shadow-2xl border border-gray-100">
        <ModalHeader className={`flex justify-between items-center text-white font-bold py-5 px-6
          ${actividad.estado === 'completado'
            ? 'bg-green-600'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{actividad.titulo}</h2>
          </div>
          <span className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full bg-white/90 text-gray-800 shadow-sm backdrop-blur-sm">
            {estadoTexto}
          </span>
        </ModalHeader>
        <ModalBody className="p-6 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda: Detalles */}
            <div className="space-y-4">
              {/* Información Básica */}
              <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2">Información Básica</h3>
                <p className="text-sm flex items-center gap-2 text-gray-600">
                  <ClipboardList size={16} className="text-blue-500" />
                  <span className="font-semibold text-gray-900">Actividad:</span> {actividad.titulo}
                </p>
                <p className="text-sm flex items-center gap-2 text-gray-600">
                  <User size={16} className="text-blue-500" />
                  <span className="font-semibold text-gray-900">Cultivo/Lote:</span>
                  {actividad.cultivo?.nombre || 'No especificado'}
                </p>
                <p className="text-sm flex items-center gap-2 text-gray-600">
                  <Calendar size={16} className="text-blue-500" />
                  <span className="font-semibold text-gray-900">Fecha Programada:</span> {fechaProgramada}
                </p>
              </div>

              {/* Aprendices Asignados */}
              <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                  <Users size={18} className="text-blue-500" /> Aprendices Asignados
                </h3>
                {aprendicesAsignados.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                          <th className="px-3 py-2 rounded-tl-lg">Nombre</th>
                          <th className="px-3 py-2">Apellidos</th>
                          <th className="px-3 py-2 rounded-tr-lg">Ficha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {aprendicesAsignados.map((user) => (
                          <tr key={user.identificacion}>
                            <td className="px-3 py-2">{user.nombre}</td>
                            <td className="px-3 py-2">{user.apellidos}</td>
                            <td className="px-3 py-2">{user.ficha?.id_ficha || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No asignado</p>
                )}
              </div>

              {/* Materiales Utilizados */}
              <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                  <Package size={18} className="text-blue-500" /> Materiales Utilizados
                </h3>
                 {actividad.actividadMaterial && actividad.actividadMaterial.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                       <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                          <th className="px-3 py-2 rounded-tl-lg">Material</th>
                          <th className="px-3 py-2 rounded-tr-lg">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {actividad.actividadMaterial.map((item, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2">{item.material.nombre}</td>
                              <td className="px-3 py-2 font-medium">{`${Math.round(item.cantidadUsada)} ${String(item.unidadMedida) || 'unidades'}`}</td>
                            </tr>
                         ))}
                      </tbody>
                    </table>
                  </div>
                 ) : <p className="text-gray-500 text-sm italic">No se registraron materiales.</p>}
              </div>

              {/* Costo Mano de Obra */}
              <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                  <DollarSign size={18} className="text-blue-500" /> Costo Mano de Obra
                </h3>
                 {costoManoDeObra > 0 ? (
                    <table className="min-w-full text-left text-sm">
                      <tbody className="divide-y divide-gray-100">
                         <tr><td className="px-3 py-2 text-gray-600">Total:</td><td className="px-3 py-2 font-bold">${new Intl.NumberFormat('es-CO').format(costoManoDeObra)}</td></tr>
                         <tr><td className="px-3 py-2 text-gray-600">Estado:</td><td className={`px-3 py-2 font-bold ${colorEstadoPago}`}>{estadoPago}</td></tr>
                      </tbody>
                    </table>
                 ) : <p className="text-gray-500 text-sm italic">No se registraron costos.</p>}
              </div>

            </div>

            {/* Columna Derecha: Descripción e Imágenes */}
            <div className="space-y-4">
              {/* Descripción */}
              <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm h-fit">
                <h3 className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">
                  Descripción Completa
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {actividad.descripcion || 'No hay descripción detallada.'}
                </p>
              </div>

              {/* Sección de Imágenes */}
              {imagenes.length > 0 && (
                <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">
                    Imágenes de la Actividad
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {imagenes.map((img: string, index: number) => (
                      <div key={index} className="relative group overflow-hidden rounded-lg border border-gray-100 shadow-sm">
                        <img
                          src={`${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${img}`}
                          alt={`Evidencia ${index + 1}`}
                          className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
// --- FIN: Componente ModalDetalles ---

// ... (El resto del archivo 'GestionActividadesPage' continúa igual) ...
// Componente StatCard rediseñado: más pequeño y horizontal
const StatCard = ({ title, value, icon, colorClass }: any) => (
  <Card className="shadow-sm hover:shadow-md transition-all duration-200 border border-green-200 hover:border-green-400 w-full">
    <CardBody className="p-4 overflow-visible">
      <div className="flex items-center gap-4">
        {/* 1. EL ICONO (Izquierda) */}
        <div className={`p-3 rounded-full shrink-0 ${colorClass} bg-opacity-20`}>
          {/* Aseguramos que el ícono tenga un tamaño consistente */}
          {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 2.5 } as any)}
        </div>

        {/* 2. TEXTO Y NÚMERO (Derecha, uno al lado del otro o apilados compactamente) */}
        <div className="flex flex-col justify-center">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-0.5">
            {title}
          </p>
          <p className="font-extrabold text-2xl text-gray-800 leading-none">
            {value}
          </p>
        </div>
      </div>
    </CardBody>
  </Card>
);

const GestionActividadesPage: React.FC = () => {
  const { userData } = useAuth();
  const currentUserRole = userData?.rolNombre;
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [, setUsuarios] = useState<UsuarioSimple[]>([]);
  const [cultivos, setCultivos] = useState<CultivoSimple[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoActividad | 'Todos'>(
    'Todos',
  );

  const [cargando, setCargando] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actividadAEditar, setActividadAEditar] =
    useState<Partial<Actividad> | null>(null);

  const [actividadAVer, setActividadAVer] = useState<Actividad | null>(null);
  const [actividadAResponder, setActividadAResponder] = useState<Actividad | null>(null);
  const [actividadVerRespuestas, setActividadVerRespuestas] = useState<Actividad | null>(null);
  const [respuestasKey, setRespuestasKey] = useState(0); // Para forzar recarga del modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actividadToDelete, setActividadToDelete] = useState<Actividad | null>(null);

  // Estados para el modal de pago de pasantes
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [actividadPago, setActividadPago] = useState<Actividad | null>(null);
  const [pasantesPago, setPasantesPago] = useState<Array<{
    identificacion: number;
    nombre: string;
    apellidos: string;
  }>>([]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [actividadesData, usuariosData, cultivosData] = await Promise.all([
        listarActividades(),
        obtenerUsuariosParaActividades(),
        obtenerCultivosParaActividades(),
      ]);

      setActividades(actividadesData || []);
      setUsuarios(usuariosData || []);
      setCultivos(cultivosData || []);
    } catch (err) {
      toast.error('No se pudieron cargar los datos necesarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // (mostrarNotificacionesPendientes sin cambios)
  const mostrarNotificacionesPendientes = useCallback(() => {
    if (!userData || !actividades.length) return;
    const actividadesPendientesUsuario = actividades.filter(act =>
      act.estado === 'pendiente' &&
      true // Por ahora, mostrar todas las actividades
    );
    if (actividadesPendientesUsuario.length > 0) {
      toast.warning(
        `Tienes ${actividadesPendientesUsuario.length} actividad(es) pendiente(s) por completar.`,
        {
          description: 'Ve a la sección de actividades para ver los detalles.',
          duration: 10000,
          position: 'top-right',
        }
      );
    }
  }, [actividades, userData]);

  useEffect(() => {
    if (!cargando && actividades.length > 0) {
      mostrarNotificacionesPendientes();
    }
  }, [cargando, actividades, mostrarNotificacionesPendientes]);

  // (Lógica de modales sin cambios)
  const handleOpenEditModal = (actividad?: Actividad) => {
    setActividadAVer(null);
    setActividadAEditar(actividad || {});
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setActividadAEditar(null);
  };
  const handleViewDetails = (actividad: Actividad) => {
    setActividadAVer(actividad);
  };
  const handleCloseDetailsModal = () => {
    setActividadAVer(null);
  };

  const handleResponder = (actividad: Actividad) => {
    setActividadAResponder(actividad);
  };

  const handleCloseResponderModal = () => {
    setActividadAResponder(null);
  };

  const handleVerRespuestas = (actividad: Actividad) => {
    setActividadVerRespuestas(actividad);
  };

  const handleCloseVerRespuestasModal = () => {
     setActividadVerRespuestas(null);
   };

  // Función para abrir el modal de pago de pasantes
  const handleAbrirPago = (actividad: Actividad, pasantes: Array<{
    identificacion: number;
    nombre: string;
    apellidos: string;
  }>) => {
    setActividadPago(actividad);
    setPasantesPago(pasantes);
    setShowPagoModal(true);
  };

  // (handleSave sin cambios)
  const handleSave = async (payload: FormData | UpdateActividadPayload) => {
    const isEditing = actividadAEditar && actividadAEditar.id;
    const toastId = toast.loading(isEditing ? 'Actualizando...' : 'Creando...');
    try {
      if (isEditing) {
        await actualizarActividad(
          actividadAEditar.id!,
          payload as UpdateActividadPayload,
        );
      } else {
        await registrarActividad(payload as FormData);
      }
      toast.success('Actividad guardada', { id: toastId });
      handleCloseEditModal();
      await cargarDatos();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al guardar la actividad.';
      toast.error(errorMsg, { id: toastId });
    }
  };

  // (handleDeleteClick - abre el modal de eliminación)
  const handleDeleteClick = (id: number) => {
    const actividad = actividades.find(a => a.id === id);
    if (actividad) {
      setActividadToDelete(actividad);
      setShowDeleteModal(true);
    }
  };

  // (handleDeleteConfirm - confirma la eliminación)
  const handleDeleteConfirm = async () => {
    if (!actividadToDelete) return;

    try {
      await eliminarActividad(actividadToDelete.id);
      toast.success('Actividad eliminada exitosamente');
      cargarDatos();
      setShowDeleteModal(false);
      setActividadToDelete(null);
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al eliminar la actividad';
      toast.error(errorMessage);
      setShowDeleteModal(false);
      setActividadToDelete(null);
    }
  };

  // (handleDeleteCancel - cancela la eliminación)
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setActividadToDelete(null);
  };

  // (stats y filteredActividades sin cambios)
  const stats = useMemo(() => {
    return {
      pendientes: actividades.filter((a) => a.estado === 'pendiente').length,
      enProceso: actividades.filter((a) => a.estado === 'en proceso').length,
      completadas: actividades.filter((a) => a.estado === 'completado').length,
    };
  }, [actividades]);

  const filteredActividades = useMemo(() => {
    if (filtroEstado === 'Todos') return actividades;
    return actividades.filter((a) => a.estado === filtroEstado);
  }, [actividades, filtroEstado]);


  // (JSX principal sin cambios)
  if (cargando)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );

  return (
    <PermissionWrapper module="Actividades" permission="Ver">
      <div className="p-6 bg-gray-50 min-h-full space-y-6">
        {/* (Cabecera y botones sin cambios) */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Gestión de Actividades
          </h1>
          <div className="flex items-center gap-2">
            <Button
              className="bg-transparent p-3 border-none"
              onClick={mostrarNotificacionesPendientes}
              title="Mostrar notificaciones de actividades pendientes"
            >
              <Bell className="w-6 h-6 text-black animate-bounce" />
            </Button>
          </div>
        </div>

      {/* (Stats sin cambios) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pendientes"
          value={stats.pendientes}
          icon={<ClipboardList />}
          colorClass="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="En Proceso"
          value={stats.enProceso}
          icon={<Loader2 className="animate-spin" />}
          colorClass="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          title="Completadas"
          value={stats.completadas}
          icon={<CheckCircle />}
          colorClass="bg-green-100 text-green-700"
        />
      </div>

      {/* (Lista de actividades sin cambios) */}
      <div className="bg-white shadow-xl rounded-xl p-6 w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-600">
            Lista de Actividades
          </h2>
          <Select
            placeholder="Todos los estados"
            selectedKeys={[filtroEstado]}
            onSelectionChange={(keys) => setFiltroEstado(Array.from(keys)[0] as EstadoActividad | 'Todos')}
            className="w-full"
          >
            <SelectItem key="Todos">Todos los estados</SelectItem>
            <SelectItem key="pendiente">Pendiente</SelectItem>
            <SelectItem key="en proceso">En Proceso</SelectItem>
            <SelectItem key="completado">Completado</SelectItem>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredActividades.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 py-8">
              No hay actividades con el filtro seleccionado.
            </p>
          ) : (
            filteredActividades.map((act) => (
              <ActividadCard
                key={act.id}
                actividad={act}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteClick}
                onView={handleViewDetails}
                onResponder={handleResponder}
                onVerRespuestas={handleVerRespuestas}
                currentUserIdentificacion={userData?.identificacion}
                currentUserRole={currentUserRole}
                currentUserNombre={`${userData?.nombres || ''} ${userData?.apellidos || ''}`.trim()}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      <Modal isOpen={isEditModalOpen} onOpenChange={handleCloseEditModal} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {actividadAEditar?.id ? 'Editar Actividad' : 'Nueva Actividad'}
          </ModalHeader>
          <ModalBody>
            <FormularioActividad
              actividadInicial={actividadAEditar || {}}
              cultivos={cultivos}
              onSubmit={handleSave}
              onCancel={handleCloseEditModal}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* (Modal de Detalles sin cambios) */}
      <ModalDetalles
        actividad={actividadAVer}
        onClose={handleCloseDetailsModal}
        onEdit={(act: Actividad) => {
          handleCloseDetailsModal();
          handleOpenEditModal(act);
        }}
      />

      {/* Modal de Responder Actividad */}
      <ModalResponderActividad
        actividad={actividadAResponder!}
        isOpen={!!actividadAResponder}
        onClose={handleCloseResponderModal}
        onSuccess={() => {
          cargarDatos();
          setRespuestasKey(prev => prev + 1); // Forzar recarga del modal de respuestas
          handleCloseResponderModal();
        }}
        currentUserIdentificacion={userData?.identificacion}
      />

      {/* Modal de Ver Respuestas */}
      <ModalVerRespuestas
        key={respuestasKey}
        actividad={actividadVerRespuestas!}
        isOpen={!!actividadVerRespuestas}
        onClose={handleCloseVerRespuestasModal}
        onSuccess={() => {
          cargarDatos(); // Recargar actividades cuando se califique una respuesta
          setRespuestasKey(prev => prev + 1); // Forzar recarga del modal de respuestas
        }}
        onOpenPago={handleAbrirPago}
      />

      {/* Modal de Eliminar Actividad */}
      <Modal isOpen={showDeleteModal} onOpenChange={handleDeleteCancel}>
        <ModalContent>
          <ModalHeader className="flex flex-col items-center justify-center text-center pb-2">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <h4 className="text-lg font-semibold text-center">¿Eliminar actividad?</h4>
            </div>
          </ModalHeader>
          <ModalBody className="text-center">
            <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 mx-auto max-w-xs">
              <div className="font-medium">{actividadToDelete?.titulo}</div>
              <div className="text-xs text-gray-500 mt-1">
                {actividadToDelete?.cultivo?.nombre || 'Sin cultivo asignado'}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-4 w-full justify-center">
              <Button
                onClick={handleDeleteCancel}
                color="default"
                variant="light"
                className="flex-1 max-w-[120px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                color="danger"
                className="flex-1 max-w-[120px]"
              >
                Eliminar
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Modal de Pago de Pasantes */}
      {actividadPago && (
        <ModalPagoPasante
          isOpen={showPagoModal}
          onClose={() => setShowPagoModal(false)}
          actividad={actividadPago}
          pasantes={pasantesPago}
          onPagoSuccess={() => {
            setShowPagoModal(false);
            setActividadPago(null);
            setPasantesPago([]);
            // Forzar recarga del modal de respuestas para mostrar estado actualizado de pagos
            setRespuestasKey(prev => prev + 1);
            cargarDatos(); // Recargar para actualizar estados
            toast.success('Pago registrado exitosamente. Puedes continuar pagando a otros pasantes.');
          }}
        />
      )}
    </div>
    </PermissionWrapper>
  );
};

export default GestionActividadesPage;
