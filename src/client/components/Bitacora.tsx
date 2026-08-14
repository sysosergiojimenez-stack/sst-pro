import React, { useState, useEffect, Fragment, useRef } from 'react';
import { NotebookPen, Plus, X, Save, Trash2, Pencil, MapPin, ExternalLink, Clock, CheckSquare, Square, CheckCircle2, Users, Camera, Image as ImageIcon, ArrowRightLeft, Search } from 'lucide-react';

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

interface BitacoraTarea {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  idBitacora: string;
  descripcion: string;
  estado: 'pendiente' | 'completada';
  fotosAntes: string;
  fotosDespues: string;
  fechaCompletado: string;
  completadosPor: string;
}

interface Empleado {
  nroDocumento: string;
  nombres: string;
  apellidos: string;
}

interface BitacoraProps {
  proyecto: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturó:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] bg-red-950/95 text-white p-6 overflow-auto">
          <h2 className="text-lg font-bold mb-2">Error en la interfaz</h2>
          <pre className="text-xs whitespace-pre-wrap">{this.state.error?.message}\n{this.state.error?.stack}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-4 py-2 bg-white text-red-900 rounded-lg">Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function safeParseJson<T>(value: string | undefined | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
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

function ImagePicker({ onFilesSelected, label }: { onFilesSelected: (files: File[]) => void; label?: string }) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div>
      {label && <span className="block text-xs text-muted-foreground uppercase mb-1">{label}</span>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-xl text-xs hover:bg-secondary/80 transition-colors"
        >
          <Camera size={14} />
          <span>Camara</span>
        </button>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleChange} className="hidden" />
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-xl text-xs hover:bg-secondary/80 transition-colors"
        >
          <ImageIcon size={14} />
          <span>Galeria</span>
        </button>
        <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleChange} className="hidden" />
      </div>
    </div>
  );
}

interface NuevaTareaFormProps {
  descripcion: string;
  setDescripcion: (v: string) => void;
  fotosAntes: File[];
  setFotosAntes: React.Dispatch<React.SetStateAction<File[]>>;
  guardando: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
}

function NuevaTareaForm({ descripcion, setDescripcion, fotosAntes, setFotosAntes, guardando, onGuardar, onCancelar }: NuevaTareaFormProps) {
  return (
    <div className="bg-card/50 border border-border rounded-xl p-3 mb-3 space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground uppercase mb-1">Descripcion de la tarea</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Limpiar area de trabajo..."
          rows={3}
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50 resize-none"
        />
      </div>
      <div>
        <ImagePicker
          label="Fotos antes (opcional)"
          onFilesSelected={(files) => setFotosAntes(prev => [...prev, ...files])}
        />
        {fotosAntes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {fotosAntes.map((f, idx) => (
              <div key={idx} className="relative">
                <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                <button type="button" onClick={() => setFotosAntes(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onGuardar}
          disabled={guardando}
          className="btn-gradient text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
        >
          {guardando ? <Clock size={14} className="animate-spin" /> : <Save size={14} />} Guardar
        </button>
        <button
          onClick={onCancelar}
          className="px-4 py-2 bg-secondary border border-border rounded-lg text-xs hover:bg-secondary/80"
        >Cancelar</button>
      </div>
    </div>
  );
}

interface TareasPanelProps {
  entrada: BitacoraEntrada;
  tareas: BitacoraTarea[];
  entradas: BitacoraEntrada[];
  nuevaTareaBitacoraId: string | null;
  setNuevaTareaBitacoraId: (id: string | null) => void;
  nuevaTareaDescripcion: string;
  setNuevaTareaDescripcion: (v: string) => void;
  nuevaTareaFotosAntes: File[];
  setNuevaTareaFotosAntes: React.Dispatch<React.SetStateAction<File[]>>;
  guardandoTarea: boolean;
  handleCrearTarea: (idBitacora: string) => void;
  handleToggleCompletarTarea: (tarea: BitacoraTarea) => void;
  abrirEditarTarea: (tarea: BitacoraTarea) => void;
  handleEliminarTarea: (tarea: BitacoraTarea) => void;
  abrirMoverTarea: (tarea: BitacoraTarea) => void;
}

function TareasPanel({
  entrada,
  tareas,
  entradas,
  nuevaTareaBitacoraId,
  setNuevaTareaBitacoraId,
  nuevaTareaDescripcion,
  setNuevaTareaDescripcion,
  nuevaTareaFotosAntes,
  setNuevaTareaFotosAntes,
  guardandoTarea,
  handleCrearTarea,
  handleToggleCompletarTarea,
  abrirEditarTarea,
  handleEliminarTarea,
  abrirMoverTarea,
}: TareasPanelProps) {
  const completadas = tareas.filter(t => t.estado === 'completada').length;
  const mostrandoForm = nuevaTareaBitacoraId === entrada.idRegistro;
  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <CheckSquare size={16} className="text-primary" />
          Tareas ({completadas}/{tareas.length})
        </h4>
        {!mostrandoForm && (
          <button
            onClick={() => setNuevaTareaBitacoraId(entrada.idRegistro)}
            className="text-xs flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <Plus size={12} /> Agregar tarea
          </button>
        )}
      </div>

      {mostrandoForm && (
        <NuevaTareaForm
          descripcion={nuevaTareaDescripcion}
          setDescripcion={setNuevaTareaDescripcion}
          fotosAntes={nuevaTareaFotosAntes}
          setFotosAntes={setNuevaTareaFotosAntes}
          guardando={guardandoTarea}
          onGuardar={() => handleCrearTarea(entrada.idRegistro)}
          onCancelar={() => { setNuevaTareaBitacoraId(null); setNuevaTareaDescripcion(''); setNuevaTareaFotosAntes([]); }}
        />
      )}

      {tareas.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay tareas para esta entrada.</p>
      ) : (
        <div className="space-y-2">
          {[...tareas].sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()).map((tarea) => {
            const fotosAntes = safeParseJson<string[]>(tarea.fotosAntes, []);
            const fotosDespues = safeParseJson<string[]>(tarea.fotosDespues, []);
            const completados = safeParseJson<{ nombre: string; fecha: string }[]>(tarea.completadosPor, []);
            const fechaCreacion = new Date(tarea.fechaHora);
            return (
              <div key={tarea.idRegistro} className={`border border-border rounded-xl p-3 ${tarea.estado === 'completada' ? 'bg-green-500/5' : 'bg-card/30'}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleCompletarTarea(tarea); }}
                    className={`mt-0.5 flex-shrink-0 ${tarea.estado === 'completada' ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                    title={tarea.estado === 'completada' ? 'Marcar como pendiente' : 'Marcar como hecha'}
                  >
                    {tarea.estado === 'completada' ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm ${tarea.estado === 'completada' ? 'line-through text-muted-foreground' : ''}`}>{tarea.descripcion}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {fechaCreacion.toLocaleDateString()} {fechaCreacion.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {completados.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users size={12} />
                        <span>
                          {completados.map((c, i) => `${c.nombre} (${new Date(c.fecha).toLocaleDateString()})`).join(', ')}
                        </span>
                      </div>
                    )}
                    {(fotosAntes.length > 0 || fotosDespues.length > 0) && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {fotosAntes.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Antes</span>
                            <div className="flex flex-wrap gap-1.5">
                              {fotosAntes.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative group">
                                  <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-border" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {fotosDespues.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Despues</span>
                            <div className="flex flex-wrap gap-1.5">
                              {fotosDespues.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative group">
                                  <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-border" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirMoverTarea(tarea); }}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"
                      title="Mover a otra ubicacion"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirEditarTarea(tarea); }}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"
                      title="Editar tarea"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEliminarTarea(tarea); }}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400"
                      title="Eliminar tarea"
                    >
                      <Trash2 size={14} />
                    </button>
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

export default function Bitacora({ proyecto }: BitacoraProps) {
  const [entradas, setEntradas] = useState<BitacoraEntrada[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [busquedaUbicacion, setBusquedaUbicacion] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<BitacoraEntrada | null>(null);
  const [form, setForm] = useState({ ubicacionArea: '' });
  const [guardando, setGuardando] = useState(false);
  const [deletingId, setDeletingId] = useState<BitacoraEntrada | null>(null);

  const [tareasPorBitacora, setTareasPorBitacora] = useState<Record<string, BitacoraTarea[]>>({});
  const [nuevaTareaBitacoraId, setNuevaTareaBitacoraId] = useState<string | null>(null);
  const [nuevaTareaDescripcion, setNuevaTareaDescripcion] = useState('');
  const [nuevaTareaFotosAntes, setNuevaTareaFotosAntes] = useState<File[]>([]);
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  const [completarTarea, setCompletarTarea] = useState<BitacoraTarea | null>(null);
  const [completarNombres, setCompletarNombres] = useState('');
  const [completarFotosDespues, setCompletarFotosDespues] = useState<File[]>([]);

  const [editandoTarea, setEditandoTarea] = useState<BitacoraTarea | null>(null);
  const [editarTareaDescripcion, setEditarTareaDescripcion] = useState('');
  const [editarTareaFotosAntes, setEditarTareaFotosAntes] = useState<string[]>([]);
  const [editarTareaFotosAntesNuevas, setEditarTareaFotosAntesNuevas] = useState<File[]>([]);

  const [moviendoTarea, setMoviendoTarea] = useState<BitacoraTarea | null>(null);
  const [nuevaUbicacionId, setNuevaUbicacionId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entRes, empRes, tarRes] = await Promise.all([
        fetch(`/api/bitacora?proyecto=${encodeURIComponent(proyecto)}`),
        fetch(`/api/empleados?proyecto=${encodeURIComponent(proyecto)}`),
        fetch(`/api/bitacora/tareas?proyecto=${encodeURIComponent(proyecto)}`),
      ]);
      const entData = entRes.ok ? await entRes.json() : { data: [] };
      const empData = empRes.ok ? await empRes.json() : { data: [] };
      const tarData = tarRes.ok ? await tarRes.json() : { data: [] };
      setEntradas(entData.data || []);
      setEmpleados(empData.data || []);
      const agrupadas: Record<string, BitacoraTarea[]> = {};
      for (const t of (tarData.data || []) as BitacoraTarea[]) {
        if (!agrupadas[t.idBitacora]) agrupadas[t.idBitacora] = [];
        agrupadas[t.idBitacora].push(t);
      }
      setTareasPorBitacora(agrupadas);
    } catch (err) {
      console.error('Error cargando bitacora:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Actualizar datos cuando la pestaña vuelve a estar visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [proyecto]);

  const buscarEmpleado = (nroDocumento: string) => empleados.find(e => e.nroDocumento === nroDocumento);

  const openCreate = () => {
    setEditingEntrada(null);
    setForm({ ubicacionArea: '' });
    setShowForm(true);
  };

  const openEdit = (entrada: BitacoraEntrada) => {
    setEditingEntrada(entrada);
    setForm({ ubicacionArea: entrada.ubicacionArea });
    setShowForm(true);
  };

  const handleGuardar = async () => {
    if (!form.ubicacionArea) {
      alert('Completa la ubicacion/area');
      return;
    }
    setGuardando(true);
    try {
      if (editingEntrada) {
        await fetch(`/api/bitacora/${editingEntrada.rowIndex}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/bitacora', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, fecha: new Date().toISOString().split('T')[0], proyecto }),
        });
      }

      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
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

  const subirFotosTarea = async (files: File[], idRegistro: string): Promise<string[]> => {
    if (files.length === 0) return [];
    const archivos = await Promise.all(files.map(async (f) => {
      const { base64, mimeType } = await fileToBase64(f);
      return { base64, mimeType };
    }));
    const res = await fetch('/api/bitacora/fotos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivos, idRegistro }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error subiendo fotos');
    return data.urls || [];
  };

  const handleCrearTarea = async (idBitacora: string) => {
    if (!nuevaTareaDescripcion.trim()) {
      alert('Escribe una descripcion para la tarea');
      return;
    }
    setGuardandoTarea(true);
    try {
      const idRegistro = `TAR-${Date.now()}`;
      const fotosAntesUrls = await subirFotosTarea(nuevaTareaFotosAntes, idRegistro);
      await fetch('/api/bitacora/tareas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro,
          proyecto,
          idBitacora,
          descripcion: nuevaTareaDescripcion.trim(),
          fotosAntes: JSON.stringify(fotosAntesUrls),
        }),
      });
      setNuevaTareaBitacoraId(null);
      setNuevaTareaDescripcion('');
      setNuevaTareaFotosAntes([]);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoTarea(false);
    }
  };

  const handleEliminarTarea = async (tarea: BitacoraTarea) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await fetch(`/api/bitacora/tareas/${tarea.rowIndex}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggleCompletarTarea = async (tarea: BitacoraTarea) => {
    if (tarea.estado === 'completada') {
      // Volver a pendiente, manteniendo historial (Opcion A)
      try {
        await fetch(`/api/bitacora/tareas/${tarea.rowIndex}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'pendiente' }),
        });
        fetchData();
      } catch (err: any) {
        alert('Error: ' + err.message);
      }
      return;
    }
    // Abrir modal para completar
    setCompletarTarea(tarea);
    setCompletarNombres('');
    setCompletarFotosDespues([]);
  };

  const handleConfirmarCompletar = async () => {
    if (!completarTarea) return;
    const nombres = completarNombres.split(',').map(n => n.trim()).filter(Boolean);
    if (nombres.length === 0) {
      alert('Agrega al menos un nombre de quien completo la tarea');
      return;
    }
    setGuardandoTarea(true);
    try {
      const fotosDespuesUrls = await subirFotosTarea(completarFotosDespues, completarTarea.idRegistro);
      const historial = safeParseJson<{ nombre: string; fecha: string }[]>(completarTarea.completadosPor, []);
      const ahora = new Date().toISOString();
      for (const nombre of nombres) {
        historial.push({ nombre, fecha: ahora });
      }
      await fetch(`/api/bitacora/tareas/${completarTarea.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'completada',
          fechaCompletado: ahora,
          completadosPor: JSON.stringify(historial),
          fotosDespues: JSON.stringify([...safeParseJson<string[]>(completarTarea.fotosDespues, []), ...fotosDespuesUrls]),
        }),
      });
      setCompletarTarea(null);
      setCompletarNombres('');
      setCompletarFotosDespues([]);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoTarea(false);
    }
  };

  const abrirEditarTarea = (tarea: BitacoraTarea) => {
    setEditandoTarea(tarea);
    setEditarTareaDescripcion(tarea.descripcion);
    setEditarTareaFotosAntes(safeParseJson<string[]>(tarea.fotosAntes, []));
    setEditarTareaFotosAntesNuevas([]);
  };

  const handleGuardarEdicionTarea = async () => {
    if (!editandoTarea) return;
    if (!editarTareaDescripcion.trim()) {
      alert('La descripcion no puede quedar vacia');
      return;
    }
    setGuardandoTarea(true);
    try {
      const fotosNuevasUrls = await subirFotosTarea(editarTareaFotosAntesNuevas, editandoTarea.idRegistro);
      await fetch(`/api/bitacora/tareas/${editandoTarea.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: editarTareaDescripcion.trim(),
          fotosAntes: JSON.stringify([...editarTareaFotosAntes, ...fotosNuevasUrls]),
        }),
      });
      setEditandoTarea(null);
      setEditarTareaDescripcion('');
      setEditarTareaFotosAntes([]);
      setEditarTareaFotosAntesNuevas([]);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoTarea(false);
    }
  };

  const handleMoverTarea = async () => {
    if (!moviendoTarea || !nuevaUbicacionId) return;
    if (nuevaUbicacionId === moviendoTarea.idBitacora) {
      setMoviendoTarea(null);
      setNuevaUbicacionId('');
      return;
    }
    setGuardandoTarea(true);
    try {
      await fetch(`/api/bitacora/tareas/${moviendoTarea.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idBitacora: nuevaUbicacionId }),
      });
      setMoviendoTarea(null);
      setNuevaUbicacionId('');
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoTarea(false);
    }
  };

  const entradasOrdenadas = [...entradas]
    .filter(e => e.ubicacionArea.toLowerCase().includes(busquedaUbicacion.toLowerCase()))
    .sort((a, b) =>
      a.ubicacionArea.localeCompare(b.ubicacionArea, 'es', { sensitivity: 'base' })
    );


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><NotebookPen size={20} className="text-primary" /> Bitacora de Trabajos</h2>
        <button onClick={openCreate} className="btn-gradient text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
          <Plus size={18} /> Nueva Entrada
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={busquedaUbicacion}
          onChange={(e) => setBusquedaUbicacion(e.target.value)}
          placeholder="Buscar ubicacion o area..."
          className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
        />
      </div>

      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              {editingEntrada ? <><Pencil size={16} className="text-primary" /> Editar Entrada</> : <><Plus size={16} className="text-primary" /> Nueva Entrada de Bitacora</>}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground uppercase mb-1">Ubicacion / Area *</label>
            <input type="text" value={form.ubicacionArea} onChange={(e) => setForm({ ...form, ubicacionArea: e.target.value })} placeholder="Ej: Planta baja, Sector B..." className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
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
            <table className="w-full text-sm block sm:table">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3">Ubicacion</th>
                  <th className="text-center px-4 py-3">Tareas</th>
                  <th className="text-center px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="block sm:table-row-group">
                {entradasOrdenadas.map((entrada) => {
                  const tareas = tareasPorBitacora[entrada.idRegistro] || [];
                  const tareasCompletadas = tareas.filter(t => t.estado === 'completada').length;
                  const expandido = expandida === entrada.idRegistro;
                  return (
                    <Fragment key={entrada.idRegistro}>
                      <tr onClick={() => setExpandida(expandido ? null : entrada.idRegistro)} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0 ${expandido ? 'bg-secondary/20' : ''}`}>
                        <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><div className="flex items-center gap-1.5"><MapPin size={12} />{entrada.ubicacionArea}</div></td>
                        <td className="px-4 py-3 text-center block sm:table-cell">
                          {tareas.length > 0 ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tareasCompletadas === tareas.length ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              <CheckSquare size={10} /> {tareasCompletadas}/{tareas.length}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                            <button onClick={() => openEdit(entrada)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar ubicacion"><Pencil size={16} /></button>
                            <button onClick={() => setDeletingId(entrada)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                      {expandido && (
                        <tr className="bg-secondary/10 border-b border-border/50">
                          <td colSpan={3} className="px-6 py-4">
                            {entrada.descripcionTrabajo && (
                              <div className="mb-4">
                                <span className="text-xs text-muted-foreground uppercase">Descripcion del Trabajo</span>
                                <p className="mt-1">{entrada.descripcionTrabajo}</p>
                              </div>
                            )}
                            {(() => {
                              const fotosEntrada: string[] = JSON.parse(entrada.fotos || '[]');
                              return fotosEntrada.length > 0 ? (
                                <div className="mb-4">
                                  <span className="text-xs text-muted-foreground uppercase mb-2 block">Registro Fotografico ({fotosEntrada.length})</span>
                                  <div className="flex flex-wrap gap-3">
                                    {fotosEntrada.map((url, idx) => (
                                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative group">
                                        <img src={url} alt="" className="w-24 h-24 object-cover rounded-xl border border-border" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                          <ExternalLink size={16} className="text-white" />
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ) : null;
                            })()}

                            <TareasPanel
                              entrada={entrada}
                              tareas={tareasPorBitacora[entrada.idRegistro] || []}
                              entradas={entradasOrdenadas}
                              nuevaTareaBitacoraId={nuevaTareaBitacoraId}
                              setNuevaTareaBitacoraId={setNuevaTareaBitacoraId}
                              nuevaTareaDescripcion={nuevaTareaDescripcion}
                              setNuevaTareaDescripcion={setNuevaTareaDescripcion}
                              nuevaTareaFotosAntes={nuevaTareaFotosAntes}
                              setNuevaTareaFotosAntes={setNuevaTareaFotosAntes}
                              guardandoTarea={guardandoTarea}
                              handleCrearTarea={handleCrearTarea}
                              handleToggleCompletarTarea={handleToggleCompletarTarea}
                              abrirEditarTarea={abrirEditarTarea}
                              handleEliminarTarea={handleEliminarTarea}
                              abrirMoverTarea={(tarea) => { setMoviendoTarea(tarea); setNuevaUbicacionId(''); }}
                            />
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

      {completarTarea && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] border border-border rounded-xl w-full max-w-md p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-full"><CheckCircle2 size={20} className="text-green-400" /></div>
              <div>
                <h3 className="font-semibold text-sm">Completar Tarea</h3>
                <p className="text-muted-foreground text-xs">{completarTarea.descripcion}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Completado por *</label>
                <input
                  type="text"
                  value={completarNombres}
                  onChange={(e) => setCompletarNombres(e.target.value)}
                  placeholder="Nombres separados por coma..."
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Podés agregar varios nombres separados por coma.</p>
              </div>
              <div>
                <ImagePicker
                  label="Foto despues (opcional)"
                  onFilesSelected={(files) => setCompletarFotosDespues(prev => [...prev, ...files])}
                />
                {completarFotosDespues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {completarFotosDespues.map((f, idx) => (
                      <div key={idx} className="relative">
                        <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                        <button type="button" onClick={() => setCompletarFotosDespues(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setCompletarTarea(null)} className="flex-1 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors text-sm">Cancelar</button>
              <button
                onClick={handleConfirmarCompletar}
                disabled={guardandoTarea}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {guardandoTarea ? <Clock size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Completar
              </button>
            </div>
          </div>
        </div>
      )}

      {editandoTarea && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <ErrorBoundary>
          <div className="bg-[#1a1a24] border border-border rounded-xl w-full max-w-md p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-full"><Pencil size={20} className="text-primary" /></div>
              <div>
                <h3 className="font-semibold text-sm">Editar Tarea</h3>
                <p className="text-muted-foreground text-xs">{editandoTarea.descripcion}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Descripcion *</label>
                <textarea
                  value={editarTareaDescripcion}
                  onChange={(e) => setEditarTareaDescripcion(e.target.value)}
                  placeholder="Descripcion de la tarea..."
                  rows={4}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase mb-1">Fotos antes</span>
                {editarTareaFotosAntes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editarTareaFotosAntes.map((url, idx) => (
                      <div key={idx} className="relative">
                        <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" /></a>
                        <button type="button" onClick={() => setEditarTareaFotosAntes(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <ImagePicker
                  onFilesSelected={(files) => setEditarTareaFotosAntesNuevas(prev => [...prev, ...files])}
                />
                {editarTareaFotosAntesNuevas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editarTareaFotosAntesNuevas.map((f, idx) => (
                      <div key={idx} className="relative">
                        <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                        <button type="button" onClick={() => setEditarTareaFotosAntesNuevas(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditandoTarea(null)} className="flex-1 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors text-sm">Cancelar</button>
              <button
                onClick={handleGuardarEdicionTarea}
                disabled={guardandoTarea}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {guardandoTarea ? <Clock size={16} className="animate-spin" /> : <Save size={16} />} Guardar
              </button>
            </div>
          </div>
          </ErrorBoundary>
        </div>
      )}

      {moviendoTarea && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] border border-border rounded-xl w-full max-w-md p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-full"><ArrowRightLeft size={20} className="text-primary" /></div>
              <div>
                <h3 className="font-semibold text-sm">Mover Tarea</h3>
                <p className="text-muted-foreground text-xs">{moviendoTarea.descripcion}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Nueva ubicacion *</label>
                <select
                  value={nuevaUbicacionId}
                  onChange={(e) => setNuevaUbicacionId(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
                >
                  <option value="">Seleccionar ubicacion...</option>
                  {entradasOrdenadas
                    .filter(e => e.idRegistro !== moviendoTarea.idBitacora)
                    .map(e => (
                      <option key={e.idRegistro} value={e.idRegistro}>{e.ubicacionArea}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setMoviendoTarea(null); setNuevaUbicacionId(''); }} className="flex-1 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors text-sm">Cancelar</button>
              <button
                onClick={handleMoverTarea}
                disabled={guardandoTarea || !nuevaUbicacionId}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {guardandoTarea ? <Clock size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />} Mover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
