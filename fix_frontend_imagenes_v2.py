import sys

with open('src/client/components/CapacitacionesCharlas.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Import: agregar Image
cambios.append((
    "import { GraduationCap, Calendar as CalendarIcon, List, Plus, X, Save, Pencil, Trash2, Eye, CheckCircle2, Clock, MapPin, FileText, ChevronLeft, ChevronRight, Users } from 'lucide-react';",
    "import { GraduationCap, Calendar as CalendarIcon, List, Plus, X, Save, Pencil, Trash2, Eye, CheckCircle2, Clock, MapPin, FileText, ChevronLeft, ChevronRight, Users, Image as ImageIcon } from 'lucide-react';"
))

# 2. Interface: agregar imagenesAsistencia
cambios.append((
"""  evidenciaPDF: string;
  temasTratados: string;
}""",
"""  evidenciaPDF: string;
  temasTratados: string;
  imagenesAsistencia: string;
}"""
))

# 3. Estado: nuevo state para las imagenes
cambios.append((
    "  const [pdfFiles, setPdfFiles] = useState<File[]>([]);\n  const [guardandoRealizada, setGuardandoRealizada] = useState(false);",
    "  const [pdfFiles, setPdfFiles] = useState<File[]>([]);\n  const [imagenesPlanilla, setImagenesPlanilla] = useState<File[]>([]);\n  const [guardandoRealizada, setGuardandoRealizada] = useState(false);"
))

# 4. startRealizar: resetear imagenesPlanilla
cambios.append((
"""  const startRealizar = (cap: Capacitacion) => {
    setShowRealizarForm(cap);
    setRealizarForm({ fechaRealizada: new Date().toISOString().split('T')[0], observaciones: '', temasTratados: '' });
    setAsistentesSeleccionados([]);
    setPdfFiles([]);
  };""",
"""  const startRealizar = (cap: Capacitacion) => {
    setShowRealizarForm(cap);
    setRealizarForm({ fechaRealizada: new Date().toISOString().split('T')[0], observaciones: '', temasTratados: '' });
    setAsistentesSeleccionados([]);
    setPdfFiles([]);
    setImagenesPlanilla([]);
  };"""
))

# 5. Declarar variables nuevas al inicio de handleGuardarRealizada
cambios.append((
"""    try {
      let urls: string[] = [];
      let asistentesExtraidosIA: any[] = [];
      let temasExtraidos = realizarForm.temasTratados;
      let observacionesExtraidas = realizarForm.observaciones;""",
"""    try {
      let urls: string[] = [];
      let urlsImagenes: string[] = [];
      let asistentesExtraidosIA: any[] = [];
      let asistentesExtraidosImagenes: any[] = [];
      let temasExtraidos = realizarForm.temasTratados;
      let observacionesExtraidas = realizarForm.observaciones;"""
))

# 6. Insertar el bloque de procesamiento de imagenes, despues del bloque de PDFs
cambios.append((
"""      }

      // 2. Combinar asistentes: IA + seleccionados manualmente
      let asistentesFinales: any[] = [];""",
"""      }

      // 1b. Procesar imagenes de planilla de firmas (mas barato en tokens que el PDF completo)
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

        console.log('[FRONT] Extrayendo asistentes de', imagenesBase64.length, 'imagenes con IA...');
        const extractImgRes = await fetch('/api/capacitaciones/extract-asistentes-imagenes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagenes: imagenesBase64.map(im => ({ base64: im.base64, mimeType: im.mimeType })) }),
        });
        const extractImgData = await extractImgRes.json();
        console.log('[FRONT] Respuesta IA (imagenes):', extractImgData);
        if (extractImgData.success && extractImgData.data?.asistentes) {
          asistentesExtraidosImagenes = extractImgData.data.asistentes;
          console.log('[FRONT] IA extrajo', asistentesExtraidosImagenes.length, 'asistentes de las imagenes');
        } else {
          alert('La IA no pudo leer las imagenes de la planilla. Se usaran los demas asistentes detectados.');
        }
      }

      // 2. Combinar asistentes: IA (PDF) + IA (imagenes) + seleccionados manualmente
      let asistentesFinales: any[] = [];"""
))

# 7. Mezclar los asistentes extraidos de imagenes en la lista final (justo antes de la validacion final)
cambios.append((
"""      asistentesSeleccionados.forEach(doc => {
        if (!docsIA.has(doc)) {
          const emp = empleados.find(e => e.nroDocumento === doc);
          asistentesFinales.push({
            nroDocumento: doc,
            nombre: emp ? `${emp.nombres} ${emp.apellidos}` : doc,
            cargo: emp?.cargo || 'N/A',
            asistio: true,
          });
        }
      });

      if (asistentesFinales.length === 0 && asistentesSeleccionados.length === 0) {""",
"""      asistentesSeleccionados.forEach(doc => {
        if (!docsIA.has(doc)) {
          const emp = empleados.find(e => e.nroDocumento === doc);
          asistentesFinales.push({
            nroDocumento: doc,
            nombre: emp ? `${emp.nombres} ${emp.apellidos}` : doc,
            cargo: emp?.cargo || 'N/A',
            asistio: true,
          });
        }
      });

      // Agregar asistentes extraidos de las imagenes de planilla que no esten ya en la lista
      asistentesExtraidosImagenes.forEach((a: any) => {
        const yaExiste = asistentesFinales.some(x =>
          (a.documento && x.nroDocumento === a.documento) ||
          (!a.documento && x.nombre.toLowerCase() === (a.nombre || '').toLowerCase())
        );
        if (!yaExiste && a.nombre) {
          const emp = empleados.find(e => e.nroDocumento === a.documento);
          asistentesFinales.push({
            nroDocumento: a.documento || emp?.nroDocumento || 'N/A',
            nombre: emp ? `${emp.nombres} ${emp.apellidos}` : a.nombre,
            cargo: a.cargo || emp?.cargo || 'N/A',
            asistio: true,
          });
        }
      });

      if (asistentesFinales.length === 0 && asistentesSeleccionados.length === 0) {"""
))

# 8. Guardar imagenesAsistencia en el PUT y limpiar el estado
cambios.append((
"""          evidenciaPDF: JSON.stringify(urls),
        }),
      });

      setShowRealizarForm(null);
      setPdfFiles([]);
      setAsistentesSeleccionados([]);""",
"""          evidenciaPDF: JSON.stringify(urls),
          imagenesAsistencia: JSON.stringify(urlsImagenes),
        }),
      });

      setShowRealizarForm(null);
      setPdfFiles([]);
      setImagenesPlanilla([]);
      setAsistentesSeleccionados([]);"""
))

# 9. Agregar el input de imagenes en el formulario
cambios.append((
"""              <div>
                <label className="block text-sm font-medium mb-2">Evidencia (PDF, uno o varios)</label>
                <input type="file" accept=".pdf" multiple onChange={(e) => setPdfFiles(Array.from(e.target.files || []))} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                {pdfFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {pdfFiles.map((f, idx) => (
                      <p key={idx} className="text-xs text-primary flex items-center gap-1"><FileText size={12} /> {f.name}</p>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={guardandoRealizada} className="w-full btn-gradient text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50">""",
"""              <div>
                <label className="block text-sm font-medium mb-2">Evidencia (PDF, uno o varios)</label>
                <input type="file" accept=".pdf" multiple onChange={(e) => setPdfFiles(Array.from(e.target.files || []))} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                {pdfFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {pdfFiles.map((f, idx) => (
                      <p key={idx} className="text-xs text-primary flex items-center gap-1"><FileText size={12} /> {f.name}</p>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fotos de la planilla de firmas (mas rapido y barato que subir el PDF completo)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setImagenesPlanilla(Array.from(e.target.files || []))} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                {imagenesPlanilla.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {imagenesPlanilla.map((f, idx) => (
                      <p key={idx} className="text-xs text-primary flex items-center gap-1"><ImageIcon size={12} /> {f.name}</p>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={guardandoRealizada} className="w-full btn-gradient text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50">"""
))

# 10. Mostrar galeria de imagenes en la fila expandida
cambios.append((
"""    const evidencias = parseEvidencias(cap.evidenciaPDF);
    const esRealizada = (cap.estado || '').toLowerCase() === 'realizada';""",
"""    const evidencias = parseEvidencias(cap.evidenciaPDF);
    const imagenesPlanillaCargadas = parseEvidencias(cap.imagenesAsistencia);
    const esRealizada = (cap.estado || '').toLowerCase() === 'realizada';"""
))

cambios.append((
"""              <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><FileText size={14} /> Evidencia ({evidencias.length})</h4>
              {evidencias.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {evidencias.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs bg-background/50 px-3 py-1.5 rounded-lg text-primary hover:underline flex items-center gap-1">
                      <FileText size={12} /> Evidencia {idx + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin evidencia cargada</p>
              )}
            </td>""",
"""              <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><FileText size={14} /> Evidencia ({evidencias.length})</h4>
              {evidencias.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {evidencias.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs bg-background/50 px-3 py-1.5 rounded-lg text-primary hover:underline flex items-center gap-1">
                      <FileText size={12} /> Evidencia {idx + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Sin evidencia cargada</p>
              )}
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><ImageIcon size={14} /> Fotos de planilla de firmas ({imagenesPlanillaCargadas.length})</h4>
              {imagenesPlanillaCargadas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {imagenesPlanillaCargadas.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={url} alt={`Planilla ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border hover:border-primary transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin fotos de planilla</p>
              )}
            </td>"""
))

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
    print("Listo! Los 11 cambios se aplicaron correctamente.")
else:
    sys.exit(1)
