import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, FileText, Image, File, Check, X as XIcon } from 'lucide-react';
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
}

const ModalVerRespuestas: React.FC<ModalVerRespuestasProps> = ({
  actividad,
  isOpen,
  onClose,
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
      await calificarRespuesta(respuestaId, { estado: 'aprobado' });
      // Recargar respuestas
      cargarRespuestas();
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
      } catch (error) {
        console.error('Error al rechazar respuesta:', error);
        alert('Error al rechazar respuesta');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Respuestas de la Actividad</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold">{actividad.titulo}</h3>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Nombre</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">ID Ficha</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Descripción</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Estado</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Comentario Instructor</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Archivos</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Fecha</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {respuestas.map((respuesta) => (
                  <tr key={respuesta.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      {respuesta.usuario.nombre} {respuesta.usuario.apellidos}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {respuesta.usuario.ficha?.id_ficha || 'N/A'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {respuesta.descripcion || 'Sin descripción'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        respuesta.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                        respuesta.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {respuesta.estado === 'aprobado' ? 'Aprobado' :
                         respuesta.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {respuesta.comentarioInstructor || 'Sin comentario'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {respuesta.archivos ? (
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(respuesta.archivos).map((filename: string, index: number) => (
                            <button
                              key={index}
                              onClick={() => downloadFile(filename)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                            >
                              {getFileIcon(filename)}
                              {getOriginalFilename(filename)}
                              <Download size={12} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">Sin archivos</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {new Date(respuesta.fechaEnvio).toLocaleDateString('es-ES')}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {respuesta.estado === 'pendiente' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAprobar(respuesta.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                          >
                            <Check size={14} />
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleRechazar(respuesta.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          >
                            <XIcon size={14} />
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>

      <ModalComentarioRechazo
        isOpen={modalComentarioOpen}
        onClose={() => {
          setModalComentarioOpen(false);
          setRespuestaSeleccionada(null);
        }}
        onConfirm={handleConfirmarRechazo}
      />
    </div>
  );
};

export default ModalVerRespuestas;