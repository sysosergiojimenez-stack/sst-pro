import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, X, Save, Search, Calendar, Clock, MapPin, Users, CheckCircle2, AlertCircle, FileDown, Lock } from 'lucide-react';
import jsPDF from 'jspdf';
import { apiFetch } from '../lib/api';
import { drawPdfHeader, type ProyectoPdfHeader } from '../lib/pdfHeader';
import { dibujarCheckboxLinea } from '../lib/pdfWidgets';

interface PermisoTrabajo {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  fecha: string;
  horaInicio: string;
  horaFinPrevista: string;
  frente: string;
  empresaEjecutante: string;
  descripcionTarea: string;
  tiposTrabajo: string[];
  tipoOtroDetalle: string;
  condRiesgosComunicados: boolean;
  condEppVerificado: boolean;
  condEquiposInspeccionados: boolean;
  condAreaSenalizada: boolean;
  condPlanRescateConfirmado: boolean;
  condClimaApto: boolean;
  trabajadores: string;
  autorizanteJefeObra: string;
  autorizanteResponsableSSO: string;
  estado: string;
  cierreFecha: string;
  cierreHora: string;
  cierreResponsable: string;
}

interface PermisosTrabajoProps {
  proyecto?: string;
  proyectoLogo?: string;
}

const tiposTrabajoOpciones = [
  'Trabajo en altura', 'Espacio confinado', 'Trabajo en caliente', 'Izaje de cargas',
  'Excavación o zanja', 'Trabajo eléctrico', 'Otro',
];

type CampoCondicion = 'condRiesgosComunicados' | 'condEppVerificado' | 'condEquiposInspeccionados' | 'condAreaSenalizada' | 'condPlanRescateConfirmado' | 'condClimaApto';

const condicionesOpciones: { key: CampoCondicion; label: string }[] = [
  { key: 'condRiesgosComunicados', label: 'Riesgos de la tarea identificados y comunicados a los trabajadores' },
  { key: 'condEppVerificado', label: 'EPP específico verificado y en buen estado' },
  { key: 'condEquiposInspeccionados', label: 'Equipos, anclajes o elementos de izaje inspeccionados antes de la maniobra' },
  { key: 'condAreaSenalizada', label: 'Área delimitada y señalizada' },
  { key: 'condPlanRescateConfirmado', label: 'Plan de rescate / respuesta ante emergencia confirmado para esta tarea' },
  { key: 'condClimaApto', label: 'Condiciones climáticas verificadas y aptas para el trabajo' },
];

const estados = ['Abierto', 'Cerrado'];

const formVacio = {
  idRegistro: '', proyecto: '', fecha: '', horaInicio: '', horaFinPrevista: '',
  frente: '', empresaEjecutante: '', descripcionTarea: '',
  tiposTrabajo: [] as string[], tipoOtroDetalle: '',
  condRiesgosComunicados: false, condEppVerificado: false, condEquiposInspeccionados: false,
  condAreaSenalizada: false, condPlanRescateConfirmado: false, condClimaApto: false,
  trabajadores: '', autorizanteJefeObra: '', autorizanteResponsableSSO: '',
  estado: 'Abierto', cierreFecha: '', cierreHora: '', cierreResponsable: '',
};

export default function PermisosTrabajo({ proyecto, proyectoLogo }: PermisosTrabajoProps) {
  const [permisos, setPermisos] = useState<PermisoTrabajo[]>([]);
  const [permisosFiltrados, setPermisosFiltrados] = useState<PermisoTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PermisoTrabajo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [form, setForm] = useState({ ...formVacio, proyecto: proyecto || '' });

  const toggleTipoTrabajo = (tipo: string) => {
    const set = new Set(form.tiposTrabajo);
    if (set.has(tipo)) set.delete(tipo); else set.add(tipo);
    setForm({ ...form, tiposTrabajo: Array.from(set) });
  };

  const fetchPermisos = async () => {
    setLoading(true);
    try {
      const url = proyecto ? `/api/permisos?proyecto=${encodeURIComponent(proyecto)}` : '/api/permisos';
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setPermisos(data.data);
        setPermisosFiltrados(data.data);
      } else {
        setError(data.error || 'Error al cargar permisos');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPermisos(); }, [proyecto]);

  useEffect(() => {
    let filtrados = [...permisos];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(p =>
        p.descripcionTarea.toLowerCase().includes(term) ||
        p.frente.toLowerCase().includes(term) ||
        p.trabajadores.toLowerCase().includes(term) ||
        p.idRegistro.toLowerCase().includes(term)
      );
    }
    if (filtroTipo) filtrados = filtrados.filter(p => p.tiposTrabajo.includes(filtroTipo));
    if (filtroEstado) filtrados = filtrados.filter(p => p.estado === filtroEstado);
    setPermisosFiltrados(filtrados);
  }, [searchTerm, filtroTipo, filtroEstado, permisos]);

  const resetForm = () => setForm({ ...formVacio, proyecto: proyecto || '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/permisos/${encodeURIComponent(editing.idRegistro)}` : '/api/permisos';
      const method = editing ? 'PUT' : 'POST';
      const response = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditing(null);
      resetForm();
      fetchPermisos();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (permiso: PermisoTrabajo) => {
    if (!confirm(`Eliminar permiso "${permiso.idRegistro}"?`)) return;
    try {
      const response = await apiFetch(`/api/permisos/${encodeURIComponent(permiso.idRegistro)}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchPermisos();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (permiso: PermisoTrabajo) => {
    setEditing(permiso);
    setForm({
      idRegistro: permiso.idRegistro, proyecto: permiso.proyecto, fecha: permiso.fecha,
      horaInicio: permiso.horaInicio, horaFinPrevista: permiso.horaFinPrevista, frente: permiso.frente,
      empresaEjecutante: permiso.empresaEjecutante, descripcionTarea: permiso.descripcionTarea,
      tiposTrabajo: permiso.tiposTrabajo || [], tipoOtroDetalle: permiso.tipoOtroDetalle || '',
      condRiesgosComunicados: permiso.condRiesgosComunicados, condEppVerificado: permiso.condEppVerificado,
      condEquiposInspeccionados: permiso.condEquiposInspeccionados, condAreaSenalizada: permiso.condAreaSenalizada,
      condPlanRescateConfirmado: permiso.condPlanRescateConfirmado, condClimaApto: permiso.condClimaApto,
      trabajadores: permiso.trabajadores, autorizanteJefeObra: permiso.autorizanteJefeObra,
      autorizanteResponsableSSO: permiso.autorizanteResponsableSSO, estado: permiso.estado,
      cierreFecha: permiso.cierreFecha || '', cierreHora: permiso.cierreHora || '',
      cierreResponsable: permiso.cierreResponsable || '',
    });
    setShowForm(true);
  };

  const cerrarPermiso = async (permiso: PermisoTrabajo) => {
    const responsable = prompt('Nombre del Jefe de Obra que cierra el permiso (verifica condiciones seguras del área):', permiso.autorizanteJefeObra || '');
    if (responsable === null) return;
    const ahora = new Date();
    try {
      const response = await apiFetch(`/api/permisos/${encodeURIComponent(permiso.idRegistro)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'Cerrado',
          cierreFecha: ahora.toISOString().slice(0, 10),
          cierreHora: ahora.toTimeString().slice(0, 5),
          cierreResponsable: responsable,
        }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchPermisos();
    } catch (err: any) { setError(err.message); }
  };

  const getEstadoColor = (estado: string) => estado === 'Cerrado' ? 'badge-success' : 'badge-danger';
  const getEstadoIcon = (estado: string) => estado === 'Cerrado'
    ? <CheckCircle2 size={14} className="text-emerald-400" />
    : <AlertCircle size={14} className="text-red-400" />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-amber-400" size={28} />
            Permisos de Trabajo de Alto Riesgo
          </h1>
          <p className="text-muted-foreground mt-1">{permisos.length} permisos registrados</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); resetForm(); }} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25">
          <Plus size={18} /> <span className="relative z-10">Nuevo Permiso</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        {[
          { label: 'Abiertos', value: permisos.filter(p => p.estado === 'Abierto').length, color: 'from-red-500 to-red-600' },
          { label: 'Cerrados', value: permisos.filter(p => p.estado === 'Cerrado').length, color: 'from-emerald-500 to-teal-500' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <ShieldCheck size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="Buscar permisos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary text-muted-foreground"><X size={14} /></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50">
            <option value="">Todos los tipos</option>
            {tiposTrabajoOpciones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50">
            <option value="">Todos los estados</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm flex items-center gap-2 fade-in">
          <AlertCircle size={16} /> <strong>Error:</strong> {error}
        </div>
      )}

      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">{editing ? 'Editar Permiso' : 'Nuevo Permiso de Trabajo de Alto Riesgo'}</h2>
            <button onClick={() => setShowForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">ID Registro</label>
                <input type="text" value={form.idRegistro} onChange={(e) => setForm({...form, idRegistro: e.target.value})} placeholder="Autogenerado" className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fecha *</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({...form, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora de inicio</label>
                <input type="time" value={form.horaInicio} onChange={(e) => setForm({...form, horaInicio: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora de finalización prevista</label>
                <input type="time" value={form.horaFinPrevista} onChange={(e) => setForm({...form, horaFinPrevista: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Frente / ubicación específica *</label>
                <input type="text" value={form.frente} onChange={(e) => setForm({...form, frente: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Empresa ejecutante (propia / subcontratista)</label>
                <input type="text" value={form.empresaEjecutante} onChange={(e) => setForm({...form, empresaEjecutante: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descripción de la tarea *</label>
              <textarea value={form.descripcionTarea} onChange={(e) => setForm({...form, descripcionTarea: e.target.value})} rows={3} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de trabajo *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-secondary border border-border rounded-xl px-4 py-3">
                {tiposTrabajoOpciones.map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.tiposTrabajo.includes(t)} onChange={() => toggleTipoTrabajo(t)} className="w-4 h-4 rounded border-border" />
                    {t}
                  </label>
                ))}
              </div>
              {form.tiposTrabajo.includes('Otro') && (
                <input type="text" value={form.tipoOtroDetalle} onChange={(e) => setForm({...form, tipoOtroDetalle: e.target.value})} placeholder="Especificar" className="mt-2 w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Verificación de condiciones de seguridad</label>
              <div className="grid grid-cols-1 gap-2 bg-secondary border border-border rounded-xl px-4 py-3">
                {condicionesOpciones.map(c => (
                  <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form[c.key] as boolean} onChange={(e) => setForm({...form, [c.key]: e.target.checked})} className="w-4 h-4 rounded border-border" />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trabajadores involucrados</label>
              <input type="text" value={form.trabajadores} onChange={(e) => setForm({...form, trabajadores: e.target.value})} placeholder="Nombres separados por coma" className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>

            <div className="pt-2">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Autorización de inicio</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Jefe de Obra</label>
                  <input type="text" value={form.autorizanteJefeObra} onChange={(e) => setForm({...form, autorizanteJefeObra: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Responsable de SSO</label>
                  <input type="text" value={form.autorizanteResponsableSSO} onChange={(e) => setForm({...form, autorizanteResponsableSSO: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                <Save size={18} /> <span className="relative z-10">{editing ? 'Guardar Cambios' : 'Registrar Permiso'}</span>
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
            </div>
          </form>
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
      ) : permisosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground fade-in">
          <ShieldCheck size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay permisos registrados</p>
          <p className="text-sm mt-1">Registra el primer permiso antes de iniciar un trabajo de alto riesgo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {permisosFiltrados.map((permiso, index) => (
            <div key={permiso.idRegistro} className="glass-card p-5 card-hover fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${permiso.estado === 'Cerrado' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <ShieldCheck size={24} className={permiso.estado === 'Cerrado' ? 'text-emerald-400' : 'text-red-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{permiso.idRegistro}</h3>
                      <span className={`${getEstadoColor(permiso.estado)} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                        {getEstadoIcon(permiso.estado)} {permiso.estado}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{permiso.descripcionTarea}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {permiso.tiposTrabajo.map(t => (
                        <span key={t} className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {permiso.fecha}</span>
                      {permiso.horaInicio && <span className="flex items-center gap-1"><Clock size={12} /> {permiso.horaInicio}{permiso.horaFinPrevista ? ` – ${permiso.horaFinPrevista}` : ''}</span>}
                      <span className="flex items-center gap-1"><MapPin size={12} /> {permiso.frente}</span>
                      {permiso.trabajadores && <span className="flex items-center gap-1"><Users size={12} /> {permiso.trabajadores}</span>}
                    </div>
                    {permiso.proyecto && (
                      <p className="text-xs text-primary mt-2 font-medium">Proyecto: {permiso.proyecto}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {permiso.estado === 'Abierto' && (
                    <button onClick={() => cerrarPermiso(permiso)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-emerald-400" title="Cerrar permiso"><Lock size={16} /></button>
                  )}
                  <button onClick={() => generarPDFPermiso(permiso, proyecto ? { denominacion: proyecto, logo: proyectoLogo } : undefined)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Exportar SST-FOR-02 (PDF)"><FileDown size={16} /></button>
                  <button onClick={() => startEdit(permiso)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(permiso)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                </div>
              </div>
              {permiso.estado === 'Cerrado' && permiso.cierreFecha && (
                <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                  Cerrado el {permiso.cierreFecha} {permiso.cierreHora} por {permiso.cierreResponsable}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function generarPDFPermiso(permiso: PermisoTrabajo, proyecto?: ProyectoPdfHeader) {
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

  y = await drawPdfHeader(doc, proyecto || { denominacion: permiso.proyecto }, y, { marginLeft, marginRight });
  y += 6;

  doc.setFillColor(30, 58, 95);
  doc.rect(marginLeft, y, contentWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SST-FOR-02   PERMISO DE TRABAJO DE ALTO RIESGO', marginLeft + 3, y + 10);
  doc.setTextColor(0, 0, 0);
  y += 22;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const subtitulo = doc.splitTextToSize(
    'Obligatorio antes de iniciar trabajos en altura, espacios confinados, trabajo en caliente, izaje o excavaciones',
    contentWidth
  );
  doc.text(subtitulo, marginLeft, y);
  y += subtitulo.length * 4 + 4;

  const colWidth = contentWidth / 2 - 3;

  const campoDoble = (label1: string, val1: string, label2: string, val2: string) => {
    checkPageBreak(15);
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

  campoDoble('Obra:', permiso.proyecto, 'Fecha:', formatearFecha(permiso.fecha));
  campoDoble('Hora de inicio:', permiso.horaInicio, 'Hora de finalización prevista:', permiso.horaFinPrevista);
  campoDoble('Frente / ubicación específica:', permiso.frente, 'Empresa ejecutante:', permiso.empresaEjecutante);

  seccionBoxeada('Descripción de la tarea', permiso.descripcionTarea, 3);

  checkPageBreak(30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de trabajo', marginLeft, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  for (const t of tiposTrabajoOpciones) {
    checkPageBreak(7);
    const label = t === 'Otro' ? `Otro (especificar): ${permiso.tiposTrabajo.includes('Otro') ? (permiso.tipoOtroDetalle || '______') : '______'}` : t;
    dibujarCheckboxLinea(doc, marginLeft, y, label, permiso.tiposTrabajo.includes(t), contentWidth);
    y += 7;
  }
  y += 2;

  checkPageBreak(30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Verificación de condiciones de seguridad', marginLeft, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  for (const c of condicionesOpciones) {
    checkPageBreak(9);
    dibujarCheckboxLinea(doc, marginLeft, y, c.label, !!permiso[c.key], contentWidth);
    y += 9;
  }
  y += 2;

  seccionBoxeada('Trabajadores involucrados (nombre y firma)', permiso.trabajadores, 3);

  checkPageBreak(40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Autorización y cierre', marginLeft, y);
  y += 10;

  const firmaAncho = contentWidth / 2 - 4;
  doc.setDrawColor(0, 0, 0);
  doc.line(marginLeft, y, marginLeft + firmaAncho, y);
  doc.line(marginLeft + firmaAncho + 8, y, marginLeft + contentWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(permiso.autorizanteJefeObra || '', marginLeft, y);
  doc.text(permiso.autorizanteResponsableSSO || '', marginLeft + firmaAncho + 8, y);
  y += 4;
  doc.text('Firma del Jefe de Obra (autoriza inicio)', marginLeft, y);
  doc.text('Firma del responsable de SSO (autoriza inicio)', marginLeft + firmaAncho + 8, y);
  y += 10;

  checkPageBreak(20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Cierre del permiso: verificadas las condiciones seguras del área al finalizar la tarea.', marginLeft, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(0, 0, 0);
  doc.line(marginLeft, y, marginLeft + firmaAncho, y);
  y += 5;
  doc.setFontSize(8);
  doc.text(permiso.estado === 'Cerrado' ? permiso.cierreResponsable : '', marginLeft, y);
  y += 4;
  doc.text('Firma de cierre — Jefe de Obra', marginLeft, y);
  y += 6;
  doc.text(`Hora de cierre real: ${permiso.estado === 'Cerrado' ? `${formatearFecha(permiso.cierreFecha)} ${permiso.cierreHora}` : '_______________'}`, marginLeft, y);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(
    'Formulario SST-FOR-02 — Sistema de Gestión de SST — Conservar archivado en el legajo de la obra.',
    marginLeft, pageHeight - 10
  );

  const nombreArchivo = `SST-FOR-02_${permiso.idRegistro || 'permiso'}_${permiso.fecha || ''}.pdf`;
  doc.save(nombreArchivo);
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '-';
  const d = new Date(fecha + (fecha.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-PY');
}
