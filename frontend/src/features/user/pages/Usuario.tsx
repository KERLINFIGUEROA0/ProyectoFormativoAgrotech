import { type ReactElement, useState } from "react";
import Usuario from "../components/Usuario";
import { cambiarPassword } from "../../auth/api/auth";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";

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
                <div className="bg-red-100 text-red-700 p-3 rounded mb-3 text-sm">
                  <ul className="list-disc pl-5">
                    {errores.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium">Contraseña Actual</label>
                  <input
                    type="password"
                    value={contrasenaActual}
                    onChange={(e) => setContrasenaActual(e.target.value)}
                    className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2"
                    placeholder="Nueva contraseña"
                  />
                  <p className="text-xs text-gray-500 mt-1">La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2"
                    placeholder="Confirmar contraseña"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="ml-auto bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Cambiar Contraseña
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}