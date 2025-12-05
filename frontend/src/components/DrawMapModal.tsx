import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { Search, MapPin } from "lucide-react";
import Modal from "./Modal"; // Asegúrate de que este Modal exista en la misma carpeta

// --- Configuración de íconos (Tu código) ---
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// --- Declaraciones de módulo (Tu código) ---
declare module "leaflet" {
  export const Draw: {
    Event: {
      CREATED: string;
      EDITED: string;
      DELETED: string;
    };
  };

  export class LatLng {
    lat: number;
    lng: number;
    constructor(lat: number, lng: number);
  }

  export class Layer {
    remove(): void;
    getLatLngs(): LatLng[][];
  }

  export class FeatureGroup {
    clearLayers(): void;
  }

  export class Marker {
    remove(): void;
    getLatLng(): LatLng;
  }

  export class Map {
    remove(): void;
    setView(center: [number, number], zoom: number): void;
    addLayer(layer: unknown): void;
    removeLayer(layer: unknown): void;
    on(event: string, handler: (event: unknown) => void): void;
  }
}

interface DrawMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (coordinates: [number, number][], area: number) => void;
  initialCoordinates?: [number, number][]; // Para editar coordenadas existentes
}

interface SearchSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

const DrawMapModal: React.FC<DrawMapModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialCoordinates,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<number>(0);
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

  useEffect(() => {
    if (isOpen && mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([4.5709, -74.2973], 6);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          maxZoom: 20,
        }
      ).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      if (initialCoordinates && initialCoordinates.length > 0) {
        const polygon = L.polygon(
          initialCoordinates.map((coord) => [coord[0], coord[1]]),
          {
            color: "#4CAF50",
            fillColor: "#4CAF50",
            fillOpacity: 0.5,
          }
        );
        drawnItems.addLayer(polygon);

        const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
        const calculatedArea = L.GeometryUtil.geodesicArea(latlngs);
        setArea(Math.abs(calculatedArea));
        setCoordinates(initialCoordinates);
      }

      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems, // Ya no pasamos nada de íconos aquí, la modificación global se encarga
        },
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            minPoints: 3,
            maxPoints: 8,
            drawError: {
              color: "#e1e100",
              message: "<strong>Error:</strong> No se permiten intersecciones!",
            },
            shapeOptions: {
              color: "#4CAF50",
            }, // Asignamos el ícono para DIBUJAR (esto estaba bien)
            icon: new L.Icon.Default(),
            touchIcon: new L.Icon.Default(),
          },
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false,
        },
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (event: { layer: unknown }) => {
        const layer = event.layer as L.Layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);

        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          const coords: [number, number][] = latlngs.map((latlng) => [
            latlng.lat,
            latlng.lng,
          ]);

          if (coords.length > 8) {
            drawnItems.clearLayers();
            setArea(0);
            setCoordinates([]);

            alert(
              "Demasiados puntos de referencia. Solo se permiten máximo 8 puntos para el polígono."
            );
            return;
          }

          setCoordinates(coords);
          const calculatedArea = L.GeometryUtil.geodesicArea(latlngs);
          setArea(Math.abs(calculatedArea));
        }
      });

      map.on(L.Draw.Event.DELETED, () => {
        setArea(0);
        setCoordinates([]);
      });

      map.on(L.Draw.Event.EDITED, (event: unknown) => {
        const layers = (
          event as {
            layers: { eachLayer: (callback: (layer: unknown) => void) => void };
          }
        ).layers;
        layers.eachLayer((layer: unknown) => {
          if (layer instanceof L.Polygon) {
            const latlngs = (
              layer as unknown as { getLatLngs(): L.LatLng[][] }
            ).getLatLngs()[0] as L.LatLng[];
            const coords: [number, number][] = latlngs.map((latlng) => [
              latlng.lat,
              latlng.lng,
            ]);

            if (coords.length > 8) {
              // Limpiamos la capa si excede los puntos
              drawnItems.clearLayers();
              setArea(0);
              setCoordinates([]);
              alert(
                "Demasiados puntos de referencia. Solo se permiten máximo 8 puntos para el polígono."
              );
              return;
            }

            setCoordinates(coords);
            const calculatedArea = L.GeometryUtil.geodesicArea(latlngs);
            setArea(Math.abs(calculatedArea));
          }
        });
      });

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, initialCoordinates]); // Agregamos initialCoordinates aquí

  // Función debounced para búsqueda de sugerencias
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1&countrycodes=CO`
        );
        const data: SearchSuggestion[] = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error("Error en la búsqueda de sugerencias:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Función para debounce
  function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 15);
        setShowSuggestions(false);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (!mapRef.current) return;

    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    mapRef.current.setView([lat, lon], 15);

    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleConfirm = () => {
    if (coordinates.length > 0 && area > 0) {
      onConfirm(coordinates, area); // onClose(); // Dejamos que el padre cierre el modal
    }
  };

  const handleCancel = () => {
    onClose(); // Solo cerramos
  }; // Limpiamos el estado interno cuando el modal se cierra (controlado por el padre)

  useEffect(() => {
    if (!isOpen) {
      setArea(0);
      setCoordinates([]);
      setSearchQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [isOpen]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSuggestions && !(event.target as Element).closest('.search-container')) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Modal fullscreen flotante con scroll interno
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-500 ease-out">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
        {/* Header fijo */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Dibujar Área en el Mapa</h3>
              <p className="text-sm text-gray-600">Busca ubicaciones y dibuja áreas</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Contenido con scroll interno */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Sección de búsqueda prominente */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Ubicación
              </h3>
              <div className="relative search-container">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ej: Tecno parque, Bogotá..."
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Buscar
                  </button>
                </div>

                {/* Dropdown de sugerencias */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-[1000] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.place_id}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                          index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {suggestion.display_name.split(',')[0]}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {suggestion.display_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sección del mapa */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dibujar Área en el Mapa
              </h3>
              {area > 0 && (
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Área calculada:</strong> {area.toFixed(2)} m²
                  </p>
                </div>
              )}
              <div
                ref={mapContainerRef}
                id="map"
                className="w-full h-96 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Sección de instrucciones */}
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p>
                <strong>Instrucciones:</strong>
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Usa la herramienta de dibujo (polígono) para trazar el área deseada (mínimo 3 puntos, máximo 8 puntos)
                </li>
                <li>
                  Puedes editar el polígono después de dibujarlo usando las herramientas de edición
                </li>
                <li>
                  Busca ubicaciones con autocompletado: escribe y selecciona de la lista desplegable, o presiona Enter para buscar directamente
                </li>
                <li>El área se calcula automáticamente para polígonos</li>
                <li>Confirma para guardar o cancela para descartar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer con botones fijos */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0 rounded-b-2xl">
          <button
            onClick={handleCancel}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-center font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={coordinates.length === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-center font-medium"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawMapModal;
