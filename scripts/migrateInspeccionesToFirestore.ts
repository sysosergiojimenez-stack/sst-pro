// Migracion unica de las pestanas Sheets de Inspecciones (INSPECCIONES,
// INSPECCIONES_ITEMS, CHECKLIST_ITEMS_TEMPLATE, CHECKLIST_TEMPLATES) a sus
// colecciones Firestore equivalentes.
//
// Inspeccion e InspeccionItem usan idRegistro como doc ID (auto-generado
// con Date.now() / "${idInspeccion}-ITEM-${idx}" en el servidor, nunca
// tipeado a mano). ChecklistTemplateItem/Group usan su campo "id" (tambien
// auto-generado con Date.now()). Idempotente con { merge: true }; las
// filas sin ID (completamente vacias) se saltean.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateInspeccionesToFirestore.ts
import 'dotenv/config';
import {
  getAllInspecciones, getAllInspeccionItems, getChecklistTemplate, getChecklistTemplateGroups,
} from '../src/server/lib/googleSheets_inspecciones';
import { getDb } from '../src/server/lib/firebaseAdmin';

async function main() {
  const db = getDb();

  // --- INSPECCIONES -> inspecciones (doc ID = idRegistro) ---
  const inspecciones = await getAllInspecciones();
  console.log(`Leidas ${inspecciones.length} inspecciones de Sheets.`);
  let batch = db.batch();
  let enBatch = 0;
  let migrados = 0;
  for (const i of inspecciones) {
    if (!i.estado && !i.areaEquipo && !i.idTemplateChecklist) continue; // fila totalmente vacia
    const ref = i.idRegistro ? db.collection('inspecciones').doc(i.idRegistro) : db.collection('inspecciones').doc();
    batch.set(ref, {
      idRegistro: i.idRegistro || ref.id, fechaHora: i.fechaHora, userEmail: i.userEmail,
      proyecto: i.proyecto, fechaProgramada: i.fechaProgramada, inspector: i.inspector,
      estado: i.estado, fechaRealizada: i.fechaRealizada, observacionesGenerales: i.observacionesGenerales,
      idTemplateChecklist: i.idTemplateChecklist, areaEquipo: i.areaEquipo,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${inspecciones.length} inspecciones migradas.`);

  // --- INSPECCIONES_ITEMS -> inspeccion_items (doc ID = idRegistro) ---
  const items = await getAllInspeccionItems();
  console.log(`Leidos ${items.length} items de inspeccion de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const it of items) {
    if (!it.idRegistro) continue;
    batch.set(db.collection('inspeccion_items').doc(it.idRegistro), {
      idRegistro: it.idRegistro, idInspeccion: it.idInspeccion, item: it.item,
      resultado: it.resultado, observacion: it.observacion, fotos: it.fotos,
      accionCorrectiva: it.accionCorrectiva, responsableAccion: it.responsableAccion,
      fechaLimite: it.fechaLimite, estadoAccion: it.estadoAccion,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${items.length} items de inspeccion migrados.`);

  // --- CHECKLIST_ITEMS_TEMPLATE -> checklist_template_items (doc ID = id) ---
  const templateItems = await getChecklistTemplate();
  console.log(`Leidos ${templateItems.length} items de checklist template de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const t of templateItems) {
    if (!t.id) continue;
    batch.set(db.collection('checklist_template_items').doc(t.id), {
      id: t.id, idTemplate: t.idTemplate, texto: t.texto, orden: t.orden, activo: t.activo,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${templateItems.length} items de checklist template migrados.`);

  // --- CHECKLIST_TEMPLATES -> checklist_template_groups (doc ID = id) ---
  const templateGroups = await getChecklistTemplateGroups();
  console.log(`Leidos ${templateGroups.length} grupos de checklist de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const g of templateGroups) {
    if (!g.id) continue;
    batch.set(db.collection('checklist_template_groups').doc(g.id), {
      id: g.id, nombre: g.nombre, activo: g.activo,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${templateGroups.length} grupos de checklist migrados.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
