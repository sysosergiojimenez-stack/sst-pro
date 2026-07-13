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

const SHEET_NAME = 'INCIDENTES';

export interface Incidente {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  fechaIncidente: string;
  horaIncidente: string;
  lugar: string;
  tipo: string;
  clasificacion: string;
  descripcion: string;
  personasInvolucradas: string;
  causasInmediatas: string;
  causasRaiz: string;
  accionesCorrectivas: string;
  responsableAcciones: string;
  fechaCompromiso: string;
  estado: string;
  evidencias: string;
  investigador: string;
  fechaCierre: string;
  diasPerdidos: string;
  costoEstimado: string;
}

function rowToIncidente(row: any[], index: number): Incidente {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHoraRegistro: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    fechaIncidente: row[4] || '',
    horaIncidente: row[5] || '',
    lugar: row[6] || '',
    tipo: row[7] || '',
    clasificacion: row[8] || '',
    descripcion: row[9] || '',
    personasInvolucradas: row[10] || '',
    causasInmediatas: row[11] || '',
    causasRaiz: row[12] || '',
    accionesCorrectivas: row[13] || '',
    responsableAcciones: row[14] || '',
    fechaCompromiso: row[15] || '',
    estado: row[16] || 'Abierto',
    evidencias: row[17] || '',
    investigador: row[18] || '',
    fechaCierre: row[19] || '',
    diasPerdidos: row[20] || '',
    costoEstimado: row[21] || '',
  };
}

export async function getAllIncidentes(): Promise<Incidente[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:V`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToIncidente(row, index));
}

export async function getIncidentesByProyecto(proyecto: string): Promise<Incidente[]> {
  const all = await getAllIncidentes();
  return all.filter(i => i.proyecto === proyecto);
}

export async function getIncidenteById(idRegistro: string): Promise<Incidente | null> {
  const all = await getAllIncidentes();
  return all.find(i => i.idRegistro === idRegistro) || null;
}

export async function getIncidenteByRowIndex(rowIndex: number): Promise<Incidente | null> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex}:V${rowIndex}`,
  });
  const rows = response.data.values || [];
  if (rows.length === 0) return null;
  return rowToIncidente(rows[0], rowIndex - 2);
}

export async function appendIncidente(incidente: Omit<Incidente, 'rowIndex'>): Promise<void> {
  const values = [
    incidente.idRegistro,
    incidente.fechaHoraRegistro,
    incidente.userEmail,
    incidente.proyecto,
    incidente.fechaIncidente,
    incidente.horaIncidente,
    incidente.lugar,
    incidente.tipo,
    incidente.clasificacion,
    incidente.descripcion,
    incidente.personasInvolucradas,
    incidente.causasInmediatas,
    incidente.causasRaiz,
    incidente.accionesCorrectivas,
    incidente.responsableAcciones,
    incidente.fechaCompromiso,
    incidente.estado,
    incidente.evidencias,
    incidente.investigador,
    incidente.fechaCierre,
    incidente.diasPerdidos,
    incidente.costoEstimado,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:V`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function updateIncidente(
  rowIndex: number,
  incidente: Partial<Omit<Incidente, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    idRegistro: 'A',
    fechaHoraRegistro: 'B',
    userEmail: 'C',
    proyecto: 'D',
    fechaIncidente: 'E',
    horaIncidente: 'F',
    lugar: 'G',
    tipo: 'H',
    clasificacion: 'I',
    descripcion: 'J',
    personasInvolucradas: 'K',
    causasInmediatas: 'L',
    causasRaiz: 'M',
    accionesCorrectivas: 'N',
    responsableAcciones: 'O',
    fechaCompromiso: 'P',
    estado: 'Q',
    evidencias: 'R',
    investigador: 'S',
    fechaCierre: 'T',
    diasPerdidos: 'U',
    costoEstimado: 'V',
  };

  for (const [key, col] of Object.entries(fields)) {
    if ((incidente as any)[key] !== undefined) {
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[(incidente as any)[key]]] },
      }));
    }
  }

  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Incidente actualizado en fila:', rowIndex);
}

export async function deleteIncidente(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex}:V${rowIndex}`,
  });
  console.log('Incidente eliminado en fila:', rowIndex);
}
