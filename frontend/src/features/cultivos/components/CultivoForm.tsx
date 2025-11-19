// src/features/cultivos/components/CultivoForm.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@heroui/react";
import { toast } from "sonner";
import { UploadCloud, AlertTriangle, ArrowRight, Settings, Edit, Trash2, X } from 'lucide-react';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSurcosPorLote } from '../api/surcosApi';
import { actualizarTipoCultivo, eliminarTipoCultivo } from '../api/cultivosApi';
import type { Lote } from '../interfaces/cultivos';

interface CultivoFormProps {
  initialData?: any;
  tiposCultivo: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function CultivoForm({ initialData = {}, tiposCultivo, onSave, onCancel }: CultivoFormProps): ReactElement {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ Estado: 'Activo', ...initialData });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [newTipoCultivoName, setNewTipoCultivoName] = useState("");
  const [hasLotes, setHasLotes] = useState(false);
  const [hasSurcos, setHasSurcos] = useState(false);
  const [checkingDeps, setCheckingDeps] = useState(true);
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState<any>(null);
  const [editTipoName, setEditTipoName] = useState("");

  useEffect(() => {
    setFormData({ Estado: 'Activo', ...initialData });
    setShowNewTipoInput(false);
    setNewTipoCultivoName("");
    setImageFile(null);
  }, [initialData]);

  useEffect(() => {
    const checkDependencies = async () => {
      try {
        setCheckingDeps(true);
        const lotesResponse = await obtenerLotes();
        const lotes: Lote[] = lotesResponse.data || [];
        const activeLotes = lotes.filter(l => l.estado === 'Activo');
        setHasLotes(activeLotes.length > 0);

        if (activeLotes.length > 0) {
          // Check surcos for the first active lote
          const surcosResponse = await obtenerSurcosPorLote(activeLotes[0].id);
          const surcos = surcosResponse.data || [];
          setHasSurcos(surcos.length > 0);
        } else {
          setHasSurcos(false);
        }
      } catch (error) {
        console.error('Error checking dependencies:', error);
        setHasLotes(false);
        setHasSurcos(false);
      } finally {
        setCheckingDeps(false);
      }
    };
    checkDependencies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'tipoCultivoId' && value === 'otro') {
      setShowNewTipoInput(true);
    } else {
      if (name === 'tipoCultivoId') {
        setShowNewTipoInput(false);
      }
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };
  
  // --- ✅ CORRECCIÓN AQUÍ ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`Archivo "${file.name}" seleccionado.`);
      // Guarda el objeto File completo en el estado para subirlo después
      setImageFile(file); 
    }
  };

  const handleEditTipo = (tipo: any) => {
    setEditingTipo(tipo);
    setEditTipoName(tipo.nombre);
  };

  const handleSaveTipoEdit = async () => {
    if (!editingTipo || !editTipoName.trim()) return;

    try {
      await actualizarTipoCultivo(editingTipo.id, { nombre: editTipoName.trim() });
      toast.success("Tipo de cultivo actualizado correctamente");
      setEditingTipo(null);
      setEditTipoName("");
      // Refresh tiposCultivo - this would need to be passed as prop or callback
      window.location.reload(); // Simple refresh for now
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al actualizar tipo de cultivo");
    }
  };

  const handleDeleteTipo = async (tipo: any) => {
    if (!confirm(`¿Estás seguro de eliminar "${tipo.nombre}"?`)) return;

    try {
      await eliminarTipoCultivo(tipo.id);
      toast.success("Tipo de cultivo eliminado correctamente");
      window.location.reload(); // Simple refresh for now
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al eliminar tipo de cultivo");
    }
  };

  const handleSubmit = () => {
    const { nombre, cantidad, Fecha_Plantado } = formData;
    const tipoCultivoId = formData.tipoCultivoId;

    if (!nombre || !cantidad || (!tipoCultivoId && !showNewTipoInput) || !Fecha_Plantado) {
      toast.error("Todos los campos principales son requeridos.");
      return;
    }
    if (showNewTipoInput && !newTipoCultivoName.trim()) {
      toast.error("Por favor, ingresa el nombre del nuevo tipo de cultivo.");
      return;
    }

    const payload = {
      nombre: formData.nombre,
      cantidad: parseInt(cantidad, 10),
      tipoCultivoId: showNewTipoInput ? null : parseInt(tipoCultivoId, 10),
      Fecha_Plantado: formData.Fecha_Plantado,
      descripcion: formData.descripcion,
      Estado: formData.Estado,
      img: formData.img || 'https://via.placeholder.com/150'
    };

    onSave({
      ...payload,
      imageFile,
      newTipoCultivoName: showNewTipoInput ? newTipoCultivoName : null,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Sección de Ayuda para Dependencias */}
      {!checkingDeps && (!hasLotes || !hasSurcos) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                Para crear un cultivo, necesitas configurar primero:
              </h4>
              <div className="flex flex-wrap gap-2">
                {!hasLotes && (
                  <button
                    onClick={() => {
                      onCancel();
                      navigate('/cultivos/lotes');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <ArrowRight size={14} />
                    Crear Lote Primero
                  </button>
                )}
                {!hasSurcos && hasLotes && (
                  <button
                    onClick={() => {
                      onCancel();
                      navigate('/cultivos/surcos');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <ArrowRight size={14} />
                    Crear Surcos Después
                  </button>
                )}
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Después de crearlos, regresa aquí para continuar con el cultivo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Nombre del Cultivo" name="nombre" value={formData.nombre || ''} onChange={handleChange} />
        
        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Tipo de Cultivo</span>
            <button
              type="button"
              onClick={() => setShowTipoModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            >
              <Settings size={12} />
              Gestionar tipos
            </button>
          </div>
          <select name="tipoCultivoId" value={showNewTipoInput ? 'otro' : formData.tipoCultivoId || ''} onChange={handleChange} className="border border-gray-300 rounded-md p-2 bg-white">
            <option value="" disabled>Seleccionar tipo</option>
            {tiposCultivo.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
            <option value="otro">Otro...</option>
          </select>
        </label>
        
        {showNewTipoInput && (
          <div className="md:col-span-2">
            <Input 
              label="Nombre del Nuevo Tipo" 
              name="newTipoCultivoName" 
              value={newTipoCultivoName} 
              onChange={(e) => setNewTipoCultivoName(e.target.value)} 
              placeholder="Ej: Frutas Tropicales"
            />
          </div>
        )}

        <Input label="Cantidad" name="cantidad" type="number" value={formData.cantidad || ''} onChange={handleChange} />
        <Input label="Fecha de Plantado" name="Fecha_Plantado" type="date" value={formData.Fecha_Plantado || ''} onChange={handleChange} />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Estado del Cultivo</span>
        <select name="Estado" value={formData.Estado || 'Activo'} onChange={handleChange} className="border border-gray-300 rounded-md p-2 bg-white">
          <option value="Activo">Activo</option>
          <option value="Cosecha">Cosecha</option>
        </select>
      </label>
      
      <textarea
        name="descripcion"
        value={formData.descripcion || ''}
        onChange={handleChange}
        placeholder="Descripción"
        className="border border-gray-300 rounded-md p-2 w-full"
        rows={3}
      />

      <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
          <span className="flex items-center space-x-2">
              <UploadCloud className="w-6 h-6 text-gray-600" />
              <span className="font-medium text-gray-600">
                  Arrastra una imagen o <span className="text-blue-600 underline">haz clic</span>
              </span>
          </span>
          <input type="file" name="file_upload" className="hidden" onChange={handleFileChange} accept="image/*" />
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-sm"
        >
          {initialData?.id ? 'Actualizar Cultivo' : 'Registrar Cultivo'}
        </button>
      </div>

      {/* Modal para gestionar tipos de cultivo */}
      {showTipoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gestionar Tipos de Cultivo</h3>
              <button
                onClick={() => setShowTipoModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {tiposCultivo.map((tipo) => (
                <div key={tipo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  {editingTipo?.id === tipo.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editTipoName}
                        onChange={(e) => setEditTipoName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveTipoEdit}
                        className="text-green-600 hover:text-green-800"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingTipo(null);
                          setEditTipoName("");
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-gray-900">{tipo.nombre}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTipo(tipo)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTipo(tipo)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowTipoModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}