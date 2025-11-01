import { useState, useEffect, type ReactElement } from 'react';
import { Input } from "@heroui/react";
import { Plus, HelpCircle } from 'lucide-react';
import type { UsuarioForm, Rol } from '../interfaces/usuarios';
import type { FichaOption } from '../../fichas/interfaces/fichas';
import { getFichasOpcionesFromUsuarios, createFicha } from '../../fichas/api/fichas';
import Modal from '../../../components/Modal';
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
    if (requiereFicha && !form.id_ficha) errs.push("Debe seleccionar una ficha para el rol de Aprendiz.");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    await onSave(form as UsuarioForm);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
         <div>
            <label className="block text-sm">
                <span className="text-xs text-gray-500">Tipo de Identificación</span>
                <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                onChange={(e) => handleFormChange('tipo', e.target.value)}
                value={String(form.tipo ?? "CC")}
                >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                </select>
            </label>
        </div>
        <Input label="Identificación" value={String(form.identificacion ?? "")} onChange={(e) => handleFormChange('identificacion', e.target.value)} />
        <Input label="Nombres" value={String(form.nombre ?? "")} onChange={(e) => handleFormChange('nombre', e.target.value)} />
        <Input label="Apellidos" value={String(form.apellidos ?? "")} onChange={(e) => handleFormChange('apellidos', e.target.value)} />
        <Input label="Correo electrónico" value={String(form.correo ?? "")} onChange={(e) => handleFormChange('correo', e.target.value)} className="md:col-span-2" />
        <Input label="Teléfono" value={String(form.telefono ?? "")} onChange={(e) => handleFormChange('telefono', e.target.value)} className="md:col-span-2" />
        <div className="md:col-span-2">
            <label className="block text-sm">
                <span className="text-xs text-gray-500">Seleccione el rol</span>
                <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                onChange={(e) => handleFormChange('rolId', Number(e.target.value))}
                value={form.rolId ?? ""}
                >
                <option value="" disabled>Seleccione un rol</option>
                {roles.map((rol) => (
                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                ))}
                </select>
            </label>
        </div>
        {requiereFicha && (
          <div className="md:col-span-2">
            <label className="block text-sm">
                <span className="text-xs text-gray-500">Seleccione la ficha</span>
                <div className="flex gap-2">
                  <select
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm bg-white"
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
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                    title="Crear nueva ficha"
                  >
                    <Plus size={14} />
                    <HelpCircle size={14} />
                  </button>
                </div>
            </label>
          </div>
        )}
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
          {editingId != null ? 'Actualizar Usuario' : 'Registrar Usuario'}
        </button>
        <button onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded">Cancelar</button>
      </div>

      {isFichaModalOpen && (
        <Modal
          isOpen={isFichaModalOpen}
          onClose={() => {
            setIsFichaModalOpen(false);
            setFichaFormData({});
          }}
          title="Crear Nueva Ficha"
        >
          <FichaFormComponent
            initialData={fichaFormData}
            onSave={handleCreateFicha}
            onCancel={() => {
              setIsFichaModalOpen(false);
              setFichaFormData({});
            }}
            editingId={null}
          />
        </Modal>
      )}
    </>
  );
}
