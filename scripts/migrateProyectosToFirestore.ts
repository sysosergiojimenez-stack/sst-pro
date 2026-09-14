// Migracion unica de la pestana Sheets "PROYECTO" a la coleccion Firestore
// "proyectos". Idempotente: usa idRegistro como doc ID con { merge: true },
// asi que se puede volver a correr sin duplicar nada.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateProyectosToFirestore.ts
import 'dotenv/config';
import { getProyectos } from '../src/server/lib/googleSheets';
import { getDb } from '../src/server/lib/firebaseAdmin';

async function main() {
  const proyectos = await getProyectos();
  console.log(`Leidos ${proyectos.length} proyectos de Sheets.`);

  const db = getDb();
  let migrados = 0;
  for (const p of proyectos) {
    if (!p.idRegistro) {
      console.warn('Salteando proyecto sin idRegistro:', p.denominacion);
      continue;
    }
    await db.collection('proyectos').doc(p.idRegistro).set({
      fechaHora: p.fechaHora || '',
      userEmail: p.userEmail || '',
      denominacion: p.denominacion || '',
      ubicacion: p.ubicacion || '',
      logo: p.logo || '',
      fechaInicioObra: p.fechaInicioObra || '',
    }, { merge: true });
    migrados++;
    console.log(`  -> ${p.idRegistro} (${p.denominacion})`);
  }
  console.log(`Listo. ${migrados}/${proyectos.length} proyectos migrados a Firestore.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
