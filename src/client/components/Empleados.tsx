import React, { useState, useMemo, useRef } from 'react';
import { trpc } from '../lib/trpc';
import { Building2, Users, Search, X, Plus, UserPlus, FileText, Sparkles, Loader2, ExternalLink, Pencil, Trash2, Phone, Mail, HardHat, Calendar, HeartPulse, Droplets, ShieldCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function Empleados() {
  const { data, isLoading, error, refetch } = trpc.empleados.list.useQuery();
  const [empresaFilter, setEmpresaFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showGeminiForm, setShowGeminiForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<any>(null);
  const [deletingEmpleado, setDeletingEmpleado] = useState<any>(null);

  const empresas = useMemo(() => {
    if (!data) return [];
    const unique = [...new Set(data.map(e => e.empresa).filter(Boolean))];
    return unique.sort();
  }, [data]);

  const empleadosFiltrados = useMemo(() => {
    if (!data) return [];
    return data.filter(empleado => {
      const matchEmpresa = !empresaFilter || empleado.empresa === empresaFilter;
      const matchSearch = !searchTerm || 
        empleado.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.nroDocumento?.includes(searchTerm) ||
        empleado.obra?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchEmpresa && matchSearch;
    });
  }, [data, empresaFilter, searchTerm]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, activos: 0, inactivos: 0, conPdf: 0, porEmpresa: [] };
    const porEmpresa = [...new Set(data.map(e => e.empresa).filter(Boolean))]
      .map(emp => ({ empresa: emp, count: data.filter(e => e.empresa === emp).length }))
      .sort((a, b) => b.count - a.count);
    return {
      total: data.length,
      activos: data.filter(e => e.estado !== 'Inactivo').length,
      inactivos: data.filter(e => e.estado === 'Inactivo').length,
      conPdf: data.filter(e => e.scanDocumentos).length,
      porEmpresa,
    };
  }, [data]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Cargando empleados...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-red-400 font-medium">Error al cargar empleados</p>
      <p className="text-muted-foreground text-sm">{error.message}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} className="text-primary" />
            Empleados
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.activos} activos · {stats.inactivos} inactivos · {stats.total} total
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setShowGeminiForm(!showGeminiForm); setShowForm(false); setEditingEmpleado(null); setDeletingEmpleado(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/15 text-purple-400 border border-purple-500/25 rounded-xl hover:bg-purple-500/25 transition-all duration-200 text-sm font-medium"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">{showGeminiForm ? 'Cancelar' : 'IA - PDF'}</span>
          </button>
          <button 
            onClick={() => { setShowForm(!showForm); setShowGeminiForm(false); setEditingEmpleado(null); setDeletingEmpleado(null); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Nuevo'}</span>
          </button>
        </div>
      </div>

      {showGeminiForm && <NuevoEmpleadoGeminiForm onSuccess={() => { setShowGeminiForm(false); refetch(); }} empresasExistentes={empresas} />}
      {showForm && <NuevoEmpleadoForm onSuccess={() => { setShowForm(false); refetch(); }} empresasExistentes={empresas} />}
      {editingEmpleado && <EditarEmpleadoForm 
        empleado={editingEmpleado} 
        onSuccess={() => { setEditingEmpleado(null); refetch(); }} 
        empresasExistentes={empresas} 
      />}
      {deletingEmpleado && <ConfirmarEliminarModal 
        empleado={deletingEmpleado} 
        onSuccess={() => { setDeletingEmpleado(null); refetch(); }} 
        onCancel={() => setDeletingEmpleado(null)}
      />}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setEmpresaFilter('')} className={`stat-card ${!empresaFilter ? 'stat-card-active' : 'stat-card-inactive'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <Users size={16} className="text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </button>

        <button className="stat-card stat-card-inactive">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Activos</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.activos}</div>
        </button>

        <button className="stat-card stat-card-inactive">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
              <XCircle size={16} className="text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Inactivos</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.inactivos}</div>
        </button>

        <button className="stat-card stat-card-inactive">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
              <FileText size={16} className="text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Con PDF</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats.conPdf}</div>
        </button>
      </div>

      {/* Filtros por empresa */}
      {stats.porEmpresa.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setEmpresaFilter('')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${!empresaFilter ? 'bg-primary/15 text-primary border border-primary/25' : 'bg-secondary border border-border hover:bg-secondary/80 text-muted-foreground'}`}
          >
            Todas
          </button>
          {stats.porEmpresa.map(stat => (
            <button 
              key={stat.empresa} 
              onClick={() => setEmpresaFilter(empresaFilter === stat.empresa ? '' : stat.empresa)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${empresaFilter === stat.empresa ? 'bg-primary/15 text-primary border border-primary/25' : 'bg-secondary border border-border hover:bg-secondary/80 text-muted-foreground'}`}
            >
              <Building2 size={12} />
              {stat.empresa}
              <span className="opacity-60">({stat.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Buscar por nombre, cargo, documento o obra..." 
            className="input-modern pl-10 pr-10"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
        {empresaFilter && (
          <div className="flex items-center gap-2 bg-primary/15 text-primary px-3 py-2 rounded-lg text-sm border border-primary/25">
            <Building2 size={14} />
            <span className="hidden sm:inline">{empresaFilter}</span>
            <button onClick={() => setEmpresaFilter('')} className="hover:text-primary-foreground ml-1">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto table-responsive">
          <table className="w-full text-sm block sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="bg-secondary/70 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Documento</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Empleado</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Cargo</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Proyecto</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Contacto</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Docs</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border block sm:table-row-group">
              {empleadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Users size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No se encontraron empleados</p>
                    <p className="text-xs mt-1">Intenta con otra búsqueda o filtro</p>
                  </td>
                </tr>
              ) : (
                empleadosFiltrados.map((e, i) => (
                  <tr key={i} className="hover:bg-secondary/40 transition-colors group animate-fade-in block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 p-2 sm:p-0" style={{animationDelay: `${i * 0.03}s`}}>
                    <td className="px-4 py-3 block sm:table-cell">
                      <span className="font-mono text-xs bg-secondary px-2 py-1 rounded-md">{e.nroDocumento}</span>
                    </td>
                    <td className="px-4 py-3 block sm:table-cell">
                      <div className="font-medium text-sm">{e.nombres} {e.apellidos}</div>
                      {e.email && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail size={10} />{e.email}</div>}
                    </td>
                    <td className="px-4 py-3 block sm:table-cell">
                      <span className="badge badge-muted"><HardHat size={10} />{e.cargo}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs block sm:table-cell"><span className="text-muted-foreground/60">Proyecto: </span>{e.obra || '-'}</td>
                    <td className="px-4 py-3 block sm:table-cell">
                      <span className="badge badge-info"><Building2 size={10} />{e.empresa}</span>
                    </td>
                    <td className="px-4 py-3 block sm:table-cell">
                      {e.estado === 'Inactivo' ? (
                        <span className="badge badge-danger"><XCircle size={10} />Inactivo</span>
                      ) : (
                        <span className="badge badge-success"><CheckCircle2 size={10} />Activo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 block sm:table-cell">
                      {e.telefonoCelular && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone size={10} />{e.telefonoCelular}
                        </div>
                      )}
                      {e.contactoEmergencia && (
                        <div className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                          <HeartPulse size={10} />{e.contactoEmergencia}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 block sm:table-cell">
                      {e.scanDocumentos ? (
                        <a href={e.scanDocumentos} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg hover:bg-purple-500/20 transition-colors">
                          <FileText size={12} /> Ver
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 block sm:table-cell">
                      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                        <button 
                          onClick={() => { setEditingEmpleado(e); setShowForm(false); setShowGeminiForm(false); setDeletingEmpleado(null); }}
                          className="p-3 sm:p-2 rounded-lg hover:bg-primary/15 text-primary transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => { setDeletingEmpleado(e); setEditingEmpleado(null); setShowForm(false); setShowGeminiForm(false); }}
                          className="p-3 sm:p-2 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {empleadosFiltrados.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-secondary/30 text-xs text-muted-foreground flex items-center justify-between">
            <span>Mostrando {empleadosFiltrados.length} de {data?.length || 0} empleados</span>
            {searchTerm && <span>Filtrado por: &quot;{searchTerm}&quot;</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== FORMULARIO EDITAR ==========
function EditarEmpleadoForm({ empleado, onSuccess, empresasExistentes }: any) {
  const [form, setForm] = useState({
    nombres: empleado.nombres || '',
    apellidos: empleado.apellidos || '',
    cargo: empleado.cargo || '',
    obra: empleado.obra || '',
    empresa: empleado.empresa || '',
    telefonoCelular: empleado.telefonoCelular || '',
    email: empleado.email || '',
    estado: empleado.estado || 'Activo',
    fechaIngreso: empleado.fechaIngreso || '',
    eps: empleado.eps || '',
    arl: empleado.arl || '',
    contactoEmergencia: empleado.contactoEmergencia || '',
    tipoSangre: empleado.tipoSangre || '',
    direccion: empleado.direccion || '',
  });

  const [nuevaEmpresa, setNuevaEmpresa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); 
    setError('');
    try {
      const response = await fetch(`/api/empleados/${encodeURIComponent(empleado.nroDocumento)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al actualizar');
      onSuccess();
    } catch (err: any) { setError(err.message); } 
    finally { setIsSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5 mb-6 animate-scale-in shadow-lg shadow-black/5">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Pencil size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Editar Empleado</h3>
          <p className="text-xs text-muted-foreground">{empleado.nombres} {empleado.apellidos} · <span className="font-mono">{empleado.nroDocumento}</span></p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Datos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nombres *</label>
          <input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} className="input-modern" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Apellidos *</label>
          <input type="text" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} className="input-modern" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Estado</label>
          <select value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})} className="select-modern">
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="En incapacidad">En incapacidad</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cargo *</label>
          <input type="text" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} className="input-modern" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Obra / Proyecto *</label>
          <input type="text" value={form.obra} onChange={(e) => setForm({...form, obra: e.target.value})} className="input-modern" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Fecha de Ingreso</label>
          <input type="date" value={form.fechaIngreso} onChange={(e) => setForm({...form, fechaIngreso: e.target.value})} className="input-modern" />
        </div>
      </div>

      {/* Empresa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Empresa *</label>
          {!nuevaEmpresa ? (
            <select value={form.empresa} onChange={(e) => { if (e.target.value === '__nueva__') { setNuevaEmpresa(true); setForm({...form, empresa: ''}); } else { setForm({...form, empresa: e.target.value}); } }} className="select-modern" required>
              <option value="">Seleccionar...</option>
              {empresasExistentes.map((emp: string) => (<option key={emp} value={emp}>{emp}</option>))}
              <option value="__nueva__">+ Nueva empresa</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input type="text" value={form.empresa} onChange={(e) => setForm({...form, empresa: e.target.value})} className="input-modern flex-1" placeholder="Nombre nueva empresa" required />
              <button type="button" onClick={() => setNuevaEmpresa(false)} className="btn-secondary px-3">Cancelar</button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-modern" />
        </div>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Teléfono Celular</label>
          <input type="text" value={form.telefonoCelular} onChange={(e) => setForm({...form, telefonoCelular: e.target.value})} className="input-modern" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Contacto Emergencia</label>
          <input type="text" value={form.contactoEmergencia} onChange={(e) => setForm({...form, contactoEmergencia: e.target.value})} className="input-modern" placeholder="Nombre y teléfono" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tipo de Sangre</label>
          <select value={form.tipoSangre} onChange={(e) => setForm({...form, tipoSangre: e.target.value})} className="select-modern">
            <option value="">Seleccionar...</option>
            <option value="A+">A+</option><option value="A-">A-</option>
            <option value="B+">B+</option><option value="B-">B-</option>
            <option value="AB+">AB+</option><option value="AB-">AB-</option>
            <option value="O+">O+</option><option value="O-">O-</option>
          </select>
        </div>
      </div>

      {/* EPS / ARL */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">EPS</label>
          <input type="text" value={form.eps} onChange={(e) => setForm({...form, eps: e.target.value})} className="input-modern" placeholder="Nombre EPS" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">ARL</label>
          <input type="text" value={form.arl} onChange={(e) => setForm({...form, arl: e.target.value})} className="input-modern" placeholder="Nombre ARL" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Dirección</label>
          <input type="text" value={form.direccion} onChange={(e) => setForm({...form, direccion: e.target.value})} className="input-modern" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSaving} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {isSaving ? <><Loader2 size={18} className="animate-spin" />Guardando...</> : <><CheckCircle2 size={18} />Guardar Cambios</>}
        </button>
        <button type="button" onClick={onSuccess} className="btn-secondary px-6">Cancelar</button>
      </div>
    </form>
  );
}

// ========== FORMULARIO NUEVO EMPLEADO ==========
function NuevoEmpleadoForm({ onSuccess, empresasExistentes }: any) {
  const [form, setForm] = useState({
    nroDocumento: '', nombres: '', apellidos: '', cargo: '', obra: '',
    empresa: '', telefonoCelular: '', email: '', estado: 'Activo',
    fechaIngreso: '', eps: '', arl: '', contactoEmergencia: '',
    tipoSangre: '', direccion: ''
  });
  const [nuevaEmpresa, setNuevaEmpresa] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [error, setError] = useState('');
  const isSavingRef = useRef(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setPdfFile(selectedFile);
  };

  const subirPdf = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!pdfFile) { resolve(''); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const response = await fetch('/api/empleados/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64: base64,
              mimeType: pdfFile.type || 'application/pdf',
              nroDocumento: form.nroDocumento,
              nombres: form.nombres,
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Error al subir PDF');
          resolve(result.url);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
      reader.readAsDataURL(pdfFile);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true); setError('');
    try {
      let scanDocumentos = '';
      if (pdfFile) {
        setIsUploadingPdf(true);
        scanDocumentos = await subirPdf();
        setIsUploadingPdf(false);
      }
      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, scanDocumentos }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      onSuccess();
    } catch (err: any) { setError(err.message); }
    finally { isSavingRef.current = false; setIsSaving(false); setIsUploadingPdf(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5 mb-6 animate-scale-in shadow-lg shadow-black/5">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <UserPlus size={20} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Nuevo Empleado</h3>
          <p className="text-xs text-muted-foreground">Completa todos los campos obligatorios (*)</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Documento y Empresa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nro. Documento *</label>
          <input type="text" value={form.nroDocumento} onChange={(e) => setForm({...form, nroDocumento: e.target.value})} className="input-modern" required placeholder="CC / CE" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Empresa *</label>
          {!nuevaEmpresa ? (
            <select value={form.empresa} onChange={(e) => { if (e.target.value === '__nueva__') { setNuevaEmpresa(true); setForm({...form, empresa: ''}); } else { setForm({...form, empresa: e.target.value}); } }} className="select-modern" required>
              <option value="">Seleccionar...</option>
              {empresasExistentes.map((emp: string) => (<option key={emp} value={emp}>{emp}</option>))}
              <option value="__nueva__">+ Nueva empresa</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input type="text" value={form.empresa} onChange={(e) => setForm({...form, empresa: e.target.value})} className="input-modern flex-1" placeholder="Nueva empresa" required />
              <button type="button" onClick={() => setNuevaEmpresa(false)} className="btn-secondary px-3 text-xs">Cancelar</button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Estado</label>
          <select value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})} className="select-modern">
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="En incapacidad">En incapacidad</option>
          </select>
        </div>
      </div>

      {/* Nombres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nombres *</label>
          <input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} className="input-modern" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Apellidos *</label>
          <input type="text" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} className="input-modern" required />
        </div>
      </div>

      {/* Cargo, Obra, Fecha */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cargo *</label>
          <input type="text" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} className="input-modern" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Obra / Proyecto *</label>
          <input type="text" value={form.obra} onChange={(e) => setForm({...form, obra: e.target.value})} className="input-modern" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Fecha de Ingreso</label>
          <input type="date" value={form.fechaIngreso} onChange={(e) => setForm({...form, fechaIngreso: e.target.value})} className="input-modern" />
        </div>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Teléfono Celular</label>
          <input type="tel" value={form.telefonoCelular} onChange={(e) => setForm({...form, telefonoCelular: e.target.value})} className="input-modern" placeholder="300 000 0000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-modern" placeholder="correo@empresa.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Contacto Emergencia</label>
          <input type="text" value={form.contactoEmergencia} onChange={(e) => setForm({...form, contactoEmergencia: e.target.value})} className="input-modern" placeholder="Nombre - Teléfono" />
        </div>
      </div>

      {/* EPS, ARL, Tipo Sangre, Direccion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">EPS</label>
          <input type="text" value={form.eps} onChange={(e) => setForm({...form, eps: e.target.value})} className="input-modern" placeholder="Ej: Sura, Sanitas" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">ARL</label>
          <input type="text" value={form.arl} onChange={(e) => setForm({...form, arl: e.target.value})} className="input-modern" placeholder="Ej: Sura, Positiva" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tipo de Sangre</label>
          <select value={form.tipoSangre} onChange={(e) => setForm({...form, tipoSangre: e.target.value})} className="select-modern">
            <option value="">Seleccionar...</option>
            <option value="A+">A+</option><option value="A-">A-</option>
            <option value="B+">B+</option><option value="B-">B-</option>
            <option value="AB+">AB+</option><option value="AB-">AB-</option>
            <option value="O+">O+</option><option value="O-">O-</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Dirección</label>
          <input type="text" value={form.direccion} onChange={(e) => setForm({...form, direccion: e.target.value})} className="input-modern" placeholder="Dirección residencia" />
        </div>
      </div>

      {/* Adjuntar PDF */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Documento adjunto (PDF)</label>
        <input type="file" ref={pdfInputRef} accept=".pdf,application/pdf" onChange={handlePdfChange} className="hidden" />
        {!pdfFile ? (
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground hover:bg-secondary/30 transition-colors"
          >
            <FileText size={18} />
            Click para adjuntar PDF (opcional)
          </button>
        ) : (
          <div className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">{pdfFile.name}</div>
                <div className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button type="button" onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }} className="text-muted-foreground hover:text-red-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      <button type="submit" disabled={isSaving} className="btn-primary w-full flex items-center justify-center gap-2">
        {isUploadingPdf ? <><Loader2 size={18} className="animate-spin" />Subiendo PDF...</> : isSaving ? <><Loader2 size={18} className="animate-spin" />Guardando... por favor espera</> : <><CheckCircle2 size={18} />Guardar Empleado</>}
      </button>
    </form>
  );
}

// ========== FORMULARIO GEMINI AI ==========
function NuevoEmpleadoGeminiForm({ onSuccess, empresasExistentes }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [datosExtraidos, setDatosExtraidos] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) { setFile(selectedFile); setDatosExtraidos(null); setError(''); }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true); setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, mimeType: file.type }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error');
        setDatosExtraidos(result.data);
      } catch (err: any) { setError(err.message); }
      finally { setIsProcessing(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    if (!datosExtraidos || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nroDocumento: datosExtraidos.nroDocumento || '',
          nombres: datosExtraidos.nombres || '',
          apellidos: datosExtraidos.apellidos || '',
          cargo: datosExtraidos.cargo || '',
          obra: datosExtraidos.obra || '',
          empresa: datosExtraidos.empresa || '',
          telefonoCelular: datosExtraidos.telefono || '',
          email: datosExtraidos.email || '',
          fechaInicioContrato: datosExtraidos.fechaInicioContrato || '',
          scanDocumentos: datosExtraidos.scanDocumentos || '',
          estado: 'Activo',
        }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      onSuccess();
    } catch (err: any) { setError(err.message); }
    finally { isSavingRef.current = false; setIsSaving(false); }
  };

  return (
    <div className="bg-card border border-purple-500/20 rounded-2xl p-6 space-y-4 mb-6 animate-scale-in shadow-lg shadow-purple-500/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Sparkles size={20} className="text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-purple-400">Nuevo Empleado con IA</h3>
          <p className="text-xs text-muted-foreground">Sube una ficha o cédula en PDF para extraer datos automáticamente</p>
        </div>
      </div>

      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <input type="file" ref={fileInputRef} accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
        {!file ? (
          <div className="flex flex-col items-center gap-3">
            <FileText size={48} className="text-purple-400/60" />
            <span className="text-sm text-muted-foreground">Click para seleccionar PDF</span>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-purple-400" />
              <div className="text-left">
                <div className="text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); setDatosExtraidos(null); }} className="text-muted-foreground hover:text-red-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {file && !datosExtraidos && (
        <button onClick={handleProcess} disabled={isProcessing} className="w-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-medium py-3 rounded-xl hover:bg-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {isProcessing ? <><Loader2 size={18} className="animate-spin" />Procesando con IA...</> : <><Sparkles size={18} />Extraer datos</>}
        </button>
      )}

      {error && <div className="flex items-start gap-2 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}</div>}

      {datosExtraidos && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 mb-3 font-medium"><CheckCircle2 size={18} />Datos extraídos correctamente</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Documento:</span> <span className="font-medium">{datosExtraidos.nroDocumento || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{datosExtraidos.nombres} {datosExtraidos.apellidos}</span></div>
              <div><span className="text-muted-foreground">Cargo:</span> <span className="font-medium">{datosExtraidos.cargo || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Empresa:</span> <span className="font-medium">{datosExtraidos.empresa || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Fecha inicio contrato:</span> <span className="font-medium">{datosExtraidos.fechaInicioContrato || 'N/A'}</span></div>
            </div>
          </div>
          <button onClick={handleConfirm} disabled={isSaving} className="w-full btn-primary flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 shadow-purple-500/20">
            {isSaving ? <><Loader2 size={18} className="animate-spin" />Guardando... por favor espera</> : <><CheckCircle2 size={18} />Confirmar y Guardar</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ========== MODAL CONFIRMAR ELIMINAR ==========
function ConfirmarEliminarModal({ empleado, onSuccess, onCancel }: any) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/empleados/${encodeURIComponent(empleado.nroDocumento)}`, { method: 'DELETE' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al eliminar');
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Trash2 size={24} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Confirmar eliminación</h3>
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
          </div>
        </div>

        <p className="text-sm mb-2">
          ¿Estás seguro de eliminar a <strong>{empleado.nombres} {empleado.apellidos}</strong>?
        </p>
        <p className="text-xs text-muted-foreground font-mono mb-4">Documento: {empleado.nroDocumento}</p>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm mb-4">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleDelete} disabled={isDeleting} className="flex-1 bg-red-500 text-white font-medium py-2.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isDeleting ? <><Loader2 size={16} className="animate-spin" />Eliminando...</> : <><Trash2 size={16} />Sí, eliminar</>}
          </button>
          <button onClick={onCancel} className="btn-secondary px-6">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
