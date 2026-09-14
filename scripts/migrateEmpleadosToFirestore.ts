// Migracion unica de las pestanas Sheets "NOMINA DE PERSONAL", "OBRAS",
// "EMPRESAS" y "CARGOS" a sus colecciones Firestore equivalentes
// (empleados, obras, empresas, cargos).
//
// empleados usa IDs autogenerados por Firestore (nroDocumento no es
// confiablemente unico: pueden existir registros inactivos duplicados de
// un mismo documento con otra empresa). obras/empresas/cargos usan el
// nombre como doc ID, idempotente con { merge: true }.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateEmpleadosToFirestore.ts
import 'dotenv/config';
import { getEmpleados, getObras, getEmpresas, getCargos } from '../src/server/lib/googleSheets';
import { getDb } from '../src/server/lib/firebaseAdmin';

const FIELDS = [
  'nroDocumento', 'fechaHora', 'userEmail', 'obra', 'tipoDocumento', 'nombres', 'apellidos',
  'ciudadNacimiento', 'fechaNacimiento', 'sexo', 'estadoCivil', 'nombrePadre', 'ocupacionPadre',
  'nombreMadre', 'ocupacionMadre', 'nombreConyuge', 'ocupacionConyuge', 'fechaNacConyuge',
  'direccion', 'nro', 'dpto', 'piso', 'barrio', 'ciudad', 'departamentoTerritorial',
  'puntoReferencia', 'telefonoCelular', 'telefonoEmergencia', 'email', 'gradoInstruccion',
  'instruccionConcluida', 'carreraUniversitaria', 'tipoSangre', 'hijo1', 'fechaNacHijo1',
  'hijo2', 'fechaNacHijo2', 'hijo3', 'fechaNacHijo3', 'hijo4', 'fechaNacHijo4', 'hijo5',
  'fechaNacHijo5', 'empresa', 'cargo', 'unidad', 'honorarios', 'moneda', 'regimen',
  'actividades', 'fechaInicioContrato', 'fechaTerminoContrato', 'calce', 'scanDocumentos',
  'ultimaDeclaracionIPS', 'ipsDocumentoUrl', 'estado',
] as const;

const BATCH_SIZE = 400;

async function main() {
  const db = getDb();

  // --- NOMINA DE PERSONAL -> empleados (IDs autogenerados) ---
  const empleados = await getEmpleados();
  console.log(`Leidos ${empleados.length} empleados de Sheets.`);
  let batch = db.batch();
  let enBatch = 0;
  let migrados = 0;
  for (const emp of empleados) {
    if (!emp.nombres && !emp.nroDocumento) continue;
    const data: Record<string, string> = {};
    for (const f of FIELDS) data[f] = (emp as any)[f] || '';
    const ref = db.collection('empleados').doc();
    batch.set(ref, data);
    enBatch++;
    migrados++;
    if (enBatch >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      enBatch = 0;
    }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${empleados.length} empleados migrados a Firestore.`);

  // --- OBRAS / EMPRESAS / CARGOS -> obras / empresas / cargos (doc ID = nombre) ---
  const obras = await getObras();
  for (const o of obras) {
    await db.collection('obras').doc(o.nombre).set({ nombre: o.nombre, ubicacion: o.ubicacion || '', estado: o.estado || 'Activa' }, { merge: true });
  }
  console.log(`Migradas ${obras.length} obras.`);

  const empresas = await getEmpresas();
  for (const e of empresas) {
    await db.collection('empresas').doc(e.nombre).set({ nombre: e.nombre, nit: e.nit || '', contacto: e.contacto || '' }, { merge: true });
  }
  console.log(`Migradas ${empresas.length} empresas.`);

  const cargos = await getCargos();
  for (const c of cargos) {
    await db.collection('cargos').doc(c.nombre).set({ nombre: c.nombre, nivel: c.nivel || '', descripcion: c.descripcion || '' }, { merge: true });
  }
  console.log(`Migrados ${cargos.length} cargos.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
