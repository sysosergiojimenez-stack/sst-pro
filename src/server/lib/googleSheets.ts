import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'sst-documentos-empleados';
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID || 'sg-sst-501720';

export const auth = new google.auth.GoogleAuth({
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

export async function eliminarDeGCS(url: string): Promise<void> {
  try {
    if (!url || !url.includes('storage.googleapis.com')) {
      console.warn('[GCS] URL no válida para eliminar:', url);
      return;
    }
    const path = new URL(url).pathname;
    const parts = path.split('/');
    if (parts.length < 3) {
      console.warn('[GCS] No se pudo extraer nombre de objeto de:', url);
      return;
    }
    const objectName = parts.slice(2).join('/');
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      console.warn('[GCS] No se pudo obtener token para eliminar:', url);
      return;
    }
    const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET_NAME}/o/${encodeURIComponent(objectName)}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token.token },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[GCS] No se pudo eliminar objeto:', response.status, errorText);
      return;
    }
    console.log('[GCS] Objeto eliminado:', objectName);
  } catch (error) {
    console.warn('[GCS] Error eliminando objeto (ignorado):', error);
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
  fechaInicioContrato: string;
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
    throw new Error('Archivo vacio o base64 invalido. Length: ' + (base64PDF?.length || 0));
  }
  const prompt = `Analiza este archivo. Puede ser un PDF de varias paginas o una foto (JPG, PNG, WEBP o HEIC) de los documentos de un mismo trabajador. Pueden aparecer los siguientes tipos de documentos, todos OPCIONALES (puede venir solo uno, o varios juntos). Segui estas reglas ESTRICTAMENTE sobre de que documento sacar cada dato:

1. CEDULA DE IDENTIDAD (Republica del Paraguay): esta es la UNICA fuente para NOMBRES, APELLIDOS, NUMERO DE DOCUMENTO y FECHA DE NACIMIENTO. Usa solamente este documento para esos 4 campos, salvo que no este presente o no sea legible (ver REGLA DE RESPALDO).

2. ACTA DE INDUCCION EN SEGURIDAD PARA TRABAJADOR NUEVO (formulario con checklist de riesgos y firmas): usa este documento UNICAMENTE para extraer el CARGO, tomando el campo "CARGO O LABOR A DESEMPEÑAR"; y la FECHA DE INICIO DE CONTRATO, tomando la fecha que aparece en la celda "Fecha" del acta. No uses este documento para ningun otro campo.

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
  "telefonoEmergencia": "telefono de emergencia",
  "fechaInicioContrato": "fecha de inicio de contrato, tomada del campo Fecha del acta de induccion en seguridad (DD/MM/YYYY)"
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

export interface DetallePlanillaIPS {
  nroCic: string;
  mov: string;
}

export interface PlanillaIPSExtraida {
  periodo: string;
  empleados: DetallePlanillaIPS[];
}

export async function extraerPlanillaIPSConGemini(
  base64PDF: string,
  mimeType: string = 'application/pdf'
): Promise<PlanillaIPSExtraida> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no configurada en .env');
  }
  console.log('Usando gemini-2.5-flash para planilla IPS...');
  if (!base64PDF || base64PDF.length < 100) {
    throw new Error('PDF vacio o base64 invalido. Length: ' + (base64PDF?.length || 0));
  }
  const prompt = `Analiza este documento PDF correspondiente a una "Declaracion Jurada de Salarios" del Instituto de Prevision Social (IPS) de Paraguay (Detalle de Planilla).

Extrae ESTRICTAMENTE:
1. El PERIODO de la planilla. Aparece en el encabezado con formato similar a "1000 - MAYO/2026" o "MAYO/2026". Devuelve solo el mes y el año en mayusculas, por ejemplo "MAYO/2026".
2. Para cada fila de empleado, extrae:
   - "nroCic": el numero de cedula de identidad del asegurado. Este se encuentra en la columna "Nro Cic", que es la SEGUNDA columna numerica de la fila. La primera columna numerica es "Ide Asecot" (un codigo interno del IPS) y NO debe confundirse con el CIC. Usa UNICAMENTE el valor de la columna "Nro Cic".
   - "mov": el tipo de movimiento (columna "Salario Imponible Mov"). Los valores tipicos son NORMAL, ENTRADA, SALIDA. Devuelve el valor tal cual aparece en mayusculas.

Ejemplo de fila:
Ide Asecot: 2282229 | Nro Cic: 5076312 | Asegurado: ACOSTA ISASI PEDRO JAVIER | Mov: NORMAL
Debe extraerse: {"nroCic": "5076312", "mov": "NORMAL"}

Responde UNICAMENTE en formato JSON con esta estructura exacta:
{
  "periodo": "MAYO/2026",
  "empleados": [
    {"nroCic": "1234567", "mov": "NORMAL"},
    {"nroCic": "7654321", "mov": "ENTRADA"}
  ]
}
Si no hay datos, devuelve periodo vacio y empleados vacio []. NO incluyas explicaciones, SOLO el JSON.`;
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
          generationConfig: { temperature: 0.1, maxOutputTokens: 65535 }
        })
      }
    );
    console.log('Gemini IPS status:', response.status);
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
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      try { datos = JSON.parse(markdownMatch[1].trim()); } catch { /* ignore */ }
    }
    if (!datos) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { datos = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
      }
    }
    if (!datos) {
      console.error('Texto completo recibido de Gemini:', text);
      throw new Error('No se pudo extraer JSON de la respuesta de Gemini');
    }
    return {
      periodo: datos.periodo || '',
      empleados: Array.isArray(datos.empleados) ? datos.empleados.map((e: any) => ({ nroCic: String(e.nroCic || ''), mov: String(e.mov || '') })) : [],
    };
  } catch (error) {
    console.error('Error en Gemini IPS:', error);
    throw error;
  }
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
