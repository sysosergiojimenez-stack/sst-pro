import { getDb } from './firebaseAdmin';

// ============================================
// Capacitaciones / Charlas
// ============================================

const COL_CAPACITACIONES = 'capacitaciones';

export interface Capacitacion {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  titulo: string;
  fechaProgramada: string;
  hora: string;
  lugar: string;
  responsable: string;
  tipo: string;
  estado: string;
  fechaRealizada: string;
  asistentes: string;
  observaciones: string;
  evidenciaPDF: string;
  temasTratados: string;
  imagenesAsistencia: string;
}

const CAPACITACION_FIELDS = [
  'fechaHora', 'userEmail', 'proyecto', 'titulo', 'fechaProgramada', 'hora', 'lugar',
  'responsable', 'tipo', 'estado', 'fechaRealizada', 'asistentes', 'observaciones',
  'evidenciaPDF', 'temasTratados', 'imagenesAsistencia',
] as const;

function docToCapacitacion(data: FirebaseFirestore.DocumentData): Capacitacion {
  const cap: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of CAPACITACION_FIELDS) cap[f] = data[f] || '';
  if (!cap.estado) cap.estado = 'Pendiente';
  return cap as Capacitacion;
}

export async function getAllCapacitaciones(): Promise<Capacitacion[]> {
  const snapshot = await getDb().collection(COL_CAPACITACIONES).get();
  return snapshot.docs.map(doc => docToCapacitacion(doc.data()));
}

export async function getCapacitacionesByProyecto(proyecto: string): Promise<Capacitacion[]> {
  const snapshot = await getDb().collection(COL_CAPACITACIONES).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToCapacitacion(doc.data()));
}

export async function appendCapacitacion(cap: Omit<Capacitacion, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: cap.idRegistro };
  for (const f of CAPACITACION_FIELDS) data[f] = (cap as any)[f] || '';
  await getDb().collection(COL_CAPACITACIONES).doc(cap.idRegistro).set(data);
}

export async function updateCapacitacion(idRegistro: string, cap: Partial<Omit<Capacitacion, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of ['titulo', 'fechaProgramada', 'hora', 'lugar', 'responsable', 'tipo', 'estado', 'fechaRealizada', 'asistentes', 'observaciones', 'evidenciaPDF', 'temasTratados', 'imagenesAsistencia'] as const) {
    if ((cap as any)[f] !== undefined && (cap as any)[f] !== '') updates[f] = (cap as any)[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_CAPACITACIONES).doc(idRegistro).set(updates, { merge: true });
}

export async function deleteCapacitacion(idRegistro: string): Promise<void> {
  await getDb().collection(COL_CAPACITACIONES).doc(idRegistro).delete();
}

// ============================================
// Asistencias de Capacitacion (relacionadas, para historial por trabajador)
// ============================================

const COL_ASISTENCIAS = 'asistencias_capacitacion';

export interface AsistenciaCapacitacion {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  idCapacitacion: string;
  proyecto: string;
  fecha: string;
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  empresa: string;
  cargo: string;
  encontradoEnNomina: string;
  fechaHora: string;
}

const ASISTENCIA_FIELDS = [
  'idCapacitacion', 'proyecto', 'fecha', 'nroDocumento', 'nombres', 'apellidos',
  'empresa', 'cargo', 'encontradoEnNomina', 'fechaHora',
] as const;

function docToAsistencia(data: FirebaseFirestore.DocumentData): AsistenciaCapacitacion {
  const a: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of ASISTENCIA_FIELDS) a[f] = data[f] || '';
  return a as AsistenciaCapacitacion;
}

export async function getAllAsistencias(): Promise<AsistenciaCapacitacion[]> {
  const snapshot = await getDb().collection(COL_ASISTENCIAS).get();
  return snapshot.docs.map(doc => docToAsistencia(doc.data()));
}

export async function getAsistenciasByCapacitacion(idCapacitacion: string): Promise<AsistenciaCapacitacion[]> {
  const snapshot = await getDb().collection(COL_ASISTENCIAS).where('idCapacitacion', '==', idCapacitacion).get();
  return snapshot.docs.map(doc => docToAsistencia(doc.data()));
}

export async function getAsistenciasByEmpleado(nroDocumento: string): Promise<AsistenciaCapacitacion[]> {
  const snapshot = await getDb().collection(COL_ASISTENCIAS).where('nroDocumento', '==', nroDocumento).get();
  return snapshot.docs.map(doc => docToAsistencia(doc.data()));
}

export async function appendAsistenciasBatch(asistencias: Omit<AsistenciaCapacitacion, 'rowIndex'>[]): Promise<void> {
  if (asistencias.length === 0) return;
  const db = getDb();
  const batch = db.batch();
  for (const a of asistencias) {
    const data: Record<string, string> = { idRegistro: a.idRegistro };
    for (const f of ASISTENCIA_FIELDS) data[f] = (a as any)[f] || '';
    batch.set(db.collection(COL_ASISTENCIAS).doc(a.idRegistro), data);
  }
  await batch.commit();
}

export async function deleteAsistenciasByCapacitacion(idCapacitacion: string): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection(COL_ASISTENCIAS).where('idCapacitacion', '==', idCapacitacion).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
