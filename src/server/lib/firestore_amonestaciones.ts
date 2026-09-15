import { getDb } from './firebaseAdmin';

const COLLECTION = 'amonestaciones';

export interface Amonestacion {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  nombreApellido: string;
  cedula: string;
  empresa: string;
  cargo: string;
  fechaFalta: string;
  fechaNotificacion: string;
  descripcionFalta: string;
  disposicionReglamento: string;
  clasificacion: string;
  antecedentes: string;
  sancion: string;
  diasSuspension: string;
  estado: string;
  empleadoDocumento: string;
  fotos: string;
}

const FIELDS = [
  'fechaHoraRegistro', 'userEmail', 'proyecto', 'nombreApellido', 'cedula', 'empresa',
  'cargo', 'fechaFalta', 'fechaNotificacion', 'descripcionFalta', 'disposicionReglamento',
  'clasificacion', 'antecedentes', 'sancion', 'diasSuspension', 'estado',
  'empleadoDocumento', 'fotos',
] as const;

function docToAmonestacion(data: FirebaseFirestore.DocumentData): Amonestacion {
  const a: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of FIELDS) a[f] = data[f] || '';
  if (!a.estado) a.estado = 'Pendiente de Firma';
  return a as Amonestacion;
}

export async function getAllAmonestaciones(): Promise<Amonestacion[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToAmonestacion(doc.data()));
}

export async function getAmonestacionesByProyecto(proyecto: string): Promise<Amonestacion[]> {
  const snapshot = await getDb().collection(COLLECTION).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToAmonestacion(doc.data()));
}

export async function getAmonestacionById(idRegistro: string): Promise<Amonestacion | null> {
  const doc = await getDb().collection(COLLECTION).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToAmonestacion(doc.data()!);
}

export async function appendAmonestacion(amonestacion: Omit<Amonestacion, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: amonestacion.idRegistro };
  for (const f of FIELDS) data[f] = (amonestacion as any)[f] || '';
  await getDb().collection(COLLECTION).doc(amonestacion.idRegistro).set(data);
}

export async function updateAmonestacion(idRegistro: string, amonestacion: Partial<Omit<Amonestacion, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of FIELDS) {
    if ((amonestacion as any)[f] !== undefined) updates[f] = (amonestacion as any)[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COLLECTION).doc(idRegistro).set(updates, { merge: true });
  console.log('Amonestacion actualizada:', idRegistro);
}

export async function deleteAmonestacion(idRegistro: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(idRegistro).delete();
  console.log('Amonestacion eliminada:', idRegistro);
}
