import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEETS_KEY_PATH || '/home/syso_sergiojimenez/credentials/service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';
const SHEET_BITACORA = 'BITACORA';

export interface BitacoraEntrada {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  fecha: string;
  descripcionTrabajo: string;
  ubicacionArea: string;
  realizadoPor: string;
  fotos: string;
}

function rowToBitacora(row: any[], index: number): BitacoraEntrada {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHora: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    fecha: row[4] || '',
    descripcionTrabajo: row[5] || '',
    ubicacionArea: row[6] || '',
    realizadoPor: row[7] || '',
    fotos: row[8] || '',
  };
}

export async function getAllBitacora(): Promise<BitacoraEntrada[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_BITACORA}!A2:I`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToBitacora(row, index));
}

export async function getBitacoraByProyecto(proyecto: string): Promise<BitacoraEntrada[]> {
  const all = await getAllBitacora();
  return all.filter(b => b.proyecto === proyecto);
}

export async function appendBitacora(entrada: Omit<BitacoraEntrada, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_BITACORA}!A1:I1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      entrada.idRegistro, entrada.fechaHora, entrada.userEmail,
      entrada.proyecto, entrada.fecha, entrada.descripcionTrabajo,
      entrada.ubicacionArea, entrada.realizadoPor, entrada.fotos
    ]] },
  });
}

export async function updateBitacora(
  rowIndex: number,
  entrada: Partial<Omit<BitacoraEntrada, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    'E': entrada.fecha ?? '',
    'F': entrada.descripcionTrabajo ?? '',
    'G': entrada.ubicacionArea ?? '',
    'H': entrada.realizadoPor ?? '',
    'I': entrada.fotos ?? '',
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== '') {
      updates.push({
        range: `${SHEET_BITACORA}!${col}${rowIndex}`,
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

export async function deleteBitacora(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_BITACORA}!A${rowIndex}:I${rowIndex}`,
  });
}
