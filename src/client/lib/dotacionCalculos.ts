// Helpers para trabajar con fechas SIEMPRE en horario local, evitando el corrimiento
// de un dia que ocurre cuando "YYYY-MM-DD" se interpreta como medianoche UTC.
export const parseFechaLocal = (fechaStr: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return new Date(Number(fechaStr.slice(0, 4)), Number(fechaStr.slice(5, 7)) - 1, Number(fechaStr.slice(8, 10)));
  }
  return new Date(fechaStr);
};

export const fechaLocalISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

export const EMPRESA_DOTACION = 'ALTAZENTA NORTE SA';
export const CLASIFICACIONES_BOTIN = ['BOTIN P/ OBRERO', 'BOTIN P/ SUPERVISOR'];
export const DIAS_VIGENCIA_DOTACION = 160;
export const DIAS_ALERTA_PROXIMO = 15;

export interface DotacionEmpleado {
  nroDocumento: string;
}

export interface DotacionSalida {
  trabajadorRetira: string;
  refItem: string;
  refNotaSalida: string;
}

export interface DotacionProducto {
  codigo: string;
  clasificacion: string;
}

export interface DotacionNotaSalida {
  idRegistro: string;
  fecha: string;
}

export interface ResultadoDotacion {
  ultimaDotacion: string;
  proximaDotacion: string;
  alerta: string;
}

export function calcularDotacion(
  emp: DotacionEmpleado,
  salidas: DotacionSalida[],
  productos: DotacionProducto[],
  notasSalida: DotacionNotaSalida[]
): ResultadoDotacion {
  const salidasDelEmpleado = salidas.filter(s => s.trabajadorRetira === emp.nroDocumento);
  const conProductoYNota = salidasDelEmpleado.map(s => {
    const prod = productos.find(p => p.codigo === s.refItem);
    const nota = notasSalida.find(n => n.idRegistro === s.refNotaSalida);
    return { s, prod, nota };
  });
  const entregasBotin = conProductoYNota
    .filter(x => x.prod && x.nota?.fecha && CLASIFICACIONES_BOTIN.includes(x.prod.clasificacion?.trim().toUpperCase() || ''));

  if (entregasBotin.length === 0) {
    return { ultimaDotacion: '', proximaDotacion: '', alerta: 'Sin dotacion registrada' };
  }

  let fechaMasReciente: Date | null = null;
  let fechaMasRecienteStr = '';
  for (const e of entregasBotin) {
    const d = parseFechaLocal(e.nota!.fecha);
    if (!isNaN(d.getTime()) && (!fechaMasReciente || d > fechaMasReciente)) {
      fechaMasReciente = d;
      fechaMasRecienteStr = e.nota!.fecha;
    }
  }

  if (!fechaMasReciente) {
    return { ultimaDotacion: '', proximaDotacion: '', alerta: 'Sin dotacion registrada' };
  }

  const proxima = new Date(fechaMasReciente);
  proxima.setDate(proxima.getDate() + DIAS_VIGENCIA_DOTACION);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diasRestantes = Math.floor((proxima.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  let alerta = '';
  if (diasRestantes < 0) alerta = 'Vencido';
  else if (diasRestantes <= DIAS_ALERTA_PROXIMO) alerta = 'Proximo a vencer';

  return {
    ultimaDotacion: fechaMasRecienteStr,
    proximaDotacion: fechaLocalISO(proxima),
    alerta,
  };
}
