// Comprueba que los errores de validación conservan la ruta de los campos anidados
// y que los mensajes que genera class-validator en inglés salen en español.
import type { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './validation-errors.js';

describe('flattenValidationErrors', () => {
  it('construye la ruta completa de un campo anidado dentro de una lista', () => {
    const validationErrors: ValidationError[] = [
      {
        property: 'points',
        children: [
          {
            property: '3',
            children: [{ property: 'lat', constraints: { max: 'La latitud debe estar entre -90 y 90.' } }],
          },
        ],
      },
    ];

    expect(flattenValidationErrors(validationErrors)).toEqual([
      { field: 'points.3.lat', messages: ['La latitud debe estar entre -90 y 90.'] },
    ]);
  });

  it('traduce al español el mensaje de una propiedad no permitida', () => {
    const validationErrors: ValidationError[] = [
      {
        property: 'scheduleVersion',
        constraints: { whitelistValidation: 'property scheduleVersion should not exist' },
      },
    ];

    expect(flattenValidationErrors(validationErrors)).toEqual([
      { field: 'scheduleVersion', messages: ['Este campo no está permitido.'] },
    ]);
  });
});
