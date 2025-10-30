import { type ReactElement } from "react";
import LoginForm from "../components/IniciarSesion";
import bg from "../../../assets/bg-login.jpg";

export default function LoginPage(): ReactElement {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="absolute inset-0 "></div>

      <div className="relative z-10 w-full max-w-5xl px-6 py-24 flex items-center justify-center">
        <div className="w-full flex items-center justify-center px-4">
          <LoginForm />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 to-transparent"></div>
    </div>
  );
}
