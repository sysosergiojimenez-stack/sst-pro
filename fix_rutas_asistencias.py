import sys

with open('src/server/index.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Agregar los nuevos imports de funciones de asistencias
cambios.append((
"""import {
  getAllCapacitaciones, getCapacitacionesByProyecto,
  appendCapacitacion, updateCapacitacion, deleteCapacitacion
} from './lib/googleSheets_capacitaciones';""",
"""import {
  getAllCapacitaciones, getCapacitacionesByProyecto,
  appendCapacitacion, updateCapacitacion, deleteCapacitacion,
  getAsistenciasByCapacitacion, getAsistenciasByEmpleado,
  appendAsistenciasBatch, deleteAsistenciasByCapacitacion
} from './lib/googleSheets_capacitaciones';"""
))

# 2. Cambiar el prompt para que la IA lea SOLO la columna CIC
cambios.append((
"""    const promptTexto = 'Estas imagenes son paginas de una planilla de asistencia manuscrita de una charla de seguridad industrial (SST). ' +
      'Cada imagen tiene una tabla con columnas como: numero, NOMBRE TRABAJADOR, C.I.C. (cedula), Oficio/Especialidad, EMPRESA, FIRMA. ' +
      'Revisa TODAS las imagenes y extrae TODOS los trabajadores que aparecen, aunque el nombre este escrito a mano y sea dificil de leer. ' +
      'Si no puedes leer un dato, pon NO_LEIBLE en ese campo, pero igual incluye a la persona en la lista. ' +
      'No omitas a nadie. Responde SOLO con JSON valido en una sola linea, sin texto adicional, con este formato exacto: ' +
      '{"asistentes":[{"nombre":"...","documento":"...","cargo":""}],"totalAsistentes":0}';""",
"""    const promptTexto = 'Estas imagenes son paginas de una planilla de asistencia manuscrita de una charla de seguridad industrial (SST), con una tabla que tiene una columna llamada C.I.C. o CEDULA con numeros de documento escritos a mano. ' +
      'Tu tarea es leer UNICAMENTE la columna de numeros de cedula (C.I.C.), fila por fila, de arriba hacia abajo, en TODAS las imagenes. ' +
      'Para cada fila con un numero de cedula, anota tambien el nombre escrito en esa misma fila como referencia (puede estar mal escrito, no importa, es solo de respaldo). ' +
      'Si un numero de cedula es ilegible, pon NO_LEGIBLE en el campo documento pero igual incluye la fila. ' +
      'No omitas ninguna fila de la tabla. Responde SOLO con JSON valido en una sola linea, sin texto adicional, con este formato exacto: ' +
      '{"cedulas":[{"documento":"...","nombreLeido":"..."}],"totalDetectadas":0}';"""
))

# 3. Arreglar la extension del archivo en /api/capacitaciones/evidencia (ahora tambien sirve para fotos, no solo PDF)
cambios.append((
"""    const urls: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const nombreArchivo = `CAPACITACION_${body.idRegistro || Date.now()}_${i}_${Date.now()}.pdf`;
      const url = await subirPDFAGCS(archivo.base64, nombreArchivo, archivo.mimeType || 'application/pdf');
      urls.push(url);
    }
    return c.json({ success: true, urls });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones/evidencia:', error.message);""",
"""    const urls: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const mime = archivo.mimeType || 'application/pdf';
      const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'pdf';
      const nombreArchivo = `CAPACITACION_${body.idRegistro || Date.now()}_${i}_${Date.now()}.${ext}`;
      const url = await subirPDFAGCS(archivo.base64, nombreArchivo, mime);
      urls.push(url);
    }
    return c.json({ success: true, urls });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones/evidencia:', error.message);"""
))

# 4. Nuevas rutas: consultar y guardar asistencias relacionadas
ancla = "// Fallback SPA"

nuevas_rutas = '''// ============================================
// ASISTENCIAS DE CAPACITACION (hoja relacionada, para historial por trabajador)
// ============================================

app.get('/api/capacitaciones/:idCapacitacion/asistencias', async (c) => {
  try {
    const idCapacitacion = c.req.param('idCapacitacion');
    const data = await getAsistenciasByCapacitacion(idCapacitacion);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET asistencias:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/empleados/:nroDocumento/historial-capacitaciones', async (c) => {
  try {
    const nroDocumento = c.req.param('nroDocumento');
    const data = await getAsistenciasByEmpleado(nroDocumento);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET historial-capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/capacitaciones/asistencias-batch', async (c) => {
  try {
    const body = await c.req.json();
    const idCapacitacion = body.idCapacitacion;
    const asistencias = body.asistencias || [];
    if (!idCapacitacion) {
      return c.json({ error: 'idCapacitacion requerido' }, 400);
    }
    await deleteAsistenciasByCapacitacion(idCapacitacion);
    const registros = asistencias.map((a: any, idx: number) => ({
      idRegistro: `ASISCAP-${idCapacitacion}-${Date.now()}-${idx}`,
      idCapacitacion,
      proyecto: body.proyecto || '',
      fecha: body.fecha || '',
      nroDocumento: a.nroDocumento || '',
      nombres: a.nombres || '',
      apellidos: a.apellidos || '',
      empresa: a.empresa || '',
      cargo: a.cargo || '',
      encontradoEnNomina: a.encontradoEnNomina ? 'SI' : 'NO',
      fechaHora: new Date().toISOString(),
    }));
    await appendAsistenciasBatch(registros);
    const noEncontrados = registros.filter((r: any) => r.encontradoEnNomina === 'NO').length;
    return c.json({ success: true, total: registros.length, noEncontrados });
  } catch (error: any) {
    console.error('Error POST asistencias-batch:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

'''

ok = True
for i, (viejo, nuevo) in enumerate(cambios, 1):
    if viejo not in contenido:
        print(f"ERROR en cambio #{i}: no encontre el bloque exacto. No se guardo nada.")
        ok = False
        break
    contenido = contenido.replace(viejo, nuevo, 1)

if ok:
    if ancla not in contenido:
        print("ERROR: no encontre el punto de insercion para las rutas nuevas.")
        sys.exit(1)
    contenido = contenido.replace(ancla, nuevas_rutas + ancla, 1)
    with open('src/server/index.ts', 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("Listo! Rutas de asistencias agregadas (4 cambios).")
else:
    sys.exit(1)
