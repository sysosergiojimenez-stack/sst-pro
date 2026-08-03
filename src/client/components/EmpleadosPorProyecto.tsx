import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Users, Plus, Pencil, Trash2, X, Save, FileText, Brain, Filter, Search, UserCheck, UserX, Fingerprint, Upload, FileDown } from 'lucide-react';

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
  estado?: string;
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

  const [marcaciones, setMarcaciones] = useState<Array<{ nroDocumento: string; fecha: string }>>([]);
  const [importandoMarcaciones, setImportandoMarcaciones] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/empleados?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
      const data = await response.json();
      if (data.success) {
        setEmpleados(data.data);
        const uniqueEmpresas = [...new Set(data.data.map((e: Empleado) => e.empresa).filter(Boolean))];
        setEmpresas(uniqueEmpresas);
      }
      const respMarc = await fetch(`/api/marcaciones-biometricas?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
      const dataMarc = await respMarc.json();
      if (dataMarc.success) setMarcaciones(dataMarc.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const parseFechaDDMYYYY = (fechaStr: string): string => {
    const partes = fechaStr.trim().split('/');
    if (partes.length !== 3) return '';
    const [d, m, y] = partes;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const handleImportarMarcaciones = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportandoMarcaciones(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas: any[][] = XLSX.utils.sheet_to_json(hoja, { header: 1 });

      const registros: Array<{ nroDocumento: string; fecha: string; horaEntrada: string; horaSalida: string; horasRaw: string }> = [];
      for (let i = 1; i < filas.length; i++) {
        const fila = filas[i];
        if (!fila || fila.length < 5) continue;
        const nroDocumento = String(fila[0] || '').trim();
        const fechaRaw = String(fila[3] || '').trim();
        const horasRaw = String(fila[4] || '').trim();
        if (!nroDocumento || !fechaRaw || !horasRaw) continue;

        const fecha = parseFechaDDMYYYY(fechaRaw);
        if (!fecha) continue;

        const horas = horasRaw.split(/\s+/).filter(Boolean);
        const horaEntrada = horas[0] || '';
        const horaSalida = horas.length > 1 ? horas[horas.length - 1] : '';

        registros.push({ nroDocumento, fecha, horaEntrada, horaSalida, horasRaw, proyecto: proyecto.denominacion });
      }

      if (registros.length === 0) {
        alert('No se encontraron marcaciones validas en el archivo.');
        return;
      }

      const resp = await fetch('/api/marcaciones-biometricas/importar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registros }),
      });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Error'); }
      const resultado = await resp.json();
      alert(`Importacion completa: ${resultado.nuevos} registros nuevos, ${resultado.actualizados} actualizados.`);
      fetchData();
    } catch (err: any) {
      alert('Error al importar: ' + err.message);
    } finally {
      setImportandoMarcaciones(false);
      e.target.value = '';
    }
  };

  const [showControlHoras, setShowControlHoras] = useState(false);
  const [trabajadorHoras, setTrabajadorHoras] = useState('');
  const [fechaDesdeHoras, setFechaDesdeHoras] = useState('');
  const [fechaHastaHoras, setFechaHastaHoras] = useState('');
  const FERIADOS_KEY = 'sstpro_feriados';
  const [feriados, setFeriados] = useState<string[]>(() => {
    try {
      const g = localStorage.getItem(FERIADOS_KEY);
      return g ? JSON.parse(g) : [];
    } catch { return []; }
  });
  const [nuevoFeriado, setNuevoFeriado] = useState('');
  const agregarFeriado = () => {
    if (!nuevoFeriado || feriados.includes(nuevoFeriado)) return;
    const actualizados = [...feriados, nuevoFeriado].sort();
    setFeriados(actualizados);
    localStorage.setItem(FERIADOS_KEY, JSON.stringify(actualizados));
    setNuevoFeriado('');
  };
  const quitarFeriado = (fecha: string) => {
    const actualizados = feriados.filter(f => f !== fecha);
    setFeriados(actualizados);
    localStorage.setItem(FERIADOS_KEY, JSON.stringify(actualizados));
  };
  const calcularHoras = (entrada: string, salida: string): number => {
    if (!entrada || !salida) return 0;
    const [he, me] = entrada.split(':').map(Number);
    const [hs, ms] = salida.split(':').map(Number);
    if (isNaN(he) || isNaN(me) || isNaN(hs) || isNaN(ms)) return 0;
    let minutos = (hs * 60 + ms) - (he * 60 + me);
    if (minutos < 0) minutos += 24 * 60;
    return minutos / 60;
  };
  const TOLERANCIA_MIN = 10;
  const aMinutos = (hhmm: string): number | null => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  const generarInformeHoras = () => {
    if (!trabajadorHoras || !fechaDesdeHoras || !fechaHastaHoras) {
      alert('Selecciona un trabajador y el rango de fechas.');
      return;
    }
    if (fechaDesdeHoras > fechaHastaHoras) {
      alert('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    const emp = empleados.find(e => e.nroDocumento === trabajadorHoras);
    if (!emp) return;
    const mapaMarcaciones = new Map(marcaciones.filter(m => m.nroDocumento === trabajadorHoras).map((m: any) => [m.fecha, m]));
    const filas: any[] = [];
    let totalTrabajadas = 0;
    let totalExtras = 0;
    let totalAusentes = 0;
    let diasConMarcacion = 0;
    let diasAusente = 0;
    const inicio = new Date(fechaDesdeHoras + 'T00:00:00');
    const fin = new Date(fechaHastaHoras + 'T00:00:00');
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const fechaISO = d.toISOString().split('T')[0];
      const diaSemana = d.getDay();
      const fechaMostrar = d.toLocaleDateString('es-ES');
      const nombreDia = d.toLocaleDateString('es-ES', { weekday: 'long' });
      const m: any = mapaMarcaciones.get(fechaISO);
      const esFeriado = feriados.includes(fechaISO);
      const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
      const esNoLaborable = esFinDeSemana || esFeriado;
      const horaFinEsperada = diaSemana === 1 ? '18:00' : '17:30';
      const inicioMin = aMinutos('07:00')!;
      const finMin = aMinutos(horaFinEsperada)!;
      let horasTrabajadas = 0;
      let horasExtras = 0;
      let horasAusentes = 0;
      let estado = '';
      if (esNoLaborable) {
        if (m && m.horaEntrada && m.horaSalida) {
          const eMin = aMinutos(m.horaEntrada);
          const sMin = aMinutos(m.horaSalida);
          if (eMin !== null && sMin !== null) {
            let mins = sMin - eMin;
            if (mins < 0) mins += 24 * 60;
            horasExtras = mins / 60;
            estado = esFeriado ? 'Trabajado - Feriado (Extra)' : 'Trabajado - Fin de semana (Extra)';
          }
        } else {
          estado = esFeriado ? 'Feriado' : 'Fin de semana';
        }
      } else {
        if (!m || !m.horaEntrada || !m.horaSalida) {
          horasAusentes = (finMin - inicioMin) / 60;
          diasAusente++;
          estado = !m ? 'Ausente (sin marcacion)' : 'Ausente (falta entrada o salida)';
        } else {
          const eMin = aMinutos(m.horaEntrada)!;
          const sMin = aMinutos(m.horaSalida)!;
          diasConMarcacion++;
          const retrasoMin = Math.max(0, eMin - inicioMin);
          const salidaTempranaMin = Math.max(0, finMin - sMin);
          const extraAntesMin = Math.max(0, inicioMin - eMin);
          const extraDespuesMin = Math.max(0, sMin - finMin);
          const ausenteMin = (retrasoMin > TOLERANCIA_MIN ? retrasoMin : 0) + (salidaTempranaMin > TOLERANCIA_MIN ? salidaTempranaMin : 0);
          const extraMin = extraAntesMin + extraDespuesMin;
          const trabajadasMin = Math.max(0, Math.min(sMin, finMin) - Math.max(eMin, inicioMin));
          horasTrabajadas = trabajadasMin / 60;
          horasExtras = extraMin / 60;
          horasAusentes = ausenteMin / 60;
          estado = ausenteMin > 0 ? 'Presente con observaciones' : 'Presente';
        }
      }
      totalTrabajadas += horasTrabajadas;
      totalExtras += horasExtras;
      totalAusentes += horasAusentes;
      filas.push({
        Fecha: fechaMostrar,
        Dia: nombreDia,
        'Hora Entrada': m?.horaEntrada || '-',
        'Hora Salida': m?.horaSalida || '-',
        'Horas Trabajadas': horasTrabajadas > 0 ? horasTrabajadas.toFixed(2) : '-',
        'Horas Extras': horasExtras > 0 ? horasExtras.toFixed(2) : '-',
        'Horas Ausentes': horasAusentes > 0 ? horasAusentes.toFixed(2) : '-',
        Estado: estado,
      });
    }
    filas.push({ Fecha: '', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total dias con marcacion', Dia: diasConMarcacion, 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total dias ausente', Dia: diasAusente, 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total Horas Trabajadas', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': totalTrabajadas.toFixed(2), 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total Horas Extras', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': totalExtras.toFixed(2), 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total Horas Ausentes', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': totalAusentes.toFixed(2), Estado: '' });
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Control de Horas');
    XLSX.writeFile(libro, `Control_Horas_${emp.nombres}_${emp.apellidos}_${fechaDesdeHoras}_a_${fechaHastaHoras}.xlsx`);
  };

  const ultimaMarcacion = (nroDocumento: string): string => {
    const delEmpleado = marcaciones.filter(m => m.nroDocumento === nroDocumento);
    if (delEmpleado.length === 0) return '';
    return delEmpleado.reduce((max, m) => (m.fecha > max ? m.fecha : max), delEmpleado[0].fecha);
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

  const handleToggleEstado = async (empleado: Empleado) => {
    const estadoActual = empleado.estado || 'Activo';
    const nuevoEstado = estadoActual === 'Inactivo' ? 'Activo' : 'Inactivo';
    if (!confirm(`Marcar a "${empleado.nombres} ${empleado.apellidos}" como ${nuevoEstado}?`)) return;
    try {
      const response = await fetch(`/api/empleados/${empleado.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
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

  const ordenarAlfabetico = (a: Empleado, b: Empleado) =>
    a.nombres.localeCompare(b.nombres, 'es') || a.apellidos.localeCompare(b.apellidos, 'es');

  const activosOrdenados = [...empleadosFiltrados]
    .filter(e => (e.estado || 'Activo') !== 'Inactivo')
    .sort(ordenarAlfabetico);

  const inactivosOrdenados = [...empleadosFiltrados]
    .filter(e => (e.estado || 'Activo') === 'Inactivo')
    .sort(ordenarAlfabetico);

  const descargarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 14;
    const marginRight = 14;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 20;

    const checkPageBreak = (alturaNecesaria: number) => {
      if (y + alturaNecesaria > 280) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Listado de Empleados', marginLeft, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${proyecto.denominacion}`, marginLeft, y);
    y += 6;
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} | Total: ${empleados.length} empleado(s)`, marginLeft, y);
    y += 12;

    const agrupados = empleados.reduce((acc, emp) => {
      const key = emp.empresa?.trim() || 'Sin contratista';
      if (!acc[key]) acc[key] = [];
      acc[key].push(emp);
      return acc;
    }, {} as Record<string, Empleado[]>);

    const contratistas = Object.keys(agrupados).sort((a, b) => a.localeCompare(b, 'es'));

    for (const contratista of contratistas) {
      const lista = agrupados[contratista].sort(ordenarAlfabetico);
      checkPageBreak(30);

      doc.setFillColor(240, 240, 240);
      doc.rect(marginLeft, y - 5, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${contratista} (${lista.length})`, marginLeft + 2, y);
      y += 10;

      const headers = ['Documento', 'Nombres', 'Apellidos', 'Cargo', 'Teléfono', 'Email', 'Estado'];
      const colWidths = [25, 25, 25, 30, 25, 40, 20];
      const startX = marginLeft;

      doc.setFillColor(230, 230, 230);
      doc.rect(startX, y - 5, contentWidth, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      let x = startX + 2;
      headers.forEach((h, i) => {
        doc.text(h, x, y);
        x += colWidths[i];
      });
      y += 8;

      doc.setFont('helvetica', 'normal');
      for (const emp of lista) {
        checkPageBreak(12);
        doc.setFontSize(7.5);
        const row = [
          emp.nroDocumento || '-',
          emp.nombres || '-',
          emp.apellidos || '-',
          emp.cargo || '-',
          emp.telefonoCelular || '-',
          emp.email || '-',
          emp.estado || 'Activo',
        ];
        x = startX + 2;
        row.forEach((cell, i) => {
          const text = String(cell).length > 22 ? String(cell).slice(0, 22) + '...' : String(cell);
          doc.text(text, x, y);
          x += colWidths[i];
        });
        y += 6;
      }

      y += 6;
    }

    checkPageBreak(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total general: ${empleados.length} empleado(s)`, marginLeft, y);

    const fechaArchivo = new Date().toISOString().split('T')[0];
    doc.save(`Empleados_${proyecto.denominacion.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`);
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
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={() => { setShowForm(true); setEditingEmpleado(null); setForm({ nroDocumento: '', nombres: '', apellidos: '', cargo: '', empresa: '', telefonoCelular: '', email: '' }); }} className="bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-sm">
            <Plus size={18} /> Agregar Manual
          </button>
          <button onClick={() => { setShowGeminiForm(true); setDatosExtraidos(null); setPdfFile(null); }} className="bg-secondary border border-border px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
            <Brain size={18} /> Agregar con IA
          </button>
          <label className="bg-secondary border border-border px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors cursor-pointer text-sm">
            {importandoMarcaciones ? (
              <><Fingerprint size={18} className="animate-pulse" /> Importando...</>
            ) : (
              <><Upload size={18} /> Importar Marcaciones</>
            )}
            <input type="file" accept=".xls,.xlsx" onChange={handleImportarMarcaciones} disabled={importandoMarcaciones} className="hidden" />
          </label>
          <button onClick={() => setShowControlHoras(!showControlHoras)} className="bg-secondary border border-border px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
            <Fingerprint size={18} /> Control de Horas
          </button>
          <button onClick={descargarPDF} className="bg-secondary border border-border px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
            <FileDown size={18} /> Descargar PDF
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
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 sm:p-1 rounded-md hover:bg-secondary text-muted-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {empresas.length > 0 && (
          <>
            {/* Dropdown (movil) */}
            <div className="sm:hidden flex items-center gap-2 w-full">
              <Filter size={16} className="text-muted-foreground shrink-0" />
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
              >
                <option value="">Todas las empresas</option>
                {empresas.map(empresa => (
                  <option key={empresa} value={empresa}>{empresa}</option>
                ))}
              </select>
            </div>
            {/* Chips (desktop) */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Empresa:</span>
              <button onClick={() => setEmpresaFiltro('')} className={`px-3 py-1.5 rounded-full text-xs transition-colors ${!empresaFiltro ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>Todas</button>
              {empresas.map(empresa => (
                <button key={empresa} onClick={() => setEmpresaFiltro(empresa)} className={`px-3 py-1.5 rounded-full text-xs transition-colors ${empresaFiltro === empresa ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>{empresa}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {showControlHoras && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Fingerprint size={20} className="text-primary" /> Control de Horas - Generar Informe</h3>
            <button onClick={() => setShowControlHoras(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trabajador *</label>
              <select value={trabajadorHoras} onChange={(e) => setTrabajadorHoras(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>
                {[...empleados].sort((a, b) => a.nombres.localeCompare(b.nombres, 'es')).map(e => (
                  <option key={e.nroDocumento} value={e.nroDocumento}>{e.nombres} {e.apellidos} - CI: {e.nroDocumento}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Desde *</label>
              <input type="date" value={fechaDesdeHoras} onChange={(e) => setFechaDesdeHoras(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hasta *</label>
              <input type="date" value={fechaHastaHoras} onChange={(e) => setFechaHastaHoras(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mb-4 bg-secondary/30 border border-border rounded-lg p-3">
            <label className="block text-sm font-medium mb-2">Feriados (sabado, domingo y feriados trabajados se pagan 100% extra)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <input type="date" value={nuevoFeriado} onChange={(e) => setNuevoFeriado(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm" />
              <button onClick={agregarFeriado} type="button" className="bg-secondary border border-border px-3 py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors">Agregar Feriado</button>
            </div>
            {feriados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {feriados.map(f => (
                  <span key={f} className="inline-flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-full text-xs">
                    {new Date(f + 'T00:00:00').toLocaleDateString('es-ES')}
                    <button onClick={() => quitarFeriado(f)} type="button" className="hover:text-red-400"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={generarInformeHoras} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <FileText size={18} /> Generar Excel
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Horario: lunes 07:00-18:00, martes a viernes 07:00-17:30. Tolerancia de {`{TOLERANCIA_MIN}`} minutos para llegada tardia/salida temprana.
            El informe incluye horas trabajadas, horas extras (fuera de horario, fin de semana o feriado) y horas ausentes (llegada tardia, salida temprana o falta de marcacion) por dia, con totales del periodo.
          </p>
        </div>
      )}

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
          <table className="w-full block sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Documento</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nombres</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Apellidos</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cargo</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Empresa</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contacto</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ult. Marcacion</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              <tr className="bg-secondary/30">
                <td colSpan={9} className="py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activos ({activosOrdenados.length})</td>
              </tr>
              {activosOrdenados.length === 0 && (
                <tr><td colSpan={9} className="py-4 px-4 text-sm text-muted-foreground text-center">No hay empleados activos</td></tr>
              )}
              {activosOrdenados.map((emp) => (
                <tr key={`${emp.rowIndex}-${emp.nroDocumento}`} className="border-b border-border hover:bg-secondary/50 block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border-x border-t sm:border-x-0 sm:border-t-0 border-border p-2 sm:p-0">
                  <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nroDocumento}</td>
                  <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nombres}</td>
                  <td className="py-3 px-4 text-sm block sm:table-cell">{emp.apellidos}</td>
                  <td className="py-3 px-4 text-sm block sm:table-cell">{emp.cargo}</td>
                  <td className="py-3 px-4 text-sm block sm:table-cell">{emp.empresa}</td>
                  <td className="py-3 px-4 text-sm block sm:table-cell">{emp.telefonoCelular && <div>{emp.telefonoCelular}</div>}{emp.email && <div className="text-xs text-muted-foreground">{emp.email}</div>}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Ult. Marcacion: </span>{ultimaMarcacion(emp.nroDocumento) ? new Date(ultimaMarcacion(emp.nroDocumento) + 'T00:00:00').toLocaleDateString('es-ES') : '-'}</td>
                  <td className="py-3 px-4 text-center block sm:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs">Activo</span>
                  </td>
                  <td className="py-3 px-4 block sm:table-cell">
                    <div className="flex gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                      <button onClick={() => startEdit(emp)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Editar"><Pencil size={16} /></button>
                      <button onClick={() => handleToggleEstado(emp)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-amber-500 transition-colors" title="Marcar como Inactivo"><UserX size={16} /></button>
                      <button onClick={() => handleDelete(emp)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                      {emp.scanDocumentos && <a href={emp.scanDocumentos} target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Ver PDF"><FileText size={16} /></a>}
                    </div>
                  </td>
                </tr>
              ))}
              {inactivosOrdenados.length > 0 && (
                <>
                  <tr className="bg-secondary/30">
                    <td colSpan={9} className="py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inactivos ({inactivosOrdenados.length})</td>
                  </tr>
                  {inactivosOrdenados.map((emp) => (
                    <tr key={`${emp.rowIndex}-${emp.nroDocumento}`} className="border-b border-border hover:bg-secondary/50 opacity-60 block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border-x border-t sm:border-x-0 sm:border-t-0 border-border p-2 sm:p-0">
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nroDocumento}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nombres}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.apellidos}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.cargo}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.empresa}</td>
                      <td className="py-3 px-4 text-sm block sm:table-cell">{emp.telefonoCelular && <div>{emp.telefonoCelular}</div>}{emp.email && <div className="text-xs text-muted-foreground">{emp.email}</div>}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Ult. Marcacion: </span>{ultimaMarcacion(emp.nroDocumento) ? new Date(ultimaMarcacion(emp.nroDocumento) + 'T00:00:00').toLocaleDateString('es-ES') : '-'}</td>
                      <td className="py-3 px-4 text-center block sm:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">Inactivo</span>
                      </td>
                      <td className="py-3 px-4 block sm:table-cell">
                        <div className="flex gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                          <button onClick={() => startEdit(emp)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Editar"><Pencil size={16} /></button>
                          <button onClick={() => handleToggleEstado(emp)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-green-500 transition-colors" title="Reactivar"><UserCheck size={16} /></button>
                          <button onClick={() => handleDelete(emp)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                          {emp.scanDocumentos && <a href={emp.scanDocumentos} target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Ver PDF"><FileText size={16} /></a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
