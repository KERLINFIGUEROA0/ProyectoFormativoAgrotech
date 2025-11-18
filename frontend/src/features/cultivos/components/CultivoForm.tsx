// src/features/cultivos/components/CultivoForm.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";
import { UploadCloud, AlertTriangle, ArrowRight } from 'lucide-react';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSurcosPorLote } from '../api/surcosApi';
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
          <span className="text-sm font-medium text-gray-700">Tipo de Cultivo</span>
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
    </div>
  );
}