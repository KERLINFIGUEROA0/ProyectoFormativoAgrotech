import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, FileText, Image, File, Check, X as XIcon } from 'lucide-react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Table, TableHeader, TableBody, TableRow, TableCell, TableColumn, Chip } from '@heroui/react';
import type { Actividad, RespuestaActividad } from '../interfaces/actividades';
import { obtenerRespuestasPorActividad, calificarRespuesta } from '../api/actividadesapi';
import ModalComentarioRechazo from './ModalComentarioRechazo';

// Función helper para extraer el nombre original del archivo
const getOriginalFilename = (fullFilename: string): string => {
  // Formato: timestamp-random-originalname
  const parts = fullFilename.split('-');
  // El nombre original está después del timestamp y random
  // timestamp-random-originalname
  if (parts.length >= 3) {
    // Unir todas las partes desde la tercera en adelante
    return parts.slice(2).join('-');
  }
  return fullFilename;
};

interface ModalVerRespuestasProps {
    actividad: Actividad;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    onOpenPago?: (actividad: Actividad, pasantes: Array<{
      identificacion: number;
      nombre: string;
      apellidos: string;
    }>) => void;
}

const ModalVerRespuestas: React.FC<ModalVerRespuestasProps> = ({
    actividad,
    isOpen,
    onClose,
    onSuccess,
    onOpenPago,
}) => {
  const [respuestas, setRespuestas] = useState<RespuestaActividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalComentarioOpen, setModalComentarioOpen] = useState(false);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number | null>(null);


  const cargarRespuestas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerRespuestasPorActividad(actividad.id);
      setRespuestas(data);
    } catch (error) {
      console.error('Error al cargar respuestas:', error);
      setRespuestas([]);
    } finally {
      setLoading(false);
    }
  }, [actividad?.id]);

  useEffect(() => {
    if (isOpen && actividad) {
      cargarRespuestas();
    }
  }, [isOpen, actividad, cargarRespuestas]);



  const getFileIcon = (filename: string) => {
    const originalFilename = getOriginalFilename(filename);
    const ext = originalFilename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return <Image size={16} className="text-blue-500" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText size={16} className="text-red-500" />;
    }
    return <File size={16} className="text-gray-500" />;
  };

  const downloadFile = async (filename: string) => {
    try {
      const token = localStorage.getItem('token');
      // Usar el endpoint del backend con el nombre original como parámetro
      const originalName = getOriginalFilename(filename);
      const url = `${import.meta.env.VITE_BACKEND_URL}/actividades/descargar/${filename}?nombre=${encodeURIComponent(originalName)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = originalName; // Usar el nombre original
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar el URL del objeto
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      alert('Error al descargar el archivo. Verifica que tengas permisos.');
    }
  };

  const handleAprobar = async (respuestaId: number) => {
    try {
      console.log('🚀 Iniciando aprobación de respuesta ID:', respuestaId);

      // Calificar la respuesta - el backend ahora retorna si el usuario es pasante
      const resultadoCalificacion = await calificarRespuesta(respuestaId, { estado: 'aprobado' });

      console.log('📋 Respuesta completa del backend:', JSON.stringify(resultadoCalificacion, null, 2));
      console.log('👤 Usuario en respuesta:', resultadoCalificacion.usuario);
      console.log('🔍 esPasante:', resultadoCalificacion.esPasante);
      console.log('👥 TipoUsuario:', resultadoCalificacion.usuario?.tipoUsuario);

      // Recargar respuestas para actualizar la UI
      await cargarRespuestas();

      // Verificar si el usuario es pasante usando la información retornada por el backend
      if (resultadoCalificacion.esPasante) {
        console.log('✅ Usuario aprobado es pasante, llamando función del padre para abrir modal de pago');

        // Llamar a la función del padre para abrir el modal de pago
        if (onOpenPago) {
          onOpenPago(actividad, [{
            identificacion: resultadoCalificacion.usuario.identificacion,
            nombre: resultadoCalificacion.usuario.nombre,
            apellidos: resultadoCalificacion.usuario.apellidos,
          }]);
          console.log('✅ Función onOpenPago llamada exitosamente');
          // Nota: Ya NO cerramos el modal de respuestas para mantener el flujo de trabajo
        } else {
          console.warn('⚠️ onOpenPago no está definido en las props');
        }
      } else {
        console.log('❌ Usuario aprobado no es pasante o esPasante es false/undefined');
        console.log('Valor de esPasante:', resultadoCalificacion.esPasante);
        console.log('Tipo de esPasante:', typeof resultadoCalificacion.esPasante);
      }

      // Verificar el caso general (todas respuestas aprobadas) - Solo si NO se abrió pago individual
      // Usar las respuestas actualizadas después de recargar
      const respuestasActualizadas = await obtenerRespuestasPorActividad(actividad.id);
      const todasAprobadas = respuestasActualizadas.every(r => r.estado === 'aprobado');
      const totalRespuestas = respuestasActualizadas.length;

      console.log('Estado después de recargar respuestas:');
      console.log('Respuestas:', respuestasActualizadas.map(r => ({ nombre: r.usuario.nombre, estado: r.estado, tipoUsuario: r.usuario.tipoUsuario?.nombre })));
      console.log('Todas aprobadas:', todasAprobadas);
      console.log('Total respuestas:', totalRespuestas);

      // Si todas están aprobadas y hay pasantes que aún no se pagaron, mostrar modal general
      // Pero solo si no se abrió pago individual en esta misma aprobación
      if (todasAprobadas && totalRespuestas > 0 && !resultadoCalificacion.esPasante) {
        const pasantesSinPagar = respuestasActualizadas
          .filter(r => {
            const esPasante = r.usuario.tipoUsuario?.nombre?.toLowerCase() === 'pasante';
            return esPasante && r.estado === 'aprobado';
          })
          .map(r => ({
            identificacion: r.usuario.identificacion,
            nombre: r.usuario.nombre,
            apellidos: r.usuario.apellidos,
          }));

        // Solo mostrar si hay pasantes que no se pagaron aún
        if (pasantesSinPagar.length > 0) {
          console.log('Actividad completada, mostrando pasantes restantes:', pasantesSinPagar);
          if (onOpenPago) {
            onOpenPago(actividad, pasantesSinPagar);
            // Nota: Ya NO cerramos el modal de respuestas para mantener el flujo de trabajo
          }
        }
      }

      // Notificar al componente padre para recargar actividades
      onSuccess?.();
    } catch (error) {
      console.error('Error al aprobar respuesta:', error);
      alert('Error al aprobar respuesta');
    }
  };

  const handleRechazar = (respuestaId: number) => {
    setRespuestaSeleccionada(respuestaId);
    setModalComentarioOpen(true);
  };

  const handleConfirmarRechazo = async (comentario: string) => {
    if (respuestaSeleccionada) {
      try {
        await calificarRespuesta(respuestaSeleccionada, { estado: 'rechazado', comentarioInstructor: comentario });
        // Recargar respuestas
        cargarRespuestas();
        // Notificar al componente padre para recargar actividades
        onSuccess?.();
      } catch (error) {
        console.error('Error al rechazar respuesta:', error);
        alert('Error al rechazar respuesta');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            <h2 className="text-xl font-bold">Respuestas de la Actividad</h2>
          </ModalHeader>
          <ModalBody>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">{actividad.titulo}</h3>
              <p className="text-sm text-gray-600">{actividad.descripcion}</p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p>Cargando respuestas...</p>
              </div>
            ) : respuestas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay respuestas para esta actividad.</p>
              </div>
            ) : (
              <Table aria-label="Tabla de respuestas de actividad">
                <TableHeader>
                   <TableColumn>Nombre</TableColumn>
                   <TableColumn>Rol</TableColumn>
                   <TableColumn>ID Ficha</TableColumn>
                   <TableColumn>Descripción</TableColumn>
                   <TableColumn>Estado</TableColumn>
                   <TableColumn>Comentario Instructor</TableColumn>
                   <TableColumn>Archivos</TableColumn>
                   <TableColumn>Fecha</TableColumn>
                   <TableColumn>Acciones</TableColumn>
                 </TableHeader>
                <TableBody>
                  {respuestas.map((respuesta) => (
                    <TableRow key={respuesta.id}>
                      <TableCell>
                        {respuesta.usuario.nombre} {respuesta.usuario.apellidos}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {respuesta.usuario.tipoUsuario?.nombre || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {respuesta.usuario.ficha?.id_ficha || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {respuesta.descripcion || 'Sin descripción'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={
                            respuesta.estado === 'aprobado' ? 'success' :
                            respuesta.estado === 'rechazado' ? 'danger' : 'warning'
                          }
                          variant="flat"
                          size="sm"
                        >
                          {respuesta.estado === 'aprobado' ? 'Aprobado' :
                           respuesta.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {respuesta.comentarioInstructor || 'Sin comentario'}
                      </TableCell>
                      <TableCell>
                        {respuesta.archivos ? (
                          <div className="flex flex-wrap gap-2">
                            {JSON.parse(respuesta.archivos).map((filename: string, index: number) => (
                              <Button
                                key={index}
                                size="sm"
                                variant="light"
                                color="primary"
                                startContent={getFileIcon(filename)}
                                endContent={<Download size={12} />}
                                onClick={() => downloadFile(filename)}
                              >
                                {getOriginalFilename(filename).length > 15
                                  ? `${getOriginalFilename(filename).substring(0, 15)}...`
                                  : getOriginalFilename(filename)}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Sin archivos</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(respuesta.fechaEnvio).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell>
                        {respuesta.estado === 'pendiente' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              color="success"
                              variant="flat"
                              startContent={<Check size={14} />}
                              onClick={() => handleAprobar(respuesta.id)}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              startContent={<XIcon size={14} />}
                              onClick={() => handleRechazar(respuesta.id)}
                            >
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} color="default">
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ModalComentarioRechazo
        isOpen={modalComentarioOpen}
        onClose={() => {
          setModalComentarioOpen(false);
          setRespuestaSeleccionada(null);
        }}
        onConfirm={handleConfirmarRechazo}
      />
    </>
  );
};

export default ModalVerRespuestas;