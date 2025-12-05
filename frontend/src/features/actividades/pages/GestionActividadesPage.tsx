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
  Trash2, // <-- AÑADIDO para el modal de eliminación
} from 'lucide-react';

import ActividadCard from '../components/ActividadCard';
import FormularioActividad from '../components/FormularioActividad';
import ModalResponderActividad from '../components/ModalResponderActividad';
import ModalVerRespuestas from '../components/ModalVerRespuestas';
import ModalPagoPasante from '../components/ModalPagoPasante';
import { useAuth } from '../../../context/AuthContext';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Select, SelectItem } from '@heroui/react';
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
import { DateUtils } from '../../../utils/dateUtils';

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
  const fechaProgramada = DateUtils.formatDateOnly(actividad.fecha);

  // --- INICIO DE CORRECCIÓN: Lógica de Costos y Pago ---
  const costoManoDeObra = (actividad.horas || 0) * (actividad.tarifaHora || 0);
  // Basamos el estado del pago en el estado de la actividad
  const estadoPago = actividad.estado === 'completado' ? 'Pagado' : 'Pendiente de Pago';
  const colorEstadoPago = actividad.estado === 'completado' ? 'text-green-600' : 'text-yellow-600';
  // --- FIN DE CORRECCIÓN ---

  return (
    <Modal isOpen={!!actividad} onOpenChange={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className={`flex justify-between items-center text-white font-bold ${actividad.estado === 'completado' ? 'bg-green-600' : 'bg-blue-600'}`}>
          <h2 className="text-xl">{actividad.titulo}</h2>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-800`}>
            {estadoTexto}
          </span>
        </ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => onEdit(actividad)} color="primary" startContent={<Edit size={16} />}>
            Editar
          </Button>
        </ModalFooter>
      </ModalContent>
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
      console.error('Error deleting actividad:', error);
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

  // (exportarPDF con logo agregado)
  const exportarPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Agregar logo
      try {
        const logoResponse = await fetch('/logo.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });

          // Logo en la esquina superior derecha
          doc.addImage(logoBase64, 'PNG', 150, 10, 40, 20);
        }
      } catch (logoError) {
        console.warn('No se pudo cargar el logo:', logoError);
      }

      doc.setFontSize(20);
      doc.text('Reporte de Actividades', 20, 20);
      doc.setFontSize(12);
      doc.text(`Generado el: ${DateUtils.formatDateOnly(new Date())}`, 20, 35);
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
        DateUtils.formatDateOnly(act.fecha),
        getEstadoTexto(act.estado),
        act.descripcion || 'Sin descripción',
        act.horas ? `${act.horas} horas` : 'No especificado',
        act.tarifaHora ? `$${new Intl.NumberFormat('es-CO').format(act.tarifaHora)}` : 'No especificado',
        act.horas && act.tarifaHora ? `$${new Intl.NumberFormat('es-CO').format(act.horas * act.tarifaHora)}` : 'No especificado',
        act.actividadMaterial && act.actividadMaterial.length > 0
          ? act.actividadMaterial.map(am => `${am.material.nombre} (x${am.cantidadUsada})`).join(', ')
          : 'Sin materiales'
      ]);

      const { default: autoTable } = await import('jspdf-autotable');

      autoTable(doc, {
        head: [['Título', 'Cultivo/Lote', 'Aprendices', 'Fecha', 'Estado', 'Descripción', 'Horas', 'Tarifa/Hora', 'Costo Mano de Obra', 'Materiales']],
        body: tableData,
        startY: 90,
        styles: { fontSize: 6 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 30 }, // Título
          1: { cellWidth: 25 }, // Cultivo
          2: { cellWidth: 30 }, // Aprendices
          3: { cellWidth: 20 }, // Fecha
          4: { cellWidth: 15 }, // Estado
          5: { cellWidth: 40 }, // Descripción
          6: { cellWidth: 15 }, // Horas
          7: { cellWidth: 20 }, // Tarifa
          8: { cellWidth: 20 }, // Costo
          9: { cellWidth: 40 }  // Materiales
        }
      });

      doc.save(`reporte-actividades-${DateUtils.formatDateOnly(new Date()).replace(/\//g, '-')}.pdf`);
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
          <Button
            color="warning"
            startContent={<Bell size={16} />}
            onClick={mostrarNotificacionesPendientes}
            title="Mostrar notificaciones de actividades pendientes"
          >
            Notificaciones
          </Button>
          <Button
            color="danger"
            startContent={<FileText size={16} />}
            onClick={exportarPDF}
          >
            Exportar PDF
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
      <Modal isOpen={showDeleteModal} onOpenChange={handleDeleteCancel} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="text-red-600" size={20} />
            </div>
            <h4 className="text-lg font-semibold">¿Eliminar actividad?</h4>
          </ModalHeader>
          <ModalBody className="text-center">
            <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700">
              <div className="font-medium">{actividadToDelete?.titulo}</div>
              <div className="text-xs text-gray-500 mt-1">
                {actividadToDelete?.cultivo?.nombre || 'Sin cultivo asignado'}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">Esta acción no se puede deshacer.</p>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleDeleteCancel} variant="light">
              Cancelar
            </Button>
            <Button onClick={handleDeleteConfirm} color="danger">
              Eliminar
            </Button>
          </ModalFooter>
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
            cargarDatos(); // Recargar para actualizar estados
            toast.success('El proceso de pago ha finalizado correctamente.');
          }}
        />
      )}
    </div>
  );
};

export default GestionActividadesPage;