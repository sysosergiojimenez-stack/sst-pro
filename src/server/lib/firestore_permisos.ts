import { getDb } from './firebaseAdmin';

const COLLECTION = 'permisosTrabajo';

export interface PermisoTrabajo {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  fecha: string;
  horaInicio: string;
  horaFinPrevista: string;
  frente: string;
  empresaEjecutante: string;
  descripcionTarea: string;
  tiposTrabajo: string[];
  tipoOtroDetalle: string;
  condRiesgosComunicados: boolean;
  condEppVerificado: boolean;
  condEquiposInspeccionados: boolean;
  condAreaSenalizada: boolean;
  condPlanRescateConfirmado: boolean;
  condClimaApto: boolean;
  trabajadores: string;
  autorizanteJefeObra: string;
  autorizanteResponsableSSO: string;
  estado: string;
  cierreFecha: string;
  cierreHora: string;
  cierreResponsable: string;
}

const CAMPOS_TEXTO = [
  'fechaHoraRegistro', 'userEmail', 'proyecto', 'fecha', 'horaInicio', 'horaFinPrevista',
  'frente', 'empresaEjecutante', 'descripcionTarea', 'tipoOtroDetalle', 'trabajadores',
  'autorizanteJefeObra', 'autorizanteResponsableSSO', 'estado', 'cierreFecha', 'cierreHora',
  'cierreResponsable',
] as const;

const CAMPOS_BOOLEANOS = [
  'condRiesgosComunicados', 'condEppVerificado', 'condEquiposInspeccionados',
  'condAreaSenalizada', 'condPlanRescateConfirmado', 'condClimaApto',
] as const;

function docToPermiso(data: FirebaseFirestore.DocumentData): PermisoTrabajo {
  const permiso: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of CAMPOS_TEXTO) permiso[f] = data[f] || '';
  for (const f of CAMPOS_BOOLEANOS) permiso[f] = !!data[f];
  permiso.tiposTrabajo = Array.isArray(data.tiposTrabajo) ? data.tiposTrabajo : [];
  if (!permiso.estado) permiso.estado = 'Abierto';
  return permiso as PermisoTrabajo;
}

export async function getAllPermisos(): Promise<PermisoTrabajo[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToPermiso(doc.data()));
}

export async function getPermisosByProyecto(proyecto: string): Promise<PermisoTrabajo[]> {
  const snapshot = await getDb().collection(COLLECTION).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToPermiso(doc.data()));
}

export async function getPermisoById(idRegistro: string): Promise<PermisoTrabajo | null> {
  const doc = await getDb().collection(COLLECTION).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToPermiso(doc.data()!);
}

export async function appendPermiso(permiso: Omit<PermisoTrabajo, 'rowIndex'>): Promise<void> {
  const data: Record<string, any> = { idRegistro: permiso.idRegistro };
  for (const f of CAMPOS_TEXTO) data[f] = (permiso as any)[f] || '';
  for (const f of CAMPOS_BOOLEANOS) data[f] = !!(permiso as any)[f];
  data.tiposTrabajo = Array.isArray(permiso.tiposTrabajo) ? permiso.tiposTrabajo : [];
  if (!data.fechaHoraRegistro) data.fechaHoraRegistro = new Date().toISOString();
  if (!data.estado) data.estado = 'Abierto';
  await getDb().collection(COLLECTION).doc(permiso.idRegistro).set(data);
}

export async function updatePermiso(idRegistro: string, permiso: Partial<Omit<PermisoTrabajo, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, any> = {};
  for (const f of CAMPOS_TEXTO) {
    if ((permiso as any)[f] !== undefined) updates[f] = (permiso as any)[f];
  }
  for (const f of CAMPOS_BOOLEANOS) {
    if ((permiso as any)[f] !== undefined) updates[f] = !!(permiso as any)[f];
  }
  if (permiso.tiposTrabajo !== undefined) updates.tiposTrabajo = permiso.tiposTrabajo;
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COLLECTION).doc(idRegistro).set(updates, { merge: true });
}

export async function deletePermiso(idRegistro: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(idRegistro).delete();
}
