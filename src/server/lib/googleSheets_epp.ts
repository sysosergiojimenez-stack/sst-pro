import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEETS_KEY_PATH || '/home/syso_sergiojimenez/credentials/service-account.json',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/devstorage.read_write',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });

// ============================================
// Marcaciones Biometricas
// ============================================
const SHEET_MARCACIONES = 'MARCACIONES_BIOMETRICAS';

export interface MarcacionBiometrica {
  rowIndex: number;
  nroDocumento: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  horasRaw: string;
  fechaCarga: string;
  proyecto: string;
}

function rowToMarcacion(row: any[], index: number): MarcacionBiometrica {
  return {
    rowIndex: index + 2,
    nroDocumento: row[0] || '',
    fecha: row[1] || '',
    horaEntrada: row[2] || '',
    horaSalida: row[3] || '',
    horasRaw: row[4] || '',
    fechaCarga: row[5] || '',
    proyecto: row[6] || '',
  };
}

export async function getAllMarcacionesBiometricas(): Promise<MarcacionBiometrica[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MARCACIONES}!A2:G`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToMarcacion(row, index));
}

export async function importarMarcacionesBiometricas(
  registros: Array<{ nroDocumento: string; fecha: string; horaEntrada: string; horaSalida: string; horasRaw: string; proyecto: string }>
): Promise<{ actualizados: number; nuevos: number }> {
  const existentes = await getAllMarcacionesBiometricas();
  const mapaExistentes = new Map(existentes.map(m => [`${m.nroDocumento}|${m.fecha}|${m.proyecto}`, m]));
  const hoy = new Date().toISOString().split('T')[0];

  let actualizados = 0;
  let nuevos = 0;
  const nuevasFilas: string[][] = [];
  const actualizaciones: { range: string; values: string[][] }[] = [];

  for (const reg of registros) {
    const clave = `${reg.nroDocumento}|${reg.fecha}|${reg.proyecto}`;
    const existente = mapaExistentes.get(clave);
    if (existente) {
      actualizaciones.push({
        range: `${SHEET_MARCACIONES}!C${existente.rowIndex}:G${existente.rowIndex}`,
        values: [[reg.horaEntrada, reg.horaSalida, reg.horasRaw, hoy, reg.proyecto]],
      });
      actualizados++;
    } else {
      nuevasFilas.push([reg.nroDocumento, reg.fecha, reg.horaEntrada, reg.horaSalida, reg.horasRaw, hoy, reg.proyecto]);
      nuevos++;
    }
  }

  if (actualizaciones.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: actualizaciones },
    });
  }
  if (nuevasFilas.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_MARCACIONES}!A1:G1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: nuevasFilas },
    });
  }

  return { actualizados, nuevos };
}

export async function updateMarcacionBiometrica(
  rowIndex: number,
  datos: Partial<Pick<MarcacionBiometrica, 'horaEntrada' | 'horaSalida' | 'horasRaw'>>
): Promise<void> {
  const updates: { range: string; values: string[][] }[] = [];
  if (datos.horaEntrada !== undefined) {
    updates.push({ range: `${SHEET_MARCACIONES}!C${rowIndex}`, values: [[datos.horaEntrada]] });
  }
  if (datos.horaSalida !== undefined) {
    updates.push({ range: `${SHEET_MARCACIONES}!D${rowIndex}`, values: [[datos.horaSalida]] });
  }
  if (datos.horasRaw !== undefined) {
    updates.push({ range: `${SHEET_MARCACIONES}!E${rowIndex}`, values: [[datos.horasRaw]] });
  }
  if (updates.length === 0) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
}
