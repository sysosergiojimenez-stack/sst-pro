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

const SHEET_NAME = 'DECLARACIONES_IPS';

const HEADERS = [
  'ID_REGISTRO', 'FECHA_HORA_REGISTRO', 'USER_EMAIL', 'PROYECTO',
  'PERIODO', 'URL_PDF', 'LISTA_CICS', 'TOTAL_EMPLEADOS',
];

export interface DeclaracionIPS {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  periodo: string;
  urlPDF: string;
  listaCICs: string;
  totalEmpleados: string;
}

let sheetEnsured = false;

async function ensureSheet(): Promise<void> {
  if (sheetEnsured) return;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existe = meta.data.sheets?.some(s => s.properties?.title === SHEET_NAME);
    if (!existe) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:H1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] },
      });
    }
    sheetEnsured = true;
  } catch (error) {
    console.error('Error ensuring DECLARACIONES_IPS sheet:', error);
    throw error;
  }
}

function rowToDeclaracionIPS(row: any[], index: number): DeclaracionIPS {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHoraRegistro: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    periodo: row[4] || '',
    urlPDF: row[5] || '',
    listaCICs: row[6] || '',
    totalEmpleados: row[7] || '',
  };
}

export async function getAllDeclaracionesIPS(): Promise<DeclaracionIPS[]> {
  await ensureSheet();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:H`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToDeclaracionIPS(row, index));
}

export async function getDeclaracionesIPSByProyecto(proyecto: string): Promise<DeclaracionIPS[]> {
  const all = await getAllDeclaracionesIPS();
  return all.filter(d => d.proyecto === proyecto);
}

export async function appendDeclaracionIPS(declaracion: Omit<DeclaracionIPS, 'rowIndex'>): Promise<number> {
  await ensureSheet();
  const values = [[
    declaracion.idRegistro,
    declaracion.fechaHoraRegistro,
    declaracion.userEmail,
    declaracion.proyecto,
    declaracion.periodo,
    declaracion.urlPDF,
    declaracion.listaCICs,
    declaracion.totalEmpleados,
  ]];
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
  const updatedRange = response.data.updates?.updatedRange;
  const rowIndex = updatedRange ? parseInt(updatedRange.split('!')[1].split(':')[0].replace(/[^0-9]/g, '')) : 0;
  console.log('Declaracion IPS agregada en fila:', rowIndex);
  return rowIndex;
}
