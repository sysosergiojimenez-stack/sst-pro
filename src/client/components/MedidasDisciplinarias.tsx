import { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Plus, Pencil, Trash2, X, Save, Search, FileDown, Calendar, User as UserIcon, CheckCircle2, Clock, Archive } from 'lucide-react';
import jsPDF from 'jspdf';

interface Amonestacion {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  nombreApellido: string;
  cedula: string;
  empresa: string;
  cargo: string;
  fechaFalta: string;
  fechaNotificacion: string;
  descripcionFalta: string;
  disposicionReglamento: string;
  clasificacion: string;
  antecedentes: string;
  sancion: string;
  diasSuspension: string;
  estado: string;
  empleadoDocumento: string;
}

interface Empleado {
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  empresa: string;
  cargo: string;
  estado?: string;
}

interface MedidasDisciplinariasProps {
  proyecto?: string;
  userEmail?: string;
}

const clasificaciones = ['Leve', 'Grave', 'Muy grave'];
const sanciones = [
  'Llamado de atención verbal',
  'Amonestación escrita',
  'Suspensión sin goce de salario',
  'Despido con causa justificada',
];
const estados = ['Pendiente de Firma', 'Firmado', 'Archivado'];

const formVacio = {
  idRegistro: '', proyecto: '', nombreApellido: '', cedula: '', empresa: '', cargo: '',
  fechaFalta: '', fechaNotificacion: new Date().toISOString().slice(0, 10),
  descripcionFalta: '', disposicionReglamento: '', clasificacion: '', antecedentes: '',
  sancion: '', diasSuspension: '', estado: 'Pendiente de Firma', empleadoDocumento: '',
};

export default function MedidasDisciplinarias({ proyecto, userEmail }: MedidasDisciplinariasProps) {
  const [amonestaciones, setAmonestaciones] = useState<Amonestacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Amonestacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroClasificacion, setFiltroClasificacion] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [form, setForm] = useState({ ...formVacio, proyecto: proyecto || '' });

  const fetchAmonestaciones = async () => {
    setLoading(true);
    try {
      const url = proyecto ? `/api/amonestaciones?proyecto=${encodeURIComponent(proyecto)}` : '/api/amonestaciones';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) setAmonestaciones(data.data);
      else setError(data.error || 'Error al cargar medidas disciplinarias');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpleados = async () => {
    try {
      const url = proyecto ? `/api/empleados?proyecto=${encodeURIComponent(proyecto)}` : '/api/empleados';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success !== false) setEmpleados(data.data || []);
    } catch {
      // no bloquea el modulo si falla la carga de empleados para el selector
    }
  };

  useEffect(() => { fetchAmonestaciones(); fetchEmpleados(); }, [proyecto]);

  const amonestacionesFiltradas = useMemo(() => {
    let filtradas = [...amonestaciones];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtradas = filtradas.filter(a =>
        a.nombreApellido.toLowerCase().includes(term) ||
        a.cedula.toLowerCase().includes(term) ||
        a.descripcionFalta.toLowerCase().includes(term) ||
        a.idRegistro.toLowerCase().includes(term)
      );
    }
    if (filtroClasificacion) filtradas = filtradas.filter(a => a.clasificacion === filtroClasificacion);
    if (filtroEstado) filtradas = filtradas.filter(a => a.estado === filtroEstado);
    return filtradas.sort((a, b) => (b.fechaHoraRegistro || '').localeCompare(a.fechaHoraRegistro || ''));
  }, [searchTerm, filtroClasificacion, filtroEstado, amonestaciones]);

  const resetForm = () => setForm({ ...formVacio, proyecto: proyecto || '' });

  const handleSelectEmpleado = (documento: string) => {
    const emp = empleados.find(e => e.nroDocumento === documento);
    if (!emp) {
      setForm(f => ({ ...f, empleadoDocumento: '' }));
      return;
    }
    setForm(f => ({
      ...f,
      empleadoDocumento: documento,
      nombreApellido: `${emp.nombres} ${emp.apellidos}`.trim(),
      cedula: emp.nroDocumento,
      empresa: emp.empresa || f.empresa,
      cargo: emp.cargo || f.cargo,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/amonestaciones/${editing.rowIndex}` : '/api/amonestaciones';
      const method = editing ? 'PUT' : 'POST';
      const body = editing
        ? { ...form, rowIndex: editing.rowIndex }
        : { ...form, userEmail: userEmail || 'sistema' };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditing(null); resetForm();
      fetchAmonestaciones();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (a: Amonestacion) => {
    if (!confirm(`Eliminar la notificacion de "${a.nombreApellido}"?`)) return;
    try {
      const response = await fetch(`/api/amonestaciones/${a.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchAmonestaciones();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (a: Amonestacion) => {
    setEditing(a);
    setForm({
      idRegistro: a.idRegistro, proyecto: a.proyecto, nombreApellido: a.nombreApellido, cedula: a.cedula,
      empresa: a.empresa, cargo: a.cargo, fechaFalta: a.fechaFalta, fechaNotificacion: a.fechaNotificacion,
      descripcionFalta: a.descripcionFalta, disposicionReglamento: a.disposicionReglamento,
      clasificacion: a.clasificacion, antecedentes: a.antecedentes, sancion: a.sancion,
      diasSuspension: a.diasSuspension, estado: a.estado, empleadoDocumento: a.empleadoDocumento,
    });
    setShowForm(true);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Firmado': return 'badge-success';
      case 'Archivado': return 'badge-muted';
      default: return 'badge-warning';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Firmado': return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'Archivado': return <Archive size={14} className="text-muted-foreground" />;
      default: return <Clock size={14} className="text-amber-400" />;
    }
  };

  const getClasificacionColor = (clas: string) => {
    switch (clas) {
      case 'Muy grave': return 'text-red-400 font-bold';
      case 'Grave': return 'text-amber-400 font-bold';
      default: return 'text-emerald-400';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={28} />
            Medidas Disciplinarias
          </h1>
          <p className="text-muted-foreground mt-1">{amonestaciones.length} notificaciones registradas (SST-FOR-12)</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); resetForm(); }} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25">
          <Plus size={18} /> <span className="relative z-10">Nueva Amonestacion</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pendientes de Firma', value: amonestaciones.filter(a => a.estado === 'Pendiente de Firma').length, color: 'from-amber-500 to-orange-500' },
          { label: 'Firmadas', value: amonestaciones.filter(a => a.estado === 'Firmado').length, color: 'from-emerald-500 to-teal-500' },
          { label: 'Graves / Muy graves', value: amonestaciones.filter(a => a.clasificacion === 'Grave' || a.clasificacion === 'Muy grave').length, color: 'from-red-500 to-red-600' },
          { label: 'Total', value: amonestaciones.length, color: 'from-blue-500 to-indigo-600' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <ShieldAlert size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="Buscar por nombre, cedula o descripcion..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary text-muted-foreground"><X size={14} /></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filtroClasificacion} onChange={(e) => setFiltroClasificacion(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50">
            <option value="">Todas las clasificaciones</option>
            {clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50">
            <option value="">Todos los estados</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm flex items-center gap-2 fade-in">
          <ShieldAlert size={16} /> <strong>Error:</strong> {error}
        </div>
      )}

      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">{editing ? 'Editar Amonestacion' : 'Nueva Amonestacion (SST-FOR-12)'}</h2>
            <button onClick={() => setShowForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Seleccionar Empleado (opcional)</label>
              <select value={form.empleadoDocumento} onChange={(e) => handleSelectEmpleado(e.target.value)} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                <option value="">-- Cargar datos manualmente --</option>
                {empleados.map(emp => (
                  <option key={emp.nroDocumento} value={emp.nroDocumento}>{emp.nombres} {emp.apellidos} — {emp.nroDocumento}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre y Apellido *</label>
                <input type="text" value={form.nombreApellido} onChange={(e) => setForm({ ...form, nombreApellido: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">N° de Cedula *</label>
                <input type="text" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Empresa (propia / subcontratista) *</label>
                <input type="text" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cargo *</label>
                <input type="text" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de la Falta *</label>
                <input type="date" value={form.fechaFalta} onChange={(e) => setForm({ ...form, fechaFalta: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de esta Notificacion *</label>
                <input type="date" value={form.fechaNotificacion} onChange={(e) => setForm({ ...form, fechaNotificacion: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descripcion de la Falta Imputada *</label>
              <textarea value={form.descripcionFalta} onChange={(e) => setForm({ ...form, descripcionFalta: e.target.value })} rows={3} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Disposicion del Reglamento Interno (SST-REG-01) Presuntamente Incumplida</label>
              <input type="text" value={form.disposicionReglamento} onChange={(e) => setForm({ ...form, disposicionReglamento: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" placeholder="Ej: Titulo X, Art. 12" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Clasificacion de la Falta (Art. 38) *</label>
              <div className="flex gap-4 flex-wrap">
                {clasificaciones.map(c => (
                  <label key={c} className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm cursor-pointer">
                    <input type="radio" name="clasificacion" checked={form.clasificacion === c} onChange={() => setForm({ ...form, clasificacion: c })} required />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Antecedentes Disciplinarios Previos (si los hubiera)</label>
              <textarea value={form.antecedentes} onChange={(e) => setForm({ ...form, antecedentes: e.target.value })} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sancion Aplicada (Art. 39) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sanciones.map(s => (
                  <label key={s} className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm cursor-pointer">
                    <input type="radio" name="sancion" checked={form.sancion === s} onChange={() => setForm({ ...form, sancion: s, diasSuspension: s === 'Suspensión sin goce de salario' ? form.diasSuspension : '' })} required />
                    {s}
                  </label>
                ))}
              </div>
              {form.sancion === 'Suspensión sin goce de salario' && (
                <div className="mt-3 max-w-xs">
                  <label className="block text-sm font-medium mb-2">N° de Dias de Suspension *</label>
                  <input type="number" min="1" value={form.diasSuspension} onChange={(e) => setForm({ ...form, diasSuspension: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="w-full max-w-xs bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                {estados.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                <Save size={18} /> <span className="relative z-10">{editing ? 'Guardar Cambios' : 'Registrar Amonestacion'}</span>
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton h-6 w-1/4 rounded mb-3" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : amonestacionesFiltradas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground fade-in">
          <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay medidas disciplinarias registradas</p>
          <p className="text-sm mt-1">Registra la primera notificacion de amonestacion para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {amonestacionesFiltradas.map((a, index) => (
            <div key={a.idRegistro} className="glass-card p-5 card-hover fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    a.clasificacion === 'Muy grave' ? 'bg-red-500/20' :
                    a.clasificacion === 'Grave' ? 'bg-amber-500/20' :
                    'bg-emerald-500/20'
                  }`}>
                    <ShieldAlert size={24} className={getClasificacionColor(a.clasificacion)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{a.nombreApellido || 'Sin nombre'}</h3>
                      <span className={`${getEstadoColor(a.estado)} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                        {getEstadoIcon(a.estado)} {a.estado}
                      </span>
                      {a.clasificacion && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${getClasificacionColor(a.clasificacion)}`}>{a.clasificacion}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.descripcionFalta}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><UserIcon size={12} /> {a.cedula} — {a.cargo}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> Falta: {a.fechaFalta}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> Notificacion: {a.fechaNotificacion}</span>
                    </div>
                    {a.sancion && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        Sancion: {a.sancion}{a.sancion === 'Suspensión sin goce de salario' && a.diasSuspension ? ` (${a.diasSuspension} dias)` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => generarPDFAmonestacion(a)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Exportar PDF para firma"><FileDown size={16} /></button>
                  <button onClick={() => startEdit(a)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(a)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Exportacion a PDF - replica el formato oficial SST-FOR-12
// ============================================

function generarPDFAmonestacion(a: Amonestacion) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 15;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
  };

  // Encabezado
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ALTAZENTA NORTE SA/ ALTAVIDA NORTE', pageWidth - marginRight, y, { align: 'right' });
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Formularios del Sistema de Gestión de SST', pageWidth - marginRight, y, { align: 'right' });
  y += 8;

  // Titulo
  doc.setFillColor(30, 58, 95);
  doc.rect(marginLeft, y, contentWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SST-FOR-12   NOTIFICACIÓN DE AMONESTACIÓN / MEDIDA DISCIPLINARIA', marginLeft + 3, y + 10);
  doc.setTextColor(0, 0, 0);
  y += 22;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Se completa ante toda falta al Reglamento Interno de Higiene y Seguridad (SST-REG-01, Título X)', marginLeft, y);
  y += 8;

  const colWidth = contentWidth / 2 - 3;

  const campoDoble = (label1: string, val1: string, label2: string, val2: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(label1, marginLeft, y);
    doc.text(label2, marginLeft + colWidth + 6, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(val1 || '-', marginLeft, y);
    doc.text(val2 || '-', marginLeft + colWidth + 6, y);
    y += 3;
    doc.setDrawColor(180, 180, 180);
    doc.line(marginLeft, y, marginLeft + colWidth, y);
    doc.line(marginLeft + colWidth + 6, y, marginLeft + contentWidth, y);
    y += 7;
  };

  campoDoble('Nombre y apellido:', a.nombreApellido, 'N° de cédula:', a.cedula);
  campoDoble('Empresa (propia / subcontratista):', a.empresa, 'Cargo:', a.cargo);
  campoDoble('Fecha de la Falta:', formatearFecha(a.fechaFalta), 'Fecha de esta notificación:', formatearFecha(a.fechaNotificacion));

  const seccionBoxeada = (titulo: string, contenido: string, minLineas: number) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, marginLeft, y);
    y += 3;
    const texto = contenido || '';
    const lineas = doc.splitTextToSize(texto, contentWidth - 4);
    const numLineas = Math.max(minLineas, lineas.length);
    const altoBox = numLineas * 5 + 4;
    checkPageBreak(altoBox + 8);
    doc.setDrawColor(180, 180, 180);
    doc.rect(marginLeft, y, contentWidth, altoBox);
    doc.setFont('helvetica', 'normal');
    doc.text(lineas, marginLeft + 2, y + 5);
    y += altoBox + 6;
  };

  seccionBoxeada('Descripción de la falta imputada', a.descripcionFalta, 4);
  seccionBoxeada('Disposición del Reglamento Interno (SST-REG-01) presuntamente incumplida', a.disposicionReglamento, 1);

  // Clasificacion (checkboxes)
  checkPageBreak(16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Clasificación de la falta (Art. 38)', marginLeft, y);
  y += 6;
  const clasificacionesForm = ['Leve', 'Grave', 'Muy grave'];
  let x = marginLeft;
  doc.setFont('helvetica', 'normal');
  for (const c of clasificacionesForm) {
    x = dibujarCheckbox(doc, x, y, c, a.clasificacion === c);
  }
  y += 9;

  seccionBoxeada('Antecedentes disciplinarios previos del trabajador (si los hubiera)', a.antecedentes, 2);

  // Sancion aplicada (checkboxes en columna)
  checkPageBreak(35);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Sanción aplicada (Art. 39)', marginLeft, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  const opcionesSancion = [
    { label: 'Llamado de atención verbal', val: 'Llamado de atención verbal' },
    { label: 'Amonestación escrita', val: 'Amonestación escrita' },
    { label: `Suspensión sin goce de salario — N° de días: ${a.sancion === 'Suspensión sin goce de salario' ? (a.diasSuspension || '____') : '_______'}`, val: 'Suspensión sin goce de salario' },
    { label: 'Despido con causa justificada (Art. 81, inciso v) del Código del Trabajo — Ley N° 213/1993)', val: 'Despido con causa justificada' },
  ];
  for (const op of opcionesSancion) {
    checkPageBreak(7);
    dibujarCheckboxLinea(doc, marginLeft, y, op.label, a.sancion === op.val, contentWidth);
    y += 7;
  }
  y += 2;

  checkPageBreak(14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const notaTexto = doc.splitTextToSize(
    'Nota: tratándose de personal subcontratado, las sanciones marcadas arriba son aplicadas por su propio empleador conforme al Art. 43 del Reglamento Interno; Altazenta Norte SA puede, en todo caso, impedir el ingreso a obra del trabajador conforme al Art. 39 del mismo Reglamento.',
    contentWidth
  );
  doc.text(notaTexto, marginLeft, y);
  y += notaTexto.length * 4 + 6;

  seccionBoxeada('Descargos del trabajador (Art. 40 — derecho a presentar descargos antes de aplicar la sanción)', '', 4);

  // Firmas
  checkPageBreak(30);
  y += 10;
  const firmaAncho = contentWidth / 3 - 4;
  const firmas = [
    { x: marginLeft, label: 'Firma del trabajador notificado' },
    { x: marginLeft + firmaAncho + 6, label: 'Firma de quien aplica la sanción' },
    { x: marginLeft + (firmaAncho + 6) * 2, label: 'Firma de testigo (si el trabajador se niega a firmar)' },
  ];
  doc.setDrawColor(0, 0, 0);
  for (const f of firmas) {
    doc.line(f.x, y, f.x + firmaAncho, y);
  }
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  for (const f of firmas) {
    const lineas = doc.splitTextToSize(f.label, firmaAncho);
    doc.text(lineas, f.x + firmaAncho / 2, y, { align: 'center' });
  }

  // Pie de pagina
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(
    'Formulario SST-FOR-12 — Sistema de Gestión de SST — Conservar archivado en el legajo de la obra / del trabajador según corresponda.',
    marginLeft, pageHeight - 10
  );

  const nombreArchivo = `SST-FOR-12_${(a.nombreApellido || 'amonestacion').replace(/\s+/g, '_')}_${a.fechaNotificacion || ''}.pdf`;
  doc.save(nombreArchivo);
}

function dibujarCheckbox(doc: jsPDF, x: number, y: number, label: string, marcado: boolean): number {
  const size = 4;
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, y - size + 1, size, size);
  if (marcado) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', x + 0.6, y);
    doc.setFont('helvetica', 'normal');
  }
  doc.text(label, x + size + 2, y);
  return x + size + 2 + doc.getTextWidth(label) + 10;
}

function dibujarCheckboxLinea(doc: jsPDF, x: number, y: number, label: string, marcado: boolean, maxWidth: number) {
  const size = 4;
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, y - size + 1, size, size);
  if (marcado) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', x + 0.6, y);
    doc.setFont('helvetica', 'normal');
  }
  const lineas = doc.splitTextToSize(label, maxWidth - size - 3);
  doc.text(lineas, x + size + 3, y);
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '-';
  const d = new Date(fecha + (fecha.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-PY');
}
