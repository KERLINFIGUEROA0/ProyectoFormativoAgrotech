import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import type { Actividad, RespuestaActividad } from '../interfaces/actividades';
import { enviarRespuesta, obtenerRespuestasPorActividad, descargarArchivoActividad } from '../api/actividadesapi';
import { toast } from 'sonner';

interface ModalResponderActividadProps {
  actividad: Actividad;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserIdentificacion?: number;
}

const ModalResponderActividad: React.FC<ModalResponderActividadProps> = ({
  actividad,
  isOpen,
  onClose,
  onSuccess,
  currentUserIdentificacion,
}) => {
  const [existingRespuesta, setExistingRespuesta] = useState<RespuestaActividad | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [archivos, setArchivos] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && actividad) {
      cargarRespuestaExistente();
      // Limpiar archivos cuando se abre el modal para asegurar que se puedan seleccionar archivos nuevos
      setArchivos(null);
      // Resetear el input de archivos
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, actividad]);

  const cargarRespuestaExistente = async () => {
    setLoading(true);
    try {
      const respuestas = await obtenerRespuestasPorActividad(actividad.id);
      // Encontrar la respuesta del usuario actual
      const userRespuesta = respuestas.find(r => r.usuario.identificacion === currentUserIdentificacion);
      setExistingRespuesta(userRespuesta || null);
      setDescripcion(userRespuesta?.descripcion || '');
    } catch (error) {
      console.error('Error al cargar respuesta existente:', error);
      setExistingRespuesta(null);
      setDescripcion('');
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarArchivoInicial = async (filename: string, nombreOriginal?: string) => {
    try {
      const response = await descargarArchivoActividad(filename, nombreOriginal);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreOriginal || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Archivo descargado correctamente');
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() && !archivos) {
      alert('Debe proporcionar una descripción o subir al menos un archivo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('descripcion', descripcion);

      if (archivos) {
        for (let i = 0; i < archivos.length; i++) {
          formData.append('archivos', archivos[i]);
        }
      }

      await enviarRespuesta(actividad.id, formData);
      onSuccess();
      // Recargar respuesta existente después de enviar
      await cargarRespuestaExistente();
      onClose();
      setDescripcion('');
      setArchivos(null);
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      alert('Error al enviar la respuesta. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <p>Cargando respuesta...</p>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {existingRespuesta?.estado === 'rechazado'
              ? 'Corregir y Reenviar Actividad'
              : existingRespuesta?.estado === 'pendiente'
              ? 'Estado de tu Respuesta'
              : existingRespuesta?.estado === 'aprobado'
              ? 'Actividad Finalizada'
              : 'Responder Actividad'
            }
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold">{actividad.titulo}</h3>
          <p className="text-sm text-gray-600">{actividad.descripcion}</p>

          {/* Mostrar archivo inicial si existe */}
          {actividad.archivoInicial && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Archivo de referencia adjunto</span>
              </div>
              <p className="text-xs text-blue-600 mb-2">
                El instructor ha proporcionado un archivo de referencia. Descárgalo para completar la actividad correctamente.
              </p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  try {
                    const archivos = JSON.parse(actividad.archivoInicial);
                    if (Array.isArray(archivos)) {
                      return archivos.map((filename: string, index: number) => {
                        // Extraer nombre original del filename
                        let nombreOriginal = filename;
                        if (filename.includes('___')) {
                          const parts = filename.split('___');
                          nombreOriginal = parts.length >= 3 ? parts[2] : filename;
                        } else if (filename.includes('-')) {
                          const parts = filename.split('-');
                          nombreOriginal = parts.length >= 3 ? parts.slice(2).join('-') : filename;
                        }
                        return (
                          <button
                            key={index}
                            onClick={() => handleDescargarArchivoInicial(filename, nombreOriginal)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                          >
                            <Download size={12} />
                            {nombreOriginal.length > 20 ? `${nombreOriginal.substring(0, 20)}...` : nombreOriginal}
                          </button>
                        );
                      });
                    }
                  } catch (error) {
                    console.error('Error al parsear archivos iniciales:', error);
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
          {existingRespuesta && (
            <div className={`mt-2 p-3 rounded ${
              existingRespuesta.estado === 'rechazado'
                ? 'bg-red-50 border border-red-200'
                : existingRespuesta.estado === 'aprobado'
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className="text-sm font-medium">Estado de respuesta:
                <span className={`ml-1 px-2 py-1 text-xs rounded ${
                  existingRespuesta.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                  existingRespuesta.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {existingRespuesta.estado === 'aprobado' ? 'Aprobada - Finalizada' :
                   existingRespuesta.estado === 'rechazado' ? 'Rechazada - Requiere Corrección' :
                   'Enviada - Esperando Calificación'}
                </span>
              </p>
              {existingRespuesta.estado === 'rechazado' && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                  <p className="text-sm font-medium text-red-800">
                    ⚠️ Esta respuesta fue rechazada. Debe corregir y volver a enviar.
                  </p>
                </div>
              )}
              {existingRespuesta.comentarioInstructor && (
                <p className="text-sm text-red-600 mt-2">
                  <strong>Comentario del instructor:</strong> {existingRespuesta.comentarioInstructor}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Solo mostrar formulario si puede editar (sin respuesta, rechazada) */}
        {(!existingRespuesta || existingRespuesta.estado === 'rechazado') && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Descripción de la respuesta
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md resize-none"
                rows={4}
                placeholder="Describe cómo realizaste la actividad..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Archivos (opcional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => setArchivos(e.target.files)}
                className="w-full p-2 border border-gray-300 rounded-md"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos permitidos: PDF, Word, Excel, imágenes
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                  existingRespuesta?.estado === 'rechazado'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting
                  ? 'Enviando...'
                  : existingRespuesta?.estado === 'rechazado'
                  ? 'Corregir y Reenviar'
                  : 'Enviar Respuesta'
                }
              </button>
            </div>
          </form>
        )}

        {/* Mostrar información cuando no puede editar */}
        {existingRespuesta && existingRespuesta.estado !== 'rechazado' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              {existingRespuesta.estado === 'pendiente'
                ? 'Tu respuesta ha sido enviada y está esperando calificación del instructor.'
                : 'Esta actividad ya ha sido finalizada y aprobada.'
              }
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalResponderActividad;