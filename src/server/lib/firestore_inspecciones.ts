import { getDb } from './firebaseAdmin';

// ============================================
// Inspecciones
// ============================================

const COL_INSPECCIONES = 'inspecciones';

export interface Inspeccion {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  fechaProgramada: string;
  inspector: string;
  estado: string;
  fechaRealizada: string;
  observacionesGenerales: string;
  idTemplateChecklist: string;
  areaEquipo: string;
}

const INSPECCION_FIELDS = [
  'fechaHora', 'userEmail', 'proyecto', 'fechaProgramada', 'inspector', 'estado',
  'fechaRealizada', 'observacionesGenerales', 'idTemplateChecklist', 'areaEquipo',
] as const;

function docToInspeccion(data: FirebaseFirestore.DocumentData): Inspeccion {
  const insp: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of INSPECCION_FIELDS) insp[f] = data[f] || '';
  if (!insp.estado) insp.estado = 'Programada';
  return insp as Inspeccion;
}

export async function getAllInspecciones(): Promise<Inspeccion[]> {
  const snapshot = await getDb().collection(COL_INSPECCIONES).get();
  return snapshot.docs.map(doc => docToInspeccion(doc.data()));
}

export async function getInspeccionesByProyecto(proyecto: string): Promise<Inspeccion[]> {
  const snapshot = await getDb().collection(COL_INSPECCIONES).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToInspeccion(doc.data()));
}

export async function appendInspeccion(insp: Omit<Inspeccion, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: insp.idRegistro };
  for (const f of INSPECCION_FIELDS) data[f] = (insp as any)[f] || '';
  await getDb().collection(COL_INSPECCIONES).doc(insp.idRegistro).set(data);
}

export async function updateInspeccion(idRegistro: string, insp: Partial<Omit<Inspeccion, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of ['fechaProgramada', 'inspector', 'estado', 'fechaRealizada', 'observacionesGenerales', 'idTemplateChecklist', 'areaEquipo'] as const) {
    if ((insp as any)[f] !== undefined && (insp as any)[f] !== '') updates[f] = (insp as any)[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_INSPECCIONES).doc(idRegistro).set(updates, { merge: true });
}

export async function deleteInspeccion(idRegistro: string): Promise<void> {
  await getDb().collection(COL_INSPECCIONES).doc(idRegistro).delete();
}

// ============================================
// Items de Inspeccion
// ============================================

const COL_INSPECCION_ITEMS = 'inspeccion_items';

export interface InspeccionItem {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  idInspeccion: string;
  item: string;
  resultado: string;
  observacion: string;
  fotos: string;
  accionCorrectiva: string;
  responsableAccion: string;
  fechaLimite: string;
  estadoAccion: string;
}

const ITEM_FIELDS = [
  'idInspeccion', 'item', 'resultado', 'observacion', 'fotos',
  'accionCorrectiva', 'responsableAccion', 'fechaLimite', 'estadoAccion',
] as const;

function docToItem(data: FirebaseFirestore.DocumentData): InspeccionItem {
  const it: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of ITEM_FIELDS) it[f] = data[f] || '';
  return it as InspeccionItem;
}

export async function getAllInspeccionItems(): Promise<InspeccionItem[]> {
  const snapshot = await getDb().collection(COL_INSPECCION_ITEMS).get();
  return snapshot.docs.map(doc => docToItem(doc.data()));
}

export async function getItemsByInspeccion(idInspeccion: string): Promise<InspeccionItem[]> {
  const snapshot = await getDb().collection(COL_INSPECCION_ITEMS).where('idInspeccion', '==', idInspeccion).get();
  return snapshot.docs.map(doc => docToItem(doc.data()));
}

export async function appendInspeccionItemsBatch(items: Omit<InspeccionItem, 'rowIndex'>[]): Promise<void> {
  if (items.length === 0) return;
  const db = getDb();
  const batch = db.batch();
  for (const it of items) {
    const data: Record<string, string> = { idRegistro: it.idRegistro };
    for (const f of ITEM_FIELDS) data[f] = (it as any)[f] || '';
    batch.set(db.collection(COL_INSPECCION_ITEMS).doc(it.idRegistro), data);
  }
  await batch.commit();
}

export async function deleteItemsByInspeccion(idInspeccion: string): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection(COL_INSPECCION_ITEMS).where('idInspeccion', '==', idInspeccion).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

// ============================================
// Checklist maestro (items base editables)
// ============================================

const COL_CHECKLIST_TEMPLATE = 'checklist_template_items';

export interface ChecklistTemplateItem {
  rowIndex: number; // siempre 0, compat
  id: string;
  idTemplate: string;
  texto: string;
  orden: number;
  activo: string;
}

function docToTemplateItem(data: FirebaseFirestore.DocumentData): ChecklistTemplateItem {
  return {
    rowIndex: 0,
    id: data.id || '',
    idTemplate: data.idTemplate || '',
    texto: data.texto || '',
    orden: typeof data.orden === 'number' ? data.orden : (parseInt(data.orden) || 0),
    activo: data.activo || 'TRUE',
  };
}

export async function getChecklistTemplate(idTemplate?: string): Promise<ChecklistTemplateItem[]> {
  const db = getDb();
  const snapshot = idTemplate
    ? await db.collection(COL_CHECKLIST_TEMPLATE).where('idTemplate', '==', idTemplate).get()
    : await db.collection(COL_CHECKLIST_TEMPLATE).get();
  return snapshot.docs.map(doc => docToTemplateItem(doc.data())).sort((a, b) => a.orden - b.orden);
}

export async function appendChecklistTemplateItem(item: Omit<ChecklistTemplateItem, 'rowIndex'>): Promise<void> {
  await getDb().collection(COL_CHECKLIST_TEMPLATE).doc(item.id).set({
    id: item.id, idTemplate: item.idTemplate, texto: item.texto, orden: item.orden, activo: item.activo,
  });
}

export async function updateChecklistTemplateItem(id: string, item: Partial<Omit<ChecklistTemplateItem, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, any> = {};
  if (item.idTemplate !== undefined) updates.idTemplate = item.idTemplate;
  if (item.texto !== undefined) updates.texto = item.texto;
  if (item.orden !== undefined) updates.orden = item.orden;
  if (item.activo !== undefined) updates.activo = item.activo;
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_CHECKLIST_TEMPLATE).doc(id).set(updates, { merge: true });
}

export async function deleteChecklistTemplateItem(id: string): Promise<void> {
  await getDb().collection(COL_CHECKLIST_TEMPLATE).doc(id).delete();
}

// ============================================
// Grupos de Checklist (Templates con nombre)
// ============================================

const COL_CHECKLIST_TEMPLATES = 'checklist_template_groups';

export interface ChecklistTemplateGroup {
  rowIndex: number; // siempre 0, compat
  id: string;
  nombre: string;
  activo: string;
}

function docToTemplateGroup(data: FirebaseFirestore.DocumentData): ChecklistTemplateGroup {
  return { rowIndex: 0, id: data.id || '', nombre: data.nombre || '', activo: data.activo || 'TRUE' };
}

export async function getChecklistTemplateGroups(): Promise<ChecklistTemplateGroup[]> {
  const snapshot = await getDb().collection(COL_CHECKLIST_TEMPLATES).get();
  return snapshot.docs.map(doc => docToTemplateGroup(doc.data()));
}

export async function appendChecklistTemplateGroup(group: Omit<ChecklistTemplateGroup, 'rowIndex'>): Promise<void> {
  await getDb().collection(COL_CHECKLIST_TEMPLATES).doc(group.id).set({
    id: group.id, nombre: group.nombre, activo: group.activo,
  });
}

export async function updateChecklistTemplateGroup(id: string, group: Partial<Omit<ChecklistTemplateGroup, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  if (group.nombre !== undefined) updates.nombre = group.nombre;
  if (group.activo !== undefined) updates.activo = group.activo;
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_CHECKLIST_TEMPLATES).doc(id).set(updates, { merge: true });
}

export async function deleteChecklistTemplateGroup(id: string): Promise<void> {
  await getDb().collection(COL_CHECKLIST_TEMPLATES).doc(id).delete();
}
