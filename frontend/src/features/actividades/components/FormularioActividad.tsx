// src/features/actividades/components/FormularioActividad.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { 
  Actividad, 
  CreateActividadPayload, 
  UpdateActividadPayload, 
  EstadoActividad,
  UsuarioSimple,
  CultivoSimple
} from '../interfaces/actividades';

interface FormularioActividadProps {
    actividadInicial?: Partial<Actividad>;
    usuarios: UsuarioSimple[];
    cultivos: CultivoSimple[];
    onSubmit: (data: CreateActividadPayload | UpdateActividadPayload) => void;
    onCancel: () => void;
}

const estados: EstadoActividad[] = ['pendiente', 'en proceso', 'completado'];

const FormularioActividad: React.FC<FormularioActividadProps> = ({ actividadInicial, usuarios, cultivos, onSubmit, onCancel }) => {
    // Estado inicial limpio
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        fecha: new Date().toISOString().substring(0, 10),
        usuario: '', // Almacenará la IDENTIFICACIÓN del usuario como string
        cultivo: '', // Almacenará el ID del cultivo como string
        estado: 'pendiente' as EstadoActividad
    });

    const isEditing = Boolean(actividadInicial && actividadInicial.id);

    useEffect(() => {
        if (isEditing && actividadInicial) {
            setFormData({
                titulo: actividadInicial.titulo || '',
                descripcion: actividadInicial.descripcion || '',
                fecha: actividadInicial.fecha ? actividadInicial.fecha.substring(0, 10) : new Date().toISOString().substring(0, 10),
                estado: actividadInicial.estado || 'pendiente',
                // Para editar, obtenemos los valores de las relaciones
                usuario: actividadInicial.usuario?.identificacion?.toString() || '',
                cultivo: actividadInicial.cultivo?.id?.toString() || '',
            });
        }
        // Si no estamos editando, el estado inicial por defecto ya es correcto
    }, [actividadInicial, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validamos que los campos obligatorios no estén vacíos
        if (!formData.titulo || !formData.fecha || !formData.usuario || !formData.cultivo) {
            toast.error("Los campos Título, Fecha, Usuario y Cultivo son obligatorios.");
            return;
        }

        // Creamos el payload que se enviará a la API
        const payload = {
            titulo: formData.titulo,
            fecha: formData.fecha,
            descripcion: formData.descripcion,
            // ✅ CORRECCIÓN CLAVE: Convertimos los valores a número
            usuario: Number(formData.usuario),
            cultivo: Number(formData.cultivo),
            // Solo incluimos el estado si estamos editando
            ...(isEditing && { estado: formData.estado })
        };

        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Actividad' : 'Crear Nueva Actividad'}</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-700">Título</label>
                <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Asignar a Usuario</label>
                    {/* El 'name' ahora es 'usuario' para coincidir con el estado y el payload */}
                    <select name="usuario" value={formData.usuario} onChange={handleChange} required disabled={isEditing} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white disabled:bg-gray-100">
                        <option value="">Seleccione un usuario</option>
                        {/* ✅ CORRECCIÓN CLAVE: El valor de la opción es la IDENTIFICACIÓN del usuario */}
                        {usuarios.map(u => (
                            <option key={u.id} value={u.identificacion}>{u.nombre} {u.apellidos}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Asignar a Cultivo</label>
                    {/* El 'name' ahora es 'cultivo' */}
                    <select name="cultivo" value={formData.cultivo} onChange={handleChange} required disabled={isEditing} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white disabled:bg-gray-100">
                        <option value="">Seleccione un cultivo</option>
                        {cultivos.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isEditing && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select name="estado" value={formData.estado} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white">
                        {estados.map(est => (
                            <option key={est} value={est}>{est.charAt(0).toUpperCase() + est.slice(1)}</option>
                        ))}
                    </select>
                </div>
            )}
            
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">{isEditing ? 'Guardar Cambios' : 'Crear Actividad'}</button>
            </div>
        </form>
    );
};

export default FormularioActividad;