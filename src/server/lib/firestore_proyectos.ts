import { getDb } from './firebaseAdmin';

const COLLECTION = 'proyectos';

export interface Proyecto {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
  fechaInicioObra: string;
}

function docToProyecto(id: string, data: FirebaseFirestore.DocumentData): Proyecto {
  return {
    rowIndex: 0,
    idRegistro: id,
    fechaHora: data.fechaHora || '',
    userEmail: data.userEmail || '',
    denominacion: data.denominacion || '',
    ubicacion: data.ubicacion || '',
    logo: data.logo || '',
    fechaInicioObra: data.fechaInicioObra || '',
  };
}

export async function getProyectos(): Promise<Proyecto[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToProyecto(doc.id, doc.data()));
}

export async function getProyectoById(idRegistro: string): Promise<Proyecto | null> {
  const doc = await getDb().collection(COLLECTION).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToProyecto(doc.id, doc.data()!);
}

export async function appendProyecto(proyecto: Omit<Proyecto, 'rowIndex'>): Promise<string> {
  const idRegistro = proyecto.idRegistro;
  await getDb().collection(COLLECTION).doc(idRegistro).set({
    fechaHora: proyecto.fechaHora || new Date().toISOString(),
    userEmail: proyecto.userEmail || '',
    denominacion: proyecto.denominacion,
    ubicacion: proyecto.ubicacion,
    logo: proyecto.logo || '',
    fechaInicioObra: proyecto.fechaInicioObra || '',
  });
  console.log('Proyecto agregado:', idRegistro);
  return idRegistro;
}

export async function updateProyecto(idRegistro: string, proyecto: Partial<Omit<Proyecto, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const key of ['fechaHora', 'userEmail', 'denominacion', 'ubicacion', 'logo', 'fechaInicioObra'] as const) {
    if (proyecto[key] !== undefined) updates[key] = proyecto[key] as string;
  }
  if (Object.keys(updates).length === 0) {
    console.log('No hay campos para actualizar');
    return;
  }
  await getDb().collection(COLLECTION).doc(idRegistro).set(updates, { merge: true });
  console.log('Proyecto actualizado:', idRegistro);
}

export async function deleteProyecto(idRegistro: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(idRegistro).delete();
  console.log('Proyecto eliminado:', idRegistro);
}
