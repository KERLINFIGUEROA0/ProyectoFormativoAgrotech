import { useState,  type ReactElement } from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import type { Epa, EpaData } from '../interfaces/fitosanitario';
import { Input, Select, SelectItem, Textarea, Button } from '@heroui/react';

interface EpaFormProps {
  initialData?: Partial<Epa>;
  onSave: (data: EpaData) => void;
  onCancel: () => void;
}

const tiposEnfermedad = ['Enfermedad', 'Plaga', 'Arvense'];

export default function EpaForm({
  initialData = {},
  onSave,
  onCancel,
}: EpaFormProps): ReactElement {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    // --- MODIFICACIÓN ---
    descripcion: initialData.descripcion || '', // Descripción de la amenaza
    complicaciones: initialData.complicaciones || '', // Descripción del control
    // --- FIN MODIFICACIÓN ---
    tipoEnfermedad: initialData.tipoEnfermedad || 'Plaga',
    fechaEncuentro: initialData.fechaEncuentro
      ? new Date(initialData.fechaEncuentro).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`Archivo "${file.name}" seleccionado.`);
      setImageFile(file);
    }
  };

  const handleSubmit = () => {
    if (
      !formData.nombre ||
      !formData.tipoEnfermedad ||
      !formData.fechaEncuentro
    ) {
      toast.error('Nombre, Tipo y Fecha son requeridos.');
      return;
    }

    onSave({
      ...formData,
      imageFile: imageFile,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Fila 1: Nombre y Tipo (sin cambios) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ... (Input de Nombre) ... */}
        <div>
          <Input
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: Roya del Café"
            label="Nombre *"
          />
        </div>
        {/* ... (Select de Tipo) ... */}
        <div>
          <Select
            name="tipoEnfermedad"
            selectedKeys={[formData.tipoEnfermedad]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setFormData((prev) => ({ ...prev, tipoEnfermedad: selected as string }));
            }}
            label="Tipo *"
          >
            {tiposEnfermedad.map((tipo) => (
              <SelectItem key={tipo}>
                {tipo}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Fila 2: Fecha (sin cambios) */}
      {/* ... (Input de Fecha) ... */}
      <div>
        <Input
          name="fechaEncuentro"
          type="date"
          value={formData.fechaEncuentro}
          onChange={handleChange}
          label="Fecha de Encuentro/Registro *"
        />
      </div>

      {/* --- INICIO DE MODIFICACIÓN --- */}
      {/* Fila 3: Descripción Amenaza */}
      <div>
        <Textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          placeholder="Describa la amenaza, síntomas, etc."
          label="Descripción de la Amenaza"
          rows={3}
        />
      </div>

      {/* Fila 4: Descripción Control (NUEVO) */}
      <div>
        <Textarea
          name="complicaciones" // <-- Usamos 'complicaciones'
          value={formData.complicaciones}
          onChange={handleChange}
          placeholder="Describa el manejo, control químico o biológico."
          label="Posible Control o Tratamiento"
          rows={3}
        />
      </div>
      {/* --- FIN DE MODIFICACIÓN --- */}


      {/* Fila 5: Carga de Imagen (sin cambios) */}
      {/* ... (Label de Carga de Imagen) ... */}
      <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
        <span className="flex items-center space-x-2">
          <UploadCloud className="w-6 h-6 text-gray-600" />
          <span className="font-medium text-gray-600">
            {imageFile
              ? imageFile.name
              : 'Arrastra una imagen o haz clic'}
          </span>
        </span>
        <input
          type="file"
          name="file_upload"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*"
        />
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          onClick={onCancel}
          color="default"
          variant="light"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
        >
          {initialData?.id ? 'Actualizar EPA' : 'Registrar EPA'}
        </Button>
      </div>
    </div>
  );
}