import { useState, useEffect, Fragment, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { longPressHandlers } from '../hooks/useLongPress';
import { HardHat, Plus, FileText, Search, X, Brain, Save, Package, Truck, CheckCircle2, AlertTriangle, Boxes, ArrowDownCircle, User, FileSpreadsheet, Download, AlertCircle, Pencil, Trash2, Footprints, FileDown, ClipboardList } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { drawPdfHeader, fetchLogoData, computeLogoSize } from '../lib/pdfHeader';
import { parseFechaLocal, fechaLocalISO, EMPRESA_DOTACION, CLASIFICACIONES_BOTIN, DIAS_VIGENCIA_DOTACION, DIAS_ALERTA_PROXIMO, calcularDotacion as calcularDotacionShared } from '../lib/dotacionCalculos';
import { ACCEPT_FICHA_EMPLEADO, mimeFichaEmpleado } from '../lib/fichaMime';

interface Producto {
  docId: string;
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

interface ItemSolicitud {
  item: string;
  producto: string;
  unidad: string;
  cantidad: string;
  cuenta: string;
  proveedor: string;
}

interface SolicitudSuministro {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  numero: string;
  fecha: string;
  supervisor: string;
  actividad: string;
  ubicacion: string;
  proveedor: string;
  fechaLimiteEntrega: string;
  observaciones: string;
  items: ItemSolicitud[];
  estado: string;
}

interface AjusteStock {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  proyecto: string;
  codigoProducto: string;
  cantidad: string;
  tipo: 'positivo' | 'negativo';
  motivo: string;
}

interface Empleado {
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  empresa: string;
  estado?: string;
  fechaInicioContrato?: string;
  calce?: string;
}

interface EPPProps {
  proyecto: string;
  proyectoLogo?: string;
}

const clasificaciones = ['Casco', 'Gafas', 'Guantes', 'Botas', 'Arnés', 'Proteccion Auditiva', 'Proteccion Respiratoria', 'Ropa de Trabajo', 'Otro'];

type VistaEPP = 'productos' | 'remisiones' | 'entregas' | 'dotacion' | 'solicitudes';

const normalizarClasificacion = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

// Mapea cada grupo de la planilla de entrega de EPP a la(s) palabra(s) clave
// que deben estar presentes en la columna Clasificacion real de Productos.
// Se usa coincidencia por substring (no igualdad exacta) porque esa columna
// es texto libre y varia entre proyectos (ej. "Lentes Obscuros", "Lentes
// Claros"). Botin para Obrero exige ambas palabras para no confundirse con
// "BOTIN P/ SUPERVISOR" ni "Casco P/ Obrero".
const GRUPOS_PLANILLA_EPP: { nombre: string; match: (clasificacionNormalizada: string) => boolean }[] = [
  { nombre: 'Guantes', match: (c) => c.includes('GUANTE') },
  { nombre: 'Lentes', match: (c) => c.includes('LENTE') },
  { nombre: 'Mascarillas', match: (c) => c.includes('MASCARILLA') },
  { nombre: 'Botín para Obrero', match: (c) => c.includes('BOTIN') && c.includes('OBRERO') },
  { nombre: 'Uniforme', match: (c) => c.includes('INDUMENTARIA') || c.includes('UNIFORME') },
];

export default function EPP({ proyecto, proyectoLogo }: EPPProps) {
  const [vista, setVista] = useState<VistaEPP>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [notasSalida, setNotasSalida] = useState<NotaSalida[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudSuministro[]>([]);
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
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
  const [reportesAbierto, setReportesAbierto] = useState(false);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<TipoReporte>('inventario');
  const [reporteMes, setReporteMes] = useState<number | 'todos'>('todos');
  const [reporteAnio, setReporteAnio] = useState(new Date().getFullYear());
  const [reporteAlertaFiltro, setReporteAlertaFiltro] = useState('todas');
  const [reporteEstadoFiltro, setReporteEstadoFiltro] = useState<'todos' | 'Activo' | 'Inactivo'>('todos');
  const reportesRef = useRef<HTMLDivElement>(null);
  const [planillaAbierta, setPlanillaAbierta] = useState(false);
  const [gruposSeleccionadosPlanilla, setGruposSeleccionadosPlanilla] = useState<Set<string>>(
    new Set(GRUPOS_PLANILLA_EPP.map(g => g.nombre))
  );
  const [itemsExcluidosPlanilla, setItemsExcluidosPlanilla] = useState<Set<string>>(new Set());
  const [showSolicitudForm, setShowSolicitudForm] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [datosExtraidos, setDatosExtraidos] = useState<any>(null);

  const [productoForm, setProductoForm] = useState({ codigo: '', nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });
  const [remisionForm, setRemisionForm] = useState({ proveedor: '', numeracion: '', fecha: '', detalle: '' });
  const [notaSalidaForm, setNotaSalidaForm] = useState({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
  const emptySolicitudForm = { fecha: '', supervisor: '', actividad: '', ubicacion: '', proveedor: '', fechaLimiteEntrega: '', observaciones: '', items: [{ item: '1', producto: '', unidad: '', cantidad: '', cuenta: '', proveedor: '' }] };
  const [solicitudForm, setSolicitudForm] = useState(emptySolicitudForm);
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudSuministro | null>(null);
  const [solicitudExpandida, setSolicitudExpandida] = useState<SolicitudSuministro | null>(null);
  const emptyAjusteForm = { codigoProducto: '', cantidad: '', tipo: 'positivo' as 'positivo' | 'negativo', motivo: '' };
  const [ajusteForm, setAjusteForm] = useState(emptyAjusteForm);
  const [ajusteProductoSeleccionado, setAjusteProductoSeleccionado] = useState<Producto | null>(null);
  const [busquedaQuienRetira, setBusquedaQuienRetira] = useState('');
  const [mostrarSugerenciasQuienRetira, setMostrarSugerenciasQuienRetira] = useState(false);
  const [indiceResaltadoQuienRetira, setIndiceResaltadoQuienRetira] = useState(0);
  const [indiceResaltadoProducto, setIndiceResaltadoProducto] = useState(0);
  const [salidaForm, setSalidaForm] = useState({ refItem: '', cantidad: '', trabajadorRetira: '' });
  const [showProductoEdit, setShowProductoEdit] = useState<Producto | null>(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<string>>(new Set());
  const [editingProductoForm, setEditingProductoForm] = useState({ codigo: '', nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarSugerenciasProducto, setMostrarSugerenciasProducto] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaSalida | null>(null);
  const [salidasTemporales, setSalidasTemporales] = useState<{refItem: string, cantidad: string, trabajadorRetira: string, itemNombre: string}[]>([]);

  const [showRemisionDetail, setShowRemisionDetail] = useState<Remision | null>(null);
  const [remisionesSeleccionadas, setRemisionesSeleccionadas] = useState<Set<string>>(new Set());
  const [editingRemisionForm, setEditingRemisionForm] = useState({ proveedor: '', numeracion: '', fecha: '', detalle: '' });
  const [editingItemsForm, setEditingItemsForm] = useState<{ idRegistro?: string; codigo: string; item: string; cantidad: string }[]>([]);

  const [showNotaDetail, setShowNotaDetail] = useState<NotaSalida | null>(null);
  const [notasSeleccionadas, setNotasSeleccionadas] = useState<Set<string>>(new Set());
  const [editingNotaForm, setEditingNotaForm] = useState({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
  const [editingSalidasForm, setEditingSalidasForm] = useState<{ idRegistro?: string; refItem: string; cantidad: string; busqueda: string }[]>([]);
  const [filaBusquedaSalidaActiva, setFilaBusquedaSalidaActiva] = useState<number | null>(null);
  const [indiceResaltadoSalidaForm, setIndiceResaltadoSalidaForm] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, entRes, notRes, salRes, empRes] = await Promise.all([
        apiFetch('/api/epp/productos'),
        apiFetch(`/api/epp/entradas?proyecto=${encodeURIComponent(proyecto)}`),
        apiFetch(`/api/epp/notas-salida?proyecto=${encodeURIComponent(proyecto)}`),
        apiFetch(`/api/epp/salidas?proyecto=${encodeURIComponent(proyecto)}`),
        apiFetch('/api/empleados'),
      ]);
      const [prodData, entData, notData, salData, empData] = await Promise.all([
        prodRes.json(), entRes.json(), notRes.json(), salRes.json(), empRes.json()
      ]);
      if (prodData.success) setProductos(prodData.data);
      if (entData.success) setEntradas(entData.data);
      if (notData.success) setNotasSalida(notData.data);
      if (salData.success) setSalidas(salData.data);
      if (empData.success) setEmpleados(empData.data);

      const remRes = await apiFetch(`/api/epp/remisiones?proyecto=${encodeURIComponent(proyecto)}`);
      const remData = await remRes.json();
      if (remData.success) setRemisiones(remData.data);

      const solRes = await apiFetch(`/api/epp/solicitudes-suministro?proyecto=${encodeURIComponent(proyecto)}`);
      const solData = await solRes.json();
      if (solData.success) setSolicitudes(solData.data);

      const ajsRes = await apiFetch(`/api/epp/ajustes-stock?proyecto=${encodeURIComponent(proyecto)}`);
      const ajsData = await ajsRes.json();
      if (ajsData.success) setAjustes(ajsData.data);
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
      // Si es una fecha pura (YYYY-MM-DD, sin hora), construirla en horario local
      // para evitar que se interprete como medianoche UTC y "caiga" al dia anterior.
      const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaStr);
      const fecha = soloFecha
        ? new Date(Number(fechaStr.slice(0, 4)), Number(fechaStr.slice(5, 7)) - 1, Number(fechaStr.slice(8, 10)))
        : new Date(fechaStr);
      return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return fechaStr;
    }
  };

  const calcularDotacion = (emp: Empleado) => calcularDotacionShared(emp, salidas, productos, notasSalida);

  const empleadosDotacion = empleados.filter(e => (e.empresa || '').trim().toUpperCase() === EMPRESA_DOTACION && e.obra === proyecto);
  const dotacionActivos = empleadosDotacion
    .filter(e => (e.estado || 'Activo') !== 'Inactivo')
    .sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'));
  const dotacionInactivos = empleadosDotacion
    .filter(e => (e.estado || 'Activo') === 'Inactivo')
    .sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'));

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

  // Ajustes de stock por producto
  const totalAjustesByProducto = (codigo: string) => ajustes
    .filter(a => a.codigoProducto === codigo)
    .reduce((sum, a) => {
      const cantidad = parseInt(a.cantidad || '0');
      return a.tipo === 'negativo' ? sum - cantidad : sum + cantidad;
    }, 0);

  // Stock disponible = entradas - salidas + ajustes
  const stockDisponible = (codigo: string) => totalEntradasByProducto(codigo) - totalSalidasByProducto(codigo) + totalAjustesByProducto(codigo);

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
  const nombreQuienRetira = (valor: string) => {
    const emp = buscarEmpleado(valor);
    return emp ? `${emp.nombres} ${emp.apellidos}` : valor;
  };
  const buscarEmpleadosPorTexto = (texto: string) => {
    const vistos = new Set<string>();
    return empleados
      .filter(e => (e.estado || 'Activo') !== 'Inactivo')
      .filter(e => `${e.nombres} ${e.apellidos} ${e.nroDocumento}`.toLowerCase().includes(texto.toLowerCase()))
      .filter(e => {
        if (vistos.has(e.nroDocumento)) return false;
        vistos.add(e.nroDocumento);
        return true;
      });
  };

  type TipoReporte = 'inventario' | 'entradas' | 'salidas' | 'salidasPorProducto' | 'dotacion';

  const MESES_REPORTE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Convierte DD/MM/AAAA (formato que devuelve la extraccion por IA) a
  // YYYY-MM-DD. Si ya viene en YYYY-MM-DD (<input type="date">) o en
  // cualquier otro formato, se devuelve sin cambios.
  const normalizarFechaAISO = (fecha: string): string => {
    const ddmmyyyy = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!ddmmyyyy) return fecha;
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  // La fecha real del ingreso es la de la remision/factura (r.fecha), no
  // e.dateTime (que es cuando se registro la entrada en la app). Normalizada
  // a ISO (ver normalizarFechaAISO). Devuelve '' si no se encuentra remision.
  const fechaRemisionDe = (e: Entrada): string =>
    normalizarFechaAISO(remisiones.find(r => r.idRegistro === e.refRemision)?.fecha || '');

  // Si la salida viene de una Nota de Salida procesada por IA (foto/PDF), se
  // usa la fecha real de esa nota (lo que dice el documento). Si la nota se
  // cargo a mano, se mantiene fechaHora (cuando se registro en la app) tal
  // como ya funcionaba -- a pedido, no se toca el caso manual.
  const fechaRealDeSalida = (s: Salida): string => {
    const nota = notasSalida.find(n => n.idRegistro === s.refNotaSalida);
    if (nota && nota.observaciones.startsWith('Procesado por IA')) {
      return normalizarFechaAISO(nota.fecha) || s.fechaHora;
    }
    return s.fechaHora;
  };

  // Filtra por mes/anio seleccionado cuando aplica (reportes sin fecha, como
  // inventario y dotacion, muestran el estado actual y no se filtran).
  const enPeriodoSeleccionado = (fechaStr: string): boolean => {
    if (reporteMes === 'todos') return true;
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return true;
    return d.getMonth() + 1 === reporteMes && d.getFullYear() === reporteAnio;
  };

  // PDF de "Entradas por Clasificación de Productos" en formato jerarquico:
  // Clasificacion (con el total) > Producto (fila sombreada, con su
  // subtotal) > cada entrada individual con su fecha y cantidad.
  const generarPdfEntradasPorClasificacion = async (sufijoPeriodo: string, fechaImpresion: string) => {
    interface FilaEntrada { fechaTexto: string; fechaOrden: string; cantidad: number }
    interface GrupoProducto { nombre: string; subtotal: number; filas: FilaEntrada[] }
    interface GrupoClasificacion { nombre: string; total: number; productos: GrupoProducto[] }

    const entradasFiltradas = entradasProyecto.filter(e => enPeriodoSeleccionado(fechaRemisionDe(e) || e.dateTime));
    const clasifPorCodigo = new Map(productos.map(p => [p.codigo, p.clasificacion || 'Sin clasificación']));
    const nombrePorCodigo = new Map(productos.map(p => [p.codigo, p.nombre]));

    const gruposPorClasif = new Map<string, Map<string, GrupoProducto>>();
    for (const e of entradasFiltradas) {
      const clasificacion = clasifPorCodigo.get(e.codigo) || 'Sin clasificación';
      const fechaOrden = fechaRemisionDe(e) || e.dateTime;
      const cantidad = parseInt(e.cantidad || '0');
      if (!gruposPorClasif.has(clasificacion)) gruposPorClasif.set(clasificacion, new Map());
      const porProducto = gruposPorClasif.get(clasificacion)!;
      if (!porProducto.has(e.codigo)) porProducto.set(e.codigo, { nombre: nombrePorCodigo.get(e.codigo) || e.item, subtotal: 0, filas: [] });
      const grupoProducto = porProducto.get(e.codigo)!;
      grupoProducto.subtotal += cantidad;
      grupoProducto.filas.push({ fechaTexto: formatearFecha(fechaOrden), fechaOrden, cantidad });
    }

    const clasificaciones: GrupoClasificacion[] = [...gruposPorClasif.entries()]
      .map(([nombre, porProducto]) => {
        const productosGrupo = [...porProducto.values()]
          .map(g => ({ ...g, filas: [...g.filas].sort((a, b) => a.fechaOrden.localeCompare(b.fechaOrden)) }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        const total = productosGrupo.reduce((sum, p) => sum + p.subtotal, 0);
        return { nombre, total, productos: productosGrupo };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageW = 210;
    const pageH = 297;
    const m = 14;
    const yHeader = await drawPdfHeader(doc, { denominacion: proyecto, logo: proyectoLogo }, 10, { marginLeft: m, marginRight: m });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Entradas por Clasificación de Productos' + sufijoPeriodo, m, yHeader + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Proyecto: ${proyecto}  |  Fecha: ${fechaImpresion}`, m, yHeader + 16);

    let y = yHeader + 26;

    const saltoDePagina = (alturaNecesaria: number) => {
      if (y + alturaNecesaria > pageH - m) {
        doc.addPage();
        y = m + 10;
      }
    };

    if (clasificaciones.length === 0) {
      doc.setFontSize(10);
      doc.text('No hay entradas registradas en este período.', m, y);
    }

    for (const clasif of clasificaciones) {
      saltoDePagina(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(clasif.nombre, m, y);
      doc.text(String(clasif.total), pageW - m, y, { align: 'right' });
      y += 8;

      for (const prod of clasif.productos) {
        const maxAnchoNombre = pageW - m * 2 - 25;
        const lineasNombre = doc.splitTextToSize(prod.nombre, maxAnchoNombre);
        const altoBarra = 3 + lineasNombre.length * 3.5;
        saltoDePagina(altoBarra + 1.5 + prod.filas.length * 5);

        doc.setFillColor(230, 230, 230);
        doc.rect(m, y - 4.5, pageW - m * 2, altoBarra, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(lineasNombre, m + 1, y);
        doc.text(String(prod.subtotal), pageW - m - 1, y, { align: 'right' });
        y += altoBarra + 1.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        for (const fila of prod.filas) {
          saltoDePagina(5);
          doc.text(fila.fechaTexto, m + 1, y);
          doc.text(String(fila.cantidad), pageW - m - 1, y, { align: 'right' });
          y += 5;
        }
        y += 3;
      }
      y += 4;
    }

    doc.save(`reporte-entradas-clasificacion-${proyecto.replace(/\s+/g, '_')}-${fechaImpresion.replace(/\//g, '-')}.pdf`);
  };

  // Exportar reportes a PDF o Excel
  const exportarReporte = async (tipo: TipoReporte, formato: 'pdf' | 'excel') => {
    const fecha = new Date().toLocaleDateString('es-ES');
    const safeProyecto = proyecto.replace(/\s+/g, '_');
    const sufijoPeriodo = reporteMes === 'todos' ? '' : ` - ${MESES_REPORTE[reporteMes - 1]} ${reporteAnio}`;
    let titulo = '';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    switch (tipo) {
      case 'inventario':
        titulo = 'Inventario Actual';
        headers = ['Código', 'Producto', 'Proveedor', 'Clasificación', 'Stock', 'Mínimo', 'Estado'];
        rows = productos.map(p => {
          const stock = stockDisponible(p.codigo);
          const minimo = parseInt(p.stockMinimo || '0');
          return [p.codigo, p.nombre, p.proveedor, p.clasificacion, stock, minimo, isStockBajo(p) ? 'BAJO' : 'OK'];
        });
        break;
      case 'entradas': {
        titulo = 'Entradas por Clasificación de Productos' + sufijoPeriodo;
        headers = ['Clasificación', 'Producto', 'Código', 'Cantidad', 'Fecha'];
        const entradasFiltradas = entradasProyecto.filter(e => enPeriodoSeleccionado(fechaRemisionDe(e) || e.dateTime));
        rows = [...entradasFiltradas]
          .sort((a, b) => {
            const clasifA = productos.find(p => p.codigo === a.codigo)?.clasificacion || '';
            const clasifB = productos.find(p => p.codigo === b.codigo)?.clasificacion || '';
            return clasifA.localeCompare(clasifB) || a.item.localeCompare(b.item);
          })
          .map(e => {
            const clasificacion = productos.find(p => p.codigo === e.codigo)?.clasificacion || '-';
            const fecha = fechaRemisionDe(e);
            return [clasificacion, e.item, e.codigo, parseInt(e.cantidad || '0'), fecha ? formatearFecha(fecha) : formatearFecha(e.dateTime)];
          });
        break;
      }
      case 'salidas': {
        titulo = 'Salidas por Trabajador' + sufijoPeriodo;
        headers = ['Documento', 'Trabajador', 'Producto', 'Cantidad', 'Fecha'];
        rows = salidas
          .filter(s => enPeriodoSeleccionado(fechaRealDeSalida(s)))
          .map(s => {
            const prod = productos.find(p => p.codigo === s.refItem);
            const emp = empleados.find(e => e.nroDocumento === s.trabajadorRetira);
            return [s.trabajadorRetira, emp ? `${emp.nombres} ${emp.apellidos}` : '-', prod?.nombre || s.refItem, parseInt(s.cantidad || '0'), formatearFecha(fechaRealDeSalida(s))];
          });
        break;
      }
      case 'salidasPorProducto': {
        titulo = 'Salidas por Producto' + sufijoPeriodo;
        headers = ['Código', 'Producto', 'Cantidad', 'Trabajador', 'Fecha'];
        const salidasFiltradas = salidas.filter(s => enPeriodoSeleccionado(fechaRealDeSalida(s)));
        rows = [...salidasFiltradas]
          .sort((a, b) => a.refItem.localeCompare(b.refItem) || fechaRealDeSalida(a).localeCompare(fechaRealDeSalida(b)))
          .map(s => {
            const prod = productos.find(p => p.codigo === s.refItem);
            const emp = empleados.find(e => e.nroDocumento === s.trabajadorRetira);
            return [s.refItem, prod?.nombre || '-', parseInt(s.cantidad || '0'), emp ? `${emp.nombres} ${emp.apellidos}` : s.trabajadorRetira, formatearFecha(fechaRealDeSalida(s))];
          });
        break;
      }
      case 'dotacion': {
        titulo = 'Dotación de Calzados';
        headers = ['Documento', 'Nombre y Apellido', 'Fecha Inicio Contrato', 'Calce', 'Última Dotación', 'Próxima Dotación', 'Alerta', 'Estado Empleado'];
        const filaDotacion = (emp: Empleado, estado: 'Activo' | 'Inactivo') => {
          const d = calcularDotacion(emp);
          return { fila: [emp.nroDocumento, `${emp.nombres} ${emp.apellidos}`, formatearFecha(emp.fechaInicioContrato || ''), emp.calce || '-', d.ultimaDotacion ? formatearFecha(d.ultimaDotacion) : '-', d.proximaDotacion ? formatearFecha(d.proximaDotacion) : '-', d.alerta || 'OK', estado], alerta: d.alerta || 'OK' };
        };
        rows = [
          ...(reporteEstadoFiltro === 'Inactivo' ? [] : dotacionActivos.map(emp => filaDotacion(emp, 'Activo'))),
          ...(reporteEstadoFiltro === 'Activo' ? [] : dotacionInactivos.map(emp => filaDotacion(emp, 'Inactivo'))),
        ]
          .filter(({ alerta }) => reporteAlertaFiltro === 'todas' || alerta === reporteAlertaFiltro)
          .map(({ fila }) => fila);
        break;
      }
    }

    if (tipo === 'entradas' && formato === 'pdf') {
      await generarPdfEntradasPorClasificacion(sufijoPeriodo, fecha);
      setReportesAbierto(false);
      return;
    }

    if (formato === 'excel') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, titulo.slice(0, 31));
      XLSX.writeFile(wb, `reporte-${tipo}-${safeProyecto}-${fecha.replace(/\//g, '-')}.xlsx`);
    } else {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const yHeader = await drawPdfHeader(doc, { denominacion: proyecto, logo: proyectoLogo }, 10, { marginLeft: 14, marginRight: 14 });
      doc.setFontSize(14);
      doc.text(titulo, 14, yHeader + 8);
      doc.setFontSize(10);
      doc.text(`Proyecto: ${proyecto}  |  Fecha: ${fecha}`, 14, yHeader + 16);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yHeader + 22,
        styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 10, right: 10 },
      });
      doc.save(`reporte-${tipo}-${safeProyecto}-${fecha.replace(/\//g, '-')}.pdf`);
    }
    setReportesAbierto(false);
  };

  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;
    const mimeType = mimeFichaEmpleado(pdfFile);
    if (!mimeType) { alert('Formato no admitido. Usa PDF, JPG, PNG, WEBP o HEIC.'); return; }
    setGeminiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const response = await apiFetch('/api/gemini/epp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, mimeType, proyecto }),
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
      const response = await apiFetch('/api/gemini/epp-salida', {
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
      await apiFetch('/api/epp/remisiones', {
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

      const prodRes = await apiFetch('/api/epp/productos');
      const prodData = await prodRes.json();
      const codigosExistentes = new Set(prodData.data?.map((p: Producto) => p.codigo) || []);

      for (const item of datosExtraidos.items) {
        if (!codigosExistentes.has(item.codigo)) {
          await apiFetch('/api/epp/productos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigo: item.codigo, nombre: item.nombre,
              proveedor: datosExtraidos.proveedor, clasificacion: item.clasificacion,
              stockMinimo: '0',
            }),
          });
        }
      }

      const entradasBatch = datosExtraidos.items.map((item: any, idx: number) => ({
        idRegistro: `ENT-${Date.now()}-${idx}`,
        dateTime: new Date().toISOString(),
        userEmail: 'sistema',
        refRemision: remisionId,
        codigo: item.codigo,
        item: item.nombre,
        cantidad: item.cantidad,
        proyecto,
      }));

      await apiFetch('/api/epp/entradas/batch', {
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
      await apiFetch('/api/epp/notas-salida', {
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

      await apiFetch('/api/epp/salidas/batch', {
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
      await apiFetch('/api/epp/productos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoForm),
      });
      setShowProductoForm(false);
      setProductoForm({ codigo: '', nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });
      fetchData();
    } catch (err: any) { setError(err.message); }
  };

  const startEditProducto = (producto: Producto) => {
    if (showProductoEdit?.codigo === producto.codigo) { setShowProductoEdit(null); return; }
    setShowProductoEdit(producto);
    setAjusteProductoSeleccionado(null);
    setEditingProductoForm({
      codigo: producto.codigo,
      nombre: producto.nombre,
      proveedor: producto.proveedor,
      clasificacion: producto.clasificacion,
      stockMinimo: producto.stockMinimo,
    });
  };

  const handleEditProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showProductoEdit) return;
    try {
      const response = await apiFetch(`/api/epp/productos/${showProductoEdit.docId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProductoForm),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowProductoEdit(null);
      setEditingProductoForm({ codigo: '', nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleDeleteProducto = async (producto: Producto) => {
    if (!confirm(`Eliminar producto "${producto.nombre}"? Esto no borra las entradas/salidas ya registradas con este codigo.`)) return;
    try {
      const response = await apiFetch(`/api/epp/productos/${producto.docId}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const startAjusteStock = (producto: Producto) => {
    if (ajusteProductoSeleccionado?.codigo === producto.codigo) {
      setAjusteProductoSeleccionado(null);
      return;
    }
    setAjusteProductoSeleccionado(producto);
    setAjusteForm({ ...emptyAjusteForm, codigoProducto: producto.codigo });
    setShowProductoEdit(null);
  };

  const closeAjusteForm = () => {
    setAjusteProductoSeleccionado(null);
    setAjusteForm(emptyAjusteForm);
  };

  const handleSubmitAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajusteProductoSeleccionado) return;
    try {
      const response = await apiFetch('/api/epp/ajustes-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ajusteForm,
          proyecto,
          userEmail: 'sistema',
          idRegistro: `AJS-${Date.now()}`,
        }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      closeAjusteForm();
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const toggleSeleccionProducto = (codigo: string) => {
    setProductosSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo); else next.add(codigo);
      return next;
    });
  };

  const toggleSeleccionarTodosProductos = () => {
    if (productosSeleccionados.size === productosFiltrados.length) {
      setProductosSeleccionados(new Set());
    } else {
      setProductosSeleccionados(new Set(productosFiltrados.map(p => p.codigo)));
    }
  };

  const handleBulkDeleteProductos = async () => {
    if (productosSeleccionados.size === 0) return;
    if (!confirm(`Eliminar ${productosSeleccionados.size} producto(s) seleccionado(s)? Esto no borra las entradas/salidas ya registradas.`)) return;
    try {
      const aEliminar = productos.filter(p => productosSeleccionados.has(p.codigo));
      await Promise.all(aEliminar.map(p => apiFetch(`/api/epp/productos/${p.docId}`, { method: 'DELETE' })));
      setProductosSeleccionados(new Set());
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleAddRemision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/epp/remisiones', {
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
    const quienRetiraFinal = notaSalidaForm.quienRetira || busquedaQuienRetira.trim();
    if (!quienRetiraFinal) {
      alert('Indique quien retira los productos');
      return;
    }
    try {
      const notaId = `NS-${Date.now()}`;
      const notaPayload = { ...notaSalidaForm, quienRetira: quienRetiraFinal };

      // 1. Crear la Nota de Salida
      await apiFetch('/api/epp/notas-salida', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro: notaId,
          obra: proyecto,
          ...notaPayload,
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
        trabajadorRetira: quienRetiraFinal,
      }));

      await apiFetch('/api/epp/salidas/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidas: salidasBatch }),
      });

      // 3. Limpiar todo
      setShowNotaSalidaForm(false);
      setNotaSalidaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      setSalidasTemporales([]);
      setBusquedaQuienRetira('');
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
    // Si estamos editando una nota existente, el trabajador se toma de esa nota.
    // Si estamos creando una nota nueva, se toma de "Quien Retira" del formulario.
    const trabajador = showNotaDetail ? showNotaDetail.quienRetira : notaSalidaForm.quienRetira;
    if (!trabajador) {
      alert('No se pudo determinar quien retira los productos');
      return;
    }
    const prod = productos.find(p => p.codigo === salidaForm.refItem);
    setSalidasTemporales(prev => [...prev, {
      refItem: salidaForm.refItem,
      cantidad: salidaForm.cantidad,
      trabajadorRetira: trabajador,
      itemNombre: prod?.nombre || salidaForm.refItem,
    }]);
    setSalidaForm({ refItem: '', cantidad: '', trabajadorRetira: '' });
    setBusquedaProducto('');
  };

  const handleGuardarNotaConSalidas = async () => {
    if (!showNotaDetail) return;
    if (salidasTemporales.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }
    try {
      const salidasBatch = salidasTemporales.map((s, idx) => ({
        idRegistro: `SAL-${Date.now()}-${idx}`,
        fechaHora: new Date().toISOString(),
        userEmail: 'sistema',
        refNotaSalida: showNotaDetail.idRegistro,
        refItem: s.refItem,
        cantidad: s.cantidad,
        trabajadorRetira: s.trabajadorRetira,
      }));
      await apiFetch('/api/epp/salidas/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidas: salidasBatch }),
      });
      setSalidasTemporales([]);
      fetchData();
      alert(`${salidasBatch.length} producto(s) agregado(s) a la nota!`);
    } catch (err: any) { setError(err.message); }
  };

  const handleEliminarItemTemporal = (index: number) => {
    setSalidasTemporales(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteRemision = async (remision: Remision) => {
    if (!confirm(`Eliminar remision "${remision.numeracion}"?`)) return;
    try {
      const response = await apiFetch(`/api/epp/remisiones/${remision.idRegistro}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const toggleSeleccionRemision = (idRegistro: string) => {
    setRemisionesSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(idRegistro)) next.delete(idRegistro); else next.add(idRegistro);
      return next;
    });
  };

  const toggleSeleccionarTodasRemisiones = () => {
    if (remisionesSeleccionadas.size === remisionesFiltradas.length) {
      setRemisionesSeleccionadas(new Set());
    } else {
      setRemisionesSeleccionadas(new Set(remisionesFiltradas.map(r => r.idRegistro)));
    }
  };

  const handleBulkDeleteRemisiones = async () => {
    if (remisionesSeleccionadas.size === 0) return;
    if (!confirm(`Eliminar ${remisionesSeleccionadas.size} remision(es) seleccionada(s)?`)) return;
    try {
      const aEliminar = remisiones.filter(r => remisionesSeleccionadas.has(r.idRegistro));
      await Promise.all(aEliminar.map(r => apiFetch(`/api/epp/remisiones/${r.idRegistro}`, { method: 'DELETE' })));
      const cantidad = aEliminar.length;
      setRemisionesSeleccionadas(new Set());
      fetchData();
      alert(`${cantidad} remision(es) eliminada(s) correctamente.`);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleEditRemision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRemisionDetail) return;
    try {
      const response = await apiFetch(`/api/epp/remisiones/${showRemisionDetail.idRegistro}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRemisionForm),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }

      // Sincroniza los items: actualiza los existentes, crea los agregados
      // y borra los que se quitaron del formulario.
      const itemsValidos = editingItemsForm.filter(it => it.item.trim());
      const idsActuales = new Set(itemsValidos.filter(it => it.idRegistro).map(it => it.idRegistro));
      const idsOriginales = entradasByRemision(showRemisionDetail.idRegistro).map(it => it.idRegistro);
      const idsAEliminar = idsOriginales.filter(id => !idsActuales.has(id));

      await Promise.all([
        ...itemsValidos.map((it, idx) => {
          const body = { codigo: it.codigo.trim(), item: it.item.trim(), cantidad: it.cantidad.trim() || '0' };
          return it.idRegistro
            ? apiFetch(`/api/epp/entradas/${it.idRegistro}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            : apiFetch('/api/epp/entradas', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...body, idRegistro: `ENT-${Date.now()}-${idx}`, refRemision: showRemisionDetail.idRegistro, proyecto }),
              });
        }),
        ...idsAEliminar.map(id => apiFetch(`/api/epp/entradas/${id}`, { method: 'DELETE' })),
      ]);

      setShowRemisionDetail(null);
      setEditingRemisionForm({ proveedor: '', numeracion: '', fecha: '', detalle: '' });
      setEditingItemsForm([]);
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  // Ver y editar una remision son la misma cosa: al hacer click en la fila
  // se expande el detalle, ya directamente editable (incluidos los items).
  const toggleExpandRemision = (remision: Remision) => {
    if (showRemisionDetail?.idRegistro === remision.idRegistro) { setShowRemisionDetail(null); return; }
    setShowRemisionDetail(remision);
    setEditingRemisionForm({
      proveedor: remision.proveedor,
      numeracion: remision.numeracion,
      fecha: remision.fecha,
      detalle: remision.detalle,
    });
    setEditingItemsForm(entradasByRemision(remision.idRegistro).map(it => ({ idRegistro: it.idRegistro, codigo: it.codigo, item: it.item, cantidad: it.cantidad })));
  };

  const actualizarItemRemisionForm = (idx: number, campo: 'codigo' | 'item' | 'cantidad', valor: string) => {
    setEditingItemsForm(prev => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  };
  const agregarItemRemisionForm = () => setEditingItemsForm(prev => [...prev, { codigo: '', item: '', cantidad: '' }]);
  const quitarItemRemisionForm = (idx: number) => setEditingItemsForm(prev => prev.filter((_, i) => i !== idx));

  const handleDeleteNotaSalida = async (nota: NotaSalida) => {
    if (!confirm(`Eliminar nota de salida "${nota.orden || nota.idRegistro}" y todas sus salidas relacionadas?`)) return;
    try {
      const salidasRelacionadas = salidasByNota(nota.idRegistro);
      for (const salida of salidasRelacionadas) {
        await apiFetch(`/api/epp/salidas/${salida.idRegistro}`, { method: 'DELETE' });
      }
      await apiFetch(`/api/epp/notas-salida/${nota.idRegistro}`, { method: 'DELETE' });
      fetchData();
      alert('Nota y salidas relacionadas eliminadas');
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const toggleSeleccionNota = (idRegistro: string) => {
    setNotasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(idRegistro)) next.delete(idRegistro); else next.add(idRegistro);
      return next;
    });
  };

  const toggleSeleccionarTodasNotas = () => {
    if (notasSeleccionadas.size === notasFiltradas.length) {
      setNotasSeleccionadas(new Set());
    } else {
      setNotasSeleccionadas(new Set(notasFiltradas.map(n => n.idRegistro)));
    }
  };

  const handleBulkDeleteNotas = async () => {
    if (notasSeleccionadas.size === 0) return;
    if (!confirm(`Eliminar ${notasSeleccionadas.size} nota(s) de salida seleccionada(s) y todas sus salidas relacionadas?`)) return;
    try {
      const aEliminar = notasSalida.filter(n => notasSeleccionadas.has(n.idRegistro));
      for (const nota of aEliminar) {
        const salidasRelacionadas = salidasByNota(nota.idRegistro);
        for (const salida of salidasRelacionadas) {
          await apiFetch(`/api/epp/salidas/${salida.idRegistro}`, { method: 'DELETE' });
        }
        await apiFetch(`/api/epp/notas-salida/${nota.idRegistro}`, { method: 'DELETE' });
      }
      const cantidad = aEliminar.length;
      setNotasSeleccionadas(new Set());
      fetchData();
      alert(`${cantidad} nota(s) de salida eliminada(s) correctamente.`);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleEditNotaSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNotaDetail) return;
    const quienRetiraFinal = editingNotaForm.quienRetira || busquedaQuienRetira.trim();
    if (!quienRetiraFinal) {
      alert('Indique quien retira los productos');
      return;
    }
    try {
      const response = await apiFetch(`/api/epp/notas-salida/${showNotaDetail.idRegistro}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingNotaForm, quienRetira: quienRetiraFinal }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }

      // Sincroniza las salidas (items) de la nota: actualiza las existentes,
      // crea las agregadas y borra las que se quitaron del formulario.
      const itemsValidos = editingSalidasForm.filter(it => it.refItem.trim() && it.cantidad.trim());
      const idsActuales = new Set(itemsValidos.filter(it => it.idRegistro).map(it => it.idRegistro));
      const idsOriginales = salidasByNota(showNotaDetail.idRegistro).map(s => s.idRegistro);
      const idsAEliminar = idsOriginales.filter(id => !idsActuales.has(id));

      await Promise.all([
        ...itemsValidos.map((it, idx) => {
          const body = { refItem: it.refItem, cantidad: it.cantidad.trim(), trabajadorRetira: quienRetiraFinal };
          return it.idRegistro
            ? apiFetch(`/api/epp/salidas/${it.idRegistro}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            : apiFetch('/api/epp/salidas', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...body, idRegistro: `SAL-${Date.now()}-${idx}`, refNotaSalida: showNotaDetail.idRegistro }),
              });
        }),
        ...idsAEliminar.map(id => apiFetch(`/api/epp/salidas/${id}`, { method: 'DELETE' })),
      ]);

      setShowNotaDetail(null);
      setEditingNotaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      setEditingSalidasForm([]);
      setBusquedaQuienRetira('');
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  // Ver y editar una nota son la misma cosa: al hacer click en la fila se
  // expande el detalle, ya directamente editable (incluidas las salidas),
  // igual que en Remisiones.
  const toggleExpandNota = (nota: NotaSalida) => {
    if (showNotaDetail?.idRegistro === nota.idRegistro) { setShowNotaDetail(null); return; }
    setShowNotaDetail(nota);
    setEditingNotaForm({
      orden: nota.orden,
      fecha: nota.fecha,
      quienRetira: nota.quienRetira,
      observaciones: nota.observaciones,
    });
    setEditingSalidasForm(salidasByNota(nota.idRegistro).map(s => ({ idRegistro: s.idRegistro, refItem: s.refItem, cantidad: s.cantidad, busqueda: '' })));
    const empActual = buscarEmpleado(nota.quienRetira);
    setBusquedaQuienRetira(empActual ? `${empActual.nombres} ${empActual.apellidos} - CI: ${empActual.nroDocumento}` : nota.quienRetira);
  };

  const actualizarSalidaItemForm = (idx: number, campo: 'refItem' | 'cantidad' | 'busqueda', valor: string) => {
    setEditingSalidasForm(prev => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  };
  const agregarSalidaItemForm = () => setEditingSalidasForm(prev => [...prev, { refItem: '', cantidad: '', busqueda: '' }]);
  const quitarSalidaItemForm = (idx: number) => setEditingSalidasForm(prev => prev.filter((_, i) => i !== idx));
  const seleccionarProductoSalidaForm = (idx: number, codigo: string) => {
    setEditingSalidasForm(prev => prev.map((it, i) => (i === idx ? { ...it, refItem: codigo, busqueda: '' } : it)));
    setFilaBusquedaSalidaActiva(null);
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const productosConStock = productosFiltrados.filter(p => stockDisponible(p.codigo) > 0);
  const productosAgotados = productosFiltrados.filter(p => stockDisponible(p.codigo) === 0);
  const productosConStockSalida = productos.filter(p => stockDisponible(p.codigo) > 0);

  const clasificacionesSugeridas = [...new Set([...clasificaciones, ...productos.map(p => p.clasificacion).filter(Boolean)])]
    .sort((a, b) => a.localeCompare(b, 'es'));

  const proveedoresSugeridos = [...new Set(productos.map(p => p.proveedor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));

  const termBusqueda = searchTerm.toLowerCase();

  const remisionesFiltradas = remisiones.filter(r => {
    if (r.proveedor.toLowerCase().includes(termBusqueda) || r.numeracion.toLowerCase().includes(termBusqueda)) return true;
    const items = entradasProyecto.filter(e => e.refRemision === r.idRegistro);
    return items.some(e =>
      e.codigo.toLowerCase().includes(termBusqueda) ||
      e.item.toLowerCase().includes(termBusqueda) ||
      productos.find(p => p.codigo === e.codigo)?.nombre.toLowerCase().includes(termBusqueda)
    );
  });

  const notasFiltradas = notasSalida.filter(n => {
    if (n.orden.toLowerCase().includes(termBusqueda) || n.quienRetira.toLowerCase().includes(termBusqueda)) return true;
    const items = salidas.filter(s => s.refNotaSalida === n.idRegistro);
    return items.some(s => {
      const prod = productos.find(p => p.codigo === s.refItem);
      return s.refItem.toLowerCase().includes(termBusqueda) || prod?.nombre.toLowerCase().includes(termBusqueda);
    });
  }).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

  const solicitudesFiltradas = solicitudes.filter(s =>
    s.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supervisor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

  const startNewSolicitud = () => {
    setEditingSolicitud(null);
    setSolicitudForm(emptySolicitudForm);
    setShowSolicitudForm(true);
  };

  const startEditSolicitud = (s: SolicitudSuministro) => {
    setEditingSolicitud(s);
    setSolicitudForm({
      fecha: s.fecha,
      supervisor: s.supervisor,
      actividad: s.actividad,
      ubicacion: s.ubicacion,
      proveedor: s.proveedor,
      fechaLimiteEntrega: s.fechaLimiteEntrega,
      observaciones: s.observaciones,
      items: s.items.length > 0 ? s.items.map((it, i) => ({ ...it, item: it.item || String(i + 1) })) : [{ item: '1', producto: '', unidad: '', cantidad: '', cuenta: '', proveedor: '' }],
    });
    setShowSolicitudForm(true);
    setSolicitudExpandida(null);
  };

  const closeSolicitudForm = () => {
    setShowSolicitudForm(false);
    setEditingSolicitud(null);
    setSolicitudForm(emptySolicitudForm);
  };

  const handleAddItem = () => {
    setSolicitudForm(prev => ({
      ...prev,
      items: [...prev.items, { item: String(prev.items.length + 1), producto: '', unidad: '', cantidad: '', cuenta: '', proveedor: '' }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setSolicitudForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((it, i) => ({ ...it, item: String(i + 1) })),
    }));
  };

  const handleItemChange = (index: number, field: keyof ItemSolicitud, value: string) => {
    setSolicitudForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === index ? { ...it, [field]: value } : it),
    }));
  };

  const handleSubmitSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...solicitudForm,
        proyecto,
        userEmail: 'sistema',
        idRegistro: editingSolicitud ? editingSolicitud.idRegistro : `SOL-${Date.now()}`,
      };
      const url = editingSolicitud ? `/api/epp/solicitudes-suministro/${editingSolicitud.idRegistro}` : '/api/epp/solicitudes-suministro';
      const method = editingSolicitud ? 'PUT' : 'POST';
      const response = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      closeSolicitudForm();
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleDeleteSolicitud = async (s: SolicitudSuministro) => {
    if (!confirm(`Eliminar solicitud Nº ${s.numero}?`)) return;
    try {
      const response = await apiFetch(`/api/epp/solicitudes-suministro/${s.idRegistro}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleToggleEstadoSolicitud = async (s: SolicitudSuministro) => {
    const estados = ['Pendiente', 'Entregada', 'Cancelada'];
    const idx = estados.indexOf(s.estado || 'Pendiente');
    const nuevoEstado = estados[(idx + 1) % estados.length];
    try {
      const response = await apiFetch(`/api/epp/solicitudes-suministro/${s.idRegistro}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const badgeEstadoSolicitud = (estado: string) => {
    const map: Record<string, string> = {
      Pendiente: 'bg-amber-500/10 text-amber-500',
      Entregada: 'bg-green-500/10 text-green-500',
      Cancelada: 'bg-red-500/10 text-red-500',
    };
    return map[estado] || 'bg-muted text-muted-foreground';
  };

  const descargarPDFSolicitud = async (s: SolicitudSuministro) => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageW = 210;
    const m = 10;
    const w = pageW - m * 2;
    const logo = await fetchLogoData(proyectoLogo);
    const logoSize = logo ? computeLogoSize(doc, logo, 8, 32) : null;

    const cols = [8, 109, 8, 8, 22, 25];
    const headers = ['Ítem', 'Producto', 'Un.', 'Cant.', 'Cuenta', 'Proveedor'];
    const x0 = m;

    const renderCopy = (startY: number) => {
      let y = startY;

      // Encabezado proyecto (derecha): si hay logo, se muestra solo el logo;
      // si no hay logo, se muestra el nombre del proyecto en su lugar.
      if (logo && logoSize) {
        doc.addImage(logo.dataUrl, logo.format, pageW - m - logoSize.width, y, logoSize.width, logoSize.height);
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(proyecto, pageW - m - 2, y + 5, { align: 'right' });
      }

      // Titulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SOLICITUD DE SUMINISTRO', m, y + 6);

      y += 14;

      // Nro y Fecha
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Nº ${s.numero || '-'}`, pageW - m - 2, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${s.fecha ? formatearFecha(s.fecha) : '-'}`, pageW - m - 2, y + 4, { align: 'right' });

      y += 10;

      // Campos cabecera
      const campo = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${label}:`, m, y);
        const labelW = doc.getTextWidth(`${label}:`);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '-', m + labelW + 2, y);
        doc.setLineWidth(0.1);
        doc.line(m + labelW + 2, y + 1, pageW - m, y + 1);
        y += 6;
      };

      campo('Supervisor', s.supervisor);
      campo('Actividad', s.actividad);
      campo('Ubicación', s.ubicacion);
      campo('Proveedor', s.proveedor);
      campo('Fecha límite de entrega', s.fechaLimiteEntrega ? formatearFecha(s.fechaLimiteEntrega) : '');

      y += 3;

      // Tabla de items
      doc.setFillColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.rect(x0, y, w, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      let x = x0;
      headers.forEach((h, i) => {
        doc.text(h, x + 1, y + 4);
        x += cols[i];
      });
      doc.rect(x0, y, w, 6);
      x = x0;
      cols.forEach((cw, i) => {
        if (i < cols.length - 1) doc.line(x + cw, y, x + cw, y + 6);
        x += cw;
      });
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      const items = s.items.length > 0 ? s.items : [{ item: '', producto: '', unidad: '', cantidad: '', cuenta: '', proveedor: '' }];
      items.forEach((it) => {
        const prod = productos.find(p => p.nombre.trim().toLowerCase() === (it.producto || '').trim().toLowerCase());
        const productoText = prod ? `${prod.codigo} - ${prod.nombre}` : (it.producto || '');
        const productoLines = doc.splitTextToSize(productoText, cols[1] - 2);
        const rowH = 3 + productoLines.length * 2.2;
        x = x0;
        const vals: (string | string[])[] = [it.item || '', productoLines, it.unidad || '', it.cantidad || '', it.cuenta || '', it.proveedor || ''];
        vals.forEach((val, i) => {
          const text = Array.isArray(val) ? val : [String(val)];
          doc.text(text, x + 1, y + 3);
          x += cols[i];
        });
        doc.rect(x0, y, w, rowH);
        x = x0;
        cols.forEach((cw, i) => {
          if (i < cols.length - 1) doc.line(x + cw, y, x + cw, y + rowH);
          x += cw;
        });
        y += rowH;
      });

      y += 4;

      // Observaciones
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Observaciones:', m, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setLineWidth(0.1);
      doc.rect(m, y, w, 14);
      const obsLines = doc.splitTextToSize(s.observaciones || '-', w - 4);
      doc.text(obsLines, m + 2, y + 4);
      y += 18;

      // Firmas
      const firmaW = (w - 20) / 3;
      const firmas = ['SUPERVISOR', 'GERENTE', 'ADMINISTRACIÓN'];
      let fx = m;
      doc.setLineWidth(0.1);
      firmas.forEach((f) => {
        doc.line(fx, y + 10, fx + firmaW, y + 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(f, fx + firmaW / 2, y + 14, { align: 'center' });
        fx += firmaW + 10;
      });
      y += 16;

      return y;
    };

    let y1 = renderCopy(m);
    doc.setLineWidth(0.2);
    doc.rect(m, m, w, y1 - m);

    // Separador entre copias
    doc.setLineWidth(0.1);
    doc.setDrawColor(150, 150, 150);
    doc.line(m, y1 + 3, pageW - m, y1 + 3);
    doc.setDrawColor(0, 0, 0);

    const estimatedH = y1 - m;
    let y2Start = y1 + 6;
    if (y2Start + estimatedH > 287) {
      doc.addPage();
      y2Start = m;
    }
    let y2 = renderCopy(y2Start);
    doc.setLineWidth(0.2);
    doc.rect(m, y2Start, w, y2 - y2Start);

    doc.save(`Solicitud_Suministro_${s.numero || s.idRegistro}.pdf`);
  };

  const descargarPDFNotaSalida = async (n: NotaSalida) => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageW = 210;
    const m = 10;
    const w = pageW - m * 2;
    const logo = await fetchLogoData(proyectoLogo);
    const logoSize = logo ? computeLogoSize(doc, logo, 8, 32) : null;

    const cols = [12, 35, 98, 30];
    const headers = ['Ítem', 'Código', 'Producto', 'Cantidad'];
    const x0 = m;

    const renderCopy = (startY: number) => {
      let y = startY;

      // Encabezado proyecto (derecha): si hay logo, se muestra solo el logo;
      // si no hay logo, se muestra el nombre del proyecto en su lugar.
      if (logo && logoSize) {
        doc.addImage(logo.dataUrl, logo.format, pageW - m - logoSize.width, y, logoSize.width, logoSize.height);
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(proyecto, pageW - m - 2, y + 5, { align: 'right' });
      }

      // Titulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTA DE SALIDA', m, y + 6);

      y += 14;

      // Nro y Fecha
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Nº ${n.orden || n.idRegistro || '-'}`, pageW - m - 2, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${n.fecha ? formatearFecha(n.fecha) : '-'}`, pageW - m - 2, y + 4, { align: 'right' });

      y += 10;

      // Campos cabecera
      const campo = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${label}:`, m, y);
        const labelW = doc.getTextWidth(`${label}:`);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '-', m + labelW + 2, y);
        doc.setLineWidth(0.1);
        doc.line(m + labelW + 2, y + 1, pageW - m, y + 1);
        y += 6;
      };

      campo('Quien Retira', nombreQuienRetira(n.quienRetira));
      campo('Observaciones', n.observaciones);

      y += 3;

      // Tabla de items
      const items = salidasByNota(n.idRegistro);
      doc.setFillColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.rect(x0, y, w, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      let x = x0;
      headers.forEach((h, i) => {
        doc.text(h, x + 1, y + 4);
        x += cols[i];
      });
      doc.rect(x0, y, w, 6);
      x = x0;
      cols.forEach((cw, i) => {
        if (i < cols.length - 1) doc.line(x + cw, y, x + cw, y + 6);
        x += cw;
      });
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      if (items.length > 0) {
        items.forEach((it, idx) => {
          const prod = productos.find(p => p.codigo === it.refItem);
          const productoText = prod ? `${prod.codigo} - ${prod.nombre}` : (it.refItem || '');
          const productoLines = doc.splitTextToSize(productoText, cols[2] - 2);
          const rowH = 3 + productoLines.length * 2.2;
          x = x0;
          const vals: (string | string[])[] = [String(idx + 1), prod?.codigo || it.refItem || '', productoLines, it.cantidad || ''];
          vals.forEach((val, i) => {
            const text = Array.isArray(val) ? val : [String(val)];
            doc.text(text, x + 1, y + 3);
            x += cols[i];
          });
          doc.rect(x0, y, w, rowH);
          x = x0;
          cols.forEach((cw, i) => {
            if (i < cols.length - 1) doc.line(x + cw, y, x + cw, y + rowH);
            x += cw;
          });
          y += rowH;
        });
      } else {
        doc.rect(x0, y, w, 8);
        doc.text('Sin items', x0 + 1, y + 5);
        y += 8;
      }

      y += 6;

      // Firmas
      const firmaW = (w - 20) / 3;
      const firmas = ['QUIEN RETIRA', 'ENTREGA', 'ADMINISTRACIÓN'];
      let fx = m;
      doc.setLineWidth(0.1);
      firmas.forEach((f) => {
        doc.line(fx, y + 10, fx + firmaW, y + 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(f, fx + firmaW / 2, y + 14, { align: 'center' });
        fx += firmaW + 10;
      });
      y += 16;

      return y;
    };

    let y1 = renderCopy(m);
    doc.setLineWidth(0.2);
    doc.rect(m, m, w, y1 - m);

    // Separador entre copias
    doc.setLineWidth(0.1);
    doc.setDrawColor(150, 150, 150);
    doc.line(m, y1 + 3, pageW - m, y1 + 3);
    doc.setDrawColor(0, 0, 0);

    const estimatedH = y1 - m;
    let y2Start = y1 + 6;
    if (y2Start + estimatedH > 287) {
      doc.addPage();
      y2Start = m;
    }
    let y2 = renderCopy(y2Start);
    doc.setLineWidth(0.2);
    doc.rect(m, y2Start, w, y2 - y2Start);

    doc.save(`Nota_Salida_${n.orden || n.idRegistro}.pdf`);
  };

  const productosDeGrupo = (grupo: { match: (clasificacionNormalizada: string) => boolean }) => {
    return productos
      .filter(p => grupo.match(normalizarClasificacion(p.clasificacion || '')))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const claveItemPlanilla = (grupoNombre: string, codigo: string) => `${grupoNombre}__${codigo}`;

  const toggleGrupoPlanilla = (nombre: string) => {
    setGruposSeleccionadosPlanilla(prev => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre); else next.add(nombre);
      return next;
    });
  };

  const toggleItemPlanilla = (grupoNombre: string, codigo: string) => {
    setItemsExcluidosPlanilla(prev => {
      const next = new Set(prev);
      const clave = claveItemPlanilla(grupoNombre, codigo);
      if (next.has(clave)) next.delete(clave); else next.add(clave);
      return next;
    });
  };

  // Planilla de entrega de EPP: una "mini orden de salida" en blanco por
  // grupo de EPP, con los productos de esa clasificacion precargados como
  // filas (solo falta completar cantidad, quien retira y firmas a mano).
  const generarPlanillaEntregaEPP = async () => {
    const gruposActivos = GRUPOS_PLANILLA_EPP.filter(g => gruposSeleccionadosPlanilla.has(g.nombre));
    if (gruposActivos.length === 0) { alert('Selecciona al menos un grupo.'); return; }

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageW = 210;
    const pageH = 297;
    const m = 10;
    const w = pageW - m * 2;
    const logo = await fetchLogoData(proyectoLogo);
    const logoSize = logo ? computeLogoSize(doc, logo, 8, 32) : null;

    const cols = [12, 35, 98, 30];
    const headers = ['Ítem', 'Código', 'Producto', 'Cantidad'];
    const x0 = m;

    const dibujarEncabezadoTabla = (y: number) => {
      doc.setFillColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.rect(x0, y, w, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      let x = x0;
      headers.forEach((h, i) => {
        doc.text(h, x + 1, y + 4);
        x += cols[i];
      });
      doc.rect(x0, y, w, 6);
      x = x0;
      cols.forEach((cw, i) => {
        if (i < cols.length - 1) doc.line(x + cw, y, x + cw, y + 6);
        x += cw;
      });
      return y + 6;
    };

    // Dibuja una "mini nota de salida" en blanco para el grupo dado, a partir
    // de startY, y devuelve el Y final (para poder repetirla cuantas veces
    // quepan en la hoja y para trazar el recuadro que la bordea).
    const renderNota = (grupo: { nombre: string; match: (clasificacionNormalizada: string) => boolean }, startY: number) => {
      let y = startY;

      if (logo && logoSize) {
        doc.addImage(logo.dataUrl, logo.format, pageW - m - logoSize.width, y, logoSize.width, logoSize.height);
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(proyecto, pageW - m - 2, y + 4, { align: 'right' });
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTA DE SALIDA', m, y + 6);
      const tituloW = doc.getTextWidth('NOTA DE SALIDA');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Entrega de EPP - ${grupo.nombre}`, m + tituloW + 4, y + 6);

      y += 14;

      // El numero se autoasigna al procesar la planilla con IA (foto), por
      // eso no se precarga un campo "Nº" -- solo la fecha, en blanco.
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha:', pageW - m - 40, y);
      doc.setLineWidth(0.1);
      doc.line(pageW - m - 28, y + 1, pageW - m, y + 1);

      const campoBlanco = (label: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${label}:`, m, y);
        const labelW = doc.getTextWidth(`${label}:`);
        doc.setLineWidth(0.1);
        doc.line(m + labelW + 2, y + 1, pageW - m, y + 1);
        y += 6;
      };

      campoBlanco('Quien Retira (CI/NOMBRE/FIRMA)');
      campoBlanco('Observaciones');

      y += 3;

      y = dibujarEncabezadoTabla(y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      const items = productosDeGrupo(grupo).filter(p => !itemsExcluidosPlanilla.has(claveItemPlanilla(grupo.nombre, p.codigo)));
      if (items.length > 0) {
        items.forEach((p, idx) => {
          const productoLines = doc.splitTextToSize(p.nombre, cols[2] - 2);
          const rowH = Math.max(6, 3 + productoLines.length * 2.2);
          let x = x0;
          const vals: (string | string[])[] = [String(idx + 1), p.codigo, productoLines, ''];
          vals.forEach((val, i) => {
            const text = Array.isArray(val) ? val : [String(val)];
            doc.text(text, x + 1, y + 3);
            x += cols[i];
          });
          doc.rect(x0, y, w, rowH);
          x = x0;
          cols.forEach((cw, i) => {
            if (i < cols.length - 1) doc.line(x + cw, y, x + cw, y + rowH);
            x += cw;
          });
          y += rowH;
        });
      } else {
        doc.rect(x0, y, w, 8);
        doc.text('Sin productos registrados en esta clasificación', x0 + 1, y + 5);
        y += 8;
      }

      y += 4;

      return y;
    };

    gruposActivos.forEach((grupo, idxGrupo) => {
      if (idxGrupo > 0) doc.addPage();
      let yInicioCopia = m;

      while (true) {
        const yFin = renderNota(grupo, yInicioCopia);
        doc.setLineWidth(0.2);
        doc.rect(m, yInicioCopia, w, yFin - yInicioCopia);

        const alturaCopia = yFin - yInicioCopia;
        const siguienteInicio = yFin + 6;
        if (siguienteInicio + alturaCopia > pageH - m) break;

        doc.setLineWidth(0.1);
        doc.setDrawColor(150, 150, 150);
        doc.line(m, yFin + 3, pageW - m, yFin + 3);
        doc.setDrawColor(0, 0, 0);

        yInicioCopia = siguienteInicio;
      }
    });

    doc.save(`Planilla_Entrega_EPP_${proyecto.replace(/\s+/g, '_')}.pdf`);
    setPlanillaAbierta(false);
  };

  const renderFilaProducto = (p: Producto) => {
    const entradas = totalEntradasByProducto(p.codigo);
    const salidas = totalSalidasByProducto(p.codigo);
    const stock = stockDisponible(p.codigo);
    const bajo = isStockBajo(p);
    const editando = showProductoEdit?.codigo === p.codigo;
    const ajustando = ajusteProductoSeleccionado?.codigo === p.codigo;
    return (
      <Fragment key={p.codigo}>
      <tr onClick={() => startEditProducto(p)} {...longPressHandlers(() => toggleSeleccionProducto(p.codigo))} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0 select-none ${bajo ? 'bg-red-500/5' : ''} ${editando || ajustando ? 'bg-secondary/20' : ''}`}>
        {productosSeleccionados.size > 0 && (
          <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={productosSeleccionados.has(p.codigo)} onChange={() => toggleSeleccionProducto(p.codigo)} className="rounded" />
          </td>
        )}
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Codigo: </span>{p.codigo}</td>
        <td className="px-4 py-3 font-medium block sm:table-cell">{p.nombre}</td>
        <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Proveedor: </span>{p.proveedor || '-'}</td>
        <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Clasificación: </span>{p.clasificacion || '-'}</td>
        <td className="px-4 py-3 text-right font-mono text-emerald-400 block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Entradas: </span>{entradas}</td>
        <td className="px-4 py-3 text-right font-mono text-amber-400 block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Salidas: </span>{salidas}</td>
        <td className="px-4 py-3 text-right font-mono font-bold block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Stock: </span>{stock}</td>
        <td className="px-4 py-3 text-center block sm:table-cell">
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
        <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
            <button onClick={() => startAjusteStock(p)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-blue-400" title="Ajustar stock"><Boxes size={16} /></button>
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="bg-secondary/10 border-b border-border/50">
          <td colSpan={9} className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditProducto} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Codigo *</label>
                <input type="text" value={editingProductoForm.codigo} onChange={(e) => setEditingProductoForm({...editingProductoForm, codigo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Nombre</label>
                <input type="text" value={editingProductoForm.nombre} onChange={(e) => setEditingProductoForm({...editingProductoForm, nombre: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Proveedor</label>
                <input type="text" list="proveedores-datalist" value={editingProductoForm.proveedor} onChange={(e) => setEditingProductoForm({...editingProductoForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Clasificacion</label>
                <input type="text" list="clasificaciones-datalist" value={editingProductoForm.clasificacion} onChange={(e) => setEditingProductoForm({...editingProductoForm, clasificacion: e.target.value})} placeholder="Elegi una o escribi una nueva..." className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Stock Minimo</label>
                <input type="number" value={editingProductoForm.stockMinimo} onChange={(e) => setEditingProductoForm({...editingProductoForm, stockMinimo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div className="flex items-end gap-2 md:col-span-4">
                <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                <button type="button" onClick={() => setShowProductoEdit(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
                <button type="button" onClick={() => handleDeleteProducto(p)} className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors flex items-center gap-2 ml-auto"><Trash2 size={18} /> Eliminar</button>
              </div>
            </form>
          </td>
        </tr>
      )}
      {ajustando && (
        <tr className="bg-blue-500/5 border-b border-border/50">
          <td colSpan={productosSeleccionados.size > 0 ? 11 : 10} className="px-6 py-4">
            <form onSubmit={handleSubmitAjuste} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Producto</label>
                <p className="font-medium text-sm py-2">{p.nombre} <span className="text-muted-foreground">({p.codigo})</span></p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Tipo de ajuste</label>
                <select value={ajusteForm.tipo} onChange={(e) => setAjusteForm({...ajusteForm, tipo: e.target.value as 'positivo' | 'negativo'})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50">
                  <option value="positivo">Incrementar stock</option>
                  <option value="negativo">Disminuir stock</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Cantidad *</label>
                <input type="number" min="0" step="any" value={ajusteForm.cantidad} onChange={(e) => setAjusteForm({...ajusteForm, cantidad: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" required />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase mb-1">Motivo</label>
                <input type="text" value={ajusteForm.motivo} onChange={(e) => setAjusteForm({...ajusteForm, motivo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              </div>
              <div className="flex items-end gap-2 md:col-span-4">
                <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Ajuste</button>
                <button type="button" onClick={closeAjusteForm} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
              </div>
            </form>
          </td>
        </tr>
      )}
      </Fragment>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <datalist id="clasificaciones-datalist">
        {clasificacionesSugeridas.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="proveedores-datalist">
        {proveedoresSugeridos.map(p => <option key={p} value={p} />)}
      </datalist>
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
          <button
            type="button"
            onClick={() => setPlanillaAbierta(v => !v)}
            className={`border px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm ${planillaAbierta ? 'bg-primary text-white border-primary' : 'bg-secondary border-border hover:bg-secondary/80'}`}
            title="Genera un PDF con una hoja por grupo de EPP, con los productos de cada clasificación precargados"
          >
            <ClipboardList size={16} /> Planilla de Entrega EPP
          </button>
          <div ref={reportesRef}>
            <button
              type="button"
              onClick={() => setReportesAbierto(v => !v)}
              className={`border px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm ${reportesAbierto ? 'bg-primary text-white border-primary' : 'bg-secondary border-border hover:bg-secondary/80'}`}
            >
              <FileSpreadsheet size={16} /> Reportes
            </button>
          </div>
        </div>
      </div>

      {reportesAbierto && (
        <div className="bg-card border border-border rounded-xl p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileDown size={20} className="text-primary" />
              Exportar reporte
            </h3>
            <button onClick={() => setReportesAbierto(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              { key: 'inventario', label: 'Inventario Actual', desc: 'Productos con stock y estado', icon: Package, color: 'text-blue-400' },
              { key: 'entradas', label: 'Entradas por Clasificación', desc: 'Historial de entradas al inventario, agrupado por clasificación', icon: Boxes, color: 'text-emerald-400' },
              { key: 'salidas', label: 'Salidas por Trabajador', desc: 'Entregas de EPP a empleados', icon: ArrowDownCircle, color: 'text-red-400' },
              { key: 'salidasPorProducto', label: 'Salidas por Producto', desc: 'Entregas de EPP agrupadas por producto', icon: Truck, color: 'text-orange-400' },
              { key: 'dotacion', label: 'Dotación de Calzados', desc: 'Control de botines por trabajador', icon: Footprints, color: 'text-amber-400' },
            ].map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setReporteSeleccionado(opt.key as TipoReporte)}
                className={`text-left p-4 rounded-xl border flex items-center gap-3 transition-colors ${reporteSeleccionado === opt.key ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:bg-secondary/80'}`}
              >
                <opt.icon size={20} className={opt.color} />
                <div>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground uppercase">Período</span>
            <select
              value={reporteMes}
              onChange={(e) => setReporteMes(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
              className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
            >
              <option value="todos">Todos los meses</option>
              {MESES_REPORTE.map((nombre, idx) => (
                <option key={idx} value={idx + 1}>{nombre}</option>
              ))}
            </select>
            {reporteMes !== 'todos' && (
              <select
                value={reporteAnio}
                onChange={(e) => setReporteAnio(Number(e.target.value))}
                className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i).map(anio => (
                  <option key={anio} value={anio}>{anio}</option>
                ))}
              </select>
            )}
            {(reporteSeleccionado === 'inventario' || reporteSeleccionado === 'dotacion') && reporteMes !== 'todos' && (
              <span className="text-xs text-muted-foreground">(no aplica a este reporte, muestra el estado actual)</span>
            )}
          </div>

          {reporteSeleccionado === 'dotacion' && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground uppercase">Alerta</span>
              <select
                value={reporteAlertaFiltro}
                onChange={(e) => setReporteAlertaFiltro(e.target.value)}
                className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
              >
                <option value="todas">Todas</option>
                <option value="OK">OK</option>
                <option value="Proximo a vencer">Próximo a vencer</option>
                <option value="Vencido">Vencido</option>
                <option value="Sin dotacion registrada">Sin dotación registrada</option>
              </select>
              <span className="text-xs text-muted-foreground uppercase ml-2">Estado</span>
              <select
                value={reporteEstadoFiltro}
                onChange={(e) => setReporteEstadoFiltro(e.target.value as 'todos' | 'Activo' | 'Inactivo')}
                className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
              >
                <option value="todos">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportarReporte(reporteSeleccionado, 'pdf')}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <FileDown size={18} /> Generar PDF
            </button>
            <button
              type="button"
              onClick={() => exportarReporte(reporteSeleccionado, 'excel')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FileSpreadsheet size={18} /> Generar Excel
            </button>
            <button
              type="button"
              onClick={() => setReporteSeleccionado('inventario')}
              className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setReportesAbierto(false)}
              className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {planillaAbierta && (
        <div className="bg-card border border-border rounded-xl p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList size={20} className="text-primary" />
              Planilla de Entrega EPP
            </h3>
            <button onClick={() => setPlanillaAbierta(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>

          <p className="text-xs text-muted-foreground mb-4">Elegí qué grupos incluir en el PDF y destildá los productos que no quieras que aparezcan en las notas.</p>

          <div className="space-y-3 mb-4">
            {GRUPOS_PLANILLA_EPP.map(grupo => {
              const items = productosDeGrupo(grupo);
              const seleccionado = gruposSeleccionadosPlanilla.has(grupo.nombre);
              return (
                <div key={grupo.nombre} className={`border rounded-xl p-4 transition-colors ${seleccionado ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={seleccionado} onChange={() => toggleGrupoPlanilla(grupo.nombre)} className="rounded" />
                    <span className="font-medium text-sm">{grupo.nombre}</span>
                    <span className="text-xs text-muted-foreground">({items.length} producto{items.length !== 1 ? 's' : ''})</span>
                  </label>
                  {seleccionado && (
                    items.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-6 mt-2">Sin productos registrados en esta clasificación</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-6 mt-3">
                        {items.map(p => {
                          const excluido = itemsExcluidosPlanilla.has(claveItemPlanilla(grupo.nombre, p.codigo));
                          return (
                            <label key={p.codigo} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={!excluido} onChange={() => toggleItemPlanilla(grupo.nombre, p.codigo)} className="rounded" />
                              <span className={excluido ? 'line-through text-muted-foreground' : 'text-foreground'}>{p.codigo} - {p.nombre}</span>
                            </label>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generarPlanillaEntregaEPP}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <FileDown size={18} /> Generar PDF
            </button>
            <button
              type="button"
              onClick={() => setPlanillaAbierta(false)}
              className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'productos' as VistaEPP, label: 'Productos', icon: Package },
          { id: 'remisiones' as VistaEPP, label: 'Remisiones', icon: Truck },
          { id: 'entregas' as VistaEPP, label: 'Notas de Salida', icon: ArrowDownCircle },
          { id: 'dotacion' as VistaEPP, label: 'Dotacion de Calzados', icon: Footprints },
          { id: 'solicitudes' as VistaEPP, label: 'Solicitud de Suministro', icon: FileSpreadsheet },
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
            <div className="flex gap-2">
              {productosSeleccionados.size > 0 && (
                <button onClick={handleBulkDeleteProductos} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-500/20 transition-colors text-sm">
                  <Trash2 size={16} /> Eliminar ({productosSeleccionados.size})
                </button>
              )}
              <button onClick={() => setShowProductoForm(true)} className="bg-secondary border border-border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
                <Plus size={16} /> Nuevo Producto
              </button>
            </div>
          </div>

          {showProductoForm && (
            <div className="glass-card p-6 scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Nuevo Producto</h3>
                <button onClick={() => setShowProductoForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddProducto} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-2">Codigo *</label><input type="text" value={productoForm.codigo} onChange={(e) => setProductoForm({...productoForm, codigo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required /></div>
                <div><label className="block text-sm font-medium mb-2">Nombre *</label><input type="text" value={productoForm.nombre} onChange={(e) => setProductoForm({...productoForm, nombre: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required /></div>
                <div><label className="block text-sm font-medium mb-2">Proveedor</label><input type="text" list="proveedores-datalist" value={productoForm.proveedor} onChange={(e) => setProductoForm({...productoForm, proveedor: e.target.value})} placeholder="Elegi uno o escribi uno nuevo..." className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                <div><label className="block text-sm font-medium mb-2">Clasificacion</label><input type="text" list="clasificaciones-datalist" value={productoForm.clasificacion} onChange={(e) => setProductoForm({...productoForm, clasificacion: e.target.value})} placeholder="Elegi una o escribi una nueva..." className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
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
                <table className="w-full text-sm block sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="bg-secondary/50 border-b border-border">
                      {productosSeleccionados.size > 0 && (
                        <th className="px-4 py-3 w-8">
                          <input type="checkbox" checked={productosFiltrados.length > 0 && productosSeleccionados.size === productosFiltrados.length} onChange={toggleSeleccionarTodosProductos} className="rounded" />
                        </th>
                      )}
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Codigo</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nombre</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Proveedor</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Clasificación</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Entradas</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Salidas</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Stock</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="block sm:table-row-group">
                    {productosConStock.map(renderFilaProducto)}
                    {productosAgotados.length > 0 && (
                      <tr className="bg-secondary/80">
                        <td colSpan={productosSeleccionados.size > 0 ? 10 : 9} className="py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Agotados ({productosAgotados.length})
                        </td>
                      </tr>
                    )}
                    {productosAgotados.map(renderFilaProducto)}
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
              {remisionesSeleccionadas.size > 0 && (
                <button onClick={handleBulkDeleteRemisiones} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-500/20 transition-colors text-sm">
                  <Trash2 size={16} /> Eliminar ({remisionesSeleccionadas.size})
                </button>
              )}
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
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Nueva Remision</h3><button onClick={() => setShowRemisionForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button></div>
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
                <table className="w-full text-sm block sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="bg-secondary/50 border-b border-border">
                      {remisionesSeleccionadas.size > 0 && (
                        <th className="px-4 py-3 w-8">
                          <input type="checkbox" checked={remisionesFiltradas.length > 0 && remisionesSeleccionadas.size === remisionesFiltradas.length} onChange={toggleSeleccionarTodasRemisiones} className="rounded" />
                        </th>
                      )}
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Numeracion</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Proveedor</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Items</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="block sm:table-row-group">
                    {[...remisionesFiltradas].sort((a, b) => {
                      const fechaA = a.fecha ? new Date(a.fecha.split('/').reverse().join('-')) : new Date(0);
                      const fechaB = b.fecha ? new Date(b.fecha.split('/').reverse().join('-')) : new Date(0);
                      return fechaB.getTime() - fechaA.getTime();
                    }).map((r, i) => {
                      const itemsCount = entradasByRemision(r.idRegistro).length;
                      const expandida = showRemisionDetail?.idRegistro === r.idRegistro;
                      return (
                        <Fragment key={r.idRegistro}>
                        <tr onClick={() => toggleExpandRemision(r)} {...longPressHandlers(() => toggleSeleccionRemision(r.idRegistro))} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0 select-none ${expandida ? 'bg-secondary/20' : ''}`}>
                          {remisionesSeleccionadas.size > 0 && (
                            <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={remisionesSeleccionadas.has(r.idRegistro)} onChange={() => toggleSeleccionRemision(r.idRegistro)} className="rounded" />
                            </td>
                          )}
                          <td className="px-4 py-3 text-muted-foreground block sm:table-cell">{formatearFecha(r.fecha)}</td>
                          <td className="px-4 py-3 font-medium block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Numeracion: </span>{r.numeracion}</td>
                          <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Proveedor: </span>{r.proveedor || '-'}</td>
                          <td className="px-4 py-3 text-center block sm:table-cell">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                              <Package size={10} /> {itemsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                              {r.scaneado && (
                                <a href={r.scaneado} target="_blank" rel="noopener noreferrer" className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver PDF">
                                  <FileText size={16} />
                                </a>
                              )}
                              <button onClick={() => handleDeleteRemision(r)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        {expandida && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={6} className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <form onSubmit={handleEditRemision}>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                  <div><label className="block text-xs text-muted-foreground uppercase mb-1">Proveedor</label><input type="text" value={editingRemisionForm.proveedor} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                  <div><label className="block text-xs text-muted-foreground uppercase mb-1">Numeracion</label><input type="text" value={editingRemisionForm.numeracion} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, numeracion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                  <div><label className="block text-xs text-muted-foreground uppercase mb-1">Fecha</label><input type="date" value={editingRemisionForm.fecha} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                  <div><label className="block text-xs text-muted-foreground uppercase mb-1">Detalle</label><input type="text" value={editingRemisionForm.detalle} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, detalle: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                </div>

                                <div className="text-xs text-muted-foreground uppercase mb-3">ID Registro: <span className="font-medium normal-case">{r.idRegistro}</span></div>
                                {r.scaneado && (
                                  <a href={r.scaneado} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm mb-4"><FileText size={14} /> Ver documento escaneado</a>
                                )}

                                <div className="flex items-center justify-between mb-2 mt-2">
                                  <h4 className="text-sm font-medium">Items de la remision ({editingItemsForm.length})</h4>
                                  <button type="button" onClick={agregarItemRemisionForm} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={14} /> Agregar item</button>
                                </div>
                                <div className="space-y-2 mb-4">
                                  {editingItemsForm.map((it, idx) => (
                                    <div key={it.idRegistro || `nuevo-${idx}`} className="flex items-center gap-2 bg-background/50 p-3 rounded-xl">
                                      <input type="text" value={it.item} onChange={(e) => actualizarItemRemisionForm(idx, 'item', e.target.value)} placeholder="Nombre del item" className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                                      <input type="text" value={it.codigo} onChange={(e) => actualizarItemRemisionForm(idx, 'codigo', e.target.value)} placeholder="Codigo" className="w-24 sm:w-28 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                                      <input type="number" value={it.cantidad} onChange={(e) => actualizarItemRemisionForm(idx, 'cantidad', e.target.value)} placeholder="Cant." className="w-16 sm:w-20 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50" />
                                      <button type="button" onClick={() => quitarItemRemisionForm(idx)} className="p-1.5 text-muted-foreground hover:text-red-400 shrink-0" title="Quitar item"><X size={16} /></button>
                                    </div>
                                  ))}
                                  {editingItemsForm.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                                  <button type="button" onClick={() => setShowRemisionDetail(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
                                </div>
                              </form>
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
                <span>{remisionesFiltradas.length} remisiones</span>
                <span>Mas reciente primero</span>
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
              {notasSeleccionadas.size > 0 && (
                <button onClick={handleBulkDeleteNotas} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-500/20 transition-colors text-sm">
                  <Trash2 size={16} /> Eliminar ({notasSeleccionadas.size})
                </button>
              )}
              <button onClick={() => setShowGeminiSalidaForm(true)} className="bg-secondary border border-border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
                <Brain size={16} /> Procesar con IA
              </button>
              <button onClick={() => {
                const nextNum = notasSalida.filter(n => n.obra === proyecto).length + 1;
                const hoy = fechaLocalISO(new Date());
                setNotaSalidaForm(prev => ({...prev, orden: `NS-${String(nextNum).padStart(3, '0')}`, fecha: hoy}));
                setBusquedaQuienRetira('');
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
                <button onClick={() => { setShowNotaSalidaForm(false); setSalidasTemporales([]); setBusquedaQuienRetira(''); setBusquedaProducto(''); }} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <form onSubmit={handleGuardarNotaCompleta}>
                {/* Datos de la Nota */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div><label className="block text-sm font-medium mb-2">Orden (Auto)</label><input type="text" value={notaSalidaForm.orden} readOnly className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" /></div>
                  <div><label className="block text-sm font-medium mb-2">Fecha</label><input type="date" value={notaSalidaForm.fecha} onChange={(e) => setNotaSalidaForm({...notaSalidaForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Quien Retira *</label>
                    <input
                      type="text"
                      value={busquedaQuienRetira}
                      onChange={(e) => {
                        setBusquedaQuienRetira(e.target.value);
                        setMostrarSugerenciasQuienRetira(true);
                        setIndiceResaltadoQuienRetira(0);
                        if (notaSalidaForm.quienRetira) setNotaSalidaForm({ ...notaSalidaForm, quienRetira: '' });
                      }}
                      onFocus={() => setMostrarSugerenciasQuienRetira(true)}
                      onBlur={() => {
                        setTimeout(() => setMostrarSugerenciasQuienRetira(false), 150);
                        if (busquedaQuienRetira.trim() && !notaSalidaForm.quienRetira) {
                          setNotaSalidaForm({ ...notaSalidaForm, quienRetira: busquedaQuienRetira.trim() });
                        }
                      }}
                      onKeyDown={(e) => {
                        const filtrados = buscarEmpleadosPorTexto(busquedaQuienRetira);
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setMostrarSugerenciasQuienRetira(true);
                          setIndiceResaltadoQuienRetira(i => Math.min(i + 1, filtrados.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setIndiceResaltadoQuienRetira(i => Math.max(i - 1, 0));
                        } else if (e.key === 'Enter') {
                          const emp = filtrados[indiceResaltadoQuienRetira];
                          if (emp && mostrarSugerenciasQuienRetira) {
                            e.preventDefault();
                            setNotaSalidaForm({ ...notaSalidaForm, quienRetira: emp.nroDocumento });
                            setBusquedaQuienRetira(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                            setMostrarSugerenciasQuienRetira(false);
                          } else if (busquedaQuienRetira.trim()) {
                            setNotaSalidaForm({ ...notaSalidaForm, quienRetira: busquedaQuienRetira.trim() });
                            setMostrarSugerenciasQuienRetira(false);
                          }
                        } else if (e.key === 'Escape') {
                          setMostrarSugerenciasQuienRetira(false);
                        }
                      }}
                      placeholder="Nombre, empresa o cedula..."
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
                      required={!notaSalidaForm.quienRetira && !busquedaQuienRetira.trim()}
                      autoComplete="off"
                    />
                    {mostrarSugerenciasQuienRetira && busquedaQuienRetira && (
                      <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                        {buscarEmpleadosPorTexto(busquedaQuienRetira).length > 0 ? (
                          buscarEmpleadosPorTexto(busquedaQuienRetira).map((emp, idx) => (
                            <button
                              type="button"
                              key={emp.nroDocumento}
                              ref={(el) => { if (idx === indiceResaltadoQuienRetira) el?.scrollIntoView({ block: 'nearest' }); }}
                              onMouseEnter={() => setIndiceResaltadoQuienRetira(idx)}
                              onClick={() => {
                                setNotaSalidaForm({ ...notaSalidaForm, quienRetira: emp.nroDocumento });
                                setBusquedaQuienRetira(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                                setMostrarSugerenciasQuienRetira(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${idx === indiceResaltadoQuienRetira ? 'bg-secondary/70' : 'hover:bg-secondary/50'}`}
                            >
                              {emp.nombres} {emp.apellidos} <span className="text-muted-foreground">- CI: {emp.nroDocumento}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-sm text-muted-foreground">Sin resultados</div>
                        )}
                      </div>
                    )}
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
                    <div className="relative">
                      <label className="block text-sm font-medium mb-2">Producto *</label>
                      <input
                        type="text"
                        value={busquedaProducto || (salidaForm.refItem ? `${productos.find(p => p.codigo === salidaForm.refItem)?.nombre || ''} (Stock: ${stockDisponible(salidaForm.refItem)})` : '')}
                        onChange={(e) => { setBusquedaProducto(e.target.value); setMostrarSugerenciasProducto(true); setIndiceResaltadoProducto(0); if (salidaForm.refItem) setSalidaForm({ ...salidaForm, refItem: '' }); }}
                        onFocus={() => setMostrarSugerenciasProducto(true)}
                        onBlur={() => setTimeout(() => setMostrarSugerenciasProducto(false), 150)}
                        onKeyDown={(e) => {
                          const filtrados = productosConStockSalida.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(busquedaProducto.toLowerCase()));
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setMostrarSugerenciasProducto(true);
                            setIndiceResaltadoProducto(i => Math.min(i + 1, filtrados.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setIndiceResaltadoProducto(i => Math.max(i - 1, 0));
                          } else if (e.key === 'Enter') {
                            const p = filtrados[indiceResaltadoProducto];
                            if (p && mostrarSugerenciasProducto) {
                              e.preventDefault();
                              setSalidaForm({ ...salidaForm, refItem: p.codigo });
                              setBusquedaProducto('');
                              setMostrarSugerenciasProducto(false);
                            }
                          } else if (e.key === 'Escape') {
                            setMostrarSugerenciasProducto(false);
                          }
                        }}
                        placeholder="Escribi nombre o codigo..."
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
                        autoComplete="off"
                      />
                      {mostrarSugerenciasProducto && busquedaProducto && (
                        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                          {productosConStockSalida.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(busquedaProducto.toLowerCase())).length > 0 ? (
                            productosConStockSalida.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(busquedaProducto.toLowerCase())).map((p, idx) => (
                              <button
                                type="button"
                                key={p.codigo}
                                ref={(el) => { if (idx === indiceResaltadoProducto) el?.scrollIntoView({ block: 'nearest' }); }}
                                onMouseEnter={() => setIndiceResaltadoProducto(idx)}
                                onClick={() => { setSalidaForm({ ...salidaForm, refItem: p.codigo }); setBusquedaProducto(''); setMostrarSugerenciasProducto(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${idx === indiceResaltadoProducto ? 'bg-secondary/70' : 'hover:bg-secondary/50'}`}
                              >
                                {p.nombre} <span className="text-muted-foreground">(Stock: {stockDisponible(p.codigo)})</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2.5 text-sm text-muted-foreground">Sin resultados</div>
                          )}
                        </div>
                      )}
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

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}</div>
          ) : notasFiltradas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><ArrowDownCircle size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No hay notas de salida</p></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm block sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="bg-secondary/50 border-b border-border">
                      {notasSeleccionadas.size > 0 && (
                        <th className="px-4 py-3 w-8">
                          <input type="checkbox" checked={notasFiltradas.length > 0 && notasSeleccionadas.size === notasFiltradas.length} onChange={toggleSeleccionarTodasNotas} className="rounded" />
                        </th>
                      )}
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">N° Orden</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Quien Retira</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Items</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="block sm:table-row-group">
                    {[...notasFiltradas].sort((a, b) => {
                      const fechaA = a.fecha ? new Date(a.fecha.split('/').reverse().join('-')) : new Date(0);
                      const fechaB = b.fecha ? new Date(b.fecha.split('/').reverse().join('-')) : new Date(0);
                      return fechaB.getTime() - fechaA.getTime();
                    }).map((n) => {
                      const itemsCount = salidasByNota(n.idRegistro).length;
                      const nombreRetira = nombreQuienRetira(n.quienRetira);
                      const expandida = showNotaDetail?.idRegistro === n.idRegistro;
                      return (
                        <Fragment key={n.idRegistro}>
                        <tr onClick={() => toggleExpandNota(n)} {...longPressHandlers(() => toggleSeleccionNota(n.idRegistro))} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0 select-none ${expandida ? 'bg-secondary/20' : ''}`}>
                          {notasSeleccionadas.size > 0 && (
                            <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={notasSeleccionadas.has(n.idRegistro)} onChange={() => toggleSeleccionNota(n.idRegistro)} className="rounded" />
                            </td>
                          )}
                          <td className="px-4 py-3 text-muted-foreground block sm:table-cell">{formatearFecha(n.fecha)}</td>
                          <td className="px-4 py-3 font-medium block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Orden: </span>{n.orden || n.idRegistro}</td>
                          <td className="px-4 py-3 block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Retira: </span>{nombreRetira}</td>
                          <td className="px-4 py-3 text-center block sm:table-cell">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                              <Package size={10} /> {itemsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                              <button onClick={() => descargarPDFNotaSalida(n)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Descargar PDF"><FileText size={16} /></button>
                              <button onClick={() => handleDeleteNotaSalida(n)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        {expandida && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={6} className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <form onSubmit={handleEditNotaSalida}>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                  <div><label className="block text-xs text-muted-foreground uppercase mb-1">Orden</label><input type="text" value={editingNotaForm.orden} onChange={(e) => setEditingNotaForm({...editingNotaForm, orden: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                  <div><label className="block text-xs text-muted-foreground uppercase mb-1">Fecha</label><input type="date" value={editingNotaForm.fecha} onChange={(e) => setEditingNotaForm({...editingNotaForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                  <div className="relative">
                                    <label className="block text-xs text-muted-foreground uppercase mb-1">Quien Retira</label>
                                    <input
                                      type="text"
                                      value={busquedaQuienRetira}
                                      onChange={(e) => {
                                        setBusquedaQuienRetira(e.target.value);
                                        setMostrarSugerenciasQuienRetira(true);
                                        setIndiceResaltadoQuienRetira(0);
                                        if (editingNotaForm.quienRetira) setEditingNotaForm({ ...editingNotaForm, quienRetira: '' });
                                      }}
                                      onFocus={() => setMostrarSugerenciasQuienRetira(true)}
                                      onBlur={() => {
                                        setTimeout(() => setMostrarSugerenciasQuienRetira(false), 150);
                                        if (busquedaQuienRetira.trim() && !editingNotaForm.quienRetira) {
                                          setEditingNotaForm({ ...editingNotaForm, quienRetira: busquedaQuienRetira.trim() });
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        const filtrados = buscarEmpleadosPorTexto(busquedaQuienRetira);
                                        if (e.key === 'ArrowDown') {
                                          e.preventDefault();
                                          setMostrarSugerenciasQuienRetira(true);
                                          setIndiceResaltadoQuienRetira(i => Math.min(i + 1, filtrados.length - 1));
                                        } else if (e.key === 'ArrowUp') {
                                          e.preventDefault();
                                          setIndiceResaltadoQuienRetira(i => Math.max(i - 1, 0));
                                        } else if (e.key === 'Enter') {
                                          const emp = filtrados[indiceResaltadoQuienRetira];
                                          if (emp && mostrarSugerenciasQuienRetira) {
                                            e.preventDefault();
                                            setEditingNotaForm({ ...editingNotaForm, quienRetira: emp.nroDocumento });
                                            setBusquedaQuienRetira(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                                            setMostrarSugerenciasQuienRetira(false);
                                          } else if (busquedaQuienRetira.trim()) {
                                            setEditingNotaForm({ ...editingNotaForm, quienRetira: busquedaQuienRetira.trim() });
                                            setMostrarSugerenciasQuienRetira(false);
                                          }
                                        } else if (e.key === 'Escape') {
                                          setMostrarSugerenciasQuienRetira(false);
                                        }
                                      }}
                                      placeholder="Nombre, empresa o cedula..."
                                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
                                      autoComplete="off"
                                    />
                                    {mostrarSugerenciasQuienRetira && busquedaQuienRetira && (
                                      <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                                        {buscarEmpleadosPorTexto(busquedaQuienRetira).length > 0 ? (
                                          buscarEmpleadosPorTexto(busquedaQuienRetira).map((emp, idx) => (
                                            <button
                                              type="button"
                                              key={emp.nroDocumento}
                                              ref={(el) => { if (idx === indiceResaltadoQuienRetira) el?.scrollIntoView({ block: 'nearest' }); }}
                                              onMouseEnter={() => setIndiceResaltadoQuienRetira(idx)}
                                              onClick={() => {
                                                setEditingNotaForm({ ...editingNotaForm, quienRetira: emp.nroDocumento });
                                                setBusquedaQuienRetira(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                                                setMostrarSugerenciasQuienRetira(false);
                                              }}
                                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${idx === indiceResaltadoQuienRetira ? 'bg-secondary/70' : 'hover:bg-secondary/50'}`}
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
                                  <div><label className="block text-xs text-muted-foreground uppercase mb-1">Observaciones</label><input type="text" value={editingNotaForm.observaciones} onChange={(e) => setEditingNotaForm({...editingNotaForm, observaciones: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                </div>

                                <div className="text-xs text-muted-foreground uppercase mb-3">ID Registro: <span className="font-medium normal-case">{n.idRegistro}</span></div>

                                <div className="flex items-center justify-between mb-2 mt-2">
                                  <h4 className="text-sm font-medium">Items de la nota ({editingSalidasForm.length})</h4>
                                  <button type="button" onClick={agregarSalidaItemForm} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={14} /> Agregar item</button>
                                </div>
                                <div className="space-y-2 mb-4">
                                  {editingSalidasForm.map((it, idx) => {
                                    const prodSeleccionado = productos.find(p => p.codigo === it.refItem);
                                    const valorMostrado = it.busqueda || (it.refItem ? `${prodSeleccionado?.nombre || it.refItem} (Stock: ${stockDisponible(it.refItem)})` : '');
                                    const filtrados = productos.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(it.busqueda.toLowerCase()));
                                    return (
                                      <div key={it.idRegistro || `nuevo-${idx}`} className="flex items-center gap-2 bg-background/50 p-3 rounded-xl">
                                        <div className="relative flex-1">
                                          <input
                                            type="text"
                                            value={valorMostrado}
                                            onChange={(e) => {
                                              actualizarSalidaItemForm(idx, 'busqueda', e.target.value);
                                              setFilaBusquedaSalidaActiva(idx);
                                              setIndiceResaltadoSalidaForm(0);
                                              if (it.refItem) actualizarSalidaItemForm(idx, 'refItem', '');
                                            }}
                                            onFocus={() => setFilaBusquedaSalidaActiva(idx)}
                                            onBlur={() => setTimeout(() => setFilaBusquedaSalidaActiva(f => (f === idx ? null : f)), 150)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setFilaBusquedaSalidaActiva(idx);
                                                setIndiceResaltadoSalidaForm(i => Math.min(i + 1, filtrados.length - 1));
                                              } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setIndiceResaltadoSalidaForm(i => Math.max(i - 1, 0));
                                              } else if (e.key === 'Enter') {
                                                const p = filtrados[indiceResaltadoSalidaForm];
                                                if (p && filaBusquedaSalidaActiva === idx) { e.preventDefault(); seleccionarProductoSalidaForm(idx, p.codigo); }
                                              } else if (e.key === 'Escape') {
                                                setFilaBusquedaSalidaActiva(null);
                                              }
                                            }}
                                            placeholder="Nombre o codigo del producto..."
                                            className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50"
                                            autoComplete="off"
                                          />
                                          {filaBusquedaSalidaActiva === idx && it.busqueda && (
                                            <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                                              {filtrados.length > 0 ? (
                                                filtrados.map((p, pIdx) => (
                                                  <button
                                                    type="button"
                                                    key={p.codigo}
                                                    ref={(el) => { if (pIdx === indiceResaltadoSalidaForm) el?.scrollIntoView({ block: 'nearest' }); }}
                                                    onMouseEnter={() => setIndiceResaltadoSalidaForm(pIdx)}
                                                    onClick={() => seleccionarProductoSalidaForm(idx, p.codigo)}
                                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${pIdx === indiceResaltadoSalidaForm ? 'bg-secondary/70' : 'hover:bg-secondary/50'}`}
                                                  >
                                                    {p.nombre} <span className="text-muted-foreground">(Stock: {stockDisponible(p.codigo)})</span>
                                                  </button>
                                                ))
                                              ) : (
                                                <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <input type="number" value={it.cantidad} onChange={(e) => actualizarSalidaItemForm(idx, 'cantidad', e.target.value)} placeholder="Cant." className="w-16 sm:w-20 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm input-glow focus:outline-none focus:border-primary/50" min="1" />
                                        <button type="button" onClick={() => quitarSalidaItemForm(idx)} className="p-1.5 text-muted-foreground hover:text-red-400 shrink-0" title="Quitar item"><X size={16} /></button>
                                      </div>
                                    );
                                  })}
                                  {editingSalidasForm.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                                  <button type="button" onClick={() => { setShowNotaDetail(null); setBusquedaQuienRetira(''); }} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
                                </div>
                              </form>
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
                <span>{notasFiltradas.length} notas de salida</span>
                <span>Ordenadas por fecha descendente</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA DOTACION DE CALZADOS */}
      {vista === 'dotacion' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Dotacion de Calzados de Seguridad</h2>
            <p className="text-sm text-muted-foreground mt-1">Empleados de ALTAZENTA NORTE SA - renovacion cada {DIAS_VIGENCIA_DOTACION} dias desde la ultima entrega de Botin P/ Obrero</p>
          </div>
          {empleadosDotacion.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Footprints size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No hay empleados de ALTAZENTA NORTE SA en este proyecto</p></div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activos ({dotacionActivos.length})</h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm block sm:table">
                      <thead className="hidden sm:table-header-group">
                        <tr className="bg-secondary/50 border-b border-border">
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Documento</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nombre y Apellido</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha Inicio Contrato</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Calce</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ultima Dotacion</th>
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Proxima Dotacion</th>
                          <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Alerta</th>
                        </tr>
                      </thead>
                      <tbody className="block sm:table-row-group">
                        {dotacionActivos.map(emp => {
                          const d = calcularDotacion(emp);
                          return (
                            <tr key={emp.nroDocumento} className="border-b border-border/50 hover:bg-secondary/30 transition-colors block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0">
                              <td className="px-4 py-3 text-muted-foreground block sm:table-cell">{emp.nroDocumento}</td>
                              <td className="px-4 py-3 font-medium block sm:table-cell">{emp.nombres} {emp.apellidos}</td>
                              <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Contrato: </span>{formatearFecha(emp.fechaInicioContrato || '')}</td>
                              <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Calce: </span>{emp.calce || '-'}</td>
                              <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Ultima dotacion: </span>{d.ultimaDotacion ? formatearFecha(d.ultimaDotacion) : '-'}</td>
                              <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Proxima dotacion: </span>{d.proximaDotacion ? formatearFecha(d.proximaDotacion) : '-'}</td>
                              <td className="px-4 py-3 text-center block sm:table-cell">
                                {d.alerta === 'Vencido' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium"><AlertTriangle size={10} /> Vencido</span>
                                ) : d.alerta === 'Proximo a vencer' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium"><AlertCircle size={10} /> Proximo a vencer</span>
                                ) : d.alerta === 'Sin dotacion registrada' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">Sin registro</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle2 size={10} /> OK</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* FIN ACTIVOS DOTACION */}

              {dotacionInactivos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inactivos ({dotacionInactivos.length})</h3>
                  <div className="bg-card border border-border rounded-xl overflow-hidden opacity-60">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm block sm:table">
                        <thead className="hidden sm:table-header-group">
                          <tr className="bg-secondary/50 border-b border-border">
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Documento</th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nombre y Apellido</th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha Inicio Contrato</th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Calce</th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ultima Dotacion</th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Proxima Dotacion</th>
                            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Alerta</th>
                          </tr>
                        </thead>
                        <tbody className="block sm:table-row-group">
                          {dotacionInactivos.map(emp => {
                            const d = calcularDotacion(emp);
                            return (
                              <tr key={emp.nroDocumento} className="border-b border-border/50 hover:bg-secondary/30 transition-colors block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0">
                                <td className="px-4 py-3 text-muted-foreground block sm:table-cell">{emp.nroDocumento}</td>
                                <td className="px-4 py-3 font-medium block sm:table-cell">{emp.nombres} {emp.apellidos}</td>
                                <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Contrato: </span>{formatearFecha(emp.fechaInicioContrato || '')}</td>
                                <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Calce: </span>{emp.calce || '-'}</td>
                                <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Ultima dotacion: </span>{d.ultimaDotacion ? formatearFecha(d.ultimaDotacion) : '-'}</td>
                                <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Proxima dotacion: </span>{d.proximaDotacion ? formatearFecha(d.proximaDotacion) : '-'}</td>
                                <td className="px-4 py-3 text-center block sm:table-cell">
                                  {d.alerta === 'Vencido' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium"><AlertTriangle size={10} /> Vencido</span>
                                  ) : d.alerta === 'Proximo a vencer' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium"><AlertCircle size={10} /> Proximo a vencer</span>
                                  ) : d.alerta === 'Sin dotacion registrada' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">Sin registro</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle2 size={10} /> OK</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {vista === 'solicitudes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Solicitudes de Suministro</h2>
            <button onClick={startNewSolicitud} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm">
              <Plus size={18} /> Nueva Solicitud
            </button>
          </div>

          {showSolicitudForm && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingSolicitud ? `Editar Solicitud Nº ${editingSolicitud.numero}` : 'Nueva Solicitud de Suministro'}</h3>
                <button onClick={closeSolicitudForm} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmitSolicitud} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Fecha *</label><input type="date" value={solicitudForm.fecha} onChange={(e) => setSolicitudForm({...solicitudForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
                  <div><label className="block text-sm font-medium mb-1">Fecha límite de entrega</label><input type="date" value={solicitudForm.fechaLimiteEntrega} onChange={(e) => setSolicitudForm({...solicitudForm, fechaLimiteEntrega: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Supervisor</label><input type="text" value={solicitudForm.supervisor} onChange={(e) => setSolicitudForm({...solicitudForm, supervisor: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Actividad</label><input type="text" value={solicitudForm.actividad} onChange={(e) => setSolicitudForm({...solicitudForm, actividad: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Ubicación</label><input type="text" value={solicitudForm.ubicacion} onChange={(e) => setSolicitudForm({...solicitudForm, ubicacion: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Proveedor general</label>
                    <input type="text" list="proveedores-datalist" value={solicitudForm.proveedor} onChange={(e) => setSolicitudForm({...solicitudForm, proveedor: e.target.value})} placeholder="Elegi uno o escribi uno nuevo..." className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Observaciones</label><textarea value={solicitudForm.observaciones} onChange={(e) => setSolicitudForm({...solicitudForm, observaciones: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" rows={2} /></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ítems solicitados</h4>
                    <button type="button" onClick={handleAddItem} className="text-sm text-primary hover:underline flex items-center gap-1"><Plus size={14} /> Agregar ítem</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Ítem</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Producto *</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Unidad</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Cantidad *</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Cuenta</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Proveedor</th>
                          <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {solicitudForm.items.map((it, idx) => (
                          <tr key={idx} className="border-b border-border/50">
                            <td className="py-2 px-2 text-muted-foreground">{it.item}</td>
                            <td className="py-2 px-2"><input type="text" list="productos-epp-datalist" value={it.producto} onChange={(e) => handleItemChange(idx, 'producto', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm" required /></td>
                            <td className="py-2 px-2"><input type="text" value={it.unidad} onChange={(e) => handleItemChange(idx, 'unidad', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm" /></td>
                            <td className="py-2 px-2"><input type="number" min="0" step="any" value={it.cantidad} onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm" required /></td>
                            <td className="py-2 px-2"><input type="text" value={it.cuenta} onChange={(e) => handleItemChange(idx, 'cuenta', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm" /></td>
                            <td className="py-2 px-2"><input type="text" value={it.proveedor} onChange={(e) => handleItemChange(idx, 'proveedor', e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm" /></td>
                            <td className="py-2 px-2 text-center"><button type="button" onClick={() => handleRemoveItem(idx)} className="text-muted-foreground hover:text-red-400" title="Eliminar ítem"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"><Save size={18} /> {editingSolicitud ? 'Guardar Cambios' : 'Crear Solicitud'}</button>
                  <button type="button" onClick={closeSolicitudForm} className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {solicitudesFiltradas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay solicitudes de suministro</p>
              <p className="text-sm mt-1">Crea la primera solicitando materiales o EPP</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm block sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nº</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Supervisor</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actividad</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ubicación</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fecha límite</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="block sm:table-row-group">
                    {solicitudesFiltradas.map((s) => (
                      <Fragment key={s.idRegistro}>
                        <tr onClick={() => setSolicitudExpandida(solicitudExpandida?.idRegistro === s.idRegistro ? null : s)} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0">
                          <td className="px-4 py-3 font-mono text-xs font-medium block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Nº: </span>{s.numero}</td>
                          <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Fecha: </span>{formatearFecha(s.fecha)}</td>
                          <td className="px-4 py-3 block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Supervisor: </span>{s.supervisor || '-'}</td>
                          <td className="px-4 py-3 block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Actividad: </span>{s.actividad || '-'}</td>
                          <td className="px-4 py-3 block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Ubicación: </span>{s.ubicacion || '-'}</td>
                          <td className="px-4 py-3 text-muted-foreground block sm:table-cell"><span className="text-muted-foreground/60 sm:hidden">Fecha límite: </span>{formatearFecha(s.fechaLimiteEntrega)}</td>
                          <td className="px-4 py-3 text-center block sm:table-cell" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleToggleEstadoSolicitud(s)} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badgeEstadoSolicitud(s.estado)}`}>{s.estado || 'Pendiente'}</button>
                          </td>
                          <td className="px-4 py-3 block sm:table-cell" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                              <button onClick={() => descargarPDFSolicitud(s)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Descargar PDF"><FileText size={16} /></button>
                              <button onClick={() => startEditSolicitud(s)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteSolicitud(s)} className="p-2.5 sm:p-1 text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        {solicitudExpandida?.idRegistro === s.idRegistro && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={8} className="px-4 py-4 sm:px-6 sm:py-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observaciones</h4>
                                  <p className="text-sm whitespace-pre-wrap">{s.observaciones || '-'}</p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ítems solicitados</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm border border-border/50 rounded-lg">
                                      <thead className="bg-secondary/50">
                                        <tr>
                                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Ítem</th>
                                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Producto</th>
                                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Unidad</th>
                                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Cantidad</th>
                                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Cuenta</th>
                                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Proveedor</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {s.items.length === 0 && (
                                          <tr><td colSpan={6} className="px-3 py-2 text-muted-foreground text-center">Sin ítems</td></tr>
                                        )}
                                        {s.items.map((it, i) => (
                                          <tr key={i} className="border-t border-border/50">
                                            <td className="px-3 py-2 text-muted-foreground">{it.item || i + 1}</td>
                                            <td className="px-3 py-2">{it.producto || '-'}</td>
                                            <td className="px-3 py-2">{it.unidad || '-'}</td>
                                            <td className="px-3 py-2">{it.cantidad || '-'}</td>
                                            <td className="px-3 py-2">{it.cuenta || '-'}</td>
                                            <td className="px-3 py-2">{it.proveedor || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <datalist id="productos-epp-datalist">
        {productos.map(p => <option key={p.codigo} value={p.nombre} />)}
      </datalist>

      {/* MODALES */}

      {/* Modal Procesar Factura con IA */}
      {showGeminiForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Brain size={20} className="text-primary" />Procesar Factura/Remision con IA</h2>
              <button onClick={() => { setShowGeminiForm(false); setDatosExtraidos(null); setPdfFile(null); }} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            {!datosExtraidos ? (
              <form onSubmit={handleGeminiSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">Sube la factura o remision de EPP (PDF o foto)</p>
                  <input type="file" accept={ACCEPT_FICHA_EMPLEADO} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" id="epp-pdf" />
                  <label htmlFor="epp-pdf" className="btn-gradient text-white px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-blue-500/25"><Plus size={18} /> Seleccionar archivo</label>
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
              <button onClick={() => { setShowGeminiSalidaForm(false); setDatosExtraidos(null); setPdfFile(null); }} className="p-3 sm:p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
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

    </div>
  );
}
