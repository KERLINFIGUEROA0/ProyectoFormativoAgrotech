import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { HeroUIProvider } from "@heroui/react";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import { initializeCapacitor } from "./capacitor-init";

// Inicializar Capacitor
initializeCapacitor();

ReactDOM.createRoot(
  document.getElementById("root")!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </AuthProvider>
    </HeroUIProvider>
  </React.StrictMode>
);
