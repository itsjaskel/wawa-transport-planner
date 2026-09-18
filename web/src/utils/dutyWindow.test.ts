// Pruebas de la validación de la ventana de un duty. Se ejecutan con el ejecutor de pruebas de Node
// (`npm test` en la web), sin dependencias: por eso se importa el módulo con su extensión `.ts`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatMinuteForInput, isValidDutyWindow, validateDutyWindow } from './dutyWindow.ts';

// "Ahora" fijo para que las pruebas no dependan del reloj: 18 sep 2026, 02:15:40 (hora local).
const NOW = new Date(2026, 8, 18, 2, 15, 40);

describe('validateDutyWindow', () => {
  it('acepta una ventana cuyo fin es posterior al inicio', () => {
    assert.deepEqual(validateDutyWindow('2026-09-18T03:00', '2026-09-18T03:53', NOW), {});
    assert.equal(isValidDutyWindow('2026-09-18T03:00', '2026-09-18T03:53', NOW), true);
  });

  it('señala el año 0026 (un "26" a medio escribir) en lugar de decir que el fin es anterior', () => {
    // Es el caso real que motivó esta prueba: el campo mostraba 18/09/0026 y el aviso decía
    // "el fin debe ser posterior al inicio", que era cierto pero no ayudaba a encontrar el error.
    const messages = validateDutyWindow('2026-09-18T03:00', '0026-09-18T03:53', NOW);

    assert.equal(messages.startAt, undefined);
    assert.deepEqual(messages.endAt, [
      'El año 0026 no parece correcto: revisa la fecha de fin (debe estar entre 2000 y 2100).',
    ]);
  });

  it('señala también un año fuera de rango en el inicio', () => {
    const messages = validateDutyWindow('0202-09-18T02:00', '2026-09-18T03:00', NOW);
    assert.match(messages.startAt?.[0] ?? '', /El año 0202 no parece correcto/);
  });

  it('cuando el fin es anterior, el aviso muestra las dos fechas completas', () => {
    const messages = validateDutyWindow('2026-09-18T10:00', '2026-09-18T09:00', NOW);
    assert.deepEqual(messages.endAt, [
      'El fin (18 sep 2026, 09:00) debe ser posterior al inicio (18 sep 2026, 10:00).',
    ]);
  });

  it('rechaza un fin igual al inicio: la ventana no puede estar vacía', () => {
    assert.equal(isValidDutyWindow('2026-09-18T10:00', '2026-09-18T10:00', NOW), false);
  });

  it('pide las fechas que faltan', () => {
    assert.deepEqual(validateDutyWindow('', '', NOW), {
      startAt: ['Indica la fecha y hora de inicio.'],
      endAt: ['Indica la fecha y hora de fin.'],
    });
  });

  it('acepta una ventana que cruza la medianoche', () => {
    assert.equal(isValidDutyWindow('2026-09-18T23:00', '2026-09-19T01:00', NOW), true);
  });

  it('rechaza un inicio en el pasado e indica la hora actual', () => {
    const messages = validateDutyWindow('2026-09-18T02:14', '2026-09-18T03:00', NOW);
    assert.deepEqual(messages.startAt, [
      'El inicio no puede estar en el pasado (ahora es 18 sep 2026, 02:15).',
    ]);
  });

  it('acepta un inicio en el minuto actual, aunque ya hayan pasado segundos', () => {
    assert.equal(isValidDutyWindow('2026-09-18T02:15', '2026-09-18T03:00', NOW), true);
  });

  it('da el valor del minuto actual en el formato del campo, para su atributo min', () => {
    assert.equal(formatMinuteForInput(NOW), '2026-09-18T02:15');
  });
});
