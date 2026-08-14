import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'sst-documentos-empleados';
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID || 'sg-sst-501720';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEETS_KEY_PATH || '/home/syso_sergiojimenez/credentials/service-account.json',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/devstorage.read_write',
  ],
});

export const sheets = google.sheets({ version: 'v4', auth });

let cachedSheetId: number | null = null;

async function getSheetId(): Promise<number> {
  if (cachedSheetId !== null) return cachedSheetId;
  const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = response.data.sheets?.find(s => s.properties?.title === 'NOMINA DE PERSONAL');
  if (!sheet || !sheet.properties?.sheetId) {
    throw new Error('Hoja "NOMINA DE PERSONAL" no encontrada');
  }
  cachedSheetId = sheet.properties.sheetId;
  console.log('Sheet ID de NOMINA DE PERSONAL:', cachedSheetId);
  return cachedSheetId;
}

export async function subirPDFAGCS(
  base64PDF: string,
  nombreArchivo: string,
  mimeType: string = 'application/pdf'
): Promise<string> {
  try {
    console.log('Subiendo PDF a GCS...');
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      throw new Error('No se pudo obtener token de acceso para GCS');
    }
    const buffer = Buffer.from(base64PDF, 'base64');
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${GCS_BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(nombreArchivo)}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token.token,
        'Content-Type': mimeType,
      },
      body: buffer,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GCS upload error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();

    // Intentar hacer público el objeto, pero no fallar si no se puede
    try {
      const aclUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET_NAME}/o/${encodeURIComponent(nombreArchivo)}/acl`;
      const aclResponse = await fetch(aclUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity: 'allUsers', role: 'READER' }),
      });
      if (!aclResponse.ok) {
        console.warn('[GCS] No se pudo hacer publico el objeto (permisos insuficientes):', aclResponse.status);
      } else {
        console.log('[GCS] Objeto hecho publico exitosamente');
      }
    } catch (aclError) {
      console.warn('[GCS] Error al intentar hacer publico (ignorado):', aclError);
    }

    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${encodeURIComponent(nombreArchivo)}`;
    console.log('[GCS] PDF subido:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[GCS] Error subiendo a GCS:', error);
    throw new Error('Error al subir PDF a GCS: ' + (error as Error).message);
  }
}

export interface DatosExtraidosPDF {
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  lugarNacimiento: string;
  sexo: string;
  estadoCivil: string;
  direccion: string;
  telefono: string;
  email: string;
  tipoSangre: string;
  cargo: string;
  empresa: string;
  obra: string;
  contactoEmergencia: string;
  telefonoEmergencia: string;
  [key: string]: string;
}

export async function extraerDatosConGemini(
  base64PDF: string,
  mimeType: string = 'application/pdf'
): Promise<DatosExtraidosPDF> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no configurada en .env');
  }
  console.log('Usando gemini-2.5-flash...');
  console.log('Base64 length:', base64PDF.length);
  if (!base64PDF || base64PDF.length < 100) {
    throw new Error('PDF vacio o base64 invalido. Length: ' + (base64PDF?.length || 0));
  }
  const prompt = `Analiza este documento, que puede contener VARIAS paginas o imagenes correspondientes a un mismo trabajador. Pueden aparecer los siguientes tipos de documentos, todos OPCIONALES (puede venir solo uno, o varios juntos). Segui estas reglas ESTRICTAMENTE sobre de que documento sacar cada dato:

1. CEDULA DE IDENTIDAD (Republica del Paraguay): esta es la UNICA fuente para NOMBRES, APELLIDOS, NUMERO DE DOCUMENTO y FECHA DE NACIMIENTO. Usa solamente este documento para esos 4 campos, salvo que no este presente o no sea legible (ver REGLA DE RESPALDO).

2. ACTA DE INDUCCION EN SEGURIDAD (formulario con checklist de riesgos y firmas): usa este documento UNICAMENTE para extraer el CARGO, tomando el campo "CARGO O LABOR A DESEMPEÑAR". No uses este documento para ningun otro campo.

3. CONSTANCIA DE ENTRADA DEL ASEGURADO (IPS - Instituto de Prevision Social): usa este documento UNICAMENTE para extraer la EMPRESA, tomando el nombre que aparece en la seccion "DATOS DEL EMPLEADOR" junto a "Empleador:" (el nombre de la persona o razon social que sigue al codigo, no el numero). No uses este documento para ningun otro campo, salvo la REGLA DE RESPALDO.

REGLA DE RESPALDO: Si la CEDULA DE IDENTIDAD no esta presente o no es legible, extrae NOMBRES, APELLIDOS y NUMERO DE DOCUMENTO desde la CONSTANCIA DE IPS: el numero de documento esta en el campo "CI Nro:", y los nombres/apellidos en los campos "Nombres:" y "Apellidos:". En ese caso la fecha de nacimiento puede quedar vacia si no aparece en ningun otro documento.

No mezcles datos entre documentos fuera de estas reglas, y no inventes datos que no esten explicitamente escritos.

Responde UNICAMENTE en formato JSON con esta estructura exacta:
{
  "nroDocumento": "numero de documento de identidad",
  "nombres": "nombres completos",
  "apellidos": "apellidos completos",
  "fechaNacimiento": "fecha de nacimiento (DD/MM/YYYY)",
  "lugarNacimiento": "ciudad/departamento de nacimiento",
  "sexo": "M o F",
  "estadoCivil": "soltero, casado, divorciado, etc",
  "direccion": "direccion completa",
  "telefono": "telefono celular",
  "email": "correo electronico",
  "tipoSangre": "tipo de sangre (A+, O-, etc)",
  "cargo": "cargo o puesto",
  "empresa": "nombre de la empresa",
  "obra": "obra o proyecto asignado",
  "contactoEmergencia": "nombre contacto de emergencia",
  "telefonoEmergencia": "telefono de emergencia"
}
Si algun dato no esta en el documento, usa string vacio "".
NO incluyas explicaciones, SOLO el JSON.`;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64PDF } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        })
      }
    );
    console.log('Gemini status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    if (result.error) {
      throw new Error(`Gemini error: ${result.error.message || JSON.stringify(result.error)}`);
    }
    if (!result.candidates || !result.candidates[0]) {
      throw new Error('Gemini no devolvio candidates en la respuesta');
    }
    const candidate = result.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error('Gemini no devolvio content.parts en la respuesta');
    }
    const text = candidate.content.parts[0]?.text || '';
    if (!text) {
      throw new Error('Gemini no devolvio texto en la respuesta');
    }
    let datos: any = null;
    let extractionMethod = '';
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      try {
        datos = JSON.parse(markdownMatch[1].trim());
        extractionMethod = 'markdown code block';
      } catch (e) {
        console.log('Metodo markdown fallo, intentando otro...');
      }
    }
    if (!datos) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          datos = JSON.parse(jsonMatch[0]);
          extractionMethod = 'raw JSON object';
        } catch (e) {
          console.log('Metodo raw JSON fallo, intentando otro...');
        }
      }
    }
    if (!datos) {
      try {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          datos = JSON.parse(trimmed);
          extractionMethod = 'full text JSON';
        }
      } catch (e) {
        console.log('Metodo full text fallo...');
      }
    }
    if (!datos) {
      console.error('Texto completo recibido de Gemini:', text);
      throw new Error('No se pudo extraer JSON de la respuesta de Gemini. Respuesta recibida: ' + text.substring(0, 300));
    }
    console.log('JSON extraido via:', extractionMethod);
    if (!datos.nombres && !datos.apellidos && !datos.nroDocumento) {
      throw new Error('Gemini no pudo extraer datos del documento');
    }
    return datos;
  } catch (error) {
    console.error('Error en Gemini:', error);
    throw error;
  }
}

export interface Empleado {
  rowIndex: number;
  nroDocumento: string;
  fechaHora?: string;
  userEmail?: string;
  obra: string;
  tipoDocumento?: string;
  nombres: string;
  apellidos: string;
  ciudadNacimiento?: string;
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  nombrePadre?: string;
  ocupacionPadre?: string;
  nombreMadre?: string;
  ocupacionMadre?: string;
  nombreConyuge?: string;
  ocupacionConyuge?: string;
  fechaNacConyuge?: string;
  direccion?: string;
  nro?: string;
  dpto?: string;
  piso?: string;
  barrio?: string;
  ciudad?: string;
  departamentoTerritorial?: string;
  puntoReferencia?: string;
  telefonoCelular: string;
  telefonoEmergencia?: string;
  email: string;
  gradoInstruccion?: string;
  instruccionConcluida?: string;
  carreraUniversitaria?: string;
  tipoSangre?: string;
  hijo1?: string;
  fechaNacHijo1?: string;
  hijo2?: string;
  fechaNacHijo2?: string;
  hijo3?: string;
  fechaNacHijo3?: string;
  hijo4?: string;
  fechaNacHijo4?: string;
  hijo5?: string;
  fechaNacHijo5?: string;
  empresa: string;
  cargo: string;
  unidad?: string;
  honorarios?: string;
  moneda?: string;
  regimen?: string;
  actividades?: string;
  fechaInicioContrato?: string;
  fechaTerminoContrato?: string;
  calce?: string;
  scanDocumentos?: string;
  estado?: string;
}

export async function getEmpleados(): Promise<Empleado[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'NOMINA DE PERSONAL!A2:BC',
    });
    const rows = response.data.values || [];
    return rows.map((row, index) => ({
      rowIndex: index + 2,
      nroDocumento: row[0] || '',
      fechaHora: row[1] || '',
      userEmail: row[2] || '',
      obra: row[3] || '',
      tipoDocumento: row[4] || '',
      nombres: row[5] || '',
      apellidos: row[6] || '',
      ciudadNacimiento: row[7] || '',
      fechaNacimiento: row[8] || '',
      sexo: row[9] || '',
      estadoCivil: row[10] || '',
      nombrePadre: row[11] || '',
      ocupacionPadre: row[12] || '',
      nombreMadre: row[13] || '',
      ocupacionMadre: row[14] || '',
      nombreConyuge: row[15] || '',
      ocupacionConyuge: row[16] || '',
      fechaNacConyuge: row[17] || '',
      direccion: row[18] || '',
      nro: row[19] || '',
      dpto: row[20] || '',
      piso: row[21] || '',
      barrio: row[22] || '',
      ciudad: row[23] || '',
      departamentoTerritorial: row[24] || '',
      puntoReferencia: row[25] || '',
      telefonoCelular: row[26] || '',
      telefonoEmergencia: row[27] || '',
      email: row[28] || '',
      gradoInstruccion: row[29] || '',
      instruccionConcluida: row[30] || '',
      carreraUniversitaria: row[31] || '',
      tipoSangre: row[32] || '',
      hijo1: row[33] || '',
      fechaNacHijo1: row[34] || '',
      hijo2: row[35] || '',
      fechaNacHijo2: row[36] || '',
      hijo3: row[37] || '',
      fechaNacHijo3: row[38] || '',
      hijo4: row[39] || '',
      fechaNacHijo4: row[40] || '',
      hijo5: row[41] || '',
      fechaNacHijo5: row[42] || '',
      empresa: row[43] || '',
      cargo: row[44] || '',
      unidad: row[45] || '',
      honorarios: row[46] || '',
      moneda: row[47] || '',
      regimen: row[48] || '',
      actividades: row[49] || '',
      fechaInicioContrato: row[50] || '',
      fechaTerminoContrato: row[51] || '',
      calce: row[52] || '',
      scanDocumentos: row[53] || '',
      estado: row[54] || 'Activo',
    }));
  } catch (error) {
    console.error('Error reading empleados:', error);
    return [];
  }
}

export async function getEmpleadoByDocumento(nroDocumento: string): Promise<Empleado | null> {
  const empleados = await getEmpleados();
  const empleado = empleados.find(e => e.nroDocumento === nroDocumento);
  return empleado || null;
}

export async function getEmpleadoByRowIndex(rowIndex: number): Promise<Empleado | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `NOMINA DE PERSONAL!A${rowIndex}:BC${rowIndex}`,
    });
    const rows = response.data.values || [];
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      rowIndex: rowIndex,
      nroDocumento: row[0] || '',
      fechaHora: row[1] || '',
      userEmail: row[2] || '',
      obra: row[3] || '',
      tipoDocumento: row[4] || '',
      nombres: row[5] || '',
      apellidos: row[6] || '',
      ciudadNacimiento: row[7] || '',
      fechaNacimiento: row[8] || '',
      sexo: row[9] || '',
      estadoCivil: row[10] || '',
      nombrePadre: row[11] || '',
      ocupacionPadre: row[12] || '',
      nombreMadre: row[13] || '',
      ocupacionMadre: row[14] || '',
      nombreConyuge: row[15] || '',
      ocupacionConyuge: row[16] || '',
      fechaNacConyuge: row[17] || '',
      direccion: row[18] || '',
      nro: row[19] || '',
      dpto: row[20] || '',
      piso: row[21] || '',
      barrio: row[22] || '',
      ciudad: row[23] || '',
      departamentoTerritorial: row[24] || '',
      puntoReferencia: row[25] || '',
      telefonoCelular: row[26] || '',
      telefonoEmergencia: row[27] || '',
      email: row[28] || '',
      gradoInstruccion: row[29] || '',
      instruccionConcluida: row[30] || '',
      carreraUniversitaria: row[31] || '',
      tipoSangre: row[32] || '',
      hijo1: row[33] || '',
      fechaNacHijo1: row[34] || '',
      hijo2: row[35] || '',
      fechaNacHijo2: row[36] || '',
      hijo3: row[37] || '',
      fechaNacHijo3: row[38] || '',
      hijo4: row[39] || '',
      fechaNacHijo4: row[40] || '',
      hijo5: row[41] || '',
      fechaNacHijo5: row[42] || '',
      empresa: row[43] || '',
      cargo: row[44] || '',
      unidad: row[45] || '',
      honorarios: row[46] || '',
      moneda: row[47] || '',
      regimen: row[48] || '',
      actividades: row[49] || '',
      fechaInicioContrato: row[50] || '',
      fechaTerminoContrato: row[51] || '',
      calce: row[52] || '',
      scanDocumentos: row[53] || '',
      estado: row[54] || 'Activo',
    };
  } catch (error) {
    console.error('Error reading empleado by row index:', error);
    return null;
  }
}

export async function updateEmpleadoDocumentos(
  rowIndex: number,
  scanDocumentos: string
): Promise<void> {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `NOMINA DE PERSONAL!BB${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[scanDocumentos]] },
    });
    console.log('Documentos actualizados para fila:', rowIndex);
  } catch (error) {
    console.error('Error updating empleado documentos:', error);
    throw new Error('Error al actualizar documentos del empleado');
  }
}

export async function appendEmpleado(
  empleado: Omit<Empleado, 'rowIndex'>
): Promise<number> {
  try {
    const now = new Date().toISOString();
    const values = [[
      empleado.nroDocumento,
      now,
      empleado.userEmail || '',
      empleado.obra,
      empleado.tipoDocumento || '',
      empleado.nombres,
      empleado.apellidos,
      empleado.ciudadNacimiento || '',
      empleado.fechaNacimiento || '',
      empleado.sexo || '',
      empleado.estadoCivil || '',
      empleado.nombrePadre || '',
      empleado.ocupacionPadre || '',
      empleado.nombreMadre || '',
      empleado.ocupacionMadre || '',
      empleado.nombreConyuge || '',
      empleado.ocupacionConyuge || '',
      empleado.fechaNacConyuge || '',
      empleado.direccion || '',
      empleado.nro || '',
      empleado.dpto || '',
      empleado.piso || '',
      empleado.barrio || '',
      empleado.ciudad || '',
      empleado.departamentoTerritorial || '',
      empleado.puntoReferencia || '',
      empleado.telefonoCelular,
      empleado.telefonoEmergencia || '',
      empleado.email,
      empleado.gradoInstruccion || '',
      empleado.instruccionConcluida || '',
      empleado.carreraUniversitaria || '',
      empleado.tipoSangre || '',
      empleado.hijo1 || '',
      empleado.fechaNacHijo1 || '',
      empleado.hijo2 || '',
      empleado.fechaNacHijo2 || '',
      empleado.hijo3 || '',
      empleado.fechaNacHijo3 || '',
      empleado.hijo4 || '',
      empleado.fechaNacHijo4 || '',
      empleado.hijo5 || '',
      empleado.fechaNacHijo5 || '',
      empleado.empresa,
      empleado.cargo,
      empleado.unidad || '',
      empleado.honorarios || '',
      empleado.moneda || '',
      empleado.regimen || '',
      empleado.actividades || '',
      empleado.fechaInicioContrato || '',
      empleado.fechaTerminoContrato || '',
      empleado.calce || '',
      empleado.scanDocumentos || '',
      empleado.estado || 'Activo',
    ]];
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'NOMINA DE PERSONAL!A2:BC',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    const updatedRange = response.data.updates?.updatedRange;
    const rowIndex = updatedRange ? parseInt(updatedRange.split('!')[1].split(':')[0].replace(/[^0-9]/g, '')) : 0;
    console.log('Empleado agregado en fila:', rowIndex);
    return rowIndex;
  } catch (error) {
    console.error('Error appending empleado:', error);
    throw new Error('Error al agregar empleado: ' + (error as Error).message);
  }
}

export async function updateEmpleado(
  rowIndex: number,
  empleado: Partial<Omit<Empleado, 'rowIndex'>>
): Promise<void> {
  try {
    const current = await getEmpleadoByRowIndex(rowIndex);
    if (!current) {
      throw new Error('Empleado no encontrado en fila ' + rowIndex);
    }
    const map: Record<string, string | undefined> = {
      [`NOMINA DE PERSONAL!A${rowIndex}`]: empleado.nroDocumento,
      [`NOMINA DE PERSONAL!C${rowIndex}`]: empleado.userEmail,
      [`NOMINA DE PERSONAL!D${rowIndex}`]: empleado.obra,
      [`NOMINA DE PERSONAL!E${rowIndex}`]: empleado.tipoDocumento,
      [`NOMINA DE PERSONAL!F${rowIndex}`]: empleado.nombres,
      [`NOMINA DE PERSONAL!G${rowIndex}`]: empleado.apellidos,
      [`NOMINA DE PERSONAL!H${rowIndex}`]: empleado.ciudadNacimiento,
      [`NOMINA DE PERSONAL!I${rowIndex}`]: empleado.fechaNacimiento,
      [`NOMINA DE PERSONAL!J${rowIndex}`]: empleado.sexo,
      [`NOMINA DE PERSONAL!K${rowIndex}`]: empleado.estadoCivil,
      [`NOMINA DE PERSONAL!L${rowIndex}`]: empleado.nombrePadre,
      [`NOMINA DE PERSONAL!M${rowIndex}`]: empleado.ocupacionPadre,
      [`NOMINA DE PERSONAL!N${rowIndex}`]: empleado.nombreMadre,
      [`NOMINA DE PERSONAL!O${rowIndex}`]: empleado.ocupacionMadre,
      [`NOMINA DE PERSONAL!P${rowIndex}`]: empleado.nombreConyuge,
      [`NOMINA DE PERSONAL!Q${rowIndex}`]: empleado.ocupacionConyuge,
      [`NOMINA DE PERSONAL!R${rowIndex}`]: empleado.fechaNacConyuge,
      [`NOMINA DE PERSONAL!S${rowIndex}`]: empleado.direccion,
      [`NOMINA DE PERSONAL!T${rowIndex}`]: empleado.nro,
      [`NOMINA DE PERSONAL!U${rowIndex}`]: empleado.dpto,
      [`NOMINA DE PERSONAL!V${rowIndex}`]: empleado.piso,
      [`NOMINA DE PERSONAL!W${rowIndex}`]: empleado.barrio,
      [`NOMINA DE PERSONAL!X${rowIndex}`]: empleado.ciudad,
      [`NOMINA DE PERSONAL!Y${rowIndex}`]: empleado.departamentoTerritorial,
      [`NOMINA DE PERSONAL!Z${rowIndex}`]: empleado.puntoReferencia,
      [`NOMINA DE PERSONAL!AA${rowIndex}`]: empleado.telefonoCelular,
      [`NOMINA DE PERSONAL!AB${rowIndex}`]: empleado.telefonoEmergencia,
      [`NOMINA DE PERSONAL!AC${rowIndex}`]: empleado.email,
      [`NOMINA DE PERSONAL!AD${rowIndex}`]: empleado.gradoInstruccion,
      [`NOMINA DE PERSONAL!AE${rowIndex}`]: empleado.instruccionConcluida,
      [`NOMINA DE PERSONAL!AF${rowIndex}`]: empleado.carreraUniversitaria,
      [`NOMINA DE PERSONAL!AG${rowIndex}`]: empleado.tipoSangre,
      [`NOMINA DE PERSONAL!AH${rowIndex}`]: empleado.hijo1,
      [`NOMINA DE PERSONAL!AI${rowIndex}`]: empleado.fechaNacHijo1,
      [`NOMINA DE PERSONAL!AJ${rowIndex}`]: empleado.hijo2,
      [`NOMINA DE PERSONAL!AK${rowIndex}`]: empleado.fechaNacHijo2,
      [`NOMINA DE PERSONAL!AL${rowIndex}`]: empleado.hijo3,
      [`NOMINA DE PERSONAL!AM${rowIndex}`]: empleado.fechaNacHijo3,
      [`NOMINA DE PERSONAL!AN${rowIndex}`]: empleado.hijo4,
      [`NOMINA DE PERSONAL!AO${rowIndex}`]: empleado.fechaNacHijo4,
      [`NOMINA DE PERSONAL!AP${rowIndex}`]: empleado.hijo5,
      [`NOMINA DE PERSONAL!AQ${rowIndex}`]: empleado.fechaNacHijo5,
      [`NOMINA DE PERSONAL!AR${rowIndex}`]: empleado.empresa,
      [`NOMINA DE PERSONAL!AS${rowIndex}`]: empleado.cargo,
      [`NOMINA DE PERSONAL!AT${rowIndex}`]: empleado.unidad,
      [`NOMINA DE PERSONAL!AU${rowIndex}`]: empleado.honorarios,
      [`NOMINA DE PERSONAL!AV${rowIndex}`]: empleado.moneda,
      [`NOMINA DE PERSONAL!AW${rowIndex}`]: empleado.regimen,
      [`NOMINA DE PERSONAL!AX${rowIndex}`]: empleado.actividades,
      [`NOMINA DE PERSONAL!AY${rowIndex}`]: empleado.fechaInicioContrato,
      [`NOMINA DE PERSONAL!AZ${rowIndex}`]: empleado.fechaTerminoContrato,
      [`NOMINA DE PERSONAL!BA${rowIndex}`]: empleado.calce,
      [`NOMINA DE PERSONAL!BB${rowIndex}`]: empleado.scanDocumentos,
      [`NOMINA DE PERSONAL!BC${rowIndex}`]: empleado.estado,
    };
    const updates = Object.entries(map)
      .filter(([_, value]) => value !== undefined)
      .map(([range, value]) => ({ range, values: [[value]] }));
    if (updates.length === 0) {
      console.log('No hay campos para actualizar');
      return;
    }
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates,
      },
    });
    console.log('Empleado actualizado en fila:', rowIndex);
  } catch (error) {
    console.error('Error updating empleado:', error);
    throw new Error('Error al actualizar empleado: ' + (error as Error).message);
  }
}

export async function deleteEmpleado(rowIndex: number): Promise<void> {
  try {
    const sheetId = await getSheetId();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        }],
      },
    });
    console.log('Empleado eliminado de fila:', rowIndex);
  } catch (error) {
    console.error('Error deleting empleado:', error);
    throw new Error('Error al eliminar empleado: ' + (error as Error).message);
  }
}

export interface Obra {
  nombre: string;
  ubicacion?: string;
  estado?: string;
}

export async function getObras(): Promise<Obra[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'OBRAS!A2:C',
    });
    const rows = response.data.values || [];
    return rows.map(row => ({
      nombre: row[0] || '',
      ubicacion: row[1] || '',
      estado: row[2] || 'Activa',
    })).filter(o => o.nombre);
  } catch (error) {
    console.error('Error reading obras:', error);
    return [];
  }
}

export interface Empresa {
  nombre: string;
  nit?: string;
  contacto?: string;
}

export async function getEmpresas(): Promise<Empresa[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'EMPRESAS!A2:C',
    });
    const rows = response.data.values || [];
    return rows.map(row => ({
      nombre: row[0] || '',
      nit: row[1] || '',
      contacto: row[2] || '',
    })).filter(e => e.nombre);
  } catch (error) {
    console.error('Error reading empresas:', error);
    return [];
  }
}

export interface Cargo {
  nombre: string;
  nivel?: string;
  descripcion?: string;
}

export async function getCargos(): Promise<Cargo[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'CARGOS!A2:C',
    });
    const rows = response.data.values || [];
    return rows.map(row => ({
      nombre: row[0] || '',
      nivel: row[1] || '',
      descripcion: row[2] || '',
    })).filter(c => c.nombre);
  } catch (error) {
    console.error('Error reading cargos:', error);
    return [];
  }
}

export interface Estadisticas {
  totalEmpleados: number;
  empleadosPorObra: Record<string, number>;
  empleadosPorEmpresa: Record<string, number>;
  empleadosSinDocumentos: number;
}

export async function getEstadisticas(): Promise<Estadisticas> {
  try {
    const empleados = await getEmpleados();
    const empleadosPorObra: Record<string, number> = {};
    const empleadosPorEmpresa: Record<string, number> = {};
    let empleadosSinDocumentos = 0;
    for (const emp of empleados) {
      const obra = emp.obra || 'Sin obra';
      empleadosPorObra[obra] = (empleadosPorObra[obra] || 0) + 1;
      const empresa = emp.empresa || 'Sin empresa';
      empleadosPorEmpresa[empresa] = (empleadosPorEmpresa[empresa] || 0) + 1;
      if (!emp.scanDocumentos || emp.scanDocumentos === '') {
        empleadosSinDocumentos++;
      }
    }
    return {
      totalEmpleados: empleados.length,
      empleadosPorObra,
      empleadosPorEmpresa,
      empleadosSinDocumentos,
    };
  } catch (error) {
    console.error('Error getting estadisticas:', error);
    return {
      totalEmpleados: 0,
      empleadosPorObra: {},
      empleadosPorEmpresa: {},
      empleadosSinDocumentos: 0,
    };
  }
}

export interface FiltroEmpleado {
  obra?: string;
  empresa?: string;
  cargo?: string;
  tieneDocumentos?: boolean;
}

export async function buscarEmpleados(filtro: FiltroEmpleado): Promise<Empleado[]> {
  try {
    let empleados = await getEmpleados();
    if (filtro.obra) {
      empleados = empleados.filter(e => e.obra === filtro.obra);
    }
    if (filtro.empresa) {
      empleados = empleados.filter(e => e.empresa === filtro.empresa);
    }
    if (filtro.cargo) {
      empleados = empleados.filter(e => e.cargo === filtro.cargo);
    }
    if (filtro.tieneDocumentos !== undefined) {
      empleados = empleados.filter(e => {
        const tiene = !!e.scanDocumentos && e.scanDocumentos !== '';
        return filtro.tieneDocumentos ? tiene : !tiene;
      });
    }
    return empleados;
  } catch (error) {
    console.error('Error buscando empleados:', error);
    return [];
  }
}

export async function createEmpleado(empleado: Omit<Empleado, 'rowIndex'>): Promise<number> {
  return appendEmpleado(empleado);
}

export async function actualizarEmpleado(nroDocumento: string, empleado: Partial<Omit<Empleado, 'rowIndex'>>): Promise<void> {
  const emp = await getEmpleadoByDocumento(nroDocumento);
  if (!emp) {
    throw new Error('Empleado no encontrado: ' + nroDocumento);
  }
  return updateEmpleado(emp.rowIndex, empleado);
}

export async function eliminarEmpleado(nroDocumento: string): Promise<void> {
  const emp = await getEmpleadoByDocumento(nroDocumento);
  if (!emp) {
    throw new Error('Empleado no encontrado: ' + nroDocumento);
  }
  return deleteEmpleado(emp.rowIndex);
}

export async function getEmpleadosByObra(obra: string): Promise<Empleado[]> {
  return buscarEmpleados({ obra });
}

export interface Incidente {
  id: string;
  fecha: string;
  reportadoPor: string;
  tipo: 'casi_accidente' | 'accidente_leve' | 'accidente_grave' | 'fatal';
  gravedad: 'baja' | 'media' | 'alta' | 'critica';
  area: string;
  descripcion: string;
  lesionado: 'si' | 'no';
  nombreLesionado?: string;
  diasPerdidos?: string;
  causaInmediata?: string;
  causaBasica?: string;
  accionCorrectiva?: string;
  estado: 'reportado' | 'investigando' | 'cerrado';
  evidenciaUrl?: string;
}

let incidenteIdCounter = 0;

export async function getIncidentes(): Promise<Incidente[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'INCIDENTES!A2:M',
    });
    const rows = response.data.values || [];
    return rows.map((row, index) => ({
      id: row[0] || `INC-${index + 1}`,
      fecha: row[1] || '',
      reportadoPor: row[2] || '',
      tipo: (row[3] || 'casi_accidente') as Incidente['tipo'],
      gravedad: (row[4] || 'baja') as Incidente['gravedad'],
      area: row[5] || '',
      descripcion: row[6] || '',
      lesionado: (row[7] || 'no') as 'si' | 'no',
      nombreLesionado: row[8] || '',
      diasPerdidos: row[9] || '',
      causaInmediata: row[10] || '',
      causaBasica: row[11] || '',
      accionCorrectiva: row[12] || '',
      estado: (row[13] || 'reportado') as Incidente['estado'],
      evidenciaUrl: row[14] || '',
    }));
  } catch (error: any) {
    if (error?.code === 400 && error?.message?.includes('Unable to parse range')) {
      console.warn('Hoja INCIDENTES no encontrada en Google Sheets. Retornando lista vacia.');
      return [];
    }
    console.error('Error reading incidentes:', error);
    return [];
  }
}

export async function createIncidente(incidente: Omit<Incidente, 'id'>): Promise<string> {
  try {
    incidenteIdCounter++;
    const id = `INC-${Date.now()}-${incidenteIdCounter}`;
    const values = [[
      id,
      incidente.fecha,
      incidente.reportadoPor,
      incidente.tipo,
      incidente.gravedad,
      incidente.area,
      incidente.descripcion,
      incidente.lesionado,
      incidente.nombreLesionado || '',
      incidente.diasPerdidos || '',
      incidente.causaInmediata || '',
      incidente.causaBasica || '',
      incidente.accionCorrectiva || '',
      incidente.estado,
      incidente.evidenciaUrl || '',
    ]];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'INCIDENTES!A2:O',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    console.log('Incidente creado:', id);
    return id;
  } catch (error) {
    console.error('Error creating incidente:', error);
    throw new Error('Error al crear incidente: ' + (error as Error).message);
  }
}

// ========== PROYECTOS ==========

export interface Proyecto {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
}

export async function getProyectos(): Promise<Proyecto[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'PROYECTO!A2:F',
    });
    const rows = response.data.values || [];
    return rows.map((row, index) => ({
      rowIndex: index + 2,
      idRegistro: row[0] || '',
      fechaHora: row[1] || '',
      userEmail: row[2] || '',
      denominacion: row[3] || '',
      ubicacion: row[4] || '',
      logo: row[5] || '',
    }));
  } catch (error) {
    console.error('Error reading proyectos:', error);
    return [];
  }
}

export async function getProyectoById(idRegistro: string): Promise<Proyecto | null> {
  const proyectos = await getProyectos();
  const proyecto = proyectos.find(p => p.idRegistro === idRegistro);
  return proyecto || null;
}

export async function appendProyecto(
  proyecto: Omit<Proyecto, 'rowIndex'>
): Promise<number> {
  try {
    const values = [[
      proyecto.idRegistro,
      proyecto.fechaHora || new Date().toISOString(),
      proyecto.userEmail || '',
      proyecto.denominacion,
      proyecto.ubicacion,
      proyecto.logo || '',
    ]];
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'PROYECTO!A2:F',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    const updatedRange = response.data.updates?.updatedRange;
    const rowIndex = updatedRange ? parseInt(updatedRange.split('!')[1].split(':')[0].replace(/[^0-9]/g, '')) : 0;
    console.log('Proyecto agregado en fila:', rowIndex);
    return rowIndex;
  } catch (error) {
    console.error('Error appending proyecto:', error);
    throw new Error('Error al agregar proyecto: ' + (error as Error).message);
  }
}

export async function updateProyecto(
  rowIndex: number,
  proyecto: Partial<Omit<Proyecto, 'rowIndex'>>
): Promise<void> {
  try {
    const updates: { range: string; values: string[][] }[] = [];
    if (proyecto.idRegistro !== undefined) {
      updates.push({ range: `PROYECTO!A${rowIndex}`, values: [[proyecto.idRegistro]] });
    }
    if (proyecto.fechaHora !== undefined) {
      updates.push({ range: `PROYECTO!B${rowIndex}`, values: [[proyecto.fechaHora]] });
    }
    if (proyecto.userEmail !== undefined) {
      updates.push({ range: `PROYECTO!C${rowIndex}`, values: [[proyecto.userEmail]] });
    }
    if (proyecto.denominacion !== undefined) {
      updates.push({ range: `PROYECTO!D${rowIndex}`, values: [[proyecto.denominacion]] });
    }
    if (proyecto.ubicacion !== undefined) {
      updates.push({ range: `PROYECTO!E${rowIndex}`, values: [[proyecto.ubicacion]] });
    }
    if (proyecto.logo !== undefined) {
      updates.push({ range: `PROYECTO!F${rowIndex}`, values: [[proyecto.logo]] });
    }
    if (updates.length === 0) {
      console.log('No hay campos para actualizar');
      return;
    }
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates,
      },
    });
    console.log('Proyecto actualizado en fila:', rowIndex);
  } catch (error) {
    console.error('Error updating proyecto:', error);
    throw new Error('Error al actualizar proyecto: ' + (error as Error).message);
  }
}

export async function deleteProyecto(rowIndex: number): Promise<void> {
  try {
    const sheetId = await getSheetId();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        }],
      },
    });
    console.log('Proyecto eliminado de fila:', rowIndex);
  } catch (error) {
    console.error('Error deleting proyecto:', error);
    throw new Error('Error al eliminar proyecto: ' + (error as Error).message);
  }
}
