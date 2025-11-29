import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Upload, Plus, X, Package, Hash } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type {
  Actividad,
  EstadoActividad,
  CultivoSimple,
  MaterialUsado,
} from "../interfaces/actividades";
import { obtenerMaterialesDisponibles } from "../api/actividadesapi";
import type { Material } from "../../inventario/interfaces/inventario";

interface FormularioActividadProps {
  actividadInicial?: Partial<Actividad>;
  cultivos: CultivoSimple[];
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}

const estados: EstadoActividad[] = ["pendiente", "en proceso", "completado"];

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

  // --- CORRECCIÓN 1: Añadir horas y tarifaHora al estado ---
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    fecha: new Date().toISOString().substring(0, 10),
    cultivo: "",
    estado: "completado" as EstadoActividad,
    imagenes: [] as File[],
    horas: '' as number | string, // <-- AÑADIDO
    tarifaHora: '' as number | string, // <-- AÑADIDO
  });

  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  const [materialesDisponibles, setMaterialesDisponibles] = useState<Material[]>([]);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState<
    MaterialSeleccionado[]
  >([]);
  const [materialActual, setMaterialActual] = useState<string>('');
  const [cantidadMaterial, setCantidadMaterial] = useState<number | string>(1);

  // Función para calcular el stock disponible
  const calcularStockDisponible = (material: Material): number => {
    if (material.tipoConsumo === 'consumible' && material.cantidadPorUnidad) {
      const openPackageAdjustment = material.cantidadRestanteEnUnidadActual !== null && material.cantidadRestanteEnUnidadActual !== undefined ? 1 : 0;
      return (material.cantidad - openPackageAdjustment) * material.cantidadPorUnidad + (material.cantidadRestanteEnUnidadActual || 0);
    }
    return material.cantidad;
  };

  // Obtener usuario autenticado (sin cambios)
  useEffect(() => {
    if (userData && userData.identificacion) {
      setUsuarioId(userData.identificacion);
    } else {
      setUsuarioId(null);
    }
  }, [userData, token]);

  // Precargar datos de edición (MODIFICADO)
  useEffect(() => {
    if (isEditing && actividadInicial) {
      // --- CORRECCIÓN 2: Precargar horas y tarifaHora ---
      setFormData({
        titulo: actividadInicial.titulo || "",
        descripcion: actividadInicial.descripcion || "",
        fecha: actividadInicial.fecha
          ? actividadInicial.fecha.substring(0, 10)
          : new Date().toISOString().substring(0, 10),
        cultivo: actividadInicial.cultivo?.id?.toString() || "",
        estado: actividadInicial.estado || "pendiente",
        imagenes: [],
        horas: actividadInicial.horas || '', // <-- AÑADIDO
        tarifaHora: actividadInicial.tarifaHora || '', // <-- AÑADIDO
      });
      
      // Precargar materiales (Tu código ya estaba correcto aquí)
      if (actividadInicial.actividadMaterial && materialesDisponibles.length > 0) {
        const materialesCargados = actividadInicial.actividadMaterial.map(am => {
          const materialId = am.material?.id;
          const materialNombre = am.material?.nombre || 'Material Desconocido';
          const materialInfo = materialesDisponibles.find(m => m.id === materialId);
          return {
            materialId: materialId,
            cantidadUsada: am.cantidadUsada,
            nombre: materialNombre,
            stockDisponible: materialInfo?.cantidad || 0, 
          };
        });
        setMaterialesSeleccionados(materialesCargados);
      }
    }
  }, [actividadInicial, isEditing, materialesDisponibles]);

  // Cargar materiales (sin cambios)
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

  // Manejar cambios en inputs (sin cambios)
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Manejar carga de imágenes (sin cambios)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        imagenes: [...prev.imagenes, ...newFiles],
      }));
    }
  };

  // Eliminar imagen de la vista previa (sin cambios)
  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index),
    }));
  };

  // --- CORRECCIÓN 3: Arreglar bug de "reemplazo" de materiales ---
  const handleAddMaterial = () => {
    const id = parseInt(materialActual);
    const cantidad = Number(cantidadMaterial);

    if (!id || !cantidad || cantidad <= 0) {
      toast.error('Seleccione un material y una cantidad válida.');
      return;
    }

    const material = materialesDisponibles.find((m) => m.id === id);
    if (!material) return;

    // Verificar stock
    const stockDisponible = calcularStockDisponible(material);
    if (cantidad > stockDisponible) {
      const unidad = material.tipoConsumo === 'consumible' && material.cantidadPorUnidad ? (material.medidasDeContenido || 'unidades') : material.tipoEmpaque;
      toast.error(
        `Stock insuficiente. Disponible: ${stockDisponible} ${unidad}`,
      );
      return;
    }
    
    const existente = materialesSeleccionados.find(m => m.materialId === id);
    if (existente) {
        const nuevaCantidadTotal = existente.cantidadUsada + cantidad;
        const stockDisponible = calcularStockDisponible(material);
        if (nuevaCantidadTotal > stockDisponible) {
            const unidad = material.tipoConsumo === 'consumible' && material.cantidadPorUnidad ? (material.medidasDeContenido || 'unidades') : material.tipoEmpaque;
            toast.error(`Stock insuficiente. Ya seleccionó ${existente.cantidadUsada} + ${cantidad} = ${nuevaCantidadTotal}. Disponible: ${stockDisponible} ${unidad}`);
            return;
        }
        
        // --- USA (prev) ---
        setMaterialesSeleccionados((prevMateriales) => 
            prevMateriales.map(m => 
                m.materialId === id ? { ...m, cantidadUsada: nuevaCantidadTotal } : m
            )
        );

    } else {
        // --- USA (prev) ---
        setMaterialesSeleccionados((prevMateriales) => [
          ...prevMateriales,
          {
            materialId: material.id,
            nombre: material.nombre,
            cantidadUsada: cantidad,
            stockDisponible: calcularStockDisponible(material),
          },
        ]);
    }

    // Limpiar inputs (sin cambios)
    setMaterialActual('');
    setCantidadMaterial(1);
  };

  // (handleRemoveMaterial sin cambios)
  const handleRemoveMaterial = (materialId: number) => {
    setMaterialesSeleccionados(
      materialesSeleccionados.filter((m) => m.materialId !== materialId),
    );
  };

  // --- CORRECCIÓN 4: Añadir 'horas' y 'tarifaHora' al FormData ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo || !formData.fecha || !formData.cultivo) {
      toast.error("Los campos Título, Fecha y Cultivo son obligatorios.");
      return;
    }
    if (!usuarioId && !isEditing) { // Solo requerir usuarioId si estamos creando
      toast.error("No se pudo identificar el usuario autenticado.");
      return;
    }

    const dataToSend = new FormData();
    dataToSend.append("titulo", formData.titulo.trim());
    dataToSend.append("descripcion", formData.descripcion.trim());
    dataToSend.append("fecha", formData.fecha);
    dataToSend.append("cultivo", formData.cultivo);
    dataToSend.append("estado", formData.estado);

    // --- AÑADIDO: Enviar campos de costo ---
    dataToSend.append("horas", formData.horas.toString() || "0");
    dataToSend.append("tarifaHora", formData.tarifaHora.toString() || "0");

    // --- (Tu corrección de 'isEditing' ya estaba aquí, está perfecta) ---
    if (!isEditing) {
      dataToSend.append("usuario", usuarioId!.toString());
    }

    // (Lógica de imágenes sin cambios)
    formData.imagenes.forEach((file) => {
      dataToSend.append("imagenes", file);
    });

    // (Lógica de materiales sin cambios)
    if (materialesSeleccionados.length > 0) {
      const materialesPayload = materialesSeleccionados.map(m => ({
        materialId: m.materialId,
        cantidadUsada: m.cantidadUsada
      }));
      dataToSend.append('materiales', JSON.stringify(materialesPayload));
    }

    onSubmit(dataToSend);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-8 border border-gray-200">
      {/* (Título sin cambios) */}
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
          
          {/* Nombre (sin cambios) */}
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

          {/* Fecha (sin cambios) */}
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

          {/* Cultivo (sin cambios) */}
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

          {/* Estado (Ahora se muestra siempre, no solo al editar) */}
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

          {/* Descripción (sin cambios) */}
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

          {/* --- CORRECCIÓN 5: Añadir Inputs de Costo al JSX --- */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas Trabajadas
              </label>
              <input
                type="number"
                name="horas"
                value={formData.horas}
                onChange={handleChange}
                placeholder="Ej: 4"
                min="0"
                step="0.5"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarifa por Hora (COP)
              </label>
              <input
                type="number"
                name="tarifaHora"
                value={formData.tarifaHora}
                onChange={handleChange}
                placeholder="Ej: 5000"
                min="0"
                step="500"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
          {/* --- FIN DE LA CORRECCIÓN 5 --- */}

        </div>

        {/* Columna derecha (Imágenes y Materiales) */}
        <div className="space-y-4">
          {/* (Sección de Imágenes sin cambios) */}
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

          {/* (Sección de Materiales sin cambios) */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Materiales Utilizados
            </label>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Package size={14}/> Material</label>
                  <select
                    value={materialActual}
                    onChange={(e) => setMaterialActual(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {materialesDisponibles.map((m) => {
                      const stockDisp = calcularStockDisponible(m);
                      const unidad = m.tipoConsumo === 'consumible' && m.cantidadPorUnidad ? (m.medidasDeContenido || 'unidades') : m.tipoEmpaque;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.nombre} (Disp: {stockDisp} {unidad})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Hash size={14}/> Cantidad</label>
                  <input
                    type="number"
                    value={cantidadMaterial || ''}
                    onChange={(e) => setCantidadMaterial(Number(e.target.value))}
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
        </div>

        {/* (Botones sin cambios) */}
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