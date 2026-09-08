import jsPDF from 'jspdf';
import { drawPdfHeader, type ProyectoPdfHeader } from './pdfHeader';

export interface EmpleadoFicha {
  nroDocumento: string;
  tipoDocumento?: string;
  nombres: string;
  apellidos: string;
  ciudadNacimiento?: string;
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  nombrePadre?: string;
  ocupacionPadre?: string;
  nombreMadre?: string;
  ocupacionMadre?: string;
  nombreConyuge?: string;
  ocupacionConyuge?: string;
  fechaNacConyuge?: string;
  direccion?: string;
  nro?: string;
  dpto?: string;
  piso?: string;
  barrio?: string;
  ciudad?: string;
  departamentoTerritorial?: string;
  puntoReferencia?: string;
  telefonoCelular: string;
  telefonoEmergencia?: string;
  email: string;
  gradoInstruccion?: string;
  instruccionConcluida?: string;
  carreraUniversitaria?: string;
  tipoSangre?: string;
  hijo1?: string;
  fechaNacHijo1?: string;
  hijo2?: string;
  fechaNacHijo2?: string;
  hijo3?: string;
  fechaNacHijo3?: string;
  hijo4?: string;
  fechaNacHijo4?: string;
  empresa: string;
  cargo: string;
  unidad?: string;
  honorarios?: string;
  moneda?: string;
  regimen?: string;
  actividades?: string;
  fechaInicioContrato?: string;
  fechaTerminoContrato?: string;
}

function partesFecha(iso?: string): [string, string, string] {
  if (!iso) return ['', '', ''];
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [m[3], m[2], m[1]] : ['', '', ''];
}

function normalizar(v?: string): string {
  return (v || '').trim().toLowerCase();
}

function incluye(v: string, ...subs: string[]): boolean {
  return subs.some(s => v.includes(s));
}

function parseTipoSangre(v?: string): { tipo: string; positivo: boolean; negativo: boolean } | null {
  const n = normalizar(v);
  if (!n) return null;
  const tipoMatch = /ab|a|b|o/.exec(n);
  if (!tipoMatch) return null;
  const tipo = tipoMatch[0].toUpperCase();
  const positivo = incluye(n, '+', 'positivo');
  const negativo = incluye(n, '-', 'negativo');
  return { tipo, positivo, negativo: negativo && !positivo };
}

// Altura de la caja de etiqueta (la franja superior con el nombre del campo).
const LABEL_H = 4.3;

// ---- Helpers de dibujo ----
// El formulario original tiene, para cada campo, una caja de etiqueta
// (borde + texto centrado chico) pegada arriba de una caja de valor mas
// grande. Replicamos exactamente esa estructura de dos niveles.

function etiquetaBox(doc: jsPDF, x: number, y: number, w: number, label: string): void {
  doc.setLineWidth(0.15);
  doc.rect(x, y, w, LABEL_H);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.text(label, x + w / 2, y + LABEL_H - 1.4, { align: 'center', maxWidth: w - 2 });
}

function campo(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value?: string): void {
  etiquetaBox(doc, x, y, w, label);
  const boxTop = y + LABEL_H;
  doc.setLineWidth(0.15);
  doc.rect(x, boxTop, w, h);
  if (value) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(value), x + 1.5, boxTop + h / 2 + 1.3, { maxWidth: w - 3 });
  }
}

// Campo de fecha con 3 casillas separadas (dia / mes / anio), tal como en
// el formulario original.
function campoFecha(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, iso?: string): void {
  etiquetaBox(doc, x, y, w, label);
  const boxTop = y + LABEL_H;
  const partes = partesFecha(iso);
  const cw = w / 3;
  doc.setLineWidth(0.15);
  for (let i = 0; i < 3; i++) {
    doc.rect(x + cw * i, boxTop, cw, h);
    if (partes[i]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(partes[i], x + cw * i + cw / 2, boxTop + h / 2 + 1.3, { align: 'center' });
    }
  }
}

function checkboxOpcion(doc: jsPDF, x: number, y: number, label: string, checked: boolean): number {
  const size = 3;
  doc.setLineWidth(0.15);
  doc.rect(x, y, size, size);
  if (checked) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('X', x + 0.5, y + 2.6);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(label, x + size + 1.3, y + 2.6);
  return x + size + 1.3 + doc.getTextWidth(label) + 3;
}

// Barra de titulo rellena (usada para el titulo principal y para las
// secciones "oficiales": dependientes, uso exclusivo de la empresa).
function tituloSeccion(doc: jsPDF, x: number, w: number, y: number, texto: string, alto = 6, fontSize = 9): number {
  doc.setFillColor(51, 51, 51);
  doc.rect(x, y, w, alto, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.text(texto, x + w / 2, y + alto - (alto - fontSize * 0.352) / 2 - 0.3, { align: 'center' });
  doc.setTextColor(0);
  return y + alto + 3;
}

export async function generarFichaEmpleadoPDF(emp: EmpleadoFicha, proyecto?: ProyectoPdfHeader): Promise<void> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const m = 15;
  const pageW = doc.internal.pageSize.getWidth();
  const w = pageW - m * 2;

  let y = m;
  if (proyecto) {
    y = await drawPdfHeader(doc, proyecto, y, { marginLeft: m, marginRight: m });
    y += 4;
  }
  doc.setLineWidth(0.4);
  doc.rect(m + w / 2 - 45, y, 90, 9);
  doc.setFillColor(51, 51, 51);
  doc.rect(m + w / 2 - 45, y, 90, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro de Datos de Empleados', m + w / 2, y + 6, { align: 'center' });
  doc.setTextColor(0);
  y += 13;

  doc.setLineWidth(0.2);
  doc.line(m, y, m + w, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Instrucciones:', m, y);
  const anchoLabelInstrucciones = doc.getTextWidth('Instrucciones: ');
  doc.setFont('helvetica', 'normal');
  const instrucciones = 'Complete de forma legible todos los campos, leyendo con atención. Este formulario hará parte del legajo del empleado en la empresa.';
  doc.text(instrucciones, m + anchoLabelInstrucciones + 2, y, { maxWidth: w - anchoLabelInstrucciones - 2 });
  y += 7;

  // Fila 1: Nro Documento | Tipo de Documento | Foto 3x4
  campo(doc, m, y, 55, 12, 'Nro. Documento', emp.nroDocumento);
  const tipoDoc = normalizar(emp.tipoDocumento);
  const esVenezolano = incluye(tipoDoc, 'venezol');
  const esCI = !esVenezolano && (incluye(tipoDoc, 'c.i', 'ci paragua', 'cedula', 'cédula') || tipoDoc === 'ci');
  const esOtros = !!tipoDoc && !esVenezolano && !esCI;
  etiquetaBox(doc, m + 58, y, 68, 'Tipo de Documento');
  checkboxOpcion(doc, m + 60, y + LABEL_H + 2, 'C.I. Paraguaya', esCI);
  checkboxOpcion(doc, m + 60, y + LABEL_H + 6.5, 'Doc. Venezolano', esVenezolano);
  checkboxOpcion(doc, m + 60, y + LABEL_H + 11, esOtros ? `Otros (${emp.tipoDocumento})` : 'Otros', esOtros);
  // Foto 3x4 (siempre vacia, no se registra foto en el sistema)
  const fotoX = m + w - 32;
  doc.setLineWidth(0.15);
  doc.setDrawColor(160);
  doc.rect(fotoX, y, 32, 20);
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text('Foto 3x4', fotoX + 16, y + 11, { align: 'center' });
  doc.setTextColor(0);
  doc.setDrawColor(0);
  y += LABEL_H + 12 + 3;

  campo(doc, m, y, 90, 10, 'Nombres del Profesional', emp.nombres);
  campo(doc, m + 93, y, w - 93, 10, 'Apellidos del Profesional', emp.apellidos);
  y += LABEL_H + 10 + 3;

  campo(doc, m, y, 52, 10, 'Ciudad de Nacimiento', emp.ciudadNacimiento);
  campoFecha(doc, m + 55, y, 33, 10, 'Fecha de Nacimiento', emp.fechaNacimiento);
  etiquetaBox(doc, m + 91, y, 15, 'Sexo');
  checkboxOpcion(doc, m + 92, y + LABEL_H + 1.5, 'Masculino', emp.sexo === 'M');
  checkboxOpcion(doc, m + 92, y + LABEL_H + 6, 'Femenino', emp.sexo === 'F');
  const ec = normalizar(emp.estadoCivil);
  etiquetaBox(doc, m + 109, y, w - 109, 'Estado Civil');
  let ecx = m + 111;
  ecx = checkboxOpcion(doc, ecx, y + LABEL_H + 1.5, 'Casado', incluye(ec, 'casad'));
  ecx = checkboxOpcion(doc, ecx, y + LABEL_H + 1.5, 'Concubinato', incluye(ec, 'concubin'));
  checkboxOpcion(doc, ecx, y + LABEL_H + 1.5, 'Divorciado', incluye(ec, 'divorci'));
  checkboxOpcion(doc, m + 111, y + LABEL_H + 6, 'Soltero', incluye(ec, 'solter'));
  checkboxOpcion(doc, m + 111 + 25, y + LABEL_H + 6, 'Viudo', incluye(ec, 'viud'));
  y += LABEL_H + 10 + 3;

  campo(doc, m, y, 110, 10, 'Nombres y Apellidos del Padre', emp.nombrePadre);
  campo(doc, m + 113, y, w - 113, 10, 'Ocupación del Padre', emp.ocupacionPadre);
  y += LABEL_H + 10 + 3;

  campo(doc, m, y, 110, 10, 'Nombres y Apellidos de la Madre', emp.nombreMadre);
  campo(doc, m + 113, y, w - 113, 10, 'Ocupación de la Madre', emp.ocupacionMadre);
  y += LABEL_H + 10 + 3;

  campo(doc, m, y, 78, 10, 'Nombres y Apellidos del Cónyuge', emp.nombreConyuge);
  campo(doc, m + 81, y, 50, 10, 'Ocupación de Cónyuge', emp.ocupacionConyuge);
  campoFecha(doc, m + 133, y, w - 133, 10, 'Fecha de Nacimiento', emp.fechaNacConyuge);
  y += LABEL_H + 10 + 4;

  // Separador grueso, como en el formulario original
  doc.setLineWidth(0.7);
  doc.line(m, y, m + w, y);
  doc.setLineWidth(0.15);
  y += 5;

  campo(doc, m, y, 85, 10, 'Dirección - Nombre de la Calle Principal', emp.direccion);
  campo(doc, m + 88, y, 17, 10, 'Nro.', emp.nro);
  campo(doc, m + 107, y, 17, 10, 'Dpto.', emp.dpto);
  campo(doc, m + 126, y, 17, 10, 'Piso', emp.piso);
  campo(doc, m + 145, y, w - 145, 10, 'Barrio', emp.barrio);
  y += LABEL_H + 10 + 3;

  campo(doc, m, y, 58, 10, 'Ciudad donde Vive', emp.ciudad);
  campo(doc, m + 61, y, 58, 10, 'Departamento Territorial', emp.departamentoTerritorial);
  campo(doc, m + 122, y, w - 122, 10, 'Punto de Referencia de la Casa', emp.puntoReferencia);
  y += LABEL_H + 10 + 3;

  campo(doc, m, y, 54, 10, 'Teléfono Celular', emp.telefonoCelular);
  campo(doc, m + 57, y, 54, 10, 'Teléfono de Emergencia / Familiar', emp.telefonoEmergencia);
  campo(doc, m + 114, y, w - 114, 10, 'E-mail', emp.email);
  y += LABEL_H + 10 + 5;

  // Croquis (siempre vacio) | Grado de Instruccion | Tipo y Factor Sanguineo
  const croquisW = 55;
  etiquetaBox(doc, m, y, croquisW, 'CROQUIS - UBICACIÓN DE LA CASA');
  doc.setLineWidth(0.15);
  doc.setDrawColor(160);
  doc.rect(m, y + LABEL_H, croquisW, 46);
  doc.setDrawColor(0);

  const giX = m + croquisW + 5;
  const giW = 68;
  etiquetaBox(doc, giX, y, giW, 'GRADO DE INSTRUCCIÓN');
  const gi = normalizar(emp.gradoInstruccion);
  checkboxOpcion(doc, giX + 2, y + LABEL_H + 3, 'Primaria', incluye(gi, 'primaria'));
  checkboxOpcion(doc, giX + 2, y + LABEL_H + 8, 'Secundaria', incluye(gi, 'secundaria'));
  checkboxOpcion(doc, giX + 2, y + LABEL_H + 13, 'Universidad', incluye(gi, 'universi'));
  const ic = normalizar(emp.instruccionConcluida);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Concluido', giX + 40, y + LABEL_H + 5.6);
  checkboxOpcion(doc, giX + 40, y + LABEL_H + 7, 'Sí', incluye(ic, 'si', 'sí'));
  checkboxOpcion(doc, giX + 52, y + LABEL_H + 7, 'No', incluye(ic, 'no'));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Carrera Universitaria:', giX + 2, y + LABEL_H + 20);
  doc.setFontSize(7.5);
  doc.text(emp.carreraUniversitaria || '', giX + 2, y + LABEL_H + 25, { maxWidth: giW - 4 });

  const tsX = giX + giW + 5;
  const tsW = m + w - tsX;
  etiquetaBox(doc, tsX, y, tsW, 'Tipo y Factor Sanguíneo');
  const ts = parseTipoSangre(emp.tipoSangre);
  const tipos = ['A', 'B', 'AB', 'O'];
  tipos.forEach((tipo, i) => {
    const ty = y + LABEL_H + 3 + i * 6;
    checkboxOpcion(doc, tsX + 2, ty, `${tipo} (+)`, !!ts && ts.tipo === tipo && ts.positivo);
    checkboxOpcion(doc, tsX + 2 + tsW / 2, ty, `${tipo} (-)`, !!ts && ts.tipo === tipo && ts.negativo);
  });

  // ---- Pagina 2 ----
  doc.addPage();
  y = m;
  y = tituloSeccion(doc, m, w, y, 'DEPENDIENTES / HIJOS');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Caso posea hijos, se listan abajo con sus respectivas fechas de nacimiento:', m, y);
  y += 6;

  const hijos: Array<[string | undefined, string | undefined]> = [
    [emp.hijo1, emp.fechaNacHijo1],
    [emp.hijo2, emp.fechaNacHijo2],
    [emp.hijo3, emp.fechaNacHijo3],
    [emp.hijo4, emp.fechaNacHijo4],
  ];
  hijos.forEach(([nombre, fecha], i) => {
    campo(doc, m, y, 135, 10, `${i + 1}. Nombres y Apellidos`, nombre);
    campoFecha(doc, m + 138, y, w - 138, 10, 'Fecha de Nacimiento', fecha);
    y += LABEL_H + 10 + 3;
  });
  y += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1. RELACIÓN DE PARENTESCO EN LA EMPRESA:', m, y);
  y += 6;
  let px = m;
  ['Esposo (a)', 'Padre/Madre', 'Hijo (a)', 'Hermano (a)', 'Cuñado (a)', 'Primo (a)', 'Tío (a)', 'Nadie'].forEach(op => {
    px = checkboxOpcion(doc, px, y, op, false);
  });
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('2. ¿SUFRE O ES PORTADOR DE ALGUNA ENFERMEDAD INFECTOCONTAGIOSA?', m, y, { maxWidth: w });
  y += 6;
  let ex = m;
  ex = checkboxOpcion(doc, ex, y, 'Sí, bajo control médico', false);
  checkboxOpcion(doc, ex + 8, y, 'No', false);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DECLARACIÓN', m + w / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'Declaro que las informaciones descriptas en el presente formulario son expresiones auténticas y verdaderas. Autorizo a la Empresa a corroborarlas.',
    m, y, { maxWidth: w }
  );
  y += 10;
  doc.text('Fecha:  ___ / ___ / ______', m, y);
  doc.text('.......................................................', m + 110, y);
  y += 4;
  doc.setFontSize(7);
  doc.text('Firma', m + 110, y);
  y += 8;

  y = tituloSeccion(doc, m, w, y, 'PARA USO EXCLUSIVO DE LA EMPRESA');
  campo(doc, m, y, w, 8, 'ID', emp.nroDocumento);
  y += LABEL_H + 8 + 3;
  campo(doc, m, y, w, 10, 'Empresa', emp.empresa);
  y += LABEL_H + 10 + 3;
  campo(doc, m, y, 95, 10, 'Cargo', emp.cargo);
  campo(doc, m + 98, y, w - 98, 10, 'Unidad - Cuenta Contable', emp.unidad);
  y += LABEL_H + 10 + 3;
  campo(doc, m, y, 60, 10, 'Honorarios', emp.honorarios);
  const mon = normalizar(emp.moneda);
  etiquetaBox(doc, m + 63, y, 45, 'Moneda');
  let mx = m + 65;
  mx = checkboxOpcion(doc, mx, y + LABEL_H + 3, 'GS.', incluye(mon, 'gs', 'guaran'));
  checkboxOpcion(doc, mx, y + LABEL_H + 3, 'USD.', incluye(mon, 'usd', 'dolar', 'dólar'));
  const reg = normalizar(emp.regimen);
  etiquetaBox(doc, m + 110, y, w - 110, 'Régimen');
  let rx = m + 112;
  rx = checkboxOpcion(doc, rx, y + LABEL_H + 3, 'IPS.', incluye(reg, 'ips'));
  checkboxOpcion(doc, rx, y + LABEL_H + 3, 'IVA.', incluye(reg, 'iva'));
  y += LABEL_H + 10 + 3;
  campo(doc, m, y, w, 14, 'Actividades a realizar', emp.actividades);
  y += LABEL_H + 14 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VIGENCIA DE LA CONTRATACIÓN', m, y);
  y += 4;
  campoFecha(doc, m, y, 55, 10, 'Fecha de Inicio del Contrato', emp.fechaInicioContrato);
  campoFecha(doc, m + 58, y, 55, 10, 'Fecha de Término del Contrato', emp.fechaTerminoContrato);
  checkboxOpcion(doc, m + 116, y + LABEL_H + 4, 'Fecha indeterminada', !!emp.fechaInicioContrato && !emp.fechaTerminoContrato);
  y += LABEL_H + 10 + 6;

  const firmaW = (w - 20) / 3;
  ['SUPERVISOR', 'DIRECTOR O GERENTE', 'GERENTE DE RECURSOS HUMANOS'].forEach((f, i) => {
    const fx = m + i * (firmaW + 10);
    doc.setLineWidth(0.15);
    doc.line(fx, y + 10, fx + firmaW, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(f, fx + firmaW / 2, y + 14, { align: 'center', maxWidth: firmaW });
  });

  doc.save(`Ficha_${emp.apellidos}_${emp.nombres}_${emp.nroDocumento}.pdf`.replace(/\s+/g, '_'));
}
