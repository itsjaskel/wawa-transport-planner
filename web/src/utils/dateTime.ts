// Conversión y formato de fechas. La api guarda y devuelve UTC; la interfaz muestra y captura en la
// hora local del navegador, siempre indicando su desfase UTC para que no haya ambigüedad.

const DISPLAY_LOCALE = 'es-MX';
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;
// Signo menos tipográfico (U+2212): se lee mejor que el guion en "UTC−06:00".
const MINUS_SIGN = '−';

const dateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Rellena con ceros a la izquierda hasta dos dígitos. */
function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** Devuelve el desfase local de esa fecha en minutos respecto a UTC (positivo al este). */
function readLocalOffsetMinutes(date: Date): number {
  // `getTimezoneOffset` devuelve el desfase con el signo al revés (UTC − local).
  return -date.getTimezoneOffset();
}

/** Escribe un desfase en minutos como `+hh:mm` o `-hh:mm`, con el signo indicado para el negativo. */
function formatOffset(offsetMinutes: number, negativeSign: string): string {
  const sign = offsetMinutes < 0 ? negativeSign : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / MINUTES_PER_HOUR);
  const minutes = absoluteMinutes % MINUTES_PER_HOUR;
  return `${sign}${padTwoDigits(hours)}:${padTwoDigits(minutes)}`;
}

/** Devuelve el desfase UTC local de esa fecha en formato legible, por ejemplo `UTC−06:00`. */
export function formatUtcOffset(date: Date): string {
  return `UTC${formatOffset(readLocalOffsetMinutes(date), MINUS_SIGN)}`;
}

/** Convierte el valor de un `<input type="datetime-local">` a ISO 8601 con el desfase local explícito. */
export function convertLocalInputToIso(localInputValue: string): string {
  // `new Date('2030-03-15T08:00')` interpreta el texto como hora local, que es lo que se capturó.
  const localDate = new Date(localInputValue);
  const offset = formatOffset(readLocalOffsetMinutes(localDate), '-');
  return `${localInputValue}:00${offset}`;
}

/** Indica si el valor de un `<input type="datetime-local">` es una fecha válida. */
export function isValidLocalInput(localInputValue: string): boolean {
  return localInputValue !== '' && !Number.isNaN(new Date(localInputValue).getTime());
}

/** Formatea la fecha y hora local de un instante ISO, por ejemplo `18 mar 2031, 06:00`. */
export function formatLocalDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

/** Formatea solo la hora local de un instante ISO, por ejemplo `06:00`. */
export function formatLocalTime(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate));
}

/** Indica si dos instantes caen en el mismo día local. */
function isSameLocalDay(firstDate: Date, secondDate: Date): boolean {
  return dateFormatter.format(firstDate) === dateFormatter.format(secondDate);
}

/** Formatea una ventana en hora local con su desfase: `18 mar 2031, 06:00 – 08:00 (UTC−06:00)`. */
export function formatLocalWindow(startIso: string, endIso: string): string {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const startOffset = formatUtcOffset(startDate);
  const endOffset = formatUtcOffset(endDate);

  let endText = formatLocalDateTime(endIso);
  if (isSameLocalDay(startDate, endDate)) {
    endText = formatLocalTime(endIso);
  }

  // Si la ventana cruza un cambio de horario de verano, cada extremo lleva su propio desfase.
  const hasSingleOffset = startOffset === endOffset;
  if (hasSingleOffset) {
    return `${formatLocalDateTime(startIso)} – ${endText} (${startOffset})`;
  }
  return `${formatLocalDateTime(startIso)} (${startOffset}) – ${endText} (${endOffset})`;
}

/** Calcula la duración entre dos instantes y la escribe como `4 h 30 min`, `2 h` o `45 min`. */
export function formatDuration(startIso: string, endIso: string): string {
  const totalMinutes = Math.round((Date.parse(endIso) - Date.parse(startIso)) / MS_PER_MINUTE);
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
