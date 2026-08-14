import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEETS_KEY_PATH || '/home/syso_sergiojimenez/credentials/service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';
const SHEET_TAREAS = 'BITACORA_TAREAS';

export interface BitacoraTarea {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  idBitacora: string;
  descripcion: string;
  estado: 'pendiente' | 'completada';
  fotosAntes: string;
  fotosDespues: string;
  fechaCompletado: string;
  completadosPor: string;
}

function rowToTarea(row: any[], index: number): BitacoraTarea {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHora: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    idBitacora: row[4] || '',
    descripcion: row[5] || '',
    estado: (row[6] as 'pendiente' | 'completada') || 'pendiente',
    fotosAntes: row[7] || '',
    fotosDespues: row[8] || '',
    fechaCompletado: row[9] || '',
    completadosPor: row[10] || '',
  };
}

export async function getAllTareas(): Promise<BitacoraTarea[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAREAS}!A2:K`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToTarea(row, index));
}

export async function getTareasByProyecto(proyecto: string): Promise<BitacoraTarea[]> {
  const all = await getAllTareas();
  return all.filter(t => t.proyecto === proyecto);
}

export async function getTareasByBitacora(idBitacora: string): Promise<BitacoraTarea[]> {
  const all = await getAllTareas();
  return all.filter(t => t.idBitacora === idBitacora);
}

export async function appendTarea(tarea: Omit<BitacoraTarea, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAREAS}!A1:K1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      tarea.idRegistro, tarea.fechaHora, tarea.userEmail,
      tarea.proyecto, tarea.idBitacora, tarea.descripcion,
      tarea.estado, tarea.fotosAntes, tarea.fotosDespues,
      tarea.fechaCompletado, tarea.completadosPor
    ]] },
  });
}

export async function updateTarea(
  rowIndex: number,
  tarea: Partial<Omit<BitacoraTarea, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    'E': tarea.idBitacora ?? '',
    'F': tarea.descripcion ?? '',
    'G': tarea.estado ?? '',
    'H': tarea.fotosAntes ?? '',
    'I': tarea.fotosDespues ?? '',
    'J': tarea.fechaCompletado ?? '',
    'K': tarea.completadosPor ?? '',
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== '') {
      updates.push({
        range: `${SHEET_TAREAS}!${col}${rowIndex}`,
        values: [[val]],
      });
    }
  }
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { data: updates, valueInputOption: 'RAW' },
    });
  }
}

export async function deleteTarea(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAREAS}!A${rowIndex}:K${rowIndex}`,
  });
}
