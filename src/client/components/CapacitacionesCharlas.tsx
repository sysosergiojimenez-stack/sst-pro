import { useState, useEffect, Fragment } from 'react';
import { GraduationCap, Calendar as CalendarIcon, List, Plus, X, Save, Pencil, Trash2, Eye, CheckCircle2, Clock, MapPin, FileText, ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface Capacitacion {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  titulo: string;
  fechaProgramada: string;
  hora: string;
  lugar: string;
  responsable: string;
  tipo: string;
  estado: string;
  fechaRealizada: string;
  asistentes: string;
  observaciones: string;
  evidenciaPDF: string;
  temasTratados: string;
}

interface Empleado {
  rowIndex: number;
  nroDocumento: string;
  nombres: string;
  apellidos: string;
}

interface CapacitacionesCharlasProps {
  proyecto: string;
}

const TIPOS_CHARLA = ['Induccion SST', 'Charla de 5 minutos', 'Capacitacion tecnica', 'Simulacro', 'Uso de EPP', 'Trabajo en alturas', 'Otro'];

function parseAsistentes(str: string): { nroDocumento: string; nombre: string }[] {
  try { return str ? JSON.parse(str) : []; } catch { return []; }
}

function parseEvidencias(str: string): string[] {
  try { return str ? JSON.parse(str) : []; } catch { return []; }
}

function formatearFechaCorta(fecha: string): string {
  if (!fecha) return '-';
  const partes = fecha.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return fecha;
}

export default function CapacitacionesCharlas({ proyecto }: CapacitacionesCharlasProps) {
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<'lista' | 'calendario'>('lista');
  const [expandida, setExpandida] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingCharla, setEditingCharla] = useState<Capacitacion | null>(null);
  const [form, setForm] = useState({ titulo: '', fechaProgramada: '', hora: '', lugar: '', responsable: '', tipo: TIPOS_CHARLA[0] });

  const [showRealizarForm, setShowRealizarForm] = useState<Capacitacion | null>(null);
  const [realizarForm, setRealizarForm] = useState({ fechaRealizada: '', observaciones: '', temasTratados: '' });
  const [asistentesSeleccionados, setAsistentesSeleccionados] = useState<string[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [guardandoRealizada, setGuardandoRealizada] = useState(false);

  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [proyecto]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const capRes = await fetch(`/api/capacitaciones?proyecto=${encodeURIComponent(proyecto)}`);
      const capData = await capRes.json();
      if (capData.success) setCapacitaciones(capData.data);

      const empRes = await fetch(`/api/empleados?proyecto=${encodeURIComponent(proyecto)}`);
      const empData = await empRes.json();
      if (empData.success) setEmpleados(empData.data);
    } catch (err) {
      console.error('Error fetching capacitaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCharla) {
        await fetch(`/api/capacitaciones/${editingCharla.rowIndex}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        const idRegistro = `CAP-${Date.now()}`;
        await fetch('/api/capacitaciones', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idRegistro, proyecto, ...form, estado: 'Pendiente',
            fechaRealizada: '', asistentes: '', observaciones: '', evidenciaPDF: '', temasTratados: '',
          }),
        });
      }
      setShowForm(false);
      setEditingCharla(null);
      setForm({ titulo: '', fechaProgramada: '', hora: '', lugar: '', responsable: '', tipo: TIPOS_CHARLA[0] });
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const startEdit = (cap: Capacitacion) => {
    setEditingCharla(cap);
    setForm({
      titulo: cap.titulo, fechaProgramada: cap.fechaProgramada, hora: cap.hora,
      lugar: cap.lugar, responsable: cap.responsable, tipo: cap.tipo || TIPOS_CHARLA[0],
    });
    setShowForm(true);
  };

  const handleDelete = async (cap: Capacitacion) => {
    if (!confirm(`Eliminar charla "${cap.titulo}"?`)) return;
    try {
      await fetch(`/api/capacitaciones/${cap.rowIndex}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const startRealizar = (cap: Capacitacion) => {
    setShowRealizarForm(cap);
    setRealizarForm({ fechaRealizada: new Date().toISOString().split('T')[0], observaciones: '', temasTratados: '' });
    setAsistentesSeleccionados([]);
    setPdfFiles([]);
  };

  const toggleAsistente = (doc: string) => {
    setAsistentesSeleccionados(prev => prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]);
  };

  const handleGuardarRealizada = async (e: React.FormEvent) => {
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
  };

  const charlasOrdenadas = [...capacitaciones].sort((a, b) => {
    const fa = a.fechaProgramada ? new Date(a.fechaProgramada) : new Date(0);
    const fb = b.fechaProgramada ? new Date(b.fechaProgramada) : new Date(0);
    return fa.getTime() - fb.getTime();
  });

  const pendientes = charlasOrdenadas.filter(c => (c.estado || '').toLowerCase() !== 'realizada');
  const realizadas = charlasOrdenadas.filter(c => (c.estado || '').toLowerCase() === 'realizada').reverse();

  const diasDelMes = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasAntes = primerDia.getDay();
    const dias: (string | null)[] = [];
    for (let i = 0; i < diasAntes; i++) dias.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(year, month, d);
      dias.push(fecha.toISOString().split('T')[0]);
    }
    return dias;
  };

  const charlasPorFecha = (fecha: string) => capacitaciones.filter(c => c.fechaProgramada === fecha);

  const nombreMes = mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const renderFilaCharla = (cap: Capacitacion) => {
    const exp = expandida === cap.idRegistro;
    const asistentesData = parseAsistentes(cap.asistentes);
    const evidencias = parseEvidencias(cap.evidenciaPDF);
    const esRealizada = (cap.estado || '').toLowerCase() === 'realizada';
    return (
      <Fragment key={cap.idRegistro}>
        <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${exp ? 'bg-secondary/20' : ''}`}>
          <td className="px-4 py-3 text-muted-foreground">{formatearFechaCorta(cap.fechaProgramada)}{cap.hora && ` ${cap.hora}`}</td>
          <td className="px-4 py-3 font-medium">{cap.titulo}</td>
          <td className="px-4 py-3 text-muted-foreground">{cap.tipo || '-'}</td>
          <td className="px-4 py-3 text-muted-foreground">{cap.responsable || '-'}</td>
          <td className="px-4 py-3 text-center">
            {esRealizada ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                <CheckCircle2 size={10} /> Realizada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                <Clock size={10} /> Pendiente
              </span>
            )}
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-center gap-1">
              {!esRealizada && (
                <button onClick={() => startRealizar(cap)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-emerald-400" title="Marcar como realizada">
                  <CheckCircle2 size={16} />
                </button>
              )}
              <button onClick={() => setExpandida(exp ? null : cap.idRegistro)} className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${exp ? 'text-primary bg-secondary' : ''}`} title="Ver detalle">
                <Eye size={16} />
              </button>
              <button onClick={() => startEdit(cap)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(cap)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
        {exp && (
          <tr className="bg-secondary/10 border-b border-border/50">
            <td colSpan={6} className="px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div><span className="text-xs text-muted-foreground uppercase">Lugar</span><p className="font-medium flex items-center gap-1"><MapPin size={12} />{cap.lugar || '-'}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase">Responsable</span><p className="font-medium">{cap.responsable || '-'}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase">Fecha realizada</span><p className="font-medium">{cap.fechaRealizada ? formatearFechaCorta(cap.fechaRealizada) : '-'}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase">ID Registro</span><p className="font-medium">{cap.idRegistro}</p></div>
              </div>
              {cap.temasTratados && (
                <div className="mb-4"><span className="text-xs text-muted-foreground uppercase">Temas tratados</span><p className="font-medium">{cap.temasTratados}</p></div>
              )}
              {cap.observaciones && (
                <div className="mb-4"><span className="text-xs text-muted-foreground uppercase">Observaciones</span><p className="font-medium">{cap.observaciones}</p></div>
              )}
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Users size={14} /> Asistentes ({asistentesData.length})</h4>
              {asistentesData.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {asistentesData.map(a => (
                    <span key={a.nroDocumento} className="text-xs bg-background/50 px-3 py-1.5 rounded-lg">{a.nombre}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Sin asistentes registrados</p>
              )}
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><FileText size={14} /> Evidencia ({evidencias.length})</h4>
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
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="text-teal-400" size={28} />
            Capacitacion y Charlas de Seguridad
          </h1>
          <p className="text-muted-foreground mt-1">{proyecto}</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingCharla(null); setForm({ titulo: '', fechaProgramada: '', hora: '', lugar: '', responsable: '', tipo: TIPOS_CHARLA[0] }); }} className="btn-gradient text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm">
          <Plus size={16} /> Programar Charla
        </button>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setVista('lista')} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${vista === 'lista' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <List size={16} /> Lista
        </button>
        <button onClick={() => setVista('calendario')} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${vista === 'calendario' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <CalendarIcon size={16} /> Calendario
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingCharla ? 'Editar Charla' : 'Programar Nueva Charla'}</h3>
            <button onClick={() => { setShowForm(false); setEditingCharla(null); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmitForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Titulo / Tema *</label>
              <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Programada *</label>
              <input type="date" value={form.fechaProgramada} onChange={(e) => setForm({ ...form, fechaProgramada: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hora</label>
              <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Lugar</label>
              <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Responsable</label>
              <input type="text" value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Tipo de Charla</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                {TIPOS_CHARLA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> {editingCharla ? 'Guardar Cambios' : 'Programar Charla'}</button>
            </div>
          </form>
        </div>
      )}

      {showRealizarForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-400" />Marcar Charla como Realizada</h2>
              <button onClick={() => setShowRealizarForm(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showRealizarForm.titulo}</p>
            <form onSubmit={handleGuardarRealizada} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha en que se realizo *</label>
                <input type="date" value={realizarForm.fechaRealizada} onChange={(e) => setRealizarForm({ ...realizarForm, fechaRealizada: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Temas tratados</label>
                <textarea value={realizarForm.temasTratados} onChange={(e) => setRealizarForm({ ...realizarForm, temasTratados: e.target.value })} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Observaciones</label>
                <textarea value={realizarForm.observaciones} onChange={(e) => setRealizarForm({ ...realizarForm, observaciones: e.target.value })} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Asistentes * ({asistentesSeleccionados.length} seleccionados)</label>
                <div className="max-h-48 overflow-auto border border-border rounded-xl divide-y divide-border">
                  {empleados.length === 0 && <p className="text-sm text-muted-foreground p-3">No hay empleados registrados en este proyecto</p>}
                  {empleados.map(emp => (
                    <label key={emp.nroDocumento} className="flex items-center gap-3 p-3 hover:bg-secondary/50 cursor-pointer text-sm">
                      <input type="checkbox" checked={asistentesSeleccionados.includes(emp.nroDocumento)} onChange={() => toggleAsistente(emp.nroDocumento)} className="rounded" />
                      <span>{emp.nombres} {emp.apellidos} <span className="text-xs text-muted-foreground">- {emp.nroDocumento}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
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
              <button type="submit" disabled={guardandoRealizada} className="w-full btn-gradient text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50">
                <Save size={18} /> {guardandoRealizada ? 'Guardando...' : 'Confirmar Charla Realizada'}
              </button>
            </form>
          </div>
        </div>
      )}

      {vista === 'lista' && (
        loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}</div>
        ) : capacitaciones.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><GraduationCap size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No hay charlas programadas</p></div>
        ) : (
          <div className="space-y-6">
            {pendientes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><Clock size={14} /> Pendientes ({pendientes.length})</h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/50 border-b border-border">
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Titulo</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Tipo</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Responsable</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>{pendientes.map(renderFilaCharla)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {realizadas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><CheckCircle2 size={14} /> Realizadas ({realizadas.length})</h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/50 border-b border-border">
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Titulo</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Tipo</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Responsable</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>{realizadas.map(renderFilaCharla)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {vista === 'calendario' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft size={18} /></button>
              <h3 className="font-semibold capitalize">{nombreMes}</h3>
              <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
              {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {diasDelMes().map((fecha, idx) => {
                if (!fecha) return <div key={idx} />;
                const charlasDia = charlasPorFecha(fecha);
                const tieneRealizada = charlasDia.some(c => (c.estado || '').toLowerCase() === 'realizada');
                const tienePendiente = charlasDia.some(c => (c.estado || '').toLowerCase() !== 'realizada');
                const esHoy = fecha === new Date().toISOString().split('T')[0];
                const seleccionado = diaSeleccionado === fecha;
                return (
                  <button
                    key={fecha}
                    onClick={() => setDiaSeleccionado(seleccionado ? null : fecha)}
                    className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${seleccionado ? 'bg-primary text-primary-foreground' : esHoy ? 'bg-secondary border border-primary/50' : 'hover:bg-secondary/50'}`}
                  >
                    <span>{parseInt(fecha.split('-')[2])}</span>
                    {charlasDia.length > 0 && (
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Charlas del {formatearFechaCorta(diaSeleccionado)}</h3>
              {charlasPorFecha(diaSeleccionado).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay charlas programadas este dia</p>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/50 border-b border-border">
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Titulo</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Tipo</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Responsable</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>{charlasPorFecha(diaSeleccionado).map(renderFilaCharla)}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
