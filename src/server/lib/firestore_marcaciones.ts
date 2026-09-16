import { getDb } from './firebaseAdmin';

const COLLECTION = 'marcaciones_biometricas';

export interface MarcacionBiometrica {
  docId: string;
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  nroDocumento: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  horasRaw: string;
  fechaCarga: string;
  proyecto: string;
}

const FIELDS = ['nroDocumento', 'fecha', 'horaEntrada', 'horaSalida', 'horasRaw', 'fechaCarga', 'proyecto'] as const;

// Identidad natural = documento+fecha+proyecto (usada para upsert de
// importaciones). Se sanitiza para el path del documento (sin "/").
function buildDocId(nroDocumento: string, fecha: string, proyecto: string): string {
  const safe = (s: string) => (s || '').replace(/\//g, '_');
  return `${safe(nroDocumento)}__${safe(fecha)}__${safe(proyecto)}`;
}

function docToMarcacion(id: string, data: FirebaseFirestore.DocumentData): MarcacionBiometrica {
  const m: any = { docId: id, rowIndex: 0 };
  for (const f of FIELDS) m[f] = data[f] || '';
  return m as MarcacionBiometrica;
}

export async function getAllMarcacionesBiometricas(): Promise<MarcacionBiometrica[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToMarcacion(doc.id, doc.data()));
}

export async function importarMarcacionesBiometricas(
  registros: Array<{ nroDocumento: string; fecha: string; horaEntrada: string; horaSalida: string; horasRaw: string; proyecto: string }>
): Promise<{ actualizados: number; nuevos: number }> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION).get();
  const existentes = new Set(snapshot.docs.map(doc => doc.id));
  const hoy = new Date().toISOString().split('T')[0];

  let actualizados = 0;
  let nuevos = 0;
  let batch = db.batch();
  let enBatch = 0;

  for (const reg of registros) {
    const docId = buildDocId(reg.nroDocumento, reg.fecha, reg.proyecto);
    if (existentes.has(docId)) actualizados++; else nuevos++;
    batch.set(db.collection(COLLECTION).doc(docId), {
      nroDocumento: reg.nroDocumento,
      fecha: reg.fecha,
      horaEntrada: reg.horaEntrada,
      horaSalida: reg.horaSalida,
      horasRaw: reg.horasRaw,
      fechaCarga: hoy,
      proyecto: reg.proyecto,
    }, { merge: true });
    enBatch++;
    if (enBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      enBatch = 0;
    }
  }
  if (enBatch > 0) await batch.commit();

  return { actualizados, nuevos };
}

export async function updateMarcacionBiometrica(
  docId: string,
  datos: Partial<Pick<MarcacionBiometrica, 'horaEntrada' | 'horaSalida' | 'horasRaw'>>
): Promise<void> {
  const updates: Record<string, string> = {};
  if (datos.horaEntrada !== undefined) updates.horaEntrada = datos.horaEntrada;
  if (datos.horaSalida !== undefined) updates.horaSalida = datos.horaSalida;
  if (datos.horasRaw !== undefined) updates.horasRaw = datos.horasRaw;
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COLLECTION).doc(docId).set(updates, { merge: true });
}
