// src/components/IniciarSesion.tsx
import { useState, type ChangeEvent, type ReactElement } from "react";
import { Input, Button, Card, CardBody } from "@heroui/react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../../assets/logo.png";
import type { LoginData } from "../interfaces/InterAuth";
import { useAuth } from "../../../context/AuthContext";
import { login as loginApi } from "../api/auth";
import { toast } from "sonner";

export default function FormularioLogin(): ReactElement {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [cargando, setCargando] = useState(false);

  const [formulario, setFormulario] = useState<LoginData>({
    identificacion: "",
    password: "",
  });

  const [esVisible, setEsVisible] = useState<boolean>(false);
  const toggleVisibilidad = (): void => setEsVisible((v) => !v);

  const manejarLogin = async (): Promise<void> => {
    setCargando(true);
    const minLoadingTime = 2000;
    const startTime = Date.now();

    try {
      const res = await loginApi(
        formulario.identificacion,
        formulario.password
      );
      
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      login(res.access_token);
      toast.success("Inicio de sesión exitoso");
      navigate("/home", { replace: true });

    } catch (error: unknown) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      let mensajeBackend = "Error desconocido";
      if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as any).response; 

        if (response?.data?.message) {
          mensajeBackend = response.data.message;
        }
      }

      if (mensajeBackend.includes("inactivo")) {
        toast.error(mensajeBackend);
      } else {
        toast.error("Credenciales incorrectas");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl rounded-2xl bg-white border border-green-100">
      <CardBody className="flex flex-col gap-4 p-8">
        <div className="flex justify-center">
          <img src={logo} alt="Logo" className="h-20" />
        </div>
        <h1 className="text-center text-2xl font-extrabold">Iniciar sesión</h1>
        <Input
          label="Documento"
          type="number"
          variant="bordered"
          size="md"
          fullWidth
          className="h-11 text-sm px-3"
          value={formulario.identificacion}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFormulario({ ...formulario, identificacion: e.target.value })
          }
        />
        <Input
          label="Contraseña"
          type={esVisible ? "text" : "password"}
          variant="bordered"
          size="md"
          fullWidth
          className="h-11 text-sm px-3"
          value={formulario.password}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFormulario({ ...formulario, password: e.target.value })
          }
          endContent={
            <button
              type="button"
              onClick={toggleVisibilidad}
              className="focus:outline-none"
              aria-label={
                esVisible ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            ></button>
          }
        />
        <Link
          to="/recuperar"
          className="text-xs text-gray-500 hover:underline self-start"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        <Button
          color="success"
          size="lg"
          fullWidth
          onPress={manejarLogin}
          isLoading={cargando}
          className="rounded-lg bg-green-600 hover:bg-green-700 shadow-md text-white"
        >
          Ingresar
        </Button>
      </CardBody>
    </Card>
  );
}

