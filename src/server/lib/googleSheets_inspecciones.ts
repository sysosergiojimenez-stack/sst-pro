import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEETS_KEY_PATH || '/home/syso_sergiojimenez/credentials/service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';
const SHEET_INSPECCIONES = 'INSPECCIONES';
const SHEET_INSPECCIONES_ITEMS = 'INSPECCIONES_ITEMS';

export interface Inspeccion {
  rowIndex: number;
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

export interface InspeccionItem {
  rowIndex: number;
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

function rowToInspeccion(row: any[], index: number): Inspeccion {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHora: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    fechaProgramada: row[4] || '',
    inspector: row[5] || '',
    estado: row[6] || 'Programada',
    fechaRealizada: row[7] || '',
    observacionesGenerales: row[8] || '',
    idTemplateChecklist: row[9] || '',
    areaEquipo: row[10] || '',
  };
}

function rowToInspeccionItem(row: any[], index: number): InspeccionItem {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    idInspeccion: row[1] || '',
    item: row[2] || '',
    resultado: row[3] || '',
    observacion: row[4] || '',
    fotos: row[5] || '',
    accionCorrectiva: row[6] || '',
    responsableAccion: row[7] || '',
    fechaLimite: row[8] || '',
    estadoAccion: row[9] || '',
  };
}

export async function getAllInspecciones(): Promise<Inspeccion[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_INSPECCIONES}!A2:K`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToInspeccion(row, index));
}

export async function getInspeccionesByProyecto(proyecto: string): Promise<Inspeccion[]> {
  const all = await getAllInspecciones();
  return all.filter(i => i.proyecto === proyecto);
}

export async function appendInspeccion(insp: Omit<Inspeccion, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_INSPECCIONES}!A1:K1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      insp.idRegistro, insp.fechaHora, insp.userEmail,
      insp.proyecto, insp.fechaProgramada, insp.inspector,
      insp.estado, insp.fechaRealizada, insp.observacionesGenerales,
      insp.idTemplateChecklist, insp.areaEquipo
    ]] },
  });
}

export async function updateInspeccion(
  rowIndex: number,
  insp: Partial<Omit<Inspeccion, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    'E': insp.fechaProgramada ?? '',
    'F': insp.inspector ?? '',
    'G': insp.estado ?? '',
    'H': insp.fechaRealizada ?? '',
    'I': insp.observacionesGenerales ?? '',
    'J': insp.idTemplateChecklist ?? '',
    'K': insp.areaEquipo ?? '',
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== '') {
      updates.push({ range: `${SHEET_INSPECCIONES}!${col}${rowIndex}`, values: [[val]] });
    }
  }
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { data: updates, valueInputOption: 'RAW' },
    });
  }
}

export async function deleteInspeccion(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_INSPECCIONES}!A${rowIndex}:I${rowIndex}`,
  });
}

export async function getAllInspeccionItems(): Promise<InspeccionItem[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_INSPECCIONES_ITEMS}!A2:J`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToInspeccionItem(row, index));
}

export async function getItemsByInspeccion(idInspeccion: string): Promise<InspeccionItem[]> {
  const all = await getAllInspeccionItems();
  return all.filter(i => i.idInspeccion === idInspeccion);
}

export async function appendInspeccionItemsBatch(items: Omit<InspeccionItem, 'rowIndex'>[]): Promise<void> {
  if (items.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_INSPECCIONES_ITEMS}!A1:J1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: items.map(it => [
      it.idRegistro, it.idInspeccion, it.item, it.resultado,
      it.observacion, it.fotos, it.accionCorrectiva,
      it.responsableAccion, it.fechaLimite, it.estadoAccion
    ]) },
  });
}

export async function deleteItemsByInspeccion(idInspeccion: string): Promise<void> {
  const all = await getAllInspeccionItems();
  const rowsToDelete = all.filter(i => i.idInspeccion === idInspeccion).map(i => i.rowIndex).sort((a, b) => b - a);
  for (const rowIndex of rowsToDelete) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_INSPECCIONES_ITEMS}!A${rowIndex}:J${rowIndex}`,
    });
  }
}

// ============================================
// Checklist maestro (items base editables)
// ============================================
const SHEET_CHECKLIST_TEMPLATE = 'CHECKLIST_ITEMS_TEMPLATE';

export interface ChecklistTemplateItem {
  rowIndex: number;
  id: string;
  idTemplate: string;
  texto: string;
  orden: number;
  activo: string;
}

function rowToTemplateItem(row: any[], index: number): ChecklistTemplateItem {
  return {
    rowIndex: index + 2,
    id: row[0] || '',
    idTemplate: row[1] || '',
    texto: row[2] || '',
    orden: parseInt(row[3]) || 0,
    activo: row[4] || 'TRUE',
  };
}

export async function getChecklistTemplate(idTemplate?: string): Promise<ChecklistTemplateItem[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKLIST_TEMPLATE}!A2:E`,
  });
  const rows = response.data.values || [];
  let items = rows.map((row, index) => rowToTemplateItem(row, index))
    .sort((a, b) => a.orden - b.orden);
  if (idTemplate) items = items.filter(i => i.idTemplate === idTemplate);
  return items;
}

export async function appendChecklistTemplateItem(item: Omit<ChecklistTemplateItem, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKLIST_TEMPLATE}!A1:E1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[item.id, item.idTemplate, item.texto, item.orden, item.activo]] },
  });
}

export async function updateChecklistTemplateItem(
  rowIndex: number,
  item: Partial<Omit<ChecklistTemplateItem, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  if (item.idTemplate !== undefined) updates.push({ range: `${SHEET_CHECKLIST_TEMPLATE}!B${rowIndex}`, values: [[item.idTemplate]] });
  if (item.texto !== undefined) updates.push({ range: `${SHEET_CHECKLIST_TEMPLATE}!C${rowIndex}`, values: [[item.texto]] });
  if (item.orden !== undefined) updates.push({ range: `${SHEET_CHECKLIST_TEMPLATE}!D${rowIndex}`, values: [[item.orden]] });
  if (item.activo !== undefined) updates.push({ range: `${SHEET_CHECKLIST_TEMPLATE}!E${rowIndex}`, values: [[item.activo]] });
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { data: updates, valueInputOption: 'RAW' },
    });
  }
}

export async function deleteChecklistTemplateItem(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKLIST_TEMPLATE}!A${rowIndex}:E${rowIndex}`,
  });
}

// ============================================
// Grupos de Checklist (Templates con nombre)
// ============================================
const SHEET_CHECKLIST_TEMPLATES = 'CHECKLIST_TEMPLATES';

export interface ChecklistTemplateGroup {
  rowIndex: number;
  id: string;
  nombre: string;
  activo: string;
}

function rowToTemplateGroup(row: any[], index: number): ChecklistTemplateGroup {
  return {
    rowIndex: index + 2,
    id: row[0] || '',
    nombre: row[1] || '',
    activo: row[2] || 'TRUE',
  };
}

export async function getChecklistTemplateGroups(): Promise<ChecklistTemplateGroup[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKLIST_TEMPLATES}!A2:C`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToTemplateGroup(row, index));
}

export async function appendChecklistTemplateGroup(group: Omit<ChecklistTemplateGroup, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKLIST_TEMPLATES}!A1:C1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[group.id, group.nombre, group.activo]] },
  });
}

export async function updateChecklistTemplateGroup(
  rowIndex: number,
  group: Partial<Omit<ChecklistTemplateGroup, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  if (group.nombre !== undefined) updates.push({ range: `${SHEET_CHECKLIST_TEMPLATES}!B${rowIndex}`, values: [[group.nombre]] });
  if (group.activo !== undefined) updates.push({ range: `${SHEET_CHECKLIST_TEMPLATES}!C${rowIndex}`, values: [[group.activo]] });
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { data: updates, valueInputOption: 'RAW' },
    });
  }
}

export async function deleteChecklistTemplateGroup(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKLIST_TEMPLATES}!A${rowIndex}:C${rowIndex}`,
  });
}
