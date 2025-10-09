import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Upload, Plus } from "lucide-react";
import type {
  Actividad,
  CreateActividadPayload,
  UpdateActividadPayload,
  EstadoActividad,
  CultivoSimple,
} from "../interfaces/actividades";

interface FormularioActividadProps {
  actividadInicial?: Partial<Actividad>;
  cultivos: CultivoSimple[];
  onSubmit: (formData: FormData) => void; // 👈 ahora enviamos FormData
  onCancel: () => void;
}

const estados: EstadoActividad[] = ["pendiente", "en proceso", "completado"];

const FormularioActividad: React.FC<FormularioActividadProps> = ({
  actividadInicial,
  cultivos,
  onSubmit,
  onCancel,
}) => {
  const isEditing = Boolean(actividadInicial?.id);

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    fecha: new Date().toISOString().substring(0, 10),
    cultivo: "",
    estado: "pendiente" as EstadoActividad,
    imagenes: [] as File[],
  });

  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  // 🔐 Obtener usuario autenticado desde localStorage
  useEffect(() => {
    const tokenData = localStorage.getItem("usuario");
    if (tokenData) {
      try {
        const user = JSON.parse(tokenData);
        if (user?.id) setUsuarioId(user.id);
      } catch {
        console.warn("Error leyendo el usuario guardado en localStorage");
      }
    }
  }, []);

  // 🧩 Si estamos editando, precargar datos
  useEffect(() => {
    if (isEditing && actividadInicial) {
      setFormData({
        titulo: actividadInicial.titulo || "",
        descripcion: actividadInicial.descripcion || "",
        fecha: actividadInicial.fecha
          ? actividadInicial.fecha.substring(0, 10)
          : new Date().toISOString().substring(0, 10),
        cultivo: actividadInicial.cultivo?.id?.toString() || "",
        estado: actividadInicial.estado || "pendiente",
        imagenes: [],
      });
    }
  }, [actividadInicial, isEditing]);

  // 🔄 Manejar cambios en inputs
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🖼️ Manejar carga de imágenes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        imagenes: [...prev.imagenes, ...newFiles],
      }));
    }
  };

  // ❌ Eliminar imagen de la vista previa
  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index),
    }));
  };

  // 🧾 Enviar formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo || !formData.fecha || !formData.cultivo) {
      toast.error("Los campos Título, Fecha y Cultivo son obligatorios.");
      return;
    }

    if (!usuarioId) {
      toast.error("No se pudo identificar el usuario autenticado.");
      return;
    }

    // 🔧 Construir FormData para envío al backend
    const dataToSend = new FormData();
    dataToSend.append("titulo", formData.titulo.trim());
    dataToSend.append("descripcion", formData.descripcion.trim());
    dataToSend.append("fecha", formData.fecha);
    dataToSend.append("usuario", usuarioId.toString());
    dataToSend.append("cultivo", formData.cultivo);
    dataToSend.append("estado", formData.estado);

    // 📸 Añadir imágenes al FormData
    formData.imagenes.forEach((file) => {
      dataToSend.append("imagenes", file);
    });

    onSubmit(dataToSend); // 👈 enviamos el FormData directamente
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-8 border border-gray-200">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? "Editar Actividad" : "Registrar Actividad"}
        </h2>
        <p className="text-gray-500 text-sm">
          Registra y gestiona las actividades realizadas en los cultivos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Columna izquierda */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="text-green-600" />
            <h3 className="font-semibold text-gray-700 text-lg">
              {isEditing ? "Editar Actividad" : "Nueva Actividad"}
            </h3>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de Actividad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ej. Siembra de maíz"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de realización <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Cultivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cultivo <span className="text-red-500">*</span>
            </label>
            <select
              name="cultivo"
              value={formData.cultivo}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">Seleccione cultivo</option>
              {cultivos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado (solo al editar) */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-green-500 outline-none"
              >
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          {/* Imágenes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imágenes</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
              <Upload className="mx-auto text-gray-400" size={32} />
              <p className="text-gray-500 text-sm mb-2">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <label className="text-green-600 font-semibold cursor-pointer">
                <span>Seleccionar archivos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Vista previa */}
            {formData.imagenes.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {formData.imagenes.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`preview-${i}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full text-xs p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe la actividad realizada..."
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none h-24"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
          >
            ✕ Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            💾 {isEditing ? "Guardar Cambios" : "Guardar Actividad"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioActividad;
