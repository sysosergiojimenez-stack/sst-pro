import { getDb } from './firebaseAdmin';

const COLLECTION = 'declaraciones_ips';

export interface DeclaracionIPS {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  periodo: string;
  urlPDF: string;
  listaCICs: string;
  totalEmpleados: string;
}

const FIELDS = ['fechaHoraRegistro', 'userEmail', 'proyecto', 'periodo', 'urlPDF', 'listaCICs', 'totalEmpleados'] as const;

function docToDeclaracionIPS(data: FirebaseFirestore.DocumentData): DeclaracionIPS {
  const d: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of FIELDS) d[f] = data[f] || '';
  return d as DeclaracionIPS;
}

export async function getAllDeclaracionesIPS(): Promise<DeclaracionIPS[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToDeclaracionIPS(doc.data()));
}

export async function getDeclaracionesIPSByProyecto(proyecto: string): Promise<DeclaracionIPS[]> {
  const snapshot = await getDb().collection(COLLECTION).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToDeclaracionIPS(doc.data()));
}

export async function appendDeclaracionIPS(declaracion: Omit<DeclaracionIPS, 'rowIndex'>): Promise<string> {
  const data: Record<string, string> = { idRegistro: declaracion.idRegistro };
  for (const f of FIELDS) data[f] = (declaracion as any)[f] || '';
  await getDb().collection(COLLECTION).doc(declaracion.idRegistro).set(data);
  console.log('Declaracion IPS agregada:', declaracion.idRegistro);
  return declaracion.idRegistro;
}
