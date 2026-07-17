import sys

with open('src/server/index.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Agregar imagenesAsistencia al crear una charla nueva
cambios.append((
"""      evidenciaPDF: body.evidenciaPDF || '',
      temasTratados: body.temasTratados || '',
    });
    return c.json({ success: true, message: 'Charla programada', idRegistro });""",
"""      evidenciaPDF: body.evidenciaPDF || '',
      temasTratados: body.temasTratados || '',
      imagenesAsistencia: body.imagenesAsistencia || '',
    });
    return c.json({ success: true, message: 'Charla programada', idRegistro });"""
))

# 2. Nuevas rutas: subir imagenes + extraer asistentes solo de imagenes
ancla = "// Fallback SPA"

nuevas_rutas = '''// ============================================
// IMAGENES DE PLANILLAS DE ASISTENCIA (ahorra tokens vs mandar el PDF entero)
// ============================================

app.post('/api/capacitaciones/imagenes-asistencia', async (c) => {
  try {
    const body = await c.req.json();
    const archivos = body.archivos || [];
    if (archivos.length === 0) {
      return c.json({ error: 'No se proporcionaron imagenes' }, 400);
    }
    const urls: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const mime = archivo.mimeType || 'image/jpeg';
      const ext = mime.includes('png') ? 'png' : 'jpg';
      const nombreArchivo = `PLANILLA_${body.idRegistro || Date.now()}_${i}_${Date.now()}.${ext}`;
      const url = await subirPDFAGCS(archivo.base64, nombreArchivo, mime);
      urls.push(url);
    }
    return c.json({ success: true, urls });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones/imagenes-asistencia:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/capacitaciones/extract-asistentes-imagenes', async (c) => {
  try {
    const body = await c.req.json();
    const imagenes = body.imagenes || [];
    if (imagenes.length === 0) {
      return c.json({ error: 'No se proporcionaron imagenes' }, 400);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return c.json({ error: 'GEMINI_API_KEY no configurada' }, 500);
    }

    const promptTexto = 'Estas imagenes son paginas de una planilla de asistencia manuscrita de una charla de seguridad industrial (SST). ' +
      'Cada imagen tiene una tabla con columnas como: numero, NOMBRE TRABAJADOR, C.I.C. (cedula), Oficio/Especialidad, EMPRESA, FIRMA. ' +
      'Revisa TODAS las imagenes y extrae TODOS los trabajadores que aparecen, aunque el nombre este escrito a mano y sea dificil de leer. ' +
      'Si no puedes leer un dato, pon NO_LEIBLE en ese campo, pero igual incluye a la persona en la lista. ' +
      'No omitas a nadie. Responde SOLO con JSON valido en una sola linea, sin texto adicional, con este formato exacto: ' +
      '{"asistentes":[{"nombre":"...","documento":"...","cargo":""}],"totalAsistentes":0}';

    const parts: any[] = [{ text: promptTexto }];
    for (const img of imagenes) {
      parts.push({
        inline_data: {
          mime_type: img.mimeType || 'image/jpeg',
          data: img.base64,
        },
      });
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + geminiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Gemini extract-asistentes-imagenes:', response.status, errorText);
      return c.json({ error: `Gemini error: ${response.status}`, details: errorText }, 500);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let datosExtraidos: any = { asistentes: [], totalAsistentes: 0 };
    try {
      const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      datosExtraidos = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parseando JSON de imagenes:', parseError, 'texto:', text.substring(0, 500));
      return c.json({ error: 'No se pudo parsear la respuesta de la IA', rawResponse: text.substring(0, 1000) }, 500);
    }

    return c.json({ success: true, data: datosExtraidos });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones/extract-asistentes-imagenes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

'''

if ancla not in contenido:
    print("ERROR: no encontre el punto de insercion para las rutas nuevas.")
    sys.exit(1)

ok = True
for i, (viejo, nuevo) in enumerate(cambios, 1):
    if viejo not in contenido:
        print(f"ERROR en cambio #{i}: no encontre el bloque exacto. No se guardo nada.")
        ok = False
        break
    contenido = contenido.replace(viejo, nuevo, 1)

if ok:
    contenido = contenido.replace(ancla, nuevas_rutas + ancla, 1)
    with open('src/server/index.ts', 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("Listo! Rutas de imagenes agregadas al servidor.")
else:
    sys.exit(1)
