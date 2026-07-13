import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Pencil, Trash2, X, Save, Search, Brain, FileText, Calendar, Clock, MapPin, Users, CheckCircle2, AlertCircle } from 'lucide-react';

interface Incidente {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  fechaIncidente: string;
  horaIncidente: string;
  lugar: string;
  tipo: string;
  clasificacion: string;
  descripcion: string;
  personasInvolucradas: string;
  causasInmediatas: string;
  causasRaiz: string;
  accionesCorrectivas: string;
  responsableAcciones: string;
  fechaCompromiso: string;
  estado: string;
  evidencias: string;
  investigador: string;
  fechaCierre: string;
  diasPerdidos: string;
  costoEstimado: string;
}

interface IncidentesProps {
  proyecto?: string;
}

const tiposIncidente = ['Accidente', 'Enfermedad Laboral', 'Casi Accidente', 'Incidente Ambiental', 'Incidente de Seguridad', 'Incidente de Salud', 'Otro'];
const clasificaciones = ['Leve', 'Moderado', 'Grave', 'Fatal'];
const estados = ['Abierto', 'En Investigacion', 'Acciones Pendientes', 'Cerrado'];

export default function Incidentes({ proyecto }: IncidentesProps) {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [incidentesFiltrados, setIncidentesFiltrados] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Incidente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroClasificacion, setFiltroClasificacion] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showGeminiForm, setShowGeminiForm] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [datosExtraidos, setDatosExtraidos] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  const [form, setForm] = useState({
    idRegistro: '', proyecto: proyecto || '', fechaIncidente: '', horaIncidente: '',
    lugar: '', tipo: '', clasificacion: '', descripcion: '', personasInvolucradas: '',
    causasInmediatas: '', causasRaiz: '', accionesCorrectivas: '', responsableAcciones: '',
    fechaCompromiso: '', estado: 'Abierto', evidencias: '', investigador: '',
    diasPerdidos: '', costoEstimado: '',
  });

  const fetchIncidentes = async () => {
    setLoading(true);
    try {
      const url = proyecto ? `/api/incidentes?proyecto=${encodeURIComponent(proyecto)}` : '/api/incidentes';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setIncidentes(data.data);
        setIncidentesFiltrados(data.data);
      } else {
        setError(data.error || 'Error al cargar incidentes');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidentes(); }, [proyecto]);

  useEffect(() => {
    let filtrados = [...incidentes];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(i => 
        i.descripcion.toLowerCase().includes(term) ||
        i.lugar.toLowerCase().includes(term) ||
        i.personasInvolucradas.toLowerCase().includes(term) ||
        i.idRegistro.toLowerCase().includes(term)
      );
    }
    if (filtroTipo) filtrados = filtrados.filter(i => i.tipo === filtroTipo);
    if (filtroClasificacion) filtrados = filtrados.filter(i => i.clasificacion === filtroClasificacion);
    if (filtroEstado) filtrados = filtrados.filter(i => i.estado === filtroEstado);
    setIncidentesFiltrados(filtrados);
  }, [searchTerm, filtroTipo, filtroClasificacion, filtroEstado, incidentes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/incidentes/${editing.rowIndex}` : '/api/incidentes';
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, rowIndex: editing.rowIndex } : { ...form, fechaHoraRegistro: new Date().toISOString() };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditing(null);
      resetForm();
      fetchIncidentes();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (incidente: Incidente) => {
    if (!confirm(`Eliminar incidente "${incidente.idRegistro}"?`)) return;
    try {
      const response = await fetch(`/api/incidentes/${incidente.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchIncidentes();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (incidente: Incidente) => {
    setEditing(incidente);
    setForm({
      idRegistro: incidente.idRegistro, proyecto: incidente.proyecto, fechaIncidente: incidente.fechaIncidente,
      horaIncidente: incidente.horaIncidente, lugar: incidente.lugar, tipo: incidente.tipo,
      clasificacion: incidente.clasificacion, descripcion: incidente.descripcion,
      personasInvolucradas: incidente.personasInvolucradas, causasInmediatas: incidente.causasInmediatas,
      causasRaiz: incidente.causasRaiz, accionesCorrectivas: incidente.accionesCorrectivas,
      responsableAcciones: incidente.responsableAcciones, fechaCompromiso: incidente.fechaCompromiso,
      estado: incidente.estado, evidencias: incidente.evidencias, investigador: incidente.investigador,
      diasPerdidos: incidente.diasPerdidos, costoEstimado: incidente.costoEstimado,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      idRegistro: '', proyecto: proyecto || '', fechaIncidente: '', horaIncidente: '',
      lugar: '', tipo: '', clasificacion: '', descripcion: '', personasInvolucradas: '',
      causasInmediatas: '', causasRaiz: '', accionesCorrectivas: '', responsableAcciones: '',
      fechaCompromiso: '', estado: 'Abierto', evidencias: '', investigador: '',
      diasPerdidos: '', costoEstimado: '',
    });
  };

  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;
    setGeminiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const response = await fetch('/api/gemini/incidente', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, mimeType: pdfFile.type })
      });
      const data = await response.json();
      if (data.success) { setDatosExtraidos(data.data); } else { alert('Error: ' + data.error); }
      setGeminiLoading(false);
    };
    reader.readAsDataURL(pdfFile);
  };

  const handleConfirmGemini = async () => {
    if (!datosExtraidos) return;
    try {
      const body = { ...datosExtraidos, proyecto: proyecto || datosExtraidos.proyecto || '', estado: 'Abierto', fechaHoraRegistro: new Date().toISOString() };
      const response = await fetch('/api/incidentes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowGeminiForm(false); setDatosExtraidos(null); setPdfFile(null); fetchIncidentes();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Cerrado': return 'badge-success';
      case 'Abierto': return 'badge-danger';
      case 'En Investigacion': return 'badge-warning';
      case 'Acciones Pendientes': return 'badge-info';
      default: return 'badge-info';
    }
  };

  const getClasificacionColor = (clas: string) => {
    switch (clas) {
      case 'Fatal': return 'text-red-400 font-bold';
      case 'Grave': return 'text-amber-400 font-bold';
      case 'Moderado': return 'text-orange-400';
      default: return 'text-emerald-400';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Cerrado': return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'Abierto': return <AlertCircle size={14} className="text-red-400" />;
      case 'En Investigacion': return <AlertTriangle size={14} className="text-amber-400" />;
      case 'Acciones Pendientes': return <Clock size={14} className="text-sky-400" />;
      default: return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={28} />
            Incidentes
          </h1>
          <p className="text-muted-foreground mt-1">{incidentes.length} incidentes registrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowForm(true); setEditing(null); resetForm(); }} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25">
            <Plus size={18} /> <span className="relative z-10">Nuevo Incidente</span>
          </button>
          <button onClick={() => { setShowGeminiForm(true); setDatosExtraidos(null); setPdfFile(null); }} className="bg-secondary border border-border px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors">
            <Brain size={18} /> Procesar con IA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Abiertos', value: incidentes.filter(i => i.estado === 'Abierto').length, color: 'from-red-500 to-red-600' },
          { label: 'En Investigacion', value: incidentes.filter(i => i.estado === 'En Investigacion').length, color: 'from-amber-500 to-orange-500' },
          { label: 'Acciones Pendientes', value: incidentes.filter(i => i.estado === 'Acciones Pendientes').length, color: 'from-sky-500 to-blue-500' },
          { label: 'Cerrados', value: incidentes.filter(i => i.estado === 'Cerrado').length, color: 'from-emerald-500 to-teal-500' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <AlertTriangle size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="Buscar incidentes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary text-muted-foreground"><X size={14} /></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50">
            <option value="">Todos los tipos</option>
            {tiposIncidente.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
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
          <AlertTriangle size={16} /> <strong>Error:</strong> {error}
        </div>
      )}

      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">{editing ? 'Editar Incidente' : 'Nuevo Incidente'}</h2>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">ID Registro</label>
                <input type="text" value={form.idRegistro} onChange={(e) => setForm({...form, idRegistro: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required disabled={!!editing} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Incidente *</label>
                <input type="date" value={form.fechaIncidente} onChange={(e) => setForm({...form, fechaIncidente: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora</label>
                <input type="time" value={form.horaIncidente} onChange={(e) => setForm({...form, horaIncidente: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Lugar *</label>
                <input type="text" value={form.lugar} onChange={(e) => setForm({...form, lugar: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                  <option value="">Seleccionar...</option>
                  {tiposIncidente.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Clasificacion *</label>
                <select value={form.clasificacion} onChange={(e) => setForm({...form, clasificacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                  <option value="">Seleccionar...</option>
                  {clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descripcion *</label>
              <textarea value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} rows={3} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Personas Involucradas</label>
              <input type="text" value={form.personasInvolucradas} onChange={(e) => setForm({...form, personasInvolucradas: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" placeholder="Nombres y documentos separados por coma" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Causas Inmediatas</label>
                <textarea value={form.causasInmediatas} onChange={(e) => setForm({...form, causasInmediatas: e.target.value})} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Causas Raiz (5 Porques)</label>
                <textarea value={form.causasRaiz} onChange={(e) => setForm({...form, causasRaiz: e.target.value})} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Acciones Correctivas</label>
                <textarea value={form.accionesCorrectivas} onChange={(e) => setForm({...form, accionesCorrectivas: e.target.value})} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Responsable Acciones</label>
                <input type="text" value={form.responsableAcciones} onChange={(e) => setForm({...form, responsableAcciones: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Compromiso</label>
                <input type="date" value={form.fechaCompromiso} onChange={(e) => setForm({...form, fechaCompromiso: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                  {estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Investigador</label>
                <input type="text" value={form.investigador} onChange={(e) => setForm({...form, investigador: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dias Perdidos</label>
                <input type="number" value={form.diasPerdidos} onChange={(e) => setForm({...form, diasPerdidos: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Costo Estimado</label>
                <input type="text" value={form.costoEstimado} onChange={(e) => setForm({...form, costoEstimado: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" placeholder="$" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Evidencias (URLs)</label>
              <input type="text" value={form.evidencias} onChange={(e) => setForm({...form, evidencias: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" placeholder="URLs separadas por coma" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                <Save size={18} /> <span className="relative z-10">{editing ? 'Guardar Cambios' : 'Registrar Incidente'}</span>
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showGeminiForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain size={20} className="text-primary" />
              Procesar Incidente con IA
            </h2>
            <button onClick={() => setShowGeminiForm(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
          </div>
          {!datosExtraidos ? (
            <form onSubmit={handleGeminiSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">Sube el formato de investigacion de incidente (PDF)</p>
                <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" id="incidente-pdf" />
                <label htmlFor="incidente-pdf" className="btn-gradient text-white px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-blue-500/25">
                  <Plus size={18} /> <span className="relative z-10">Seleccionar PDF</span>
                </label>
                {pdfFile && <p className="mt-4 text-sm text-primary">{pdfFile.name}</p>}
              </div>
              <button type="submit" disabled={!pdfFile || geminiLoading} className="w-full btn-gradient text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50">
                <Brain size={18} /> <span className="relative z-10">{geminiLoading ? 'Procesando con IA...' : 'Extraer Datos'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium text-primary">Datos extraidos:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-secondary/50 p-4 rounded-xl">
                {Object.entries(datosExtraidos).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase">{key}</span>
                    <span className="font-medium">{String(value) || '-'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleConfirmGemini} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                  <Save size={18} /> <span className="relative z-10">Confirmar y Guardar</span>
                </button>
                <button onClick={() => setDatosExtraidos(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Subir otro PDF</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton h-6 w-1/4 rounded mb-3" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : incidentesFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground fade-in">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay incidentes registrados</p>
          <p className="text-sm mt-1">Registra tu primer incidente para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidentesFiltrados.map((incidente, index) => (
            <div key={incidente.idRegistro} className="glass-card p-5 card-hover fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    incidente.clasificacion === 'Fatal' ? 'bg-red-500/20' :
                    incidente.clasificacion === 'Grave' ? 'bg-amber-500/20' :
                    incidente.clasificacion === 'Moderado' ? 'bg-orange-500/20' :
                    'bg-emerald-500/20'
                  }`}>
                    <AlertTriangle size={24} className={getClasificacionColor(incidente.clasificacion)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{incidente.idRegistro}</h3>
                      <span className={`${getEstadoColor(incidente.estado)} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                        {getEstadoIcon(incidente.estado)} {incidente.estado}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${getClasificacionColor(incidente.clasificacion)}`}>
                        {incidente.clasificacion}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{incidente.descripcion}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {incidente.fechaIncidente}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {incidente.horaIncidente}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {incidente.lugar}</span>
                      <span className="flex items-center gap-1"><AlertTriangle size={12} /> {incidente.tipo}</span>
                      {incidente.personasInvolucradas && <span className="flex items-center gap-1"><Users size={12} /> {incidente.personasInvolucradas}</span>}
                    </div>
                    {incidente.proyecto && (
                      <p className="text-xs text-primary mt-2 font-medium">Proyecto: {incidente.proyecto}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(incidente)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(incidente)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                </div>
              </div>
              {(incidente.accionesCorrectivas || incidente.causasRaiz) && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {incidente.causasRaiz && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Causas Raiz</p>
                      <p className="text-sm">{incidente.causasRaiz}</p>
                    </div>
                  )}
                  {incidente.accionesCorrectivas && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Acciones Correctivas</p>
                      <p className="text-sm">{incidente.accionesCorrectivas}</p>
                      {incidente.responsableAcciones && <p className="text-xs text-muted-foreground mt-1">Responsable: {incidente.responsableAcciones}</p>}
                      {incidente.fechaCompromiso && <p className="text-xs text-muted-foreground">Compromiso: {incidente.fechaCompromiso}</p>}
                    </div>
                  )}
                </div>
              )}
              {incidente.evidencias && (
                <div className="mt-3 pt-3 border-t border-border">
                  <a href={incidente.evidencias} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <FileText size={14} /> Ver evidencias
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
