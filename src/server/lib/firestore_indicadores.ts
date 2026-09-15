import { getDb } from './firebaseAdmin';

// ============================================
// Carga Mensual de Indicadores
// ============================================

const COL_MENSUAL = 'indicadores_mensual';

export interface IndicadorMensual {
  rowIndex: number; // siempre 0, se mantiene solo por compatibilidad de tipos en el cliente
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  mes: string;
  horasHombre: number;
  accidentesConBaja: number;
  diasPerdidos: number;
  capacitacionesPlanificadas: number;
  capacitacionesRealizadas: number;
  inspeccionesPlanificadas: number;
  inspeccionesRealizadas: number;
  hallazgosAbiertos: number;
  hallazgosCerradosEnPlazo: number;
  reportesCuasiAccidentes: number;
  cipaActiva: string;
  requisitosLegalesCumplidos: number;
  requisitosLegalesAplicables: number;
}

const NUMERIC_FIELDS = [
  'horasHombre', 'accidentesConBaja', 'diasPerdidos', 'capacitacionesPlanificadas',
  'capacitacionesRealizadas', 'inspeccionesPlanificadas', 'inspeccionesRealizadas',
  'hallazgosAbiertos', 'hallazgosCerradosEnPlazo', 'reportesCuasiAccidentes',
  'requisitosLegalesCumplidos', 'requisitosLegalesAplicables',
] as const;

function docToIndicadorMensual(data: FirebaseFirestore.DocumentData): IndicadorMensual {
  const item: any = { rowIndex: 0, idRegistro: data.idRegistro || '' };
  item.fechaHoraRegistro = data.fechaHoraRegistro || '';
  item.userEmail = data.userEmail || '';
  item.proyecto = data.proyecto || '';
  item.mes = data.mes || '';
  item.cipaActiva = data.cipaActiva || 'NO';
  for (const f of NUMERIC_FIELDS) item[f] = Number(data[f]) || 0;
  return item as IndicadorMensual;
}

export async function getAllIndicadoresMensual(): Promise<IndicadorMensual[]> {
  const snapshot = await getDb().collection(COL_MENSUAL).get();
  return snapshot.docs.map(doc => docToIndicadorMensual(doc.data()));
}

export async function getIndicadoresMensualByProyecto(proyecto: string): Promise<IndicadorMensual[]> {
  const snapshot = await getDb().collection(COL_MENSUAL).where('proyecto', '==', proyecto).get();
  return snapshot.docs.map(doc => docToIndicadorMensual(doc.data()));
}

export async function appendIndicadorMensual(item: Omit<IndicadorMensual, 'rowIndex'>): Promise<void> {
  const data: Record<string, any> = {
    idRegistro: item.idRegistro, fechaHoraRegistro: item.fechaHoraRegistro,
    userEmail: item.userEmail, proyecto: item.proyecto, mes: item.mes, cipaActiva: item.cipaActiva || 'NO',
  };
  for (const f of NUMERIC_FIELDS) data[f] = item[f] || 0;
  await getDb().collection(COL_MENSUAL).doc(item.idRegistro).set(data);
}

export async function updateIndicadorMensual(idRegistro: string, item: Partial<Omit<IndicadorMensual, 'rowIndex'>>): Promise<void> {
  const updates: Record<string, any> = {};
  if (item.proyecto !== undefined) updates.proyecto = item.proyecto;
  if (item.mes !== undefined) updates.mes = item.mes;
  if (item.cipaActiva !== undefined) updates.cipaActiva = item.cipaActiva;
  for (const f of NUMERIC_FIELDS) {
    if (item[f] !== undefined) updates[f] = item[f];
  }
  if (Object.keys(updates).length === 0) return;
  await getDb().collection(COL_MENSUAL).doc(idRegistro).set(updates, { merge: true });
  console.log('Indicador mensual actualizado:', idRegistro);
}

export async function deleteIndicadorMensual(idRegistro: string): Promise<void> {
  await getDb().collection(COL_MENSUAL).doc(idRegistro).delete();
  console.log('Indicador mensual eliminado:', idRegistro);
}

// ============================================
// Metas de Indicadores
// ============================================

const COL_METAS = 'indicadores_metas';

export interface IndicadorMetaFila {
  rowIndex: number; // siempre 0, compat
  codigo: string;
  meta: string;
  actualizadoPor: string;
  actualizadoEn: string;
}

// Metas por defecto segun SST-IND-01 (Matriz de Indicadores). IND-06 no tiene
// meta numerica (es informativo, se sigue por tendencia).
const METAS_DEFAULT: { codigo: string; meta: number | '' }[] = [
  { codigo: 'IND-01', meta: 15 },
  { codigo: 'IND-02', meta: 150 },
  { codigo: 'IND-03', meta: 0.95 },
  { codigo: 'IND-04', meta: 0.95 },
  { codigo: 'IND-05', meta: 0.9 },
  { codigo: 'IND-06', meta: '' },
  { codigo: 'IND-07', meta: 1 },
  { codigo: 'IND-08', meta: 1 },
];

export async function getAllIndicadoresMetas(): Promise<IndicadorMetaFila[]> {
  const db = getDb();
  const snapshot = await db.collection(COL_METAS).get();
  if (snapshot.empty) {
    const batch = db.batch();
    const ahora = new Date().toISOString();
    for (const m of METAS_DEFAULT) {
      batch.set(db.collection(COL_METAS).doc(m.codigo), {
        codigo: m.codigo, meta: String(m.meta), actualizadoPor: 'sistema', actualizadoEn: ahora,
      });
    }
    await batch.commit();
    return METAS_DEFAULT.map(m => ({ rowIndex: 0, codigo: m.codigo, meta: String(m.meta), actualizadoPor: 'sistema', actualizadoEn: ahora }));
  }
  return snapshot.docs.map(doc => {
    const d = doc.data();
    return { rowIndex: 0, codigo: d.codigo || doc.id, meta: d.meta ?? '', actualizadoPor: d.actualizadoPor || '', actualizadoEn: d.actualizadoEn || '' };
  });
}

export async function updateIndicadorMeta(codigo: string, meta: string, actualizadoPor: string): Promise<void> {
  const db = getDb();
  const doc = await db.collection(COL_METAS).doc(codigo).get();
  if (!doc.exists) {
    // Asegura que existan las metas por defecto antes de actualizar.
    await getAllIndicadoresMetas();
  }
  await db.collection(COL_METAS).doc(codigo).set({
    codigo, meta, actualizadoPor, actualizadoEn: new Date().toISOString(),
  }, { merge: true });
  console.log('Meta actualizada:', codigo, '=', meta);
}
