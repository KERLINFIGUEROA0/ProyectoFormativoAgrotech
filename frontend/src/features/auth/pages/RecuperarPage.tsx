import { type ReactElement } from "react";
import ResetPasswordForm from "../components/RecuperarContraseña";
import bg from "../../../assets/bg-login.jpg";

export default function ResetPassword(): ReactElement {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Oscurecer y desenfocar ligeramente el fondo */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* Contenedor central (hero) */}
      <div className="relative z-20 w-full max-w-5xl px-6 py-20 flex items-center justify-center">
        <ResetPasswordForm />
      </div>

      {/* Pequeño degradado inferior para profundidad */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 to-transparent"></div>
    </div>
  );
}
