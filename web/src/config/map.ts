// Configuración del mapa en un solo sitio: centro por defecto, zooms y capa de teselas.
import type { LatLngTuple } from 'leaflet';

// Centro por defecto cuando una ruta aún no tiene puntos: Ciudad de México, donde están los
// datos de ejemplo. Siempre en orden latitud, longitud.
export const DEFAULT_MAP_CENTER: LatLngTuple = [19.4326, -99.1332];
export const DEFAULT_MAP_ZOOM = 12;
// Zoom al centrar una ruta de un solo punto, que no tiene extensión que encuadrar.
export const SINGLE_POINT_ZOOM = 15;
// Margen en píxeles alrededor de los puntos al encuadrarlos, para que no queden pegados al borde.
export const FIT_BOUNDS_PADDING_PX = 32;

// OpenStreetMap no pide clave ni cuenta: el proyecto levanta sin configurar nada.
export const TILE_LAYER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Decimales al capturar un punto con un clic: 6 decimales son unos 10 cm, más que suficiente.
export const CLICKED_COORDINATE_DECIMALS = 6;

// Debe coincidir con `--tamaño-marcador` en base.css: Leaflet necesita el tamaño en píxeles para
// anclar el marcador por su centro, y no puede leer variables CSS.
export const MARKER_SIZE_PX = 28;
