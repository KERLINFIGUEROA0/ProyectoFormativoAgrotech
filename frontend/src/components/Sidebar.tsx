// components/Sidebar.tsx

import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Settings,
  Package,
  TrendingUp,
  User,
  Sprout,
  Cpu,
  Activity,
  LogOut,
  ChevronDown,
  ClipboardList, // Icono para el nuevo menú de Actividades
  Calendar,
  CirclePause,
  WorkflowIcon, // Icono para el submenú de Cronograma
} from "lucide-react";

import logoAgroFull from "../assets/logo.png";
import logoAgroMini from "../assets/logo1.png";

//--- TIPOS ---//
interface MenuItemType {
  id: string;
  label: string;
  icon?: ComponentType<any>;
  logo?: string;
  notification?: number;
  children?: MenuItemType[];
}

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  handleLogout: () => void;
}

//--- DATOS ---//
const menuItems: MenuItemType[] = [
  {
    id: "home",
    label: "Inicio",
    icon: Home,
  },
  {
    id: "iot",
    label: "IoT",
    icon: Cpu,
    children: [
      // { id: "sensores", label: "Sensores", icon: Cpu }, // <-- ELIMINADO
      { id: "gestion-sensores", label: "Monitor de Sensores", icon: Activity },
  { id: "gestion-brokers", label: "Configuración Bróker", icon: WorkflowIcon  },
    ],
  },
  {
    id: "cultivos",
    label: "Cultivos",
// ... (El resto del archivo no cambia) ...
    icon: Sprout,
    children: [
      { id: "gestion-cultivos", label: "Gestion de cultivos", icon: Sprout },
      { id: "gestion-lotes", label: "Gestion de lotes", icon: Sprout },
      { id: "gestion-surcos", label: "Gestion de Surcos", icon: Sprout },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: Package,
    children: [
      { id: "stock", label: "Stock", icon: Package },
      { id: "movimientos", label: "Movimientos", icon: TrendingUp },
    ],
  },
  {
    id: "fitosanitario",
    label: "Fitosanitario",
    icon: Activity,
    children: [
      { id: "aplicaciones", label: "Aplicaciones", icon: Activity },
      { id: "historial", label: "Historial", icon: TrendingUp },
    ],
  },
  // --- NUEVO MENÚ DE ACTIVIDADES ---
  {
    id: "actividades-menu",
    label: "Actividades",
    icon: ClipboardList,
    children: [
      { id: "cronograma", label: "Cronograma", icon: Calendar },
      { id: "gestion-actividades", label: "Tareas", icon: Activity },
    ],
  },
  // ---------------------------------
  {
    id: "finanzas",
    label: "Finanzas",
    icon: TrendingUp,
    children: [
      { id: "ingresos", label: "Ingresos", icon: TrendingUp },
      { id: "egresos", label: "Egresos", icon: Package },
    ],
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: Settings,
    children: [
      { id: "gestion-usuarios", label: "Gestion Usuarios", icon: User },
      { id: "gestion-roles", label: "Gestion Roles", icon: Settings },
    ],
  },
];

//--- COMPONENTE ---//
export default function Sidebar({
  activeSection,
  setActiveSection,
  handleLogout,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleMenu = (id: string) => {
    setOpenMenu(openMenu === id ? null : id);
  };

  return (
    <aside
      className={`bg-white shadow-xl transition-all duration-300 flex flex-col
      ${collapsed ? "w-20" : "w-64"}
      h-[95vh] ml-4 my-auto rounded-3xl border border-green-100`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-center w-full">
          <img
            src={collapsed ? logoAgroMini : logoAgroFull}
            alt="Logo AgroTIC"
            className={`${
              collapsed ? "w-10 h-10" : "w-40"
            } object-contain transition-all duration-300`}
          />
        </div>
      </div>

      {/* Menú */}
      <nav
        className={`flex-1 flex flex-col gap-2 overflow-y-auto px-4 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeSection === item.id ||
            item.children?.some((c) => c.id === activeSection);

          return (
            <div key={item.id}>
              {/* Botón principal */}
              <button
                onClick={() => {
                  if (item.id === "perfil") {
                    setActiveSection(item.id);
                    navigate("/usuario");
                  } else if (item.children) {
                    toggleMenu(item.id);
                  } else {
                    setActiveSection(item.id);
                    navigate(`/${item.id}`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-base
                ${
                  isActive && !collapsed
                    ? "bg-green-500 text-white font-semibold shadow-md"
                    : isActive && collapsed
                    ? "bg-green-100 text-green-500 font-semibold"
                    : "text-gray-600 hover:bg-green-50 hover:text-green-800"
                }
                ${collapsed ? "justify-center" : ""}`}
              >
                {item.logo ? (
                  <img
                    src={item.logo}
                    alt={item.label}
                    className="w-6 h-6 object-contain flex-shrink-0"
                  />
                ) : (
                  Icon && <Icon className="w-6 h-6 flex-shrink-0" />
                )}

                {!collapsed && <span className="truncate">{item.label}</span>}

                {item.children && !collapsed && (
                  <ChevronDown
                    className={`ml-auto w-5 h-5 transition-transform flex-shrink-0 ${
                      openMenu === item.id ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {/* Submenú */}
              {item.children && openMenu === item.id && !collapsed && (
                <div className="pl-4 mt-2 flex flex-col gap-2">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = activeSection === child.id;

                    return (
                      <button
                        key={child.id}
                        onClick={() => {
                          setActiveSection(child.id);
                          navigate(`/${child.id}`);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-100 text-left
                        ${
                          isChildActive
                            ? "bg-green-100 text-green-800 font-semibold"
                            : "text-gray-500 hover:bg-green-50 hover:text-green-800"
                        }`}
                      >
                        {child.logo ? (
                          <img
                            src={child.logo}
                            alt={child.label}
                            className="w-5 h-5 object-contain flex-shrink-0"
                          />
                        ) : (
                          ChildIcon && (
                            <ChildIcon className="w-5 h-5 flex-shrink-0" />
                          )
                        )}
                        <span className="text-sm truncate">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pt-4 border-t border-gray-100">
        {collapsed ? (
          // Vista Colapsada
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                setActiveSection("perfil");
                navigate("/usuario");
              }}
              className="flex items-center justify-center w-12 h-12 rounded-lg text-gray-600 hover:bg-green-50 hover:text-green-800 transition-all duration-200"
            >
              <User className="w-6 h-6" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-12 h-12 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        ) : (
          // Vista Expandida
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveSection("perfil");
                  navigate("/usuario");
                }}
                className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-800 transition-all duration-200"
              >
                <User className="w-6 h-6 flex-shrink-0" />
                <span className="truncate">Perfil</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
            <p className="mt-4 text-xs text-center text-gray-400">
              © 2025 AgroTech
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
