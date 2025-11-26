import { useState, useEffect, useMemo, type ChangeEvent, type ReactElement, type ComponentType, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { Button } from "@heroui/react";
import { toast } from 'sonner';
import {
  UploadCloud,
  Package,
  LayoutGrid,
  Box,
  Archive,
  Hash,
  Ruler,
  DollarSign,
  MapPin,
  Truck,
  Calendar,
  FileText
} from 'lucide-react';
import {
  TipoCategoria,
  categoriasYMateriales,
  TipoEmpaque,
  MedidasDeContenido,
  type MaterialData,
  type MedidaDeContenido
} from '../interfaces/inventario';


// --- ✅ INICIO DE LA CORRECCIÓN: VALIDACIÓN DE ERRORES ---

// 1. Se añade la propiedad opcional "error" a las interfaces
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ComponentType<{ size: number, className: string }>;
  label: string;
  error?: boolean; // <-- Nueva propiedad
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  icon: ComponentType<{ size: number, className: string }>;
  label: string;
  children: ReactNode;
  error?: boolean; // <-- Nueva propiedad
}

// 2. Se actualizan los componentes para usar la propiedad "error" y cambiar las clases de CSS
function FormInput({ icon: Icon, label, error, ...props }: FormInputProps) {
  const baseClasses = "w-full border-2 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition";
  const errorClasses = "border-red-500 bg-red-50 placeholder-red-400";
  const normalClasses = "border-gray-200";

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
        <Icon size={16} className="text-green-600" />
        {label}
      </label>
      <input {...props} className={`${baseClasses} ${error ? errorClasses : normalClasses}`} />
    </div>
  );
}

function FormSelect({ icon: Icon, label, children, error, ...props }: FormSelectProps) {
  const baseClasses = "w-full border-2 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition bg-white";
  const errorClasses = "border-red-500 bg-red-50";
  const normalClasses = "border-gray-200";

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
        <Icon size={16} className="text-green-600" />
        {label}
      </label>
      <select {...props} className={`${baseClasses} ${error ? errorClasses : normalClasses}`}>
        {children}
      </select>
    </div>
  );
}
// --- ✅ FIN DE LA CORRECCIÓN ---


interface MaterialFormProps {
  initialData?: Partial<MaterialData>;
  onSave: (data: MaterialData) => void;
  onCancel: () => void;
}

export default function MaterialForm({ initialData = {}, onSave, onCancel }: MaterialFormProps): ReactElement {
  const [formData, setFormData] = useState<Partial<MaterialData>>(initialData);
  const [cantidadContenido, setCantidadContenido] = useState('');
  const [medidaContenido, setMedidaContenido] = useState<MedidaDeContenido>('kg');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // 3. Se añade un estado para registrar los errores de validación
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFormData(initialData);
    setImageFile(null);
    setErrors({}); // Limpiar errores al cambiar los datos iniciales

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

  const handleCategoriaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nuevaCategoria = e.target.value as TipoCategoria;
    setFormData(prev => ({ ...prev, tipoCategoria: nuevaCategoria, tipoMaterial: undefined }));
    // Limpiar error al cambiar el campo
    if (errors.tipoCategoria) setErrors(prev => ({ ...prev, tipoCategoria: false }));
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

  // Inferir tipo de consumo basado en categoría
  const tipoConsumoInferido = useMemo(() => {
    if (!formData.tipoCategoria) return null;
    const categoriasNoConsumibles: TipoCategoria[] = [TipoCategoria.HERRAMIENTAS_MANUALES, TipoCategoria.MAQUINARIA_Y_EQUIPOS, TipoCategoria.PROTECCION_Y_SEGURIDAD];
    return categoriasNoConsumibles.includes(formData.tipoCategoria) ? 'no_consumible' : 'consumible';
  }, [formData.tipoCategoria]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error al cambiar el campo
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  };
  
  // 4. Se crea la función de validación
  const validate = (): boolean => {
    const newErrors: Record<string, boolean> = {};
    if (!formData.nombre?.trim()) newErrors.nombre = true;
    if (!formData.tipoCategoria) newErrors.tipoCategoria = true;
    if (!formData.tipoEmpaque) newErrors.tipoEmpaque = true;
    if (!formData.cantidad || Number(formData.cantidad) <= 0) newErrors.cantidad = true;

    setErrors(newErrors);
    // Devuelve `true` si no hay errores, `false` si hay al menos uno
    return Object.keys(newErrors).length === 0;
  };

  // 5. Se actualiza handleSubmit para que llame a la validación primero
  const handleSubmit = () => {
    const isValid = validate();
    if (!isValid) {
      toast.error('Por favor, completa todos los campos obligatorios (*).');
      return;
    }
    
    // El resto de la lógica de guardado se mantiene igual
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
      tipoConsumo: tipoConsumoInferido || undefined,
      usosTotales: formData.usosTotales ? Number(formData.usosTotales) : undefined,
    };

    if (mostrarSeccionContenido && cantidadContenido) {
      const cantContenidoNum = parseFloat(cantidadContenido);
      if (cantContenidoNum > 0) {
        payload.medidasDeContenido = medidaContenido as any;

        let pesoFinalEnKg: number | undefined;
        switch (medidaContenido) {
          case 'kg': pesoFinalEnKg = cantContenidoNum; break;
          case 'g': pesoFinalEnKg = cantContenidoNum / 1000; break;
          case 'L': pesoFinalEnKg = cantContenidoNum; break;
          case 'ml': pesoFinalEnKg = cantContenidoNum / 1000; break;
          case 'lb': pesoFinalEnKg = cantContenidoNum * 0.453592; break;
          case 'unidades': pesoFinalEnKg = cantContenidoNum; break; // Para unidades, usar como cantidad
          default: pesoFinalEnKg = undefined;
        }
        payload.pesoPorUnidad = pesoFinalEnKg;

        // Para consumibles, usar el contenido como cantidadPorUnidad
        if (tipoConsumoInferido === 'consumible') {
          payload.cantidadPorUnidad = cantContenidoNum;
        }
      }
    }

    onSave(payload as MaterialData);
  };

  return (
    <div className="space-y-6">
      {/* 6. Se pasa la propiedad `error` a cada componente de formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          icon={Package}
          label="Nombre del Producto *"
          name="nombre"
          value={formData.nombre || ''}
          onChange={handleChange}
          placeholder="Ej: Fertilizante NPK 15-15-15"
          error={errors.nombre}
        />
        <FormSelect
          icon={LayoutGrid}
          label="Categoría *"
          name="tipoCategoria"
          value={formData.tipoCategoria || ''}
          onChange={handleCategoriaChange}
          error={errors.tipoCategoria}
        >
          <option value="" disabled>Selecciona una categoría</option>
          {Object.values(TipoCategoria).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
        </FormSelect>
      </div>

      {formData.tipoCategoria && materialesDisponibles.length > 0 && (
        <div>
          <FormSelect
            icon={Box}
            label="Tipo de Material"
            name="tipoMaterial"
            value={formData.tipoMaterial || ''}
            onChange={handleChange}
          >
            <option value="">Selecciona el tipo de material</option>
            {materialesDisponibles.map(mat => (<option key={mat} value={mat}>{mat}</option>))}
          </FormSelect>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          icon={Archive}
          label={mostrarSeccionContenido ? "Tipo de Empaque *" : "Tipo de Unidad *"}
          name="tipoEmpaque"
          value={formData.tipoEmpaque || ''}
          onChange={handleChange}
          error={errors.tipoEmpaque}
        >
          <option value="" disabled>{mostrarSeccionContenido ? "Selecciona un empaque" : "Selecciona una unidad"}</option>
          {Object.values(TipoEmpaque).map(emp => (<option key={emp} value={emp}>{emp}</option>))}
        </FormSelect>
        <FormInput
          icon={Hash}
          label={mostrarSeccionContenido ? "Cantidad de Empaques *" : "Cantidad de Unidades *"}
          name="cantidad"
          type="number"
          value={formData.cantidad || ''}
          onChange={handleChange}
          placeholder={mostrarSeccionContenido ? "Ej: 50" : "Ej: 10"}
          error={errors.cantidad}
        />
      </div>

      {tipoConsumoInferido === 'no_consumible' && (
        <div>
          <FormInput
            icon={Hash}
            label="Usos Totales"
            name="usosTotales"
            type="number"
            value={formData.usosTotales || ''}
            onChange={handleChange}
            placeholder="Ej: 100 (usos de la pala)"
          />
        </div>
      )}

      {mostrarSeccionContenido && (
        <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50 grid grid-cols-2 gap-4">
          <FormInput
            icon={Ruler}
            label={`Contenido por ${formData.tipoEmpaque || 'Empaque'}`}
            type="number"
            value={cantidadContenido}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCantidadContenido(e.target.value)}
            placeholder="Ej: 25"
          />
          <FormSelect
            icon={Ruler}
            label="Unidad de Medida"
            value={medidaContenido}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMedidaContenido(e.target.value as MedidaDeContenido)}
          >
            {Object.values(MedidasDeContenido).map(med => (<option key={med} value={med}>{med}</option>))}
          </FormSelect>
        </div>
      )}

      {/* Los campos opcionales no necesitan la propiedad "error" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          icon={DollarSign}
          label="Precio"
          name="precio"
          type="number"
          value={formData.precio || ''}
          onChange={handleChange}
          placeholder="Precio por empaque"
        />
        <FormInput
          icon={MapPin}
          label="Ubicación"
          name="ubicacion"
          value={formData.ubicacion || ''}
          onChange={handleChange}
          placeholder="Ej: Bodega principal"
        />
        <FormInput
          icon={Truck}
          label="Proveedor"
          name="proveedor"
          value={formData.proveedor || ''}
          onChange={handleChange}
          placeholder="Nombre del proveedor"
        />
        <FormInput
          icon={Calendar}
          label="Fecha de Vencimiento"
          name="fechaVencimiento"
          type="date"
          value={formData.fechaVencimiento || ''}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
          <FileText size={16} className="text-green-600" />
            Descripción
        </label>
        <textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange} placeholder="Añade una descripción o nota adicional..." className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition" rows={3} />
      </div>

      <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-dashed rounded-md cursor-pointer hover:border-gray-300">
        <UploadCloud className="w-8 h-8 text-gray-500" />
        <span className="font-medium text-gray-600">{imageFile ? imageFile.name : 'Arrastra una imagen o haz clic para subir'}</span>
        <input type="file" name="file_upload" className="hidden" onChange={handleFileChange} accept="image/*" />
      </label>

      <div className="flex justify-center gap-4">
        <Button onClick={onCancel} className="bg-red-100 text-red-700 border-2 border-red-200 hover:bg-red-200 w-40">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700 w-40">
          Guardar Material
        </Button>
      </div>
    </div>
  );
}