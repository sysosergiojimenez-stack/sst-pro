import sys

with open('src/server/lib/googleSheets_capacitaciones.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

ancla = "export async function deleteCapacitacion(rowIndex: number): Promise<void> {"

if ancla not in contenido:
    print("ERROR: no encontre el punto de insercion. No se modifico nada.")
    sys.exit(1)

nuevo_bloque = '''// ============================================
// Asistencias de Capacitacion (relacionadas, para historial por trabajador)
// ============================================

const SHEET_ASISTENCIAS = 'ASISTENCIAS_CAPACITACION';

export interface AsistenciaCapacitacion {
  rowIndex: number;
  idRegistro: string;
  idCapacitacion: string;
  proyecto: string;
  fecha: string;
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  empresa: string;
  cargo: string;
  encontradoEnNomina: string;
  fechaHora: string;
}

function rowToAsistencia(row: any[], index: number): AsistenciaCapacitacion {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    idCapacitacion: row[1] || '',
    proyecto: row[2] || '',
    fecha: row[3] || '',
    nroDocumento: row[4] || '',
    nombres: row[5] || '',
    apellidos: row[6] || '',
    empresa: row[7] || '',
    cargo: row[8] || '',
    encontradoEnNomina: row[9] || '',
    fechaHora: row[10] || '',
  };
}

export async function getAllAsistencias(): Promise<AsistenciaCapacitacion[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ASISTENCIAS}!A2:K`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToAsistencia(row, index));
}

export async function getAsistenciasByCapacitacion(idCapacitacion: string): Promise<AsistenciaCapacitacion[]> {
  const all = await getAllAsistencias();
  return all.filter(a => a.idCapacitacion === idCapacitacion);
}

export async function getAsistenciasByEmpleado(nroDocumento: string): Promise<AsistenciaCapacitacion[]> {
  const all = await getAllAsistencias();
  return all.filter(a => a.nroDocumento === nroDocumento);
}

export async function appendAsistenciasBatch(asistencias: Omit<AsistenciaCapacitacion, 'rowIndex'>[]): Promise<void> {
  if (asistencias.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ASISTENCIAS}!A1:K1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: asistencias.map(a => [
      a.idRegistro, a.idCapacitacion, a.proyecto, a.fecha,
      a.nroDocumento, a.nombres, a.apellidos, a.empresa, a.cargo,
      a.encontradoEnNomina, a.fechaHora
    ]) },
  });
}

export async function deleteAsistenciasByCapacitacion(idCapacitacion: string): Promise<void> {
  const all = await getAllAsistencias();
  const filas = all.filter(a => a.idCapacitacion === idCapacitacion).map(a => a.rowIndex);
  for (const rowIndex of filas) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_ASISTENCIAS}!A${rowIndex}:K${rowIndex}`,
    });
  }
}

'''

contenido = contenido.replace(ancla, nuevo_bloque + ancla, 1)

with open('src/server/lib/googleSheets_capacitaciones.ts', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("Listo! Funciones de asistencias agregadas.")
