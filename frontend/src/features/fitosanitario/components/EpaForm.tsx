import { useState,  type ReactElement } from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import type { Epa, EpaData } from '../interfaces/fitosanitario';

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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: Roya del Café"
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        {/* ... (Select de Tipo) ... */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo *
          </label>
          <select
            name="tipoEnfermedad"
            value={formData.tipoEnfermedad}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2 bg-white"
          >
            {tiposEnfermedad.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 2: Fecha (sin cambios) */}
      {/* ... (Input de Fecha) ... */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de Encuentro/Registro *
        </label>
        <input
          name="fechaEncuentro"
          type="date"
          value={formData.fechaEncuentro}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      {/* --- INICIO DE MODIFICACIÓN --- */}
      {/* Fila 3: Descripción Amenaza */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción de la Amenaza
        </label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          placeholder="Describa la amenaza, síntomas, etc."
          className="w-full border border-gray-300 rounded-md p-2"
          rows={3}
        />
      </div>

      {/* Fila 4: Descripción Control (NUEVO) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Posible Control o Tratamiento
        </label>
        <textarea
          name="complicaciones" // <-- Usamos 'complicaciones'
          value={formData.complicaciones}
          onChange={handleChange}
          placeholder="Describa el manejo, control químico o biológico."
          className="w-full border border-gray-300 rounded-md p-2"
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
          {initialData?.id ? 'Actualizar EPA' : 'Registrar EPA'}
        </button>
      </div>
    </div>
  );
}