import { useState, useEffect, type ReactElement } from 'react';
import { Input } from "@heroui/react";
import type { FichaForm } from '../interfaces/fichas';

interface FichaFormProps {
  initialData: Partial<FichaForm>;
  onSave: (data: FichaForm) => Promise<void>;
  onCancel: () => void;
  editingId: number | null;
}

export default function FichaFormComponent({ initialData, onSave, onCancel, editingId }: FichaFormProps): ReactElement {
  const [form, setForm] = useState(initialData);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  const handleFormChange = (k: keyof FichaForm, v: string) => {
    if (k === "id_ficha") {
      // Solo permitir números
      const digits = String(v).replace(/\D+/g, "");
      setForm((s) => ({ ...s, [k]: digits }));
      return;
    }
    setForm((s) => ({ ...s, [k]: v }));
  };

  const validateAndSave = async () => {
    const errs: string[] = [];

    if (!form.nombre || form.nombre.trim().length === 0) {
      errs.push("El nombre de la ficha es requerido");
    }

    if (!form.id_ficha || form.id_ficha.trim().length === 0) {
      errs.push("El ID de ficha es requerido");
    } else {
      const idFichaDigits = String(form.id_ficha).replace(/\D+/g, "");
      if (idFichaDigits.length < 6 || idFichaDigits.length > 8) {
        errs.push("El ID de ficha debe tener entre 6 y 8 dígitos");
      }
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    await onSave(form as FichaForm);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Nombre de la Ficha"
          value={String(form.nombre ?? "")}
          onChange={(e) => handleFormChange('nombre', e.target.value)}
          placeholder="Ej: Ficha de Prueba"
        />
        <Input
          label="ID de Ficha (6-8 dígitos)"
          value={String(form.id_ficha ?? "")}
          onChange={(e) => handleFormChange('id_ficha', e.target.value)}
          placeholder="Ej: 12345678"
          maxLength={8}
        />
      </div>

      {errors.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded">
          <ul className="list-disc pl-5">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button onClick={validateAndSave} className="bg-green-600 text-white px-4 py-2 rounded">
          {editingId != null ? 'Actualizar Ficha' : 'Crear Ficha'}
        </button>
        <button onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded">Cancelar</button>
      </div>
    </>
  );
}