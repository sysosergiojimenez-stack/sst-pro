import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import { Calculator, Info, FileDown, ChevronRight } from 'lucide-react';

interface CalculadoraPlataformasProps {
  proyecto?: string;
}

const tablaRef = [
  { altura: 50, ext: 1.3, base: 4.6, carga: 800 },
  { altura: 50, ext: 1.5, base: 4.6, carga: 800 },
  { altura: 50, ext: 1.7, base: 4.4, carga: 560 },
  { altura: 100, ext: 1.3, base: 4.6, carga: 800 },
  { altura: 100, ext: 1.5, base: 4.6, carga: 720 },
  { altura: 100, ext: 1.7, base: 4.4, carga: 480 },
  { altura: 120, ext: 1.3, base: 4.6, carga: 800 },
  { altura: 120, ext: 1.5, base: 4.6, carga: 690 },
  { altura: 120, ext: 1.7, base: 4.4, carga: 450 },
  { altura: 150, ext: 1.3, base: 4.6, carga: 800 },
  { altura: 150, ext: 1.5, base: 4.6, carga: 640 },
  { altura: 150, ext: 1.7, base: 4.4, carga: 400 },
];

const fmt = (n: number | undefined | null): string => {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('es-PY', { maximumFractionDigits: 1 });
};

const nearest = (arr: number[], val: number): number => {
  return arr.reduce((a, b) => Math.abs(b - val) < Math.abs(a - val) ? b : a);
};

export default function CalculadoraPlataformas({ proyecto }: CalculadoraPlataformasProps) {
  // Datos de la instalación
  const [referencia, setReferencia] = useState('');
  const [pesoPlataforma, setPesoPlataforma] = useState<number | ''>(600);
  const [pesoMecanismo, setPesoMecanismo] = useState<number | ''>(310);
  const [pesoCables, setPesoCables] = useState<number | ''>(0);
  const [pesoTensores, setPesoTensores] = useState<number | ''>(0);
  const [cargaTrabajo, setCargaTrabajo] = useState<number | ''>(400);
  const [extension, setExtension] = useState<number | ''>(1.3);
  const [distanciaBases, setDistanciaBases] = useState<number | ''>(4.6);
  const [alturaTrabajo, setAlturaTrabajo] = useState<number | ''>(50);
  const [contrapesoReal, setContrapesoReal] = useState<number | ''>(1000);

  // Auxiliares mecanismo
  const [pesoConjuntoMotor, setPesoConjuntoMotor] = useState<number | ''>('');
  const [cantidadConjuntos, setCantidadConjuntos] = useState<number | ''>(2);

  // Auxiliares cables
  const [pesoLinealCable, setPesoLinealCable] = useState<number | ''>('');
  const [cantidadCables, setCantidadCables] = useState<number | ''>(4);

  // Auxiliares tensores
  const [pesoUnitarioTensor, setPesoUnitarioTensor] = useState<number | ''>('');
  const [cantidadTensores, setCantidadTensores] = useState<number | ''>(4);

  // Bloqueos por cálculo automático
  const [mecanismoBloqueado, setMecanismoBloqueado] = useState(false);
  const [cablesBloqueado, setCablesBloqueado] = useState(false);
  const [tensoresBloqueado, setTensoresBloqueado] = useState(false);

  const [resultados, setResultados] = useState({
    F: 0,
    G: 0,
    n: 0,
    statusG: 'neutral' as 'ok' | 'bad' | 'neutral' | 'warn',
    statusGText: '',
    statusN: 'neutral' as 'ok' | 'bad' | 'neutral' | 'warn',
    statusNText: '',
    statusCargaMax: 'neutral' as 'ok' | 'bad' | 'neutral' | 'warn',
    statusCargaMaxText: '',
    statusCarga: 'neutral' as 'ok' | 'bad' | 'neutral' | 'warn',
    statusCargaText: '',
    rowMatch: null as typeof tablaRef[0] | null,
    exactMatch: false,
    altMatch: 0,
    extMatch: 0,
    fueraDeRango: false,
  });

  // Actualizar mecanismo automáticamente
  useEffect(() => {
    const peso = typeof pesoConjuntoMotor === 'number' ? pesoConjuntoMotor : 0;
    const cantidad = typeof cantidadConjuntos === 'number' ? cantidadConjuntos : 0;
    if (peso > 0 && cantidad > 0) {
      const total = peso * cantidad;
      setPesoMecanismo(Number(total.toFixed(1)));
      setMecanismoBloqueado(true);
    } else {
      setMecanismoBloqueado(false);
    }
  }, [pesoConjuntoMotor, cantidadConjuntos]);

  // Actualizar cables automáticamente
  useEffect(() => {
    const pesoLineal = typeof pesoLinealCable === 'number' ? pesoLinealCable : 0;
    const cantidad = typeof cantidadCables === 'number' ? cantidadCables : 0;
    const altura = typeof alturaTrabajo === 'number' ? alturaTrabajo : 0;
    if (pesoLineal > 0 && cantidad > 0 && altura > 0) {
      const total = pesoLineal * cantidad * altura;
      setPesoCables(Number(total.toFixed(1)));
      setCablesBloqueado(true);
    } else {
      setCablesBloqueado(false);
    }
  }, [pesoLinealCable, cantidadCables, alturaTrabajo]);

  // Actualizar tensores automáticamente
  useEffect(() => {
    const pesoUnitario = typeof pesoUnitarioTensor === 'number' ? pesoUnitarioTensor : 0;
    const cantidad = typeof cantidadTensores === 'number' ? cantidadTensores : 0;
    if (pesoUnitario > 0 && cantidad > 0) {
      const total = pesoUnitario * cantidad;
      setPesoTensores(Number(total.toFixed(1)));
      setTensoresBloqueado(true);
    } else {
      setTensoresBloqueado(false);
    }
  }, [pesoUnitarioTensor, cantidadTensores]);

  // Cálculo principal
  useEffect(() => {
    const pp = typeof pesoPlataforma === 'number' ? pesoPlataforma : 0;
    const pm = typeof pesoMecanismo === 'number' ? pesoMecanismo : 0;
    const pc = typeof pesoCables === 'number' ? pesoCables : 0;
    const pt = typeof pesoTensores === 'number' ? pesoTensores : 0;
    const ct = typeof cargaTrabajo === 'number' ? cargaTrabajo : 0;
    const a = typeof extension === 'number' ? extension : 0;
    const b = typeof distanciaBases === 'number' ? distanciaBases : 0;
    const altura = typeof alturaTrabajo === 'number' ? alturaTrabajo : 0;
    const cr = typeof contrapesoReal === 'number' ? contrapesoReal : 0;

    const F = pp + pm + pc + pt + ct;
    const G = a > 0 && b > 0 ? (2 * F * a) / b : 0;

    // Estado contrapeso
    let statusG: 'ok' | 'bad' | 'neutral' = 'neutral';
    let statusGText = '';
    if (cr > 0 && a > 0 && b > 0) {
      if (cr >= G) {
        statusG = 'ok';
        statusGText = `${fmt(cr)} kg colocados ≥ ${fmt(G)} kg requeridos.`;
      } else {
        statusG = 'bad';
        const falta = G - cr;
        statusGText = `Faltan ${fmt(falta)} kg. Colocado: ${fmt(cr)} kg · Requerido: ${fmt(G)} kg.`;
      }
    } else {
      statusG = 'neutral';
      statusGText = 'Ingresá el contrapeso real para verificar si alcanza el mínimo.';
    }

    // Estado n logrado
    let statusN: 'ok' | 'bad' | 'neutral' = 'neutral';
    let statusNText = '';
    let n = 0;
    if (cr > 0 && F > 0 && a > 0) {
      n = (cr * b) / (F * a);
      if (n >= 2) {
        statusN = 'ok';
        statusNText = `n = ${fmt(n)} — cumple el mínimo exigido (n ≥ 2).`;
      } else {
        statusN = 'bad';
        statusNText = `n = ${fmt(n)} — por debajo del mínimo exigido (n ≥ 2).`;
      }
    } else {
      statusN = 'neutral';
      statusNText = '—';
    }

    // Carga máxima admisible según estabilidad (n>=2), con el contrapeso real ingresado
    const pesoBase = pp + pm + pc + pt;
    let statusCargaMax: 'ok' | 'bad' | 'neutral' | 'warn' = 'neutral';
    let statusCargaMaxText = '';
    if (cr > 0 && a > 0 && b > 0) {
      const cargaMax = (cr * b) / (2 * a) - pesoBase;
      if (cargaMax < 0) {
        statusCargaMax = 'bad';
        statusCargaMaxText = `El contrapeso ni siquiera alcanza a sostener el peso propio del sistema (${fmt(pesoBase)} kg) con esta geometría. No hay carga de trabajo posible en esta configuración.`;
      } else if (ct <= cargaMax) {
        statusCargaMax = 'ok';
        statusCargaMaxText = `Con ${fmt(cr)} kg de contrapeso, a = ${a} m y b = ${b} m: máximo ${fmt(cargaMax)} kg de carga de trabajo. Tu carga prevista (${fmt(ct)} kg) está dentro de ese máximo.`;
      } else {
        statusCargaMax = 'bad';
        statusCargaMaxText = `Con ${fmt(cr)} kg de contrapeso, a = ${a} m y b = ${b} m: máximo ${fmt(cargaMax)} kg de carga de trabajo. Tu carga prevista (${fmt(ct)} kg) LA SUPERA — reducí la carga, aumentá el contrapeso, o corregí la geometría (a/b).`;
      }
    } else {
      statusCargaMax = 'neutral';
      statusCargaMaxText = 'Ingresá el contrapeso real, la extensión (a) y la distancia entre bases (b) para calcularla.';
    }

    // Tabla / carga permitida (referencia del fabricante — solo válida dentro del rango que probó)
    const fueraDeRango = a > 1.7 || a < 1.3 || b < 4.4 || b > 4.6;
    const altMatch = nearest([50, 100, 120, 150], altura);
    const extMatch = nearest([1.3, 1.5, 1.7], a);
    const row = tablaRef.find(r => r.altura === altMatch && r.ext === extMatch);
    const exact = altMatch === altura && extMatch === a;

    let statusCarga: 'ok' | 'bad' | 'neutral' | 'warn' = 'neutral';
    let statusCargaText = '';
    if (fueraDeRango) {
      statusCarga = 'warn';
      statusCargaText = `Tu extensión (a = ${a} m) o tu distancia entre bases (b = ${b} m) está fuera del rango que el fabricante probó (a: 1,3–1,7 m · b: 4,4–4,6 m). La tabla NO aplica a esta configuración: usá exclusivamente el resultado de "Carga máxima admisible" de arriba, calculado con la fórmula real.`;
    } else if (row) {
      if (ct <= row.carga) {
        statusCarga = 'ok';
        statusCargaText = `${fmt(ct)} kg ≤ ${row.carga} kg permitidos (fila: ${row.altura} m / ${row.ext} m)${exact ? '' : ' — valor más cercano, no exacto'}.`;
      } else {
        statusCarga = 'bad';
        statusCargaText = `${fmt(ct)} kg supera los ${row.carga} kg de la fila ${row.altura} m / ${row.ext} m${exact ? '' : ' — valor más cercano, no exacto'}.`;
      }
    } else {
      statusCarga = 'neutral';
      statusCargaText = '—';
    }

    setResultados({
      F,
      G,
      n,
      statusG,
      statusGText,
      statusN,
      statusNText,
      statusCargaMax,
      statusCargaMaxText,
      statusCarga,
      statusCargaText,
      rowMatch: row || null,
      exactMatch: exact,
      altMatch,
      extMatch,
      fueraDeRango,
    });
  }, [pesoPlataforma, pesoMecanismo, pesoCables, pesoTensores, cargaTrabajo, extension, distanciaBases, alturaTrabajo, contrapesoReal]);

  const svgContent = useMemo(() => {
    const leftMoment = (typeof contrapesoReal === 'number' && contrapesoReal > 0 ? contrapesoReal : resultados.G) * (typeof distanciaBases === 'number' ? distanciaBases : 0);
    const rightMoment = resultados.F * (typeof extension === 'number' ? extension : 0);
    const max = Math.max(leftMoment, rightMoment, 1);
    const leftH = 20 + (leftMoment / max) * 90;
    const rightH = 20 + (rightMoment / max) * 90;
    const ok = leftMoment >= rightMoment;
    const barColor = ok ? '#1E7A44' : '#A32020';
    const rightColor = '#B08D57';

    return (
      <svg width="100%" viewBox="0 0 400 190" style={{ maxWidth: '400px' }}>
        <line x1="30" y1="150" x2="370" y2="150" stroke="#C9C4B8" strokeWidth="3" strokeLinecap="round" />
        <polygon points="200,150 188,172 212,172" fill="#1F3864" />
        <rect x="70" y={150 - leftH} width="60" height={leftH} fill={barColor} rx="4" />
        <text x="100" y={150 - leftH - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1F3864">G·b</text>
        <text x="100" y="168" textAnchor="middle" fontSize="11" fill="#5B6270">Contrapeso</text>
        <rect x="270" y={150 - rightH} width="60" height={rightH} fill={rightColor} rx="4" />
        <text x="300" y={150 - rightH - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1F3864">F·a</text>
        <text x="300" y="168" textAnchor="middle" fontSize="11" fill="#5B6270">Carga + equipo</text>
      </svg>
    );
  }, [resultados.F, resultados.G, contrapesoReal, distanciaBases, extension]);

  const handleNumberChange = (setter: (v: number | '') => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setter('');
      return;
    }
    const num = parseFloat(val);
    setter(Number.isNaN(num) ? '' : num);
  };

  const statusClass = (status: 'ok' | 'bad' | 'neutral' | 'warn') => {
    switch (status) {
      case 'ok':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'bad':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'warn':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const m = 14;
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Calculadora de Contrapesos y Estabilidad — ZLP800', m, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${proyecto || '-'}`, m, y);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageW - m, y, { align: 'right' });
    y += 6;
    if (referencia.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Referencia / Identificación:`, m, y);
      doc.setFont('helvetica', 'normal');
      doc.text(referencia.trim(), m + 70, y);
      y += 6;
    }
    y += 4;

    const line = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, m, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, m + 70, y);
      y += 6;
    };

    const lineWrap = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, m, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const maxW = pageW - m * 2;
      const lines = doc.splitTextToSize(value || '—', maxW);
      doc.text(lines, m, y);
      y += lines.length * 5 + 3;
    };

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos de la instalación', m, y);
    y += 7;
    doc.setFontSize(10);

    line('Peso de la plataforma:', `${fmt(pesoPlataforma)} kg`);
    line('Mecanismo de suspensión:', `${fmt(pesoMecanismo)} kg`);
    line('Cables de suspensión:', `${fmt(pesoCables)} kg`);
    line('Pesos tensores (martillos):', `${fmt(pesoTensores)} kg`);
    line('Carga de trabajo prevista:', `${fmt(cargaTrabajo)} kg`);
    line('Extensión frontal — a:', `${fmt(extension)} m`);
    line('Distancia entre bases — b:', `${fmt(distanciaBases)} m`);
    line('Altura de trabajo:', `${fmt(alturaTrabajo)} m`);
    line('Contrapeso real a colocar:', `${fmt(contrapesoReal)} kg`);
    y += 4;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resultados', m, y);
    y += 7;
    doc.setFontSize(10);

    line('F · Peso total:', `${fmt(resultados.F)} kg`);
    line('G mínimo requerido:', `${fmt(resultados.G)} kg`);
    lineWrap('Contrapeso:', resultados.statusGText || '—');
    lineWrap('Coeficiente n logrado:', resultados.statusNText || '—');
    lineWrap('Carga máxima admisible:', resultados.statusCargaMaxText || '—');
    lineWrap('Referencia — tabla del fabricante:', resultados.statusCargaText || '—');
    y += 4;

    if (resultados.rowMatch) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Tabla del fabricante (Cuadro 2)', m, y);
      y += 7;
      doc.setFontSize(9);
      const headers = ['', 'Altura', 'Extensión', 'Dist. bases', 'Carga perm.'];
      const colW = [8, 22, 28, 28, 33];
      let x = m;
      doc.setFont('helvetica', 'bold');
      headers.forEach((h, i) => {
        doc.setFillColor(31, 56, 100);
        doc.setTextColor(255, 255, 255);
        doc.rect(x, y, colW[i], 7, 'F');
        if (h) doc.text(h, x + 2, y + 5);
        x += colW[i];
      });
      y += 7;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setLineWidth(0.2);
      tablaRef.forEach((row) => {
        const match = row.altura === resultados.altMatch && row.ext === resultados.extMatch;
        if (match) {
          doc.setFont('helvetica', 'bold');
          doc.setLineWidth(0.5);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setLineWidth(0.2);
        }
        x = m;
        const values = [match ? '>' : '', `${row.altura} m`, `${row.ext} m`, `${row.base} m`, `${row.carga} kg`];
        values.forEach((v, i) => {
          doc.rect(x, y, colW[i], 6, 'D');
          if (v) doc.text(v, x + 2, y + 4.5);
          x += colW[i];
        });
        doc.setLineWidth(0.2);
        y += 6;
      });
      y += 6;
    }

    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    const nota = 'Herramienta de apoyo al cálculo — no reemplaza la validación del área técnica / ingeniería de obra. Toda instalación debe registrarse en el Formulario SST-FOR-16 antes de autorizarse, conforme al Procedimiento SST-PRO-08.';
    const notaLines = doc.splitTextToSize(nota, pageW - m * 2);
    doc.text(notaLines, m, y);

    doc.save(`Calculadora_ZLP800_${proyecto ? proyecto.replace(/\s+/g, '_') : ''}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="text-primary" size={24} />
          <h2 className="text-lg font-semibold">Calculadora Plataformas Suspendidas</h2>
        </div>
        <button
          onClick={exportarPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors text-sm"
        >
          <FileDown size={16} /> Exportar PDF
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-3">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Herramienta de apoyo al cálculo</p>
          <p className="text-amber-600/80">No reemplaza la validación del área técnica / ingeniería de obra. Toda instalación debe registrarse en el Formulario SST-FOR-16 antes de autorizarse, conforme al Procedimiento SST-PRO-08.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INPUT PANEL */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">Datos de la instalación</h3>

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-xs text-muted-foreground">
            <strong className="text-primary">Factor de seguridad fijo: n ≥ 2</strong> — conforme al manual del fabricante (Shenxi/JASO ZLP800). La norma EN 1808 exige n ≥ 3 para plataformas suspendidas con contrapesos; verificar la certificación real del equipo si corresponde ese estándar.
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Referencia / Identificación del andamio</label>
            <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej: Andamio A-12 / Frente norte / Piso 3" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            <p className="text-[11px] text-muted-foreground">Número de identificación, ubicación o referencia interna de la instalación.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Peso de la plataforma <span className="normal-case">(kg)</span></label>
            <input type="number" min="0" step="1" value={pesoPlataforma} onChange={handleNumberChange(setPesoPlataforma)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            <p className="text-[11px] text-muted-foreground">Estructura a elevar: 600 kg (acero) / 430 kg (aluminio), según manual, Tabla 1</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Mecanismo de suspensión <span className="normal-case">(kg)</span></label>
              <input type="number" min="0" step="1" value={pesoMecanismo} onChange={handleNumberChange(setPesoMecanismo)} readOnly={mecanismoBloqueado} className={`w-full border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50 ${mecanismoBloqueado ? 'bg-secondary/50 border-border' : 'bg-secondary border-border'}`} />
              <p className="text-[11px] text-muted-foreground">{mecanismoBloqueado ? 'Calculado automáticamente (bloqueado) — borrar el peso por conjunto para editar a mano' : 'Calculado abajo, o ingresar manualmente'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Cables de suspensión <span className="normal-case">(kg)</span></label>
              <input type="number" min="0" step="0.5" value={pesoCables} onChange={handleNumberChange(setPesoCables)} readOnly={cablesBloqueado} className={`w-full border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50 ${cablesBloqueado ? 'bg-secondary/50 border-border' : 'bg-secondary border-border'}`} />
              <p className="text-[11px] text-muted-foreground">{cablesBloqueado ? 'Calculado automáticamente (bloqueado) — borrar el peso lineal para editar a mano' : 'Calculado abajo, o ingresar manualmente'}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Pesos tensores (martillos) <span className="normal-case">(kg)</span></label>
            <input type="number" min="0" step="0.5" value={pesoTensores} onChange={handleNumberChange(setPesoTensores)} readOnly={tensoresBloqueado} className={`w-full border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50 ${tensoresBloqueado ? 'bg-secondary/50 border-border' : 'bg-secondary border-border'}`} />
            <p className="text-[11px] text-muted-foreground">{tensoresBloqueado ? 'Calculado automáticamente (bloqueado) — borrar el peso unitario para editar a mano' : 'Calculado abajo, o ingresar manualmente'}</p>
          </div>

          {/* Subcalc mecanismo */}
          <div className="bg-secondary/40 border border-border rounded-lg p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mecanismo de suspensión — cálculo auxiliar</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Peso por conjunto <span className="normal-case">(kg)</span></label>
                <input type="number" min="0" step="1" placeholder="motor + antivuelco + bastidor" value={pesoConjuntoMotor} onChange={handleNumberChange(setPesoConjuntoMotor)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                <p className="text-[11px] text-muted-foreground">Un motor + su sistema antivuelco + su bastidor</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Cantidad de conjuntos <span className="normal-case">(unid.)</span></label>
                <input type="number" min="1" step="1" value={cantidadConjuntos} onChange={handleNumberChange(setCantidadConjuntos)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                <p className="text-[11px] text-muted-foreground">Estándar: 2 (motor izquierdo y derecho)</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-semibold text-primary">
              {typeof pesoConjuntoMotor === 'number' && pesoConjuntoMotor > 0 && typeof cantidadConjuntos === 'number' && cantidadConjuntos > 0
                ? `Peso total del mecanismo: ${fmt(pesoConjuntoMotor * cantidadConjuntos)} kg (${pesoConjuntoMotor} kg × ${cantidadConjuntos})`
                : 'Peso total del mecanismo: — kg (peso por conjunto × cantidad)'}
            </div>
          </div>

          {/* Subcalc cables */}
          <div className="bg-secondary/40 border border-border rounded-lg p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso de cables — cálculo auxiliar</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Peso lineal del cable <span className="normal-case">(kg/m)</span></label>
                <input type="number" min="0" step="0.01" placeholder="ver ficha técnica" value={pesoLinealCable} onChange={handleNumberChange(setPesoLinealCable)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                <p className="text-[11px] text-muted-foreground">Dato del proveedor del cable (8,6 mm, 4×31W+IWS)</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Cantidad de cables <span className="normal-case">(tramos)</span></label>
                <input type="number" min="1" step="1" value={cantidadCables} onChange={handleNumberChange(setCantidadCables)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                <p className="text-[11px] text-muted-foreground">Estándar: 4 (carga + seguridad, en los 2 motores)</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-semibold text-primary">
              {typeof pesoLinealCable === 'number' && pesoLinealCable > 0 && typeof cantidadCables === 'number' && cantidadCables > 0 && typeof alturaTrabajo === 'number' && alturaTrabajo > 0
                ? `Peso total de cables: ${fmt(pesoLinealCable * cantidadCables * alturaTrabajo)} kg (${alturaTrabajo} m × ${cantidadCables} × ${pesoLinealCable} kg/m)`
                : 'Peso total de cables: — kg (completar peso lineal para calcular)'}
            </div>
          </div>

          {/* Subcalc tensores */}
          <div className="bg-secondary/40 border border-border rounded-lg p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pesos tensores (martillos) — cálculo auxiliar</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Peso unitario <span className="normal-case">(kg)</span></label>
                <input type="number" min="0" step="0.5" placeholder="ver ficha técnica" value={pesoUnitarioTensor} onChange={handleNumberChange(setPesoUnitarioTensor)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                <p className="text-[11px] text-muted-foreground">Cuelgan del extremo inferior de cada cable, para tensarlo y evitar el bamboleo con viento</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Cantidad de tensores <span className="normal-case">(unid.)</span></label>
                <input type="number" min="0" step="1" value={cantidadTensores} onChange={handleNumberChange(setCantidadTensores)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                <p className="text-[11px] text-muted-foreground">Estándar: 4 (uno por extremo de cable — carga y seguridad, en los 2 motores)</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-semibold text-primary">
              {typeof pesoUnitarioTensor === 'number' && pesoUnitarioTensor > 0 && typeof cantidadTensores === 'number' && cantidadTensores > 0
                ? `Peso total de tensores: ${fmt(pesoUnitarioTensor * cantidadTensores)} kg (${pesoUnitarioTensor} kg × ${cantidadTensores})`
                : 'Peso total de tensores: — kg (peso unitario × cantidad)'}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Carga de trabajo prevista <span className="normal-case">(kg)</span></label>
            <input type="number" min="0" step="10" value={cargaTrabajo} onChange={handleNumberChange(setCargaTrabajo)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            <p className="text-[11px] text-muted-foreground">Personas + herramientas + materiales que subirán a la plataforma</p>
          </div>

          <hr className="border-border" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Extensión frontal — a <span className="normal-case">(m)</span></label>
              <input type="number" min="0.1" step="0.1" value={extension} onChange={handleNumberChange(setExtension)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              <p className="text-[11px] text-muted-foreground">Rango fabricante: 1,3 a 1,7 m</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Distancia entre bases — b <span className="normal-case">(m)</span></label>
              <input type="number" min="0.1" step="0.1" value={distanciaBases} onChange={handleNumberChange(setDistanciaBases)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
              <p className="text-[11px] text-muted-foreground">4,6 m (a=1,3–1,5) · 4,4 m (a=1,7)</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Altura de trabajo <span className="normal-case">(m)</span></label>
            <input type="number" min="1" step="1" value={alturaTrabajo} onChange={handleNumberChange(setAlturaTrabajo)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            <p className="text-[11px] text-muted-foreground">Para cruzar contra la tabla de cargas del fabricante</p>
          </div>

          <hr className="border-border" />

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Contrapeso real a colocar <span className="normal-case">(kg — opcional)</span></label>
            <input type="number" min="0" step="10" value={contrapesoReal} onChange={handleNumberChange(setContrapesoReal)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
            <p className="text-[11px] text-muted-foreground">Dejar en 0 para ver solo el mínimo requerido</p>
          </div>
        </div>

        {/* RESULTS PANEL */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">Resultado del cálculo</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/40 border border-border rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">F · Peso total</p>
              <p className="text-2xl font-bold font-mono text-primary">{fmt(resultados.F)}<span className="text-sm font-medium text-muted-foreground ml-1">kg</span></p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">G mínimo requerido</p>
              <p className="text-2xl font-bold font-mono text-primary">{fmt(resultados.G)}<span className="text-sm font-medium text-muted-foreground ml-1">kg</span></p>
            </div>
          </div>

          <div className={`border rounded-lg p-4 text-sm ${statusClass(resultados.statusG)}`}>
            <strong className="block text-xs uppercase tracking-wider mb-1">Contrapeso</strong>
            {resultados.statusGText}
          </div>

          <div className={`border rounded-lg p-4 text-sm ${statusClass(resultados.statusN)}`}>
            <strong className="block text-xs uppercase tracking-wider mb-1">Coeficiente n logrado</strong>
            {resultados.statusNText}
          </div>

          <div className={`border rounded-lg p-4 text-sm ${statusClass(resultados.statusCargaMax)}`}>
            <strong className="block text-xs uppercase tracking-wider mb-1">Carga máxima admisible (según estabilidad, con tu contrapeso real)</strong>
            {resultados.statusCargaMaxText}
          </div>

          <div className={`border rounded-lg p-4 text-sm ${statusClass(resultados.statusCarga)}`}>
            <strong className="block text-xs uppercase tracking-wider mb-1">Referencia — tabla del fabricante (configuración estándar)</strong>
            {resultados.statusCargaText}
          </div>

          <div className="text-center py-2">
            {svgContent}
            <p className="text-xs text-muted-foreground mt-2">Balance de momentos: contrapeso (G·b) a la izquierda, carga (F·a) a la derecha del punto de apoyo.</p>
          </div>

          <hr className="border-border" />

          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Tabla del fabricante (Cuadro 2)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="border border-border px-1 py-1.5 text-center w-8"></th>
                  <th className="border border-border px-2 py-1.5 text-center">Altura</th>
                  <th className="border border-border px-2 py-1.5 text-center">Extensión</th>
                  <th className="border border-border px-2 py-1.5 text-center">Dist. bases</th>
                  <th className="border border-border px-2 py-1.5 text-center">Carga perm.</th>
                </tr>
              </thead>
              <tbody>
                {tablaRef.map((row, idx) => {
                  const match = row.altura === resultados.altMatch && row.ext === resultados.extMatch;
                  const cellClass = match
                    ? 'border-2 border-foreground px-2 py-1.5 text-center font-bold'
                    : 'border border-border px-2 py-1.5 text-center';
                  return (
                    <tr key={idx} className={match ? 'font-bold' : 'hover:bg-secondary/30'}>
                      <td className="border border-border px-1 py-1.5 text-center">
                        {match && <ChevronRight className="text-foreground mx-auto" size={16} />}
                      </td>
                      <td className={cellClass}>{row.altura} m</td>
                      <td className={cellClass}>{row.ext} m</td>
                      <td className={cellClass}>{row.base} m</td>
                      <td className={cellClass}>{row.carga} kg</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
