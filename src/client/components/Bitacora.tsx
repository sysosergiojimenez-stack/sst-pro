import { useState, useEffect, Fragment } from 'react';
import { NotebookPen, Plus, X, Save, Trash2, Pencil, MapPin, User, Calendar, Image as ImageIcon, ExternalLink, Clock } from 'lucide-react';

interface BitacoraEntrada {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  fecha: string;
  descripcionTrabajo: string;
  ubicacionArea: string;
  realizadoPor: string;
  fotos: string;
}

interface Empleado {
  nroDocumento: string;
  nombres: string;
  apellidos: string;
}

interface BitacoraProps {
  proyecto: string;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Bitacora({ proyecto }: BitacoraProps) {
  const [entradas, setEntradas] = useState<BitacoraEntrada[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<BitacoraEntrada | null>(null);
  const [form, setForm] = useState({ fecha: '', descripcionTrabajo: '', ubicacionArea: '', realizadoPor: '' });
  const [busquedaRealizadoPor, setBusquedaRealizadoPor] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [indiceResaltado, setIndiceResaltado] = useState(0);
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [deletingId, setDeletingId] = useState<BitacoraEntrada | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entRes, empRes] = await Promise.all([
        fetch(`/api/bitacora?proyecto=${encodeURIComponent(proyecto)}`),
        fetch(`/api/empleados?proyecto=${encodeURIComponent(proyecto)}`),
      ]);
      const entData = entRes.ok ? await entRes.json() : { data: [] };
      const empData = empRes.ok ? await empRes.json() : { data: [] };
      setEntradas(entData.data || []);
      setEmpleados(empData.data || []);
    } catch (err) {
      console.error('Error cargando bitacora:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [proyecto]);

  const buscarEmpleado = (nroDocumento: string) => empleados.find(e => e.nroDocumento === nroDocumento);

  const buscarEmpleadosPorTexto = (texto: string) => {
    if (!texto) return [];
    const t = texto.toLowerCase();
    return empleados.filter(e => `${e.nombres} ${e.apellidos} ${e.nroDocumento}`.toLowerCase().includes(t)).slice(0, 8);
  };

  const openCreate = () => {
    setEditingEntrada(null);
    setForm({ fecha: new Date().toISOString().split('T')[0], descripcionTrabajo: '', ubicacionArea: '', realizadoPor: '' });
    setBusquedaRealizadoPor('');
    setFotosNuevas([]);
    setShowForm(true);
  };

  const openEdit = (entrada: BitacoraEntrada) => {
    setEditingEntrada(entrada);
    setForm({
      fecha: entrada.fecha, descripcionTrabajo: entrada.descripcionTrabajo,
      ubicacionArea: entrada.ubicacionArea, realizadoPor: entrada.realizadoPor,
    });
    const emp = buscarEmpleado(entrada.realizadoPor);
    setBusquedaRealizadoPor(emp ? `${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}` : entrada.realizadoPor);
    setFotosNuevas([]);
    setShowForm(true);
  };

  const handleGuardar = async () => {
    if (!form.fecha || !form.descripcionTrabajo || !form.ubicacionArea || !form.realizadoPor) {
      alert('Completa fecha, descripcion, ubicacion y quien realizo el trabajo');
      return;
    }
    setGuardando(true);
    try {
      let fotosUrls: string[] = editingEntrada ? JSON.parse(editingEntrada.fotos || '[]') : [];

      if (fotosNuevas.length > 0) {
        const archivos = await Promise.all(fotosNuevas.map(async (f) => {
          const { base64, mimeType } = await fileToBase64(f);
          return { base64, mimeType };
        }));
        const res = await fetch('/api/bitacora/fotos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivos, idRegistro: editingEntrada?.idRegistro || Date.now() }),
        });
        const data = await res.json();
        if (data.urls) fotosUrls = [...fotosUrls, ...data.urls];
      }

      if (editingEntrada) {
        await fetch(`/api/bitacora/${editingEntrada.rowIndex}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, fotos: JSON.stringify(fotosUrls) }),
        });
      } else {
        await fetch('/api/bitacora', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, proyecto, fotos: JSON.stringify(fotosUrls) }),
        });
      }

      setShowForm(false);
      setFotosNuevas([]);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarFotoExistente = (url: string) => {
    if (!editingEntrada) return;
    const fotosActuales: string[] = JSON.parse(editingEntrada.fotos || '[]');
    const nuevas = fotosActuales.filter(f => f !== url);
    setEditingEntrada({ ...editingEntrada, fotos: JSON.stringify(nuevas) });
  };

  const confirmarEliminar = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/bitacora/${deletingId.rowIndex}`, { method: 'DELETE' });
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const entradasOrdenadas = [...entradas].sort((a, b) => {
    const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
    const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return fb - fa;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><NotebookPen size={20} className="text-primary" /> Bitacora de Trabajos</h2>
        <button onClick={openCreate} className="btn-gradient text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
          <Plus size={18} /> Nueva Entrada
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              {editingEntrada ? <><Pencil size={16} className="text-primary" /> Editar Entrada</> : <><Plus size={16} className="text-primary" /> Nueva Entrada de Bitacora</>}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-1">Fecha *</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-1">Ubicacion / Area *</label>
              <input type="text" value={form.ubicacionArea} onChange={(e) => setForm({ ...form, ubicacionArea: e.target.value })} placeholder="Ej: Planta baja, Sector B..." className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground uppercase mb-1">Descripcion del Trabajo *</label>
              <textarea value={form.descripcionTrabajo} onChange={(e) => setForm({ ...form, descripcionTrabajo: e.target.value })} rows={3} placeholder="Detalle del trabajo realizado..." className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50 resize-none" />
            </div>
            <div className="relative md:col-span-2">
              <label className="block text-xs text-muted-foreground uppercase mb-1">Realizado Por *</label>
              <input
                type="text"
                value={busquedaRealizadoPor}
                onChange={(e) => {
                  setBusquedaRealizadoPor(e.target.value);
                  setMostrarSugerencias(true);
                  setIndiceResaltado(0);
                  if (form.realizadoPor) setForm({ ...form, realizadoPor: '' });
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                onKeyDown={(e) => {
                  const filtrados = buscarEmpleadosPorTexto(busquedaRealizadoPor);
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMostrarSugerencias(true); setIndiceResaltado(i => Math.min(i + 1, filtrados.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceResaltado(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter') {
                    const emp = filtrados[indiceResaltado];
                    if (emp && mostrarSugerencias) {
                      e.preventDefault();
                      setForm({ ...form, realizadoPor: emp.nroDocumento });
                      setBusquedaRealizadoPor(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                      setMostrarSugerencias(false);
                    }
                  } else if (e.key === 'Escape') setMostrarSugerencias(false);
                }}
                placeholder="Escribi nombre o cedula..."
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
                autoComplete="off"
              />
              {mostrarSugerencias && busquedaRealizadoPor && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                  {buscarEmpleadosPorTexto(busquedaRealizadoPor).length > 0 ? (
                    buscarEmpleadosPorTexto(busquedaRealizadoPor).map((emp, idx) => (
                      <button
                        type="button"
                        key={emp.nroDocumento}
                        onMouseEnter={() => setIndiceResaltado(idx)}
                        onClick={() => {
                          setForm({ ...form, realizadoPor: emp.nroDocumento });
                          setBusquedaRealizadoPor(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                          setMostrarSugerencias(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${idx === indiceResaltado ? 'bg-secondary/70' : 'hover:bg-secondary/50'}`}
                      >
                        {emp.nombres} {emp.apellidos} <span className="text-muted-foreground">- CI: {emp.nroDocumento}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground uppercase mb-1">Fotos del Trabajo</label>
              {editingEntrada && JSON.parse(editingEntrada.fotos || '[]').length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {JSON.parse(editingEntrada.fotos || '[]').map((url: string, idx: number) => (
                    <div key={idx} className="relative">
                      <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" /></a>
                      <button type="button" onClick={() => handleEliminarFotoExistente(url)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file" accept="image/*" multiple
                onChange={(e) => { if (e.target.files) setFotosNuevas(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; }}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary/20 file:text-primary file:text-xs"
              />
              {fotosNuevas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {fotosNuevas.map((f, idx) => (
                    <div key={idx} className="relative">
                      <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                      <button type="button" onClick={() => setFotosNuevas(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleGuardar} disabled={guardando} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {guardando ? <><Clock size={18} className="animate-spin" /> Guardando...</> : <><Save size={18} /> Guardar</>}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}</div>
      ) : entradasOrdenadas.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">
          <NotebookPen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay entradas en la bitacora todavia.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Trabajo</th>
                  <th className="text-left px-4 py-3">Ubicacion</th>
                  <th className="text-left px-4 py-3">Realizado Por</th>
                  <th className="text-center px-4 py-3">Fotos</th>
                  <th className="text-center px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entradasOrdenadas.map((entrada) => {
                  const emp = buscarEmpleado(entrada.realizadoPor);
                  const nombreRealizo = emp ? `${emp.nombres} ${emp.apellidos}` : entrada.realizadoPor;
                  const fotos: string[] = JSON.parse(entrada.fotos || '[]');
                  const expandido = expandida === entrada.idRegistro;
                  return (
                    <Fragment key={entrada.idRegistro}>
                      <tr onClick={() => setExpandida(expandido ? null : entrada.idRegistro)} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${expandido ? 'bg-secondary/20' : ''}`}>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap"><div className="flex items-center gap-1.5"><Calendar size={12} />{entrada.fecha}</div></td>
                        <td className="px-4 py-3 max-w-xs truncate">{entrada.descripcionTrabajo}</td>
                        <td className="px-4 py-3 text-muted-foreground"><div className="flex items-center gap-1.5"><MapPin size={12} />{entrada.ubicacionArea}</div></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1.5"><User size={12} className="text-muted-foreground" />{nombreRealizo}</div></td>
                        <td className="px-4 py-3 text-center">
                          {fotos.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium"><ImageIcon size={10} /> {fotos.length}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(entrada)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                            <button onClick={() => setDeletingId(entrada)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                      {expandido && (
                        <tr className="bg-secondary/10 border-b border-border/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                              <div><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{entrada.fecha}</p></div>
                              <div><span className="text-xs text-muted-foreground uppercase">Ubicacion / Area</span><p className="font-medium">{entrada.ubicacionArea}</p></div>
                              <div><span className="text-xs text-muted-foreground uppercase">Realizado Por</span><p className="font-medium">{nombreRealizo}</p></div>
                            </div>
                            <div className="mb-4">
                              <span className="text-xs text-muted-foreground uppercase">Descripcion del Trabajo</span>
                              <p className="mt-1">{entrada.descripcionTrabajo}</p>
                            </div>
                            {fotos.length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground uppercase mb-2 block">Registro Fotografico ({fotos.length})</span>
                                <div className="flex flex-wrap gap-3">
                                  {fotos.map((url, idx) => (
                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative group">
                                      <img src={url} alt="" className="w-24 h-24 object-cover rounded-xl border border-border" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                        <ExternalLink size={16} className="text-white" />
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-secondary/30 border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{entradasOrdenadas.length} entradas en la bitacora</span>
            <span>Ordenadas por fecha descendente</span>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] border border-border rounded-xl w-full max-w-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-full"><Trash2 size={20} className="text-red-400" /></div>
              <div><h3 className="font-semibold text-sm">Eliminar Entrada</h3><p className="text-muted-foreground text-xs">Esta accion no se puede deshacer.</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors text-sm">Cancelar</button>
              <button onClick={confirmarEliminar} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"><Trash2 size={16} /> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
