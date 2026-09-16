// Migracion unica de la hoja Sheets "Usuarios" a la coleccion Firestore
// "usuarios". Doc ID = idRegistro (USR-<timestamp>), idempotente con
// { merge: true }. Copia el hash de contrasena tal cual esta almacenado,
// sin re-procesarlo.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateUsuariosToFirestore.ts
import 'dotenv/config';
import { getAllUsuarios } from '../src/server/lib/googleSheets_usuarios';
import { getDb } from '../src/server/lib/firebaseAdmin';

async function main() {
  const usuarios = await getAllUsuarios();
  console.log(`Leidos ${usuarios.length} usuarios de Sheets.`);

  const db = getDb();
  let migrados = 0;
  for (const u of usuarios) {
    if (!u.idRegistro) { console.warn('Usuario sin idRegistro, se omite:', u.correo); continue; }
    await db.collection('usuarios').doc(u.idRegistro).set({
      idRegistro: u.idRegistro,
      dateTime: u.dateTime,
      registradoPor: u.registradoPor,
      rol: u.rol,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo,
      contrasena: u.contrasena,
      proyectosAsignados: u.proyectosAsignados || [],
    }, { merge: true });
    migrados++;
  }
  console.log(`Listo. ${migrados}/${usuarios.length} usuarios migrados.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
