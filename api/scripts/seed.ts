// Carga datos de ejemplo llamando a la propia api por HTTP, en lugar de escribir en
// MongoDB directamente: así el seed pasa por las mismas validaciones que un usuario
// y no duplica la definición de los esquemas.
// Node 24 ejecuta este archivo TypeScript sin compilarlo previamente.

const API_URL = process.env.API_URL ?? 'http://api:3000/api';

/** Carga las unidades, rutas y duties de ejemplo; es idempotente y se puede repetir sin duplicar. */
async function seed(): Promise<void> {
  console.log(`[seed] apuntando a ${API_URL}`);

  // Fase 0: todavia no existen entidades que cargar. Las rutas y unidades llegan en la Fase 1
  // y los duties en la Fase 2; este servicio ya queda cableado en el compose para entonces.
  console.log('[seed] no hay entidades definidas todavia, no se carga nada.');
}

await seed();
