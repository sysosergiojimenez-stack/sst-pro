// Migracion unica de la pestana Sheets "INCIDENTES" a la coleccion
// Firestore "incidentes". Idempotente: usa idRegistro como doc ID con
// { merge: true }, asi que se puede volver a correr sin duplicar nada.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateIncidentesToFirestore.ts
import 'dotenv/config';
import { getAllIncidentes } from '../src/server/lib/googleSheets_incidentes';
import { getDb } from '../src/server/lib/firebaseAdmin';

const FIELDS = [
  'fechaHoraRegistro', 'userEmail', 'proyecto', 'fechaIncidente', 'horaIncidente', 'lugar',
  'tipo', 'clasificacion', 'descripcion', 'personasInvolucradas', 'causasInmediatas',
  'causasRaiz', 'accionesCorrectivas', 'responsableAcciones', 'fechaCompromiso', 'estado',
  'evidencias', 'investigador', 'fechaCierre', 'diasPerdidos', 'costoEstimado',
  'causaOtraDetalle', 'nombreTrabajador', 'cedulaTrabajador', 'empresaTrabajador',
  'cargoTrabajador', 'lesionDano', 'notificadoIPS', 'fechaNotificacionIPS',
  'notificadoMTESS', 'fechaNotificacionMTESS',
] as const;

// idRegistro puede traer "/" (ej. "007/2026"), invalido como Firestore doc ID.
function sanitizeDocId(idRegistro: string): string {
  return idRegistro.replace(/\//g, '_');
}

async function main() {
  const incidentes = await getAllIncidentes();
  console.log(`Leidos ${incidentes.length} incidentes de Sheets.`);

  const db = getDb();
  let migrados = 0;
  for (const inc of incidentes) {
    if (!inc.idRegistro) {
      console.warn('Salteando incidente sin idRegistro:', inc.descripcion?.slice(0, 40));
      continue;
    }
    const data: Record<string, string> = { idRegistro: inc.idRegistro };
    for (const f of FIELDS) data[f] = (inc as any)[f] || '';
    await db.collection('incidentes').doc(sanitizeDocId(inc.idRegistro)).set(data, { merge: true });
    migrados++;
    console.log(`  -> ${inc.idRegistro} (${inc.tipo || 'sin tipo'})`);
  }
  console.log(`Listo. ${migrados}/${incidentes.length} incidentes migrados a Firestore.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
