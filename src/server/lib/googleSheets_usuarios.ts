import { sheets, SPREADSHEET_ID } from './googleSheets';

const SHEET_USUARIOS = 'Usuarios';

export interface Usuario {
  rowIndex: number;
  idRegistro: string;
  dateTime: string;
  registradoPor: string;
  rol: 'Desarrollador' | 'Admin' | 'User';
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
}

function rowToUsuario(row: any[], index: number): Usuario {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    dateTime: row[1] || '',
    registradoPor: row[2] || '',
    rol: (row[3] || 'User') as Usuario['rol'],
    nombres: row[4] || '',
    apellidos: row[5] || '',
    correo: row[6] || '',
    contrasena: row[7] || '',
  };
}

export async function getAllUsuarios(): Promise<Usuario[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USUARIOS}!A2:H`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToUsuario(row, index));
}

export async function getUsuarioByCorreo(correo: string): Promise<Usuario | null> {
  const all = await getAllUsuarios();
  return all.find(u => u.correo.toLowerCase() === correo.toLowerCase()) || null;
}

export async function getUsuarioById(idRegistro: string): Promise<Usuario | null> {
  const all = await getAllUsuarios();
  return all.find(u => u.idRegistro === idRegistro) || null;
}

export async function appendUsuario(usuario: Omit<Usuario, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USUARIOS}!A:H`,
    valueInputOption: 'RAW',
    requestBody: { values: [[
      usuario.idRegistro, usuario.dateTime, usuario.registradoPor,
      usuario.rol, usuario.nombres, usuario.apellidos,
      usuario.correo, usuario.contrasena,
    ]] },
  });
}

export async function updateUsuario(
  rowIndex: number,
  usuario: Partial<Omit<Usuario, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    rol: 'D',
    nombres: 'E',
    apellidos: 'F',
    correo: 'G',
    contrasena: 'H',
  };

  for (const [key, col] of Object.entries(fields)) {
    if ((usuario as any)[key] !== undefined) {
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_USUARIOS}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[(usuario as any)[key]]] },
      }));
    }
  }

  if (updates.length === 0) return;
  await Promise.all(updates);
}

export async function deleteUsuario(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USUARIOS}!A${rowIndex}:H${rowIndex}`,
  });
}
