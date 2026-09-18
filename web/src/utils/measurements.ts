// Formato de distancias y tiempos de viaje para mostrarlos al usuario.

const DISPLAY_LOCALE = 'es-MX';
const METERS_PER_KILOMETER = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const kilometerFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, { maximumFractionDigits: 1 });

/** Escribe una distancia en kilómetros con un decimal, por ejemplo `5.1 km`. */
export function formatDistance(distanceMeters: number): string {
  return `${kilometerFormatter.format(distanceMeters / METERS_PER_KILOMETER)} km`;
}

/** Escribe un tiempo de viaje redondeado al minuto, por ejemplo `10 min` o `1 h 5 min`. */
export function formatTravelTime(durationSeconds: number): string {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / SECONDS_PER_MINUTE));
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}
