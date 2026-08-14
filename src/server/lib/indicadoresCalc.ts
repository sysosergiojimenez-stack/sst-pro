import type { IndicadorMensual } from './googleSheets_indicadores';

// Formulas y metas de referencia segun SST-IND-01 (Matriz_Indicadores_SST.xlsx,
// hojas "Matriz de Indicadores" y "Dashboard"). Solo la Meta es editable por
// obra (hoja IndicadoresMetas); el resto de la metadata es fija.

export type Direccion = 'menor_mejor' | 'mayor_mejor' | 'informativo';

export interface IndicadorDef {
  codigo: string;
  nombre: string;
  unidad: string;
  tipo: 'Reactivo' | 'Proactivo';
  direccion: Direccion;
  formula: string;
  frecuencia: string;
}

export const INDICADORES_DEF: Record<string, IndicadorDef> = {
  'IND-01': {
    codigo: 'IND-01', nombre: 'Índice de Frecuencia (IF)', unidad: 'accid. / millón HH',
    tipo: 'Reactivo', direccion: 'menor_mejor',
    formula: '(N° accidentes con baja × 1.000.000) / horas-hombre trabajadas', frecuencia: 'Mensual',
  },
  'IND-02': {
    codigo: 'IND-02', nombre: 'Índice de Gravedad (IG)', unidad: 'días / millón HH',
    tipo: 'Reactivo', direccion: 'menor_mejor',
    formula: '(N° días perdidos × 1.000.000) / horas-hombre trabajadas', frecuencia: 'Mensual',
  },
  'IND-03': {
    codigo: 'IND-03', nombre: '% Capacitaciones planificadas cumplidas', unidad: '%',
    tipo: 'Proactivo', direccion: 'mayor_mejor',
    formula: 'Capacitaciones realizadas / Capacitaciones planificadas', frecuencia: 'Mensual',
  },
  'IND-04': {
    codigo: 'IND-04', nombre: '% Inspecciones planificadas realizadas', unidad: '%',
    tipo: 'Proactivo', direccion: 'mayor_mejor',
    formula: 'Inspecciones realizadas / Inspecciones planificadas', frecuencia: 'Mensual',
  },
  'IND-05': {
    codigo: 'IND-05', nombre: '% Hallazgos cerrados dentro de plazo', unidad: '%',
    tipo: 'Proactivo', direccion: 'mayor_mejor',
    formula: 'Hallazgos cerrados en plazo / Hallazgos abiertos en el período', frecuencia: 'Mensual',
  },
  'IND-06': {
    codigo: 'IND-06', nombre: 'N° de reportes de cuasi-accidentes (near miss)', unidad: 'N°',
    tipo: 'Proactivo', direccion: 'informativo',
    formula: 'Conteo de reportes registrados en el período', frecuencia: 'Mensual',
  },
  'IND-07': {
    codigo: 'IND-07', nombre: '% de obras con CIPA constituida y activa', unidad: '%',
    tipo: 'Proactivo', direccion: 'mayor_mejor',
    formula: 'Obras con CIPA activa / Total de obras que la requieren', frecuencia: 'Trimestral',
  },
  'IND-08': {
    codigo: 'IND-08', nombre: '% de requisitos legales cumplidos', unidad: '%',
    tipo: 'Proactivo', direccion: 'mayor_mejor',
    formula: 'Requisitos legales cumplidos / Requisitos legales aplicables', frecuencia: 'Semestral',
  },
};

export interface ResultadoIndicador extends IndicadorDef {
  resultado: number;
  meta: number | null;
  estado: 'Cumple' | 'No cumple' | 'Informativo' | 'Sin meta';
  tendencia?: 'creciente' | 'decreciente' | 'estable' | null;
}

function sum(registros: IndicadorMensual[], key: keyof IndicadorMensual): number {
  return registros.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

function evaluarEstado(resultado: number, meta: number | null, direccion: Direccion): ResultadoIndicador['estado'] {
  if (direccion === 'informativo') return 'Informativo';
  if (meta === null || Number.isNaN(meta)) return 'Sin meta';
  return direccion === 'menor_mejor'
    ? (resultado <= meta ? 'Cumple' : 'No cumple')
    : (resultado >= meta ? 'Cumple' : 'No cumple');
}

export function calcularDashboard(
  registros: IndicadorMensual[],
  metasPorCodigo: Record<string, number | null>
): ResultadoIndicador[] {
  const horasHombre = sum(registros, 'horasHombre');
  const accidentes = sum(registros, 'accidentesConBaja');
  const diasPerdidos = sum(registros, 'diasPerdidos');
  const capacitPlan = sum(registros, 'capacitacionesPlanificadas');
  const capacitReal = sum(registros, 'capacitacionesRealizadas');
  const inspecPlan = sum(registros, 'inspeccionesPlanificadas');
  const inspecReal = sum(registros, 'inspeccionesRealizadas');
  const hallazgosAbiertos = sum(registros, 'hallazgosAbiertos');
  const hallazgosCerrados = sum(registros, 'hallazgosCerradosEnPlazo');
  const reportesCuasi = sum(registros, 'reportesCuasiAccidentes');
  const reqCumplidos = sum(registros, 'requisitosLegalesCumplidos');
  const reqAplicables = sum(registros, 'requisitosLegalesAplicables');

  const IF = horasHombre > 0 ? (accidentes * 1_000_000) / horasHombre : 0;
  const IG = horasHombre > 0 ? (diasPerdidos * 1_000_000) / horasHombre : 0;
  const pctCapacit = capacitPlan > 0 ? capacitReal / capacitPlan : 0;
  const pctInspec = inspecPlan > 0 ? inspecReal / inspecPlan : 0;
  const pctHallazgos = hallazgosAbiertos > 0 ? hallazgosCerrados / hallazgosAbiertos : 0;
  const pctReqLegales = reqAplicables > 0 ? reqCumplidos / reqAplicables : 0;

  // IND-07: se toma el ultimo registro cargado de cada obra dentro del
  // conjunto filtrado, y se mide cuantas de esas obras tienen CIPA activa.
  const ultimoPorObra = new Map<string, IndicadorMensual>();
  for (const r of registros) {
    if (!r.proyecto) continue;
    const previo = ultimoPorObra.get(r.proyecto);
    if (!previo || r.mes > previo.mes) ultimoPorObra.set(r.proyecto, r);
  }
  const obrasConDatos = [...ultimoPorObra.values()];
  const obrasConCipa = obrasConDatos.filter(o => (o.cipaActiva || '').toUpperCase() === 'SI').length;
  const pctCipa = obrasConDatos.length > 0 ? obrasConCipa / obrasConDatos.length : 0;

  // IND-06: no tiene meta numerica (es "tendencia creciente" segun la
  // matriz), se informa comparando los dos meses mas recientes con datos.
  const meses = [...new Set(registros.map(r => r.mes).filter(Boolean))].sort();
  let tendencia: ResultadoIndicador['tendencia'] = null;
  if (meses.length >= 2) {
    const ultimo = meses[meses.length - 1];
    const anterior = meses[meses.length - 2];
    const totalUltimo = sum(registros.filter(r => r.mes === ultimo), 'reportesCuasiAccidentes');
    const totalAnterior = sum(registros.filter(r => r.mes === anterior), 'reportesCuasiAccidentes');
    tendencia = totalUltimo > totalAnterior ? 'creciente' : totalUltimo < totalAnterior ? 'decreciente' : 'estable';
  }

  const construir = (codigo: string, resultado: number, direccion: Direccion): ResultadoIndicador => {
    const meta = metasPorCodigo[codigo] ?? null;
    return {
      ...INDICADORES_DEF[codigo],
      resultado,
      meta,
      estado: evaluarEstado(resultado, meta, direccion),
    };
  };

  return [
    construir('IND-01', IF, 'menor_mejor'),
    construir('IND-02', IG, 'menor_mejor'),
    construir('IND-03', pctCapacit, 'mayor_mejor'),
    construir('IND-04', pctInspec, 'mayor_mejor'),
    construir('IND-05', pctHallazgos, 'mayor_mejor'),
    { ...construir('IND-06', reportesCuasi, 'informativo'), tendencia },
    construir('IND-07', pctCipa, 'mayor_mejor'),
    construir('IND-08', pctReqLegales, 'mayor_mejor'),
  ];
}
