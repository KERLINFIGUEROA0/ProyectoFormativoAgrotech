import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Package  } from 'lucide-react';
import { Button, Textarea, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [materialesDevueltos, setMaterialesDevueltos] = useState<{materialId: number, cantidadDevuelta: number, nombre: string}[]>([]);

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
    if (!descripcion.trim() && !archivos && materialesDevueltos.length === 0) {
      alert('Debe proporcionar una descripción, subir archivos o reportar devoluciones de materiales.');
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

      // Agregar materiales devueltos si existen
      if (materialesDevueltos.length > 0) {
        const materialesParaEnviar = materialesDevueltos.map(m => ({
          materialId: m.materialId,
          cantidadDevuelta: m.cantidadDevuelta
        }));
        console.log('Materiales devueltos a enviar:', materialesParaEnviar);
        formData.append('materialesDevueltos', JSON.stringify(materialesParaEnviar));
      } else {
        // Enviar array vacío para evitar errores de validación
        formData.append('materialesDevueltos', JSON.stringify([]));
      }

      await enviarRespuesta(actividad.id, formData);
      onSuccess();
      // Recargar respuesta existente después de enviar
      await cargarRespuestaExistente();

      // Mostrar modal de éxito con los archivos subidos
      if (archivos || materialesDevueltos.length > 0) {
        setUploadedFiles(Array.from(archivos || []));
        setShowSuccessModal(true);
      } else {
        // Si no hay archivos ni devoluciones, cerrar directamente
        onClose();
        setDescripcion('');
        setArchivos(null);
        setMaterialesDevueltos([]);
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      alert('Error al enviar la respuesta. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal de éxito con HeroUI
  const SuccessModal = () => (
    <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} size="md">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">¡Respuesta enviada exitosamente!</h3>
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600 mb-4">
            Tu respuesta ha sido enviada correctamente. El instructor la revisará pronto.
          </p>

          {uploadedFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Archivos subidos:</h4>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-600" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      onClick={() => {
                        // Crear URL temporal para el archivo local
                        const url = URL.createObjectURL(file);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = file.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        toast.success('Archivo descargado para vista previa');
                      }}
                    >
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="success"
            onClick={() => {
              setShowSuccessModal(false);
              onClose();
              setDescripcion('');
              setArchivos(null);
              setUploadedFiles([]);
              setMaterialesDevueltos([]);
            }}
          >
            Aceptar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  if (!isOpen) return null;

  return (
    <>
      <SuccessModal />
      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
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
          </ModalHeader>
          <ModalBody>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-600">Cargando respuesta...</p>
              </div>
            )}

            <div className="mb-4">
              <h3 className="font-semibold text-lg">{actividad.titulo}</h3>
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
                              <Button
                                key={index}
                                size="sm"
                                variant="light"
                                color="primary"
                                startContent={<Download size={12} />}
                                onClick={() => handleDescargarArchivoInicial(filename, nombreOriginal)}
                              >
                                {nombreOriginal.length > 20 ? `${nombreOriginal.substring(0, 20)}...` : nombreOriginal}
                              </Button>
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
                  <Textarea
                    label="Descripción de la respuesta"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe cómo realizaste la actividad..."
                    minRows={4}
                    isRequired
                  />
                </div>

                <div className="mb-4">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    label="Archivos (opcional)"
                    multiple
                    onChange={(e) => setArchivos(e.target.files)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    description="Formatos permitidos: PDF, Word, Excel, imágenes"
                  />
                </div>

            {/* Sección de devoluciones de materiales - Solo para el responsable */}
            {actividad.responsable?.identificacion === currentUserIdentificacion && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Devoluciones de Materiales (opcional)
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Como responsable de esta actividad, puedes devolver materiales no utilizados al inventario.
                </p>

              {/* Mostrar materiales asignados a la actividad */}
              {actividad.actividadMaterial && actividad.actividadMaterial.length > 0 ? (
                <div className="space-y-3">
                  {actividad.actividadMaterial.map((am) => (
                    <div key={am.material.id} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium">{am.material.nombre}</span>
                          <span className="text-xs text-gray-500">
                            (Asignado: {am.cantidadUsada})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Cantidad a devolver:</label>
                        <input
                          type="number"
                          min="0"
                          max={am.cantidadUsada}
                          step="0.01"
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                          onChange={(e) => {
                            const cantidad = parseFloat(e.target.value) || 0;
                            if (cantidad > 0) {
                              setMaterialesDevueltos(prev => {
                                const existing = prev.find(m => m.materialId === am.material.id);
                                if (existing) {
                                  return prev.map(m =>
                                    m.materialId === am.material.id
                                      ? { ...m, cantidadDevuelta: cantidad }
                                      : m
                                  );
                                } else {
                                  return [...prev, {
                                    materialId: am.material.id,
                                    cantidadDevuelta: cantidad,
                                    nombre: am.material.nombre
                                  }];
                                }
                              });
                            } else {
                              setMaterialesDevueltos(prev =>
                                prev.filter(m => m.materialId !== am.material.id)
                              );
                            }
                          }}
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">
                          Máx: {am.cantidadUsada}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No hay materiales asignados a esta actividad.
                </p>
              )}

              {/* Mostrar resumen de devoluciones */}
              {materialesDevueltos.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Materiales a devolver:</h4>
                  <ul className="space-y-1">
                    {materialesDevueltos.map((material) => (
                      <li key={material.materialId} className="text-sm text-green-700">
                        • {material.nombre}: {material.cantidadDevuelta} unidades
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
            )}

                <ModalFooter>
                  <Button
                    type="button"
                    variant="light"
                    onClick={() => {
                      onClose();
                      setMaterialesDevueltos([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    color={existingRespuesta?.estado === 'rechazado' ? 'warning' : 'primary'}
                    isLoading={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Enviando...'
                      : existingRespuesta?.estado === 'rechazado'
                      ? 'Corregir y Reenviar'
                      : 'Enviar Respuesta'
                    }
                  </Button>
                </ModalFooter>
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
                  <Button onClick={onClose} color="default">
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ModalResponderActividad;