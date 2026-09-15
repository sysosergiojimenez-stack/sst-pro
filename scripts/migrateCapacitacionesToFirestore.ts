// Migracion unica de las pestanas Sheets CAPACITACIONES y
// ASISTENCIAS_CAPACITACION a sus colecciones Firestore equivalentes.
// Ambas usan idRegistro como doc ID (auto-generado con Date.now() en el
// servidor, nunca tipeado a mano), idempotente con { merge: true }.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateCapacitacionesToFirestore.ts
import 'dotenv/config';
import { getAllCapacitaciones, getAllAsistencias } from '../src/server/lib/googleSheets_capacitaciones';
import { getDb } from '../src/server/lib/firebaseAdmin';

async function main() {
  const db = getDb();

  // --- CAPACITACIONES -> capacitaciones (doc ID = idRegistro) ---
  const capacitaciones = await getAllCapacitaciones();
  console.log(`Leidas ${capacitaciones.length} capacitaciones de Sheets.`);
  let batch = db.batch();
  let enBatch = 0;
  let migrados = 0;
  for (const cap of capacitaciones) {
    if (!cap.titulo && !cap.proyecto) continue; // fila totalmente vacia
    const ref = cap.idRegistro ? db.collection('capacitaciones').doc(cap.idRegistro) : db.collection('capacitaciones').doc();
    batch.set(ref, {
      idRegistro: cap.idRegistro || ref.id, fechaHora: cap.fechaHora, userEmail: cap.userEmail,
      proyecto: cap.proyecto, titulo: cap.titulo, fechaProgramada: cap.fechaProgramada,
      hora: cap.hora, lugar: cap.lugar, responsable: cap.responsable, tipo: cap.tipo,
      estado: cap.estado, fechaRealizada: cap.fechaRealizada, asistentes: cap.asistentes,
      observaciones: cap.observaciones, evidenciaPDF: cap.evidenciaPDF,
      temasTratados: cap.temasTratados, imagenesAsistencia: cap.imagenesAsistencia,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${capacitaciones.length} capacitaciones migradas.`);

  // --- ASISTENCIAS_CAPACITACION -> asistencias_capacitacion (doc ID = idRegistro) ---
  const asistencias = await getAllAsistencias();
  console.log(`Leidas ${asistencias.length} asistencias de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const a of asistencias) {
    if (!a.nroDocumento && !a.idCapacitacion) continue; // fila totalmente vacia
    const ref = a.idRegistro ? db.collection('asistencias_capacitacion').doc(a.idRegistro) : db.collection('asistencias_capacitacion').doc();
    batch.set(ref, {
      idRegistro: a.idRegistro || ref.id, idCapacitacion: a.idCapacitacion, proyecto: a.proyecto,
      fecha: a.fecha, nroDocumento: a.nroDocumento, nombres: a.nombres, apellidos: a.apellidos,
      empresa: a.empresa, cargo: a.cargo, encontradoEnNomina: a.encontradoEnNomina, fechaHora: a.fechaHora,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${asistencias.length} asistencias migradas.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
