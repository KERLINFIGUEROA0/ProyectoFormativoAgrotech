import { useState, useEffect, useMemo } from 'react';
import { Button } from "@heroui/react";
import { toast } from 'sonner';
import { UploadCloud, Scale } from 'lucide-react';
import { UnidadesDeMedida, TipoMaterial, type MaterialData, type UnidadMedida } from '../interfaces/inventario';

// ✅ 1. CORRECCIÓN: Definimos solo las unidades que son "contenedores" y necesitan un peso específico.
const UNIDADES_QUE_REQUIEREN_PESO = new Set(['Bulto', 'Saco', 'Caja', 'Rollo']);

interface MaterialFormProps {
  initialData?: Partial<MaterialData>;
  onSave: (data: MaterialData) => void;
  onCancel: () => void;
}

export default function MaterialForm({ initialData = {}, onSave, onCancel }: MaterialFormProps) {
  const [formData, setFormData] = useState<Partial<MaterialData>>(initialData);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setFormData(initialData);
    setImageFile(null);
  }, [initialData]);

  // ✅ 2. CORRECCIÓN: La lógica ahora solo se activa si la unidad de medida está en nuestro Set.
  const muestraCampoPeso = formData.tipoMedida && UNIDADES_QUE_REQUIEREN_PESO.has(formData.tipoMedida);

  const pesoTotalEnKg = useMemo(() => {
    // La lógica de cálculo solo se ejecuta si el campo de peso es visible.
    if (!muestraCampoPeso) return null;

    const cantidad = Number(formData.cantidad);
    const pesoUnitario = Number(formData.pesoPorUnidad);
    if (!cantidad || isNaN(pesoUnitario) || pesoUnitario <= 0) return null;
    
    const totalKg = cantidad * pesoUnitario;
    return `${totalKg.toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg`;
  }, [formData.cantidad, formData.pesoPorUnidad, muestraCampoPeso]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen es demasiado grande. Máx 5MB.');
        e.currentTarget.value = '';
        return setImageFile(null);
      }
      setImageFile(file);
    } else {
      setImageFile(null);
    }
  };

  const handleSubmit = () => {
    if (!formData.nombre || !formData.tipoMaterial || !formData.tipoMedida || !formData.cantidad) {
      toast.error('Por favor completa todos los campos obligatorios (*).');
      return;
    }
    // Si el campo de peso es requerido pero está vacío, muestra un error.
    if (muestraCampoPeso && (!formData.pesoPorUnidad || Number(formData.pesoPorUnidad) <= 0)) {
        toast.error(`Debes especificar el peso por ${formData.tipoMedida}.`);
        return;
    }

    const payload: MaterialData = {
      nombre: formData.nombre,
      tipoMaterial: formData.tipoMaterial as any,
      tipoMedida: formData.tipoMedida as UnidadMedida,
      cantidad: Number(formData.cantidad) || 0,
      descripcion: formData.descripcion ?? '',
      precio: formData.precio ? Number(formData.precio) : undefined,
      ubicacion: formData.ubicacion ?? undefined,
      proveedor: formData.proveedor ?? undefined,
      fechaVencimiento: formData.fechaVencimiento ?? undefined,
      // Solo incluimos el peso si el campo es visible.
      pesoPorUnidad: muestraCampoPeso ? Number(formData.pesoPorUnidad) : undefined,
      imageFile: imageFile ?? undefined,
    };
    onSave(payload);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="nombre" value={formData.nombre || ''} onChange={handleChange} placeholder="Nombre del Producto *" className="border p-2 rounded-md" />
        
        <select name="tipoMaterial" value={formData.tipoMaterial || ''} onChange={handleChange} className="border p-2 rounded-md bg-white">
          <option value="" disabled>Selecciona Categoría *</option>
          {Object.values(TipoMaterial).map(tipo => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>
        
        <select name="tipoMedida" value={formData.tipoMedida || ''} onChange={handleChange} className="border p-2 rounded-md bg-white">
          <option value="" disabled>Selecciona Unidad de Medida *</option>
          {Object.values(UnidadesDeMedida).map(unidad => (
            <option key={unidad} value={unidad}>{unidad}</option>
          ))}
        </select>
        
        <input name="cantidad" type="number" value={formData.cantidad || ''} onChange={handleChange} placeholder={`Cantidad de ${formData.tipoMedida || 'Unidades'} *`} className="border p-2 rounded-md" />
      </div>

      {/* ✅ 3. CORRECCIÓN: Estos campos ahora solo aparecen cuando 'muestraCampoPeso' es true */}
      {muestraCampoPeso && (
        <>
          <input 
            name="pesoPorUnidad" 
            type="number" 
            value={formData.pesoPorUnidad || ''} 
            onChange={handleChange} 
            placeholder={`Peso por ${formData.tipoMedida} (en kg) *`} 
            className="border p-2 rounded-md" 
          />
          {pesoTotalEnKg && (
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-md flex items-center gap-2">
              <Scale className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-800">Peso Total en Inventario</p>
                <p className="text-sm text-green-700">{pesoTotalEnKg}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* El resto del formulario se mantiene igual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="precio" type="number" value={formData.precio || ''} onChange={handleChange} placeholder="Costo por Unidad" className="border p-2 rounded-md" />
        <input name="ubicacion" value={formData.ubicacion || ''} onChange={handleChange} placeholder="Ubicación en Bodega" className="border p-2 rounded-md" />
        <input name="proveedor" value={formData.proveedor || ''} onChange={handleChange} placeholder="Proveedor" className="border p-2 rounded-md" />
        <input name="fechaVencimiento" type="date" value={formData.fechaVencimiento || ''} onChange={handleChange} className="border p-2 rounded-md" />
      </div>
      <textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange} placeholder="Descripción..." className="border p-2 rounded-md w-full" rows={3}/>
      <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-dashed rounded-md cursor-pointer hover:border-gray-400">
        <UploadCloud className="w-6 h-6 text-gray-600" />
        <span className="font-medium text-gray-600">
          {imageFile ? imageFile.name : 'Arrastra una imagen o haz clic'}
        </span>
        <input type="file" name="file_upload" className="hidden" onChange={handleFileChange} accept="image/*" />
      </label>
      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar Material</Button>
      </div>
    </div>
  );
}