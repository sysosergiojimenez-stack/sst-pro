import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, X, Save, FileText, Brain, Filter, Search } from 'lucide-react';

interface Proyecto {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
}

interface Empleado {
  rowIndex: number;
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  obra: string;
  empresa: string;
  telefonoCelular: string;
  email: string;
  scanDocumentos?: string;
}

interface EmpleadosPorProyectoProps {
  proyecto: Proyecto;
}

export default function EmpleadosPorProyecto({ proyecto }: EmpleadosPorProyectoProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGeminiForm, setShowGeminiForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [form, setForm] = useState({ nroDocumento: '', nombres: '', apellidos: '', cargo: '', empresa: '', telefonoCelular: '', email: '' });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [datosExtraidos, setDatosExtraidos] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  useEffect(() => { fetchData(); }, [proyecto.denominacion]);

  useEffect(() => {
    let filtrados = [...empleados];
    
    // Filter by empresa
    if (empresaFiltro) {
      filtrados = filtrados.filter(e => e.empresa === empresaFiltro);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(e => 
        e.nombres.toLowerCase().includes(term) ||
        e.apellidos.toLowerCase().includes(term) ||
        e.nroDocumento.toLowerCase().includes(term) ||
        e.cargo.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term)
      );
    }
    
    setEmpleadosFiltrados(filtrados);
  }, [empresaFiltro, searchTerm, empleados]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/empleados?obra=${encodeURIComponent(proyecto.denominacion)}`);
      const data = await response.json();
      if (data.success) {
        setEmpleados(data.data);
        const uniqueEmpresas = [...new Set(data.data.map((e: Empleado) => e.empresa).filter(Boolean))];
        setEmpresas(uniqueEmpresas);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEmpleado ? `/api/empleados/${editingEmpleado.rowIndex}` : '/api/empleados';
      const method = editingEmpleado ? 'PUT' : 'POST';
      const body = editingEmpleado 
        ? { ...form, obra: proyecto.denominacion, rowIndex: editingEmpleado.rowIndex }
        : { ...form, obra: proyecto.denominacion };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditingEmpleado(null); setForm({ nroDocumento: '', nombres: '', apellidos: '', cargo: '', empresa: '', telefonoCelular: '', email: '' });
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleDelete = async (empleado: Empleado) => {
    if (!confirm(`Eliminar empleado "${empleado.nombres} ${empleado.apellidos}"?`)) return;
    try {
      const response = await fetch(`/api/empleados/${empleado.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const startEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado);
    setForm({ nroDocumento: empleado.nroDocumento, nombres: empleado.nombres, apellidos: empleado.apellidos, cargo: empleado.cargo, empresa: empleado.empresa, telefonoCelular: empleado.telefonoCelular, email: empleado.email });
    setShowForm(true);
  };

  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;
    setGeminiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdfBase64: base64, mimeType: pdfFile.type }) });
      const data = await response.json();
      if (data.success) { setDatosExtraidos(data.data); } else { alert('Error: ' + data.error); }
      setGeminiLoading(false);
    };
    reader.readAsDataURL(pdfFile);
  };

  const handleConfirmGemini = async () => {
    if (!datosExtraidos) return;
    try {
      const body = { nroDocumento: datosExtraidos.nroDocumento || '', nombres: datosExtraidos.nombres || '', apellidos: datosExtraidos.apellidos || '', cargo: datosExtraidos.cargo || '', obra: proyecto.denominacion, empresa: datosExtraidos.empresa || '', telefonoCelular: datosExtraidos.telefono || '', email: datosExtraidos.email || '', scanDocumentos: datosExtraidos.scanDocumentos || '' };
      const response = await fetch('/api/empleados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowGeminiForm(false); setDatosExtraidos(null); setPdfFile(null); fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-primary" size={24} />
            Empleados del Proyecto
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{empleados.length} empleados registrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowForm(true); setEditingEmpleado(null); setForm({ nroDocumento: '', nombres: '', apellidos: '', cargo: '', empresa: '', telefonoCelular: '', email: '' }); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Plus size={18} /> Agregar Manual
          </button>
          <button onClick={() => { setShowGeminiForm(true); setDatosExtraidos(null); setPdfFile(null); }} className="bg-secondary border border-border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary/80 transition-colors">
            <Brain size={18} /> Agregar con IA
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, documento, cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary text-muted-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {empresas.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Empresa:</span>
            <button onClick={() => setEmpresaFiltro('')} className={`px-3 py-1.5 rounded-full text-xs transition-colors ${!empresaFiltro ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>Todas</button>
            {empresas.map(empresa => (
              <button key={empresa} onClick={() => setEmpresaFiltro(empresa)} className={`px-3 py-1.5 rounded-full text-xs transition-colors ${empresaFiltro === empresa ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>{empresa}</button>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Nro. Documento *</label><input type="text" value={form.nroDocumento} onChange={(e) => setForm({...form, nroDocumento: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required disabled={!!editingEmpleado} /></div>
              <div><label className="block text-sm font-medium mb-1">Nombres *</label><input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Apellidos *</label><input type="text" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
              <div><label className="block text-sm font-medium mb-1">Cargo</label><input type="text" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Empresa</label><input type="text" value={form.empresa} onChange={(e) => setForm({...form, empresa: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Telefono</label><input type="text" value={form.telefonoCelular} onChange={(e) => setForm({...form, telefonoCelular: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"><Save size={18} /> {editingEmpleado ? 'Guardar Cambios' : 'Crear Empleado'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showGeminiForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Agregar Empleado con IA</h3>
            <button onClick={() => setShowGeminiForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          {!datosExtraidos ? (
            <form onSubmit={handleGeminiSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Subir PDF de ficha</label><input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <button type="submit" disabled={!pdfFile || geminiLoading} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"><Brain size={18} /> {geminiLoading ? 'Procesando...' : 'Procesar con IA'}</button>
            </form>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium">Datos extraidos:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Documento:</strong> {datosExtraidos.nroDocumento}</div>
                <div><strong>Nombres:</strong> {datosExtraidos.nombres}</div>
                <div><strong>Apellidos:</strong> {datosExtraidos.apellidos}</div>
                <div><strong>Cargo:</strong> {datosExtraidos.cargo}</div>
                <div><strong>Empresa:</strong> {datosExtraidos.empresa}</div>
                <div><strong>Telefono:</strong> {datosExtraidos.telefono}</div>
                <div><strong>Email:</strong> {datosExtraidos.email}</div>
                <div><strong>Obra:</strong> {proyecto.denominacion}</div>
              </div>
              {datosExtraidos.scanDocumentos && <a href={datosExtraidos.scanDocumentos} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm"><FileText size={14} className="inline mr-1" /> Ver PDF procesado</a>}
              <div className="flex gap-2">
                <button onClick={handleConfirmGemini} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"><Save size={18} /> Confirmar y Guardar</button>
                <button onClick={() => setDatosExtraidos(null)} className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80">Subir otro PDF</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : empleadosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground fade-in">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">
            {searchTerm || empresaFiltro ? 'No se encontraron empleados' : 'No hay empleados asignados'}
          </p>
          <p className="text-sm mt-1">
            {searchTerm || empresaFiltro ? 'Intenta con otros filtros o terminos de busqueda' : 'Agrega empleados a este proyecto'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Documento</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nombres</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Apellidos</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cargo</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Empresa</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contacto</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleadosFiltrados.map((emp) => (
                <tr key={`${emp.rowIndex}-${emp.nroDocumento}`} className="border-b border-border hover:bg-secondary/50">
                  <td className="py-3 px-4 text-sm">{emp.nroDocumento}</td>
                  <td className="py-3 px-4 text-sm">{emp.nombres}</td>
                  <td className="py-3 px-4 text-sm">{emp.apellidos}</td>
                  <td className="py-3 px-4 text-sm">{emp.cargo}</td>
                  <td className="py-3 px-4 text-sm">{emp.empresa}</td>
                  <td className="py-3 px-4 text-sm">{emp.telefonoCelular && <div>{emp.telefonoCelular}</div>}{emp.email && <div className="text-xs text-muted-foreground">{emp.email}</div>}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(emp)} className="p-1 text-muted-foreground hover:text-primary transition-colors" title="Editar"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(emp)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                      {emp.scanDocumentos && <a href={emp.scanDocumentos} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-primary transition-colors" title="Ver PDF"><FileText size={16} /></a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
