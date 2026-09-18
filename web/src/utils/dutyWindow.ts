// Validación de la ventana de un duty tal como se escribe en el formulario (valores de
// `<input type="datetime-local">`). No importa nada a propósito: así se prueba con `node --test` sin
// herramientas adicionales.

// Límites de sentido común para una agenda de flota. Existen porque un campo de fecha a medio escribir
// deja años como 0026 (se tecleó "26"), y sin este límite el aviso sería "el fin debe ser posterior
// al inicio", que es cierto pero no dice dónde está el error.
export const MIN_SUPPORTED_YEAR = 2000;
export const MAX_SUPPORTED_YEAR = 2100;

/** Mensajes de error de la ventana, por campo. */
export interface DutyWindowMessages {
  startAt?: string[];
  endAt?: string[];
}

const LOCAL_INPUT_PATTERN = /^(\d{4,6})-\d{2}-\d{2}T\d{2}:\d{2}/;
const MS_PER_MINUTE = 60_000;

const windowDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Devuelve el año tal como está escrito en el campo, o null si el valor no tiene forma de fecha. */
function readTypedYear(localInputValue: string): number | null {
  const match = LOCAL_INPUT_PATTERN.exec(localInputValue);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

/** Indica si el año escrito está dentro de los límites razonables. */
function isSupportedYear(year: number): boolean {
  return year >= MIN_SUPPORTED_YEAR && year <= MAX_SUPPORTED_YEAR;
}

/** Escribe una fecha del formulario de forma legible, con el año completo, por ejemplo `18 sep 2026, 02:53`. */
function formatTypedDate(localInputValue: string): string {
  return windowDateFormatter.format(new Date(localInputValue));
}

/** Revisa una fecha del campo: que exista y que su año sea razonable; devuelve el mensaje o null. */
function validateTypedDate(localInputValue: string, fieldLabel: string): string | null {
  const typedYear = readTypedYear(localInputValue);
  const isParsable = !Number.isNaN(new Date(localInputValue).getTime());
  if (typedYear === null || !isParsable) {
    return `Indica la fecha y hora de ${fieldLabel}.`;
  }

  if (!isSupportedYear(typedYear)) {
    const shownYear = String(typedYear).padStart(4, '0');
    return (
      `El año ${shownYear} no parece correcto: revisa la fecha de ${fieldLabel} ` +
      `(debe estar entre ${MIN_SUPPORTED_YEAR} y ${MAX_SUPPORTED_YEAR}).`
    );
  }
  return null;
}

/** Devuelve el comienzo del minuto de `now`: los campos de fecha no tienen segundos. */
function readStartOfMinute(now: Date): Date {
  return new Date(Math.floor(now.getTime() / MS_PER_MINUTE) * MS_PER_MINUTE);
}

/** Devuelve `now` en el formato de un `<input type="datetime-local">`, sirve para su atributo `min`. */
export function formatMinuteForInput(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${datePart}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Revisa que el inicio no sea anterior al minuto actual; devuelve el mensaje o null. */
function validateStartNotInPast(startLocal: string, now: Date): string | null {
  // Se compara con el comienzo del minuto: si alguien elige "ahora" (10:15) a las 10:15:40, vale.
  const isInPast = new Date(startLocal) < readStartOfMinute(now);
  if (!isInPast) {
    return null;
  }
  return `El inicio no puede estar en el pasado (ahora es ${windowDateFormatter.format(now)}).`;
}

/** Valida inicio y fin de un duty: fechas completas, años razonables, inicio no pasado y fin posterior. */
export function validateDutyWindow(
  startLocal: string,
  endLocal: string,
  now: Date = new Date(),
): DutyWindowMessages {
  const messages: DutyWindowMessages = {};

  const startProblem =
    validateTypedDate(startLocal, 'inicio') ?? validateStartNotInPast(startLocal, now);
  if (startProblem) {
    messages.startAt = [startProblem];
  }
  const endProblem = validateTypedDate(endLocal, 'fin');
  if (endProblem) {
    messages.endAt = [endProblem];
  }

  const areBothDatesValid = !startProblem && !endProblem;
  if (!areBothDatesValid) {
    return messages;
  }

  const endsAfterStart = new Date(endLocal) > new Date(startLocal);
  if (!endsAfterStart) {
    // Con las dos fechas completas a la vista se entiende el error sin buscarlo campo por campo.
    messages.endAt = [
      `El fin (${formatTypedDate(endLocal)}) debe ser posterior al inicio ` +
        `(${formatTypedDate(startLocal)}).`,
    ];
  }
  return messages;
}

/** Indica si la ventana es válida del todo, sin mensajes de error. */
export function isValidDutyWindow(
  startLocal: string,
  endLocal: string,
  now: Date = new Date(),
): boolean {
  return Object.keys(validateDutyWindow(startLocal, endLocal, now)).length === 0;
}
