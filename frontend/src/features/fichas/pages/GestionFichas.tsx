import { type ReactElement } from "react";
import GestionFichas from "../components/GestionFichas";

export default function GestionFichasPage(): ReactElement {
  return (
    <div className="min-h-screen bg-gray-50">
      <GestionFichas />
    </div>
  );
}