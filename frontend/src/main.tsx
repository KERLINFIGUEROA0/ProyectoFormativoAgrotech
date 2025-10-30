import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { HeroUIProvider } from "@heroui/react";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(
  document.getElementById("root")!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HeroUIProvider>
  </React.StrictMode>
);
