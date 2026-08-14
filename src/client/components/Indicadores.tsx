import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Plus, Pencil, Trash2, X, Save, Search, TrendingUp, TrendingDown, Minus,
  CheckCircle2, XCircle, Info, HelpCircle, Target, ClipboardList, Gauge
} from 'lucide-react';

interface IndicadorMensual {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  mes: string;
  horasHombre: number;
  accidentesConBaja: number;
  diasPerdidos: number;
  capacitacionesPlanificadas: number;
  capacitacionesRealizadas: number;
  inspeccionesPlanificadas: number;
  inspeccionesRealizadas: number;
  hallazgosAbiertos: number;
  hallazgosCerradosEnPlazo: number;
  reportesCuasiAccidentes: number;
  cipaActiva: string;
  requisitosLegalesCumplidos: number;
  requisitosLegalesAplicables: number;
}

type Direccion = 'menor_mejor' | 'mayor_mejor' | 'informativo';

interface IndicadorMeta {
  codigo: string;
  nombre: string;
  unidad: string;
  tipo: string;
  direccion: Direccion;
  formula: string;
  frecuencia: string;
  meta: number | null;
  actualizadoPor: string;
  actualizadoEn: string;
}

interface ResultadoIndicador extends IndicadorMeta {
  resultado: number;
  estado: 'Cumple' | 'No cumple' | 'Informativo' | 'Sin meta';
  tendencia?: 'creciente' | 'decreciente' | 'estable' | null;
}

interface DashboardData {
  resultados: ResultadoIndicador[];
  filtros: { proyecto: string | null; desde: string | null; hasta: string | null };
  totalRegistros: number;
  obras: string[];
  periodo: { desde: string; hasta: string } | null;
}

interface IndicadoresProps {
  proyecto?: string;
  userEmail?: string;
}

type Vista = 'dashboard' | 'mensual' | 'metas';

const formVacio = {
  idRegistro: '', proyecto: '', mes: new Date().toISOString().slice(0, 7),
  horasHombre: '', accidentesConBaja: '0', diasPerdidos: '0',
  capacitacionesPlanificadas: '0', capacitacionesRealizadas: '0',
  inspeccionesPlanificadas: '0', inspeccionesRealizadas: '0',
  hallazgosAbiertos: '0', hallazgosCerradosEnPlazo: '0', reportesCuasiAccidentes: '0',
  cipaActiva: 'NO', requisitosLegalesCumplidos: '0', requisitosLegalesAplicables: '0',
};

function formatearResultado(r: ResultadoIndicador): string {
  if (r.unidad === '%') return `${(r.resultado * 100).toFixed(1)}%`;
  if (r.unidad === 'N°') return r.resultado.toLocaleString('es-PY');
  return r.resultado.toLocaleString('es-PY', { maximumFractionDigits: 1 });
}

function formatearMeta(r: ResultadoIndicador): string {
  if (r.meta === null || r.meta === undefined) return '—';
  if (r.unidad === '%') return `${(r.meta * 100).toFixed(0)}%`;
  return r.meta.toLocaleString('es-PY', { maximumFractionDigits: 1 });
}

export default function Indicadores({ proyecto, userEmail }: IndicadoresProps) {
  const [vista, setVista] = useState<Vista>('dashboard');
  const [error, setError] = useState('');

  // ---- Dashboard ----
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const params = new URLSearchParams();
      if (proyecto) params.set('proyecto', proyecto);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const response = await fetch(`/api/indicadores/dashboard?${params.toString()}`);
      const data = await response.json();
      if (data.success) setDashboard(data.data);
      else setError(data.error || 'Error al cargar el dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => { if (vista === 'dashboard') fetchDashboard(); }, [vista, proyecto, desde, hasta]);

  // ---- Carga Mensual ----
  const [registros, setRegistros] = useState<IndicadorMensual[]>([]);
  const [loadingMensual, setLoadingMensual] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IndicadorMensual | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ ...formVacio, proyecto: proyecto || '' });

  const fetchMensual = async () => {
    setLoadingMensual(true);
    try {
      const url = proyecto ? `/api/indicadores/mensual?proyecto=${encodeURIComponent(proyecto)}` : '/api/indicadores/mensual';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) setRegistros(data.data);
      else setError(data.error || 'Error al cargar la carga mensual');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMensual(false);
    }
  };

  useEffect(() => { if (vista === 'mensual') fetchMensual(); }, [vista, proyecto]);

  const registrosFiltrados = useMemo(() => {
    let filtrados = [...registros];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(r => r.proyecto.toLowerCase().includes(term) || r.mes.includes(term));
    }
    return filtrados.sort((a, b) => (b.mes || '').localeCompare(a.mes || '') || a.proyecto.localeCompare(b.proyecto));
  }, [registros, searchTerm]);

  const resetForm = () => setForm({ ...formVacio, proyecto: proyecto || '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/indicadores/mensual/${editing.rowIndex}` : '/api/indicadores/mensual';
      const method = editing ? 'PUT' : 'POST';
      const body = editing
        ? { ...form, rowIndex: editing.rowIndex }
        : { ...form, userEmail: userEmail || 'sistema' };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditing(null); resetForm();
      fetchMensual();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (r: IndicadorMensual) => {
    if (!confirm(`Eliminar la carga de "${r.proyecto}" — ${r.mes}?`)) return;
    try {
      const response = await fetch(`/api/indicadores/mensual/${r.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchMensual();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (r: IndicadorMensual) => {
    setEditing(r);
    setForm({
      idRegistro: r.idRegistro, proyecto: r.proyecto, mes: r.mes,
      horasHombre: String(r.horasHombre), accidentesConBaja: String(r.accidentesConBaja),
      diasPerdidos: String(r.diasPerdidos),
      capacitacionesPlanificadas: String(r.capacitacionesPlanificadas),
      capacitacionesRealizadas: String(r.capacitacionesRealizadas),
      inspeccionesPlanificadas: String(r.inspeccionesPlanificadas),
      inspeccionesRealizadas: String(r.inspeccionesRealizadas),
      hallazgosAbiertos: String(r.hallazgosAbiertos),
      hallazgosCerradosEnPlazo: String(r.hallazgosCerradosEnPlazo),
      reportesCuasiAccidentes: String(r.reportesCuasiAccidentes),
      cipaActiva: r.cipaActiva, requisitosLegalesCumplidos: String(r.requisitosLegalesCumplidos),
      requisitosLegalesAplicables: String(r.requisitosLegalesAplicables),
    });
    setShowForm(true);
  };

  // ---- Metas ----
  const [metas, setMetas] = useState<IndicadorMeta[]>([]);
  const [loadingMetas, setLoadingMetas] = useState(true);
  const [editandoMeta, setEditandoMeta] = useState<string | null>(null);
  const [valorMetaEdit, setValorMetaEdit] = useState('');

  const fetchMetas = async () => {
    setLoadingMetas(true);
    try {
      const response = await fetch('/api/indicadores/metas');
      const data = await response.json();
      if (data.success) setMetas(data.data);
      else setError(data.error || 'Error al cargar las metas');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMetas(false);
    }
  };

  useEffect(() => { if (vista === 'metas') fetchMetas(); }, [vista]);

  const startEditMeta = (m: IndicadorMeta) => {
    setEditandoMeta(m.codigo);
    setValorMetaEdit(m.meta !== null ? (m.unidad === '%' ? String(m.meta * 100) : String(m.meta)) : '');
  };

  const guardarMeta = async (m: IndicadorMeta) => {
    try {
      const valorNumerico = valorMetaEdit.trim() === '' ? null : Number(valorMetaEdit);
      const metaFinal = valorNumerico === null ? null : (m.unidad === '%' ? valorNumerico / 100 : valorNumerico);
      const response = await fetch(`/api/indicadores/metas/${m.codigo}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta: metaFinal, actualizadoPor: userEmail || 'sistema' }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setEditandoMeta(null);
      fetchMetas();
    } catch (err: any) { setError(err.message); }
  };

  const getEstadoBadge = (estado: ResultadoIndicador['estado']) => {
    switch (estado) {
      case 'Cumple': return { clase: 'badge-success', icon: <CheckCircle2 size={12} /> };
      case 'No cumple': return { clase: 'badge-danger', icon: <XCircle size={12} /> };
      case 'Informativo': return { clase: 'badge-info', icon: <Info size={12} /> };
      default: return { clase: 'badge-muted', icon: <HelpCircle size={12} /> };
    }
  };

  const getSemaforoColor = (estado: ResultadoIndicador['estado']) => {
    switch (estado) {
      case 'Cumple': return 'bg-emerald-400';
      case 'No cumple': return 'bg-red-400';
      case 'Informativo': return 'bg-sky-400';
      default: return 'bg-muted-foreground/40';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="text-indigo-400" size={28} />
            Indicadores de SST
          </h1>
          <p className="text-muted-foreground mt-1">SST-IND-01 — Matriz de Indicadores</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'dashboard' as Vista, label: 'Dashboard', icon: Gauge },
          { id: 'mensual' as Vista, label: 'Carga Mensual', icon: ClipboardList },
          { id: 'metas' as Vista, label: 'Metas', icon: Target },
        ].map(tab => (
          <button key={tab.id} onClick={() => setVista(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${vista === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm flex items-center gap-2 fade-in">
          <XCircle size={16} /> <strong>Error:</strong> {error}
        </div>
      )}

      {/* ===================== DASHBOARD ===================== */}
      {vista === 'dashboard' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Desde</label>
              <input type="month" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 [color-scheme:dark]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Hasta</label>
              <input type="month" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 [color-scheme:dark]" />
            </div>
            {(desde || hasta) && (
              <button onClick={() => { setDesde(''); setHasta(''); }} className="mt-5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X size={12} /> Limpiar
              </button>
            )}
          </div>

          {loadingDashboard ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="glass-card p-5">
                  <div className="skeleton h-4 w-1/2 rounded mb-3" />
                  <div className="skeleton h-8 w-2/3 rounded" />
                </div>
              ))}
            </div>
          ) : !dashboard || dashboard.totalRegistros === 0 ? (
            <div className="text-center py-16 text-muted-foreground fade-in">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Sin datos cargados en el período</p>
              <p className="text-sm mt-1">Cargá la información mensual en la pestaña "Carga Mensual" para ver el dashboard</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {dashboard.totalRegistros} registro(s) · {dashboard.obras.length} obra(s)
                {dashboard.periodo && <> · Período: {dashboard.periodo.desde} a {dashboard.periodo.hasta}</>}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboard.resultados.map((r, index) => {
                  const badge = getEstadoBadge(r.estado);
                  return (
                    <div key={r.codigo} className="glass-card p-5 fade-in relative overflow-hidden" style={{ animationDelay: `${index * 40}ms` }}>
                      <div className={`absolute top-0 left-0 right-0 h-1 ${getSemaforoColor(r.estado)}`} />
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{r.codigo}</span>
                        <span className={`${badge.clase} px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1`}>
                          {badge.icon} {r.estado}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground leading-snug mb-3 min-h-[2.5em]">{r.nombre}</p>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-mono">{formatearResultado(r)}</span>
                        {r.codigo === 'IND-06' && r.tendencia && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {r.tendencia === 'creciente' ? <TrendingUp size={14} className="text-amber-400" /> : r.tendencia === 'decreciente' ? <TrendingDown size={14} className="text-emerald-400" /> : <Minus size={14} />}
                            {r.tendencia}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <span>Meta: {formatearMeta(r)}</span>
                        <span>{r.frecuencia}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== CARGA MENSUAL ===================== */}
      {vista === 'mensual' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input type="text" placeholder="Buscar por obra o mes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary text-muted-foreground"><X size={14} /></button>}
            </div>
            <button onClick={() => { setShowForm(true); setEditing(null); resetForm(); }} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25">
              <Plus size={18} /> <span className="relative z-10">Nueva Carga</span>
            </button>
          </div>

          {showForm && (
            <div className="glass-card p-6 scale-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{editing ? 'Editar Carga Mensual' : 'Nueva Carga Mensual'}</h2>
                <button onClick={() => setShowForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Obra *</label>
                    <input type="text" value={form.proyecto} onChange={(e) => setForm({ ...form, proyecto: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Mes *</label>
                    <input type="month" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50 [color-scheme:dark]" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Horas-hombre trabajadas *</label>
                    <input type="number" min="0" value={form.horasHombre} onChange={(e) => setForm({ ...form, horasHombre: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">N° accidentes con baja</label>
                    <input type="number" min="0" value={form.accidentesConBaja} onChange={(e) => setForm({ ...form, accidentesConBaja: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">N° días perdidos</label>
                    <input type="number" min="0" value={form.diasPerdidos} onChange={(e) => setForm({ ...form, diasPerdidos: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Capacit. planificadas</label>
                    <input type="number" min="0" value={form.capacitacionesPlanificadas} onChange={(e) => setForm({ ...form, capacitacionesPlanificadas: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Capacit. realizadas</label>
                    <input type="number" min="0" value={form.capacitacionesRealizadas} onChange={(e) => setForm({ ...form, capacitacionesRealizadas: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Inspec. planificadas</label>
                    <input type="number" min="0" value={form.inspeccionesPlanificadas} onChange={(e) => setForm({ ...form, inspeccionesPlanificadas: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Inspec. realizadas</label>
                    <input type="number" min="0" value={form.inspeccionesRealizadas} onChange={(e) => setForm({ ...form, inspeccionesRealizadas: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Hallazgos abiertos</label>
                    <input type="number" min="0" value={form.hallazgosAbiertos} onChange={(e) => setForm({ ...form, hallazgosAbiertos: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hallazgos cerrados en plazo</label>
                    <input type="number" min="0" value={form.hallazgosCerradosEnPlazo} onChange={(e) => setForm({ ...form, hallazgosCerradosEnPlazo: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Reportes de cuasi-accidentes</label>
                    <input type="number" min="0" value={form.reportesCuasiAccidentes} onChange={(e) => setForm({ ...form, reportesCuasiAccidentes: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CIPA constituida y activa</label>
                    <select value={form.cipaActiva} onChange={(e) => setForm({ ...form, cipaActiva: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                      <option value="NO">No</option>
                      <option value="SI">Sí</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Requisitos legales cumplidos</label>
                    <input type="number" min="0" value={form.requisitosLegalesCumplidos} onChange={(e) => setForm({ ...form, requisitosLegalesCumplidos: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Requisitos legales aplicables</label>
                    <input type="number" min="0" value={form.requisitosLegalesAplicables} onChange={(e) => setForm({ ...form, requisitosLegalesAplicables: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                    <Save size={18} /> <span className="relative z-10">{editing ? 'Guardar Cambios' : 'Registrar Carga'}</span>
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {loadingMensual ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/3 rounded" /></div>)}
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground fade-in">
              <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay cargas mensuales registradas</p>
              <p className="text-sm mt-1">Registrá la primera carga de datos para empezar a ver el dashboard</p>
            </div>
          ) : (
            <div className="space-y-3">
              {registrosFiltrados.map((r, index) => (
                <div key={r.idRegistro} className="glass-card p-5 card-hover fade-in" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-base">{r.proyecto || 'Sin obra'}</h3>
                        <span className="badge badge-info">{r.mes}</span>
                        {r.cipaActiva === 'SI' && <span className="badge badge-success">CIPA activa</span>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
                        <span>HH: <strong className="text-foreground">{r.horasHombre.toLocaleString('es-PY')}</strong></span>
                        <span>Accid.: <strong className="text-foreground">{r.accidentesConBaja}</strong></span>
                        <span>Días perdidos: <strong className="text-foreground">{r.diasPerdidos}</strong></span>
                        <span>Cuasi-accid.: <strong className="text-foreground">{r.reportesCuasiAccidentes}</strong></span>
                        <span>Capacit.: <strong className="text-foreground">{r.capacitacionesRealizadas}/{r.capacitacionesPlanificadas}</strong></span>
                        <span>Inspec.: <strong className="text-foreground">{r.inspeccionesRealizadas}/{r.inspeccionesPlanificadas}</strong></span>
                        <span>Hallazgos: <strong className="text-foreground">{r.hallazgosCerradosEnPlazo}/{r.hallazgosAbiertos}</strong></span>
                        <span>Req. legales: <strong className="text-foreground">{r.requisitosLegalesCumplidos}/{r.requisitosLegalesAplicables}</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(r)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(r)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== METAS ===================== */}
      {vista === 'metas' && (
        <div className="space-y-3">
          {loadingMetas ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/3 rounded" /></div>)}
            </div>
          ) : (
            metas.map((m, index) => (
              <div key={m.codigo} className="glass-card p-5 fade-in" style={{ animationDelay: `${index * 40}ms` }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground">{m.codigo}</span>
                      <span className="badge badge-muted">{m.tipo}</span>
                      <span className="text-xs text-muted-foreground">{m.frecuencia}</span>
                    </div>
                    <h3 className="font-semibold text-base mt-1">{m.nombre}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{m.formula}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {editandoMeta === m.codigo ? (
                      <>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" step="any" autoFocus value={valorMetaEdit}
                            onChange={(e) => setValorMetaEdit(e.target.value)}
                            placeholder={m.direccion === 'informativo' ? 'N/A' : ''}
                            className="w-28 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-right input-glow focus:outline-none focus:border-primary/50"
                          />
                          <span className="text-xs text-muted-foreground w-10">{m.unidad === '%' ? '%' : m.unidad}</span>
                        </div>
                        <button onClick={() => guardarMeta(m)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Guardar"><Save size={16} /></button>
                        <button onClick={() => setEditandoMeta(null)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="Cancelar"><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <div className="text-right">
                          <p className="text-lg font-bold font-mono">{m.meta !== null ? (m.unidad === '%' ? `${(m.meta * 100).toFixed(0)}%` : m.meta.toLocaleString('es-PY')) : (m.direccion === 'informativo' ? 'N/A' : 'Sin definir')}</p>
                          <p className="text-[10px] text-muted-foreground">Meta actual</p>
                        </div>
                        <button onClick={() => startEditMeta(m)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar meta"><Pencil size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
                {m.actualizadoEn && (
                  <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/50">
                    Última actualización: {new Date(m.actualizadoEn).toLocaleDateString('es-PY')} por {m.actualizadoPor}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
