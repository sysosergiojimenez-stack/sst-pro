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

const SHEET_PRODUCTOS = 'Productos';
const SHEET_REMISIONES = 'Remisiones y Facturas';
const SHEET_ENTRADAS = 'Entradas';

// ============================================
// Productos
// ============================================

export interface Producto {
  rowIndex: number;
  codigo: string;
  proyecto: string;
  nombre: string;
  proveedor: string;
  clasificacion: string;
  stockMinimo: string;
}

function rowToProducto(row: any[], index: number): Producto {
  return {
    rowIndex: index + 2,
    codigo: row[0] || '',
    proyecto: row[1] || '',
    nombre: row[2] || '',
    proveedor: row[3] || '',
    clasificacion: row[4] || '',
    stockMinimo: row[5] || '0',
  };
}

export async function getAllProductos(): Promise<Producto[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PRODUCTOS}!A2:F`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToProducto(row, index));
}

export async function getProductosByProyecto(proyecto: string): Promise<Producto[]> {
  const all = await getAllProductos();
  return all.filter(p => p.proyecto === proyecto);
}

export async function getProductoByCodigo(codigo: string): Promise<Producto | null> {
  const all = await getAllProductos();
  return all.find(p => p.codigo === codigo) || null;
}

export async function appendProducto(producto: Omit<Producto, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PRODUCTOS}!A1:F1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[producto.codigo, producto.proyecto, producto.nombre, producto.proveedor, producto.clasificacion, producto.stockMinimo]] },
  });
}

// ============================================
// Remisiones y Facturas
// ============================================

export interface Remision {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  proveedor: string;
  numeracion: string;
  fecha: string;
  detalle: string;
  scaneado: string;
}

function rowToRemision(row: any[], index: number): Remision {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHora: row[1] || '',
    userEmail: row[2] || '',
    proveedor: row[3] || '',
    numeracion: row[4] || '',
    fecha: row[5] || '',
    detalle: row[6] || '',
    scaneado: row[7] || '',
    proyecto: row[11] || '',
  };
}

export async function getAllRemisiones(): Promise<Remision[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_REMISIONES}!A2:L`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToRemision(row, index));
}

export async function getRemisionesByProyecto(proyecto: string): Promise<Remision[]> {
  const allRemisiones = await getAllRemisiones();
  return allRemisiones.filter(r => r.proyecto === proyecto);
}

export async function getRemisionByNumeracion(numeracion: string): Promise<Remision | null> {
  const all = await getAllRemisiones();
  return all.find(r => r.numeracion === numeracion) || null;
}

export async function getRemisionById(idRegistro: string): Promise<Remision | null> {
  const all = await getAllRemisiones();
  return all.find(r => r.idRegistro === idRegistro) || null;
}

export async function appendRemision(remision: Omit<Remision, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_REMISIONES}!A1:L1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      remision.idRegistro, remision.fechaHora, remision.userEmail,
      remision.proveedor, remision.numeracion, remision.fecha,
      remision.detalle, remision.scaneado, '', '', '',
      remision.proyecto
    ]] },
  });
}

export async function updateProducto(
  rowIndex: number,
  producto: Partial<Omit<Producto, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    codigo: 'A',
    proyecto: 'B',
    nombre: 'C',
    proveedor: 'D',
    clasificacion: 'E',
    stockMinimo: 'F',
  };

  for (const [key, col] of Object.entries(fields)) {
    if ((producto as any)[key] !== undefined) {
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_PRODUCTOS}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[(producto as any)[key]]] },
      }));
    }
  }

  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Producto actualizado en fila:', rowIndex);
}

export async function deleteProducto(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PRODUCTOS}!A${rowIndex}:F${rowIndex}`,
  });
  console.log('Producto eliminado en fila:', rowIndex);
}

export async function updateRemision(
  rowIndex: number,
  remision: Partial<Omit<Remision, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    proveedor: 'D',
    numeracion: 'E',
    fecha: 'F',
    detalle: 'G',
    scaneado: 'H',
  };

  for (const [key, col] of Object.entries(fields)) {
    if ((remision as any)[key] !== undefined) {
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_REMISIONES}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[(remision as any)[key]]] },
      }));
    }
  }

  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Remision actualizada en fila:', rowIndex);
}

export async function deleteRemision(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_REMISIONES}!A${rowIndex}:L${rowIndex}`,
  });
  console.log('Remision eliminada en fila:', rowIndex);
}

export async function deleteEntrada(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ENTRADAS}!A${rowIndex}:H${rowIndex}`,
  });
  console.log('Entrada eliminada en fila:', rowIndex);
}

// ============================================
// Notas de Salida
// ============================================

const SHEET_NOTAS_SALIDA = 'Notas de Salida';

export interface NotaSalida {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  obra: string;
  orden: string;
  fecha: string;
  quienRetira: string;
  observaciones: string;
}

function rowToNotaSalida(row: any[], index: number): NotaSalida {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHora: row[1] || '',
    userEmail: row[2] || '',
    obra: row[3] || '',
    orden: row[4] || '',
    fecha: row[5] || '',
    quienRetira: row[6] || '',
    observaciones: row[7] || '',
  };
}

export async function getAllNotasSalida(): Promise<NotaSalida[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NOTAS_SALIDA}!A2:H`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToNotaSalida(row, index));
}

export async function getNotasSalidaByProyecto(obra: string): Promise<NotaSalida[]> {
  const all = await getAllNotasSalida();
  return all.filter(n => n.obra === obra);
}

export async function getNotaSalidaById(idRegistro: string): Promise<NotaSalida | null> {
  const all = await getAllNotasSalida();
  return all.find(n => n.idRegistro === idRegistro) || null;
}

export async function appendNotaSalida(nota: Omit<NotaSalida, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NOTAS_SALIDA}!A1:H1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      nota.idRegistro, nota.fechaHora, nota.userEmail,
      nota.obra, nota.orden, nota.fecha,
      nota.quienRetira, nota.observaciones
    ]] },
  });
}

export async function updateNotaSalida(
  rowIndex: number,
  nota: Partial<Omit<NotaSalida, 'rowIndex'>>
): Promise<void> {
  const updates = [];
  const fields: Record<string, string> = {
    orden: 'E',
    fecha: 'F',
    quienRetira: 'G',
    observaciones: 'H',
  };

  for (const [key, col] of Object.entries(fields)) {
    if ((nota as any)[key] !== undefined) {
      updates.push(sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NOTAS_SALIDA}!${col}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[(nota as any)[key]]] },
      }));
    }
  }

  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Nota de salida actualizada en fila:', rowIndex);
}

export async function deleteNotaSalida(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NOTAS_SALIDA}!A${rowIndex}:H${rowIndex}`,
  });
  console.log('Nota de salida eliminada en fila:', rowIndex);
}

// ============================================
// Salidas
// ============================================

const SHEET_SALIDAS = 'Salidas';

export interface Salida {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  refNotaSalida: string;
  refItem: string;
  cantidad: string;
  trabajadorRetira: string;
}

function rowToSalida(row: any[], index: number): Salida {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    fechaHora: row[1] || '',
    userEmail: row[2] || '',
    refNotaSalida: row[3] || '',
    refItem: row[4] || '',
    cantidad: row[5] || '',
    trabajadorRetira: row[6] || '',
  };
}

export async function getAllSalidas(): Promise<Salida[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_SALIDAS}!A2:G`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToSalida(row, index));
}

export async function getSalidasByProyecto(obra: string): Promise<Salida[]> {
  const notas = await getAllNotasSalida();
  const notasIds = new Set(notas.filter(n => n.obra === obra).map(n => n.idRegistro));
  const all = await getAllSalidas();
  return all.filter(s => notasIds.has(s.refNotaSalida));
}

export async function getSalidasByNota(refNotaSalida: string): Promise<Salida[]> {
  const all = await getAllSalidas();
  return all.filter(s => s.refNotaSalida === refNotaSalida);
}

export async function getSalidasByTrabajador(trabajador: string): Promise<Salida[]> {
  const all = await getAllSalidas();
  return all.filter(s => s.trabajadorRetira === trabajador);
}

export async function appendSalida(salida: Omit<Salida, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_SALIDAS}!A1:G1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      salida.idRegistro, salida.fechaHora, salida.userEmail,
      salida.refNotaSalida, salida.refItem, salida.cantidad,
      salida.trabajadorRetira
    ]] },
  });
}

export async function appendMultipleSalidas(salidas: Omit<Salida, 'rowIndex'>[]): Promise<void> {
  if (salidas.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_SALIDAS}!A1:G1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: salidas.map(s => [
      s.idRegistro, s.fechaHora, s.userEmail,
      s.refNotaSalida, s.refItem, s.cantidad,
      s.trabajadorRetira
    ]) },
  });
}

export async function updateSalida(
  rowIndex: number,
  salida: Partial<Pick<Salida, 'refItem' | 'cantidad' | 'trabajadorRetira'>>
): Promise<void> {
  const updates: { range: string; values: string[][] }[] = [];
  if (salida.refItem !== undefined) {
    updates.push({ range: `${SHEET_SALIDAS}!E${rowIndex}`, values: [[salida.refItem]] });
  }
  if (salida.cantidad !== undefined) {
    updates.push({ range: `${SHEET_SALIDAS}!F${rowIndex}`, values: [[salida.cantidad]] });
  }
  if (salida.trabajadorRetira !== undefined) {
    updates.push({ range: `${SHEET_SALIDAS}!G${rowIndex}`, values: [[salida.trabajadorRetira]] });
  }
  if (updates.length === 0) {
    console.log('No hay campos para actualizar en Salida');
    return;
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
  console.log('Salida actualizada en fila:', rowIndex);
}

export async function deleteSalida(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_SALIDAS}!A${rowIndex}:G${rowIndex}`,
  });
  console.log('Salida eliminada en fila:', rowIndex);
}

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

// ============================================
// Entradas (con columna Proyecto al final - columna H)
// ============================================

export interface Entrada {
  rowIndex: number;
  idRegistro: string;
  dateTime: string;
  userEmail: string;
  refRemision: string;
  codigo: string;
  item: string;
  cantidad: string;
  proyecto: string;
}

function rowToEntrada(row: any[], index: number): Entrada {
  return {
    rowIndex: index + 2,
    idRegistro: row[0] || '',
    dateTime: row[1] || '',
    userEmail: row[2] || '',
    refRemision: row[3] || '',
    codigo: row[4] || '',
    item: row[5] || '',
    cantidad: row[6] || '',
    proyecto: row[7] || '',
  };
}

export async function getAllEntradas(): Promise<Entrada[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ENTRADAS}!A2:H`,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToEntrada(row, index));
}

export async function getEntradasByProyecto(proyecto: string): Promise<Entrada[]> {
  const all = await getAllEntradas();
  return all.filter(e => e.proyecto === proyecto);
}

export async function getEntradasByRemision(refRemision: string): Promise<Entrada[]> {
  const all = await getAllEntradas();
  return all.filter(e => e.refRemision === refRemision);
}

export async function getEntradasByRemisionId(idRegistro: string): Promise<Entrada[]> {
  const all = await getAllEntradas();
  return all.filter(e => e.refRemision === idRegistro);
}

export async function appendEntrada(entrada: Omit<Entrada, 'rowIndex'>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ENTRADAS}!A1:H1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      entrada.idRegistro,
      entrada.dateTime || new Date().toISOString(),
      entrada.userEmail || 'sistema',
      entrada.refRemision,
      entrada.codigo,
      entrada.item,
      entrada.cantidad,
      entrada.proyecto
    ]] },
  });
}

export async function appendMultipleEntradas(entradas: Omit<Entrada, 'rowIndex'>[]): Promise<void> {
  if (entradas.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ENTRADAS}!A1:H1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: entradas.map(e => [
      e.idRegistro,
      e.dateTime || new Date().toISOString(),
      e.userEmail || 'sistema',
      e.refRemision,
      e.codigo,
      e.item,
      e.cantidad,
      e.proyecto
    ]) },
  });
}
