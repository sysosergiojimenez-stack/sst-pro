import sys

with open('src/client/components/CapacitacionesCharlas.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

cambios.append((
    "import { GraduationCap, Calendar as CalendarIcon, List, Plus, X, Save, Pencil, Trash2, Eye, CheckCircle2, Clock, MapPin, FileText, ChevronLeft, ChevronRight, Users } from 'lucide-react';",
    "import { GraduationCap, Calendar as CalendarIcon, List, Plus, X, Save, Pencil, Trash2, Eye, CheckCircle2, Clock, MapPin, FileText, ChevronLeft, ChevronRight, Users, Image as ImageIcon } from 'lucide-react';"
))

cambios.append((
"""  evidenciaPDF: string;
  temasTratados: string;
}""",
"""  evidenciaPDF: string;
  temasTratados: string;
  imagenesAsistencia: string;
}"""
))

cambios.append((
    "  const [pdfFiles, setPdfFiles] = useState<File[]>([]);\n  const [guardandoRealizada, setGuardandoRealizada] = useState(false);",
    "  const [pdfFiles, setPdfFiles] = useState<File[]>([]);\n  const [imagenesPlanilla, setImagenesPlanilla] = useState<File[]>([]);\n  const [guardandoRealizada, setGuardandoRealizada] = useState(false);"
))

cambios.append((
"""    setAsistentesSeleccionados([]);
    setPdfFiles([]);
  };""",
"""    setAsistentesSeleccionados([]);
    setPdfFiles([]);
    setImagenesPlanilla([]);
  };"""
))

cambios.append((
"""  const handleGuardarRealizada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRealizarForm) return;
    if (asistentesSeleccionados.length === 0) {
      alert('Seleccione al menos un asistente');
      return;
    }
    setGuardandoRealizada(true);
    try {
      let urls: string[] = [];
      if (pdfFiles.length > 0) {
        const archivos = await Promise.all(pdfFiles.map(f => new Promise<{ base64: string; mimeType: string; nombre: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType: f.type, nombre: f.name });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        })));
        const upRes = await fetch('/api/capacitaciones/evidencia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivos, idRegistro: showRealizarForm.idRegistro }),
        });
        const upData = await upRes.json();
        if (upData.success) urls = upData.urls;
      }

      const asistentesData = asistentesSeleccionados.map(doc => {
        const emp = empleados.find(e => e.nroDocumento === doc);
        return { nroDocumento: doc, nombre: emp ? `${emp.nombres} ${emp.apellidos}` : doc };
      });

      await fetch(`/api/capacitaciones/${showRealizarForm.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Realizada',
          fechaRealizada: realizarForm.fechaRealizada,
          asistentes: JSON.stringify(asistentesData),
          observaciones: realizarForm.observaciones,
          temasTratados: realizarForm.temasTratados,
          evidenciaPDF: JSON.stringify(urls),
        }),
      });

      setShowRealizarForm(null);
      fetchData();
      alert('Charla marcada como realizada!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoRealizada(false);
    }
  };""",
"""  const handleGuardarRealizada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRealizarForm) return;
    if (asistentesSeleccionados.length === 0 && imagenesPlanilla.length === 0) {
      alert('Seleccione al menos un asistente o suba una foto de la planilla de firmas');
      return;
    }
    setGuardandoRealizada(true);
    try {
      let urls: string[] = [];
      if (pdfFiles.length > 0) {
        const archivos = await Promise.all(pdfFiles.map(f => new Promise<{ base64: string; mimeType: string; nombre: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType: f.type, nombre: f.name });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        })));
        const upRes = await fetch('/api/capacitaciones/evidencia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivos, idRegistro: showRealizarForm.idRegistro }),
        });
        const upData = await upRes.json();
        if (upData.success) urls = upData.urls;
      }

      const asistentesData = asistentesSeleccionados.map(doc => {
        const emp = empleados.find(e => e.nroDocumento === doc);
        return { nroDocumento: doc, nombre: emp ? `${emp.nombres} ${emp.apellidos}` : doc };
      });

      let urlsImagenes: string[] = [];
      if (imagenesPlanilla.length > 0) {
        const imagenesBase64 = await Promise.all(imagenesPlanilla.map(f => new Promise<{ base64: string; mimeType: string; nombre: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType: f.type, nombre: f.name });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        })));

        try {
          const extractRes = await fetch('/api/capacitaciones/extract-asistentes-imagenes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagenes: imagenesBase64 }),
          });
          const extractData = await extractRes.json();
          if (extractData.success && Array.isArray(extractData.data?.asistentes)) {
            for (const a of extractData.data.asistentes) {
              const yaExiste = asistentesData.some(x =>
                (a.documento && x.nroDocumento === a.documento) ||
                (!a.documento && x.nombre.toLowerCase() === (a.nombre || '').toLowerCase())
              );
              if (!yaExiste && a.nombre) {
                asistentesData.push({ nroDocumento: a.documento || '', nombre: a.nombre });
              }
            }
          } else {
            alert('La IA no pudo leer las fotos de la planilla. Se usaran solo los asistentes seleccionados manualmente.');
          }
        } catch {
          alert('Hubo un error leyendo las fotos con IA. Se usaran solo los asistentes seleccionados manualmente.');
        }

        const upImgRes = await fetch('/api/capacitaciones/imagenes-asistencia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivos: imagenesBase64, idRegistro: showRealizarForm.idRegistro }),
        });
        const upImgData = await upImgRes.json();
        if (upImgData.success) urlsImagenes = upImgData.urls;
      }

      await fetch(`/api/capacitaciones/${showRealizarForm.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Realizada',
          fechaRealizada: realizarForm.fechaRealizada,
          asistentes: JSON.stringify(asistentesData),
          observaciones: realizarForm.observaciones,
          temasTratados: realizarForm.temasTratados,
          evidenciaPDF: JSON.stringify(urls),
          imagenesAsistencia: JSON.stringify(urlsImagenes),
        }),
      });

      setShowRealizarForm(null);
      setImagenesPlanilla([]);
      fetchData();
      alert('Charla marcada como realizada!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoRealizada(false);
    }
  };"""
))

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
                <label className="block text-sm font-medium mb-2">Fotos de la planilla de firmas (la IA lee los asistentes de aca)</label>
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

cambios.append((
"""    const asistentesData = parseAsistentes(cap.asistentes);
    const evidencias = parseEvidencias(cap.evidenciaPDF);
    const esRealizada = (cap.estado || '').toLowerCase() === 'realizada';""",
"""    const asistentesData = parseAsistentes(cap.asistentes);
    const evidencias = parseEvidencias(cap.evidenciaPDF);
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
    print("Listo! Los 7 cambios del frontend se aplicaron correctamente.")
else:
    sys.exit(1)
