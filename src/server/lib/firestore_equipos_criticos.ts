import { getDb } from './firebaseAdmin';

const COLLECTION = 'equiposCriticos';

// Las 3 categorias cubren SST-FOR-04 (arnes/linea de vida), SST-FOR-09
// (eslingas/aparejos de izaje) y SST-FOR-14 (paneles/puntales del sistema
// tunel). Comparten la misma estructura: identidad del equipo + historial
// de inspecciones repetido + baja opcional.
export const CATEGORIAS_EQUIPO_CRITICO = [
  'Arnés / Línea de Vida / Conector',
  'Eslinga / Grillete / Aparejo de Izaje',
  'Panel / Puntal Sistema Túnel',
] as const;

export interface InspeccionEquipo {
  fecha: string;
  inspector: string;
  itemsVerificados: string;
  resultado: string;
  firma: string;
}

export interface EquipoCritico {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  categoria: string;
  identificador: string;
  tipo: string;
  marcaModelo: string;
  capacidadNominal: string;
  fechaFabricacion: string;
  fechaPrimerUso: string;
  ubicacionAsignada: string;
  estado: string;
  fechaBaja: string;
  motivoBaja: string;
  autorizanteBaja: string;
  inspecciones: InspeccionEquipo[];
}

const CAMPOS_TEXTO = [
  'fechaHoraRegistro', 'userEmail', 'proyecto', 'categoria', 'identificador', 'tipo',
  'marcaModelo', 'capacidadNominal', 'fechaFabricacion', 'fechaPrimerUso', 'ubicacionAsignada',
  'estado', 'fechaBaja', 'motivoBaja', 'autorizanteBaja',
] as const;

function docToEquipo(data: FirebaseFirestore.DocumentData): EquipoCritico {
  const equipo: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of CAMPOS_TEXTO) equipo[f] = data[f] || '';
  equipo.inspecciones = Array.isArray(data.inspecciones) ? data.inspecciones : [];
  if (!equipo.estado) equipo.estado = 'Activo';
  return equipo as EquipoCritico;
}

export async function getAllEquiposCriticos(): Promise<EquipoCritico[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToEquipo(doc.data()));
}

export async function getEquiposCriticosByProyecto(proyecto: string): Promise<EquipoCritico[]> {
  const snapshot = await getDb().collection(COLLECTION).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToEquipo(doc.data()));
}

export async function getEquipoCriticoById(idRegistro: string): Promise<EquipoCritico | null> {
  const doc = await getDb().collection(COLLECTION).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToEquipo(doc.data()!);
}

export async function appendEquipoCritico(equipo: Omit<EquipoCritico, 'rowIndex'>): Promise<void> {
  const data: Record<string, any> = { idRegistro: equipo.idRegistro };
  for (const f of CAMPOS_TEXTO) data[f] = (equipo as any)[f] || '';
  data.inspecciones = Array.isArray(equipo.inspecciones) ? equipo.inspecciones : [];
  if (!data.fechaHoraRegistro) data.fechaHoraRegistro = new Date().toISOString();
  if (!data.estado) data.estado = 'Activo';
  await getDb().collection(COLLECTION).doc(equipo.idRegistro).set(data);
}

export async function updateEquipoCritico(idRegistro: string, equipo: Partial<Omit<EquipoCritico, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, any> = {};
  for (const f of CAMPOS_TEXTO) {
    if ((equipo as any)[f] !== undefined) updates[f] = (equipo as any)[f];
  }
  if (equipo.inspecciones !== undefined) updates.inspecciones = equipo.inspecciones;
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COLLECTION).doc(idRegistro).set(updates, { merge: true });
}

export async function deleteEquipoCritico(idRegistro: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(idRegistro).delete();
}
