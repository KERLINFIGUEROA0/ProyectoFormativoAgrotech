import { type ReactElement, useState } from "react";
import Usuario from "../components/Usuario";
import { cambiarPassword } from "../../auth/api/auth";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import { Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

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

  const validateAndSubmit = async (): Promise<void> => {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await validateAndSubmit();
  };

  return (
    <div className="w-full h-full">
      <Usuario onOpenModal={() => setIsModalOpen(true)} initialSection={initialSection} handleLogout={handleLogout} />

      <Modal isOpen={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          resetForm();
          setIsModalOpen(false);
        }
      }} size="2xl" scrollBehavior="inside" className="max-h-[90vh]">
        <ModalContent className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl bg-white">
          <ModalHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Cambiar Contraseña</h3>
                <p className="text-sm text-gray-600">Actualiza tu contraseña de seguridad</p>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="py-6">
            {errores.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm mb-6">
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

            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Contraseña Actual"
                type="password"
                value={contrasenaActual}
                onValueChange={setContrasenaActual}
                placeholder="••••••••"
                classNames={{
                  input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white",
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
                    input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white",
                    label: "text-sm font-semibold text-gray-700"
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números.</p>
              </div>

              <Input
                label="Confirmar Nueva Contraseña"
                type="password"
                value={confirmarContrasena}
                onValueChange={setConfirmarContrasena}
                placeholder="Confirmar contraseña"
                classNames={{
                  input: "rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white",
                  label: "text-sm font-semibold text-gray-700"
                }}
              />
            </form>
          </ModalBody>

          <ModalFooter className="bg-gray-50 border-t border-gray-200">
            <Button
              onClick={() => {
                resetForm();
                setIsModalOpen(false);
              }}
              color="default"
              variant="light"
              className="font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={validateAndSubmit}
              color="primary"
              className="font-medium shadow-lg"
            >
              Cambiar Contraseña
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}