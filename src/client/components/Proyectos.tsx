import { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Pencil, Trash2, X, Save, ImageIcon, Search, Filter } from 'lucide-react';

interface Proyecto {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
}

interface ProyectosProps {
  onSelectProyecto: (proyecto: Proyecto) => void;
}

export default function Proyectos({ onSelectProyecto }: ProyectosProps) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectosFiltrados, setProyectosFiltrados] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Proyecto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ idRegistro: '', denominacion: '', ubicacion: '', logo: '' });

  const fetchProyectos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proyectos');
      const data = await response.json();
      if (data.success) {
        setProyectos(data.data);
        setProyectosFiltrados(data.data);
      } else {
        setError(data.error || 'Error al cargar proyectos');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProyectos(); }, []);

  useEffect(() => {
    if (searchTerm) {
      setProyectosFiltrados(proyectos.filter(p => 
        p.denominacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.idRegistro.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setProyectosFiltrados(proyectos);
    }
  }, [searchTerm, proyectos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/proyectos/${editing.idRegistro}` : '/api/proyectos';
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, rowIndex: editing.rowIndex } : { ...form, fechaHora: new Date().toISOString() };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditing(null); setForm({ idRegistro: '', denominacion: '', ubicacion: '', logo: '' });
      fetchProyectos();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (proyecto: Proyecto) => {
    if (!confirm(`Eliminar proyecto "${proyecto.denominacion}"?`)) return;
    try {
      const response = await fetch(`/api/proyectos/${proyecto.idRegistro}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchProyectos();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (proyecto: Proyecto) => {
    setEditing(proyecto);
    setForm({ idRegistro: proyecto.idRegistro, denominacion: proyecto.denominacion, ubicacion: proyecto.ubicacion, logo: proyecto.logo });
    setShowForm(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground mt-1">{proyectos.length} proyectos registrados</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ idRegistro: '', denominacion: '', ubicacion: '', logo: '' }); }}
          className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <Plus size={18} /> <span className="relative z-10">Nuevo Proyecto</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Buscar proyectos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm input-glow focus:outline-none focus:border-primary/50"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm flex items-center gap-2 fade-in">
          <AlertTriangle size={16} /> <strong>Error:</strong> {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">{editing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
            <button onClick={() => setShowForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">ID Registro *</label>
                <input type="text" value={form.idRegistro} onChange={(e) => setForm({...form, idRegistro: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required disabled={!!editing} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Denominacion *</label>
                <input type="text" value={form.denominacion} onChange={(e) => setForm({...form, denominacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ubicacion</label>
                <input type="text" value={form.ubicacion} onChange={(e) => setForm({...form, ubicacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Logo URL</label>
                <input type="text" value={form.logo} onChange={(e) => setForm({...form, logo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                <Save size={18} /> <span className="relative z-10">{editing ? 'Guardar Cambios' : 'Crear Proyecto'}</span>
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card p-5 h-40">
              <div className="skeleton h-12 w-12 rounded-xl mb-4" />
              <div className="skeleton h-5 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : proyectosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground fade-in">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay proyectos registrados</p>
          <p className="text-sm mt-1">Crea tu primer proyecto para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proyectosFiltrados.map((proyecto, index) => (
            <div 
              key={proyecto.idRegistro} 
              onClick={() => onSelectProyecto(proyecto)}
              className="glass-card p-5 card-hover cursor-pointer group fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {proyecto.logo ? (
                    <img src={proyecto.logo} alt="" className="w-14 h-14 rounded-xl object-cover shadow-md" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Building2 size={28} className="text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{proyecto.denominacion}</h3>
                    <p className="text-xs text-muted-foreground mt-1">ID: {proyecto.idRegistro}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => startEdit(proyecto)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(proyecto)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </div>
              
              {proyecto.ubicacion && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <MapPin size={14} className="text-primary" />
                  {proyecto.ubicacion}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(proyecto.fechaHora).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  Ver detalles <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
