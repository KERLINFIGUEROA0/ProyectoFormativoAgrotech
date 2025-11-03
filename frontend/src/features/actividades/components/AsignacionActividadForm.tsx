// src/features/actividades/components/AsignacionActividadForm.tsx
// src/features/actividades/components/AsignacionActividadForm.tsx
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ClipboardList, UserCheck, Loader2, Search, Users, Filter } from 'lucide-react';
import { asignarActividad } from '../api/actividadesapi';
import type { AsignarActividadPayload, UsuarioSimple, CultivoSimple } from '../interfaces/actividades';

interface AsignacionFormProps {
    usuarios: UsuarioSimple[];
    cultivos: CultivoSimple[];
    onCancel: () => void;
    onSuccess: () => void;
}

interface AsignacionFormState {
  titulo: string;
  descripcion: string;
  fecha: string;
  cultivo: string;
  aprendices: number[];
  // Filtros de búsqueda
  searchTerm: string;
  selectedFicha: string;
}

const AsignacionActividadForm: React.FC<AsignacionFormProps> = ({ usuarios, cultivos, onCancel, onSuccess }) => {
  
  const [formData, setFormData] = useState<AsignacionFormState>({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().substring(0, 10),
    cultivo: '',
    aprendices: [],
    searchTerm: '',
    selectedFicha: '',
  });
const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener fichas únicas de los usuarios para el filtro
  const fichasUnicas = useMemo(() => {
    const fichas = usuarios
      .filter(u => u.ficha && u.ficha.id_ficha)
      .map(u => u.ficha!)
      .filter((ficha, index, self) =>
        index === self.findIndex(f => f.id_ficha === ficha.id_ficha)
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return fichas;
  }, [usuarios]);

  // Filtrar usuarios según búsqueda y ficha seleccionada
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(usuario => {
      // Filtro por nombre/apellido/identificación
      const matchesSearch = formData.searchTerm === '' ||
        usuario.nombre.toLowerCase().includes(formData.searchTerm.toLowerCase()) ||
        usuario.apellidos.toLowerCase().includes(formData.searchTerm.toLowerCase()) ||
        usuario.identificacion.toString().includes(formData.searchTerm);

      // Filtro por ficha seleccionada
      const matchesFicha = formData.selectedFicha === '' ||
        usuario.ficha?.id_ficha === formData.selectedFicha;

      return matchesSearch && matchesFicha;
    });
  }, [usuarios, formData.searchTerm, formData.selectedFicha]);

  // Función para seleccionar todos los aprendices de una ficha específica
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

  // Función para deseleccionar todos los aprendices de una ficha específica
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAprendicesChange = (identificacion: number, isChecked: boolean) => {
    setFormData(prev => {
      if (isChecked) {
        return { ...prev, aprendices: [...prev.aprendices, identificacion] };
      } else {
        return { ...prev, aprendices: prev.aprendices.filter(id => id !== identificacion) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.fecha || !formData.cultivo || formData.aprendices.length === 0) {
      toast.error("Por favor, complete Título, Fecha, Cultivo y asigne al menos un Aprendiz.");
      return;
    }

    // ✅ --- INICIO DE LA CORRECCIÓN --- ✅
    // Se ajustan los nombres de las propiedades para que coincidan con el DTO del backend.
    const payload: AsignarActividadPayload = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        fecha: formData.fecha,
        cultivo: Number(formData.cultivo), // El campo se llama 'cultivo'
        aprendices: formData.aprendices,     // El campo se llama 'aprendices'
    };


    console.log("Payload que se enviará al backend:", JSON.stringify(payload, null, 2));
    // ✅ --- FIN DE LA CORRECCIÓN --- ✅
    
    setIsSubmitting(true);
    const toastId = toast.loading('Asignando actividades...');
    
    try {
      await asignarActividad(payload); 
      
      toast.success(`Actividades asignadas exitosamente.`, { id: toastId });
      
      onSuccess(); 
      onCancel();
      
    } catch (err) {
      toast.error('Error al asignar las actividades. Verifique la conexión o los datos.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // El JSX (la parte visual) se mantiene exactamente igual.
  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna 1: Nueva Asignación (Formulario) */}
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-600"/> Nueva Asignación
          </h2>

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

          <div className="pt-2">
              <h3 className="text-sm font-medium text-gray-700">Asignar a Aprendices</h3>
              {formData.aprendices.length === 0 ? (
                  <p className="text-sm text-red-500 mt-1">Debe seleccionar al menos un aprendiz.</p>
              ) : (
                  <p className="text-sm text-green-600 mt-1">
                      {formData.aprendices.length} Aprendiz(es) seleccionado(s).
                  </p>
              )}
          </div>
          
          <div className="flex justify-start gap-4 pt-4">
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Aprendices Disponibles ({usuariosFiltrados.length} de {usuarios.length})
          </h2>
          
          {/* Controles de búsqueda y filtrado */}
          <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            {/* Búsqueda por nombre/identificación */}
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

            {/* Filtro por ficha */}
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

            {/* Botones de acción rápida */}
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
          
          {/* Lista de aprendices filtrados */}
          <div className="space-y-2">
            {usuariosFiltrados.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No se encontraron aprendices con los filtros aplicados.
              </p>
            ) : (
              usuariosFiltrados
                .sort((a, b) => {
                  // Ordenar por ficha, luego por nombre
                  const fichaA = a.ficha?.nombre || '';
                  const fichaB = b.ficha?.nombre || '';
                  if (fichaA !== fichaB) {
                    return fichaA.localeCompare(fichaB);
                  }
                  return a.nombre.localeCompare(b.nombre);
                })
                .map(u => (
                  <div key={u.identificacion} className="border rounded-lg">
                    {/* Encabezado de ficha (solo mostrar si cambió) */}
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