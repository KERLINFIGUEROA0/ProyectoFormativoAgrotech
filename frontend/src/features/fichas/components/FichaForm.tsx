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
      <div className="space-y-6">
        {/* Información de la Ficha */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100 animate-in slide-in-from-left-2 duration-400 delay-200">
          <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-in scale-in duration-200 delay-150"></div>
            Información de la Ficha
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="animate-in slide-in-from-left-3 duration-400 delay-300">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Ficha
              </label>
              <Input
                label=""
                placeholder="Ej: Ficha de Desarrollo Web"
                value={String(form.nombre ?? "")}
                onChange={(e) => handleFormChange('nombre', e.target.value)}
                className="w-full"
              />
            </div>
            <div className="animate-in slide-in-from-right-3 duration-400 delay-400">
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
              <p className="text-xs text-gray-500 mt-1 animate-in fade-in duration-300 delay-500">
                Solo números, entre 6 y 8 dígitos
              </p>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-2 animate-in slide-in-from-left-2 duration-300 delay-100">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-in scale-in duration-200 delay-50"></div>
              <span className="text-sm font-medium">Errores de validación:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 animate-in slide-in-from-bottom-2 duration-300 delay-200">
              {errors.map((err, i) => <li key={i} className="text-sm animate-in fade-in duration-200" style={{ animationDelay: `${300 + i * 50}ms` }}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 animate-in slide-in-from-bottom-2 duration-400 delay-600">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors animate-in slide-in-from-left-3 duration-300 delay-700"
          >
            Cancelar
          </button>
          <button
            onClick={validateAndSave}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm animate-in slide-in-from-right-3 duration-300 delay-800"
          >
            {editingId != null ? 'Actualizar Ficha' : 'Crear Ficha'}
          </button>
        </div>
      </div>
    </>
  );
}