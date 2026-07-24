import { useState, useEffect, Fragment } from 'react';
import jsPDF from 'jspdf';
import {
  ClipboardCheck, Plus, X, Save, Trash2, Pencil, Calendar, User, Clock,
  ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, MinusCircle,
  Settings, ExternalLink, Image as ImageIcon, PlayCircle, FileText, CheckSquare, Square
} from 'lucide-react';

interface Inspeccion {
  rowIndex: number;
  idRegistro: string;
  proyecto: string;
  fechaProgramada: string;
  inspector: string;
  estado: string;
  fechaRealizada: string;
  observacionesGenerales: string;
  idTemplateChecklist: string;
  areaEquipo: string;
}

interface ItemChecklist {
  item: string;
  resultado: string;
  observacion: string;
  fotos: string;
  accionCorrectiva: string;
  responsableAccion: string;
  fechaLimite: string;
  estadoAccion: string;
}

interface TemplateItem {
  rowIndex: number;
  id: string;
  idTemplate: string;
  texto: string;
  orden: number;
  activo: string;
}

interface TemplateGroup {
  rowIndex: number;
  id: string;
  nombre: string;
  activo: string;
}

interface InspeccionesProps {
  proyecto: string;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(',')[1], mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const RESULTADOS = ['Cumple', 'No Cumple', 'N/A'];

export default function Inspecciones({ proyecto }: InspeccionesProps) {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [template, setTemplate] = useState<TemplateItem[]>([]);
  const [templateGroups, setTemplateGroups] = useState<TemplateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<'lista' | 'calendario'>('lista');
  const [expandida, setExpandida] = useState<string | null>(null);
  const [itemsExpandidos, setItemsExpandidos] = useState<ItemChecklist[]>([]);

  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const [showProgramarForm, setShowProgramarForm] = useState(false);
  const [programarForm, setProgramarForm] = useState({ fechaProgramada: '', inspector: '', idTemplateChecklist: '', areaEquipo: '' });

  const [showChecklistForm, setShowChecklistForm] = useState<Inspeccion | null>(null);
  const [checklistItems, setChecklistItems] = useState<ItemChecklist[]>([]);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);

  const [showGestionChecklist, setShowGestionChecklist] = useState(false);
  const [nuevoItemTexto, setNuevoItemTexto] = useState('');
  const [editandoTemplateId, setEditandoTemplateId] = useState<number | null>(null);
  const [editandoTemplateTexto, setEditandoTemplateTexto] = useState('');
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [grupoGestion, setGrupoGestion] = useState<string | null>(null);
  const [itemsGrupoGestion, setItemsGrupoGestion] = useState<TemplateItem[]>([]);
  const [editandoGrupoId, setEditandoGrupoId] = useState<number | null>(null);
  const [editandoGrupoNombre, setEditandoGrupoNombre] = useState('');

  const [deletingId, setDeletingId] = useState<Inspeccion | null>(null);
  const [editingInspeccion, setEditingInspeccion] = useState<Inspeccion | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [editForm, setEditForm] = useState({ fechaProgramada: '', inspector: '', idTemplateChecklist: '', areaEquipo: '' });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inspRes, tplRes, grpRes] = await Promise.all([
        fetch(`/api/inspecciones?proyecto=${encodeURIComponent(proyecto)}`),
        fetch('/api/checklist-template'),
        fetch('/api/checklist-templates'),
      ]);
      const inspData = inspRes.ok ? await inspRes.json() : { data: [] };
      const tplData = tplRes.ok ? await tplRes.json() : { data: [] };
      const grpData = grpRes.ok ? await grpRes.json() : { data: [] };
      setInspecciones(inspData.data || []);
      setTemplate((tplData.data || []).filter((t: TemplateItem) => (t.activo || 'TRUE').toUpperCase() !== 'FALSE'));
      setTemplateGroups((grpData.data || []).filter((g: TemplateGroup) => (g.activo || 'TRUE').toUpperCase() !== 'FALSE'));
    } catch (err) {
      console.error('Error cargando inspecciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [proyecto]);

  const handleProgramar = async () => {
    if (!programarForm.fechaProgramada || !programarForm.inspector || !programarForm.idTemplateChecklist) {
      alert('Completa la fecha, el inspector y el checklist a realizar');
      return;
    }
    try {
      await fetch('/api/inspecciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...programarForm, proyecto }),
      });
      setShowProgramarForm(false);
      setProgramarForm({ fechaProgramada: '', inspector: '', idTemplateChecklist: '', areaEquipo: '' });
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const abrirChecklist = async (insp: Inspeccion) => {
    setShowChecklistForm(insp);
    setObservacionesGenerales(insp.observacionesGenerales || '');
    setChecklistItems([]);
    try {
      const res = await fetch(`/api/checklist-template?idTemplate=${encodeURIComponent(insp.idTemplateChecklist)}`);
      const data = await res.json();
      const items: TemplateItem[] = (data.data || []).filter((t: TemplateItem) => (t.activo || 'TRUE').toUpperCase() !== 'FALSE');
      setChecklistItems(items.map(t => ({
        item: t.texto, resultado: '', observacion: '', fotos: '[]',
        accionCorrectiva: '', responsableAccion: '', fechaLimite: '', estadoAccion: 'Pendiente',
      })));
    } catch (err) {
      console.error('Error cargando items del checklist:', err);
    }
  };

  const actualizarItemChecklist = (idx: number, campo: keyof ItemChecklist, valor: string) => {
    setChecklistItems(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  };

  const subirFotoItem = async (idx: number, files: FileList) => {
    try {
      const archivos = await Promise.all(Array.from(files).map(async (f) => {
        const { base64, mimeType } = await fileToBase64(f);
        return { base64, mimeType };
      }));
      const res = await fetch('/api/inspecciones/fotos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivos, idRegistro: showChecklistForm?.idRegistro || Date.now() }),
      });
      const data = await res.json();
      if (data.urls) {
        setChecklistItems(prev => prev.map((it, i) => {
          if (i !== idx) return it;
          const actuales: string[] = JSON.parse(it.fotos || '[]');
          return { ...it, fotos: JSON.stringify([...actuales, ...data.urls]) };
        }));
      }
    } catch (err: any) {
      alert('Error subiendo foto: ' + err.message);
    }
  };

  const handleGuardarChecklist = async () => {
    if (!showChecklistForm) return;
    const sinResponder = checklistItems.filter(it => !it.resultado);
    if (sinResponder.length > 0) {
      alert(`Faltan ${sinResponder.length} item(s) por responder`);
      return;
    }
    setGuardandoChecklist(true);
    try {
      await fetch(`/api/inspecciones/${showChecklistForm.idRegistro}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: checklistItems }),
      });
      await fetch(`/api/inspecciones/${showChecklistForm.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Realizada',
          fechaRealizada: new Date().toISOString().split('T')[0],
          observacionesGenerales,
        }),
      });
      setShowChecklistForm(null);
      setChecklistItems([]);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoChecklist(false);
    }
  };

  const verDetalle = async (insp: Inspeccion) => {
    if (expandida === insp.idRegistro) {
      setExpandida(null);
      return;
    }
    setExpandida(insp.idRegistro);
    try {
      const res = await fetch(`/api/inspecciones/${insp.idRegistro}/items`);
      const data = await res.json();
      setItemsExpandidos(data.data || []);
    } catch {
      setItemsExpandidos([]);
    }
  };

  const generarReportePDF = async () => {
    if (seleccionadas.size === 0) return;
    setGenerandoReporte(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 14;
      const marginRight = 14;
      const contentWidth = pageWidth - marginLeft - marginRight;
      let y = 20;

      const checkPageBreak = (alturaNecesaria: number) => {
        if (y + alturaNecesaria > 280) {
          doc.addPage();
          y = 20;
        }
      };

      doc.setFontSize(18);
      doc.text('Reporte de Inspecciones', marginLeft, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Proyecto: ${proyecto} | Generado: ${new Date().toLocaleDateString('es-ES')}`, marginLeft, y);
      doc.setTextColor(0);
      y += 10;

      const seleccionadasArr = inspecciones.filter(i => seleccionadas.has(i.idRegistro));

      for (const insp of seleccionadasArr) {
        checkPageBreak(30);
        doc.setFillColor(240, 240, 240);
        doc.rect(marginLeft, y - 5, contentWidth, 24, 'F');
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        const nombreChecklist = templateGroups.find(g => g.id === insp.idTemplateChecklist)?.nombre || 'Checklist';
        doc.text(nombreChecklist, marginLeft + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        y += 6;
        doc.text(`Fecha: ${insp.fechaProgramada}   Inspector: ${insp.inspector}`, marginLeft + 2, y);
        y += 5;
        if (insp.areaEquipo) {
          doc.text(`Area/Equipo: ${insp.areaEquipo}`, marginLeft + 2, y);
          y += 5;
        }
        y += 6;

        const res = await fetch(`/api/inspecciones/${insp.idRegistro}/items`);
        const data = await res.json();
        const items: ItemChecklist[] = data.data || [];

        for (const it of items) {
          checkPageBreak(20);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          const lineasItem = doc.splitTextToSize(it.item, contentWidth - 30);
          doc.text(lineasItem, marginLeft, y);

          const esOk = it.resultado === 'Cumple';
          const esNoOk = it.resultado === 'No Cumple';
          if (esOk) doc.setTextColor(16, 185, 129);
          else if (esNoOk) doc.setTextColor(239, 68, 68);
          else doc.setTextColor(148, 163, 184);
          doc.text(it.resultado || '-', pageWidth - marginRight - 25, y);
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          y += lineasItem.length * 5 + 2;

          if (esNoOk) {
            doc.setFontSize(9);
            doc.setTextColor(80);
            if (it.observacion) { checkPageBreak(6); doc.text(`Observacion: ${it.observacion}`, marginLeft + 4, y); y += 5; }
            if (it.accionCorrectiva) { checkPageBreak(6); doc.text(`Accion correctiva: ${it.accionCorrectiva}`, marginLeft + 4, y); y += 5; }
            if (it.responsableAccion) { checkPageBreak(6); doc.text(`Responsable: ${it.responsableAccion}`, marginLeft + 4, y); y += 5; }
            if (it.fechaLimite) { checkPageBreak(6); doc.text(`Fecha limite: ${it.fechaLimite}`, marginLeft + 4, y); y += 5; }
            doc.setTextColor(0);

            const fotos: string[] = JSON.parse(it.fotos || '[]');
            if (fotos.length > 0) {
              checkPageBreak(35);
              let x = marginLeft + 4;
              for (const url of fotos) {
                try {
                  const imgRes = await fetch(`/api/inspecciones/imagen-proxy?url=${encodeURIComponent(url)}`);
                  const imgData = await imgRes.json();
                  if (imgData.base64) {
                    if (x + 30 > pageWidth - marginRight) { x = marginLeft + 4; y += 32; checkPageBreak(35); }
                    doc.addImage(imgData.base64, 'JPEG', x, y, 28, 28);
                    x += 32;
                  }
                } catch {
                  /* si una foto falla, seguimos con las demas */
                }
              }
              y += 34;
            }
          }
          y += 4;
        }
        y += 8;
      }

      doc.save(`Reporte_Inspecciones_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      alert('Error generando el reporte: ' + err.message);
    } finally {
      setGenerandoReporte(false);
    }
  };

  const toggleSeleccion = (idRegistro: string) => {
    setSeleccionadas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(idRegistro)) nuevo.delete(idRegistro); else nuevo.add(idRegistro);
      return nuevo;
    });
  };

  const toggleSeleccionarTodas = () => {
    if (seleccionadas.size === inspeccionesOrdenadas.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(inspeccionesOrdenadas.map(i => i.idRegistro)));
    }
  };

  const openEdit = (insp: Inspeccion) => {
    setEditingInspeccion(insp);
    setEditForm({
      fechaProgramada: insp.fechaProgramada, inspector: insp.inspector,
      idTemplateChecklist: insp.idTemplateChecklist, areaEquipo: insp.areaEquipo,
    });
  };

  const handleGuardarEdicion = async () => {
    if (!editingInspeccion) return;
    setGuardandoEdicion(true);
    try {
      await fetch(`/api/inspecciones/${editingInspeccion.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setEditingInspeccion(null);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/inspecciones/${deletingId.rowIndex}`, { method: 'DELETE' });
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCrearGrupo = async () => {
    if (!nuevoGrupoNombre.trim()) return;
    try {
      await fetch('/api/checklist-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoGrupoNombre.trim() }),
      });
      setNuevoGrupoNombre('');
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleGuardarEdicionGrupo = async (rowIndex: number) => {
    try {
      await fetch(`/api/checklist-templates/${rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editandoGrupoNombre }),
      });
      setEditandoGrupoId(null);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleEliminarGrupo = async (rowIndex: number) => {
    if (!confirm('Eliminar este checklist? Tambien se pierden sus items.')) return;
    try {
      await fetch(`/api/checklist-templates/${rowIndex}`, { method: 'DELETE' });
      if (grupoGestion) setGrupoGestion(null);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const abrirItemsDeGrupo = async (idGrupo: string) => {
    if (grupoGestion === idGrupo) { setGrupoGestion(null); return; }
    setGrupoGestion(idGrupo);
    try {
      const res = await fetch(`/api/checklist-template?idTemplate=${encodeURIComponent(idGrupo)}`);
      const data = await res.json();
      setItemsGrupoGestion((data.data || []).filter((t: TemplateItem) => (t.activo || 'TRUE').toUpperCase() !== 'FALSE'));
    } catch {
      setItemsGrupoGestion([]);
    }
  };

  const handleAgregarTemplateItem = async () => {
    if (!nuevoItemTexto.trim() || !grupoGestion) return;
    try {
      await fetch('/api/checklist-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: nuevoItemTexto.trim(), idTemplate: grupoGestion, orden: itemsGrupoGestion.length + 1 }),
      });
      setNuevoItemTexto('');
      abrirItemsDeGrupoRefresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const abrirItemsDeGrupoRefresh = async () => {
    if (!grupoGestion) return;
    try {
      const res = await fetch(`/api/checklist-template?idTemplate=${encodeURIComponent(grupoGestion)}`);
      const data = await res.json();
      setItemsGrupoGestion((data.data || []).filter((t: TemplateItem) => (t.activo || 'TRUE').toUpperCase() !== 'FALSE'));
    } catch {
      setItemsGrupoGestion([]);
    }
  };

  const handleGuardarEdicionTemplate = async (rowIndex: number) => {
    try {
      await fetch(`/api/checklist-template/${rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: editandoTemplateTexto }),
      });
      setEditandoTemplateId(null);
      abrirItemsDeGrupoRefresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleEliminarTemplateItem = async (rowIndex: number) => {
    try {
      await fetch(`/api/checklist-template/${rowIndex}`, { method: 'DELETE' });
      abrirItemsDeGrupoRefresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const diasDelMes = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasAntes = primerDia.getDay();
    const dias: (string | null)[] = [];
    for (let i = 0; i < diasAntes; i++) dias.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push(new Date(year, month, d).toISOString().split('T')[0]);
    }
    return dias;
  };
  const inspeccionesPorFecha = (fecha: string) => inspecciones.filter(i => i.fechaProgramada === fecha);
  const nombreMes = mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const inspeccionesOrdenadas = [...inspecciones].sort((a, b) => {
    const fa = a.fechaProgramada ? new Date(a.fechaProgramada).getTime() : 0;
    const fb = b.fechaProgramada ? new Date(b.fechaProgramada).getTime() : 0;
    return fb - fa;
  });

  const renderFilaInspeccion = (insp: Inspeccion) => {
    const expandido = expandida === insp.idRegistro;
    return (
      <Fragment key={insp.idRegistro}>
        <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
          <td className="px-4 py-3"><input type="checkbox" checked={seleccionadas.has(insp.idRegistro)} onChange={() => toggleSeleccion(insp.idRegistro)} className="rounded" /></td>
          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap"><div className="flex items-center gap-1.5"><Calendar size={12} />{insp.fechaProgramada}</div></td>
          <td className="px-4 py-3"><div className="flex items-center gap-1.5"><User size={12} className="text-muted-foreground" />{insp.inspector}</div></td>
          <td className="px-4 py-3 text-muted-foreground">{templateGroups.find(g => g.id === insp.idTemplateChecklist)?.nombre || '-'}</td>
          <td className="px-4 py-3 text-muted-foreground">{insp.areaEquipo || '-'}</td>
          <td className="px-4 py-3 text-center">
            {insp.estado === 'Realizada' ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle2 size={10} /> Realizada</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium"><Clock size={10} /> Programada</span>
            )}
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-center gap-1">
              {insp.estado !== 'Realizada' ? (
                <button onClick={() => abrirChecklist(insp)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Realizar Checklist"><PlayCircle size={16} /></button>
              ) : (
                <button onClick={() => verDetalle(insp)} className={`p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${expandido ? 'text-primary bg-secondary' : ''}`} title="Ver detalle"><ClipboardCheck size={16} /></button>
              )}
              <button onClick={() => openEdit(insp)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
              <button onClick={() => setDeletingId(insp)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
        {expandido && (
          <tr className="bg-secondary/10 border-b border-border/50">
            <td colSpan={7} className="px-6 py-4">
              {insp.observacionesGenerales && (
                <div className="mb-4"><span className="text-xs text-muted-foreground uppercase">Observaciones Generales</span><p className="mt-1">{insp.observacionesGenerales}</p></div>
              )}
              <div className="space-y-2">
                {itemsExpandidos.map((it, idx) => {
                  const fotos: string[] = JSON.parse(it.fotos || '[]');
                  return (
                    <div key={idx} className="bg-background/50 p-3 rounded-xl text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium flex-1">{it.item}</p>
                        {it.resultado === 'Cumple' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs shrink-0"><CheckCircle2 size={10} /> Cumple</span>}
                        {it.resultado === 'No Cumple' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs shrink-0"><AlertTriangle size={10} /> No Cumple</span>}
                        {it.resultado === 'N/A' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs shrink-0"><MinusCircle size={10} /> N/A</span>}
                      </div>
                      {it.resultado === 'No Cumple' && (
                        <div className="mt-2 pl-1 border-l-2 border-red-500/30 pl-3 space-y-1 text-xs text-muted-foreground">
                          {it.observacion && <p><span className="text-foreground/70">Observacion:</span> {it.observacion}</p>}
                          {it.accionCorrectiva && <p><span className="text-foreground/70">Accion correctiva:</span> {it.accionCorrectiva}</p>}
                          {it.responsableAccion && <p><span className="text-foreground/70">Responsable:</span> {it.responsableAccion}</p>}
                          {it.fechaLimite && <p><span className="text-foreground/70">Fecha limite:</span> {it.fechaLimite}</p>}
                          {fotos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {fotos.map((url, i2) => (
                                <a key={i2} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-border" /></a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><ClipboardCheck size={20} className="text-primary" /> Inspecciones</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-xl p-1">
            <button onClick={() => setVista('lista')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${vista === 'lista' ? 'bg-card shadow' : 'text-muted-foreground'}`}>Lista</button>
            <button onClick={() => setVista('calendario')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${vista === 'calendario' ? 'bg-card shadow' : 'text-muted-foreground'}`}>Calendario</button>
          </div>
          <button onClick={() => setShowGestionChecklist(true)} className="p-2.5 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors" title="Gestionar Checklist"><Settings size={18} /></button>
          {seleccionadas.size > 0 && (
            <button onClick={generarReportePDF} disabled={generandoReporte} className="px-4 py-2.5 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
              {generandoReporte ? <><Clock size={16} className="animate-spin" /> Generando...</> : <><FileText size={16} /> Reporte ({seleccionadas.size})</>}
            </button>
          )}
          <button onClick={() => setShowProgramarForm(true)} className="btn-gradient text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
            <Plus size={18} /> Programar Inspeccion
          </button>
        </div>
      </div>

      {showProgramarForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Plus size={16} className="text-primary" /> Programar Inspeccion</h3>
            <button onClick={() => setShowProgramarForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-1">Fecha *</label>
              <input type="date" value={programarForm.fechaProgramada} onChange={(e) => setProgramarForm({ ...programarForm, fechaProgramada: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-1">Inspector *</label>
              <input type="text" value={programarForm.inspector} onChange={(e) => setProgramarForm({ ...programarForm, inspector: e.target.value })} placeholder="Nombre del inspector..." className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-1">Checklist a Realizar *</label>
              <select value={programarForm.idTemplateChecklist} onChange={(e) => setProgramarForm({ ...programarForm, idTemplateChecklist: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50">
                <option value="">Seleccionar...</option>
                {templateGroups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground uppercase mb-1">Area / Equipo a Revisar</label>
              <input type="text" value={programarForm.areaEquipo} onChange={(e) => setProgramarForm({ ...programarForm, areaEquipo: e.target.value })} placeholder="Ej: Tablero electrico principal, Sector B..." className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleProgramar} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Programar</button>
            <button onClick={() => setShowProgramarForm(false)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {showGestionChecklist && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Settings size={16} className="text-primary" /> Gestionar Checklists</h3>
            <button onClick={() => { setShowGestionChecklist(false); setGrupoGestion(null); }} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
          </div>

          <div className="space-y-2 mb-4">
            {templateGroups.map((g) => (
              <div key={g.rowIndex}>
                <div className="flex items-center gap-2 bg-secondary/30 p-2.5 rounded-xl text-sm">
                  {editandoGrupoId === g.rowIndex ? (
                    <>
                      <input type="text" value={editandoGrupoNombre} onChange={(e) => setEditandoGrupoNombre(e.target.value)} className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                      <button onClick={() => handleGuardarEdicionGrupo(g.rowIndex)} className="p-2.5 sm:p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"><Save size={14} /></button>
                      <button onClick={() => setEditandoGrupoId(null)} className="p-2.5 sm:p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => abrirItemsDeGrupo(g.id)} className="flex-1 text-left font-medium flex items-center gap-2">
                        {grupoGestion === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {g.nombre}
                      </button>
                      <button onClick={() => { setEditandoGrupoId(g.rowIndex); setEditandoGrupoNombre(g.nombre); }} className="p-2.5 sm:p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Pencil size={14} /></button>
                      <button onClick={() => handleEliminarGrupo(g.rowIndex)} className="p-2.5 sm:p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
                {grupoGestion === g.id && (
                  <div className="ml-4 mt-2 mb-2 space-y-2 border-l-2 border-border pl-4">
                    {itemsGrupoGestion.map((t) => (
                      <div key={t.rowIndex} className="flex items-center gap-2 bg-secondary/20 p-3 sm:p-2 rounded-lg text-sm">
                        {editandoTemplateId === t.rowIndex ? (
                          <>
                            <input type="text" value={editandoTemplateTexto} onChange={(e) => setEditandoTemplateTexto(e.target.value)} className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                            <button onClick={() => handleGuardarEdicionTemplate(t.rowIndex)} className="p-2.5 sm:p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"><Save size={14} /></button>
                            <button onClick={() => setEditandoTemplateId(null)} className="p-2.5 sm:p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1">{t.texto}</span>
                            <button onClick={() => { setEditandoTemplateId(t.rowIndex); setEditandoTemplateTexto(t.texto); }} className="p-2.5 sm:p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Pencil size={14} /></button>
                            <button onClick={() => handleEliminarTemplateItem(t.rowIndex)} className="p-2.5 sm:p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    ))}
                    {itemsGrupoGestion.length === 0 && <p className="text-xs text-muted-foreground">Sin items todavia</p>}
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={nuevoItemTexto} onChange={(e) => setNuevoItemTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAgregarTemplateItem()} placeholder="Nuevo item..." className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                      <button onClick={handleAgregarTemplateItem} className="px-3 py-1.5 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-1 text-xs"><Plus size={14} /> Agregar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {templateGroups.length === 0 && <p className="text-sm text-muted-foreground">No hay checklists creados todavia.</p>}
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <input type="text" value={nuevoGrupoNombre} onChange={(e) => setNuevoGrupoNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCrearGrupo()} placeholder="Nombre del nuevo checklist (ej: Tablero Electrico)..." className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            <button onClick={handleCrearGrupo} className="px-4 py-2 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm"><Plus size={16} /> Nuevo Checklist</button>
          </div>
        </div>
      )}

      {showChecklistForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><PlayCircle size={16} className="text-primary" /> {templateGroups.find(g => g.id === showChecklistForm.idTemplateChecklist)?.nombre || 'Checklist de Inspeccion'}</h3>
              <p className="text-sm text-muted-foreground">Fecha: {showChecklistForm.fechaProgramada} | Inspector: {showChecklistForm.inspector}</p>
              {showChecklistForm.areaEquipo && (
                <p className="text-sm text-primary font-medium mt-1">Area/Equipo a revisar: {showChecklistForm.areaEquipo}</p>
              )}
            </div>
            <button onClick={() => { setShowChecklistForm(null); setChecklistItems([]); }} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            {checklistItems.map((it, idx) => {
              const fotos: string[] = JSON.parse(it.fotos || '[]');
              return (
                <div key={idx} className="bg-secondary/30 p-3 rounded-xl">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-medium text-sm flex-1">{it.item}</p>
                    <div className="flex gap-1 shrink-0">
                      {RESULTADOS.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => actualizarItemChecklist(idx, 'resultado', r)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            it.resultado === r
                              ? r === 'Cumple' ? 'bg-emerald-500 text-white' : r === 'No Cumple' ? 'bg-red-500 text-white' : 'bg-secondary text-foreground border border-border'
                              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {it.resultado === 'No Cumple' && (
                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-muted-foreground uppercase mb-1">Observacion</label>
                        <input type="text" value={it.observacion} onChange={(e) => actualizarItemChecklist(idx, 'observacion', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-muted-foreground uppercase mb-1">Accion Correctiva</label>
                        <input type="text" value={it.accionCorrectiva} onChange={(e) => actualizarItemChecklist(idx, 'accionCorrectiva', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground uppercase mb-1">Responsable</label>
                        <input type="text" value={it.responsableAccion} onChange={(e) => actualizarItemChecklist(idx, 'responsableAccion', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground uppercase mb-1">Fecha Limite</label>
                        <input type="date" value={it.fechaLimite} onChange={(e) => actualizarItemChecklist(idx, 'fechaLimite', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-muted-foreground uppercase mb-1">Foto de la Contravencion</label>
                        <input type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files && e.target.files.length > 0) subirFotoItem(idx, e.target.files); e.target.value = ''; }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary/20 file:text-primary file:text-xs" />
                        {fotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {fotos.map((url, i2) => (
                              <a key={i2} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-border" /></a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <label className="block text-xs text-muted-foreground uppercase mb-1">Observaciones Generales</label>
            <textarea value={observacionesGenerales} onChange={(e) => setObservacionesGenerales(e.target.value)} rows={3} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleGuardarChecklist} disabled={guardandoChecklist} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {guardandoChecklist ? <><Clock size={18} className="animate-spin" /> Guardando...</> : <><Save size={18} /> Finalizar Inspeccion</>}
            </button>
            <button onClick={() => { setShowChecklistForm(null); setChecklistItems([]); }} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}</div>
      ) : vista === 'lista' ? (
        inspeccionesOrdenadas.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground">
            <ClipboardCheck size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay inspecciones registradas todavia.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3"><input type="checkbox" checked={seleccionadas.size > 0 && seleccionadas.size === inspeccionesOrdenadas.length} onChange={toggleSeleccionarTodas} className="rounded" /></th>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Inspector</th>
                    <th className="text-left px-4 py-3">Checklist</th>
                    <th className="text-left px-4 py-3">Area/Equipo</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="text-center px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>{inspeccionesOrdenadas.map(renderFilaInspeccion)}</tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><ChevronLeft size={18} /></button>
              <h3 className="font-semibold capitalize">{nombreMes}</h3>
              <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
              {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {diasDelMes().map((fecha, idx) => {
                if (!fecha) return <div key={idx} />;
                const inspDia = inspeccionesPorFecha(fecha);
                const tieneRealizada = inspDia.some(i => i.estado === 'Realizada');
                const tienePendiente = inspDia.some(i => i.estado !== 'Realizada');
                const esHoy = fecha === new Date().toISOString().split('T')[0];
                const seleccionado = diaSeleccionado === fecha;
                return (
                  <button
                    key={fecha}
                    onClick={() => setDiaSeleccionado(seleccionado ? null : fecha)}
                    className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${seleccionado ? 'bg-primary text-primary-foreground' : esHoy ? 'bg-secondary border border-primary/50' : 'hover:bg-secondary/50'}`}
                  >
                    <span>{parseInt(fecha.split('-')[2])}</span>
                    {inspDia.length > 0 && (
                      <div className="flex gap-0.5">
                        {tienePendiente && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        {tieneRealizada && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {diaSeleccionado && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inspecciones del {diaSeleccionado}</h3>
              {inspeccionesPorFecha(diaSeleccionado).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay inspecciones programadas este dia</p>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/50 border-b border-border">
                          <th className="px-4 py-3"></th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Inspector</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Checklist</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Area/Equipo</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>{inspeccionesPorFecha(diaSeleccionado).map(renderFilaInspeccion)}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editingInspeccion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Pencil size={16} className="text-primary" /> Editar Inspeccion</h3>
              <button onClick={() => setEditingInspeccion(null)} className="p-2.5 sm:p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Fecha</label>
                <input type="date" value={editForm.fechaProgramada} onChange={(e) => setEditForm({ ...editForm, fechaProgramada: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Inspector</label>
                <input type="text" value={editForm.inspector} onChange={(e) => setEditForm({ ...editForm, inspector: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Checklist a Realizar</label>
                <select value={editForm.idTemplateChecklist} onChange={(e) => setEditForm({ ...editForm, idTemplateChecklist: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50">
                  <option value="">Seleccionar...</option>
                  {templateGroups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Area / Equipo a Revisar</label>
                <input type="text" value={editForm.areaEquipo} onChange={(e) => setEditForm({ ...editForm, areaEquipo: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-3">
              <button onClick={() => setEditingInspeccion(null)} className="flex-1 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors text-sm">Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={guardandoEdicion} className="flex-1 py-2.5 btn-gradient text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {guardandoEdicion ? <><Clock size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] border border-border rounded-xl w-full max-w-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-full"><Trash2 size={20} className="text-red-400" /></div>
              <div><h3 className="font-semibold text-sm">Eliminar Inspeccion</h3><p className="text-muted-foreground text-xs">Esta accion no se puede deshacer.</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors text-sm">Cancelar</button>
              <button onClick={confirmarEliminar} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"><Trash2 size={16} /> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
