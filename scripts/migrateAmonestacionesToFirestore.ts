// Migracion unica de la pestana Sheets AMONESTACIONES a la coleccion
// Firestore "amonestaciones". idRegistro como doc ID (auto-generado con
// Date.now() en el cliente, nunca tipeado a mano), idempotente con
// { merge: true }.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateAmonestacionesToFirestore.ts
import 'dotenv/config';
import { getAllAmonestaciones } from '../src/server/lib/googleSheets_amonestaciones';
import { getDb } from '../src/server/lib/firebaseAdmin';

const FIELDS = [
  'fechaHoraRegistro', 'userEmail', 'proyecto', 'nombreApellido', 'cedula', 'empresa',
  'cargo', 'fechaFalta', 'fechaNotificacion', 'descripcionFalta', 'disposicionReglamento',
  'clasificacion', 'antecedentes', 'sancion', 'diasSuspension', 'estado',
  'empleadoDocumento', 'fotos',
] as const;

async function main() {
  const amonestaciones = await getAllAmonestaciones();
  console.log(`Leidas ${amonestaciones.length} amonestaciones de Sheets.`);

  const db = getDb();
  let migrados = 0;
  for (const a of amonestaciones) {
    if (!a.nombreApellido && !a.proyecto) continue; // fila totalmente vacia
    const ref = a.idRegistro ? db.collection('amonestaciones').doc(a.idRegistro) : db.collection('amonestaciones').doc();
    const data: Record<string, string> = { idRegistro: a.idRegistro || ref.id };
    for (const f of FIELDS) data[f] = (a as any)[f] || '';
    await ref.set(data, { merge: true });
    migrados++;
    console.log(`  -> ${data.idRegistro} (${a.nombreApellido || 'sin nombre'})`);
  }
  console.log(`Listo. ${migrados}/${amonestaciones.length} amonestaciones migradas.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
