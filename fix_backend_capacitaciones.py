import sys

with open('src/server/index.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

ancla = "// Fallback SPA"

nuevas_rutas = '''// ============================================
// API REST - CAPACITACIONES Y CHARLAS DE SEGURIDAD
// ============================================

app.get('/api/capacitaciones', async (c) => {
  try {
    const proyecto = c.req.query('proyecto');
    const data = proyecto ? await getCapacitacionesByProyecto(proyecto) : await getAllCapacitaciones();
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/capacitaciones', async (c) => {
  try {
    const body = await c.req.json();
    const idRegistro = body.idRegistro || `CAP-${Date.now()}`;
    await appendCapacitacion({
      idRegistro,
      fechaHora: new Date().toISOString(),
      userEmail: body.userEmail || 'sistema',
      proyecto: body.proyecto || '',
      titulo: body.titulo || '',
      fechaProgramada: body.fechaProgramada || '',
      hora: body.hora || '',
      lugar: body.lugar || '',
      responsable: body.responsable || '',
      tipo: body.tipo || '',
      estado: body.estado || 'Pendiente',
      fechaRealizada: body.fechaRealizada || '',
      asistentes: body.asistentes || '',
      observaciones: body.observaciones || '',
      evidenciaPDF: body.evidenciaPDF || '',
      temasTratados: body.temasTratados || '',
    });
    return c.json({ success: true, message: 'Charla programada', idRegistro });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/api/capacitaciones/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await updateCapacitacion(rowIndex, body);
    return c.json({ success: true, message: 'Charla actualizada' });
  } catch (error: any) {
    console.error('Error PUT /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/api/capacitaciones/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await deleteCapacitacion(rowIndex);
    return c.json({ success: true, message: 'Charla eliminada' });
  } catch (error: any) {
    console.error('Error DELETE /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/capacitaciones/evidencia', async (c) => {
  try {
    const body = await c.req.json();
    const archivos = body.archivos || [];
    if (archivos.length === 0) {
      return c.json({ error: 'No se proporcionaron archivos' }, 400);
    }
    const urls: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const nombreArchivo = `CAPACITACION_${body.idRegistro || Date.now()}_${i}_${Date.now()}.pdf`;
      const url = await subirPDFAGCS(archivo.base64, nombreArchivo, archivo.mimeType || 'application/pdf');
      urls.push(url);
    }
    return c.json({ success: true, urls });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones/evidencia:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

'''

if ancla not in contenido:
    print("ERROR: no encontre el punto de insercion. No se modifico nada.")
    sys.exit(1)

contenido = contenido.replace(ancla, nuevas_rutas + ancla, 1)

with open('src/server/index.ts', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("Listo! Rutas de capacitaciones agregadas al servidor.")
