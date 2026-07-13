import { Hono } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

const app = new Hono();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.post('/api/gemini/epp-salida', async (c) => {
  try {
    const { pdfBase64, mimeType, proyecto } = await c.req.json();
    if (!pdfBase64) {
      return c.json({ error: 'No se proporciono PDF' }, 400);
    }
    if (!proyecto) {
      return c.json({ error: 'No se proporciono proyecto' }, 400);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Analiza este documento de nota de salida o entrega de Equipos de Proteccion Personal (EPP) y extrae la informacion en formato JSON.

Devuelve EXACTAMENTE este formato JSON (sin markdown, sin backticks, solo el JSON puro):

{
  "orden": "numero de orden o nota de salida",
  "fecha": "YYYY-MM-DD",
  "quienRetira": "nombre de la persona que retira",
  "items": [
    {
      "codigo": "codigo del producto",
      "nombre": "nombre descriptivo del producto",
      "cantidad": "cantidad como numero",
      "trabajador": "documento o nombre del trabajador que recibe"
    }
  ]
}

Instrucciones:
1. Extrae TODOS los items del documento
2. Si no hay codigo, usa el nombre como referencia
3. La fecha debe estar en formato YYYY-MM-DD
4. Si no hay items, devuelve un array vacio`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: pdfBase64, mimeType: mimeType || 'application/pdf' } },
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const data = JSON.parse(jsonStr);
    
    const bucket = getStorage().bucket();
    const fileName = `epp-salidas/${uuidv4()}.pdf`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(pdfBase64, 'base64');
    await file.save(buffer, { metadata: { contentType: mimeType || 'application/pdf' } });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    data.pdfUrl = publicUrl;
    data.proyecto = proyecto;
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error Gemini EPP Salida:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
