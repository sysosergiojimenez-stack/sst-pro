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

const SHEET_MENSUAL = 'IndicadoresMensual';
const SHEET_METAS = 'IndicadoresMetas';

const HEADERS_MENSUAL = [
  'ID_REGISTRO', 'FECHA_HORA_REGISTRO', 'USER_EMAIL', 'PROYECTO', 'MES',
  'HORAS_HOMBRE', 'ACCIDENTES_CON_BAJA', 'DIAS_PERDIDOS',
  'CAPACITACIONES_PLANIFICADAS', 'CAPACITACIONES_REALIZADAS',
  'INSPECCIONES_PLANIFICADAS', 'INSPECCIONES_REALIZADAS',
  'HALLAZGOS_ABIERTOS', 'HALLAZGOS_CERRADOS_EN_PLAZO', 'REPORTES_CUASI_ACCIDENTES',
  'CIPA_ACTIVA', 'REQUISITOS_LEGALES_CUMPLIDOS', 'REQUISITOS_LEGALES_APLICABLES',
];

const HEADERS_METAS = ['CODIGO', 'META', 'ACTUALIZADO_POR', 'ACTUALIZADO_EN'];

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

export interface IndicadorMensual {
  rowIndex: number;
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

export interface IndicadorMetaFila {
  rowIndex: number;
  codigo: string;
  meta: string;
  actualizadoPor: string;
  actualizadoEn: string;
}

let mensualEnsured = false;
let metasEnsured = false;

async function ensureSheetMensual(): Promise<void> {
  if (mensualEnsured) return;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existe = meta.data.sheets?.some(s => s.properties?.title === SHEET_MENSUAL);
  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_MENSUAL } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_MENSUAL}!A1:R1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS_MENSUAL] },
    });
  }
  mensualEnsured = true;
}

async function ensureSheetMetas(): Promise<void> {
  if (metasEnsured) return;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existe = meta.data.sheets?.some(s => s.properties?.title === SHEET_METAS);
  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_METAS } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_METAS}!A1:D1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS_METAS] },
    });
    const seed = METAS_DEFAULT.map(m => [m.codigo, String(m.meta), 'sistema', new Date().toISOString()]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_METAS}!A:D`,
      valueInputOption: 'RAW',
      requestBody: { values: seed },
    });
  }
  metasEnsured = true;
}

function rowToIndicadorMensual(row: any[], index: number): IndicadorMensual {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHoraRegistro: row[1] || '',
    userEmail: row[2] || '',
    proyecto: row[3] || '',
    mes: row[4] || '',
    horasHombre: Number(row[5]) || 0,
    accidentesConBaja: Number(row[6]) || 0,
    diasPerdidos: Number(row[7]) || 0,
    capacitacionesPlanificadas: Number(row[8]) || 0,
    capacitacionesRealizadas: Number(row[9]) || 0,
    inspeccionesPlanificadas: Number(row[10]) || 0,
    inspeccionesRealizadas: Number(row[11]) || 0,
    hallazgosAbiertos: Number(row[12]) || 0,
    hallazgosCerradosEnPlazo: Number(row[13]) || 0,
    reportesCuasiAccidentes: Number(row[14]) || 0,
    cipaActiva: row[15] || 'NO',
    requisitosLegalesCumplidos: Number(row[16]) || 0,
    requisitosLegalesAplicables: Number(row[17]) || 0,
  };
}

export async function getAllIndicadoresMensual(): Promise<IndicadorMensual[]> {
  await ensureSheetMensual();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MENSUAL}!A2:R`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToIndicadorMensual(row, index));
}

export async function getIndicadoresMensualByProyecto(proyecto: string): Promise<IndicadorMensual[]> {
  const all = await getAllIndicadoresMensual();
  return all.filter(i => i.proyecto === proyecto);
}

export async function appendIndicadorMensual(item: Omit<IndicadorMensual, 'rowIndex'>): Promise<void> {
  await ensureSheetMensual();
  const values = [
    item.idRegistro, item.fechaHoraRegistro, item.userEmail, item.proyecto, item.mes,
    item.horasHombre, item.accidentesConBaja, item.diasPerdidos,
    item.capacitacionesPlanificadas, item.capacitacionesRealizadas,
    item.inspeccionesPlanificadas, item.inspeccionesRealizadas,
    item.hallazgosAbiertos, item.hallazgosCerradosEnPlazo, item.reportesCuasiAccidentes,
    item.cipaActiva, item.requisitosLegalesCumplidos, item.requisitosLegalesAplicables,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MENSUAL}!A:R`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function updateIndicadorMensual(
  rowIndex: number,
  item: Partial<Omit<IndicadorMensual, 'rowIndex'>>
): Promise<void> {
  await ensureSheetMensual();
  const fields: Record<string, string> = {
    idRegistro: 'A', fechaHoraRegistro: 'B', userEmail: 'C', proyecto: 'D', mes: 'E',
    horasHombre: 'F', accidentesConBaja: 'G', diasPerdidos: 'H',
    capacitacionesPlanificadas: 'I', capacitacionesRealizadas: 'J',
    inspeccionesPlanificadas: 'K', inspeccionesRealizadas: 'L',
    hallazgosAbiertos: 'M', hallazgosCerradosEnPlazo: 'N', reportesCuasiAccidentes: 'O',
    cipaActiva: 'P', requisitosLegalesCumplidos: 'Q', requisitosLegalesAplicables: 'R',
  };

  const updates = [];
  for (const [key, col] of Object.entries(fields)) {
    if ((item as any)[key] !== undefined) {
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_MENSUAL}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[(item as any)[key]]] },
      }));
    }
  }
  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Indicador mensual actualizado en fila:', rowIndex);
}

export async function deleteIndicadorMensual(rowIndex: number): Promise<void> {
  await ensureSheetMensual();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === SHEET_MENSUAL);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined || sheetId === null) throw new Error(`Hoja ${SHEET_MENSUAL} no encontrada`);
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
  console.log('Indicador mensual eliminado en fila:', rowIndex);
}

function rowToIndicadorMetaFila(row: any[], index: number): IndicadorMetaFila {
  return {
    rowIndex: index + 2,
    codigo: row[0] || '',
    meta: row[1] ?? '',
    actualizadoPor: row[2] || '',
    actualizadoEn: row[3] || '',
  };
}

export async function getAllIndicadoresMetas(): Promise<IndicadorMetaFila[]> {
  await ensureSheetMetas();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_METAS}!A2:D`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToIndicadorMetaFila(row, index));
}

export async function updateIndicadorMeta(codigo: string, meta: string, actualizadoPor: string): Promise<void> {
  await ensureSheetMetas();
  const todas = await getAllIndicadoresMetas();
  const fila = todas.find(m => m.codigo === codigo);
  if (!fila) throw new Error(`Meta ${codigo} no encontrada`);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${SHEET_METAS}!B${fila.rowIndex}`, values: [[meta]] },
        { range: `${SHEET_METAS}!C${fila.rowIndex}`, values: [[actualizadoPor]] },
        { range: `${SHEET_METAS}!D${fila.rowIndex}`, values: [[new Date().toISOString()]] },
      ],
    },
  });
  console.log('Meta actualizada:', codigo, '=', meta);
}
