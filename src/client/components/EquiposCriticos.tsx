import { useState, useEffect } from 'react';
import { HardHat, Plus, Pencil, Trash2, X, Save, Search, FileDown, CheckCircle2, AlertCircle, ShieldOff, ClipboardList } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../lib/api';
import { drawPdfHeader, type ProyectoPdfHeader } from '../lib/pdfHeader';

interface InspeccionEquipo {
  fecha: string;
  inspector: string;
  itemsVerificados: string;
  resultado: string;
  firma: string;
}

interface EquipoCritico {
  rowIndex: number;
  idRegistro: string;
  fechaHoraRegistro: string;
  userEmail: string;
  proyecto: string;
  categoria: string;
  identificador: string;
  tipo: string;
  marcaModelo: string;
  capacidadNominal: string;
  fechaFabricacion: string;
  fechaPrimerUso: string;
  ubicacionAsignada: string;
  estado: string;
  fechaBaja: string;
  motivoBaja: string;
  autorizanteBaja: string;
  inspecciones: InspeccionEquipo[];
}

interface EquiposCriticosProps {
  proyecto?: string;
  proyectoLogo?: string;
}

const CATEGORIAS = [
  'Arnés / Línea de Vida / Conector',
  'Eslinga / Grillete / Aparejo de Izaje',
  'Panel / Puntal Sistema Túnel',
];

const codigoFormulario: Record<string, string> = {
  'Arnés / Línea de Vida / Conector': 'SST-FOR-04',
  'Eslinga / Grillete / Aparejo de Izaje': 'SST-FOR-09',
  'Panel / Puntal Sistema Túnel': 'SST-FOR-14',
};

const resultadosInspeccion = ['Apto', 'No apto'];
const estados = ['Activo', 'De Baja'];

const inspeccionVacia = { fecha: '', inspector: '', itemsVerificados: '', resultado: 'Apto', firma: '' };

const formVacio = {
  idRegistro: '', proyecto: '', categoria: CATEGORIAS[0], identificador: '', tipo: '',
  marcaModelo: '', capacidadNominal: '', fechaFabricacion: '', fechaPrimerUso: '',
  ubicacionAsignada: '', estado: 'Activo', fechaBaja: '', motivoBaja: '', autorizanteBaja: '',
  inspecciones: [] as InspeccionEquipo[],
};

export default function EquiposCriticos({ proyecto, proyectoLogo }: EquiposCriticosProps) {
  const [equipos, setEquipos] = useState<EquipoCritico[]>([]);
  const [equiposFiltrados, setEquiposFiltrados] = useState<EquipoCritico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EquipoCritico | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [form, setForm] = useState({ ...formVacio, proyecto: proyecto || '' });
  const [nuevaInspeccion, setNuevaInspeccion] = useState({ ...inspeccionVacia });

  const fetchEquipos = async () => {
    setLoading(true);
    try {
      const url = proyecto ? `/api/equipos-criticos?proyecto=${encodeURIComponent(proyecto)}` : '/api/equipos-criticos';
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setEquipos(data.data);
        setEquiposFiltrados(data.data);
      } else {
        setError(data.error || 'Error al cargar equipos');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEquipos(); }, [proyecto]);

  useEffect(() => {
    let filtrados = [...equipos];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(e =>
        e.identificador.toLowerCase().includes(term) ||
        e.tipo.toLowerCase().includes(term) ||
        e.ubicacionAsignada.toLowerCase().includes(term) ||
        e.idRegistro.toLowerCase().includes(term)
      );
    }
    if (filtroCategoria) filtrados = filtrados.filter(e => e.categoria === filtroCategoria);
    if (filtroEstado) filtrados = filtrados.filter(e => e.estado === filtroEstado);
    setEquiposFiltrados(filtrados);
  }, [searchTerm, filtroCategoria, filtroEstado, equipos]);

  const resetForm = () => {
    setForm({ ...formVacio, proyecto: proyecto || '' });
    setNuevaInspeccion({ ...inspeccionVacia });
  };

  const agregarInspeccion = () => {
    if (!nuevaInspeccion.fecha || !nuevaInspeccion.inspector) {
      alert('Completa al menos la fecha y el inspector antes de agregar la inspección.');
      return;
    }
    setForm({ ...form, inspecciones: [...form.inspecciones, nuevaInspeccion] });
    setNuevaInspeccion({ ...inspeccionVacia });
  };

  const quitarInspeccion = (index: number) => {
    setForm({ ...form, inspecciones: form.inspecciones.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/equipos-criticos/${encodeURIComponent(editing.idRegistro)}` : '/api/equipos-criticos';
      const method = editing ? 'PUT' : 'POST';
      const response = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditing(null);
      resetForm();
      fetchEquipos();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (equipo: EquipoCritico) => {
    if (!confirm(`Eliminar equipo "${equipo.identificador || equipo.idRegistro}"?`)) return;
    try {
      const response = await apiFetch(`/api/equipos-criticos/${encodeURIComponent(equipo.idRegistro)}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchEquipos();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (equipo: EquipoCritico) => {
    setEditing(equipo);
    setForm({
      idRegistro: equipo.idRegistro, proyecto: equipo.proyecto, categoria: equipo.categoria,
      identificador: equipo.identificador, tipo: equipo.tipo, marcaModelo: equipo.marcaModelo,
      capacidadNominal: equipo.capacidadNominal, fechaFabricacion: equipo.fechaFabricacion,
      fechaPrimerUso: equipo.fechaPrimerUso, ubicacionAsignada: equipo.ubicacionAsignada,
      estado: equipo.estado, fechaBaja: equipo.fechaBaja || '', motivoBaja: equipo.motivoBaja || '',
      autorizanteBaja: equipo.autorizanteBaja || '', inspecciones: equipo.inspecciones || [],
    });
    setNuevaInspeccion({ ...inspeccionVacia });
    setShowForm(true);
  };

  const esArnes = form.categoria === 'Arnés / Línea de Vida / Conector';
  const esEslinga = form.categoria === 'Eslinga / Grillete / Aparejo de Izaje';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardHat className="text-amber-400" size={28} />
            Equipos Críticos
          </h1>
          <p className="text-muted-foreground mt-1">{equipos.length} equipos registrados · arneses, eslingas y paneles de encofrado</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); resetForm(); }} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25">
          <Plus size={18} /> <span className="relative z-10">Nuevo Equipo</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold">{equipos.filter(e => e.estado === 'Activo').length}</p>
          <p className="text-xs text-muted-foreground">Activos</p>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-3">
            <ShieldOff size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold">{equipos.filter(e => e.estado === 'De Baja').length}</p>
          <p className="text-xs text-muted-foreground">Dados de baja</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="Buscar por identificador, tipo o ubicación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary text-muted-foreground"><X size={14} /></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
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
            <h2 className="text-lg font-semibold">{editing ? 'Editar Equipo' : 'Nuevo Equipo Crítico'}</h2>
            <button onClick={() => setShowForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Categoría *</label>
                <select value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">N° de identificación / código *</label>
                <input type="text" value={form.identificador} onChange={(e) => setForm({...form, identificador: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <input type="text" value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})} placeholder={esArnes ? 'Arnés / línea de vida / conector' : esEslinga ? 'Eslinga textil / cadena / cable / grillete / gancho' : 'Panel / puntal'} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
            </div>

            {esArnes && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Marca / Modelo</label>
                  <input type="text" value={form.marcaModelo} onChange={(e) => setForm({...form, marcaModelo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de fabricación</label>
                  <input type="date" value={form.fechaFabricacion} onChange={(e) => setForm({...form, fechaFabricacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de primer uso</label>
                  <input type="date" value={form.fechaPrimerUso} onChange={(e) => setForm({...form, fechaPrimerUso: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
              </div>
            )}

            {esEslinga && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Capacidad nominal</label>
                  <input type="text" value={form.capacidadNominal} onChange={(e) => setForm({...form, capacidadNominal: e.target.value})} placeholder="Ej: 2 Tn" className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de fabricación</label>
                  <input type="date" value={form.fechaFabricacion} onChange={(e) => setForm({...form, fechaFabricacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de primer uso</label>
                  <input type="date" value={form.fechaPrimerUso} onChange={(e) => setForm({...form, fechaPrimerUso: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{form.categoria === 'Panel / Puntal Sistema Túnel' ? 'Posición / nivel asignado' : 'Obra / área asignada'}</label>
                <input type="text" value={form.ubicacionAsignada} onChange={(e) => setForm({...form, ubicacionAsignada: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                  {estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {form.estado === 'De Baja' && (
              <div className="pt-2">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Baja del equipo</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha de baja</label>
                    <input type="date" value={form.fechaBaja} onChange={(e) => setForm({...form, fechaBaja: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Motivo de la baja</label>
                    <input type="text" value={form.motivoBaja} onChange={(e) => setForm({...form, motivoBaja: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Responsable de SSO que autoriza</label>
                    <input type="text" value={form.autorizanteBaja} onChange={(e) => setForm({...form, autorizanteBaja: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><ClipboardList size={16} /> Registro de inspecciones</p>
              {form.inspecciones.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-1.5 pr-3">Fecha</th>
                        <th className="py-1.5 pr-3">Inspector</th>
                        <th className="py-1.5 pr-3">Ítems verificados</th>
                        <th className="py-1.5 pr-3">Resultado</th>
                        <th className="py-1.5 pr-3">Firma</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.inspecciones.map((insp, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1.5 pr-3 whitespace-nowrap">{insp.fecha}</td>
                          <td className="py-1.5 pr-3">{insp.inspector}</td>
                          <td className="py-1.5 pr-3">{insp.itemsVerificados}</td>
                          <td className="py-1.5 pr-3">
                            <span className={insp.resultado === 'Apto' ? 'text-emerald-400' : 'text-red-400'}>{insp.resultado}</span>
                          </td>
                          <td className="py-1.5 pr-3">{insp.firma}</td>
                          <td className="py-1.5"><button type="button" onClick={() => quitarInspeccion(i)} className="text-muted-foreground hover:text-red-400"><X size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-secondary/50 border border-border rounded-xl p-3">
                <input type="date" value={nuevaInspeccion.fecha} onChange={(e) => setNuevaInspeccion({...nuevaInspeccion, fecha: e.target.value})} className="bg-background border border-border rounded-lg px-3 py-2 text-xs input-glow focus:outline-none focus:border-primary/50" placeholder="Fecha" />
                <input type="text" value={nuevaInspeccion.inspector} onChange={(e) => setNuevaInspeccion({...nuevaInspeccion, inspector: e.target.value})} placeholder="Inspector" className="bg-background border border-border rounded-lg px-3 py-2 text-xs input-glow focus:outline-none focus:border-primary/50" />
                <input type="text" value={nuevaInspeccion.itemsVerificados} onChange={(e) => setNuevaInspeccion({...nuevaInspeccion, itemsVerificados: e.target.value})} placeholder="Ítems verificados" className="bg-background border border-border rounded-lg px-3 py-2 text-xs input-glow focus:outline-none focus:border-primary/50" />
                <select value={nuevaInspeccion.resultado} onChange={(e) => setNuevaInspeccion({...nuevaInspeccion, resultado: e.target.value})} className="bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50">
                  {resultadosInspeccion.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="text" value={nuevaInspeccion.firma} onChange={(e) => setNuevaInspeccion({...nuevaInspeccion, firma: e.target.value})} placeholder="Firma" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs input-glow focus:outline-none focus:border-primary/50" />
                  <button type="button" onClick={agregarInspeccion} className="px-3 py-2 bg-cbvp-blue/10 rounded-lg text-primary hover:bg-primary/20 transition-colors shrink-0"><Plus size={14} /></button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                <Save size={18} /> <span className="relative z-10">{editing ? 'Guardar Cambios' : 'Registrar Equipo'}</span>
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
      ) : equiposFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground fade-in">
          <HardHat size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay equipos registrados</p>
          <p className="text-sm mt-1">Registra el primer arnés, eslinga o panel para llevar su historial de inspecciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equiposFiltrados.map((equipo, index) => {
            const ultimaInspeccion = equipo.inspecciones && equipo.inspecciones.length > 0
              ? [...equipo.inspecciones].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
              : null;
            return (
              <div key={equipo.idRegistro} className="glass-card p-5 card-hover fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${equipo.estado === 'De Baja' ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                      <HardHat size={24} className={equipo.estado === 'De Baja' ? 'text-red-400' : 'text-emerald-400'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg">{equipo.identificador || equipo.idRegistro}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${equipo.estado === 'De Baja' ? 'badge-danger' : 'badge-success'}`}>
                          {equipo.estado === 'De Baja' ? <ShieldOff size={14} /> : <CheckCircle2 size={14} />} {equipo.estado}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{equipo.categoria}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{equipo.tipo}{equipo.marcaModelo ? ` · ${equipo.marcaModelo}` : ''}{equipo.capacidadNominal ? ` · ${equipo.capacidadNominal}` : ''}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                        {equipo.ubicacionAsignada && <span>Asignado a: {equipo.ubicacionAsignada}</span>}
                        <span className="flex items-center gap-1"><ClipboardList size={12} /> {equipo.inspecciones?.length || 0} inspección(es)</span>
                        {ultimaInspeccion && (
                          <span className={ultimaInspeccion.resultado === 'Apto' ? 'text-emerald-400' : 'text-red-400'}>
                            Última: {ultimaInspeccion.fecha} — {ultimaInspeccion.resultado}
                          </span>
                        )}
                      </div>
                      {equipo.proyecto && (
                        <p className="text-xs text-primary mt-2 font-medium">Proyecto: {equipo.proyecto}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => generarPDFEquipo(equipo, proyecto ? { denominacion: proyecto, logo: proyectoLogo } : undefined)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title={`Exportar ${codigoFormulario[equipo.categoria] || 'ficha'} (PDF)`}><FileDown size={16} /></button>
                    <button onClick={() => startEdit(equipo)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(equipo)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function generarPDFEquipo(equipo: EquipoCritico, proyecto?: ProyectoPdfHeader) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 15;

  const codigo = codigoFormulario[equipo.categoria] || 'SST-FOR';
  const titulos: Record<string, string> = {
    'Arnés / Línea de Vida / Conector': 'FICHA DE INSPECCIÓN DE ARNÉS Y LÍNEA DE VIDA',
    'Eslinga / Grillete / Aparejo de Izaje': 'FICHA DE INSPECCIÓN DE ESLINGAS Y APAREJOS DE IZAJE',
    'Panel / Puntal Sistema Túnel': 'FICHA DE INSPECCIÓN DE PANELES Y PUNTALES DEL SISTEMA TÚNEL',
  };

  y = await drawPdfHeader(doc, proyecto || { denominacion: equipo.proyecto }, y, { marginLeft, marginRight });
  y += 6;

  doc.setFillColor(30, 58, 95);
  doc.rect(marginLeft, y, contentWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${codigo}   ${titulos[equipo.categoria] || 'FICHA DE INSPECCIÓN DE EQUIPO'}`, marginLeft + 3, y + 10);
  doc.setTextColor(0, 0, 0);
  y += 22;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Un formulario por cada equipo; conservar durante toda su vida útil', marginLeft, y);
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

  campoDoble('N° de serie / código del equipo:', equipo.identificador, 'Tipo:', equipo.tipo);
  if (equipo.categoria === 'Eslinga / Grillete / Aparejo de Izaje') {
    campoDoble('Capacidad nominal:', equipo.capacidadNominal, 'Fecha de fabricación:', formatearFecha(equipo.fechaFabricacion));
    campoDoble('Fecha de primer uso:', formatearFecha(equipo.fechaPrimerUso), 'Obra a la que está asignado:', equipo.ubicacionAsignada);
  } else if (equipo.categoria === 'Arnés / Línea de Vida / Conector') {
    campoDoble('Marca / modelo:', equipo.marcaModelo, 'Fecha de fabricación:', formatearFecha(equipo.fechaFabricacion));
    campoDoble('Fecha de primer uso:', formatearFecha(equipo.fechaPrimerUso), 'Obra / área a la que está asignado:', equipo.ubicacionAsignada);
  } else {
    campoDoble('Obra:', equipo.proyecto, 'Posición / nivel asignado:', equipo.ubicacionAsignada);
  }

  y += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro de inspecciones', marginLeft, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Inspector', 'Ítems verificados', 'Resultado', 'Firma']],
    body: (equipo.inspecciones || []).map(i => [formatearFecha(i.fecha), i.inspector, i.itemsVerificados, i.resultado, i.firma]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 8 },
    margin: { top: y, left: marginLeft, right: marginRight },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'No apto') { data.cell.styles.textColor = [180, 30, 30]; data.cell.styles.fontStyle = 'bold'; }
      }
    },
  });
  // @ts-expect-error lastAutoTable se agrega dinamicamente por el plugin
  y = doc.lastAutoTable.finalY + 10;

  if (y > pageHeight - 50) { doc.addPage(); y = 20; }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Baja del equipo (completar solo si corresponde)', marginLeft, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (equipo.estado === 'De Baja') {
    campoDoble('Fecha de baja:', formatearFecha(equipo.fechaBaja), 'Motivo de la baja:', equipo.motivoBaja);
    doc.text(`Autoriza: ${equipo.autorizanteBaja || '-'}`, marginLeft, y);
    y += 10;
  } else {
    doc.text('Fecha de baja: ___________________', marginLeft, y);
    y += 12;
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(marginLeft, y, marginLeft + colWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('Firma del responsable de SSO que autoriza la baja', marginLeft, y);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Formulario ${codigo} — Sistema de Gestión de SST — Conservar archivado en el legajo de la obra / del equipo según corresponda.`,
    marginLeft, pageHeight - 10
  );

  const nombreArchivo = `${codigo}_${equipo.identificador || equipo.idRegistro}.pdf`;
  doc.save(nombreArchivo);
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '-';
  const d = new Date(fecha + (fecha.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-PY');
}
