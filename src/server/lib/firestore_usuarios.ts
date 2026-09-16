import { getDb } from './firebaseAdmin';

const COL_USUARIOS = 'usuarios';

export interface Usuario {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  dateTime: string;
  registradoPor: string;
  rol: 'Desarrollador' | 'Admin' | 'User';
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  proyectosAsignados: string[];
}

const FIELDS = ['idRegistro', 'dateTime', 'registradoPor', 'rol', 'nombres', 'apellidos', 'correo', 'contrasena', 'proyectosAsignados'] as const;

function docToUsuario(data: FirebaseFirestore.DocumentData): Usuario {
  return {
    rowIndex: 0,
    idRegistro: data.idRegistro || '',
    dateTime: data.dateTime || '',
    registradoPor: data.registradoPor || '',
    rol: (data.rol || 'User') as Usuario['rol'],
    nombres: data.nombres || '',
    apellidos: data.apellidos || '',
    correo: data.correo || '',
    contrasena: data.contrasena || '',
    proyectosAsignados: Array.isArray(data.proyectosAsignados) ? data.proyectosAsignados : [],
  };
}

export async function getAllUsuarios(): Promise<Usuario[]> {
  const snap = await getDb().collection(COL_USUARIOS).get();
  return snap.docs.map(d => docToUsuario(d.data()));
}

export async function getUsuarioByCorreo(correo: string): Promise<Usuario | null> {
  const all = await getAllUsuarios();
  return all.find(u => u.correo.toLowerCase() === correo.toLowerCase()) || null;
}

export async function getUsuarioById(idRegistro: string): Promise<Usuario | null> {
  const doc = await getDb().collection(COL_USUARIOS).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToUsuario(doc.data()!);
}

export async function appendUsuario(usuario: Omit<Usuario, 'rowIndex'>): Promise<void> {
  const data: Record<string, any> = {};
  for (const f of FIELDS) data[f] = (usuario as any)[f];
  await getDb().collection(COL_USUARIOS).doc(usuario.idRegistro).set(data, { merge: true });
}

export async function updateUsuario(
  idRegistro: string,
  usuario: Partial<Omit<Usuario, 'rowIndex'>>
): Promise<void> {
  const data: Record<string, any> = {};
  for (const f of FIELDS) {
    if ((usuario as any)[f] !== undefined) data[f] = (usuario as any)[f];
  }
  if (Object.keys(data).length === 0) return;
  await getDb().collection(COL_USUARIOS).doc(idRegistro).set(data, { merge: true });
}

export async function deleteUsuario(idRegistro: string): Promise<void> {
  await getDb().collection(COL_USUARIOS).doc(idRegistro).delete();
}
