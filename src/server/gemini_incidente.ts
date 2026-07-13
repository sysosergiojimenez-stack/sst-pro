import { Hono } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

const app = new Hono();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.post('/api/gemini/incidente', async (c) => {
  try {
    const { pdfBase64, mimeType } = await c.req.json();
    if (!pdfBase64) {
      return c.json({ error: 'No se proporciono PDF' }, 400);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Analiza este documento de investigacion de incidente de seguridad industrial (SST) y extrae la siguiente informacion en formato JSON.

Devuelve EXACTAMENTE este formato JSON (sin markdown, sin backticks, solo el JSON puro):

{
  "idRegistro": "ID del incidente si existe, o genera uno con formato INC-YYYY-MM-NNN",
  "fechaIncidente": "YYYY-MM-DD",
  "horaIncidente": "HH:MM",
  "lugar": "lugar exacto donde ocurrio",
  "tipo": "uno de: Accidente, Enfermedad Laboral, Casi Accidente, Incidente Ambiental, Incidente de Seguridad, Incidente de Salud, Otro",
  "clasificacion": "uno de: Leve, Moderado, Grave, Fatal",
  "descripcion": "descripcion detallada de lo que ocurrio",
  "personasInvolucradas": "nombres y documentos de las personas involucradas",
  "causasInmediatas": "causas inmediatas identificadas",
  "causasRaiz": "analisis de causas raiz (5 porques)",
  "accionesCorrectivas": "acciones correctivas propuestas",
  "responsableAcciones": "persona responsable de ejecutar las acciones",
  "fechaCompromiso": "YYYY-MM-DD",
  "diasPerdidos": "numero de dias de incapacidad",
  "costoEstimado": "costo estimado del incidente",
  "investigador": "nombre del investigador"
}

Si algun campo no aparece en el documento, dejalo como string vacio.`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: pdfBase64, mimeType: mimeType || 'application/pdf' } },
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    let jsonStr = text;
    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const data = JSON.parse(jsonStr);
    
    const bucket = getStorage().bucket();
    const fileName = `incidentes/${uuidv4()}.pdf`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(pdfBase64, 'base64');
    await file.save(buffer, { metadata: { contentType: mimeType || 'application/pdf' } });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    data.evidencias = publicUrl;
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error Gemini incidente:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
