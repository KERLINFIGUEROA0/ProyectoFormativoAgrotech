import { type ReactElement, useState, useRef, useEffect } from "react";
import { Input } from "@heroui/react";
import avatarImg from "../../../assets/usuario.png";
import type { UsuarioData, UpdatePerfilDto } from "../../../types/auth";
import { obtenerPerfil, editarPerfil, uploadProfilePic, getProfilePic } from "../../auth/api/auth";
import { toast } from "sonner";

interface UsuarioProps {
  onOpenModal?: () => void;
  initialSection?: string;
  handleLogout: () => void;
}

export default function Usuario({ onOpenModal, handleLogout }: UsuarioProps): ReactElement {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [form, setForm] = useState<UsuarioData>({
    tipo: "",
    identificacion: 0,
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    fotoUrl: "",
  });
  const [tempForm, setTempForm] = useState<UsuarioData>(form);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(avatarImg);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    let currentAvatarUrl = "";

    const fetchUsuarioAndPic = async () => {
      try {
        const data = await obtenerPerfil();
        const usuario: UsuarioData = {
          tipo: data.tipoIdentificacion || "Cédula de Ciudadanía",
          identificacion: data.identificacion,
          nombres: data.nombres || "",
          apellidos: data.apellidos || "",
          email: data.correo || "",
          telefono: data.telefono || "",
          fotoUrl: data.fotoUrl || "",
        };
        setForm(usuario);
        setTempForm(usuario);

        // Fetch profile picture
        try {
          const picBlob = await getProfilePic();
          const picUrl = URL.createObjectURL(picBlob);
          currentAvatarUrl = picUrl;
          setAvatarUrl(picUrl);
        } catch (picError) {
          console.error("No se pudo cargar la foto de perfil, usando avatar por defecto.", picError);
          setAvatarUrl(avatarImg); 
        }
      } catch (error) {
        console.error("Error al obtener el perfil:", error);
        toast.error("No se pudo cargar la información del perfil.");
      }
    };

    fetchUsuarioAndPic();

    return () => {
      if (currentAvatarUrl && currentAvatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentAvatarUrl);
      }
    };
  }, [refreshTrigger]);

  const handleChange = (k: keyof UsuarioData, v: string): void => {
    if (k === "identificacion") {
      setTempForm((s) => ({ ...s, [k]: Number(v) }));
    } else {
      setTempForm((s) => ({ ...s, [k]: v }));
    }
  };

  const handleEdit = (): void => {
    setTempForm(form);
    setIsEditing(true);
    setFormErrors([]);
  };

  const handleCancel = (): void => {
    setTempForm(form);
    setIsEditing(false);
    setFormErrors([]);
    setAvatarPreview(null);
  };

  const handleSave = async (): Promise<void> => {
    const errors: string[] = [];
    const idDigits = String(tempForm.identificacion ?? "").replace(/\D+/g, "");
    if (idDigits.length < 6 || idDigits.length > 10) {
      errors.push("El número de identificación debe tener entre 6 y 10 dígitos.");
    }

    const telDigits = String(tempForm.telefono ?? "").replace(/\D+/g, "");
    if (telDigits.length !== 10) {
      errors.push("El número de teléfono debe tener exactamente 10 dígitos.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tempForm.email)) {
      errors.push("El correo electrónico no es válido.");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    try {
      const dataToUpdate: UpdatePerfilDto = {
        tipoIdentificacion: tempForm.tipo,
        identificacion: tempForm.identificacion,
        nombres: tempForm.nombres,
        apellidos: tempForm.apellidos,
        correo: tempForm.email,
        telefono: tempForm.telefono,
      };
      const updatedUser = await editarPerfil(dataToUpdate);
      const usuario: UsuarioData = {
        tipo: updatedUser.tipoIdentificacion || "",
        identificacion: updatedUser.identificacion || 0,
        nombres: updatedUser.nombres || "",
        apellidos: updatedUser.apellidos || "",
        email: updatedUser.correo || "",
        telefono: updatedUser.telefono || "",
        fotoUrl: updatedUser.fotoUrl || "",
      };
      setForm(usuario);
      setTempForm(usuario);
      setIsEditing(false);
      toast.success("Perfil actualizado con éxito.");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
      toast.error("Error al guardar el perfil. Inténtelo de nuevo.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localPreviewUrl = URL.createObjectURL(file);
      setAvatarPreview(localPreviewUrl);
      try {
        await uploadProfilePic(file);
        toast.success("Foto de perfil subida con éxito.");

        // Refetch picture
        const picBlob = await getProfilePic();
        const picUrl = URL.createObjectURL(picBlob);
        setAvatarUrl(picUrl);
        setAvatarPreview(null);
        setRefreshTrigger(prev => prev + 1);

      } catch (error) {
        console.error("Error al subir la foto:", error);
        toast.error("Error al subir la foto. Inténtelo de nuevo.");
      }
    }
  };

  const avatarSrc = avatarPreview || avatarUrl;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 w-full h-full relative">
      <h2 className="text-xl md:text-2xl font-semibold mb-6">Mi Perfil</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Left: información personal */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Información Personal</h3>

              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md"
                >
                  Editar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de Identificación
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={tempForm.tipo}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                  disabled={!isEditing}
                >
                  <option>Cédula de Ciudadanía</option>
                  <option>Tarjeta de Identidad</option>
                </select>
              </div>

              <Input
                label="Número de Identificación"
                value={String(tempForm.identificacion ?? "")}
                onChange={(e) => handleChange("identificacion", e.target.value)}
                className="text-sm"
                isDisabled={!isEditing}
                type="number"
              />

              <Input
                label="Nombres"
                value={tempForm.nombres}
                onChange={(e) => handleChange("nombres", e.target.value)}
                className="text-sm"
                isDisabled={!isEditing}
              />

              <Input
                label="Apellidos"
                value={tempForm.apellidos}
                onChange={(e) => handleChange("apellidos", e.target.value)}
                className="text-sm"
                isDisabled={!isEditing}
              />

              <Input
                label="Correo Electrónico"
                value={tempForm.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="text-sm md:col-span-2"
                isDisabled={!isEditing}
              />

              <Input
                label="Número de Teléfono"
                value={String(tempForm.telefono ?? "")}
                onChange={(e) => handleChange("telefono", e.target.value)}
                className="text-sm md:col-span-2"
                isDisabled={!isEditing}
              />
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>
              </div>
            )}

            {formErrors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded">
                <ul className="list-disc pl-5 text-sm">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: perfil y seguridad */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6 flex items-center justify-center">
            <div className="w-full flex flex-col items-center">
              <div className="relative h-28 w-28 md:h-36 md:w-36 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <img src={avatarSrc} alt="avatar" className="h-28 w-28 md:h-36 md:w-36 rounded-full object-cover" />
                <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-white border rounded-full p-1 shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 5a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-3.2l-.7-1.4A1 1 0 0010.5 3h-1a1 1 0 00-.9.6L7.2 5H4z" />
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
              <p className="text-sm text-gray-500">{form.email}</p>
              <h4 className="text-lg font-semibold">
                {`${form.nombres || ''} ${form.apellidos || ''}`.trim()}
              </h4>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <h5 className="text-sm font-medium mb-3">Seguridad</h5>
      <button
        onClick={onOpenModal}
        className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {/* Icono */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-blue-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 2a4 4 0 00-4 4v2H5a2 
              2 0 00-2 2v4a2 2 0 002 2h10a2 
              2 0 002-2v-4a2 2 0 00-2-2h-1V6a4 
              4 0 00-4-4z" />
          </svg>
          <span>Cambiar Contraseña</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 
            10 7.293 6.707a1 1 0 011.414-1.414l4 
            4a1 1 0 010 1.414l-4 4a1 1 0 
            01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
        </div>
      </div>

      {/* Botón Cerrar Sesión */}
      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm text-red-600 hover:bg-red-50"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}