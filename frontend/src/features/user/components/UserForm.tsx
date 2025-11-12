import { useState, useEffect, type ReactElement } from 'react';
import { Input } from "@heroui/react";
import { Plus, HelpCircle } from 'lucide-react';
import type { UsuarioForm, Rol } from '../interfaces/usuarios';
import type { FichaOption } from '../../fichas/interfaces/fichas';
import { getFichasOpcionesFromUsuarios, createFicha } from '../../fichas/api/fichas';
import FichaFormComponent from '../../fichas/components/FichaForm';
import type { FichaForm } from '../../fichas/interfaces/fichas';

interface UserFormProps {
  initialData: Partial<UsuarioForm>;
  roles: Rol[];
  onSave: (data: UsuarioForm) => Promise<void>;
  onCancel: () => void;
  editingId: number | null;
}

export default function UserForm({ initialData, roles, onSave, onCancel, editingId }: UserFormProps): ReactElement {
  const [form, setForm] = useState(initialData);
  const [errors, setErrors] = useState<string[]>([]);
  const [fichasOpciones, setFichasOpciones] = useState<FichaOption[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);
  const [fichaFormData, setFichaFormData] = useState<Partial<FichaForm>>({});

  const rolSeleccionado = roles.find(rol => rol.id === form.rolId);
  const requiereFicha = rolSeleccionado?.nombre.toLowerCase() === 'aprendiz' || rolSeleccionado?.nombre.toLowerCase() === 'pasante';

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  useEffect(() => {
    if (requiereFicha) {
      loadFichasOpciones();
    }
  }, [requiereFicha]);

  const loadFichasOpciones = async () => {
    try {
      setLoadingFichas(true);
      const opciones = await getFichasOpcionesFromUsuarios();
      setFichasOpciones(opciones);
    } catch (error) {
      console.error('Error cargando opciones de fichas:', error);
    } finally {
      setLoadingFichas(false);
    }
  };

  const handleCreateFicha = async (fichaData: FichaForm) => {
    try {
      const nuevaFicha = await createFicha({
        nombre: fichaData.nombre!,
        id_ficha: fichaData.id_ficha!
      });
      await loadFichasOpciones();
      setForm(prev => ({ ...prev, id_ficha: nuevaFicha.id_ficha }));
      setIsFichaModalOpen(false);
      setFichaFormData({});
    } catch (error) {
      console.error('Error creando ficha:', error);
      throw error; 
    }
  };

  const handleFormChange = (k: keyof UsuarioForm, v: string | number) => {
     if (k === "identificacion" || k === "rolId") {
      const digits = String(v).replace(/\D+/g, "");
      if (digits === "") {
        setForm((s) => ({ ...s, [k]: undefined }));
        return;
      }
      const num = Number(digits);
      setForm((s) => ({ ...s, [k]: num }));
      return;
    }
    if (k === "telefono") {
      const digits = String(v).replace(/\D+/g, "");
      setForm((s) => ({ ...s, [k]: digits }));
      return;
    }
    setForm((s) => ({ ...s, [k]: v }));
  };

  const validateAndSave = async () => {
    const errs: string[] = [];
    const idDigits = String(form.identificacion ?? "").replace(/\D+/g, "");
    if (idDigits.length < 6 || idDigits.length > 10) {
      errs.push("Identificación debe tener entre 6 y 10 dígitos");
    }
    const telDigits = String(form.telefono ?? "").replace(/\D+/g, "");
    if (telDigits.length !== 10) {
      errs.push("Teléfono debe tener exactamente 10 dígitos");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(form.correo ?? ""))) {
      errs.push("Email inválido");
    }
    if (!form.rolId) errs.push("Debe seleccionar un rol.");
    if (!form.nombre) errs.push("El nombre es requerido.");
    if (!form.apellidos) errs.push("Los apellidos son requeridos.");
    if (requiereFicha && !form.id_ficha) {
      const rolName = rolSeleccionado?.nombre.charAt(0).toUpperCase() + rolSeleccionado?.nombre.slice(1);
      errs.push(`La ficha es obligatoria para el rol de ${rolName}.`);
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    await onSave(form as UsuarioForm);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Información Personal */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 animate-in slide-in-from-left-2 duration-400 delay-100">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-50">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-in scale-in duration-200 delay-25"></div>
            Información Personal
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Identificación
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                onChange={(e) => handleFormChange('tipo', e.target.value)}
                value={String(form.tipo ?? "CC")}
              >
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="TI">Tarjeta de Identidad</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Identificación
              </label>
              <Input
                label=""
                placeholder="Ingrese el número de identificación"
                value={String(form.identificacion ?? "")}
                onChange={(e) => handleFormChange('identificacion', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombres
              </label>
              <Input
                label=""
                placeholder="Ingrese los nombres"
                value={String(form.nombre ?? "")}
                onChange={(e) => handleFormChange('nombre', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellidos
              </label>
              <Input
                label=""
                placeholder="Ingrese los apellidos"
                value={String(form.apellidos ?? "")}
                onChange={(e) => handleFormChange('apellidos', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100 animate-in slide-in-from-right-2 duration-400 delay-200">
          <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-150">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-in scale-in duration-200 delay-125"></div>
            Información de Contacto
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <Input
                label=""
                type="email"
                placeholder="correo@ejemplo.com"
                value={String(form.correo ?? "")}
                onChange={(e) => handleFormChange('correo', e.target.value)}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <Input
                label=""
                placeholder="Ingrese el número de teléfono"
                value={String(form.telefono ?? "")}
                onChange={(e) => handleFormChange('telefono', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Información del Sistema */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100 animate-in slide-in-from-bottom-2 duration-400 delay-300">
          <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-250">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-in scale-in duration-200 delay-225"></div>
            Información del Sistema
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol del Usuario
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                onChange={(e) => handleFormChange('rolId', Number(e.target.value))}
                value={form.rolId ?? ""}
              >
                <option value="" disabled>Seleccione un rol</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                ))}
              </select>
            </div>

            {requiereFicha && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ficha de Formación
                </label>
                <div className="flex gap-3">
                  <select
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    onChange={(e) => handleFormChange('id_ficha', e.target.value)}
                    value={form.id_ficha ?? ""}
                    disabled={loadingFichas}
                  >
                    <option value="" disabled>
                      {loadingFichas ? "Cargando fichas..." : "Seleccione una ficha"}
                    </option>
                    {fichasOpciones.map((ficha) => (
                      <option key={ficha.value} value={ficha.value}>{ficha.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsFichaModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors shadow-sm"
                    title="Crear nueva ficha"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Nueva Ficha</span>
                  </button>
                </div>
              </div>
            )}
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
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm animate-in slide-in-from-right-3 duration-300 delay-800"
          >
            {editingId != null ? 'Actualizar Usuario' : 'Registrar Usuario'}
          </button>
        </div>
      </div>

      {isFichaModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Crear Nueva Ficha</h3>
              <button
                onClick={() => {
                  setIsFichaModalOpen(false);
                  setFichaFormData({});
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HelpCircle size={20} className="text-gray-500" />
              </button>
            </div>
            <FichaFormComponent
              initialData={fichaFormData}
              onSave={handleCreateFicha}
              onCancel={() => {
                setIsFichaModalOpen(false);
                setFichaFormData({});
              }}
              editingId={null}
            />
          </div>
        </div>
      )}
    </>
  );
}
