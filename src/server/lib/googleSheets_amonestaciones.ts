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

const SHEET_NAME = 'AMONESTACIONES';

const HEADERS = [
  'ID_REGISTRO', 'FECHA_HORA_REGISTRO', 'USER_EMAIL', 'PROYECTO',
  'NOMBRE_APELLIDO', 'CEDULA', 'EMPRESA', 'CARGO',
  'FECHA_FALTA', 'FECHA_NOTIFICACION', 'DESCRIPCION_FALTA', 'DISPOSICION_REGLAMENTO',
  'CLASIFICACION', 'ANTECEDENTES', 'SANCION', 'DIAS_SUSPENSION',
  'ESTADO', 'EMPLEADO_DOCUMENTO',
];

export interface Amonestacion {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  nombreApellido: string;
  cedula: string;
  empresa: string;
  cargo: string;
  fechaFalta: string;
  fechaNotificacion: string;
  descripcionFalta: string;
  disposicionReglamento: string;
  clasificacion: string;
  antecedentes: string;
  sancion: string;
  diasSuspension: string;
  estado: string;
  empleadoDocumento: string;
}

let sheetEnsured = false;

async function ensureSheet(): Promise<void> {
  if (sheetEnsured) return;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existe = meta.data.sheets?.some(s => s.properties?.title === SHEET_NAME);
  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:R1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
  sheetEnsured = true;
}

async function getSheetId(): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error(`Hoja ${SHEET_NAME} no encontrada`);
  }
  return sheet.properties.sheetId;
}

function rowToAmonestacion(row: any[], index: number): Amonestacion {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHoraRegistro: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    nombreApellido: row[4] || '',
    cedula: row[5] || '',
    empresa: row[6] || '',
    cargo: row[7] || '',
    fechaFalta: row[8] || '',
    fechaNotificacion: row[9] || '',
    descripcionFalta: row[10] || '',
    disposicionReglamento: row[11] || '',
    clasificacion: row[12] || '',
    antecedentes: row[13] || '',
    sancion: row[14] || '',
    diasSuspension: row[15] || '',
    estado: row[16] || 'Pendiente de Firma',
    empleadoDocumento: row[17] || '',
  };
}

export async function getAllAmonestaciones(): Promise<Amonestacion[]> {
  await ensureSheet();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:R`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToAmonestacion(row, index));
}

export async function getAmonestacionesByProyecto(proyecto: string): Promise<Amonestacion[]> {
  const all = await getAllAmonestaciones();
  return all.filter(a => a.proyecto === proyecto);
}

export async function getAmonestacionById(idRegistro: string): Promise<Amonestacion | null> {
  const all = await getAllAmonestaciones();
  return all.find(a => a.idRegistro === idRegistro) || null;
}

export async function appendAmonestacion(amonestacion: Omit<Amonestacion, 'rowIndex'>): Promise<void> {
  await ensureSheet();
  const values = [
    amonestacion.idRegistro,
    amonestacion.fechaHoraRegistro,
    amonestacion.userEmail,
    amonestacion.proyecto,
    amonestacion.nombreApellido,
    amonestacion.cedula,
    amonestacion.empresa,
    amonestacion.cargo,
    amonestacion.fechaFalta,
    amonestacion.fechaNotificacion,
    amonestacion.descripcionFalta,
    amonestacion.disposicionReglamento,
    amonestacion.clasificacion,
    amonestacion.antecedentes,
    amonestacion.sancion,
    amonestacion.diasSuspension,
    amonestacion.estado,
    amonestacion.empleadoDocumento,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:R`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function updateAmonestacion(
  rowIndex: number,
  amonestacion: Partial<Omit<Amonestacion, 'rowIndex'>>
): Promise<void> {
  await ensureSheet();
  const fields: Record<string, string> = {
    idRegistro: 'A',
    fechaHoraRegistro: 'B',
    userEmail: 'C',
    proyecto: 'D',
    nombreApellido: 'E',
    cedula: 'F',
    empresa: 'G',
    cargo: 'H',
    fechaFalta: 'I',
    fechaNotificacion: 'J',
    descripcionFalta: 'K',
    disposicionReglamento: 'L',
    clasificacion: 'M',
    antecedentes: 'N',
    sancion: 'O',
    diasSuspension: 'P',
    estado: 'Q',
    empleadoDocumento: 'R',
  };

  const updates = [];
  for (const [key, col] of Object.entries(fields)) {
    if ((amonestacion as any)[key] !== undefined) {
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[(amonestacion as any)[key]]] },
      }));
    }
  }

  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Amonestacion actualizada en fila:', rowIndex);
}

export async function deleteAmonestacion(rowIndex: number): Promise<void> {
  await ensureSheet();
  const sheetId = await getSheetId();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  });
  console.log('Amonestacion eliminada en fila:', rowIndex);
}
