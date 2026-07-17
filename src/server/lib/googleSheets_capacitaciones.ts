import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEETS_KEY_PATH || '/home/syso_sergiojimenez/credentials/service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';
const SHEET_CAPACITACIONES = 'CAPACITACIONES';

export interface Capacitacion {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  titulo: string;
  fechaProgramada: string;
  hora: string;
  lugar: string;
  responsable: string;
  tipo: string;
  estado: string;
  fechaRealizada: string;
  asistentes: string;
  observaciones: string;
  evidenciaPDF: string;
  temasTratados: string;
  imagenesAsistencia: string;
}

function rowToCapacitacion(row: any[], index: number): Capacitacion {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHora: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    titulo: row[4] || '',
    fechaProgramada: row[5] || '',
    hora: row[6] || '',
    lugar: row[7] || '',
    responsable: row[8] || '',
    tipo: row[9] || '',
    estado: row[10] || 'Pendiente',
    fechaRealizada: row[11] || '',
    asistentes: row[12] || '',
    observaciones: row[13] || '',
    evidenciaPDF: row[14] || '',
    temasTratados: row[15] || '',
    imagenesAsistencia: row[16] || '',
  };
}

export async function getAllCapacitaciones(): Promise<Capacitacion[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CAPACITACIONES}!A2:Q`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToCapacitacion(row, index));
}

export async function getCapacitacionesByProyecto(proyecto: string): Promise<Capacitacion[]> {
  const all = await getAllCapacitaciones();
  return all.filter(c => c.proyecto === proyecto);
}

export async function appendCapacitacion(cap: Omit<Capacitacion, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CAPACITACIONES}!A1:Q1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      cap.idRegistro, cap.fechaHora, cap.userEmail,
      cap.proyecto, cap.titulo, cap.fechaProgramada,
      cap.hora, cap.lugar, cap.responsable,
      cap.tipo, cap.estado, cap.fechaRealizada,
      cap.asistentes, cap.observaciones, cap.evidenciaPDF,
      cap.temasTratados, cap.imagenesAsistencia
    ]] },
  });
}

export async function updateCapacitacion(
  rowIndex: number,
  cap: Partial<Omit<Capacitacion, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    'E': cap.titulo || '',
    'F': cap.fechaProgramada || '',
    'G': cap.hora || '',
    'H': cap.lugar || '',
    'I': cap.responsable || '',
    'J': cap.tipo || '',
    'K': cap.estado || '',
    'L': cap.fechaRealizada || '',
    'M': cap.asistentes || '',
    'N': cap.observaciones || '',
    'O': cap.evidenciaPDF || '',
    'P': cap.temasTratados || '',
    'Q': cap.imagenesAsistencia || '',
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== '') {
      updates.push({
        range: `${SHEET_CAPACITACIONES}!${col}${rowIndex}`,
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

export async function deleteCapacitacion(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CAPACITACIONES}!A${rowIndex}:Q${rowIndex}`,
  });
}
