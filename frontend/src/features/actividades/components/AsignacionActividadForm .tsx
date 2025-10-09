// src/features/actividades/components/AsignacionActividadForm.tsx
import React, { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, UserCheck, Loader2 } from 'lucide-react';
import { asignarActividad } from '../api/actividadesapi'; // Nota: La función API es asignarActividadMultiple
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
}

const AsignacionActividadForm: React.FC<AsignacionFormProps> = ({ usuarios, cultivos, onCancel, onSuccess }) => {
  
  const [formData, setFormData] = useState<AsignacionFormState>({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().substring(0, 10),
    cultivo: '',
    aprendices: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

    // NOTA: La interfaz AsignarActividadPayload debe coincidir con lo que espera el backend.
    // Usaremos un payload intermedio para mapear los campos correctamente.
    const payload: AsignarActividadPayload = {
        // Campos de la actividad a crear/asignar
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        fecha: formData.fecha,
        // ✅ CORRECCIÓN 1: Mapear el ID del Cultivo con la clave correcta esperada por el backend.
        // ASUME: Que el backend espera 'cultivoId'
        cultivoId: Number(formData.cultivo), 
        
        // ✅ CORRECCIÓN 2: Mapear el array de IDs de aprendices con la clave correcta.
        // ASUME: Que el backend espera 'aprendicesIds' para el array de identificaciones.
        // Si tu backend espera una clave diferente, ¡ajústala aquí!
        aprendicesIds: formData.aprendices,
        
        estado: 'pendiente' 
    };
    
    // --- Resto del código se mantiene igual ---
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

  // El JSX se mantiene igual (Diseño ajustado a dos columnas)
  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      
      {/* Contenedor principal de 2 columnas (Nueva Asignación y Aprendices Disponibles) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna 1: Nueva Asignación (Formulario) */}
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-600"/> Nueva Asignación
          </h2>

          {/* Nombre de la Actividad */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">Nombre de la Actividad</label>
            <input type="text" name="titulo" id="titulo" placeholder="Ej: Riego por goteo - Lote A" value={formData.titulo} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"/>
          </div>

          {/* Cultivo */}
          <div>
            <label htmlFor="cultivo" className="block text-sm font-medium text-gray-700">Cultivo</label>
            <select name="cultivo" id="cultivo" value={formData.cultivo} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white">
                <option value="">Seleccionar cultivo</option>
                {cultivos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción de la Actividad</label>
            <textarea name="descripcion" id="descripcion" placeholder="Describe la tarea a realizar..." value={formData.descripcion} onChange={handleChange} required rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"/>
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">Fecha de Realización</label>
            <input type="date" name="fecha" id="fecha" value={formData.fecha} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"/>
          </div>

           {/* Asignar a Aprendices - Resumen y Validación */}
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
          
          {/* Botones */}
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Aprendices Disponibles</h2>
          
          <div className="space-y-2">
            {usuarios.map(u => (
              <label key={u.identificacion} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.aprendices.includes(u.identificacion)}
                    onChange={(e) => handleAprendicesChange(u.identificacion, e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{u.nombre} {u.apellidos}</p>
                    <p className="text-xs text-gray-500">Aprendiz (ID: {u.identificacion})</p>
                  </div>
                </div>
                {formData.aprendices.includes(u.identificacion) && (
                    <UserCheck className="w-4 h-4 text-green-500" />
                )}
              </label>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
};


export default AsignacionActividadForm;