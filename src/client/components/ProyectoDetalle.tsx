import { useState, useEffect } from 'react';
import { ArrowLeft, Users, AlertTriangle, Building2, MapPin, Plus, Pencil, Trash2, X, Save, FileText, Brain } from 'lucide-react';

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

interface Incidente {
  id: string;
  fecha: string;
  reportadoPor: string;
  tipo: string;
  gravedad: string;
  area: string;
  descripcion: string;
  lesionado: string;
  nombreLesionado?: string;
  diasPerdidos?: string;
  causaInmediata?: string;
  causaBasica?: string;
  accionCorrectiva?: string;
  estado: string;
  evidenciaUrl?: string;
}

interface ProyectoDetalleProps {
  proyecto: Proyecto;
  onBack: () => void;
}

export default function ProyectoDetalle({ proyecto, onBack }: ProyectoDetalleProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'empleados' | 'incidentes'>('empleados');
  
  // CRUD states
  const [showForm, setShowForm] = useState(false);
  const [showGeminiForm, setShowGeminiForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [form, setForm] = useState({
    nroDocumento: '',
    nombres: '',
    apellidos: '',
    cargo: '',
    empresa: '',
    telefonoCelular: '',
    email: '',
  });
  
  // Gemini states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [datosExtraidos, setDatosExtraidos] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [proyecto.denominacion]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empResponse = await fetch(`/api/empleados?obra=${encodeURIComponent(proyecto.denominacion)}`);
      const empData = await empResponse.json();
      if (empData.success) {
        setEmpleados(empData.data);
      }

      const incResponse = await fetch(`/api/incidentes?area=${encodeURIComponent(proyecto.denominacion)}`);
      const incData = await incResponse.json();
      if (incData.success) {
        setIncidentes(incData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Functions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEmpleado ? `/api/empleados/${editingEmpleado.nroDocumento}` : '/api/empleados';
      const method = editingEmpleado ? 'PUT' : 'POST';
      
      const body = {
        ...form,
        obra: proyecto.denominacion,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error');
      }

      setShowForm(false);
      setEditingEmpleado(null);
      setForm({ nroDocumento: '', nombres: '', apellidos: '', cargo: '', empresa: '', telefonoCelular: '', email: '' });
      fetchData();
    } catch (err: any) {
      console.error('Error:', err.message);
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (empleado: Empleado) => {
    if (!confirm(`Eliminar empleado "${empleado.nombres} ${empleado.apellidos}"?`)) return;
    
    try {
      const response = await fetch(`/api/empleados/${empleado.nroDocumento}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error');
      }

      fetchData();
    } catch (err: any) {
      console.error('Error:', err.message);
      alert('Error: ' + err.message);
    }
  };

  const startEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado);
    setForm({
      nroDocumento: empleado.nroDocumento,
      nombres: empleado.nombres,
      apellidos: empleado.apellidos,
      cargo: empleado.cargo,
      empresa: empleado.empresa,
      telefonoCelular: empleado.telefonoCelular,
      email: empleado.email,
    });
    setShowForm(true);
  };

  // Gemini Functions
  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;
    
    setGeminiLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: base64,
            mimeType: pdfFile.type,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setDatosExtraidos(data.data);
        } else {
          alert('Error: ' + data.error);
        }
        setGeminiLoading(false);
      };
      reader.readAsDataURL(pdfFile);
    } catch (err: any) {
      console.error('Error:', err);
      setGeminiLoading(false);
    }
  };

  const handleConfirmGemini = async () => {
    if (!datosExtraidos) return;
    
    try {
      const body = {
        nroDocumento: datosExtraidos.nroDocumento || '',
        nombres: datosExtraidos.nombres || '',
        apellidos: datosExtraidos.apellidos || '',
        cargo: datosExtraidos.cargo || '',
        obra: proyecto.denominacion,
        empresa: datosExtraidos.empresa || '',
        telefonoCelular: datosExtraidos.telefono || '',
        email: datosExtraidos.email || '',
        scanDocumentos: datosExtraidos.scanDocumentos || '',
      };

      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error');
      }

      setShowGeminiForm(false);
      setDatosExtraidos(null);
      setPdfFile(null);
      fetchData();
    } catch (err: any) {
      console.error('Error:', err.message);
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-3 sm:p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-primary" size={28} />
            {proyecto.denominacion}
          </h1>
          {proyecto.ubicacion && (
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin size={14} />
              {proyecto.ubicacion}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{empleados.length}</p>
              <p className="text-sm text-muted-foreground">Empleados</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{incidentes.length}</p>
              <p className="text-sm text-muted-foreground">Incidentes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('empleados')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'empleados'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users size={16} className="inline mr-1" />
          Empleados ({empleados.length})
        </button>
        <button
          onClick={() => setActiveTab('incidentes')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'incidentes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle size={16} className="inline mr-1" />
          Incidentes ({incidentes.length})
        </button>
      </div>

      {/* Empleados Tab */}
      {activeTab === 'empleados' && (
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(true); setEditingEmpleado(null); setForm({ nroDocumento: '', nombres: '', apellidos: '', cargo: '', empresa: '', telefonoCelular: '', email: '' }); }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} /> Agregar Manual
            </button>
            <button
              onClick={() => { setShowGeminiForm(true); setDatosExtraidos(null); setPdfFile(null); }}
              className="bg-secondary border border-border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary/80 transition-colors"
            >
              <Brain size={18} /> Agregar con IA
            </button>
          </div>

          {/* Manual Form */}
          {showForm && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nro. Documento *</label>
                    <input
                      type="text"
                      value={form.nroDocumento}
                      onChange={(e) => setForm({ ...form, nroDocumento: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                      required
                      disabled={!!editingEmpleado}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombres *</label>
                    <input
                      type="text"
                      value={form.nombres}
                      onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Apellidos *</label>
                    <input
                      type="text"
                      value={form.apellidos}
                      onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cargo</label>
                    <input
                      type="text"
                      value={form.cargo}
                      onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Empresa</label>
                    <input
                      type="text"
                      value={form.empresa}
                      onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefono</label>
                    <input
                      type="text"
                      value={form.telefonoCelular}
                      onChange={(e) => setForm({ ...form, telefonoCelular: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
                  >
                    <Save size={18} /> {editingEmpleado ? 'Guardar Cambios' : 'Crear Empleado'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Gemini Form */}
          {showGeminiForm && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Agregar Empleado con IA</h2>
                <button onClick={() => setShowGeminiForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              
              {!datosExtraidos ? (
                <form onSubmit={handleGeminiSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Subir PDF de ficha</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!pdfFile || geminiLoading}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Brain size={18} />
                    {geminiLoading ? 'Procesando...' : 'Procesar con IA'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-medium">Datos extraidos:</h3>
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
                  {datosExtraidos.scanDocumentos && (
                    <a href={datosExtraidos.scanDocumentos} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                      <FileText size={14} className="inline mr-1" />
                      Ver PDF procesado
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmGemini}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                      <Save size={18} /> Confirmar y Guardar
                    </button>
                    <button
                      onClick={() => setDatosExtraidos(null)}
                      className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80"
                    >
                      Subir otro PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empleados Table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Cargando...</div>
          ) : empleados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay empleados asignados a este proyecto
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full block sm:table">
                <thead className="hidden sm:table-header-group">
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
                <tbody className="block sm:table-row-group">
                  {empleados.map((emp) => (
                    <tr key={emp.nroDocumento} className="border-b border-border hover:bg-secondary/50 block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border-x border-t sm:border-x-0 sm:border-t-0 border-border p-2 sm:p-0">
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nroDocumento}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nombres}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.apellidos}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.cargo}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.empresa}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">
                        {emp.telefonoCelular && <div>{emp.telefonoCelular}</div>}
                        {emp.email && <div className="text-xs text-muted-foreground">{emp.email}</div>}
                      </td>
                      <td className="py-3 px-4 block sm:table-cell">
                        <div className="flex gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                          <button
                            onClick={() => startEdit(emp)}
                            className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-2.5 sm:p-1 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                          {emp.scanDocumentos && (
                            <a
                              href={emp.scanDocumentos}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors"
                              title="Ver PDF"
                            >
                              <FileText size={16} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Incidentes Tab */}
      {activeTab === 'incidentes' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Cargando...</div>
          ) : incidentes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay incidentes registrados para este proyecto
            </div>
          ) : (
            <div className="space-y-4">
              {incidentes.map((inc) => (
                <div key={inc.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          inc.gravedad === 'critica' ? 'bg-red-500/20 text-red-400' :
                          inc.gravedad === 'alta' ? 'bg-orange-500/20 text-orange-400' :
                          inc.gravedad === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {inc.gravedad.toUpperCase()}
                        </span>
                        <span className="text-sm text-muted-foreground">{inc.fecha}</span>
                      </div>
                      <p className="font-medium mt-1">{inc.descripcion}</p>
                      <p className="text-sm text-muted-foreground mt-1">Tipo: {inc.tipo}</p>
                      {inc.lesionado === 'si' && (
                        <p className="text-sm text-red-400 mt-1">
                          Lesionado: {inc.nombreLesionado || 'No especificado'}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      inc.estado === 'cerrado' ? 'bg-green-500/20 text-green-400' :
                      inc.estado === 'investigando' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {inc.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
