// Migracion unica de la pestana Sheets MARCACIONES_BIOMETRICAS a la
// coleccion Firestore "marcaciones_biometricas". Doc ID = composicion
// nroDocumento__fecha__proyecto (misma clave que usaba el upsert de
// importarMarcacionesBiometricas), idempotente con { merge: true }.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateMarcacionesToFirestore.ts
import 'dotenv/config';
import { getAllMarcacionesBiometricas } from '../src/server/lib/googleSheets_epp';
import { getDb } from '../src/server/lib/firebaseAdmin';

function buildDocId(nroDocumento: string, fecha: string, proyecto: string): string {
  const safe = (s: string) => (s || '').replace(/\//g, '_');
  return `${safe(nroDocumento)}__${safe(fecha)}__${safe(proyecto)}`;
}

async function main() {
  const marcaciones = await getAllMarcacionesBiometricas();
  console.log(`Leidas ${marcaciones.length} marcaciones biometricas de Sheets.`);

  const db = getDb();
  let batch = db.batch();
  let enBatch = 0;
  let migrados = 0;
  for (const m of marcaciones) {
    if (!m.nroDocumento && !m.fecha) continue; // fila totalmente vacia
    const docId = buildDocId(m.nroDocumento, m.fecha, m.proyecto);
    batch.set(db.collection('marcaciones_biometricas').doc(docId), {
      nroDocumento: m.nroDocumento, fecha: m.fecha, horaEntrada: m.horaEntrada,
      horaSalida: m.horaSalida, horasRaw: m.horasRaw, fechaCarga: m.fechaCarga, proyecto: m.proyecto,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${marcaciones.length} marcaciones biometricas migradas.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
