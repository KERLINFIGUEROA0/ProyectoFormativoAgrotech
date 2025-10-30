import { Card, CardBody } from "@heroui/react";
import { Lock } from "lucide-react";
import logo from "../../../assets/logo.png";

export default function ResetPasswordMessage() {

  const correo = localStorage.getItem("correo_recuperacion") || "No disponible";

  return (
    <Card className="w-[600px] shadow-lg rounded-2xl bg-white/95">
      <CardBody className="flex flex-col gap-6 p-10">
        {/* Logo + título */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-12" />
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-700" />
            Restablecimiento de contraseña
          </h1>
        </div>

        {/* Mensaje */}
        <p className="text-gray-700 text-base leading-relaxed">
  Se ha enviado un link para restablecer su nueva contraseña al correo
  electrónico. Por favor verifique el correo{" "}
  <span className="text-green-700 font-semibold">{correo} </span>
  y dé clic en el enlace para cambiar su contraseña.
</p>
      </CardBody>
    </Card>
  );
}
