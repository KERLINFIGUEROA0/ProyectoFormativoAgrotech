import { type ReactElement, useState, useRef, useEffect } from "react";
import { Input, Button, Select, SelectItem } from "@heroui/react";
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
   const [userRole, setUserRole] = useState<string>("");

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
        setUserRole(data.rolNombre || "Usuario");

        // Fetch profile picture
        try {
          const picBlob = await getProfilePic();
          const picUrl = URL.createObjectURL(picBlob);
          currentAvatarUrl = picUrl;
          setAvatarUrl(picUrl);
        } catch (picError: unknown) {
          // Silently use default avatar without logging error
          // Check if it's our specific "no profile pic" error
          if (picError instanceof Error && picError.message !== 'NO_PROFILE_PIC') {
            console.error("Error al cargar foto de perfil:", picError);
          }
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
    } catch (error: any) {
      console.error("Error al guardar el perfil:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Error al guardar el perfil. Inténtelo de nuevo.";
      toast.error(errorMessage);
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
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl shadow-xl p-8 w-full h-full relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-200/30 to-blue-200/30 rounded-full translate-y-12 -translate-x-12"></div>

      {/* Header con mensaje de bienvenida */}
      <div className="bg-[#4CAF50] rounded-2xl p-6 mb-8 relative z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Mi Perfil</h2>
            <p className="text-green-100 text-sm md:text-base">¡Hola {form.nombres || 'Usuario'}! Gestiona tu información personal y configuración de seguridad</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium backdrop-blur-sm"
            title="Cerrar Sesión"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative z-10">
        {/* Left: información personal */}
        <div className="md:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Información Personal</h3>

              {!isEditing && (
                <Button
                  onClick={handleEdit}
                  isIconOnly
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  title="Editar perfil"
                >
                  <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Tipo de Identificación"
                placeholder="Selecciona el tipo"
                selectedKeys={new Set([tempForm.tipo])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  handleChange("tipo", selected as string);
                }}
                isDisabled={!isEditing}
                className="text-sm"
                classNames={{
                  trigger: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white",
                  label: "text-sm font-semibold text-gray-700"
                }}
              >
                <SelectItem key="Cédula de Ciudadanía">Cédula de Ciudadanía</SelectItem>
                <SelectItem key="Tarjeta de Identidad">Tarjeta de Identidad</SelectItem>
              </Select>

              <Input
                label="Número de Identificación"
                value={String(tempForm.identificacion ?? "")}
                onChange={(e) => handleChange("identificacion", e.target.value)}
                className="text-sm"
                isDisabled={!isEditing}
                type="number"
                classNames={{
                  input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                  label: "text-sm font-semibold text-gray-700"
                }}
              />

              <Input
                label="Nombres"
                value={tempForm.nombres}
                onChange={(e) => handleChange("nombres", e.target.value)}
                className="text-sm"
                isDisabled={!isEditing}
                classNames={{
                  input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                  label: "text-sm font-semibold text-gray-700"
                }}
              />

              <Input
                label="Apellidos"
                value={tempForm.apellidos}
                onChange={(e) => handleChange("apellidos", e.target.value)}
                className="text-sm"
                isDisabled={!isEditing}
                classNames={{
                  input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                  label: "text-sm font-semibold text-gray-700"
                }}
              />

              <Input
                label="Correo Electrónico"
                value={tempForm.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="text-sm md:col-span-2"
                isDisabled={!isEditing}
                classNames={{
                  input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                  label: "text-sm font-semibold text-gray-700"
                }}
              />

              <Input
                label="Número de Teléfono"
                value={String(tempForm.telefono ?? "")}
                onChange={(e) => handleChange("telefono", e.target.value)}
                className="text-sm md:col-span-2"
                isDisabled={!isEditing}
                classNames={{
                  input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                  label: "text-sm font-semibold text-gray-700"
                }}
              />
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={handleCancel}
                  color="default"
                  variant="light"
                  className="font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  color="primary"
                  className="font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Guardar Cambios
                </Button>
              </div>
            )}

            {formErrors.length > 0 && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Errores en el formulario</span>
                </div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: perfil y seguridad */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-4 md:p-6 flex items-center justify-center min-h-[300px]">
            <div className="w-full flex flex-col items-center">
              <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <img src={avatarSrc} alt="avatar" className="h-24 w-24 md:h-32 md:w-32 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform duration-300" />
                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute -bottom-1 -right-1 bg-[#4CAF50] hover:bg-[#45a049] border-2 border-white rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 5a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-3.2l-.7-1.4A1 1 0 0010.5 3h-1a1 1 0 00-.9.6L7.2 5H4z" />
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">{form.email}</p>
              <h4 className="text-lg md:text-xl font-bold text-gray-800 mb-2 text-center">
                {`${form.nombres || ''} ${form.apellidos || ''}`.trim()}
              </h4>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-full px-3 py-1.5 border border-green-200/50">
                <span className="text-xs md:text-sm font-semibold text-green-700 capitalize">{userRole}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-4 max-h-[180px] overflow-y-auto">
            <h5 className="text-base md:text-lg font-semibold mb-3 text-gray-800">Seguridad</h5>
            <Button
              onClick={onOpenModal}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-[#4CAF50]/10 border border-[#4CAF50]/30 hover:bg-[#4CAF50]/20 transition-all duration-300 group"
              variant="light"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#4CAF50]/20 rounded-lg group-hover:bg-[#4CAF50]/30 transition-colors duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[#4CAF50]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v4a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2h-1V6a4 4 0 00-4-4z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-700 text-sm">Cambiar Contraseña</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-[#4CAF50] group-hover:text-[#45a049] transition-colors duration-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>


    </div>
  );
}