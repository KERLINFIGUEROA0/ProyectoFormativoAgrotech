import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
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
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
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
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Dibujar Área en el Mapa"
    >
           {" "}
      <div className="space-y-4 max-h-[30rem] overflow-y-auto">
               {" "}
        <div className="flex gap-2">
                   {" "}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ubicación..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
                   {" "}
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
                        Buscar          {" "}
          </button>
                 {" "}
        </div>
               {" "}
        {area > 0 && (
          <div className="bg-green-50 p-3 rounded-lg">
                       {" "}
            <p className="text-sm text-green-800">
                            <strong>Área calculada:</strong> {area.toFixed(2)}{" "}
              m²            {" "}
            </p>
                     {" "}
          </div>
        )}
               {" "}
        <div
          ref={mapContainerRef} // ID "map" añadido para asegurar que los estilos de leaflet-draw se apliquen
          id="map"
          className="w-full h-96 border border-gray-300 rounded-lg"
        />
               {" "}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                   {" "}
          <p>
                        <strong>Instrucciones:</strong>         {" "}
          </p>
                   {" "}
          <ul className="list-disc list-inside mt-1">
                       {" "}
            <li>
                            Usa la herramienta de dibujo (polígono) para trazar
              el área deseada (mínimo 3 puntos, máximo 8 puntos)  
                       {" "}
            </li>
                       {" "}
            <li>
              Puedes editar el polígono después de dibujarlo usando las
              herramientas de edición {" "}
            </li>
                       {" "}
            <li>
                            Puedes buscar una ubicación específica usando la
              barra de búsqueda            {" "}
            </li>
                       {" "}
            <li>El área se calcula automáticamente para polígonos</li>         
              <li>Confirma para guardar o cancela para descartar</li>         {" "}
          </ul>
                 {" "}
        </div>
               {" "}
        <div className="flex justify-end gap-3">
                   {" "}
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
                        Cancelar          {" "}
          </button>
                   {" "}
          <button
            onClick={handleConfirm}
            disabled={coordinates.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
                        Confirmar          {" "}
          </button>
                 {" "}
        </div>
             {" "}
      </div>
         {" "}
    </Modal>
  );
};

export default DrawMapModal;
