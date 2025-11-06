import { type ReactElement, useState } from "react";
import Usuario from "../components/Usuario";
import { cambiarPassword } from "../../auth/api/auth";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import { Input, Button } from "@heroui/react";

interface UsuarioPageProps {
  initialSection?: string;
}

interface LayoutContext {
  handleLogout: () => void;
}

export default function UsuarioPage({ initialSection }: UsuarioPageProps): ReactElement {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [contrasenaActual, setContrasenaActual] = useState<string>("");
  const [nuevaContrasena, setNuevaContrasena] = useState<string>("");
  const [confirmarContrasena, setConfirmarContrasena] = useState<string>("");
  const [errores, setErrores] = useState<string[]>([]);
  const { handleLogout } = useOutletContext<LayoutContext>();

  const resetForm = (): void => {
    setContrasenaActual("");
    setNuevaContrasena("");
    setConfirmarContrasena("");
    setErrores([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrores([]);

    const erroresTemp: string[] = [];

    if (!contrasenaActual.trim()) {
      erroresTemp.push("La contraseña actual es obligatoria.");
    }

    if (nuevaContrasena.length < 8) {
      erroresTemp.push("La nueva contraseña debe tener al menos 8 caracteres.");
    }
    if (!/[A-Z]/.test(nuevaContrasena)) {
      erroresTemp.push("Debe incluir al menos una letra mayúscula.");
    }
    if (!/[a-z]/.test(nuevaContrasena)) {
      erroresTemp.push("Debe incluir al menos una letra minúscula.");
    }
    if (!/[0-9]/.test(nuevaContrasena)) {
      erroresTemp.push("Debe incluir al menos un número.");
    }
    if (nuevaContrasena !== confirmarContrasena) {
      erroresTemp.push("Las contraseñas no coinciden.");
    }

    if (erroresTemp.length > 0) {
      setErrores(erroresTemp);
      return;
    }

    try {
      await cambiarPassword(contrasenaActual, nuevaContrasena);
      toast.success("Contraseña cambiada con éxito.");
      resetForm();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error al cambiar la contraseña:", error);
      toast.error(error.response?.data?.message || "Error al cambiar la contraseña. Verifique la contraseña actual.");
    }
  };

  return (
    <div className="w-full h-full">
      <Usuario onOpenModal={() => setIsModalOpen(true)} initialSection={initialSection} handleLogout={handleLogout} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="relative w-full max-w-lg px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 relative">
              <button
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
                onClick={() => {
                  resetForm();
                  setIsModalOpen(false);
                }}
                aria-label="Cerrar modal"
              >
                ✕
              </button>

              <h2 className="text-xl font-semibold mb-4">Cambiar Contraseña</h2>

              {errores.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Errores en el formulario</span>
                  </div>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {errores.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="Contraseña Actual"
                  type="password"
                  value={contrasenaActual}
                  onValueChange={setContrasenaActual}
                  placeholder="••••••••"
                  classNames={{
                    input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                    label: "text-sm font-semibold text-gray-700"
                  }}
                />

                <div>
                  <Input
                    label="Nueva Contraseña"
                    type="password"
                    value={nuevaContrasena}
                    onValueChange={setNuevaContrasena}
                    placeholder="Nueva contraseña"
                    classNames={{
                      input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                      label: "text-sm font-semibold text-gray-700"
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números.</p>
                </div>

                <Input
                  label="Confirmar Nueva Contraseña"
                  type="password"
                  value={confirmarContrasena}
                  onValueChange={setConfirmarContrasena}
                  placeholder="Confirmar contraseña"
                  classNames={{
                    input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500",
                    label: "text-sm font-semibold text-gray-700"
                  }}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="ml-auto bg-[#4CAF50] hover:bg-[#45a049] text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Cambiar Contraseña
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}