import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileBarChart, Loader2, Download, Users, AlertTriangle, ShieldAlert, Package } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { drawPdfHeader } from '../lib/pdfHeader';
import { calcularDotacion, fechaLocalISO, EMPRESA_DOTACION } from '../lib/dotacionCalculos';

interface Proyecto {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
  fechaInicioObra: string;
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
  scanDocumentos?: string;
}

interface Incidente {
  fechaIncidente: string;
  tipo: string;
  clasificacion: string;
  diasPerdidos: string;
}

interface Producto {
  codigo: string;
  nombre: string;
  clasificacion: string;
  stockMinimo: string;
}

interface Entrada {
  codigo: string;
  cantidad: string;
}

interface Salida {
  refItem: string;
  refNotaSalida: string;
  cantidad: string;
  trabajadorRetira: string;
}

interface NotaSalida {
  idRegistro: string;
  fecha: string;
}

interface AjusteStock {
  codigoProducto: string;
  cantidad: string;
  tipo: 'positivo' | 'negativo';
}

interface InformeMensualProps {
  proyecto: Proyecto;
}

const TIPOS_ACCIDENTE = ['Accidente con baja', 'Accidente sin baja'];
const CLASIFICACIONES_EPP = ['CASCO', 'GAFAS', 'GUANTES', 'BOTAS', 'ARNÉS', 'ARNES', 'PROTECCION AUDITIVA', 'PROTECCION RESPIRATORIA', 'ROPA DE TRABAJO'];

function nombreMes(mes: string): string {
  if (!/^\d{4}-\d{2}$/.test(mes)) return mes;
  const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1);
  const texto = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatearFecha(fechaStr: string): string {
  if (!fechaStr) return '-';
  try {
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaStr);
    const fecha = soloFecha
      ? new Date(Number(fechaStr.slice(0, 4)), Number(fechaStr.slice(5, 7)) - 1, Number(fechaStr.slice(8, 10)))
      : new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return fechaStr;
  }
}

export default function InformeMensual({ proyecto }: InformeMensualProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [notasSalida, setNotasSalida] = useState<NotaSalida[]>([]);
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const p = encodeURIComponent(proyecto.denominacion);
        const [empRes, incRes, prodRes, entRes, salRes, notRes, ajsRes] = await Promise.all([
          apiFetch(`/api/empleados?proyecto=${p}`),
          apiFetch(`/api/incidentes?proyecto=${p}`),
          apiFetch('/api/epp/productos'),
          apiFetch(`/api/epp/entradas?proyecto=${p}`),
          apiFetch(`/api/epp/salidas?proyecto=${p}`),
          apiFetch(`/api/epp/notas-salida?proyecto=${p}`),
          apiFetch(`/api/epp/ajustes-stock?proyecto=${p}`),
        ]);
        const [empData, incData, prodData, entData, salData, notData, ajsData] = await Promise.all([
          empRes.json(), incRes.json(), prodRes.json(), entRes.json(), salRes.json(), notRes.json(), ajsRes.json()
        ]);
        if (empData.success) setEmpleados(empData.data);
        if (incData.success) setIncidentes(incData.data);
        if (prodData.success) setProductos(prodData.data);
        if (entData.success) setEntradas(entData.data);
        if (salData.success) setSalidas(salData.data);
        if (notData.success) setNotasSalida(notData.data);
        if (ajsData.success) setAjustes(ajsData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [proyecto.denominacion]);

  const empleadosActivos = empleados.filter(e => (e.estado || 'Activo').trim().toLowerCase() !== 'inactivo');

  const empleadosDotacion = empleados.filter(e => (e.empresa || '').trim().toUpperCase() === EMPRESA_DOTACION);
  const dotacionActivos = empleadosDotacion.filter(e => (e.estado || 'Activo') !== 'Inactivo').sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'));
  const dotacionInactivos = empleadosDotacion.filter(e => (e.estado || 'Activo') === 'Inactivo').sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'));
  const dotacionesVencidas = [...dotacionActivos, ...dotacionInactivos].filter(e => calcularDotacion(e, salidas, productos, notasSalida).alerta === 'Vencido').length;
  const dotacionesProximas = [...dotacionActivos, ...dotacionInactivos].filter(e => calcularDotacion(e, salidas, productos, notasSalida).alerta === 'Proximo a vencer').length;

  const totalEntradasByProducto = (codigo: string) => entradas.filter(e => e.codigo === codigo).reduce((sum, e) => sum + parseInt(e.cantidad || '0'), 0);
  const totalSalidasByProducto = (codigo: string) => salidas.filter(s => s.refItem === codigo).reduce((sum, s) => sum + parseInt(s.cantidad || '0'), 0);
  const totalAjustesByProducto = (codigo: string) => ajustes.filter(a => a.codigoProducto === codigo).reduce((sum, a) => {
    const cantidad = parseInt(a.cantidad || '0');
    return a.tipo === 'negativo' ? sum - cantidad : sum + cantidad;
  }, 0);
  const stockDisponible = (codigo: string) => totalEntradasByProducto(codigo) - totalSalidasByProducto(codigo) + totalAjustesByProducto(codigo);
  const isStockBajo = (p: Producto) => {
    const minimo = parseInt(p.stockMinimo || '0');
    return minimo > 0 && stockDisponible(p.codigo) < minimo;
  };
  const productosStockBajo = productos.filter(p => isStockBajo(p));

  const incidentesAccidente = incidentes.filter(i => TIPOS_ACCIDENTE.includes(i.tipo));
  const totalAccidentes = incidentesAccidente.length;
  const diasPerdidosTotal = incidentesAccidente.reduce((sum, i) => sum + parseInt(i.diasPerdidos || '0'), 0);
  const incidentesConBaja = incidentesAccidente.filter(i => i.tipo === 'Accidente con baja');
  const incidentesAbiertos = incidentes.length;

  let fechaUltimoAccidente: Date | null = null;
  let fechaUltimoAccidenteStr = '';
  for (const i of incidentesConBaja) {
    if (!i.fechaIncidente) continue;
    const d = new Date(i.fechaIncidente + (i.fechaIncidente.length === 10 ? 'T00:00:00' : ''));
    if (!isNaN(d.getTime()) && (!fechaUltimoAccidente || d > fechaUltimoAccidente)) {
      fechaUltimoAccidente = d;
      fechaUltimoAccidenteStr = i.fechaIncidente;
    }
  }

  const fechaReferenciaDias = fechaUltimoAccidente || (proyecto.fechaInicioObra ? new Date(proyecto.fechaInicioObra + 'T00:00:00') : null);
  let diasSinAccidentes: number | null = null;
  if (fechaReferenciaDias && !isNaN(fechaReferenciaDias.getTime())) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaReferenciaDias.setHours(0, 0, 0, 0);
    diasSinAccidentes = Math.floor((hoy.getTime() - fechaReferenciaDias.getTime()) / (1000 * 60 * 60 * 24));
  }

  const generarInformePDF = async () => {
    setGenerando(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 14;
      const marginRight = 14;
      const contentWidth = pageWidth - marginLeft - marginRight;
      let y = 20;

      const checkPageBreak = (alturaNecesaria: number) => {
        if (y + alturaNecesaria > 190) {
          doc.addPage();
          y = 20;
        }
      };

      const proyectoHeader = { denominacion: proyecto.denominacion, logo: proyecto.logo };

      // ---- Portada ----
      y = await drawPdfHeader(doc, proyectoHeader, y - 5, { marginLeft, marginRight });
      y += 30;
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Informe de Seguridad e Higiene en Obra', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(nombreMes(mes), pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(proyecto.denominacion, pageWidth / 2, y, { align: 'center' });
      if (proyecto.ubicacion) {
        y += 7;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(proyecto.ubicacion, pageWidth / 2, y, { align: 'center' });
      }

      // ---- Listado Personal por Contratista ----
      doc.addPage();
      y = 20;
      y = await drawPdfHeader(doc, proyectoHeader, y - 5, { marginLeft, marginRight });
      y += 4;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Listado Personal por Contratista', marginLeft, y);
      y += 10;

      const agrupados = empleadosActivos.reduce((acc, emp) => {
        const key = (emp.empresa || '').trim() || 'Sin contratista';
        if (!acc[key]) acc[key] = [];
        acc[key].push(emp);
        return acc;
      }, {} as Record<string, Empleado[]>);
      const contratistas = Object.keys(agrupados).sort((a, b) => a.localeCompare(b, 'es'));

      const headers = ['Documento', 'Nombres', 'Apellidos', 'Cargo', 'Fecha Inicio Contrato', 'Scan Documentos'];
      const colWidths = [30, 48, 48, 55, 40, 48];
      const startX = marginLeft;

      if (contratistas.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('No hay personal activo registrado.', marginLeft, y);
        y += 10;
      }

      for (const contratista of contratistas) {
        const lista = [...agrupados[contratista]].sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'));
        checkPageBreak(30);

        doc.setFillColor(240, 240, 240);
        doc.rect(marginLeft, y - 5, contentWidth, 10, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${contratista} (${lista.length})`, marginLeft + 2, y);
        y += 10;

        doc.setFillColor(230, 230, 230);
        doc.rect(startX, y - 5, contentWidth, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        let x = startX + 2;
        headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });
        y += 8;

        doc.setFont('helvetica', 'normal');
        for (const emp of lista) {
          checkPageBreak(12);
          doc.setFontSize(8);
          const row = [
            emp.nroDocumento || '-',
            emp.nombres || '-',
            emp.apellidos || '-',
            emp.cargo || '-',
            emp.fechaInicioContrato ? formatearFecha(emp.fechaInicioContrato) : '-',
            emp.scanDocumentos || 'Sin PDF',
          ];
          x = startX + 2;
          row.forEach((cell, i) => {
            const maxLens = [18, 26, 26, 30, 18, 26];
            const maxLen = maxLens[i] || 18;
            let text = String(cell);
            if (text.length > maxLen) text = text.slice(0, maxLen) + '...';
            if (i === 5 && emp.scanDocumentos) {
              doc.setTextColor(0, 102, 204);
              doc.textWithLink(text, x, y, { url: emp.scanDocumentos });
              doc.setTextColor(0, 0, 0);
            } else {
              doc.text(text, x, y);
            }
            x += colWidths[i];
          });
          y += 6;
        }
        y += 6;
      }

      // ---- Dotación de Indumentaria ----
      doc.addPage();
      y = 20;
      y = await drawPdfHeader(doc, proyectoHeader, y - 5, { marginLeft, marginRight });
      y += 4;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Dotación de Indumentaria', marginLeft, y);
      y += 8;

      const dotacionHeaders = ['Documento', 'Nombre y Apellido', 'Fecha Inicio Contrato', 'Calce', 'Última Dotación', 'Próxima Dotación', 'Alerta', 'Estado'];
      const dotacionRows = [
        ...dotacionActivos.map(emp => {
          const d = calcularDotacion(emp, salidas, productos, notasSalida);
          return [emp.nroDocumento, `${emp.nombres} ${emp.apellidos}`, formatearFecha(emp.fechaInicioContrato || ''), emp.calce || '-', d.ultimaDotacion ? formatearFecha(d.ultimaDotacion) : '-', d.proximaDotacion ? formatearFecha(d.proximaDotacion) : '-', d.alerta || 'OK', 'Activo'];
        }),
        ...dotacionInactivos.map(emp => {
          const d = calcularDotacion(emp, salidas, productos, notasSalida);
          return [emp.nroDocumento, `${emp.nombres} ${emp.apellidos}`, formatearFecha(emp.fechaInicioContrato || ''), emp.calce || '-', d.ultimaDotacion ? formatearFecha(d.ultimaDotacion) : '-', d.proximaDotacion ? formatearFecha(d.proximaDotacion) : '-', d.alerta || 'OK', 'Inactivo'];
        }),
      ];

      autoTable(doc, {
        head: [dotacionHeaders],
        body: dotacionRows,
        startY: y,
        styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 10, right: 10 },
      });

      // ---- Resumen de Accidentes e Incidentes ----
      doc.addPage();
      y = 20;
      y = await drawPdfHeader(doc, proyectoHeader, y - 5, { marginLeft, marginRight });
      y += 4;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen de Accidentes e Incidentes Ocurridos en Obra', marginLeft, y);
      y += 14;

      const boxWidth = (contentWidth - 10) / 3;
      const boxesInfo = [
        { label: 'Fecha Inicio Obra', value: proyecto.fechaInicioObra ? formatearFecha(proyecto.fechaInicioObra) : '-' },
        { label: 'Fecha Actual', value: formatearFecha(fechaLocalISO(new Date())) },
        { label: 'Último Accidente con Baja', value: fechaUltimoAccidenteStr ? formatearFecha(fechaUltimoAccidenteStr) : 'Sin registros' },
      ];
      let bx = marginLeft;
      boxesInfo.forEach(b => {
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(bx, y, boxWidth, 22, 2, 2, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(b.label, bx + boxWidth / 2, y + 8, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(b.value, bx + boxWidth / 2, y + 16, { align: 'center' });
        bx += boxWidth + 5;
      });
      y += 32;

      const colorSemaforo: [number, number, number] = diasSinAccidentes === null ? [150, 150, 150]
        : diasSinAccidentes >= 30 ? [34, 197, 94]
        : diasSinAccidentes >= 10 ? [234, 179, 8]
        : [239, 68, 68];
      doc.setFillColor(...colorSemaforo);
      doc.roundedRect(marginLeft, y, contentWidth, 40, 3, 3, 'F');
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(diasSinAccidentes === null ? '-' : String(diasSinAccidentes), pageWidth / 2, y + 24, { align: 'center' });
      doc.setFontSize(11);
      doc.text('DÍAS SIN ACCIDENTES CON BAJA', pageWidth / 2, y + 34, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 50;

      const boxWidth2 = (contentWidth - 5) / 2;
      const resumenBoxes = [
        { label: 'Total Accidentes', value: String(totalAccidentes) },
        { label: 'Días Perdidos', value: String(diasPerdidosTotal) },
      ];
      let bx2 = marginLeft;
      resumenBoxes.forEach(b => {
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(bx2, y, boxWidth2, 24, 2, 2, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(b.label, bx2 + boxWidth2 / 2, y + 9, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(b.value, bx2 + boxWidth2 / 2, y + 19, { align: 'center' });
        bx2 += boxWidth2 + 5;
      });

      // ---- Inventarios ----
      const clasifNorm = (c: string) => (c || '').trim().toUpperCase();
      const productosEPP = productos.filter(p => CLASIFICACIONES_EPP.includes(clasifNorm(p.clasificacion)));
      const productosHerramientas = productos.filter(p => !CLASIFICACIONES_EPP.includes(clasifNorm(p.clasificacion)));

      doc.addPage();
      y = 20;
      y = await drawPdfHeader(doc, proyectoHeader, y - 5, { marginLeft, marginRight });
      y += 4;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Inventario General de Equipos, Materiales y Herramientas', marginLeft, y);
      y += 8;
      autoTable(doc, {
        head: [['ÍTEM', 'CANT.']],
        body: productosHerramientas.map(p => [p.nombre, String(stockDisponible(p.codigo))]),
        startY: y,
        styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 10, right: 10 },
      });

      doc.addPage();
      y = 20;
      y = await drawPdfHeader(doc, proyectoHeader, y - 5, { marginLeft, marginRight });
      y += 4;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Inventario General de Equipo de Protección Personal e Indumentaria', marginLeft, y);
      y += 8;
      autoTable(doc, {
        head: [['ÍTEM', 'CANT.']],
        body: productosEPP.map(p => [p.nombre, String(stockDisponible(p.codigo))]),
        startY: y,
        styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 10, right: 10 },
      });

      const safeProyecto = proyecto.denominacion.replace(/\s+/g, '_');
      doc.save(`Informe_Mensual_${safeProyecto}_${mes}.pdf`);
    } catch (err: any) {
      alert('Error al generar el informe: ' + err.message);
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return <div className="animate-fade-in p-4 text-sm text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shrink-0">
            <FileBarChart size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Informe Mensual de Seguridad e Higiene en Obra</h2>
            <p className="text-sm text-muted-foreground">Genera el informe consolidado del proyecto en PDF</p>
          </div>
        </div>

        {error && <div className="text-sm text-red-500 mt-3">{error}</div>}

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium mb-2">Período del informe</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={generarInformePDF}
            disabled={generando}
            className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            {generando ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span className="relative z-10">{generando ? 'Generando...' : 'Generar Informe PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users size={16} />
            <span className="text-xs uppercase tracking-wider">Personal Activo</span>
          </div>
          <p className="text-2xl font-bold">{empleadosActivos.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertTriangle size={16} />
            <span className="text-xs uppercase tracking-wider">Incidentes Registrados</span>
          </div>
          <p className="text-2xl font-bold">{incidentesAbiertos}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ShieldAlert size={16} />
            <span className="text-xs uppercase tracking-wider">Dotaciones Vencidas/Próximas</span>
          </div>
          <p className="text-2xl font-bold">{dotacionesVencidas + dotacionesProximas}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package size={16} />
            <span className="text-xs uppercase tracking-wider">Productos Stock Bajo</span>
          </div>
          <p className="text-2xl font-bold">{productosStockBajo.length}</p>
        </div>
      </div>
    </div>
  );
}
