import React, { useState, useEffect } from "react";
import { toast } from "sonner";
// --- AÑADIR IMPORTS ---
import { Upload, Plus, X, Package, Hash } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type {
  Actividad,
  EstadoActividad,
  CultivoSimple,
  // --- AÑADIR IMPORT ---
  MaterialUsado,
} from "../interfaces/actividades";
// --- AÑADIR IMPORTS ---
import { obtenerMaterialesDisponibles } from "../api/actividadesapi";
import type { Material } from "../../inventario/interfaces/inventario";

interface FormularioActividadProps {
  actividadInicial?: Partial<Actividad>;
  cultivos: CultivoSimple[];
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}

const estados: EstadoActividad[] = ["pendiente", "en proceso", "completado"];

// --- AÑADIR ESTADO INICIAL PARA MATERIALES ---
interface MaterialSeleccionado extends MaterialUsado {
  nombre: string;
  stockDisponible: number;
}

const FormularioActividad: React.FC<FormularioActividadProps> = ({
  actividadInicial,
  cultivos,
  onSubmit,
  onCancel,
}) => {
  const { userData, token } = useAuth();
  const isEditing = Boolean(actividadInicial?.id);

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    fecha: new Date().toISOString().substring(0, 10),
    cultivo: "",
    estado: "completado" as EstadoActividad,
    imagenes: [] as File[],
  });

  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  // --- AÑADIR ESTADOS PARA MATERIALES ---
  const [materialesDisponibles, setMaterialesDisponibles] = useState<Material[]>([]);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState<
    MaterialSeleccionado[]
  >([]);
  const [materialActual, setMaterialActual] = useState<string>(''); // ID del material
  const [cantidadMaterial, setCantidadMaterial] = useState<number | string>(1);
  // --- FIN DE ESTADOS PARA MATERIALES ---

  // 🔐 Obtener usuario autenticado (sin cambios)
  useEffect(() => {
    if (userData && userData.identificacion) {
      setUsuarioId(userData.identificacion);
    } else {
      setUsuarioId(null);
    }
  }, [userData, token]);

  // 🧩 Precargar datos de edición (MODIFICADO)
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
      
      // --- INICIO DE CORRECCIÓN 2: Precargar materiales existentes ---
      // (Se ejecuta solo si hay materiales en la actividad Y la lista de inventario ya cargó)
     if (actividadInicial.actividadMaterial && materialesDisponibles.length > 0) {
        
        const materialesCargados = actividadInicial.actividadMaterial.map(am => {
          
          // Leemos la estructura anidada correcta de tu interfaz
          const materialId = am.material?.id;
          const materialNombre = am.material?.nombre || 'Material Desconocido';
          
          // Buscamos el material en el inventario para obtener el stock MÁS RECIENTE
          const materialInfo = materialesDisponibles.find(m => m.id === materialId);
          
          return {
            materialId: materialId,
            cantidadUsada: am.cantidadUsada,
            nombre: materialNombre,
            // Usamos el stock actual del inventario, no el stock que tenía cuando se creó la actividad
            stockDisponible: materialInfo?.cantidad || 0, 
          };
        });
        
        setMaterialesSeleccionados(materialesCargados);
      }
      // --- FIN DE CORRECCIÓN 2 ---
      
    }
  }, [actividadInicial, isEditing, materialesDisponibles]); // <-- CORRECCIÓN: Añadir materialesDisponibles

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
  // --- FIN DE USEEFFECT ---

  // 🔄 Manejar cambios en inputs (sin cambios)
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🖼️ Manejar carga de imágenes (sin cambios)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        imagenes: [...prev.imagenes, ...newFiles],
      }));
    }
  };

  // ❌ Eliminar imagen de la vista previa (sin cambios)
  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index),
    }));
  };

  // --- AÑADIR LÓGICA PARA GESTIONAR MATERIALES (MODIFICADO) ---
  const handleAddMaterial = () => {
    const id = parseInt(materialActual);
    const cantidad = Number(cantidadMaterial);

    if (!id || !cantidad || cantidad <= 0) {
      toast.error('Seleccione un material y una cantidad válida.');
      return;
    }

    const material = materialesDisponibles.find((m) => m.id === id);
    if (!material) return;

    if (cantidad > material.cantidad) {
      toast.error(
        `Stock insuficiente. Disponible: ${material.cantidad} ${material.tipoEmpaque}`,
      );
      return;
    }
    
    // Evitar duplicados, en su lugar, sumar cantidad
    const existente = materialesSeleccionados.find(m => m.materialId === id);
    if (existente) {
        const nuevaCantidadTotal = existente.cantidadUsada + cantidad;
        if (nuevaCantidadTotal > material.cantidad) {
            toast.error(`Stock insuficiente. Ya seleccionó ${existente.cantidadUsada} + ${cantidad} = ${nuevaCantidadTotal}. Disponible: ${material.cantidad}`);
            return;
        }
        
        // --- INICIO DE CORRECCIÓN 1 (Caso Existente) ---
        setMaterialesSeleccionados((prevMateriales) => 
            prevMateriales.map(m => 
                m.materialId === id ? { ...m, cantidadUsada: nuevaCantidadTotal } : m
            )
        );
        // --- FIN DE CORRECCIÓN 1 ---

    } else {
    
        // --- INICIO DE CORRECCIÓN 1 (Caso Nuevo) ---
        setMaterialesSeleccionados((prevMateriales) => [
          ...prevMateriales,
          {
            materialId: material.id,
            nombre: material.nombre,
            cantidadUsada: cantidad,
            stockDisponible: material.cantidad,
          },
        ]);
        // --- FIN DE CORRECCIÓN 1 ---
    }

    // Limpiar inputs
    setMaterialActual('');
    setCantidadMaterial(1);
  };

  const handleRemoveMaterial = (materialId: number) => {
    setMaterialesSeleccionados(
      materialesSeleccionados.filter((m) => m.materialId !== materialId),
    );
  };
  // --- FIN DE LÓGICA DE MATERIALES ---

  // 🧾 Enviar formulario (MODIFICADO)
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

    const dataToSend = new FormData();
    dataToSend.append("titulo", formData.titulo.trim());
    dataToSend.append("descripcion", formData.descripcion.trim());
    dataToSend.append("fecha", formData.fecha);
    dataToSend.append("usuario", usuarioId.toString());
    dataToSend.append("cultivo", formData.cultivo);
    dataToSend.append("estado", formData.estado);

    formData.imagenes.forEach((file) => {
      dataToSend.append("imagenes", file); // 'imagenes' debe coincidir con el backend
    });

    // --- AÑADIR MATERIALES AL FORMDATA ---
    // El backend (controlador) debe estar preparado para recibir un string JSON
    // y parsearlo antes de pasarlo al servicio.
    if (materialesSeleccionados.length > 0) {
      const materialesPayload = materialesSeleccionados.map(m => ({
        materialId: m.materialId,
        cantidadUsada: m.cantidadUsada
      }));
      dataToSend.append('materiales', JSON.stringify(materialesPayload));
    }
    // --- FIN DE AÑADIR MATERIALES ---

    onSubmit(dataToSend);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-8 border border-gray-200">
      {/* ... (Título del formulario sin cambios) ... */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? "Editar Actividad" : "Registrar Actividad"}
        </h2>
        <p className="text-gray-500 text-sm">
          Registra y gestiona las actividades realizadas en los cultivos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Columna izquierda (Datos de la actividad) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="text-green-600" />
            <h3 className="font-semibold text-gray-700 text-lg">
              {isEditing ? "Editar Actividad" : "Nueva Actividad"}
            </h3>
          </div>
          {/* ... (Inputs de Nombre, Fecha, Cultivo y Estado sin cambios) ... */}
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

        {/* Columna derecha (Imágenes y Materiales) */}
        <div className="space-y-4">
          {/* Imágenes (código sin cambios) */}
          <div>
            {/* ... (Label e input de imágenes) ... */}
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
            {/* ... (Vista previa de imágenes) ... */}
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

          {/* --- AÑADIR SECCIÓN DE MATERIALES --- */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Materiales Utilizados
            </label>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
              <div className="flex items-end gap-2">
                {/* Select de Material */}
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Package size={14}/> Material</label>
                  <select
                    value={materialActual}
                    onChange={(e) => setMaterialActual(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {materialesDisponibles.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} (Disp: {m.cantidad} {m.tipoEmpaque})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Input de Cantidad */}
                <div className="w-1/3">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Hash size={14}/> Cantidad</label>
                  <input
                    type="number"
                    value={cantidadMaterial}
                    onChange={(e) => setCantidadMaterial(Number(e.target.value))}
                    min="1"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
                {/* Botón Añadir */}
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Lista de materiales seleccionados */}
              <div className="space-y-2">
                {materialesSeleccionados.map((m) => (
                  <div
                    key={m.materialId}
                    className="flex justify-between items-center bg-white p-2 border rounded-md"
                  >
                    <div className="text-sm">
                      <p className="font-medium">{m.nombre}</p>
                      <p className="text-xs text-gray-500">
                        Cantidad: {m.cantidadUsada}
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

        </div>

        {/* Botones (sin cambios) */}
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