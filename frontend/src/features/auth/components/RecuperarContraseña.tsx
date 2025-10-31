// src/components/RecuperarContraseña.tsx
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type ChangeEvent, type ReactElement, useState } from "react";
import logo from "../../../assets/logo.png";
import { solicitarRecuperacion } from "../api/auth";
import { toast } from "sonner";


export default function FormularioRecuperarClave(): ReactElement {
  const navigate = useNavigate();
  const [identificacion, setIdentificacion] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);

  const manejarSolicitud = async (): Promise<void> => {
    if (!identificacion) {
      toast.error("Por favor, ingresa tu número de identificación.");
      return;
    }
    setCargando(true);
    try {
      const res = await solicitarRecuperacion(String(identificacion));
      localStorage.setItem("correo_recuperacion", res.correo || "no disponible");
      toast.success("Solicitud enviada. Revisa tu correo electrónico.");
      navigate("/send");
    } catch (err: unknown) {
      let mensajeError = "Error al solicitar la recuperación";
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as any).response;
        if (response?.data?.message) {
          mensajeError = response.data.message;
        }
      }
      toast.error(mensajeError);
      console.error(err); 
    } finally {
      setCargando(false);
    }
  };


  return (
    <div className="w-full max-w-2xl">
      <Card className="shadow-2xl rounded-2xl bg-white/95 border border-green-200">
        <CardBody className="flex flex-col gap-6 p-8 md:p-12">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-14" />
            <h1 className="text-2xl md:text-2xl font-extrabold text-gray-800 flex items-center gap-2">
              <Lock className="w-6 h-6 text-gray-700" />
              Restablecer Contraseña
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            Ingresa tu número de identificación para enviarte un enlace de recuperación.
          </p>
          <div className="w-full">
            <Input
              type="number"
              label="Número de identificación"
              variant="bordered"
              size="lg"
              fullWidth
              className="h-14 text-lg px-4"
              value={identificacion !== null ? String(identificacion) : ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const valor = e.target.value;
                setIdentificacion(valor === "" ? null : Number(valor));
              }}
            />
          </div>
          <div className="pt-2">
            <Button
              color="success"
              size="lg"
              fullWidth
              onPress={manejarSolicitud}
              className="rounded-lg bg-green-600 hover:bg-green-700 shadow-md text-white"
              disabled={cargando}
            >
              {cargando ? "Enviando..." : "Enviar Enlace"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}