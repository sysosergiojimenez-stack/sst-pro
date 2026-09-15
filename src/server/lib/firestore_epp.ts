import { getDb } from './firebaseAdmin';

// ============================================
// Productos
// ============================================

const COL_PRODUCTOS = 'epp_productos';

export interface Producto {
  docId: string;
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  codigo: string;
  proyecto: string;
  nombre: string;
  proveedor: string;
  clasificacion: string;
  stockMinimo: string;
}

const PRODUCTO_FIELDS = ['codigo', 'proyecto', 'nombre', 'proveedor', 'clasificacion', 'stockMinimo'] as const;

function docToProducto(id: string, data: FirebaseFirestore.DocumentData): Producto {
  const p: any = { docId: id, rowIndex: 0 };
  for (const f of PRODUCTO_FIELDS) p[f] = data[f] || '';
  if (!p.stockMinimo) p.stockMinimo = '0';
  return p as Producto;
}

export async function getAllProductos(): Promise<Producto[]> {
  const snapshot = await getDb().collection(COL_PRODUCTOS).get();
  return snapshot.docs.map(doc => docToProducto(doc.id, doc.data()));
}

export async function getProductosByProyecto(proyecto: string): Promise<Producto[]> {
  const snapshot = await getDb().collection(COL_PRODUCTOS).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToProducto(doc.id, doc.data()));
}

export async function getProductoByCodigo(codigo: string): Promise<Producto | null> {
  const snapshot = await getDb().collection(COL_PRODUCTOS).where('codigo', '==', codigo).limit(1).get();
  if (snapshot.empty) return null;
  return docToProducto(snapshot.docs[0].id, snapshot.docs[0].data());
}

export async function getProductoById(docId: string): Promise<Producto | null> {
  const doc = await getDb().collection(COL_PRODUCTOS).doc(docId).get();
  if (!doc.exists) return null;
  return docToProducto(doc.id, doc.data()!);
}

export async function appendProducto(producto: Omit<Producto, 'rowIndex' | 'docId'>): Promise<string> {
  const data: Record<string, string> = {};
  for (const f of PRODUCTO_FIELDS) data[f] = String((producto as any)[f] ?? '');
  const ref = await getDb().collection(COL_PRODUCTOS).add(data);
  return ref.id;
}

export async function updateProducto(docId: string, producto: Partial<Omit<Producto, 'rowIndex' | 'docId'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of PRODUCTO_FIELDS) {
    if ((producto as any)[f] !== undefined) updates[f] = String((producto as any)[f]);
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_PRODUCTOS).doc(docId).set(updates, { merge: true });
  console.log('Producto actualizado:', docId);
}

export async function deleteProducto(docId: string): Promise<void> {
  await getDb().collection(COL_PRODUCTOS).doc(docId).delete();
  console.log('Producto eliminado:', docId);
}

// ============================================
// Remisiones y Facturas
// ============================================

const COL_REMISIONES = 'epp_remisiones';

export interface Remision {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  proveedor: string;
  numeracion: string;
  fecha: string;
  detalle: string;
  scaneado: string;
}

const REMISION_FIELDS = ['fechaHora', 'userEmail', 'proyecto', 'proveedor', 'numeracion', 'fecha', 'detalle', 'scaneado'] as const;

function docToRemision(data: FirebaseFirestore.DocumentData): Remision {
  const r: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of REMISION_FIELDS) r[f] = data[f] || '';
  return r as Remision;
}

export async function getAllRemisiones(): Promise<Remision[]> {
  const snapshot = await getDb().collection(COL_REMISIONES).get();
  return snapshot.docs.map(doc => docToRemision(doc.data()));
}

export async function getRemisionesByProyecto(proyecto: string): Promise<Remision[]> {
  const snapshot = await getDb().collection(COL_REMISIONES).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToRemision(doc.data()));
}

export async function getRemisionById(idRegistro: string): Promise<Remision | null> {
  const doc = await getDb().collection(COL_REMISIONES).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToRemision(doc.data()!);
}

export async function appendRemision(remision: Omit<Remision, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: remision.idRegistro };
  for (const f of REMISION_FIELDS) data[f] = (remision as any)[f] || '';
  await getDb().collection(COL_REMISIONES).doc(remision.idRegistro).set(data);
}

export async function updateRemision(idRegistro: string, remision: Partial<Omit<Remision, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of ['proveedor', 'numeracion', 'fecha', 'detalle', 'scaneado'] as const) {
    if ((remision as any)[f] !== undefined) updates[f] = (remision as any)[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_REMISIONES).doc(idRegistro).set(updates, { merge: true });
  console.log('Remision actualizada:', idRegistro);
}

export async function deleteRemision(idRegistro: string): Promise<void> {
  await getDb().collection(COL_REMISIONES).doc(idRegistro).delete();
  console.log('Remision eliminada:', idRegistro);
}

// ============================================
// Entradas
// ============================================

const COL_ENTRADAS = 'epp_entradas';

export interface Entrada {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  dateTime: string;
  userEmail: string;
  refRemision: string;
  codigo: string;
  item: string;
  cantidad: string;
  proyecto: string;
}

const ENTRADA_FIELDS = ['dateTime', 'userEmail', 'refRemision', 'codigo', 'item', 'cantidad', 'proyecto'] as const;

function docToEntrada(data: FirebaseFirestore.DocumentData): Entrada {
  const e: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of ENTRADA_FIELDS) e[f] = data[f] || '';
  return e as Entrada;
}

export async function getAllEntradas(): Promise<Entrada[]> {
  const snapshot = await getDb().collection(COL_ENTRADAS).get();
  return snapshot.docs.map(doc => docToEntrada(doc.data()));
}

export async function getEntradasByProyecto(proyecto: string): Promise<Entrada[]> {
  const snapshot = await getDb().collection(COL_ENTRADAS).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToEntrada(doc.data()));
}

export async function getEntradasByRemision(refRemision: string): Promise<Entrada[]> {
  const snapshot = await getDb().collection(COL_ENTRADAS).where('refRemision', '==', refRemision).get();
  return snapshot.docs.map(doc => docToEntrada(doc.data()));
}

export async function getEntradasByRemisionId(idRegistro: string): Promise<Entrada[]> {
  return getEntradasByRemision(idRegistro);
}

export async function appendEntrada(entrada: Omit<Entrada, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: entrada.idRegistro };
  for (const f of ENTRADA_FIELDS) data[f] = (entrada as any)[f] || (f === 'dateTime' ? new Date().toISOString() : '');
  await getDb().collection(COL_ENTRADAS).doc(entrada.idRegistro).set(data);
}

export async function appendMultipleEntradas(entradas: Omit<Entrada, 'rowIndex'>[]): Promise<void> {
  if (entradas.length === 0) return;
  const db = getDb();
  const batch = db.batch();
  for (const e of entradas) {
    const data: Record<string, string> = { idRegistro: e.idRegistro };
    for (const f of ENTRADA_FIELDS) data[f] = (e as any)[f] || (f === 'dateTime' ? new Date().toISOString() : '');
    batch.set(db.collection(COL_ENTRADAS).doc(e.idRegistro), data);
  }
  await batch.commit();
}

export async function deleteEntrada(idRegistro: string): Promise<void> {
  await getDb().collection(COL_ENTRADAS).doc(idRegistro).delete();
  console.log('Entrada eliminada:', idRegistro);
}

// ============================================
// Notas de Salida
// ============================================

const COL_NOTAS_SALIDA = 'epp_notas_salida';

export interface NotaSalida {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  obra: string;
  orden: string;
  fecha: string;
  quienRetira: string;
  observaciones: string;
}

const NOTA_SALIDA_FIELDS = ['fechaHora', 'userEmail', 'obra', 'orden', 'fecha', 'quienRetira', 'observaciones'] as const;

function docToNotaSalida(data: FirebaseFirestore.DocumentData): NotaSalida {
  const n: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of NOTA_SALIDA_FIELDS) n[f] = data[f] || '';
  return n as NotaSalida;
}

export async function getAllNotasSalida(): Promise<NotaSalida[]> {
  const snapshot = await getDb().collection(COL_NOTAS_SALIDA).get();
  return snapshot.docs.map(doc => docToNotaSalida(doc.data()));
}

export async function getNotasSalidaByProyecto(obra: string): Promise<NotaSalida[]> {
  const snapshot = await getDb().collection(COL_NOTAS_SALIDA).where('obra', '==', obra).get();
  return snapshot.docs.map(doc => docToNotaSalida(doc.data()));
}

export async function getNotaSalidaById(idRegistro: string): Promise<NotaSalida | null> {
  const doc = await getDb().collection(COL_NOTAS_SALIDA).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToNotaSalida(doc.data()!);
}

export async function appendNotaSalida(nota: Omit<NotaSalida, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: nota.idRegistro };
  for (const f of NOTA_SALIDA_FIELDS) data[f] = (nota as any)[f] || '';
  await getDb().collection(COL_NOTAS_SALIDA).doc(nota.idRegistro).set(data);
}

export async function updateNotaSalida(idRegistro: string, nota: Partial<Omit<NotaSalida, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of ['orden', 'fecha', 'quienRetira', 'observaciones'] as const) {
    if ((nota as any)[f] !== undefined) updates[f] = (nota as any)[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_NOTAS_SALIDA).doc(idRegistro).set(updates, { merge: true });
  console.log('Nota de salida actualizada:', idRegistro);
}

export async function deleteNotaSalida(idRegistro: string): Promise<void> {
  await getDb().collection(COL_NOTAS_SALIDA).doc(idRegistro).delete();
  console.log('Nota de salida eliminada:', idRegistro);
}

// ============================================
// Salidas
// ============================================

const COL_SALIDAS = 'epp_salidas';

export interface Salida {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  refNotaSalida: string;
  refItem: string;
  cantidad: string;
  trabajadorRetira: string;
}

const SALIDA_FIELDS = ['fechaHora', 'userEmail', 'refNotaSalida', 'refItem', 'cantidad', 'trabajadorRetira'] as const;

function docToSalida(data: FirebaseFirestore.DocumentData): Salida {
  const s: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of SALIDA_FIELDS) s[f] = data[f] || '';
  return s as Salida;
}

export async function getAllSalidas(): Promise<Salida[]> {
  const snapshot = await getDb().collection(COL_SALIDAS).get();
  return snapshot.docs.map(doc => docToSalida(doc.data()));
}

export async function getSalidasByProyecto(obra: string): Promise<Salida[]> {
  const notas = await getNotasSalidaByProyecto(obra);
  const notasIds = new Set(notas.map(n => n.idRegistro));
  if (notasIds.size === 0) return [];
  const all = await getAllSalidas();
  return all.filter(s => notasIds.has(s.refNotaSalida));
}

export async function getSalidasByNota(refNotaSalida: string): Promise<Salida[]> {
  const snapshot = await getDb().collection(COL_SALIDAS).where('refNotaSalida', '==', refNotaSalida).get();
  return snapshot.docs.map(doc => docToSalida(doc.data()));
}

export async function getSalidasByTrabajador(trabajador: string): Promise<Salida[]> {
  const snapshot = await getDb().collection(COL_SALIDAS).where('trabajadorRetira', '==', trabajador).get();
  return snapshot.docs.map(doc => docToSalida(doc.data()));
}

export async function appendSalida(salida: Omit<Salida, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: salida.idRegistro };
  for (const f of SALIDA_FIELDS) data[f] = (salida as any)[f] || '';
  await getDb().collection(COL_SALIDAS).doc(salida.idRegistro).set(data);
}

export async function appendMultipleSalidas(salidas: Omit<Salida, 'rowIndex'>[]): Promise<void> {
  if (salidas.length === 0) return;
  const db = getDb();
  const batch = db.batch();
  for (const s of salidas) {
    const data: Record<string, string> = { idRegistro: s.idRegistro };
    for (const f of SALIDA_FIELDS) data[f] = (s as any)[f] || '';
    batch.set(db.collection(COL_SALIDAS).doc(s.idRegistro), data);
  }
  await batch.commit();
}

export async function updateSalida(idRegistro: string, salida: Partial<Pick<Salida, 'refItem' | 'cantidad' | 'trabajadorRetira'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of ['refItem', 'cantidad', 'trabajadorRetira'] as const) {
    if (salida[f] !== undefined) updates[f] = salida[f] as string;
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_SALIDAS).doc(idRegistro).set(updates, { merge: true });
  console.log('Salida actualizada:', idRegistro);
}

export async function deleteSalida(idRegistro: string): Promise<void> {
  await getDb().collection(COL_SALIDAS).doc(idRegistro).delete();
  console.log('Salida eliminada:', idRegistro);
}

// ============================================
// Solicitudes de Suministro
// ============================================

const COL_SOLICITUDES = 'epp_solicitudes_suministro';

export interface ItemSolicitud {
  item: string;
  producto: string;
  unidad: string;
  cantidad: string;
  cuenta: string;
  proveedor: string;
}

export interface SolicitudSuministro {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  numero: string;
  fecha: string;
  supervisor: string;
  actividad: string;
  ubicacion: string;
  proveedor: string;
  fechaLimiteEntrega: string;
  observaciones: string;
  items: ItemSolicitud[];
  estado: string;
}

const SOLICITUD_FIELDS = [
  'fechaHora', 'userEmail', 'proyecto', 'numero', 'fecha', 'supervisor', 'actividad',
  'ubicacion', 'proveedor', 'fechaLimiteEntrega', 'observaciones', 'estado',
] as const;

function docToSolicitud(data: FirebaseFirestore.DocumentData): SolicitudSuministro {
  const s: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of SOLICITUD_FIELDS) s[f] = data[f] || '';
  s.items = Array.isArray(data.items) ? data.items : [];
  if (!s.estado) s.estado = 'Pendiente';
  return s as SolicitudSuministro;
}

export async function getAllSolicitudesSuministro(): Promise<SolicitudSuministro[]> {
  const snapshot = await getDb().collection(COL_SOLICITUDES).get();
  return snapshot.docs.map(doc => docToSolicitud(doc.data()));
}

export async function getSolicitudesSuministroByProyecto(proyecto: string): Promise<SolicitudSuministro[]> {
  const snapshot = await getDb().collection(COL_SOLICITUDES).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToSolicitud(doc.data()));
}

export async function getSolicitudSuministroById(idRegistro: string): Promise<SolicitudSuministro | null> {
  const doc = await getDb().collection(COL_SOLICITUDES).doc(idRegistro).get();
  if (!doc.exists) return null;
  return docToSolicitud(doc.data()!);
}

export async function getNextNumeroSolicitud(): Promise<string> {
  const all = await getAllSolicitudesSuministro();
  const max = all.reduce((acc, s) => {
    const n = parseInt(s.numero, 10);
    return isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return String(max + 1).padStart(6, '0');
}

export async function appendSolicitudSuministro(solicitud: Omit<SolicitudSuministro, 'rowIndex'>): Promise<void> {
  const data: Record<string, any> = { idRegistro: solicitud.idRegistro, items: solicitud.items || [] };
  for (const f of SOLICITUD_FIELDS) data[f] = (solicitud as any)[f] || (f === 'estado' ? 'Pendiente' : '');
  await getDb().collection(COL_SOLICITUDES).doc(solicitud.idRegistro).set(data);
}

export async function updateSolicitudSuministro(idRegistro: string, solicitud: Partial<Omit<SolicitudSuministro, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, any> = {};
  for (const f of ['numero', 'fecha', 'supervisor', 'actividad', 'ubicacion', 'proveedor', 'fechaLimiteEntrega', 'observaciones', 'estado'] as const) {
    if ((solicitud as any)[f] !== undefined) updates[f] = (solicitud as any)[f];
  }
  if (solicitud.items !== undefined) updates.items = solicitud.items || [];
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_SOLICITUDES).doc(idRegistro).set(updates, { merge: true });
  console.log('Solicitud de suministro actualizada:', idRegistro);
}

export async function deleteSolicitudSuministro(idRegistro: string): Promise<void> {
  await getDb().collection(COL_SOLICITUDES).doc(idRegistro).delete();
  console.log('Solicitud de suministro eliminada:', idRegistro);
}

// ============================================
// Ajustes de Stock
// ============================================

const COL_AJUSTES = 'epp_ajustes_stock';

export interface AjusteStock {
  rowIndex: number; // siempre 0, compat
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  codigoProducto: string;
  cantidad: string;
  tipo: 'positivo' | 'negativo';
  motivo: string;
}

const AJUSTE_FIELDS = ['fechaHora', 'userEmail', 'proyecto', 'codigoProducto', 'cantidad', 'motivo'] as const;

function docToAjuste(data: FirebaseFirestore.DocumentData): AjusteStock {
  const a: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  for (const f of AJUSTE_FIELDS) a[f] = data[f] || '';
  a.tipo = data.tipo === 'negativo' ? 'negativo' : 'positivo';
  return a as AjusteStock;
}

export async function getAllAjustesStock(): Promise<AjusteStock[]> {
  const snapshot = await getDb().collection(COL_AJUSTES).get();
  return snapshot.docs.map(doc => docToAjuste(doc.data()));
}

export async function getAjustesStockByProyecto(proyecto: string): Promise<AjusteStock[]> {
  const snapshot = await getDb().collection(COL_AJUSTES).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToAjuste(doc.data()));
}

export async function appendAjusteStock(ajuste: Omit<AjusteStock, 'rowIndex'>): Promise<void> {
  const data: Record<string, string> = { idRegistro: ajuste.idRegistro, tipo: ajuste.tipo || 'positivo' };
  for (const f of AJUSTE_FIELDS) data[f] = (ajuste as any)[f] || '';
  await getDb().collection(COL_AJUSTES).doc(ajuste.idRegistro).set(data);
}

export async function updateAjusteStock(idRegistro: string, ajuste: Partial<Omit<AjusteStock, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, string> = {};
  for (const f of ['codigoProducto', 'cantidad', 'tipo', 'motivo'] as const) {
    if ((ajuste as any)[f] !== undefined) updates[f] = (ajuste as any)[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_AJUSTES).doc(idRegistro).set(updates, { merge: true });
  console.log('Ajuste de stock actualizado:', idRegistro);
}

export async function deleteAjusteStock(idRegistro: string): Promise<void> {
  await getDb().collection(COL_AJUSTES).doc(idRegistro).delete();
  console.log('Ajuste de stock eliminado:', idRegistro);
}

// ============================================
// Cascadas por cambio de codigo de producto
// ============================================

export async function updateEntradasCodigo(oldCodigo: string, newCodigo: string): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection(COL_ENTRADAS).where('codigo', '==', oldCodigo).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.update(doc.ref, { codigo: newCodigo }));
  await batch.commit();
  console.log(`Actualizado codigo de ${snapshot.size} entradas de ${oldCodigo} a ${newCodigo}`);
}

export async function updateSalidasRefItem(oldRefItem: string, newRefItem: string): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection(COL_SALIDAS).where('refItem', '==', oldRefItem).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.update(doc.ref, { refItem: newRefItem }));
  await batch.commit();
  console.log(`Actualizado refItem de ${snapshot.size} salidas de ${oldRefItem} a ${newRefItem}`);
}

export async function updateAjustesCodigoProducto(oldCodigo: string, newCodigo: string): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection(COL_AJUSTES).where('codigoProducto', '==', oldCodigo).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.update(doc.ref, { codigoProducto: newCodigo }));
  await batch.commit();
  console.log(`Actualizado codigoProducto de ${snapshot.size} ajustes de ${oldCodigo} a ${newCodigo}`);
}
