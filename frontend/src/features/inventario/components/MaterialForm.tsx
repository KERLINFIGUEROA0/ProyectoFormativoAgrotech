import { useState, useEffect, useMemo } from 'react';
import { Button } from "@heroui/react";
import { toast } from 'sonner';
import { UploadCloud } from 'lucide-react';
import {
  TipoCategoria,
  categoriasYMateriales,
  TipoEmpaque,
  MedidasDeContenido,
  type MaterialData,
  type MedidaDeContenido
} from '../interfaces/inventario';

interface MaterialFormProps {
  initialData?: Partial<MaterialData>;
  onSave: (data: MaterialData) => void;
  onCancel: () => void;
}

export default function MaterialForm({ initialData = {}, onSave, onCancel }: MaterialFormProps) {
  const [formData, setFormData] = useState<Partial<MaterialData>>(initialData);
  const [cantidadContenido, setCantidadContenido] = useState('');
  const [medidaContenido, setMedidaContenido] = useState<MedidaDeContenido>('kg');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setFormData(initialData);
    setImageFile(null);

    // Lógica para pre-cargar los campos de contenido al editar
    if (initialData?.id && initialData.medidasDeContenido && initialData.pesoPorUnidad) {
      const pesoNum = Number(initialData.pesoPorUnidad);
      const esLiquido = ['L', 'ml'].includes(initialData.medidasDeContenido);
      if (pesoNum < 1) {
        setCantidadContenido(String(pesoNum * 1000));
        setMedidaContenido(esLiquido ? 'ml' : 'g');
      } else {
        setCantidadContenido(String(pesoNum));
        setMedidaContenido(esLiquido ? 'L' : 'kg');
      }
    } else {
      setCantidadContenido('');
      setMedidaContenido('kg');
    }
  }, [initialData]);

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaCategoria = e.target.value as TipoCategoria;
    setFormData(prev => ({ ...prev, tipoCategoria: nuevaCategoria, tipoMaterial: undefined }));
  };

  const materialesDisponibles = useMemo(() => {
    if (!formData.tipoCategoria) return [];
    return categoriasYMateriales[formData.tipoCategoria] || [];
  }, [formData.tipoCategoria]);

  const mostrarSeccionContenido = useMemo(() => {
    if (!formData.tipoCategoria) return false;
    const categoriasSinContenido: TipoCategoria[] = [TipoCategoria.HERRAMIENTAS_MANUALES, TipoCategoria.MAQUINARIA_Y_EQUIPOS];
    return !categoriasSinContenido.includes(formData.tipoCategoria);
  }, [formData.tipoCategoria]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  };

  const handleSubmit = () => {
    if (!formData.nombre || !formData.tipoCategoria || !formData.tipoEmpaque || !formData.cantidad) {
      toast.error('Nombre, Categoría, Empaque y Cantidad son obligatorios.');
      return;
    }
    const payload: Partial<MaterialData> = {
      nombre: formData.nombre,
      cantidad: Number(formData.cantidad),
      tipoCategoria: formData.tipoCategoria,
      tipoMaterial: formData.tipoMaterial,
      tipoEmpaque: formData.tipoEmpaque,
      precio: formData.precio ? Number(formData.precio) : undefined,
      descripcion: formData.descripcion,
      ubicacion: formData.ubicacion,
      proveedor: formData.proveedor,
      fechaVencimiento: formData.fechaVencimiento,
      imageFile: imageFile || undefined,
    };

    if (mostrarSeccionContenido && cantidadContenido) {
      const cantContenidoNum = parseFloat(cantidadContenido);
      if (cantContenidoNum > 0) {
        payload.medidasDeContenido = medidaContenido as any;

        let pesoFinalEnKg: number | undefined;
        switch (medidaContenido) {
          case 'kg': pesoFinalEnKg = cantContenidoNum; break;
          case 'g': pesoFinalEnKg = cantContenidoNum / 1000; break;
          case 'L': pesoFinalEnKg = cantContenidoNum; break; // Asumimos 1L ≈ 1kg para simplificar
          case 'ml': pesoFinalEnKg = cantContenidoNum / 1000; break;
          case 'lb': pesoFinalEnKg = cantContenidoNum * 0.453592; break;
          default: pesoFinalEnKg = undefined;
        }
        payload.pesoPorUnidad = pesoFinalEnKg;
      }
    }

    // 3. Llamamos a onSave con el payload limpio.
    onSave(payload as MaterialData);

    // --- ✅ FIN DE LA CORRECCIÓN ---
  };
  // --- FIN DE LA CORRECCIÓN ---

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="nombre" value={formData.nombre || ''} onChange={handleChange} placeholder="Nombre del Producto *" className="border p-2 rounded-md" />
        <select
          name="tipoCategoria"
          value={formData.tipoCategoria || ''}
          onChange={handleCategoriaChange}
          className="border p-2 rounded-md bg-white"
        >
          <option value="" disabled>Selecciona Categoría *</option>
          {Object.values(TipoCategoria).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
      </div>

      {formData.tipoCategoria && materialesDisponibles.length > 0 && (
        <div className="grid grid-cols-1">
          <select
            name="tipoMaterial"
            value={formData.tipoMaterial || ''}
            onChange={handleChange}
            className="border p-2 rounded-md bg-white"
          >
            <option value="" disabled>Selecciona el Tipo de Material *</option>
            {materialesDisponibles.map(mat => (<option key={mat} value={mat}>{mat}</option>))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select name="tipoEmpaque" value={formData.tipoEmpaque || ''} onChange={handleChange} className="border p-2 rounded-md bg-white">
          <option value="" disabled>Tipo de Empaque *</option>
          {Object.values(TipoEmpaque).map(emp => (<option key={emp} value={emp}>{emp}</option>))}
        </select>
        <input name="cantidad" type="number" value={formData.cantidad || ''} onChange={handleChange} placeholder="Cantidad de Empaques *" className="border p-2 rounded-md" />
      </div>

      {mostrarSeccionContenido && (
        <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50 grid grid-cols-2 gap-4">
          <input
            type="number"
            value={cantidadContenido}
            onChange={(e) => setCantidadContenido(e.target.value)}
            placeholder={`Contenido por ${formData.tipoEmpaque || 'Empaque'}`}
            className="border p-2 rounded-md"
          />
          <select
            value={medidaContenido}
            onChange={(e) => setMedidaContenido(e.target.value as any)}
            className="border p-2 rounded-md bg-white"
          >
            <option value="" disabled>Unidad</option>
            {Object.values(MedidasDeContenido).map(med => (<option key={med} value={med}>{med}</option>))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="precio" type="number" value={formData.precio || ''} onChange={handleChange} placeholder="Precio" className="border p-2 rounded-md" />
        <input name="ubicacion" value={formData.ubicacion || ''} onChange={handleChange} placeholder="Ubicación" className="border p-2 rounded-md" />
        <input name="proveedor" value={formData.proveedor || ''} onChange={handleChange} placeholder="Proveedor" className="border p-2 rounded-md" />
        <input name="fechaVencimiento" type="date" value={formData.fechaVencimiento || ''} onChange={handleChange} className="border p-2 rounded-md" />
      </div>
      <textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange} placeholder="Descripción..." className="border p-2 rounded-md w-full" rows={3} />
      <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-dashed rounded-md cursor-pointer hover:border-gray-400">
        <UploadCloud className="w-6 h-6 text-gray-600" />
        <span className="font-medium text-gray-600">{imageFile ? imageFile.name : 'Arrastra una imagen o haz clic'}</span>
        <input type="file" name="file_upload" className="hidden" onChange={handleFileChange} accept="image/*" />
      </label>
      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar Material</Button>
      </div>
    </div>
  );
}