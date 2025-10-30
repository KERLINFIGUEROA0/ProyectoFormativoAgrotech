import { useState, useEffect, type ReactElement } from 'react';
import { Input, Button } from "@heroui/react"; // Asumo que usas @heroui/react
import { toast } from "sonner";
import type { DraculaData } from '../interfaces/dracula';

interface DraculaFormProps {
  initialData?: Partial<DraculaData>;
  onSave: (data: DraculaData) => void;
  onCancel: () => void;
}

export default function DraculaForm({ initialData = {}, onSave, onCancel }: DraculaFormProps): ReactElement {
  const [formData, setFormData] = useState<Partial<DraculaData>>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const { placa, color } = formData;
    if (!placa || !color) {
      toast.error("La placa y el color son requeridos.");
      return;
    }
    // Llama a la función onSave que le pasó la página principal
    onSave({ placa, color });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Usamos los campos de tu DTO: placa y color */}
      <Input label="Placa" name="placa" value={formData.placa || ''} onChange={handleChange} placeholder="Ej: DRC-666" fullWidth />
      <Input label="Color" name="color" value={formData.color || ''} onChange={handleChange} placeholder="Ej: Negro" fullWidth />
      
      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar</Button>
      </div>
    </div>
  );
}