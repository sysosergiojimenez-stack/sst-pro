// Migracion unica de las pestanas Sheets BITACORA y BITACORA_TAREAS a sus
// colecciones Firestore equivalentes. idRegistro como doc ID (auto-generado
// con Date.now() en el servidor, nunca tipeado a mano), idempotente con
// { merge: true }.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateBitacoraToFirestore.ts
import 'dotenv/config';
import { getAllBitacora } from '../src/server/lib/googleSheets_bitacora';
import { getAllTareas } from '../src/server/lib/googleSheets_bitacora_tareas';
import { getDb } from '../src/server/lib/firebaseAdmin';

async function main() {
  const db = getDb();

  // --- BITACORA -> bitacora (doc ID = idRegistro) ---
  const entradas = await getAllBitacora();
  console.log(`Leidas ${entradas.length} entradas de bitacora de Sheets.`);
  let batch = db.batch();
  let enBatch = 0;
  let migrados = 0;
  for (const b of entradas) {
    if (!b.descripcionTrabajo && !b.proyecto) continue; // fila totalmente vacia
    const ref = b.idRegistro ? db.collection('bitacora').doc(b.idRegistro) : db.collection('bitacora').doc();
    batch.set(ref, {
      idRegistro: b.idRegistro || ref.id, fechaHora: b.fechaHora, userEmail: b.userEmail,
      proyecto: b.proyecto, fecha: b.fecha, descripcionTrabajo: b.descripcionTrabajo,
      ubicacionArea: b.ubicacionArea, realizadoPor: b.realizadoPor, fotos: b.fotos,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${entradas.length} entradas de bitacora migradas.`);

  // --- BITACORA_TAREAS -> bitacora_tareas (doc ID = idRegistro) ---
  const tareas = await getAllTareas();
  console.log(`Leidas ${tareas.length} tareas de bitacora de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const t of tareas) {
    if (!t.descripcion && !t.proyecto) continue; // fila totalmente vacia
    const ref = t.idRegistro ? db.collection('bitacora_tareas').doc(t.idRegistro) : db.collection('bitacora_tareas').doc();
    batch.set(ref, {
      idRegistro: t.idRegistro || ref.id, fechaHora: t.fechaHora, userEmail: t.userEmail,
      proyecto: t.proyecto, idBitacora: t.idBitacora, descripcion: t.descripcion,
      estado: t.estado || 'pendiente', fotosAntes: t.fotosAntes, fotosDespues: t.fotosDespues,
      fechaCompletado: t.fechaCompletado, completadosPor: t.completadosPor,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${tareas.length} tareas de bitacora migradas.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
