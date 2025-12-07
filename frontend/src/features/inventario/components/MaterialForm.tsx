import { useState, useEffect, useMemo, type ChangeEvent, type ReactElement, type ComponentType, type ReactNode, type InputHTMLAttributes } from 'react';
import { Button, Input, Select, SelectItem, Textarea } from "@heroui/react";
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
  TipoMaterial,
  TipoEmpaque,
  MedidasDeContenido,
  type MaterialData,
  type MedidaDeContenido
} from '../interfaces/inventario';


// --- ✅ INICIO DE LA CORRECCIÓN: VALIDACIÓN DE ERRORES ---

// 1. Se añade la propiedad opcional "error" a las interfaces
interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'defaultValue' | 'color' | 'children'> {
  icon: ComponentType<{ size: number, className: string }>;
  label: string;
  error?: boolean;
}

interface FormSelectProps {
  icon: ComponentType<{ size: number, className: string }>;
  label: string;
  children: ReactNode;
  selectedKeys: string[];
  onSelectionChange: (keys: Set<string>) => void;
  error?: boolean;
  name?: string;
}

// 2. Se actualizan los componentes para usar HeroUI
function FormInput({ icon: Icon, label, error, ...props }: FormInputProps) {
  return (
    <Input
      {...(props as any)}
      value={props.value?.toString() || ''}
      label={label}
      startContent={<Icon size={16} className="text-green-600" />}
      isInvalid={error}
      errorMessage={error ? "Campo requerido" : undefined}
    />
  );
}

function FormSelect({ icon: Icon, label, children, error, ...props }: FormSelectProps) {
  return (
    <Select
      {...(props as any)}
      label={label}
      startContent={<Icon size={16} className="text-green-600" />}
      isInvalid={error}
      errorMessage={error ? "Campo requerido" : undefined}
    >
      {children as any}
    </Select>
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
    if (Object.keys(initialData).length > 0) {
      // Clonamos para no mutar
      const dataToLoad = { ...initialData };

      // LÓGICA DE CORRECCIÓN: Si es un empaque, convertimos el Total almacenado a Cantidad de Paquetes
      // Ej: Si la DB tiene 400 (Litros) y el peso es 20, mostramos 20 (Botellas) en el input.
      if (
        initialData.pesoPorUnidad &&
        initialData.pesoPorUnidad > 0 &&
        initialData.tipoEmpaque &&
        initialData.tipoEmpaque !== 'Unidad'
      ) {
         // Math.floor o redondeo para evitar decimales extraños en la visualización del input
         dataToLoad.cantidad = Number(initialData.cantidad) / Number(initialData.pesoPorUnidad);
      }

      setFormData(dataToLoad);
      setImageFile(null);
      setErrors({});

      // ... (El resto de tu lógica de contenido/medida sigue igual) ...
      if (initialData?.id && initialData.medidasDeContenido && initialData.pesoPorUnidad) {
        const pesoNum = Number(initialData.pesoPorUnidad);
        const esLiquido = ['L', 'ml', 'l', 'ml', 'cm3'].includes(initialData.medidasDeContenido); // Agregué minúsculas
        if (pesoNum < 1) {
          setCantidadContenido(String(pesoNum * 1000));
          setMedidaContenido(esLiquido ? 'ml' : 'g');
        } else {
          setCantidadContenido(String(pesoNum));
          setMedidaContenido(esLiquido ? 'l' : 'kg'); // Ajustado a abreviaturas
        }
      } else {
        setCantidadContenido('');
        setMedidaContenido('kg');
      }
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
    const categoriasSinContenido: TipoCategoria[] = [TipoCategoria.HERRAMIENTAS_MANUALES, TipoCategoria.MAQUINARIA_Y_EQUIPOS, TipoCategoria.PROTECCION_Y_SEGURIDAD];
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

  const handleSubmit = () => {
    const isValid = validate();
    if (!isValid) {
      toast.error('Por favor, completa todos los campos obligatorios (*).');
      return;
    }

    const cantPaquetes = Number(formData.cantidad); // Ej: 50 (Bultos)

    const payload: Partial<MaterialData> = {
      nombre: formData.nombre,
      // NO asignamos 'cantidad' todavía, esperaremos al cálculo
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

    // LÓGICA DE CÁLCULO DEL TOTAL REAL
    if (mostrarSeccionContenido && cantidadContenido) {
      const cantContenidoNum = parseFloat(cantidadContenido); // Ej: 50 (kg)

      if (cantContenidoNum > 0) {
        payload.medidasDeContenido = medidaContenido as any;
        let pesoFinalEnBase: number | undefined;

        // 1. Convertimos el contenido de UN paquete a la base (g o ml)
        switch (medidaContenido) {
          case 'kg': pesoFinalEnBase = cantContenidoNum * 1000; break;
          case 'g': pesoFinalEnBase = cantContenidoNum; break;
          case 'L': pesoFinalEnBase = cantContenidoNum * 1000; break;
          case 'ml': pesoFinalEnBase = cantContenidoNum; break;
          case 'lb': pesoFinalEnBase = cantContenidoNum * 453.592; break;
          case 'unidad': pesoFinalEnBase = cantContenidoNum; break;
          default: pesoFinalEnBase = undefined;
        }

        payload.pesoPorUnidad = pesoFinalEnBase; // Ej: 50,000 g
        payload.cantidadPorUnidad = cantContenidoNum; // Visual (50)

        // 2. IMPORTANTE: Calculamos el Stock Total para la BD
        // 50 Bultos * 50,000g = 2,500,000g
        if (pesoFinalEnBase) {
            payload.cantidad = cantPaquetes * pesoFinalEnBase;
        } else {
            payload.cantidad = cantPaquetes; // Fallback
        }

      } else {
        payload.cantidad = cantPaquetes;
      }
    } else {
      // Si es una herramienta (no tiene contenido), la cantidad es directa
      payload.cantidad = cantPaquetes;
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
          selectedKeys={formData.tipoCategoria ? [formData.tipoCategoria] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            handleCategoriaChange({ target: { value: selected } } as any);
          }}
          error={errors.tipoCategoria}
        >
          <SelectItem key="" isDisabled>Selecciona una categoría</SelectItem>
          {Object.values(TipoCategoria).map(cat => (<SelectItem key={cat}>{cat}</SelectItem>))}
        </FormSelect>
      </div>

      {formData.tipoCategoria && materialesDisponibles.length > 0 && (
        <div>
          <FormSelect
            icon={Box}
            label="Tipo de Material"
            name="tipoMaterial"
            selectedKeys={formData.tipoMaterial ? [formData.tipoMaterial] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setFormData(prev => ({ ...prev, tipoMaterial: selected as unknown as TipoMaterial }));
            }}
          >
            <SelectItem key="">Selecciona el tipo de material</SelectItem>
            {materialesDisponibles.map(mat => (<SelectItem key={mat}>{mat}</SelectItem>))}
          </FormSelect>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          icon={Archive}
          label={mostrarSeccionContenido ? "Tipo de Empaque *" : "Tipo de Unidad *"}
          name="tipoEmpaque"
          selectedKeys={formData.tipoEmpaque ? [formData.tipoEmpaque] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            setFormData(prev => ({ ...prev, tipoEmpaque: selected as TipoEmpaque }));
          }}
          error={errors.tipoEmpaque}
        >
          <SelectItem key="" isDisabled>{mostrarSeccionContenido ? "Selecciona un empaque" : "Selecciona una unidad"}</SelectItem>
          {Object.values(TipoEmpaque).map(emp => (<SelectItem key={emp}>{emp}</SelectItem>))}
        </FormSelect>
        <FormInput
          icon={Hash}
          label={mostrarSeccionContenido ? "Cantidad de Empaques *" : "Cantidad de Unidades *"}
          name="cantidad"
          type="number"
          value={formData.cantidad || ''}
          onChange={handleChange}
          placeholder={mostrarSeccionContenido ? "Ej: 50" : "Ej: 10"}
          min="0"
          max="1000000"
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
            min="0"
            max="1000000"
          />
          <FormSelect
            icon={Ruler}
            label="Unidad de Medida"
            selectedKeys={[medidaContenido]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setMedidaContenido(selected as MedidaDeContenido);
            }}
          >
            {Object.values(MedidasDeContenido).map(med => (<SelectItem key={med}>{med}</SelectItem>))}
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
        <Textarea
          name="descripcion"
          value={formData.descripcion || ''}
          onChange={handleChange}
          placeholder="Añade una descripción o nota adicional..."
          label="Descripción"
          startContent={<FileText size={16} className="text-green-600" />}
          rows={3}
        />
      </div>

      <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-dashed rounded-md cursor-pointer hover:border-gray-300">
        <UploadCloud className="w-8 h-8 text-gray-500" />
        <span className="font-medium text-gray-600">{imageFile ? imageFile.name : 'Arrastra una imagen o haz clic para subir'}</span>
        <input type="file" name="file_upload" className="hidden" onChange={handleFileChange} accept="image/*" />
      </label>

      <div className="flex justify-center gap-4">
        <Button onClick={onCancel} color="danger" variant="light" className="w-40">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} color="success" className="w-40">
          Guardar Material
        </Button>
      </div>
    </div>
  );
}