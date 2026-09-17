import { getDb } from './firebaseAdmin';

const COLLECTION = 'registrosZLP800';

export interface ChecklistItemZLP800 {
  texto: string;
  marcado: boolean;
}

export interface RegistroZLP800 {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  obra: string;
  fecha: string;
  responsableCalculo: string;
  identificacionAndamio: string;
  cargaTrabajo: string;
  contrapesoReal: string;
  cantidadTramos: string;
  pesoMecanismo: string;
  alturaTrabajo: string;
  pesoCables: string;
  pesoTensores: string;
  extension: string;
  distanciaBases: string;
  pesoTotalF: string;
  contrapesoMinimoG: string;
  coeficienteN: string;
  cargaMaximaAdmisible: string;
  resultadoEstabilidad: string;
  checklist: ChecklistItemZLP800[];
  resultadoFinal: string;
  firmaAreaTecnica: string;
  firmaJefeObra: string;
}

const CAMPOS_TEXTO = [
  'fechaHoraRegistro', 'userEmail', 'obra', 'fecha', 'responsableCalculo', 'identificacionAndamio',
  'cargaTrabajo', 'contrapesoReal', 'cantidadTramos', 'pesoMecanismo', 'alturaTrabajo',
  'pesoCables', 'pesoTensores', 'extension', 'distanciaBases', 'pesoTotalF', 'contrapesoMinimoG',
  'coeficienteN', 'cargaMaximaAdmisible', 'resultadoEstabilidad', 'resultadoFinal',
  'firmaAreaTecnica', 'firmaJefeObra',
] as const;

function docToRegistro(data: FirebaseFirestore.DocumentData): RegistroZLP800 {
  const registro: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of CAMPOS_TEXTO) registro[f] = data[f] || '';
  registro.checklist = Array.isArray(data.checklist) ? data.checklist : [];
  return registro as RegistroZLP800;
}

export async function getAllRegistrosZLP800(): Promise<RegistroZLP800[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToRegistro(doc.data()));
}

export async function getRegistroZLP800ById(idRegistro: string): Promise<RegistroZLP800 | null> {
  const doc = await getDb().collection(COLLECTION).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToRegistro(doc.data()!);
}

export async function appendRegistroZLP800(registro: Omit<RegistroZLP800, 'rowIndex'>): Promise<void> {
  const data: Record<string, any> = { idRegistro: registro.idRegistro };
  for (const f of CAMPOS_TEXTO) data[f] = (registro as any)[f] || '';
  data.checklist = Array.isArray(registro.checklist) ? registro.checklist : [];
  if (!data.fechaHoraRegistro) data.fechaHoraRegistro = new Date().toISOString();
  await getDb().collection(COLLECTION).doc(registro.idRegistro).set(data);
}

export async function deleteRegistroZLP800(idRegistro: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(idRegistro).delete();
}
