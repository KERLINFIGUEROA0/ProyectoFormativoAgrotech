import { useState, useEffect, type ReactElement } from 'react';
import { Input, Select, SelectItem, Button, Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
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
    // Validar tipo de identificación
    if (!form.tipo) {
      toast.error("El tipo de identificación es obligatorio.");
      return;
    }
    
    const idDigits = String(form.identificacion ?? "").replace(/\D+/g, "");
    if (idDigits.length < 6 || idDigits.length > 10) {
      toast.error("Identificación debe tener entre 6 y 10 dígitos");
      return;
    }
    const telDigits = String(form.telefono ?? "").replace(/\D+/g, "");
    if (telDigits.length !== 10) {
      toast.error("Teléfono debe tener exactamente 10 dígitos");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(form.correo ?? ""))) {
      toast.error("Email inválido");
      return;
    }
    if (!form.rolId) {
      toast.error("Debe seleccionar un rol.");
      return;
    }
    if (!form.nombre) {
      toast.error("El nombre es requerido.");
      return;
    }
    if (!form.apellidos) {
      toast.error("Los apellidos son requeridos.");
      return;
    }
    if (requiereFicha && !form.id_ficha) {
      const rolName = rolSeleccionado?.nombre.charAt(0).toUpperCase() + rolSeleccionado?.nombre.slice(1);
      toast.error(`La ficha es obligatoria para el rol de ${rolName}.`);
      return;
    }


    await onSave(form as UsuarioForm);
  };

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        {/* Información Personal */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 md:p-4 rounded-lg border border-blue-100 animate-in slide-in-from-left-2 duration-400 delay-100">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-50">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-in scale-in duration-200 delay-25"></div>
            Información Personal
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Identificación <span className="text-red-500">*</span>
              </label>
              <Select
                placeholder="Seleccione el tipo de identificación"
                className="w-full"
                selectedKeys={form.tipo ? new Set([String(form.tipo)]) : new Set()}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  if (selected) {
                    handleFormChange('tipo', selected as string);
                  }
                }}
              >
                <SelectItem key="CC">Cédula de Ciudadanía (CC)</SelectItem>
                <SelectItem key="TI">Tarjeta de Identidad (TI)</SelectItem>
              </Select>
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
              <Select
                placeholder="Seleccione un rol"
                className="w-full"
                selectedKeys={form.rolId ? new Set([form.rolId.toString()]) : new Set()}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  handleFormChange('rolId', selected ? Number(selected) : 0);
                }}
              >
                {roles.map((rol) => (
                  <SelectItem key={rol.id.toString()}>
                    {rol.nombre}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {requiereFicha && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ficha de Formación
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select
                    placeholder={loadingFichas ? "Cargando fichas..." : "Seleccione una ficha"}
                    className="flex-1"
                    size="sm"
                    selectedKeys={form.id_ficha ? new Set([form.id_ficha]) : new Set()}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      handleFormChange('id_ficha', selected as string);
                    }}
                    disabled={loadingFichas}
                  >
                    {fichasOpciones.map((ficha) => (
                      <SelectItem key={ficha.value}>
                        {ficha.label}
                      </SelectItem>
                    ))}
                  </Select>
                  <Button
                    onClick={() => setIsFichaModalOpen(true)}
                    color="secondary"
                    startContent={<Plus size={16} />}
                    size="sm"
                    title="Crear nueva ficha"
                    className="w-full sm:w-auto"
                  >
                    <span className="hidden sm:inline">Nueva Ficha</span>
                    <span className="sm:hidden">Nueva</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>


        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
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
            className="bg-green-600 text-white font-bold hover:bg-green-700 w-full sm:w-auto"
            size="sm"
          >
            {editingId != null ? 'Actualizar Usuario' : 'Registrar Usuario'}
          </Button>
        </div>
      </div>

      <Modal isOpen={isFichaModalOpen} onOpenChange={setIsFichaModalOpen}>
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-semibold text-gray-900">Crear Nueva Ficha</h3>
          </ModalHeader>
          <ModalBody>
            <FichaFormComponent
              initialData={fichaFormData}
              onSave={handleCreateFicha}
              onCancel={() => {
                setIsFichaModalOpen(false);
                setFichaFormData({});
              }}
              editingId={null}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
