// src/features/cultivos/components/CultivoForm.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";
import { UploadCloud } from 'lucide-react';

interface CultivoFormProps {
  initialData?: any;
  tiposCultivo: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function CultivoForm({ initialData = {}, tiposCultivo, onSave, onCancel }: CultivoFormProps): ReactElement {
  const [formData, setFormData] = useState({ Estado: 'Activo', ...initialData });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [newTipoCultivoName, setNewTipoCultivoName] = useState("");

  useEffect(() => {
    setFormData({ Estado: 'Activo', ...initialData });
    setShowNewTipoInput(false);
    setNewTipoCultivoName("");
    setImageFile(null);
  }, [initialData]);

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

      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar Cultivo</Button>
      </div>
    </div>
  );
}