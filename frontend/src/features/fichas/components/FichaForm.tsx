import { useState, useEffect, type ReactElement } from 'react';
import { Input, Button } from "@heroui/react";
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
      <div className="space-y-4">
        {/* Información de la Ficha */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 md:p-4 rounded-lg border border-green-100">
          <h4 className="text-sm font-semibold text-green-900 mb-3 md:mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Información de la Ficha
          </h4>
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Ficha
              </label>
              <Input
                label=""
                placeholder="Ej: Pae o Produccion Agropecuaria"
                value={String(form.nombre ?? "")}
                onChange={(e) => handleFormChange('nombre', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Ficha (6-8 dígitos)
              </label>
              <Input
                label=""
                placeholder="Ej: 12345678"
                value={String(form.id_ficha ?? "")}
                onChange={(e) => handleFormChange('id_ficha', e.target.value)}
                maxLength={8}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Solo números, entre 6 y 8 dígitos
              </p>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">Errores de validación:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((err, i) => <li key={i} className="text-sm">{err}</li>)}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-gray-200">
          <Button
            onClick={onCancel}
            color="default"
            variant="light"
            size="sm"
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={validateAndSave}
            color="primary"
            size="sm"
            className="w-full sm:w-auto"
          >
            {editingId != null ? 'Actualizar Ficha' : 'Crear Ficha'}
          </Button>
        </div>
      </div>
    </>
  );
}