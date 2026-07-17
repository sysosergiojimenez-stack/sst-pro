import sys

with open('src/client/components/CapacitacionesCharlas.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Interface Empleado: agregar cargo y empresa
cambios.append((
"""interface Empleado {
  rowIndex: number;
  nroDocumento: string;
  nombres: string;
  apellidos: string;
}""",
"""interface Empleado {
  rowIndex: number;
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  cargo?: string;
  empresa?: string;
}"""
))

# 2. Nuevo estado para cachear las asistencias por charla
cambios.append((
    "  const [imagenesPlanilla, setImagenesPlanilla] = useState<File[]>([]);\n  const [guardandoRealizada, setGuardandoRealizada] = useState(false);",
    "  const [imagenesPlanilla, setImagenesPlanilla] = useState<File[]>([]);\n  const [guardandoRealizada, setGuardandoRealizada] = useState(false);\n  const [asistenciasPorCharla, setAsistenciasPorCharla] = useState<Record<string, any[]>>({});\n  const [cargandoAsistencias, setCargandoAsistencias] = useState<string | null>(null);"
))

# 3. Boton "Ver detalle": ahora tambien busca las asistencias reales al expandir
cambios.append((
'''              <button onClick={() => setExpandida(exp ? null : cap.idRegistro)} className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${exp ? 'text-primary bg-secondary' : ''}`} title="Ver detalle">
                <Eye size={16} />
              </button>''',
'''              <button onClick={async () => {
                const nuevoExp = exp ? null : cap.idRegistro;
                setExpandida(nuevoExp);
                if (nuevoExp && !asistenciasPorCharla[cap.idRegistro]) {
                  setCargandoAsistencias(cap.idRegistro);
                  try {
                    const resAs = await fetch(`/api/capacitaciones/${cap.idRegistro}/asistencias`);
                    const dataAs = await resAs.json();
                    if (dataAs.success) setAsistenciasPorCharla(prev => ({ ...prev, [cap.idRegistro]: dataAs.data }));
                  } catch {}
                  setCargandoAsistencias(null);
                }
              }} className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${exp ? 'text-primary bg-secondary' : ''}`} title="Ver detalle">
                <Eye size={16} />
              </button>'''
))

# 4. Bloque de Asistentes en el detalle: ahora usa la hoja relacionada, no el JSON viejo
cambios.append((
'''              <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Users size={14} /> Asistentes ({asistentesData.length})</h4>
              {asistentesData.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {asistentesData.map(a => (
                    <span key={a.nroDocumento} className="text-xs bg-background/50 px-3 py-1.5 rounded-lg">{a.nombre}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Sin asistentes registrados</p>
              )}''',
'''              <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Users size={14} /> Asistentes ({(asistenciasPorCharla[cap.idRegistro] || []).length})</h4>
              {cargandoAsistencias === cap.idRegistro ? (
                <p className="text-sm text-muted-foreground mb-4">Cargando asistentes...</p>
              ) : (asistenciasPorCharla[cap.idRegistro] || []).length > 0 ? (
                <div className="space-y-1 mb-4">
                  {(asistenciasPorCharla[cap.idRegistro] || []).map((a: any) => (
                    <div key={a.idRegistro} className="flex items-center justify-between bg-background/50 px-3 py-2 rounded-lg text-sm">
                      <div>
                        <span className="font-medium">{a.nombres} {a.apellidos}</span>
                        <span className="text-xs text-muted-foreground ml-2">CI: {a.nroDocumento}{a.empresa && ` \u00b7 ${a.empresa}`}{a.cargo && ` \u00b7 ${a.cargo}`}</span>
                      </div>
                      {a.encontradoEnNomina !== 'SI' && (
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full whitespace-nowrap">No encontrado en nomina</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Sin asistentes registrados</p>
              )}'''
))

# 5. Renombrar el campo de "Evidencia (PDF)" a fotos de la actividad, sin IA
cambios.append((
    '''<label className="block text-sm font-medium mb-2">Evidencia (PDF, uno o varios)</label>
                <input type="file" accept=".pdf" multiple onChange={(e) => setPdfFiles(Array.from(e.target.files || []))} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />''',
    '''<label className="block text-sm font-medium mb-2">Fotos de la actividad (evidencia general, no se procesan con IA)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setPdfFiles(Array.from(e.target.files || []))} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />'''
))

# 6. Reemplazar toda la funcion handleGuardarRealizada (usando marcadores, no texto exacto interior)
inicio_marca = "  const handleGuardarRealizada = async (e: React.FormEvent) => {"
fin_marca = "\n  const charlasOrdenadas = [...capacitaciones]"

idx_inicio = contenido.find(inicio_marca)
idx_fin = contenido.find(fin_marca)

if idx_inicio == -1 or idx_fin == -1 or idx_fin < idx_inicio:
    print("ERROR: no encontre los marcadores de handleGuardarRealizada. No se modifico nada.")
    sys.exit(1)

nueva_funcion = '''  const handleGuardarRealizada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRealizarForm) return;
    if (asistentesSeleccionados.length === 0 && imagenesPlanilla.length === 0) {
      alert('Seleccione al menos un asistente o suba una foto de la planilla de firmas');
      return;
    }
    setGuardandoRealizada(true);
    try {
      // 1. Subir fotos de la actividad (evidencia general, sin IA)
      let urls: string[] = [];
      if (pdfFiles.length > 0) {
        const archivosActividad = await Promise.all(pdfFiles.map(f => new Promise<{ base64: string; mimeType: string; nombre: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType: f.type, nombre: f.name });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        })));
        const upRes = await fetch('/api/capacitaciones/evidencia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivos: archivosActividad, idRegistro: showRealizarForm.idRegistro }),
        });
        const upData = await upRes.json();
        if (upData.success) urls = upData.urls;
      }

      // 2. Procesar fotos de la planilla de firmas: subir + leer columna CIC con IA
      let urlsImagenes: string[] = [];
      const cedulasDetectadas: { documento: string; nombreLeido: string }[] = [];
      if (imagenesPlanilla.length > 0) {
        const imagenesBase64 = await Promise.all(imagenesPlanilla.map(f => new Promise<{ base64: string; mimeType: string; nombre: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType: f.type, nombre: f.name });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        })));

        const upImgRes = await fetch('/api/capacitaciones/imagenes-asistencia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivos: imagenesBase64, idRegistro: showRealizarForm.idRegistro }),
        });
        const upImgData = await upImgRes.json();
        if (upImgData.success) urlsImagenes = upImgData.urls;

        const extractRes = await fetch('/api/capacitaciones/extract-asistentes-imagenes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagenes: imagenesBase64.map(im => ({ base64: im.base64, mimeType: im.mimeType })) }),
        });
        const extractData = await extractRes.json();
        if (extractData.success && Array.isArray(extractData.data?.cedulas)) {
          cedulasDetectadas.push(...extractData.data.cedulas);
        } else {
          alert('La IA no pudo leer las cedulas de la planilla. Se usaran solo los asistentes seleccionados manualmente.');
        }
      }

      // 3. Cruzar las cedulas detectadas contra los Empleados del proyecto (la nomina)
      const asistenciasFinales: any[] = [];
      const documentosAgregados = new Set<string>();

      cedulasDetectadas.forEach(cd => {
        const doc = (cd.documento || '').trim();
        if (!doc || doc === 'NO_LEGIBLE' || documentosAgregados.has(doc)) return;
        documentosAgregados.add(doc);
        const emp = empleados.find(e => e.nroDocumento === doc);
        asistenciasFinales.push({
          nroDocumento: doc,
          nombres: emp ? emp.nombres : (cd.nombreLeido || ''),
          apellidos: emp ? emp.apellidos : '',
          empresa: emp ? (emp.empresa || '') : '',
          cargo: emp ? (emp.cargo || '') : '',
          encontradoEnNomina: !!emp,
        });
      });

      // 4. Agregar los seleccionados manualmente que no hayan salido ya de las fotos
      asistentesSeleccionados.forEach(doc => {
        if (documentosAgregados.has(doc)) return;
        documentosAgregados.add(doc);
        const emp = empleados.find(e => e.nroDocumento === doc);
        asistenciasFinales.push({
          nroDocumento: doc,
          nombres: emp?.nombres || '',
          apellidos: emp?.apellidos || '',
          empresa: emp?.empresa || '',
          cargo: emp?.cargo || '',
          encontradoEnNomina: true,
        });
      });

      // 5. Guardar las asistencias en la hoja relacionada (reemplaza cualquier intento anterior de esta charla)
      const batchRes = await fetch('/api/capacitaciones/asistencias-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCapacitacion: showRealizarForm.idRegistro,
          proyecto,
          fecha: realizarForm.fechaRealizada,
          asistencias: asistenciasFinales,
        }),
      });
      const batchData = await batchRes.json();

      // 6. Actualizar la charla (la columna vieja de "asistentes" ya no se usa)
      await fetch(`/api/capacitaciones/${showRealizarForm.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Realizada',
          fechaRealizada: realizarForm.fechaRealizada,
          observaciones: realizarForm.observaciones,
          temasTratados: realizarForm.temasTratados,
          evidenciaPDF: JSON.stringify(urls),
          imagenesAsistencia: JSON.stringify(urlsImagenes),
        }),
      });

      setAsistenciasPorCharla(prev => {
        const copia = { ...prev };
        delete copia[showRealizarForm.idRegistro];
        return copia;
      });
      setShowRealizarForm(null);
      setPdfFiles([]);
      setImagenesPlanilla([]);
      setAsistentesSeleccionados([]);
      fetchData();
      const noEncontrados = batchData?.noEncontrados || 0;
      alert(`Charla marcada como realizada! ${asistenciasFinales.length} asistentes registrados` + (noEncontrados > 0 ? ` (${noEncontrados} no encontrados en nomina).` : '.'));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoRealizada(false);
    }
  };
'''

contenido = contenido[:idx_inicio] + nueva_funcion + contenido[idx_fin:]

ok = True
for i, (viejo, nuevo) in enumerate(cambios, 1):
    if viejo not in contenido:
        print(f"ERROR en cambio #{i}: no encontre el bloque exacto. No se guardo nada.")
        ok = False
        break
    contenido = contenido.replace(viejo, nuevo, 1)

if ok:
    with open('src/client/components/CapacitacionesCharlas.tsx', 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("Listo! Frontend actualizado (funcion reemplazada + 5 cambios adicionales).")
else:
    sys.exit(1)
