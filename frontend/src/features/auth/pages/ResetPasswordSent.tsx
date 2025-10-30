import ResetPasswordMessage from "../components/ResetPasswordMessage";
import bg from "../../../assets/bg-login.jpg";

export default function ResetPasswordSent() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Capa oscura sobre el fondo */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* Contenido */}
      <div className="relative z-10">
        <ResetPasswordMessage />
      </div>
    </div>
  );
}
