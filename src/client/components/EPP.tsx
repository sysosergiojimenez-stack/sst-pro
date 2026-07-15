import { useState, useEffect } from 'react';
import { HardHat, Plus, FileText, Search, X, Brain, Save, Package, Truck, CheckCircle2, AlertTriangle, Boxes, ArrowDownCircle, User, FileSpreadsheet, Download, AlertCircle, Eye, Pencil, Trash2 } from 'lucide-react';

interface Producto {
  rowIndex: number;
  codigo: string;
  proyecto: string;
  nombre: string;
  proveedor: string;
  clasificacion: string;
  stockMinimo: string;
}

interface Remision {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proveedor: string;
  numeracion: string;
  fecha: string;
  detalle: string;
  scaneado: string;
}

interface Entrada {
  rowIndex: number;
  idRegistro: string;
  dateTime: string;
  userEmail: string;
  refRemision: string;
  codigo: string;
  item: string;
  cantidad: string;
  proyecto: string;
}

interface NotaSalida {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  obra: string;
  orden: string;
  fecha: string;
  quienRetira: string;
  observaciones: string;
}

interface Salida {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  refNotaSalida: string;
  refItem: string;
  cantidad: string;
  trabajadorRetira: string;
}

interface Empleado {
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  empresa: string;
}

interface EPPProps {
  proyecto: string;
}

const clasificaciones = ['Casco', 'Gafas', 'Guantes', 'Botas', 'Arnés', 'Proteccion Auditiva', 'Proteccion Respiratoria', 'Ropa de Trabajo', 'Otro'];

type VistaEPP = 'productos' | 'remisiones' | 'entregas';

export default function EPP({ proyecto }: EPPProps) {
  const [vista, setVista] = useState<VistaEPP>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [notasSalida, setNotasSalida] = useState<NotaSalida[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showProductoForm, setShowProductoForm] = useState(false);
  const [showRemisionForm, setShowRemisionForm] = useState(false);
  const [showGeminiForm, setShowGeminiForm] = useState(false);
  const [showGeminiSalidaForm, setShowGeminiSalidaForm] = useState(false);
  const [showNotaSalidaForm, setShowNotaSalidaForm] = useState(false);
  const [showSalidaForm, setShowSalidaForm] = useState(false);
  const [showReporteModal, setShowReporteModal] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [datosExtraidos, setDatosExtraidos] = useState<any>(null);

  const [productoForm, setProductoForm] = useState({ codigo: '', nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });
  const [remisionForm, setRemisionForm] = useState({ proveedor: '', numeracion: '', fecha: '', detalle: '' });
  const [notaSalidaForm, setNotaSalidaForm] = useState({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
  const [salidaForm, setSalidaForm] = useState({ refItem: '', cantidad: '', trabajadorRetira: '' });
  const [selectedNota, setSelectedNota] = useState<NotaSalida | null>(null);
  const [salidasTemporales, setSalidasTemporales] = useState<{refItem: string, cantidad: string, trabajadorRetira: string, itemNombre: string}[]>([]);

  const [showRemisionDetail, setShowRemisionDetail] = useState<Remision | null>(null);
  const [showRemisionEdit, setShowRemisionEdit] = useState<Remision | null>(null);
  const [editingRemisionForm, setEditingRemisionForm] = useState({ proveedor: '', numeracion: '', fecha: '', detalle: '' });

  const [showNotaDetail, setShowNotaDetail] = useState<NotaSalida | null>(null);
  const [showNotaEdit, setShowNotaEdit] = useState<NotaSalida | null>(null);
  const [editingNotaForm, setEditingNotaForm] = useState({ orden: '', fecha: '', quienRetira: '', observaciones: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, entRes, notRes, salRes, empRes] = await Promise.all([
        fetch(`/api/epp/productos?proyecto=${encodeURIComponent(proyecto)}`),
        fetch(`/api/epp/entradas?proyecto=${encodeURIComponent(proyecto)}`),
        fetch(`/api/epp/notas-salida?proyecto=${encodeURIComponent(proyecto)}`),
        fetch(`/api/epp/salidas?proyecto=${encodeURIComponent(proyecto)}`),
        fetch('/api/empleados'),
      ]);
      const [prodData, entData, notData, salData, empData] = await Promise.all([
        prodRes.json(), entRes.json(), notRes.json(), salRes.json(), empRes.json()
      ]);
      if (prodData.success) setProductos(prodData.data);
      if (entData.success) setEntradas(entData.data);
      if (notData.success) setNotasSalida(notData.data);
      if (salData.success) setSalidas(salData.data);
      if (empData.success) setEmpleados(empData.data);

      const remRes = await fetch(`/api/epp/remisiones?proyecto=${encodeURIComponent(proyecto)}`);
      const remData = await remRes.json();
      if (remData.success) setRemisiones(remData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [proyecto]);

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '-';
    try {
      return new Date(fechaStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return fechaStr;
    }
  };

  // Filtrar entradas por proyecto
  const entradasProyecto = entradas.filter(e => e.proyecto === proyecto);

  const entradasByRemision = (idRegistro: string) => entradasProyecto.filter(e => e.refRemision === idRegistro);

  // Calcular stock por proyecto: solo sumar entradas del proyecto actual
  const totalEntradasByProducto = (codigo: string) => entradasProyecto
    .filter(e => e.codigo === codigo)
    .reduce((sum, e) => sum + parseInt(e.cantidad || '0'), 0);

  // Calcular salidas por producto
  const totalSalidasByProducto = (codigo: string) => salidas
    .filter(s => s.refItem === codigo)
    .reduce((sum, s) => sum + parseInt(s.cantidad || '0'), 0);

  // Stock disponible = entradas - salidas
  const stockDisponible = (codigo: string) => totalEntradasByProducto(codigo) - totalSalidasByProducto(codigo);

  // Verificar si stock está por debajo del mínimo
  const isStockBajo = (producto: Producto) => {
    const stock = stockDisponible(producto.codigo);
    const minimo = parseInt(producto.stockMinimo || '0');
    return minimo > 0 && stock < minimo;
  };

  // Productos con stock bajo
  const productosStockBajo = productos.filter(p => isStockBajo(p));

  // Salidas por nota
  const salidasByNota = (idRegistro: string) => salidas.filter(s => s.refNotaSalida === idRegistro);

  // Buscar empleado por documento
  const buscarEmpleado = (documento: string) => empleados.find(e => e.nroDocumento === documento);

  // Generar reporte
  const generarReporte = (tipo: string) => {
    let contenido = '';
    const fecha = new Date().toLocaleDateString('es-ES');
    
    switch(tipo) {
      case 'inventario':
        contenido = `REPORTE DE INVENTARIO - ${proyecto}
Fecha: ${fecha}
=====================================
PRODUCTO | STOCK | MINIMO | ESTADO
-------------------------------------\n`;
        productos.forEach(p => {
          const stock = stockDisponible(p.codigo);
          const minimo = parseInt(p.stockMinimo || '0');
          const estado = isStockBajo(p) ? 'BAJO' : 'OK';
          contenido += `${p.nombre} | ${stock} | ${minimo} | ${estado}\n`;
        });
        break;
      case 'entradas':
        contenido = `REPORTE DE ENTRADAS - ${proyecto}
Fecha: ${fecha}
=====================================
PRODUCTO | CANTIDAD | FECHA
-------------------------------------\n`;
        entradasProyecto.forEach(e => {
          contenido += `${e.item} | ${e.cantidad} | ${formatearFecha(e.dateTime)}\n`;
        });
        break;
      case 'salidas':
        contenido = `REPORTE DE SALIDAS - ${proyecto}
Fecha: ${fecha}
=====================================
TRABAJADOR | PRODUCTO | CANTIDAD | FECHA
-------------------------------------\n`;
        salidas.forEach(s => {
          const prod = productos.find(p => p.codigo === s.refItem);
          contenido += `${s.trabajadorRetira} | ${prod?.nombre || s.refItem} | ${s.cantidad} | ${formatearFecha(s.fechaHora)}\n`;
        });
        break;
    }
    
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${tipo}-${fecha.replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowReporteModal(false);
  };

  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;
    setGeminiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const response = await fetch('/api/gemini/epp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, mimeType: pdfFile.type, proyecto }),
      });
      const data = await response.json();
      if (data.success) { setDatosExtraidos(data.data); } else { alert('Error: ' + data.error); }
      setGeminiLoading(false);
    };
    reader.readAsDataURL(pdfFile);
  };

  const handleGeminiSalidaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;
    setGeminiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const response = await fetch('/api/gemini/epp-salida', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, mimeType: pdfFile.type, proyecto }),
      });
      const data = await response.json();
      if (data.success) { setDatosExtraidos(data.data); } else { alert('Error: ' + data.error); }
      setGeminiLoading(false);
    };
    reader.readAsDataURL(pdfFile);
  };

  const handleConfirmGemini = async () => {
    if (!datosExtraidos) return;
    try {
      const remisionId = `REM-${Date.now()}`;
      await fetch('/api/epp/remisiones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro: remisionId,
          proyecto: proyecto,
          proveedor: datosExtraidos.proveedor,
          numeracion: datosExtraidos.numeracion,
          fecha: datosExtraidos.fecha,
          detalle: `Procesado por IA - ${datosExtraidos.items.length} items`,
          scaneado: datosExtraidos.pdfUrl,
        }),
      });

      const prodRes = await fetch(`/api/epp/productos?proyecto=${encodeURIComponent(proyecto)}`);
      const prodData = await prodRes.json();
      const codigosExistentes = new Set(prodData.data?.map((p: Producto) => p.codigo) || []);

      for (const item of datosExtraidos.items) {
        if (!codigosExistentes.has(item.codigo)) {
          await fetch('/api/epp/productos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigo: item.codigo, proyecto, nombre: item.nombre,
              proveedor: datosExtraidos.proveedor, clasificacion: item.clasificacion,
              stockMinimo: '0',
            }),
          });
        }
      }

      const entradasBatch = datosExtraidos.items.map((item: any, idx: number) => ({
        idRegistro: `ENT-${Date.now()}-${idx}`,
        proyecto,
        refRemision: remisionId,
        codigo: item.codigo,
        item: item.nombre,
        cantidad: item.cantidad,
      }));

      await fetch('/api/epp/entradas/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entradas: entradasBatch }),
      });

      setShowGeminiForm(false); setDatosExtraidos(null); setPdfFile(null);
      fetchData();
      alert('Remision procesada exitosamente!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleConfirmGeminiSalida = async () => {
    if (!datosExtraidos) return;
    try {
      const notaId = `NS-${Date.now()}`;
      await fetch('/api/epp/notas-salida', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro: notaId,
          obra: proyecto,
          orden: datosExtraidos.orden || '',
          fecha: datosExtraidos.fecha,
          quienRetira: datosExtraidos.quienRetira || '',
          observaciones: `Procesado por IA - ${datosExtraidos.items.length} items`,
        }),
      });

      const salidasBatch = datosExtraidos.items.map((item: any, idx: number) => ({
        idRegistro: `SAL-${Date.now()}-${idx}`,
        refNotaSalida: notaId,
        refItem: item.codigo,
        cantidad: item.cantidad,
        trabajadorRetira: item.trabajador || datosExtraidos.quienRetira || '',
      }));

      await fetch('/api/epp/salidas/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidas: salidasBatch }),
      });

      setShowGeminiSalidaForm(false); setDatosExtraidos(null); setPdfFile(null);
      fetchData();
      alert('Nota de salida procesada exitosamente!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/epp/productos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productoForm, proyecto }),
      });
      setShowProductoForm(false);
      setProductoForm({ codigo: '', nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });
      fetchData();
    } catch (err: any) { setError(err.message); }
  };

  const handleAddRemision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/epp/remisiones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...remisionForm, detalle: remisionForm.detalle || 'Registro manual' }),
      });
      setShowRemisionForm(false);
      setRemisionForm({ proveedor: '', numeracion: '', fecha: '', detalle: '' });
      fetchData();
    } catch (err: any) { setError(err.message); }
  };

  const handleGuardarNotaCompleta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salidasTemporales.length === 0) {
      alert('Agregue al menos un producto a la nota');
      return;
    }
    try {
      const notaId = `NS-${Date.now()}`;
      
      // 1. Crear la Nota de Salida
      await fetch('/api/epp/notas-salida', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro: notaId,
          obra: proyecto,
          ...notaSalidaForm,
        }),
      });
      
      // 2. Crear todas las Salidas en batch (trabajador = quienRetira de la nota)
      const salidasBatch = salidasTemporales.map((s, idx) => ({
        idRegistro: `SAL-${Date.now()}-${idx}`,
        fechaHora: new Date().toISOString(),
        userEmail: 'sistema',
        refNotaSalida: notaId,
        refItem: s.refItem,
        cantidad: s.cantidad,
        trabajadorRetira: notaSalidaForm.quienRetira,
      }));

      await fetch('/api/epp/salidas/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidas: salidasBatch }),
      });

      // 3. Limpiar todo
      setShowNotaSalidaForm(false);
      setNotaSalidaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      setSalidasTemporales([]);
      fetchData();
      alert(`Nota de salida creada con ${salidasBatch.length} item(s)!`);
    } catch (err: any) { 
      alert('Error: ' + err.message);
    }
  };

  const handleAgregarItemSalida = () => {
    if (!salidaForm.refItem || !salidaForm.cantidad) {
      alert('Seleccione producto y cantidad');
      return;
    }
    if (!notaSalidaForm.quienRetira) {
      alert('Primero seleccione el trabajador en "Quien Retira (Nro CI)"');
      return;
    }
    const prod = productos.find(p => p.codigo === salidaForm.refItem);
    setSalidasTemporales(prev => [...prev, {
      refItem: salidaForm.refItem,
      cantidad: salidaForm.cantidad,
      trabajadorRetira: notaSalidaForm.quienRetira,
      itemNombre: prod?.nombre || salidaForm.refItem,
    }]);
    setSalidaForm({ refItem: '', cantidad: '', trabajadorRetira: '' });
  };

  const handleGuardarNotaConSalidas = async () => {
    if (!selectedNota) return;
    if (salidasTemporales.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }
    try {
      const salidasBatch = salidasTemporales.map((s, idx) => ({
        idRegistro: `SAL-${Date.now()}-${idx}`,
        fechaHora: new Date().toISOString(),
        userEmail: 'sistema',
        refNotaSalida: selectedNota.idRegistro,
        refItem: s.refItem,
        cantidad: s.cantidad,
        trabajadorRetira: s.trabajadorRetira,
      }));

      await fetch('/api/epp/salidas/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidas: salidasBatch }),
      });

      setSalidasTemporales([]);
      setSelectedNota(null);
      fetchData();
      alert(`${salidasBatch.length} salidas registradas exitosamente!`);
    } catch (err: any) { setError(err.message); }
  };

  const handleEliminarItemTemporal = (index: number) => {
    setSalidasTemporales(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteRemision = async (remision: Remision) => {
    if (!confirm(`Eliminar remision "${remision.numeracion}"?`)) return;
    try {
      const response = await fetch(`/api/epp/remisiones/${remision.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleEditRemision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRemisionEdit) return;
    try {
      const response = await fetch(`/api/epp/remisiones/${showRemisionEdit.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRemisionForm),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowRemisionEdit(null);
      setEditingRemisionForm({ proveedor: '', numeracion: '', fecha: '', detalle: '' });
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const startEditRemision = (remision: Remision) => {
    setShowRemisionEdit(remision);
    setEditingRemisionForm({
      proveedor: remision.proveedor,
      numeracion: remision.numeracion,
      fecha: remision.fecha,
      detalle: remision.detalle,
    });
  };

  const handleDeleteNotaSalida = async (nota: NotaSalida) => {
    if (!confirm(`Eliminar nota de salida "${nota.orden || nota.idRegistro}" y todas sus salidas relacionadas?`)) return;
    try {
      const salidasRelacionadas = salidasByNota(nota.idRegistro);
      for (const salida of salidasRelacionadas) {
        await fetch(`/api/epp/salidas/${salida.rowIndex}`, { method: 'DELETE' });
      }
      await fetch(`/api/epp/notas-salida/${nota.rowIndex}`, { method: 'DELETE' });
      fetchData();
      alert('Nota y salidas relacionadas eliminadas');
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleEditNotaSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNotaEdit) return;
    try {
      const response = await fetch(`/api/epp/notas-salida/${showNotaEdit.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingNotaForm),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowNotaEdit(null);
      setEditingNotaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const startEditNota = (nota: NotaSalida) => {
    setShowNotaEdit(nota);
    setEditingNotaForm({
      orden: nota.orden,
      fecha: nota.fecha,
      quienRetira: nota.quienRetira,
      observaciones: nota.observaciones,
    });
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const remisionesFiltradas = remisiones.filter(r =>
    r.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.numeracion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notasFiltradas = notasSalida.filter(n =>
    n.orden.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.quienRetira.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Alertas de stock bajo */}
      {productosStockBajo.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Stock bajo detectado</p>
            <p className="text-muted-foreground text-xs mt-1">
              {productosStockBajo.length} producto(s) por debajo del stock mínimo: {productosStockBajo.map(p => p.nombre).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardHat className="text-violet-400" size={28} />
            Control de EPP
          </h1>
          <p className="text-muted-foreground mt-1">{proyecto}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReporteModal(true)} className="bg-secondary border border-border px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
            <FileSpreadsheet size={16} /> Reportes
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'productos' as VistaEPP, label: 'Productos', icon: Package },
          { id: 'remisiones' as VistaEPP, label: 'Remisiones', icon: Truck },
          { id: 'entregas' as VistaEPP, label: 'Notas de Salida', icon: ArrowDownCircle },
        ].map(tab => (
          <button key={tab.id} onClick={() => setVista(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${vista === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary text-muted-foreground"><X size={14} /></button>}
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> <strong>Error:</strong> {error}
        </div>
      )}

      {/* VISTA PRODUCTOS */}
      {vista === 'productos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Planilla de Productos EPP</h2>
            <button onClick={() => setShowProductoForm(true)} className="bg-secondary border border-border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
              <Plus size={16} /> Nuevo Producto
            </button>
          </div>

          {showProductoForm && (
            <div className="glass-card p-6 scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Nuevo Producto</h3>
                <button onClick={() => setShowProductoForm(false)} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddProducto} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-2">Codigo *</label><input type="text" value={productoForm.codigo} onChange={(e) => setProductoForm({...productoForm, codigo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required /></div>
                <div><label className="block text-sm font-medium mb-2">Nombre *</label><input type="text" value={productoForm.nombre} onChange={(e) => setProductoForm({...productoForm, nombre: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required /></div>
                <div><label className="block text-sm font-medium mb-2">Proveedor</label><input type="text" value={productoForm.proveedor} onChange={(e) => setProductoForm({...productoForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                <div><label className="block text-sm font-medium mb-2">Clasificacion</label><select value={productoForm.clasificacion} onChange={(e) => setProductoForm({...productoForm, clasificacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"><option value="">Seleccionar...</option>{clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-2">Stock Minimo</label><input type="number" value={productoForm.stockMinimo} onChange={(e) => setProductoForm({...productoForm, stockMinimo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                <div className="md:col-span-3"><button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Producto</button></div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}</div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Package size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No hay productos registrados</p></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header de la planilla */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Codigo</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nombre</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Proveedor</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Entradas</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Salidas</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Stock</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p, i) => {
                      const entradas = totalEntradasByProducto(p.codigo);
                      const salidas = totalSalidasByProducto(p.codigo);
                      const stock = stockDisponible(p.codigo);
                      const bajo = isStockBajo(p);
                      return (
                        <tr key={p.codigo} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${bajo ? 'bg-red-500/5' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                          <td className="px-4 py-3 font-medium">{p.nombre}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.proveedor || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400">{entradas}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-400">{salidas}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{stock}</td>
                          <td className="px-4 py-3 text-center">
                            {bajo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                                <AlertCircle size={10} /> Bajo
                              </span>
                            ) : stock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                                <CheckCircle2 size={10} /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                                <AlertTriangle size={10} /> Agotado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Totales */}
              <div className="bg-secondary/30 border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{productosFiltrados.length} productos</span>
                <span>
                  {productosFiltrados.filter(p => isStockBajo(p)).length} con stock bajo · {' '}
                  {productosFiltrados.filter(p => stockDisponible(p.codigo) === 0).length} agotados
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA REMISIONES */}
      {vista === 'remisiones' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Planilla de Remisiones y Facturas</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowGeminiForm(true)} className="btn-gradient text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm">
                <Brain size={16} /> Procesar con IA
              </button>
              <button onClick={() => setShowRemisionForm(true)} className="bg-secondary border border-border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
                <Plus size={16} /> Nueva Remision
              </button>
            </div>
          </div>

          {showRemisionForm && (
            <div className="glass-card p-6 scale-in">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Nueva Remision</h3><button onClick={() => setShowRemisionForm(false)} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button></div>
              <form onSubmit={handleAddRemision} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-2">Proveedor *</label><input type="text" value={remisionForm.proveedor} onChange={(e) => setRemisionForm({...remisionForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required /></div>
                <div><label className="block text-sm font-medium mb-2">Numeracion *</label><input type="text" value={remisionForm.numeracion} onChange={(e) => setRemisionForm({...remisionForm, numeracion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required /></div>
                <div><label className="block text-sm font-medium mb-2">Fecha</label><input type="date" value={remisionForm.fecha} onChange={(e) => setRemisionForm({...remisionForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                <div><label className="block text-sm font-medium mb-2">Detalle</label><input type="text" value={remisionForm.detalle} onChange={(e) => setRemisionForm({...remisionForm, detalle: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" placeholder="Detalle opcional" /></div>
                <div className="md:col-span-2"><button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Remision</button></div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}</div>
          ) : remisionesFiltradas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Truck size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No hay remisiones registradas</p></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Numeracion</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Proveedor</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Items</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...remisionesFiltradas].sort((a, b) => {
                      const fechaA = a.fecha ? new Date(a.fecha.split('/').reverse().join('-')) : new Date(0);
                      const fechaB = b.fecha ? new Date(b.fecha.split('/').reverse().join('-')) : new Date(0);
                      return fechaB.getTime() - fechaA.getTime();
                    }).map((r, i) => {
                      const itemsCount = entradasByRemision(r.idRegistro).length;
                      return (
                        <tr key={r.idRegistro} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{formatearFecha(r.fecha)}</td>
                          <td className="px-4 py-3 font-medium">{r.numeracion}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.proveedor || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                              <Package size={10} /> {itemsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {r.scaneado && (
                                <a href={r.scaneado} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver PDF">
                                  <FileText size={16} />
                                </a>
                              )}
                              <button onClick={() => setShowRemisionDetail(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver detalle"><Eye size={16} /></button>
                              <button onClick={() => startEditRemision(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteRemision(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-secondary/30 border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{remisionesFiltradas.length} remisiones</span>
                <span>Ordenadas por fecha descendente</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA NOTAS DE SALIDA */}
      {vista === 'entregas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Notas de Salida</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowGeminiSalidaForm(true)} className="bg-secondary border border-border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
                <Brain size={16} /> Procesar con IA
              </button>
              <button onClick={() => {
                const nextNum = notasSalida.filter(n => n.obra === proyecto).length + 1;
                const hoy = new Date().toISOString().split('T')[0];
                setNotaSalidaForm(prev => ({...prev, orden: `NS-${String(nextNum).padStart(3, '0')}`, fecha: hoy}));
                setShowNotaSalidaForm(true);
              }} className="btn-gradient text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm">
                <Plus size={16} /> Nueva Nota
              </button>
            </div>
          </div>

          {showNotaSalidaForm && (
            <div className="glass-card p-6 scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Nueva Nota de Salida</h3>
                <button onClick={() => { setShowNotaSalidaForm(false); setSalidasTemporales([]); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <form onSubmit={handleGuardarNotaCompleta}>
                {/* Datos de la Nota */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div><label className="block text-sm font-medium mb-2">Orden (Auto)</label><input type="text" value={notaSalidaForm.orden} readOnly className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" /></div>
                  <div><label className="block text-sm font-medium mb-2">Fecha</label><input type="date" value={notaSalidaForm.fecha} onChange={(e) => setNotaSalidaForm({...notaSalidaForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                  <div><label className="block text-sm font-medium mb-2">Quien Retira (Nro CI) *</label>
                    <select value={notaSalidaForm.quienRetira} onChange={(e) => setNotaSalidaForm({...notaSalidaForm, quienRetira: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                      <option value="">Nro de CI del trabajador</option>
                      {empleados.map(e => <option key={e.nroDocumento} value={e.nroDocumento}>{e.nombres} {e.apellidos} - CI: {e.nroDocumento}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium mb-2">Observaciones</label><input type="text" value={notaSalidaForm.observaciones} onChange={(e) => setNotaSalidaForm({...notaSalidaForm, observaciones: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                </div>

                {/* Lista de items agregados */}
                {salidasTemporales.length > 0 && (
                  <div className="mb-4 space-y-2 border-t border-border pt-4">
                    <h4 className="text-sm font-medium">Items a entregar ({salidasTemporales.length}):</h4>
                    {salidasTemporales.map((s, idx) => {
                      return (
                        <div key={idx} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm">
                          <div>
                            <p className="font-medium">{s.itemNombre}</p>
                            <p className="text-xs text-muted-foreground">Cant: {s.cantidad}</p>
                          </div>
                          <button type="button" onClick={() => handleEliminarItemTemporal(idx)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Agregar nuevo item */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-3">Agregar Item</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Producto *</label>
                      <select value={salidaForm.refItem} onChange={(e) => setSalidaForm({...salidaForm, refItem: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                        <option value="">Seleccionar...</option>
                        {productos.map(p => {
                          const stock = stockDisponible(p.codigo);
                          return <option key={p.codigo} value={p.codigo}>{p.nombre} (Stock: {stock})</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Cantidad *</label>
                      <input type="number" value={salidaForm.cantidad} onChange={(e) => setSalidaForm({...salidaForm, cantidad: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" min="1" />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={handleAgregarItemSalida} className="w-full bg-secondary border border-border hover:bg-secondary/80 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                        <Plus size={16} /> Agregar Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Boton guardar todo */}
                <div className="mt-6 pt-4 border-t border-border flex gap-2">
                  <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25" disabled={salidasTemporales.length === 0}>
                    <Save size={18} /> Guardar Nota con {salidasTemporales.length} Item(s)
                  </button>
                  <button type="button" onClick={() => setSalidasTemporales([])} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">
                    Limpiar Items
                  </button>
                </div>
              </form>
            </div>
          )}

          {selectedNota && (
            <div className="glass-card p-6 scale-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Nota: {selectedNota.idRegistro}</h3>
                  <p className="text-sm text-muted-foreground">Orden: {selectedNota.orden} | Retira: {selectedNota.quienRetira}</p>
                </div>
                <button onClick={() => { setSelectedNota(null); setSalidasTemporales([]); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Salidas registradas ({salidasByNota(selectedNota.idRegistro).length})</h4>
                <div className="space-y-2">
                  {salidasByNota(selectedNota.idRegistro).map(s => {
                    const prod = productos.find(p => p.codigo === s.refItem);
                    const emp = buscarEmpleado(s.trabajadorRetira);
                    return (
                      <div key={s.idRegistro} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm">
                        <div>
                          <p className="font-medium">{prod?.nombre || s.refItem}</p>
                          <p className="text-xs text-muted-foreground">Trabajador: {emp ? `${emp.nombres} ${emp.apellidos} (${emp.nroDocumento})` : s.trabajadorRetira}</p>
                        </div>
                        <span className="font-medium">{s.cantidad} und</span>
                      </div>
                    );
                  })}
                  {salidasByNota(selectedNota.idRegistro).length === 0 && <p className="text-sm text-muted-foreground">No hay salidas registradas</p>}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3">Agregar Productos a la Nota</h4>
                
                {/* Lista de items temporales */}
                {salidasTemporales.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Items agregados:</p>
                    {salidasTemporales.map((s, idx) => {
                      const emp = buscarEmpleado(s.trabajadorRetira);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm">
                          <div>
                            <p className="font-medium">{s.itemNombre}</p>
                            <p className="text-xs text-muted-foreground">
                              Cant: {s.cantidad} | Trabajador: {emp ? `${emp.nombres} ${emp.apellidos}` : s.trabajadorRetira}
                            </p>
                          </div>
                          <button onClick={() => handleEliminarItemTemporal(idx)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleAgregarItemSalida} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div><label className="block text-sm font-medium mb-2">Producto *</label>
                    <select value={salidaForm.refItem} onChange={(e) => setSalidaForm({...salidaForm, refItem: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                      <option value="">Seleccionar...</option>
                      {productos.map(p => {
                        const stock = stockDisponible(p.codigo);
                        return <option key={p.codigo} value={p.codigo}>{p.nombre} (Stock: {stock})</option>;
                      })}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium mb-2">Cantidad *</label><input type="number" value={salidaForm.cantidad} onChange={(e) => setSalidaForm({...salidaForm, cantidad: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required min="1" /></div>
                  <div><label className="block text-sm font-medium mb-2">Trabajador *</label>
                    <select value={salidaForm.trabajadorRetira} onChange={(e) => setSalidaForm({...salidaForm, trabajadorRetira: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                      <option value="">Seleccionar...</option>
                      {empleados.map(e => <option key={e.nroDocumento} value={e.nroDocumento}>{e.nombres} {e.apellidos} - {e.nroDocumento}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end"><button type="submit" className="w-full bg-secondary border border-border hover:bg-secondary/80 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"><Plus size={16} /> Agregar Item</button></div>
                </form>

                {salidasTemporales.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    <button onClick={handleGuardarNotaConSalidas} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25">
                      <Save size={18} /> Guardar {salidasTemporales.length} Salida(s)
                    </button>
                    <button onClick={() => setSalidasTemporales([])} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}</div>
          ) : notasFiltradas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><ArrowDownCircle size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No hay notas de salida</p></div>
          ) : (
            <div className="space-y-3">
              {notasFiltradas.map((n, i) => (
                <div key={n.idRegistro} className="glass-card p-5 card-hover fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0"><ArrowDownCircle size={24} className="text-white" /></div>
                      <div>
                        <h3 className="font-semibold">{n.orden || n.idRegistro}</h3>
                        <p className="text-sm text-muted-foreground">Retira: {n.quienRetira}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatearFecha(n.fecha)}</p>
                        {n.observaciones && <p className="text-xs text-primary mt-1">{n.observaciones}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowNotaDetail(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver detalle"><Eye size={16} /></button>
                      <button onClick={() => startEditNota(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                      <button onClick={() => handleDeleteNotaSalida(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">{salidasByNota(n.idRegistro).length} salidas en esta nota</p>
                    <div className="space-y-1">
                      {salidasByNota(n.idRegistro).slice(0, 3).map(s => {
                        const prod = productos.find(p => p.codigo === s.refItem);
                        const emp = buscarEmpleado(s.trabajadorRetira);
                        return (
                          <div key={s.idRegistro} className="flex items-center justify-between text-sm bg-secondary/50 px-3 py-2 rounded-lg">
                            <span>{prod?.nombre || s.refItem} <span className="text-muted-foreground">({emp?.nombres || s.trabajadorRetira})</span></span>
                            <span className="font-medium">{s.cantidad} und</span>
                          </div>
                        );
                      })}
                      {salidasByNota(n.idRegistro).length > 3 && <p className="text-xs text-muted-foreground pl-3">+{salidasByNota(n.idRegistro).length - 3} salidas mas...</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALES */}

      {/* Modal Ver Detalle de Remision */}
      {showRemisionDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Truck size={20} className="text-amber-400" />Detalle de Remision</h2>
              <button onClick={() => setShowRemisionDetail(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Numeracion</span><p className="font-medium">{showRemisionDetail.numeracion}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Proveedor</span><p className="font-medium">{showRemisionDetail.proveedor}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{formatearFecha(showRemisionDetail.fecha)}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">ID Registro</span><p className="font-medium">{showRemisionDetail.idRegistro}</p></div>
              </div>
              {showRemisionDetail.detalle && (
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Detalle</span><p className="font-medium">{showRemisionDetail.detalle}</p></div>
              )}
              {showRemisionDetail.scaneado && (
                <a href={showRemisionDetail.scaneado} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm"><FileText size={14} /> Ver documento escaneado</a>
              )}
              <div>
                <h3 className="font-medium text-sm mb-3">Items de la remision ({entradasByRemision(showRemisionDetail.idRegistro).length})</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {entradasByRemision(showRemisionDetail.idRegistro).map(e => (
                    <div key={e.idRegistro} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm">
                      <div><p className="font-medium">{e.item}</p><p className="text-xs text-muted-foreground">Codigo: {e.codigo}</p></div>
                      <span className="font-medium">{e.cantidad} und</span>
                    </div>
                  ))}
                  {entradasByRemision(showRemisionDetail.idRegistro).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay items registrados para esta remision</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Remision */}
      {showRemisionEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Pencil size={20} className="text-primary" />Editar Remision</h2>
              <button onClick={() => { setShowRemisionEdit(null); setEditingRemisionForm({ proveedor: '', numeracion: '', fecha: '', detalle: '' }); }} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditRemision} className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Proveedor</label><input type="text" value={editingRemisionForm.proveedor} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm font-medium mb-2">Numeracion</label><input type="text" value={editingRemisionForm.numeracion} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, numeracion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm font-medium mb-2">Fecha</label><input type="date" value={editingRemisionForm.fecha} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm font-medium mb-2">Detalle</label><textarea value={editingRemisionForm.detalle} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, detalle: e.target.value})} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                <button type="button" onClick={() => { setShowRemisionEdit(null); setEditingRemisionForm({ proveedor: '', numeracion: '', fecha: '', detalle: '' }); }} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Procesar Factura con IA */}
      {showGeminiForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Brain size={20} className="text-primary" />Procesar Factura/Remision con IA</h2>
              <button onClick={() => { setShowGeminiForm(false); setDatosExtraidos(null); setPdfFile(null); }} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            {!datosExtraidos ? (
              <form onSubmit={handleGeminiSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">Sube la factura o remision de EPP (PDF)</p>
                  <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" id="epp-pdf" />
                  <label htmlFor="epp-pdf" className="btn-gradient text-white px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-blue-500/25"><Plus size={18} /> Seleccionar PDF</label>
                  {pdfFile && <p className="mt-4 text-sm text-primary">{pdfFile.name}</p>}
                </div>
                <button type="submit" disabled={!pdfFile || geminiLoading} className="w-full btn-gradient text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"><Brain size={18} /> {geminiLoading ? 'Procesando con IA...' : 'Extraer Datos'}</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-4 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 size={16} /> Datos extraidos correctamente. Revisa antes de confirmar.</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Proveedor</span><p className="font-medium">{datosExtraidos.proveedor}</p></div>
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Numeracion</span><p className="font-medium">{datosExtraidos.numeracion}</p></div>
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{datosExtraidos.fecha}</p></div>
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Items detectados</span><p className="font-medium">{datosExtraidos.items?.length || 0}</p></div>
                </div>
                <h3 className="font-medium text-sm">Items a registrar:</h3>
                <div className="space-y-2 max-h-64 overflow-auto">{datosExtraidos.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm"><div><p className="font-medium">{item.nombre}</p><p className="text-xs text-muted-foreground">Codigo: {item.codigo} | Clasificacion: {item.clasificacion}</p></div><span className="font-medium">{item.cantidad} und</span></div>
                ))}</div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleConfirmGemini} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Confirmar y Guardar Todo</button>
                  <button onClick={() => setDatosExtraidos(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Subir otro PDF</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Procesar Nota de Salida con IA */}
      {showGeminiSalidaForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Brain size={20} className="text-primary" />Procesar Nota de Salida con IA</h2>
              <button onClick={() => { setShowGeminiSalidaForm(false); setDatosExtraidos(null); setPdfFile(null); }} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            {!datosExtraidos ? (
              <form onSubmit={handleGeminiSalidaSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">Sube la nota de salida de EPP (PDF)</p>
                  <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" id="epp-salida-pdf" />
                  <label htmlFor="epp-salida-pdf" className="btn-gradient text-white px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-blue-500/25"><Plus size={18} /> Seleccionar PDF</label>
                  {pdfFile && <p className="mt-4 text-sm text-primary">{pdfFile.name}</p>}
                </div>
                <button type="submit" disabled={!pdfFile || geminiLoading} className="w-full btn-gradient text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"><Brain size={18} /> {geminiLoading ? 'Procesando con IA...' : 'Extraer Datos'}</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-4 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 size={16} /> Datos extraidos correctamente.</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Orden</span><p className="font-medium">{datosExtraidos.orden}</p></div>
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Quien Retira</span><p className="font-medium">{datosExtraidos.quienRetira}</p></div>
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{datosExtraidos.fecha}</p></div>
                  <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Items</span><p className="font-medium">{datosExtraidos.items?.length || 0}</p></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleConfirmGeminiSalida} className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Confirmar y Guardar</button>
                  <button onClick={() => setDatosExtraidos(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Subir otro PDF</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Ver Detalle de Nota de Salida */}
      {showNotaDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ArrowDownCircle size={20} className="text-red-400" />Detalle de Nota de Salida</h2>
              <button onClick={() => setShowNotaDetail(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Orden</span><p className="font-medium">{showNotaDetail.orden}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Quien Retira</span><p className="font-medium">{showNotaDetail.quienRetira}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{formatearFecha(showNotaDetail.fecha)}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">ID Registro</span><p className="font-medium">{showNotaDetail.idRegistro}</p></div>
              </div>
              {showNotaDetail.observaciones && (
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Observaciones</span><p className="font-medium">{showNotaDetail.observaciones}</p></div>
              )}
              <div>
                <h3 className="font-medium text-sm mb-3">Salidas registradas ({salidasByNota(showNotaDetail.idRegistro).length})</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {salidasByNota(showNotaDetail.idRegistro).map(s => {
                    const prod = productos.find(p => p.codigo === s.refItem);
                    const emp = buscarEmpleado(s.trabajadorRetira);
                    return (
                      <div key={s.idRegistro} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm">
                        <div>
                          <p className="font-medium">{prod?.nombre || s.refItem}</p>
                          <p className="text-xs text-muted-foreground">Trabajador: {emp ? `${emp.nombres} ${emp.apellidos} (${emp.nroDocumento})` : s.trabajadorRetira}</p>
                        </div>
                        <span className="font-medium">{s.cantidad} und</span>
                      </div>
                    );
                  })}
                  {salidasByNota(showNotaDetail.idRegistro).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay salidas registradas para esta nota</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Nota de Salida */}
      {showNotaEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Pencil size={20} className="text-primary" />Editar Nota de Salida</h2>
              <button onClick={() => { setShowNotaEdit(null); setEditingNotaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' }); }} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditNotaSalida} className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Orden</label><input type="text" value={editingNotaForm.orden} onChange={(e) => setEditingNotaForm({...editingNotaForm, orden: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm font-medium mb-2">Fecha</label><input type="date" value={editingNotaForm.fecha} onChange={(e) => setEditingNotaForm({...editingNotaForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm font-medium mb-2">Quien Retira</label><input type="text" value={editingNotaForm.quienRetira} onChange={(e) => setEditingNotaForm({...editingNotaForm, quienRetira: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm font-medium mb-2">Observaciones</label><textarea value={editingNotaForm.observaciones} onChange={(e) => setEditingNotaForm({...editingNotaForm, observaciones: e.target.value})} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                <button type="button" onClick={() => { setShowNotaEdit(null); setEditingNotaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' }); }} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reportes */}
      {showReporteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileSpreadsheet size={20} className="text-primary" />Generar Reporte</h2>
              <button onClick={() => setShowReporteModal(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <button onClick={() => generarReporte('inventario')} className="w-full glass-card p-4 text-left hover:bg-secondary/50 transition-colors flex items-center gap-3">
                <Package size={20} className="text-blue-400" />
                <div><p className="font-medium">Inventario Actual</p><p className="text-xs text-muted-foreground">Productos con stock disponible y estado</p></div>
              </button>
              <button onClick={() => generarReporte('entradas')} className="w-full glass-card p-4 text-left hover:bg-secondary/50 transition-colors flex items-center gap-3">
                <Boxes size={20} className="text-emerald-400" />
                <div><p className="font-medium">Entradas por Producto</p><p className="text-xs text-muted-foreground">Historial de entradas al inventario</p></div>
              </button>
              <button onClick={() => generarReporte('salidas')} className="w-full glass-card p-4 text-left hover:bg-secondary/50 transition-colors flex items-center gap-3">
                <ArrowDownCircle size={20} className="text-red-400" />
                <div><p className="font-medium">Salidas por Trabajador</p><p className="text-xs text-muted-foreground">Entregas de EPP a empleados</p></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
