import { getDb } from './firebaseAdmin';

// ============================================
// Bitacora (entradas diarias)
// ============================================

const COL_BITACORA = 'bitacora';

export interface BitacoraEntrada {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  fecha: string;
  descripcionTrabajo: string;
  ubicacionArea: string;
  realizadoPor: string;
  fotos: string;
}

const BITACORA_FIELDS = ['fechaHora', 'userEmail', 'proyecto', 'fecha', 'descripcionTrabajo', 'ubicacionArea', 'realizadoPor', 'fotos'] as const;

function docToBitacora(data: FirebaseFirestore.DocumentData): BitacoraEntrada {
  const b: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of BITACORA_FIELDS) b[f] = data[f] || '';
  return b as BitacoraEntrada;
}

export async function getAllBitacora(): Promise<BitacoraEntrada[]> {
  const snapshot = await getDb().collection(COL_BITACORA).get();
  return snapshot.docs.map(doc => docToBitacora(doc.data()));
}

export async function getBitacoraByProyecto(proyecto: string): Promise<BitacoraEntrada[]> {
  const snapshot = await getDb().collection(COL_BITACORA).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToBitacora(doc.data()));
}

export async function appendBitacora(entrada: Omit<BitacoraEntrada, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: entrada.idRegistro };
  for (const f of BITACORA_FIELDS) data[f] = (entrada as any)[f] || '';
  await getDb().collection(COL_BITACORA).doc(entrada.idRegistro).set(data);
}

export async function updateBitacora(idRegistro: string, entrada: Partial<Omit<BitacoraEntrada, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of ['fecha', 'descripcionTrabajo', 'ubicacionArea', 'realizadoPor', 'fotos'] as const) {
    if ((entrada as any)[f] !== undefined && (entrada as any)[f] !== '') updates[f] = (entrada as any)[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_BITACORA).doc(idRegistro).set(updates, { merge: true });
}

export async function deleteBitacora(idRegistro: string): Promise<void> {
  await getDb().collection(COL_BITACORA).doc(idRegistro).delete();
}

// ============================================
// Tareas de Bitacora
// ============================================

const COL_TAREAS = 'bitacora_tareas';

export interface BitacoraTarea {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  idBitacora: string;
  descripcion: string;
  estado: 'pendiente' | 'completada';
  fotosAntes: string;
  fotosDespues: string;
  fechaCompletado: string;
  completadosPor: string;
}

const TAREA_FIELDS = ['fechaHora', 'userEmail', 'proyecto', 'idBitacora', 'descripcion', 'fotosAntes', 'fotosDespues', 'fechaCompletado', 'completadosPor'] as const;

function docToTarea(data: FirebaseFirestore.DocumentData): BitacoraTarea {
  const t: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of TAREA_FIELDS) t[f] = data[f] || '';
  t.estado = data.estado === 'completada' ? 'completada' : 'pendiente';
  return t as BitacoraTarea;
}

export async function getAllTareas(): Promise<BitacoraTarea[]> {
  const snapshot = await getDb().collection(COL_TAREAS).get();
  return snapshot.docs.map(doc => docToTarea(doc.data()));
}

export async function getTareasByProyecto(proyecto: string): Promise<BitacoraTarea[]> {
  const snapshot = await getDb().collection(COL_TAREAS).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToTarea(doc.data()));
}

export async function getTareasByBitacora(idBitacora: string): Promise<BitacoraTarea[]> {
  const snapshot = await getDb().collection(COL_TAREAS).where('idBitacora', '==', idBitacora).get();
  return snapshot.docs.map(doc => docToTarea(doc.data()));
}

export async function getTareaById(idRegistro: string): Promise<BitacoraTarea | null> {
  const doc = await getDb().collection(COL_TAREAS).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToTarea(doc.data()!);
}

export async function appendTarea(tarea: Omit<BitacoraTarea, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: tarea.idRegistro, estado: tarea.estado || 'pendiente' };
  for (const f of TAREA_FIELDS) data[f] = (tarea as any)[f] || '';
  await getDb().collection(COL_TAREAS).doc(tarea.idRegistro).set(data);
}

export async function updateTarea(idRegistro: string, tarea: Partial<Omit<BitacoraTarea, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  if (tarea.idBitacora !== undefined) updates.idBitacora = tarea.idBitacora;
  if (tarea.descripcion !== undefined) updates.descripcion = tarea.descripcion;
  if (tarea.estado !== undefined) updates.estado = tarea.estado;
  if (tarea.fotosAntes !== undefined) updates.fotosAntes = tarea.fotosAntes;
  if (tarea.fotosDespues !== undefined) updates.fotosDespues = tarea.fotosDespues;
  if (tarea.fechaCompletado !== undefined) updates.fechaCompletado = tarea.fechaCompletado;
  if (tarea.completadosPor !== undefined) updates.completadosPor = tarea.completadosPor;
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_TAREAS).doc(idRegistro).set(updates, { merge: true });
}

export async function deleteTarea(idRegistro: string): Promise<void> {
  await getDb().collection(COL_TAREAS).doc(idRegistro).delete();
}
