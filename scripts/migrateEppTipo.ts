// Migracion unica: agrega el campo "tipo" ('EPP' | 'Herramienta') a los
// Productos y a las Notas de Salida existentes, para separar la Planilla
// de Entrega de EPP (equipos de proteccion personal, por trabajador) de
// la Nota de Salida (herramientas, materiales y equipos, por quien retira).
//
// El tipo de cada producto se infiere de su clasificacion actual: si
// coincide con una clasificacion tipicamente EPP, queda 'EPP'; cualquier
// otra cosa queda 'Herramienta'. El tipo de cada nota de salida se infiere
// de la mayoria de los productos de sus items (si una nota mezcla EPP y
// herramientas, se marca para revision manual y no se le asigna tipo).
//
// Es seguro re-correr: solo actualiza documentos que todavia no tienen
// "tipo" (o lo tienen vacio).
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateEppTipo.ts
import 'dotenv/config';
import { getDb } from '../src/server/lib/firebaseAdmin';

const CLASIFICACIONES_EPP = [
  'CASCO', 'GAFAS', 'GUANTES', 'BOTAS', 'ARNÉS', 'ARNES',
  'PROTECCION AUDITIVA', 'PROTECCION RESPIRATORIA', 'ROPA DE TRABAJO',
];

function inferirTipoProducto(clasificacion: string): 'EPP' | 'Herramienta' {
  const norm = (clasificacion || '').trim().toUpperCase();
  return CLASIFICACIONES_EPP.includes(norm) ? 'EPP' : 'Herramienta';
}

async function main() {
  const db = getDb();

  // --- Productos ---
  const productosSnap = await db.collection('epp_productos').get();
  const tipoPorCodigo = new Map<string, 'EPP' | 'Herramienta'>();
  let productosConteo = { EPP: 0, Herramienta: 0, yaTenian: 0 };

  let batch = db.batch();
  let enBatch = 0;
  for (const doc of productosSnap.docs) {
    const data = doc.data();
    const tipoActual = data.tipo;
    const tipoInferido = inferirTipoProducto(data.clasificacion);
    if (data.codigo) tipoPorCodigo.set(data.codigo, tipoActual === 'EPP' || tipoActual === 'Herramienta' ? tipoActual : tipoInferido);

    if (tipoActual === 'EPP' || tipoActual === 'Herramienta') {
      productosConteo.yaTenian++;
      continue;
    }
    batch.update(doc.ref, { tipo: tipoInferido });
    productosConteo[tipoInferido]++;
    enBatch++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();

  console.log(`Productos: ${productosSnap.size} total.`);
  console.log(`  -> Ya tenian tipo: ${productosConteo.yaTenian}`);
  console.log(`  -> Migrados a EPP: ${productosConteo.EPP}`);
  console.log(`  -> Migrados a Herramienta: ${productosConteo.Herramienta}`);

  // --- Notas de Salida (infiere tipo desde sus items) ---
  const notasSnap = await db.collection('epp_notas_salida').get();
  const salidasSnap = await db.collection('epp_salidas').get();
  const itemsPorNota = new Map<string, string[]>(); // idRegistro nota -> lista de codigos de producto
  for (const doc of salidasSnap.docs) {
    const data = doc.data();
    if (!data.refNotaSalida) continue;
    if (!itemsPorNota.has(data.refNotaSalida)) itemsPorNota.set(data.refNotaSalida, []);
    itemsPorNota.get(data.refNotaSalida)!.push(data.refItem);
  }

  let notasConteo = { EPP: 0, Herramienta: 0, yaTenian: 0, sinItems: 0, mixtas: 0 };
  const notasMixtas: string[] = [];

  batch = db.batch();
  enBatch = 0;
  for (const doc of notasSnap.docs) {
    const data = doc.data();
    if (data.tipo === 'EPP' || data.tipo === 'Herramienta') {
      notasConteo.yaTenian++;
      continue;
    }
    const codigos = itemsPorNota.get(data.idRegistro) || [];
    if (codigos.length === 0) {
      notasConteo.sinItems++;
      continue; // sin items no hay forma de inferir; se deja sin tipo para revision manual
    }
    const tipos = new Set(codigos.map(c => tipoPorCodigo.get(c) || 'Herramienta'));
    if (tipos.size > 1) {
      notasConteo.mixtas++;
      notasMixtas.push(data.idRegistro);
      continue; // mezcla EPP y herramientas, requiere revision manual
    }
    const tipoNota = [...tipos][0];
    batch.update(doc.ref, { tipo: tipoNota });
    notasConteo[tipoNota]++;
    enBatch++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();

  console.log(`\nNotas de Salida: ${notasSnap.size} total.`);
  console.log(`  -> Ya tenian tipo: ${notasConteo.yaTenian}`);
  console.log(`  -> Migradas a EPP: ${notasConteo.EPP}`);
  console.log(`  -> Migradas a Herramienta: ${notasConteo.Herramienta}`);
  console.log(`  -> Sin items (sin tipo, revisar manualmente): ${notasConteo.sinItems}`);
  console.log(`  -> Mixtas EPP+Herramienta (sin tipo, revisar manualmente): ${notasConteo.mixtas}`);
  if (notasMixtas.length > 0) {
    console.log(`     IDs de notas mixtas: ${notasMixtas.join(', ')}`);
  }
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
