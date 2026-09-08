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

function fechaISOaDMY(iso?: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
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

// ---- Helpers de dibujo ----

function campo(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value?: string): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90);
  doc.text(label, x, y);
  doc.setTextColor(0);
  doc.setLineWidth(0.15);
  doc.rect(x, y + 1, w, h);
  if (value) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(value), x + 1.5, y + 1 + h / 2 + 1.3, { maxWidth: w - 3 });
  }
  return y + 1 + h;
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

function tituloSeccion(doc: jsPDF, x: number, w: number, y: number, texto: string): number {
  doc.setFillColor(30, 58, 95);
  doc.rect(x, y, w, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(texto, x + w / 2, y + 4.2, { align: 'center' });
  doc.setTextColor(0);
  return y + 9;
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
  y = tituloSeccion(doc, m, w, y, 'REGISTRO DE DATOS DE EMPLEADOS');
  y += 4;

  // Fila 1: Nro Documento | Tipo de Documento | Foto 3x4
  const rowTop = y;
  campo(doc, m, y, 55, 16, 'Nro. Documento', emp.nroDocumento);
  const tipoDoc = normalizar(emp.tipoDocumento);
  const esVenezolano = incluye(tipoDoc, 'venezol');
  const esCI = !esVenezolano && (incluye(tipoDoc, 'c.i', 'ci paragua', 'cedula', 'cédula') || tipoDoc === 'ci');
  const esOtros = !!tipoDoc && !esVenezolano && !esCI;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90);
  doc.text('Tipo de Documento', m + 58, y);
  doc.setTextColor(0);
  checkboxOpcion(doc, m + 58, y + 3, 'C.I. Paraguaya', esCI);
  checkboxOpcion(doc, m + 58, y + 8, 'Doc. Venezolano', esVenezolano);
  checkboxOpcion(doc, m + 58, y + 13, esOtros ? `Otros (${emp.tipoDocumento})` : 'Otros', esOtros);
  // Foto 3x4 (siempre vacia, no se registra foto en el sistema)
  const fotoX = m + w - 32;
  doc.setLineWidth(0.15);
  doc.setDrawColor(160);
  doc.rect(fotoX, y, 32, 16);
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text('Foto 3x4', fotoX + 16, y + 9, { align: 'center' });
  doc.setTextColor(0);
  doc.setDrawColor(0);
  y = rowTop + 16 + 2;

  y = campo(doc, m, y, 90, 10, 'Nombres', emp.nombres) - 10;
  campo(doc, m + 93, y, w - 93, 10, 'Apellidos', emp.apellidos);
  y += 12;

  campo(doc, m, y, 52, 10, 'Ciudad de Nacimiento', emp.ciudadNacimiento);
  campo(doc, m + 55, y, 33, 10, 'Fecha de Nacimiento', fechaISOaDMY(emp.fechaNacimiento));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90);
  doc.text('Sexo', m + 91, y);
  doc.setTextColor(0);
  checkboxOpcion(doc, m + 91, y + 3, 'M', emp.sexo === 'M');
  checkboxOpcion(doc, m + 91, y + 8, 'F', emp.sexo === 'F');
  const ec = normalizar(emp.estadoCivil);
  doc.text('Estado Civil', m + 108, y);
  let ecx = m + 108;
  ecx = checkboxOpcion(doc, ecx, y + 3, 'Casado', incluye(ec, 'casad'));
  ecx = checkboxOpcion(doc, ecx, y + 3, 'Concubinato', incluye(ec, 'concubin'));
  checkboxOpcion(doc, ecx, y + 3, 'Divorciado', incluye(ec, 'divorci'));
  checkboxOpcion(doc, m + 108, y + 8, 'Soltero', incluye(ec, 'solter'));
  checkboxOpcion(doc, m + 108 + 22, y + 8, 'Viudo', incluye(ec, 'viud'));
  y += 14;

  y = campo(doc, m, y, 110, 10, 'Nombres y Apellidos del Padre', emp.nombrePadre) - 10;
  campo(doc, m + 113, y, w - 113, 10, 'Ocupación del Padre', emp.ocupacionPadre);
  y += 12;

  y = campo(doc, m, y, 110, 10, 'Nombres y Apellidos de la Madre', emp.nombreMadre) - 10;
  campo(doc, m + 113, y, w - 113, 10, 'Ocupación de la Madre', emp.ocupacionMadre);
  y += 12;

  campo(doc, m, y, 78, 10, 'Nombres y Apellidos del Cónyuge', emp.nombreConyuge);
  campo(doc, m + 81, y, 55, 10, 'Ocupación de Cónyuge', emp.ocupacionConyuge);
  campo(doc, m + 138, y, w - 138, 10, 'Fecha de Nacimiento', fechaISOaDMY(emp.fechaNacConyuge));
  y += 13;

  campo(doc, m, y, 88, 10, 'Dirección - Calle Principal', emp.direccion);
  campo(doc, m + 91, y, 17, 10, 'Nro.', emp.nro);
  campo(doc, m + 110, y, 17, 10, 'Dpto.', emp.dpto);
  campo(doc, m + 129, y, 17, 10, 'Piso', emp.piso);
  campo(doc, m + 148, y, w - 148, 10, 'Barrio', emp.barrio);
  y += 12;

  campo(doc, m, y, 58, 10, 'Ciudad donde Vive', emp.ciudad);
  campo(doc, m + 61, y, 58, 10, 'Departamento Territorial', emp.departamentoTerritorial);
  campo(doc, m + 122, y, w - 122, 10, 'Punto de Referencia', emp.puntoReferencia);
  y += 12;

  campo(doc, m, y, 54, 10, 'Teléfono Celular', emp.telefonoCelular);
  campo(doc, m + 57, y, 54, 10, 'Teléfono de Emergencia', emp.telefonoEmergencia);
  campo(doc, m + 114, y, w - 114, 10, 'E-mail', emp.email);
  y += 14;

  // Croquis (siempre vacio) | Grado de Instruccion | Tipo y Factor Sanguineo
  const bottomTop = y;
  const croquisW = 55;
  doc.setLineWidth(0.15);
  doc.setDrawColor(160);
  doc.rect(m, y + 3, croquisW, 26);
  doc.setDrawColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('CROQUIS - UBICACIÓN DE LA CASA', m, y);

  const giX = m + croquisW + 4;
  const giW = 70;
  doc.text('GRADO DE INSTRUCCIÓN', giX, y);
  const gi = normalizar(emp.gradoInstruccion);
  checkboxOpcion(doc, giX, y + 4, 'Primaria', incluye(gi, 'primaria'));
  checkboxOpcion(doc, giX, y + 9, 'Secundaria', incluye(gi, 'secundaria'));
  checkboxOpcion(doc, giX, y + 14, 'Universidad', incluye(gi, 'universi'));
  const ic = normalizar(emp.instruccionConcluida);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Concluido', giX + 40, y + 6.6);
  checkboxOpcion(doc, giX + 40, y + 8, 'Sí', incluye(ic, 'si', 'sí'));
  checkboxOpcion(doc, giX + 52, y + 8, 'No', incluye(ic, 'no'));
  doc.setFontSize(6.5);
  doc.text('Carrera Universitaria:', giX, y + 21);
  doc.setFontSize(7.5);
  doc.text(emp.carreraUniversitaria || '', giX, y + 25, { maxWidth: giW });

  const tsX = giX + giW + 4;
  const tsW = m + w - tsX;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TIPO Y FACTOR SANGUÍNEO', tsX, y);
  const ts = parseTipoSangre(emp.tipoSangre);
  const tipos = ['A', 'B', 'AB', 'O'];
  tipos.forEach((tipo, i) => {
    const ty = y + 4 + i * 5;
    checkboxOpcion(doc, tsX, ty, `${tipo} (+)`, !!ts && ts.tipo === tipo && ts.positivo);
    checkboxOpcion(doc, tsX + tsW / 2, ty, `${tipo} (-)`, !!ts && ts.tipo === tipo && ts.negativo);
  });

  // ---- Pagina 2 ----
  doc.addPage();
  y = m;
  y = tituloSeccion(doc, m, w, y, 'DEPENDIENTES / HIJOS');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Caso posea hijos, se listan abajo con sus respectivas fechas de nacimiento:', m, y);
  y += 4;

  const hijos: Array<[string | undefined, string | undefined]> = [
    [emp.hijo1, emp.fechaNacHijo1],
    [emp.hijo2, emp.fechaNacHijo2],
    [emp.hijo3, emp.fechaNacHijo3],
    [emp.hijo4, emp.fechaNacHijo4],
  ];
  hijos.forEach(([nombre, fecha], i) => {
    campo(doc, m, y, 135, 10, `${i + 1}. Nombres y Apellidos`, nombre);
    campo(doc, m + 138, y, w - 138, 10, 'Fecha de Nacimiento', fechaISOaDMY(fecha));
    y += 12;
  });
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1. RELACIÓN DE PARENTESCO EN LA EMPRESA:', m, y);
  y += 5;
  let px = m;
  ['Esposo (a)', 'Padre/Madre', 'Hijo (a)', 'Hermano (a)', 'Cuñado (a)', 'Primo (a)', 'Tío (a)', 'Nadie'].forEach(op => {
    px = checkboxOpcion(doc, px, y, op, false);
  });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('2. ¿SUFRE O ES PORTADOR DE ALGUNA ENFERMEDAD INFECTOCONTAGIOSA?', m, y, { maxWidth: w });
  y += 6;
  let ex = m;
  ex = checkboxOpcion(doc, ex, y, 'Sí, bajo control médico', false);
  checkboxOpcion(doc, ex + 6, y, 'No', false);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DECLARACIÓN', m + w / 2, y, { align: 'center' });
  y += 4;
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
  y += 10;
  campo(doc, m, y, w, 10, 'Empresa', emp.empresa);
  y += 12;
  campo(doc, m, y, 95, 10, 'Cargo', emp.cargo);
  campo(doc, m + 98, y, w - 98, 10, 'Unidad - Cuenta Contable', emp.unidad);
  y += 12;
  campo(doc, m, y, 60, 10, 'Honorarios', emp.honorarios);
  const mon = normalizar(emp.moneda);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90);
  doc.text('Moneda', m + 63, y);
  doc.setTextColor(0);
  let mx = m + 63;
  mx = checkboxOpcion(doc, mx, y + 3, 'GS.', incluye(mon, 'gs', 'guaran'));
  checkboxOpcion(doc, mx, y + 3, 'USD.', incluye(mon, 'usd', 'dolar', 'dólar'));
  const reg = normalizar(emp.regimen);
  doc.text('Régimen', m + 100, y);
  let rx = m + 100;
  rx = checkboxOpcion(doc, rx, y + 3, 'IPS.', incluye(reg, 'ips'));
  checkboxOpcion(doc, rx, y + 3, 'IVA.', incluye(reg, 'iva'));
  y += 14;
  campo(doc, m, y, w, 16, 'Actividades a realizar', emp.actividades);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VIGENCIA DE LA CONTRATACIÓN', m, y);
  y += 4;
  campo(doc, m, y, 55, 10, 'Fecha de Inicio del Contrato', fechaISOaDMY(emp.fechaInicioContrato));
  campo(doc, m + 58, y, 55, 10, 'Fecha de Término del Contrato', fechaISOaDMY(emp.fechaTerminoContrato));
  checkboxOpcion(doc, m + 116, y + 4, 'Fecha indeterminada', !!emp.fechaInicioContrato && !emp.fechaTerminoContrato);
  y += 16;

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
