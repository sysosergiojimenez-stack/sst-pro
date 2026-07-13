import React, { useState, useMemo, useRef } from 'react';
import { trpc } from '../lib/trpc';
import { Building2, Users, Search, X, Plus, UserPlus, FileText, Sparkles, Loader2, ExternalLink, Pencil, Trash2 } from 'lucide-react';

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
        empleado.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.nroDocumento.includes(searchTerm);
      return matchEmpresa && matchSearch;
    });
  }, [data, empresaFilter, searchTerm]);

  const statsPorEmpresa = useMemo(() => {
    if (!data) return [];
    const stats = empresas.map(emp => ({
      empresa: emp,
      count: data.filter(e => e.empresa === emp).length,
    }));
    return stats.sort((a, b) => b.count - a.count);
  }, [data, empresas]);

  if (isLoading) return <div className="text-center py-20">Cargando empleados...</div>;
  if (error) return <div className="text-center py-20 text-red-400">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users size={24} className="text-primary" />
          Empleados ({empleadosFiltrados.length} de {data?.length || 0})
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setShowGeminiForm(!showGeminiForm); setShowForm(false); setEditingEmpleado(null); setDeletingEmpleado(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            <Sparkles size={18} />
            {showGeminiForm ? 'Cancelar' : 'IA - PDF'}
          </button>
          <button 
            onClick={() => { setShowForm(!showForm); setShowGeminiForm(false); setEditingEmpleado(null); setDeletingEmpleado(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancelar' : 'Manual'}
          </button>
        </div>
      </div>

      {showGeminiForm && <NuevoEmpleadoGeminiForm onSuccess={() => { setShowGeminiForm(false); refetch(); }} empresasExistentes={empresas} />}
      {showForm && <NuevoEmpleadoForm onSuccess={() => { setShowForm(false); refetch(); }} empresasExistentes={empresas} />}
      {editingEmpleado && <EditarEmpleadoForm 
        empleado={editingEmpleado} 
        onSuccess={() => { 
          setEditingEmpleado(null); 
          refetch(); 
        }} 
        empresasExistentes={empresas} 
      />}
      {deletingEmpleado && <ConfirmarEliminarModal 
        empleado={deletingEmpleado} 
        onSuccess={() => { 
          console.log('✅ onSuccess llamado, haciendo refetch...');
          setDeletingEmpleado(null); 
          refetch(); 
        }} 
        onCancel={() => setDeletingEmpleado(null)}
      />}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <button onClick={() => setEmpresaFilter('')} className={`p-3 rounded-xl border transition-all ${!empresaFilter ? 'bg-primary/20 border-primary text-primary' : 'bg-card border-border hover:bg-secondary'}`}>
          <div className="text-2xl font-bold">{data?.length || 0}</div>
          <div className="text-xs">Todas</div>
        </button>
        {statsPorEmpresa.map(stat => (
          <button key={stat.empresa} onClick={() => setEmpresaFilter(stat.empresa === empresaFilter ? '' : stat.empresa)} className={`p-3 rounded-xl border transition-all text-left ${empresaFilter === stat.empresa ? 'bg-primary/20 border-primary text-primary' : 'bg-card border-border hover:bg-secondary'}`}>
            <div className="flex items-center gap-2 mb-1"><Building2 size={14} /><span className="text-xs font-medium truncate">{stat.empresa}</span></div>
            <div className="text-2xl font-bold">{stat.count}</div>
            <div className="text-xs text-muted-foreground">empleados</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, cargo o documento..." className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
        </div>
        {empresaFilter && <div className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-2 rounded-lg text-sm"><Building2 size={14} />{empresaFilter}<button onClick={() => setEmpresaFilter('')} className="hover:text-primary-foreground"><X size={14} /></button></div>}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Documento</th>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Cargo</th>
                <th className="text-left px-4 py-3 font-medium">Obra</th>
                <th className="text-left px-4 py-3 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 font-medium">Contacto</th>
                <th className="text-left px-4 py-3 font-medium">PDF</th>
                <th className="text-left px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {empleadosFiltrados.map((e, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs">{e.nroDocumento}</td>
                  <td className="px-4 py-3 font-medium">{e.nombres} {e.apellidos}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-secondary rounded-md text-xs">{e.cargo}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{e.obra}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">{e.empresa}</span></td>
                  <td className="px-4 py-3"><div className="text-xs text-muted-foreground">{e.telefonoCelular}</div><div className="text-xs">{e.email}</div></td>
                  <td className="px-4 py-3">
                    {e.scanDocumentos ? (
                      <a href={e.scanDocumentos} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                        <FileText size={14} /> Ver <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingEmpleado(e); setShowForm(false); setShowGeminiForm(false); setDeletingEmpleado(null); }}
                        className="p-2 rounded-lg hover:bg-primary/20 text-primary"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => { setDeletingEmpleado(e); setEditingEmpleado(null); setShowForm(false); setShowGeminiForm(false); }}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {empleadosFiltrados.length === 0 && <div className="text-center py-12 text-muted-foreground">{data && data.length > 0 ? 'No se encontraron empleados.' : 'No hay empleados registrados.'}</div>}
      </div>
    </div>
  );
}

// ========== MODAL CONFIRMAR ELIMINAR ==========
function ConfirmarEliminarModal({ empleado, onSuccess, onCancel }: any) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    console.log('🗑️ Iniciando eliminación de:', empleado.nroDocumento);
    setIsDeleting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/empleados/${encodeURIComponent(empleado.nroDocumento)}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      console.log('📡 Respuesta del servidor:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar');
      }
      
      console.log('✅ Eliminación exitosa, llamando onSuccess...');
      onSuccess();
    } catch (err: any) {
      console.error('❌ Error en eliminación:', err.message);
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-red-400">
          <Trash2 size={20} />
          ¿Eliminar Empleado?
        </h3>
        
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Empleado:</strong> {empleado.nombres} {empleado.apellidos}
          </p>
          <p className="text-sm text-muted-foreground">
            Documento: {empleado.nroDocumento}
          </p>
          <p className="text-sm text-red-400 mt-2">
            ⚠️ Esta acción no se puede deshacer. El empleado será eliminado permanentemente de la base de datos.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-lg text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex gap-2">
          <button 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="flex-1 bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : '🗑️ Sí, Eliminar'}
          </button>
          <button 
            onClick={onCancel} 
            disabled={isDeleting}
            className="px-4 py-3 bg-secondary border border-border rounded-lg hover:bg-secondary/80 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== FORMULARIO EDITAR EMPLEADO ==========
function EditarEmpleadoForm({ empleado, onSuccess, empresasExistentes }: any) {
  const [form, setForm] = useState({
    nombres: empleado.nombres || '',
    apellidos: empleado.apellidos || '',
    cargo: empleado.cargo || '',
    obra: empleado.obra || '',
    empresa: empleado.empresa || '',
    telefonoCelular: empleado.telefonoCelular || '',
    email: empleado.email || '',
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
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar');
      }
      
      onSuccess();
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 mb-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Pencil size={20} className="text-primary" />
        Editar Empleado: {empleado.nombres} {empleado.apellidos}
      </h3>
      <p className="text-xs text-muted-foreground">Documento: {empleado.nroDocumento}</p>
      
      {error && <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-lg text-sm"><strong>Error:</strong> {error}</div>}
      
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Nombres</label><input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
        <div><label className="block text-sm font-medium mb-1">Apellidos</label><input type="text" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Cargo</label><input type="text" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
        <div><label className="block text-sm font-medium mb-1">Obra / Proyecto</label><input type="text" value={form.obra} onChange={(e) => setForm({...form, obra: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Empresa</label>
          {!nuevaEmpresa ? (
            <select value={form.empresa} onChange={(e) => { if (e.target.value === '__nueva__') { setNuevaEmpresa(true); setForm({...form, empresa: ''}); } else { setForm({...form, empresa: e.target.value}); } }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar...</option>
              {empresasExistentes.map((emp: string) => (<option key={emp} value={emp}>{emp}</option>))}
              <option value="__nueva__">+ Nueva empresa</option>
            </select>
          ) : (
            <div className="flex gap-2"><input type="text" value={form.empresa} onChange={(e) => setForm({...form, empresa: e.target.value})} className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="Nombre nueva empresa" required /><button type="button" onClick={() => setNuevaEmpresa(false)} className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm">Cancelar</button></div>
          )}
        </div>
        <div><label className="block text-sm font-medium mb-1">Teléfono Celular</label><input type="text" value={form.telefonoCelular} onChange={(e) => setForm({...form, telefonoCelular: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isSaving} className="flex-1 bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
          {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
        <button type="button" onClick={onSuccess} className="px-4 py-3 bg-secondary border border-border rounded-lg hover:bg-secondary/80 text-sm">Cancelar</button>
      </div>
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
    if (!datosExtraidos) return;
    setIsSaving(true);
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
          scanDocumentos: datosExtraidos.scanDocumentos || '',
        }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      onSuccess();
    } catch (err: any) { setError(err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="bg-card border border-purple-500/30 rounded-xl p-6 space-y-4 mb-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-400"><Sparkles size={20} />Nuevo Empleado con IA</h3>
      <p className="text-sm text-muted-foreground">Sube una ficha o cédula en PDF.</p>
      
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-secondary/30 transition-colors">
        <input type="file" ref={fileInputRef} accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
        {!file ? (
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 mx-auto text-muted-foreground hover:text-foreground">
            <FileText size={48} className="text-purple-400" /><span className="text-sm">Click para seleccionar PDF</span>
          </button>
        ) : (
          <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center gap-3"><FileText size={24} className="text-purple-400" /><div className="text-left"><div className="text-sm font-medium">{file.name}</div><div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div></div></div>
            <button onClick={() => { setFile(null); setDatosExtraidos(null); }} className="text-muted-foreground hover:text-red-400"><X size={18} /></button>
          </div>
        )}
      </div>

      {file && !datosExtraidos && (
        <button onClick={handleProcess} disabled={isProcessing} className="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium py-3 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {isProcessing ? <><Loader2 size={18} className="animate-spin" />Procesando...</> : <><Sparkles size={18} />Extraer datos con IA</>}
        </button>
      )}

      {error && <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-4 rounded-lg text-sm"><strong>Error:</strong> {error}</div>}

      {datosExtraidos && (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
            <h4 className="font-medium text-green-400 mb-3 flex items-center gap-2"><Sparkles size={16} />Datos extraídos</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Documento:</span><span className="ml-2 font-medium">{datosExtraidos.nroDocumento || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Nombres:</span><span className="ml-2 font-medium">{datosExtraidos.nombres || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Apellidos:</span><span className="ml-2 font-medium">{datosExtraidos.apellidos || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Cargo:</span><span className="ml-2 font-medium">{datosExtraidos.cargo || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Empresa:</span><span className="ml-2 font-medium">{datosExtraidos.empresa || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Obra:</span><span className="ml-2 font-medium">{datosExtraidos.obra || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Teléfono:</span><span className="ml-2 font-medium">{datosExtraidos.telefono || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Email:</span><span className="ml-2 font-medium">{datosExtraidos.email || 'N/A'}</span></div>
            </div>
            {datosExtraidos.scanDocumentos && (
              <div className="mt-3 pt-3 border-t border-green-500/20">
                <span className="text-muted-foreground">PDF guardado:</span>
                <a href={datosExtraidos.scanDocumentos} target="_blank" rel="noopener noreferrer" className="ml-2 text-purple-400 hover:text-purple-300 flex items-center gap-1 inline-flex">
                  <FileText size={14} /> Ver en GCS <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleConfirm} disabled={isSaving} className="flex-1 bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">{isSaving ? 'Guardando...' : '✅ Confirmar y Guardar'}</button>
            <button onClick={() => { setDatosExtraidos(null); setFile(null); }} className="px-4 py-3 bg-secondary border border-border rounded-lg hover:bg-secondary/80 text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== FORMULARIO MANUAL ==========
function NuevoEmpleadoForm({ onSuccess, empresasExistentes }: any) {
  const [form, setForm] = useState({ nroDocumento: '', nombres: '', apellidos: '', cargo: '', obra: '', empresa: '', telefonoCelular: '', email: '' });
  const [nuevaEmpresa, setNuevaEmpresa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setError('');
    try {
      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      onSuccess();
    } catch (err: any) { setError(err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 mb-6">
      <h3 className="text-lg font-semibold flex items-center gap-2"><UserPlus size={20} className="text-primary" />Nuevo Empleado Manual</h3>
      {error && <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-lg text-sm"><strong>Error:</strong> {error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Nro. Documento *</label><input type="text" value={form.nroDocumento} onChange={(e) => setForm({...form, nroDocumento: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
        <div><label className="block text-sm font-medium mb-1">Empresa *</label>
          {!nuevaEmpresa ? (
            <select value={form.empresa} onChange={(e) => { if (e.target.value === '__nueva__') { setNuevaEmpresa(true); setForm({...form, empresa: ''}); } else { setForm({...form, empresa: e.target.value}); } }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar...</option>
              {empresasExistentes.map((emp: string) => (<option key={emp} value={emp}>{emp}</option>))}
              <option value="__nueva__">+ Nueva empresa</option>
            </select>
          ) : (
            <div className="flex gap-2"><input type="text" value={form.empresa} onChange={(e) => setForm({...form, empresa: e.target.value})} className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="Nombre nueva empresa" required /><button type="button" onClick={() => setNuevaEmpresa(false)} className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm">Cancelar</button></div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Nombres *</label><input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
        <div><label className="block text-sm font-medium mb-1">Apellidos *</label><input type="text" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Cargo *</label><input type="text" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
        <div><label className="block text-sm font-medium mb-1">Obra / Proyecto *</label><input type="text" value={form.obra} onChange={(e) => setForm({...form, obra: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium mb-1">Teléfono Celular</label><input type="text" value={form.telefonoCelular} onChange={(e) => setForm({...form, telefonoCelular: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <button type="submit" disabled={isSaving} className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">{isSaving ? 'Guardando...' : 'Guardar Empleado'}</button>
    </form>
  );
}
