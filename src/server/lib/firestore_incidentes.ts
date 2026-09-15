import { getDb } from './firebaseAdmin';

const COLLECTION = 'incidentes';

export interface Incidente {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  fechaIncidente: string;
  horaIncidente: string;
  lugar: string;
  tipo: string;
  clasificacion: string;
  descripcion: string;
  personasInvolucradas: string;
  causasInmediatas: string;
  causasRaiz: string;
  accionesCorrectivas: string;
  responsableAcciones: string;
  fechaCompromiso: string;
  estado: string;
  evidencias: string;
  investigador: string;
  fechaCierre: string;
  diasPerdidos: string;
  costoEstimado: string;
  causaOtraDetalle: string;
  nombreTrabajador: string;
  cedulaTrabajador: string;
  empresaTrabajador: string;
  cargoTrabajador: string;
  lesionDano: string;
  notificadoIPS: string;
  fechaNotificacionIPS: string;
  notificadoMTESS: string;
  fechaNotificacionMTESS: string;
}

const FIELDS = [
  'fechaHoraRegistro', 'userEmail', 'proyecto', 'fechaIncidente', 'horaIncidente', 'lugar',
  'tipo', 'clasificacion', 'descripcion', 'personasInvolucradas', 'causasInmediatas',
  'causasRaiz', 'accionesCorrectivas', 'responsableAcciones', 'fechaCompromiso', 'estado',
  'evidencias', 'investigador', 'fechaCierre', 'diasPerdidos', 'costoEstimado',
  'causaOtraDetalle', 'nombreTrabajador', 'cedulaTrabajador', 'empresaTrabajador',
  'cargoTrabajador', 'lesionDano', 'notificadoIPS', 'fechaNotificacionIPS',
  'notificadoMTESS', 'fechaNotificacionMTESS',
] as const;

// idRegistro es tipeado a mano por el usuario y puede traer "/" (ej. "007/2026"),
// invalido como Firestore doc ID (se interpreta como separador de subcoleccion).
// Se sanitiza solo para el path del documento; el idRegistro original se guarda
// como campo y es el que se devuelve siempre al cliente.
function sanitizeDocId(idRegistro: string): string {
  return idRegistro.replace(/\//g, '_');
}

function docToIncidente(data: FirebaseFirestore.DocumentData): Incidente {
  const incidente: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of FIELDS) incidente[f] = data[f] || '';
  if (!incidente.estado) incidente.estado = 'Abierto';
  return incidente as Incidente;
}

export async function getAllIncidentes(): Promise<Incidente[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToIncidente(doc.data()));
}

export async function getIncidentesByProyecto(proyecto: string): Promise<Incidente[]> {
  const snapshot = await getDb().collection(COLLECTION).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToIncidente(doc.data()));
}

export async function getIncidenteById(idRegistro: string): Promise<Incidente | null> {
  const doc = await getDb().collection(COLLECTION).doc(sanitizeDocId(idRegistro)).get();
  if (!doc.exists) return null;
  return docToIncidente(doc.data()!);
}

export async function appendIncidente(incidente: Omit<Incidente, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: incidente.idRegistro };
  for (const f of FIELDS) data[f] = (incidente as any)[f] || '';
  if (!data.fechaHoraRegistro) data.fechaHoraRegistro = new Date().toISOString();
  if (!data.estado) data.estado = 'Abierto';
  await getDb().collection(COLLECTION).doc(sanitizeDocId(incidente.idRegistro)).set(data);
  console.log('Incidente creado:', incidente.idRegistro);
}

export async function updateIncidente(idRegistro: string, incidente: Partial<Omit<Incidente, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of FIELDS) {
    if ((incidente as any)[f] !== undefined) updates[f] = (incidente as any)[f];
  }
  if (Object.keys(updates).length === 0) {
    console.log('No hay campos para actualizar');
    return;
  }
  await getDb().collection(COLLECTION).doc(sanitizeDocId(idRegistro)).set(updates, { merge: true });
  console.log('Incidente actualizado:', idRegistro);
}

export async function deleteIncidente(idRegistro: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(sanitizeDocId(idRegistro)).delete();
  console.log('Incidente eliminado:', idRegistro);
}
