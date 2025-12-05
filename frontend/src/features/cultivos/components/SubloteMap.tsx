import { useRef, type ReactElement } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Declaración global para Turf.js
declare global {
  interface Window {
    turf: any;
  }
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface Coordenada {
  lat: number;
  lng: number;
}

interface Lote {
  id: number;
  nombre: string;
  coordenadas?: {
    type: 'point' | 'polygon';
    coordinates: Coordenada | Coordenada[];
  };
}

interface Sublote {
  id: number;
  nombre: string;
  coordenadas?: {
    type: 'point' | 'polygon';
    coordinates: Coordenada | Coordenada[];
  };
  estado: string;
}

interface SubloteMapProps {
   lote: Lote;
   sublotes: Sublote[];
   onPointClick?: (lat: number, lng: number) => void;
   height?: string;
   tempLocation?: { lat: number; lng: number } | null;
   center?: [number, number];
   zoom?: number;
}

// Componente para manejar clics en el mapa
function MapClickHandler({ onPointClick }: { onPointClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e: any) => {
      if (onPointClick) {
        onPointClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function SubloteMap({
   lote,
   sublotes = [],
   onPointClick,
   height = '400px',
   tempLocation,
   center,
   zoom
}: SubloteMapProps): ReactElement {
  const mapRef = useRef<L.Map | null>(null);

  // Función para obtener color según estado del sublote
  const getSubloteColor = (estado: string) => {
    switch (estado) {
      case 'Disponible':
        return '#10B981'; // Verde
      case 'En siembra':
        return '#3B82F6'; // Azul
      case 'En cosecha':
        return '#F59E0B'; // Amarillo
      case 'Mantenimiento':
        return '#6B7280'; // Gris
      default:
        return '#6B7280'; // Gris
    }
  };

  // Convertir coordenadas del lote a formato Leaflet
  const getLotePolygon = (): [number, number][] => {
    if (!lote.coordenadas) return [];

    if (lote.coordenadas.type === 'polygon' && Array.isArray(lote.coordenadas.coordinates)) {
      return lote.coordenadas.coordinates.map(coord => [coord.lat, coord.lng]);
    }

    // Si es un punto, crear un pequeño polígono alrededor
    if (lote.coordenadas.type === 'point') {
      const center = lote.coordenadas.coordinates as Coordenada;
      const size = 0.001; // Aproximadamente 100m
      return [
        [center.lat - size, center.lng - size],
        [center.lat - size, center.lng + size],
        [center.lat + size, center.lng + size],
        [center.lat + size, center.lng - size],
      ];
    }

    return [];
  };

  // Convertir coordenadas de sublotes a marcadores
  const getSubloteMarkers = () => {
    return sublotes.map(sublote => {
      if (!sublote.coordenadas) return null;

      let position: [number, number] = [0, 0];

      if (sublote.coordenadas.type === 'point') {
        const coords = sublote.coordenadas.coordinates as Coordenada;
        position = [coords.lat, coords.lng];
      } else if (sublote.coordenadas.type === 'polygon' && Array.isArray(sublote.coordenadas.coordinates) && sublote.coordenadas.coordinates.length > 0) {
        // Si es polígono, usar el primer punto como posición del marcador
        const coords = sublote.coordenadas.coordinates[0] as Coordenada;
        position = [coords.lat, coords.lng];
      }

      if (position[0] === 0 && position[1] === 0) return null;

      return {
        id: sublote.id,
        nombre: sublote.nombre,
        position,
        color: getSubloteColor(sublote.estado),
        estado: sublote.estado,
      };
    }).filter(Boolean);
  };

  // Usar props center y zoom si están disponibles, sino calcular automáticamente
  const getMapCenter = (): [number, number] => {
    if (center) return center;

    const polygon = getLotePolygon();
    if (polygon.length > 0) {
      const lats = polygon.map(coord => coord[0]);
      const lngs = polygon.map(coord => coord[1]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      return [centerLat, centerLng];
    }
    return [4.6097, -74.0817]; // Bogotá como fallback
  };

  // Usar prop zoom si está disponible, sino calcular automáticamente con más zoom
  const getMapZoom = (): number => {
    if (zoom) return zoom;

    const polygon = getLotePolygon();
    if (polygon.length > 0) {
      const lats = polygon.map(coord => coord[0]);
      const lngs = polygon.map(coord => coord[1]);
      const latRange = Math.max(...lats) - Math.min(...lats);
      const lngRange = Math.max(...lngs) - Math.min(...lngs);
      const maxRange = Math.max(latRange, lngRange);

      if (maxRange < 0.001) return 19; // Muy pequeño - máximo zoom
      if (maxRange < 0.005) return 18; // Extra pequeño
      if (maxRange < 0.01) return 17; // Pequeño
      if (maxRange < 0.05) return 16; // Mediano-pequeño
      if (maxRange < 0.1) return 15; // Mediano
      return 14; // Grande pero con buen detalle
    }
    return 16; // Zoom alto por defecto para mejor visualización
  };

  const lotePolygon = getLotePolygon();
  const subloteMarkers = getSubloteMarkers();
  const mapCenter = getMapCenter();
  const mapZoom = getMapZoom();

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-200 relative" style={{ height }}>
      <MapContainer
        {...({ center: mapCenter as any, zoom: mapZoom, style: { height: '100%', width: '100%' } } as any)}
        ref={mapRef}
      >
        {/* Vista Satelital de Esri */}
        <TileLayer
          {...({ attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' } as any)}
        />

        <MapClickHandler onPointClick={onPointClick} />

        {/* Dibujar contorno del lote padre */}
        {lotePolygon.length > 0 && (
          <Polygon
            positions={lotePolygon}
            pathOptions={{
              color: '#fbbf24', // Amarillo para resaltar sobre satélite
              weight: 3,
              opacity: 0.8,
              fillColor: '#fbbf24',
              fillOpacity: 0.1,
            }}
          />
        )}

        {/* Dibujar marcadores de sublotes existentes */}
        {subloteMarkers.map((sublote) => (
          sublote && (
            <Marker
              key={sublote.id}
              position={sublote.position}
            >
              <Popup>
                <div>
                  <strong>{sublote.nombre}</strong><br />
                  Estado: {sublote.estado}<br />
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Dibujar marcador de ubicación temporal */}
        {tempLocation && (
          <Marker
            position={[tempLocation.lat, tempLocation.lng]}
          >
            <Popup>
              <div>
                <strong>Ubicación Seleccionada</strong><br />
                Lat: {tempLocation.lat.toFixed(6)}<br />
                Lng: {tempLocation.lng.toFixed(6)}<br />
                <em>Haz clic en otro lugar para cambiar</em>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute top-2 right-2 bg-white p-3 rounded-lg shadow-md z-[1000]">
        <div className="text-sm font-semibold mb-2">Información General</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 bg-yellow-400 rounded border-2 border-yellow-600"></div>
            <span>Lote Padre</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
            <span>En Cultivación</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Mantenimiento</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <p>🖱️ <strong>Clic:</strong> Seleccionar punto y abrir modal para crear sublote, 
            y procura que al editarlo quede  dentro del lote.</p>
          </div>
        </div>
      </div>

      {/* Información del lote */}
      <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-md">
        <div className="text-xs">
          <strong>{lote.nombre}</strong><br />
          Área total: {(lote as any).area || 'No definida'} m²<br />
          Sublotes: {sublotes.length}
        </div>
      </div>
    </div>
  );
}