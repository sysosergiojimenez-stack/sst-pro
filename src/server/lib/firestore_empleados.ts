import { getDb } from './firebaseAdmin';

const COLLECTION = 'empleados';

export interface Empleado {
  docId: string;
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  nroDocumento: string;
  fechaHora?: string;
  userEmail?: string;
  obra: string;
  tipoDocumento?: string;
  nombres: string;
  apellidos: string;
  ciudadNacimiento?: string;
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  nombrePadre?: string;
  ocupacionPadre?: string;
  nombreMadre?: string;
  ocupacionMadre?: string;
  nombreConyuge?: string;
  ocupacionConyuge?: string;
  fechaNacConyuge?: string;
  direccion?: string;
  nro?: string;
  dpto?: string;
  piso?: string;
  barrio?: string;
  ciudad?: string;
  departamentoTerritorial?: string;
  puntoReferencia?: string;
  telefonoCelular: string;
  telefonoEmergencia?: string;
  email: string;
  gradoInstruccion?: string;
  instruccionConcluida?: string;
  carreraUniversitaria?: string;
  tipoSangre?: string;
  hijo1?: string;
  fechaNacHijo1?: string;
  hijo2?: string;
  fechaNacHijo2?: string;
  hijo3?: string;
  fechaNacHijo3?: string;
  hijo4?: string;
  fechaNacHijo4?: string;
  hijo5?: string;
  fechaNacHijo5?: string;
  empresa: string;
  cargo: string;
  unidad?: string;
  honorarios?: string;
  moneda?: string;
  regimen?: string;
  actividades?: string;
  fechaInicioContrato?: string;
  fechaTerminoContrato?: string;
  calce?: string;
  scanDocumentos?: string;
  ultimaDeclaracionIPS?: string;
  ipsDocumentoUrl?: string;
  estado?: string;
}

const FIELDS = [
  'nroDocumento', 'fechaHora', 'userEmail', 'obra', 'tipoDocumento', 'nombres', 'apellidos',
  'ciudadNacimiento', 'fechaNacimiento', 'sexo', 'estadoCivil', 'nombrePadre', 'ocupacionPadre',
  'nombreMadre', 'ocupacionMadre', 'nombreConyuge', 'ocupacionConyuge', 'fechaNacConyuge',
  'direccion', 'nro', 'dpto', 'piso', 'barrio', 'ciudad', 'departamentoTerritorial',
  'puntoReferencia', 'telefonoCelular', 'telefonoEmergencia', 'email', 'gradoInstruccion',
  'instruccionConcluida', 'carreraUniversitaria', 'tipoSangre', 'hijo1', 'fechaNacHijo1',
  'hijo2', 'fechaNacHijo2', 'hijo3', 'fechaNacHijo3', 'hijo4', 'fechaNacHijo4', 'hijo5',
  'fechaNacHijo5', 'empresa', 'cargo', 'unidad', 'honorarios', 'moneda', 'regimen',
  'actividades', 'fechaInicioContrato', 'fechaTerminoContrato', 'calce', 'scanDocumentos',
  'ultimaDeclaracionIPS', 'ipsDocumentoUrl', 'estado',
] as const;

function docToEmpleado(id: string, data: FirebaseFirestore.DocumentData): Empleado {
  const empleado: any = { docId: id, rowIndex: 0 };
  for (const f of FIELDS) empleado[f] = data[f] || '';
  if (!empleado.estado) empleado.estado = 'Activo';
  return empleado as Empleado;
}

export async function getEmpleados(): Promise<Empleado[]> {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs.map(doc => docToEmpleado(doc.id, doc.data()));
}

export async function getEmpleadoByDocumento(nroDocumento: string): Promise<Empleado | null> {
  const snapshot = await getDb().collection(COLLECTION).where('nroDocumento', '==', nroDocumento).limit(1).get();
  if (snapshot.empty) return null;
  return docToEmpleado(snapshot.docs[0].id, snapshot.docs[0].data());
}

export async function getEmpleadoById(docId: string): Promise<Empleado | null> {
  const doc = await getDb().collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return docToEmpleado(doc.id, doc.data()!);
}

export async function appendEmpleado(empleado: Omit<Empleado, 'rowIndex' | 'docId'>): Promise<string> {
  const data: Record<string, string> = {};
  for (const f of FIELDS) data[f] = (empleado as any)[f] || '';
  if (!data.fechaHora) data.fechaHora = new Date().toISOString();
  if (!data.estado) data.estado = 'Activo';
  const ref = await getDb().collection(COLLECTION).add(data);
  console.log('Empleado agregado:', ref.id);
  return ref.id;
}

export async function updateEmpleado(docId: string, empleado: Partial<Omit<Empleado, 'rowIndex' | 'docId'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of FIELDS) {
    if ((empleado as any)[f] !== undefined) updates[f] = (empleado as any)[f];
  }
  if (Object.keys(updates).length === 0) {
    console.log('No hay campos para actualizar');
    return;
  }
  await getDb().collection(COLLECTION).doc(docId).set(updates, { merge: true });
  console.log('Empleado actualizado:', docId);
}

export async function deleteEmpleado(docId: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(docId).delete();
  console.log('Empleado eliminado:', docId);
}

export async function actualizarEmpleadosIPS(
  actualizaciones: Array<{ docId: string; ultimaDeclaracionIPS: string; ipsDocumentoUrl: string }>
): Promise<void> {
  if (actualizaciones.length === 0) return;
  const db = getDb();
  const batches: FirebaseFirestore.WriteBatch[] = [];
  let batch = db.batch();
  let enBatch = 0;
  for (const { docId, ultimaDeclaracionIPS, ipsDocumentoUrl } of actualizaciones) {
    batch.set(db.collection(COLLECTION).doc(docId), { ultimaDeclaracionIPS, ipsDocumentoUrl }, { merge: true });
    enBatch++;
    if (enBatch >= 400) {
      batches.push(batch);
      batch = db.batch();
      enBatch = 0;
    }
  }
  if (enBatch > 0) batches.push(batch);
  for (const b of batches) await b.commit();
  console.log('Actualizadas declaraciones IPS para', actualizaciones.length, 'empleados');
}

// ========== Catálogos de referencia (Obras / Empresas / Cargos) ==========

export interface Obra {
  nombre: string;
  ubicacion?: string;
  estado?: string;
}

export async function getObras(): Promise<Obra[]> {
  const snapshot = await getDb().collection('obras').get();
  return snapshot.docs.map(doc => {
    const d = doc.data();
    return { nombre: d.nombre || doc.id, ubicacion: d.ubicacion || '', estado: d.estado || 'Activa' };
  }).filter(o => o.nombre);
}

export interface Empresa {
  nombre: string;
  nit?: string;
  contacto?: string;
}

export async function getEmpresas(): Promise<Empresa[]> {
  const snapshot = await getDb().collection('empresas').get();
  return snapshot.docs.map(doc => {
    const d = doc.data();
    return { nombre: d.nombre || doc.id, nit: d.nit || '', contacto: d.contacto || '' };
  }).filter(e => e.nombre);
}

export interface Cargo {
  nombre: string;
  nivel?: string;
  descripcion?: string;
}

export async function getCargos(): Promise<Cargo[]> {
  const snapshot = await getDb().collection('cargos').get();
  return snapshot.docs.map(doc => {
    const d = doc.data();
    return { nombre: d.nombre || doc.id, nivel: d.nivel || '', descripcion: d.descripcion || '' };
  }).filter(c => c.nombre);
}

export interface Estadisticas {
  totalEmpleados: number;
  empleadosPorObra: Record<string, number>;
  empleadosPorEmpresa: Record<string, number>;
  empleadosSinDocumentos: number;
}

export async function getEstadisticas(): Promise<Estadisticas> {
  const empleados = await getEmpleados();
  const empleadosPorObra: Record<string, number> = {};
  const empleadosPorEmpresa: Record<string, number> = {};
  let empleadosSinDocumentos = 0;
  for (const emp of empleados) {
    const obra = emp.obra || 'Sin obra';
    empleadosPorObra[obra] = (empleadosPorObra[obra] || 0) + 1;
    const empresa = emp.empresa || 'Sin empresa';
    empleadosPorEmpresa[empresa] = (empleadosPorEmpresa[empresa] || 0) + 1;
    if (!emp.scanDocumentos) empleadosSinDocumentos++;
  }
  return { totalEmpleados: empleados.length, empleadosPorObra, empleadosPorEmpresa, empleadosSinDocumentos };
}
