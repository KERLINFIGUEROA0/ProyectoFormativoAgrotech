import { useOutletContext } from "react-router-dom";
import UsuarioPage from "../features/user/pages/Usuario";

interface OutletContextType {
  activeSection: string;
}

export default function HomePage() {
  const { activeSection } = useOutletContext<OutletContextType>();


  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">Inicio</h1>
            <p>Bienvenido al panel principal de AgroTIC 🌱</p>
          </>
        );
      case "perfil":
      case "datos":
      case "seguridad":
        return <UsuarioPage initialSection={activeSection} />;
      default:
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">Sección no encontrada</h1>
            <p>La sección "{activeSection}" no existe.</p>
          </>
        );
    }
  };

  return <>{renderContent()}</>;
}