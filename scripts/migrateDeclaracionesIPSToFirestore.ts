// Migracion unica de la pestana Sheets DECLARACIONES_IPS a la coleccion
// Firestore "declaraciones_ips". idRegistro como doc ID (auto-generado con
// Date.now() en el servidor, nunca tipeado a mano), idempotente con
// { merge: true }.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateDeclaracionesIPSToFirestore.ts
import 'dotenv/config';
import { getAllDeclaracionesIPS } from '../src/server/lib/googleSheets_declaraciones_ips';
import { getDb } from '../src/server/lib/firebaseAdmin';

const FIELDS = ['fechaHoraRegistro', 'userEmail', 'proyecto', 'periodo', 'urlPDF', 'listaCICs', 'totalEmpleados'] as const;

async function main() {
  const declaraciones = await getAllDeclaracionesIPS();
  console.log(`Leidas ${declaraciones.length} declaraciones IPS de Sheets.`);

  const db = getDb();
  let migrados = 0;
  for (const d of declaraciones) {
    if (!d.periodo && !d.proyecto) continue; // fila totalmente vacia
    const ref = d.idRegistro ? db.collection('declaraciones_ips').doc(d.idRegistro) : db.collection('declaraciones_ips').doc();
    const data: Record<string, string> = { idRegistro: d.idRegistro || ref.id };
    for (const f of FIELDS) data[f] = (d as any)[f] || '';
    await ref.set(data, { merge: true });
    migrados++;
    console.log(`  -> ${data.idRegistro} (${d.periodo || 'sin periodo'}, ${d.proyecto})`);
  }
  console.log(`Listo. ${migrados}/${declaraciones.length} declaraciones IPS migradas.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
