// Migracion unica de las pestanas Sheets IndicadoresMensual e
// IndicadoresMetas a sus colecciones Firestore equivalentes.
// IndicadorMensual usa idRegistro como doc ID (auto-generado con Date.now()
// en el servidor). IndicadorMetaFila usa su "codigo" (IND-01 .. IND-08, fijo).
// Idempotente con { merge: true }.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateIndicadoresToFirestore.ts
import 'dotenv/config';
import { getAllIndicadoresMensual, getAllIndicadoresMetas } from '../src/server/lib/googleSheets_indicadores';
import { getDb } from '../src/server/lib/firebaseAdmin';

const NUMERIC_FIELDS = [
  'horasHombre', 'accidentesConBaja', 'diasPerdidos', 'capacitacionesPlanificadas',
  'capacitacionesRealizadas', 'inspeccionesPlanificadas', 'inspeccionesRealizadas',
  'hallazgosAbiertos', 'hallazgosCerradosEnPlazo', 'reportesCuasiAccidentes',
  'requisitosLegalesCumplidos', 'requisitosLegalesAplicables',
] as const;

async function main() {
  const db = getDb();

  // --- IndicadoresMensual -> indicadores_mensual (doc ID = idRegistro) ---
  const mensual = await getAllIndicadoresMensual();
  console.log(`Leidas ${mensual.length} cargas mensuales de Sheets.`);
  let batch = db.batch();
  let enBatch = 0;
  let migrados = 0;
  for (const m of mensual) {
    if (!m.proyecto && !m.mes) continue; // fila totalmente vacia
    const ref = m.idRegistro ? db.collection('indicadores_mensual').doc(m.idRegistro) : db.collection('indicadores_mensual').doc();
    const data: Record<string, any> = {
      idRegistro: m.idRegistro || ref.id, fechaHoraRegistro: m.fechaHoraRegistro,
      userEmail: m.userEmail, proyecto: m.proyecto, mes: m.mes, cipaActiva: m.cipaActiva || 'NO',
    };
    for (const f of NUMERIC_FIELDS) data[f] = m[f] || 0;
    batch.set(ref, data, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${mensual.length} cargas mensuales migradas.`);

  // --- IndicadoresMetas -> indicadores_metas (doc ID = codigo) ---
  const metas = await getAllIndicadoresMetas();
  console.log(`Leidas ${metas.length} metas de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const meta of metas) {
    if (!meta.codigo) continue;
    batch.set(db.collection('indicadores_metas').doc(meta.codigo), {
      codigo: meta.codigo, meta: meta.meta, actualizadoPor: meta.actualizadoPor, actualizadoEn: meta.actualizadoEn,
    }, { merge: true });
    enBatch++; migrados++;
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${metas.length} metas migradas.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
