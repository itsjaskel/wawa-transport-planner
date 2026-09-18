// Mapa de una ruta: puntos numerados según su orden, unidos por una línea. Sirve de solo lectura en
// el detalle y, si recibe `onAddPoint`, como editor en el que un clic añade un punto al final.
import { divIcon, latLngBounds, type LatLngTuple } from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { RoutePoint } from '../api/types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  FIT_BOUNDS_PADDING_PX,
  MARKER_SIZE_PX,
  SINGLE_POINT_ZOOM,
  TILE_LAYER_ATTRIBUTION,
  TILE_LAYER_URL,
} from '../config/map';

// El color va en `leaflet-overrides.css` (clase `route-line`): Leaflet lo escribiría como atributo SVG,
// donde una variable CSS no es fiable.
const ROUTE_LINE_OPTIONS = { className: 'route-line', weight: 4 };

interface RouteMapProps {
  points: RoutePoint[];
  /** Si se indica, la línea sigue este recorrido por calles en lugar de unir los puntos en recta. */
  roadPositions?: LatLngTuple[];
  /** Si se indica, el mapa es editable: cada clic añade un punto con esas coordenadas. */
  onAddPoint?: (lat: number, lng: number) => void;
}

/** Crea el marcador numerado de un punto; es HTML para que se vea el orden y no dependa de imágenes. */
function createNumberedMarkerIcon(pointNumber: number) {
  return divIcon({
    className: 'route-point-marker',
    html: String(pointNumber),
    iconSize: [MARKER_SIZE_PX, MARKER_SIZE_PX],
    iconAnchor: [MARKER_SIZE_PX / 2, MARKER_SIZE_PX / 2],
  });
}

/** Ajusta el encuadre a los puntos; en modo editable solo la primera vez, para no mover el mapa en cada clic. */
function MapViewFitter({
  positions,
  fitOnlyOnce,
}: {
  positions: LatLngTuple[];
  fitOnlyOnce: boolean;
}) {
  const map = useMap();
  // En el editor de una ruta nueva no se encuadra nunca: si no, el primer clic haría saltar el mapa
  // al zoom de un solo punto justo cuando el usuario está eligiendo dónde poner los siguientes.
  const hasFittedRef = useRef(fitOnlyOnce && positions.length === 0);

  // En react-leaflet, las props del contenedor (centro, zoom) solo se aplican en el primer render:
  // para reencuadrar después hay que hablar con la instancia del mapa.
  useEffect(() => {
    const shouldSkipFit = fitOnlyOnce && hasFittedRef.current;
    if (shouldSkipFit || positions.length === 0) {
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], SINGLE_POINT_ZOOM);
    } else {
      map.fitBounds(latLngBounds(positions), {
        padding: [FIT_BOUNDS_PADDING_PX, FIT_BOUNDS_PADDING_PX],
      });
    }
    hasFittedRef.current = true;
  }, [map, positions, fitOnlyOnce]);

  return null;
}

/** Avisa de cada clic en el mapa con sus coordenadas. */
function MapClickListener({ onAddPoint }: { onAddPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (clickEvent) => onAddPoint(clickEvent.latlng.lat, clickEvent.latlng.lng),
  });
  return null;
}

/** Dibuja los puntos de una ruta numerados y unidos por una línea, ajustando el encuadre a todos ellos. */
export function RouteMap({ points, roadPositions, onAddPoint }: RouteMapProps) {
  const isEditable = onAddPoint !== undefined;
  const positions = useMemo<LatLngTuple[]>(
    () => points.map((point) => [point.lat, point.lng]),
    [points],
  );

  let mapClassName = 'route-map';
  if (isEditable) {
    mapClassName = 'route-map route-map-editable';
  }

  return (
    <MapContainer className={mapClassName} center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM}>
      <TileLayer url={TILE_LAYER_URL} attribution={TILE_LAYER_ATTRIBUTION} />
      <Polyline positions={roadPositions ?? positions} pathOptions={ROUTE_LINE_OPTIONS} />
      {points.map((point, pointIndex) => {
        const pointNumber = pointIndex + 1;
        const markerTitle = point.name ? `${pointNumber}. ${point.name}` : `Punto ${pointNumber}`;
        return (
          <Marker
            key={`${pointIndex}-${point.lat}-${point.lng}`}
            position={[point.lat, point.lng]}
            icon={createNumberedMarkerIcon(pointNumber)}
            title={markerTitle}
          />
        );
      })}
      <MapViewFitter positions={positions} fitOnlyOnce={isEditable} />
      {isEditable && <MapClickListener onAddPoint={onAddPoint} />}
    </MapContainer>
  );
}
