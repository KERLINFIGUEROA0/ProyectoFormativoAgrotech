import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
// --- AÑADIR IMPORTS ---
import {
  ClipboardList,
  UserCheck,
  Loader2,
  Search,
  Users,
  Filter,
  Package,
  Hash,
  Plus,
  X,
} from 'lucide-react';
// --- MODIFICAR IMPORT ---
import {
  asignarActividad,
  obtenerMaterialesDisponibles, // <-- AÑADIR
} from '../api/actividadesapi';
import type {
  AsignarActividadPayload,
  UsuarioSimple,
  CultivoSimple,
  // --- AÑADIR IMPORT ---
  MaterialUsado,
} from '../interfaces/actividades';
// --- AÑADIR IMPORT ---
import type { Material } from '../../inventario/interfaces/inventario';

interface AsignacionFormProps {
  usuarios: UsuarioSimple[];
  cultivos: CultivoSimple[];
  onCancel: () => void;
  onSuccess: () => void;
}

// --- AÑADIR INTERFAZ ---
interface MaterialSeleccionado extends MaterialUsado {
  nombre: string;
  stockDisponible: number;
}

interface AsignacionFormState {
  titulo: string;
  descripcion: string;
  fecha: string;
  cultivo: string;
  aprendices: number[];
  searchTerm: string;
  selectedFicha: string;
  // --- AÑADIR CAMPOS ---
  materiales: MaterialSeleccionado[];
  materialActual: string; // ID
  cantidadMaterial: number | string;
  // --- FIN CAMPOS ---
}

const AsignacionActividadForm: React.FC<AsignacionFormProps> = ({
  usuarios,
  cultivos,
  onCancel,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<AsignacionFormState>({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().substring(0, 10),
    cultivo: '',
    aprendices: [],
    searchTerm: '',
    selectedFicha: '',
    // --- AÑADIR ESTADO ---
    materiales: [],
    materialActual: '',
    cantidadMaterial: 1,
    // --- FIN ESTADO ---
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // --- AÑADIR ESTADO ---
  const [materialesDisponibles, setMaterialesDisponibles] = useState<Material[]>([]);
  // --- FIN ESTADO ---

  // ... (useMemo de fichasUnicas y usuariosFiltrados sin cambios) ...
  const fichasUnicas = useMemo(() => {
    // ...
    const fichas = usuarios
      .filter(u => u.ficha && u.ficha.id_ficha)
      .map(u => u.ficha!)
      .filter((ficha, index, self) =>
        index === self.findIndex(f => f.id_ficha === ficha.id_ficha)
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return fichas;
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    // ...
    return usuarios.filter(usuario => {
      const matchesSearch = formData.searchTerm === '' ||
        usuario.nombre.toLowerCase().includes(formData.searchTerm.toLowerCase()) ||
        usuario.apellidos.toLowerCase().includes(formData.searchTerm.toLowerCase()) ||
        usuario.identificacion.toString().includes(formData.searchTerm);
      const matchesFicha = formData.selectedFicha === '' ||
        usuario.ficha?.id_ficha === formData.selectedFicha;
      return matchesSearch && matchesFicha;
    });
  }, [usuarios, formData.searchTerm, formData.selectedFicha]);


  // --- AÑADIR USEEFFECT PARA CARGAR MATERIALES ---
  useEffect(() => {
    const cargarMateriales = async () => {
      try {
        const materiales = await obtenerMaterialesDisponibles();
        setMaterialesDisponibles(materiales);
      } catch (error) {
        toast.error('No se pudieron cargar los materiales del inventario.');
      }
    };
    cargarMateriales();
  }, []);
  // --- FIN USEEFFECT ---

  // ... (funciones de seleccionar/deseleccionar ficha sin cambios) ...
  const seleccionarTodosDeFicha = (fichaId: string) => {
    const aprendicesDeFicha = usuarios
      .filter(u => u.ficha?.id_ficha === fichaId)
      .map(u => Number(u.identificacion));
    
    setFormData(prev => ({
      ...prev,
      aprendices: [...new Set([...prev.aprendices, ...aprendicesDeFicha])]
    }));
    
    toast.success(`Se seleccionaron todos los aprendices de la ficha ${fichaId}`);
  };

  const deseleccionarTodosDeFicha = (fichaId: string) => {
    const aprendicesDeFicha = usuarios
      .filter(u => u.ficha?.id_ficha === fichaId)
      .map(u => Number(u.identificacion));
    
    setFormData(prev => ({
      ...prev,
      aprendices: prev.aprendices.filter(id => !aprendicesDeFicha.includes(id))
    }));
    
    toast.success(`Se deseleccionaron todos los aprendices de la ficha ${fichaId}`);
  };


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAprendicesChange = (identificacion: number, isChecked: boolean) => {
    setFormData((prev) => {
      if (isChecked) {
        return { ...prev, aprendices: [...prev.aprendices, identificacion] };
      } else {
        return {
          ...prev,
          aprendices: prev.aprendices.filter((id) => id !== identificacion),
        };
      }
    });
  };

  // --- AÑADIR LÓGICA PARA GESTIONAR MATERIALES ---
  const handleAddMaterial = () => {
    const id = parseInt(formData.materialActual);
    const cantidad = Number(formData.cantidadMaterial);

    if (!id || !cantidad || cantidad <= 0) {
      toast.error('Seleccione un material y una cantidad válida.');
      return;
    }

    const material = materialesDisponibles.find((m) => m.id === id);
    if (!material) return;

    // Validación de stock total
    const cantidadTotalRequerida = cantidad * (formData.aprendices.length || 1);
    if (cantidadTotalRequerida > material.cantidad) {
      toast.error(
        `Stock insuficiente. Se necesitan ${cantidadTotalRequerida} ( ${cantidad} x ${formData.aprendices.length} aprendices). Disponible: ${material.cantidad}`,
      );
      return;
    }

    // Evitar duplicados
    const existente = formData.materiales.find(m => m.materialId === id);
    if (existente) {
      toast.info("Este material ya está en la lista. Edítelo o quítelo.");
      return;
    }

    setFormData(prev => ({
        ...prev,
        materiales: [
            ...prev.materiales,
            {
                materialId: material.id,
                nombre: material.nombre,
                cantidadUsada: cantidad,
                stockDisponible: material.cantidad,
            }
        ],
        materialActual: '',
        cantidadMaterial: 1
    }));
  };

  const handleRemoveMaterial = (materialId: number) => {
    setFormData(prev => ({
        ...prev,
        materiales: prev.materiales.filter(m => m.materialId !== materialId)
    }));
  };
  // --- FIN DE LÓGICA DE MATERIALES ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.titulo ||
      !formData.fecha ||
      !formData.cultivo ||
      formData.aprendices.length === 0
    ) {
      toast.error(
        'Por favor, complete Título, Fecha, Cultivo y asigne al menos un Aprendiz.',
      );
      return;
    }

    // --- MODIFICACIÓN: Añadir materiales al payload ---
    const materialesPayload = formData.materiales.map(m => ({
        materialId: m.materialId,
        cantidadUsada: m.cantidadUsada
    }));
    
    const payload: AsignarActividadPayload = {
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      fecha: formData.fecha,
      cultivo: Number(formData.cultivo),
      aprendices: formData.aprendices,
      materiales: materialesPayload, // <-- AÑADIDO
    };
    // --- FIN MODIFICACIÓN ---

    console.log("Payload que se enviará al backend:", JSON.stringify(payload, null, 2));

    setIsSubmitting(true);
    const toastId = toast.loading('Asignando actividades...');

    try {
      await asignarActividad(payload);
      toast.success(`Actividades asignadas exitosamente.`, { id: toastId });
      onSuccess();
      onCancel();
    } catch (err: any) { // Capturar 'any' para acceder a 'response'
      // --- MODIFICACIÓN: Mostrar error del backend ---
      const errorMsg = err.response?.data?.message || 'Error al asignar las actividades.';
      toast.error(errorMsg, { id: toastId });
      // --- FIN MODIFICACIÓN ---
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna 1: Nueva Asignación (Formulario) */}
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50 max-h-[70vh] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-600" /> Nueva Asignación
          </h2>

          {/* ... (Inputs de Título, Cultivo, Descripción, Fecha sin cambios) ... */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">Nombre de la Actividad</label>
            <input type="text" name="titulo" id="titulo" placeholder="Ej: Riego por goteo - Lote A" value={formData.titulo} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"/>
          </div>
          <div>
            <label htmlFor="cultivo" className="block text-sm font-medium text-gray-700">Cultivo</label>
            <select name="cultivo" id="cultivo" value={formData.cultivo} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white">
                <option value="">Seleccionar cultivo</option>
                {cultivos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción de la Actividad</label>
            <textarea name="descripcion" id="descripcion" placeholder="Describe la tarea a realizar..." value={formData.descripcion} onChange={handleChange} required rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"/>
          </div>
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">Fecha de Realización</label>
            <input type="date" name="fecha" id="fecha" value={formData.fecha} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"/>
          </div>

          {/* --- AÑADIR SECCIÓN DE MATERIALES --- */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-gray-700">
              Materiales a Utilizar (por aprendiz)
            </label>
            <div className="p-4 border rounded-lg bg-white space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Package size={14}/> Material</label>
                  <select
                    value={formData.materialActual}
                    onChange={(e) => setFormData(prev => ({ ...prev, materialActual: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {materialesDisponibles.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} (Disp: {m.cantidad})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Hash size={14}/> Cantidad</label>
                  <input
                    type="number"
                    value={Number(formData.cantidadMaterial) || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cantidadMaterial: Number(e.target.value) }))}
                    min="1"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {formData.materiales.map((m) => (
                  <div
                    key={m.materialId}
                    className="flex justify-between items-center bg-gray-100 p-2 border rounded-md"
                  >
                    <div className="text-sm">
                      <p className="font-medium">{m.nombre}</p>
                      <p className="text-xs text-gray-500">
                        Cantidad por aprendiz: {m.cantidadUsada}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(m.materialId)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* --- FIN DE SECCIÓN DE MATERIALES --- */}

          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700">
              Asignar a Aprendices
            </h3>
            {formData.aprendices.length === 0 ? (
              <p className="text-sm text-red-500 mt-1">
                Debe seleccionar al menos un aprendiz.
              </p>
            ) : (
              <p className="text-sm text-green-600 mt-1">
                {formData.aprendices.length} Aprendiz(es) seleccionado(s).
              </p>
            )}
          </div>

          <div className="flex justify-start gap-4 pt-4">
            {/* ... (Botones de Submit y Cancelar sin cambios) ... */}
              <button 
                type="submit" 
                disabled={isSubmitting || formData.aprendices.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-md transition duration-150 disabled:bg-gray-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Asignar Actividad
                  </>
                )}
              </button>
              <button 
                  type="button" 
                  onClick={onCancel} 
                  className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 shadow-md transition duration-150"
              >
                  Cancelar
              </button>
          </div>
        </div>

        {/* Columna 2: Aprendices Disponibles (Lista de selección) */}
        <div className="p-4 border rounded-lg shadow-inner bg-white max-h-[70vh] overflow-y-auto">
          {/* ... (Controles de búsqueda y filtrado sin cambios) ... */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Aprendices Disponibles ({usuariosFiltrados.length} de {usuarios.length})
          </h2>
          
          <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o identificación..."
                value={formData.searchTerm}
                onChange={(e) => setFormData(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
              />
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <select
                value={formData.selectedFicha}
                onChange={(e) => setFormData(prev => ({ ...prev, selectedFicha: e.target.value }))}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm p-2 text-sm bg-white"
              >
                <option value="">Todas las fichas</option>
                {fichasUnicas.map(ficha => (
                  <option key={ficha.id_ficha} value={ficha.id_ficha}>
                    {ficha.nombre} ({ficha.id_ficha})
                  </option>
                ))}
              </select>
            </div>

            {formData.selectedFicha && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarTodosDeFicha(formData.selectedFicha)}
                  className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                >
                  Seleccionar Todo
                </button>
                <button
                  type="button"
                  onClick={() => deseleccionarTodosDeFicha(formData.selectedFicha)}
                  className="flex-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                >
                  Deseleccionar Todo
                </button>
              </div>
            )}
          </div>
          
          {/* ... (Lista de aprendices filtrados sin cambios) ... */}
          <div className="space-y-2">
            {usuariosFiltrados.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No se encontraron aprendices con los filtros aplicados.
              </p>
            ) : (
              usuariosFiltrados
                .sort((a, b) => {
                  const fichaA = a.ficha?.nombre || '';
                  const fichaB = b.ficha?.nombre || '';
                  if (fichaA !== fichaB) {
                    return fichaA.localeCompare(fichaB);
                  }
                  return a.nombre.localeCompare(b.nombre);
                })
                .map(u => (
                  <div key={u.identificacion} className="border rounded-lg">
                    {u.ficha && (
                      <div className="bg-blue-50 px-3 py-2 border-b">
                        <p className="text-sm font-medium text-blue-800">
                          {u.ficha.nombre} ({u.ficha.id_ficha})
                        </p>
                      </div>
                    )}
                    
                    <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.aprendices.includes(Number(u.identificacion))}
                          onChange={(e) => handleAprendicesChange(Number(u.identificacion), e.target.checked)}
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-800">{u.nombre} {u.apellidos}</p>
                          <p className="text-xs text-gray-500">ID: {u.identificacion}</p>
                        </div>
                      </div>
                      {formData.aprendices.includes(Number(u.identificacion)) && (
                          <UserCheck className="w-4 h-4 text-green-500" />
                      )}
                    </label>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default AsignacionActividadForm;