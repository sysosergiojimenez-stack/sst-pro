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
  proyectosAsignados: string[];
}

function parseProyectosAsignados(valor: string): string[] {
  if (!valor) return [];
  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
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
    proyectosAsignados: parseProyectosAsignados(row[8] || ''),
  };
}

export async function getAllUsuarios(): Promise<Usuario[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USUARIOS}!A2:I`,
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
    range: `${SHEET_USUARIOS}!A:I`,
    valueInputOption: 'RAW',
    requestBody: { values: [[
      usuario.idRegistro, usuario.dateTime, usuario.registradoPor,
      usuario.rol, usuario.nombres, usuario.apellidos,
      usuario.correo, usuario.contrasena,
      JSON.stringify(usuario.proyectosAsignados || []),
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
    proyectosAsignados: 'I',
  };

  for (const [key, col] of Object.entries(fields)) {
    if ((usuario as any)[key] !== undefined) {
      const valor = key === 'proyectosAsignados'
        ? JSON.stringify((usuario as any)[key] || [])
        : (usuario as any)[key];
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_USUARIOS}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[valor]] },
      }));
    }
  }

  if (updates.length === 0) return;
  await Promise.all(updates);
}

export async function deleteUsuario(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USUARIOS}!A${rowIndex}:I${rowIndex}`,
  });
}
