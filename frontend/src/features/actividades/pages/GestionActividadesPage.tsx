// --- MODIFICACIÓN: Añadir 'DollarSign' ---
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList,
  Loader2,
  CheckCircle,
  Edit,
  Calendar,
  User,
  FileText,
  Bell,
  Package,
  Users,
  DollarSign, // <-- AÑADIDO
} from 'lucide-react';

import ActividadCard from '../components/ActividadCard';
import FormularioActividad from '../components/FormularioActividad';
import ModalResponderActividad from '../components/ModalResponderActividad';
import ModalVerRespuestas from '../components/ModalVerRespuestas';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
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

// --- INICIO: Componente ModalDetalles (MODIFICADO) ---
interface ModalDetallesProps {
  actividad: (Actividad & {
    actividadMaterial?: {
      cantidadUsada: number;
      material: { id: number; nombre: string };
    }[];
  }) | null;
  onClose: () => void;
  onEdit: (actividad: Actividad) => void;
}

const ModalDetalles: React.FC<ModalDetallesProps> = ({
  actividad,
  onClose,
  onEdit,
}) => {
  if (!actividad) return null;

  // Lógica de 'aprendicesAsignados' usando el campo asignados
  const aprendicesAsignados: UsuarioSimple[] = useMemo(() => {
    if (!actividad) return [];
    try {
      if (actividad.asignados) {
        // Si hay asignados guardados, intentar parsear y crear objetos UsuarioSimple
        const nombres = JSON.parse(actividad.asignados);
        return nombres.map((nombre: string, index: number) => ({
          id: index + 1, // ID temporal
          identificacion: index + 1, // Identificación temporal
          nombre: nombre.split(' ')[0] || 'Usuario',
          apellidos: nombre.split(' ').slice(1).join(' ') || '',
        }));
      }
    } catch {
      // Si falla el parseo, usar respuestas como fallback
    }
    // Fallback: usar respuestas si no hay asignados
    return actividad.respuestas?.map(r => r.usuario) || [];
  }, [actividad]);

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
  const fechaProgramada = new Date(actividad.fecha).toLocaleDateString('es-ES', {
    timeZone: 'UTC',
  });

  // --- INICIO DE CORRECCIÓN: Lógica de Costos y Pago ---
  const costoManoDeObra = (actividad.horas || 0) * (actividad.tarifaHora || 0);
  // Basamos el estado del pago en el estado de la actividad
  const estadoPago = actividad.estado === 'completado' ? 'Pagado' : 'Pendiente de Pago';
  const colorEstadoPago = actividad.estado === 'completado' ? 'text-green-600' : 'text-yellow-600';
  // --- FIN DE CORRECCIÓN ---

  return (
    <Modal isOpen={!!actividad} onClose={onClose} title="">
      <div className="space-y-6">
        {/* (Cabecera del Modal sin cambios) */}
        <div
          className={`p-4 rounded-t-lg flex justify-between items-center text-white font-bold ${actividad.estado === 'completado' ? 'bg-green-600' : 'bg-blue-600'
            }`}
        >
          <h2 className="text-xl">{actividad.titulo}</h2>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-800`}
          >
            {estadoTexto}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          {/* Columna Izquierda: Detalles */}
          <div className="space-y-4">
            {/* (Info Básica sin cambios) */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700">Información Básica</h3>
              <p className="text-sm flex items-center gap-2">
                <ClipboardList size={14} className="text-blue-500" />
                <strong>Actividad:</strong> {actividad.titulo}
              </p>
              <p className="text-sm flex items-center gap-2">
                <User size={14} className="text-blue-500" />
                <strong>Cultivo/Lote:</strong>{' '}
                {actividad.cultivo?.nombre || 'No especificado'}
              </p>
              <p className="text-sm flex items-center gap-2">
                <Calendar size={14} className="text-blue-500" />
                <strong>Fecha Programada:</strong> {fechaProgramada}
              </p>
            </div>

            {/* (Aprendices Asignados sin cambios) */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Users size={16} /> Aprendices Asignados
              </h3>
              {aprendicesAsignados.length > 0 ? (
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {aprendicesAsignados.map((user) => (
                    <li key={user.identificacion} className="text-sm text-gray-700">
                      {user.nombre} {user.apellidos} {user.ficha?.id_ficha ? `(Ficha: ${user.ficha.id_ficha})` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No asignado</p>
              )}
            </div>

            {/* (Materiales Utilizados sin cambios) */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Package size={16} /> Materiales Utilizados
              </h3>
              {actividad.actividadMaterial &&
                actividad.actividadMaterial.length > 0 ? (
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {actividad.actividadMaterial.map((item, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {item.material.nombre}:{' '}
                      <span className="font-medium">
                        {item.cantidadUsada}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">
                  No se registraron materiales.
                </p>
              )}
            </div>

            {/* --- INICIO DE CORRECCIÓN: Mostrar Costo y Estado de Pago --- */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <DollarSign size={16} /> Costo Mano de Obra
              </h3>
              {costoManoDeObra > 0 ? (
                <div className="text-sm text-gray-700 space-y-1 pl-2">
                  <p>
                    <strong>Horas:</strong> {actividad.horas}
                  </p>
                  <p>
                    <strong>Tarifa:</strong> ${new Intl.NumberFormat('es-CO').format(actividad.tarifaHora || 0)} / hora
                  </p>
                  <p className="font-medium text-gray-800">
                    <strong>Total:</strong> ${new Intl.NumberFormat('es-CO').format(costoManoDeObra)}
                  </p>
                  <p className={`font-medium ${colorEstadoPago}`}>
                    <strong>Estado de Pago:</strong> {estadoPago}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No se registraron costos de mano de obra.
                </p>
              )}
            </div>
            {/* --- FIN DE CORRECCIÓN --- */}

          </div>

          {/* Columna Derecha: Descripción e Imágenes */}
          <div className="space-y-4">
            {/* (Descripción sin cambios) */}
            <div className="p-3">
              <h3 className="font-bold text-gray-700 mb-2">
                Descripción Completa
              </h3>
              <p className="text-gray-600 text-sm">
                {actividad.descripcion || 'No hay descripción detallada.'}
              </p>
            </div>

            {/* (Sección de Imágenes sin cambios) */}
            {imagenes.length > 0 && (
              <div className="p-3">
                <h3 className="font-bold text-gray-700 mb-2">
                  Imágenes de la Actividad
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {imagenes.map((img: string, index: number) => (
                    <div key={index} className="relative">
                      <img
                        src={`${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${img}`}
                        alt={`Imagen ${index + 1} de ${actividad.titulo}`}
                        className="w-full h-32 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* (Botón de Editar sin cambios) */}
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={() => onEdit(actividad)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Edit size={16} /> Editar
          </button>
        </div>
      </div>
    </Modal>
  );
};
// --- FIN: Componente ModalDetalles ---

// ... (El resto del archivo 'GestionActividadesPage' continúa igual) ...
// (Componente StatCard sin cambios)
const StatCard = ({ title, value, icon, colorClass }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
    <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="font-bold text-2xl">{value}</p>
    </div>
  </div>
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

  // (handleDelete sin cambios)
  const handleDelete = async (id: number) => {
    toast.error('¿Seguro que deseas eliminar esta actividad?', {
      description: 'Esta acción no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const toastId = toast.loading('Eliminando...');
          try {
            await eliminarActividad(id);
            toast.success('Actividad eliminada', { id: toastId });
            await cargarDatos();
          } catch (err) {
            toast.error('Error al eliminar.', { id: toastId });
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { },
      },
      duration: 10000
    });
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

  // (exportarPDF sin cambios)
  const exportarPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text('Reporte de Actividades', 20, 20);
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, 35);
      doc.text(`Total de actividades: ${actividades.length}`, 20, 50);
      doc.text(`Pendientes: ${stats.pendientes}`, 20, 60);
      doc.text(`En proceso: ${stats.enProceso}`, 20, 70);
      doc.text(`Completadas: ${stats.completadas}`, 20, 80);

      const tableData = filteredActividades.map(act => [
        act.titulo,
        act.cultivo?.nombre || 'No especificado',
        (() => {
          try {
            return act.asignados ? JSON.parse(act.asignados).join(', ') : 'Ejecutar migraciones para ver asignados';
          } catch {
            return 'Ejecutar migraciones para ver asignados';
          }
        })(),
        new Date(act.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
        getEstadoTexto(act.estado),
        act.descripcion || 'Sin descripción'
      ]);

      const { default: autoTable } = await import('jspdf-autotable');

      autoTable(doc, {
        head: [['Título', 'Cultivo/Lote', 'Aprendiz', 'Fecha', 'Estado', 'Descripción']],
        body: tableData,
        startY: 90,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.save(`reporte-actividades-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado correctamente');

    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF');
    }
  }, [actividades, filteredActividades, stats]);

  // (JSX principal sin cambios)
  if (cargando)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      {/* (Cabecera y botones sin cambios) */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Gestión de Actividades
        </h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 shadow"
            onClick={mostrarNotificacionesPendientes}
            title="Mostrar notificaciones de actividades pendientes"
          >
            <Bell size={16} /> Notificaciones
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow"
            onClick={exportarPDF}
          >
            <FileText size={16} /> Exportar PDF
          </button>
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
          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value as EstadoActividad | 'Todos')
            }
            className="border border-gray-300 rounded-lg p-2 bg-white shadow-sm text-sm"
          >
            <option value="Todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en proceso">En Proceso</option>
            <option value="completado">Completado</option>
          </select>
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
                onDelete={handleDelete}
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

      {/* (Modal de Edición sin cambios) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={actividadAEditar?.id ? '' : 'Nueva Actividad'}
      >
        <FormularioActividad
          actividadInicial={actividadAEditar || {}}
          cultivos={cultivos}
          onSubmit={handleSave}
          onCancel={handleCloseEditModal}
        />
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
      />
    </div>
  );
};

export default GestionActividadesPage;