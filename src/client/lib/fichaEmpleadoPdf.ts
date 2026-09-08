import jsPDF from 'jspdf';

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
  hijo5?: string;
  fechaNacHijo5?: string;
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

function etiquetaBox(doc: jsPDF, x: number, y: number, w: number, label: string, align: 'center' | 'left' = 'center'): void {
  doc.setLineWidth(0.15);
  doc.rect(x, y, w, LABEL_H);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  if (align === 'left') {
    doc.text(label, x + 2, y + LABEL_H - 1.4, { maxWidth: w - 4 });
  } else {
    doc.text(label, x + w / 2, y + LABEL_H - 1.4, { align: 'center', maxWidth: w - 2 });
  }
}

function campo(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value?: string, align: 'center' | 'left' = 'center'): void {
  etiquetaBox(doc, x, y, w, label, align);
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

// La mayoria de las listas de opciones del formulario original escriben la
// etiqueta PRIMERO y el casillero DESPUES (a la derecha). Pero algunas
// (parentesco, enfermedad infectocontagiosa, fecha indeterminada) van al
// reves: casillero primero. Replicamos ambos ordenes segun corresponda.
function checkboxOpcion(doc: jsPDF, x: number, y: number, label: string, checked: boolean, casilleroPrimero = false): number {
  const size = 3;
  if (casilleroPrimero) {
    doc.setLineWidth(0.15);
    doc.rect(x, y, size, size);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('X', x + 0.5, y + 2.6);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(label, x + size + 1.5, y + 2.6);
    return x + size + 1.5 + doc.getTextWidth(label) + 4;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(label, x, y + 2.6);
  const textW = doc.getTextWidth(label);
  const boxX = x + textW + 1.5;
  doc.setLineWidth(0.15);
  doc.rect(boxX, y, size, size);
  if (checked) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('X', boxX + 0.5, y + 2.6);
  }
  return boxX + size + 4;
}

// Estilo de "celda de planilla" usado en Para Uso Exclusivo de la Empresa:
// una sola caja con la etiqueta chica pegada arriba a la izquierda y el
// valor mas grande debajo, dentro del mismo borde (a diferencia de campo(),
// que usa dos cajas apiladas).
function celda(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value?: string): void {
  doc.setLineWidth(0.15);
  doc.rect(x, y, w, h);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(label, x + 2, y + 3.2);
  if (value) {
    doc.setFontSize(8.5);
    doc.text(String(value), x + 2, y + h - 2.2, { maxWidth: w - 4 });
  }
}

// Celda de fecha (3 casillas) dentro del estilo de celda de planilla.
function celdaFecha(doc: jsPDF, x: number, y: number, w: number, label: string, iso?: string): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.text(label, x, y);
  const partes = partesFecha(iso);
  const boxTop = y + 1.5;
  const boxH = 9;
  const cw = w / 3;
  doc.setLineWidth(0.15);
  for (let i = 0; i < 3; i++) {
    doc.setFillColor(255, 255, 255);
    doc.rect(x + cw * i, boxTop, cw, boxH, 'F');
    doc.setDrawColor(0);
    doc.rect(x + cw * i, boxTop, cw, boxH, 'S');
    if (partes[i]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(partes[i], x + cw * i + cw / 2, boxTop + boxH / 2 + 1.3, { align: 'center' });
    }
  }
}

// Nota: esta ficha replica un formulario oficial que NO lleva logo ni
// encabezado de proyecto (a diferencia de los demas PDF del sistema),
// por eso no usa drawPdfHeader.
export function generarFichaEmpleadoPDF(emp: EmpleadoFicha): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const m = 15;
  const pageW = doc.internal.pageSize.getWidth();
  const w = pageW - m * 2;

  let y = m;
  doc.setFillColor(51, 51, 51);
  doc.roundedRect(m + w / 2 - 45, y, 90, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro de Datos de Empleados', m + w / 2, y + 6, { align: 'center' });
  doc.setTextColor(0);
  y += 13;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Instrucciones:', m, y);
  const anchoLabelInstrucciones = doc.getTextWidth('Instrucciones: ');
  doc.setFont('helvetica', 'normal');
  // Un solo parrafo con word-wrap natural (no dos oraciones forzadas a
  // 2 lineas), igual que en el formulario original: la primera linea
  // queda mas angosta por el espacio que ocupa "Instrucciones:".
  const textoInstrucciones = 'Por favor, complete de forma legible todos los campos aquí descriptos, leyendo con atención. Evite tachaduras, enmiendas o errores, pues este formulario hará parte de su legajo en la empresa.';
  const primeraLinea = (doc.splitTextToSize(textoInstrucciones, w - anchoLabelInstrucciones - 2) as string[])[0];
  doc.text(primeraLinea, m + anchoLabelInstrucciones + 2, y);
  const restoInstrucciones = textoInstrucciones.slice(primeraLinea.length).trim();
  y += 4.5;
  const lineasResto = doc.splitTextToSize(restoInstrucciones, w) as string[];
  doc.text(lineasResto, m, y);
  y += lineasResto.length * 4 + 1;

  doc.setLineWidth(0.2);
  doc.line(m, y, m + w, y);
  y += 5;

  // Fila 1: Nro Documento | Tipo de Documento | Foto 3x4
  campo(doc, m, y, 55, 12, 'Nro. Documento', emp.nroDocumento);
  const tipoDoc = normalizar(emp.tipoDocumento);
  const esVenezolano = incluye(tipoDoc, 'venezol');
  const esCI = !esVenezolano && (incluye(tipoDoc, 'c.i', 'ci paragua', 'cedula', 'cédula') || tipoDoc === 'ci');
  const esOtros = !!tipoDoc && !esVenezolano && !esCI;
  etiquetaBox(doc, m + 58, y, 68, 'Tipo de Documento');
  checkboxOpcion(doc, m + 60, y + LABEL_H + 2, 'C.I. Paraguaya', esCI);
  checkboxOpcion(doc, m + 60, y + LABEL_H + 6.5, 'Doc. Venezolano', esVenezolano);
  const yOtro = y + LABEL_H + 11;
  const xDespuesOtro = checkboxOpcion(doc, m + 60, yOtro, 'Otro:', esOtros);
  if (esOtros) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(emp.tipoDocumento || '', xDespuesOtro + 1, yOtro + 2.6, { maxWidth: m + 58 + 68 - (xDespuesOtro + 3) });
  } else {
    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.line(xDespuesOtro + 1, yOtro + 2.6, m + 58 + 68 - 2, yOtro + 2.6);
    doc.setLineDashPattern([], 0);
  }
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

  // Croquis (siempre vacio, con marcas guia de esquinas) | Grado de Instruccion | Tipo y Factor Sanguineo
  const croquisW = 55;
  const croquisH = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('CROQUIS - DISEÑO DE LA UBICACIÓN DE SU CASA', m, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('(escriba los nombres de las calles vertical y horizontal)', m, y + 3.2);
  doc.setLineWidth(0.15);
  doc.setDrawColor(160);
  doc.rect(m, y + 5, croquisW, croquisH);
  // Marcas guia de "esquina de calle" en una grilla 3x3: linea horizontal
  // con un tramo vertical hacia arriba en su extremo izquierdo, como en el original
  for (let fila = 0; fila < 3; fila++) {
    for (let col = 0; col < 3; col++) {
      const gx = m + 6 + col * (croquisW - 14) / 2;
      const gy = y + 5 + 12 + fila * (croquisH - 22) / 2;
      doc.line(gx, gy, gx + 14, gy);
      doc.line(gx, gy, gx, gy - 5);
    }
  }
  doc.setDrawColor(0);

  // GRADO DE INSTRUCCIÓN: caja de etiqueta + caja de valor debajo (mismo
  // patron de dos niveles que campo()), conteniendo los checkboxes.
  const giX = m + croquisW + 5;
  const giW = 68;
  const giValueH = 25;
  etiquetaBox(doc, giX, y + 5, giW, 'GRADO DE INSTRUCCIÓN');
  const giBoxTop = y + 5 + LABEL_H;
  doc.setLineWidth(0.15);
  doc.rect(giX, giBoxTop, giW, giValueH);
  const gi = normalizar(emp.gradoInstruccion);
  checkboxOpcion(doc, giX + 3, giBoxTop + 4, 'Primaria', incluye(gi, 'primaria'));
  checkboxOpcion(doc, giX + 3, giBoxTop + 9, 'Secundaria', incluye(gi, 'secundaria'));
  checkboxOpcion(doc, giX + 3, giBoxTop + 14, 'Universidad', incluye(gi, 'universi'));
  const ic = normalizar(emp.instruccionConcluida);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Concluido:', giX + 39, giBoxTop + 10.6);
  checkboxOpcion(doc, giX + 39, giBoxTop + 12, 'Sí', incluye(ic, 'si', 'sí'));
  checkboxOpcion(doc, giX + 53, giBoxTop + 12, 'No', incluye(ic, 'no'));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const yCarrera = giBoxTop + giValueH - 3;
  doc.text('Carrera Universitaria:', giX + 3, yCarrera);
  const anchoCarreraLabel = doc.getTextWidth('Carrera Universitaria: ');
  if (emp.carreraUniversitaria) {
    doc.setFontSize(7.5);
    doc.text(emp.carreraUniversitaria, giX + 3 + anchoCarreraLabel + 1, yCarrera, { maxWidth: giW - 5 - anchoCarreraLabel - 1 });
  } else {
    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.line(giX + 3 + anchoCarreraLabel, yCarrera, giX + giW - 3, yCarrera);
    doc.setLineDashPattern([], 0);
  }

  // Tipo y Factor Sanguineo: posicionado abajo a la derecha (no alineado
  // arriba con Grado de Instruccion), con el casillero ANTES de la
  // etiqueta, como en el original.
  const tsX = giX + giW + 5;
  const tsW = m + w - tsX;
  const tsY = giBoxTop + giValueH - 27;
  etiquetaBox(doc, tsX, tsY, tsW, 'Tipo y Factor Sanguíneo');
  const tsBoxTop = tsY + LABEL_H;
  const tsBoxH = 27;
  doc.setLineWidth(0.15);
  doc.rect(tsX, tsBoxTop, tsW, tsBoxH);
  const ts = parseTipoSangre(emp.tipoSangre);
  const tipos = ['A', 'B', 'AB', 'O'];
  tipos.forEach((tipo, i) => {
    const ty = tsBoxTop + 4 + i * 6;
    checkboxOpcion(doc, tsX + 3, ty, `${tipo} (+)`, !!ts && ts.tipo === tipo && ts.positivo, true);
    checkboxOpcion(doc, tsX + 3 + tsW / 2, ty, `${tipo} (-)`, !!ts && ts.tipo === tipo && ts.negativo, true);
  });

  // ---- Pagina 2 ----
  doc.addPage();
  y = m;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DEPENDIENTES / HIJOS', m + w / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Caso que posea hijos, favor nombrarlos abajo, con sus respectivas fechas de nacimiento', m + w / 2, y, { align: 'center' });
  y += 6;

  const hijos: Array<[string | undefined, string | undefined]> = [
    [emp.hijo1, emp.fechaNacHijo1],
    [emp.hijo2, emp.fechaNacHijo2],
    [emp.hijo3, emp.fechaNacHijo3],
    [emp.hijo4, emp.fechaNacHijo4],
    [emp.hijo5, emp.fechaNacHijo5],
  ];
  hijos.forEach(([nombre, fecha], i) => {
    campo(doc, m, y, 135, 9, `${i + 1}. Nombres y Apellidos`, nombre, 'left');
    campoFecha(doc, m + 138, y, w - 138, 9, 'Fecha de Nacimiento', fecha);
    y += LABEL_H + 9 + 2.5;
  });
  y += 1.5;

  // Recuadro que encierra parentesco + enfermedad + declaracion, como en el original
  const marcoTop = y;
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('1. SEÑALE ABAJO CON UNA (X) SI POSEE ALGUNA RELACIÓN DE PARENTEZCO EN LA EMPRESA', m + 3, y, { maxWidth: w - 6 });
  y += 7;
  let px = m + 3;
  ['Esposo (a)', 'Padre/Madre', 'Hijo (a)', 'Hermano (a)', 'Cuñado (a)', 'Primo (a)', 'Tío (a)', 'Nadie'].forEach(op => {
    px = checkboxOpcion(doc, px, y, op, false, true);
  });
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('2. ¿USTED SUFRE O ES PORTADOR DE ALGUNA ENFERMEDAD INFECTOCONTAGIOSA QUE PUEDA PONER', m + 3, y);
  y += 3.8;
  doc.text('EN RIESGO A TERCERAS PERSONAS?', m + 3, y);
  y += 6;
  let ex = m + 5;
  ex = checkboxOpcion(doc, ex, y, 'Sí, sufro pero está bajo control médico', false, true);
  checkboxOpcion(doc, ex + 10, y, 'No, estoy libre de este tipo de enfermedad', false, true);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DECLARACIÓN', m + w / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.text(
    'Declaro que las informaciones por mí descriptas en el presente formulario, son expresiones auténticas y verdaderas. Al mismo tiempo, autorizo a la Empresa, a corroborarlas. En caso de comprobarse alguna falsedad o dolo con relación al presente contenido, dicha Organización podrá dar por terminada la relación contractual unilateralmente.',
    m + 3, y, { maxWidth: w - 6 }
  );
  y += 13;
  doc.text('Fecha:_____/______/_________', m + 8, y);
  const firmaLineX = m + 110;
  const firmaLineMaxWidth = m + w - 5 - firmaLineX;
  let firmaLine = '';
  while (doc.getTextWidth(firmaLine + '_') <= firmaLineMaxWidth) firmaLine += '_';
  doc.text(firmaLine, firmaLineX, y);
  y += 4;
  doc.setFontSize(7);
  doc.text('Firma', m + 128, y);
  y += 4;
  doc.setLineWidth(0.2);
  doc.rect(m, marcoTop, w, y - marcoTop);
  y += 6;

  // ---- Para uso Exclusivo de la Empresa ----
  doc.setFillColor(0, 0, 0);
  doc.rect(m, y, w, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Para uso exclusivo de la Empresa', m + w / 2, y + 5, { align: 'center' });
  doc.setTextColor(0);
  y += 7;

  const marcoTop2 = y;
  const leftW = 113;
  const gapCols = 3;
  const rightX = m + leftW + gapCols;
  const rightW = w - leftW - gapCols;

  celda(doc, m, y, leftW, 9, 'ID.', emp.nroDocumento);
  const idBottom = y + 9;

  const empresaY = idBottom;
  celda(doc, m, empresaY, leftW, 10, 'EMPRESA:', emp.empresa);
  const empresaBottom = empresaY + 10;

  const cargoUnidadY = empresaBottom;
  const cargoW = leftW * 0.5;
  celda(doc, m, cargoUnidadY, cargoW, 10, 'CARGO:', emp.cargo);
  celda(doc, m + cargoW, cargoUnidadY, leftW - cargoW, 10, 'UNIDAD-CUENTA CONTABLE:', emp.unidad);
  const cargoUnidadBottom = cargoUnidadY + 10;

  const honorariosY = cargoUnidadBottom;
  const honorariosW = leftW * 0.36;
  const monedaW = leftW * 0.32;
  const regimenW = leftW - honorariosW - monedaW;
  celda(doc, m, honorariosY, honorariosW, 10, 'HONORARIOS:', emp.honorarios);
  celda(doc, m + honorariosW, honorariosY, monedaW, 10, 'MONEDA');
  const mon = normalizar(emp.moneda);
  let mx = m + honorariosW + 2;
  mx = checkboxOpcion(doc, mx, honorariosY + 6, 'GS.', incluye(mon, 'gs', 'guaran'));
  checkboxOpcion(doc, mx, honorariosY + 6, 'USD.', incluye(mon, 'usd', 'dolar', 'dólar'));
  celda(doc, m + honorariosW + monedaW, honorariosY, regimenW, 10, 'RÉGIMEN:');
  const reg = normalizar(emp.regimen);
  let rx = m + honorariosW + monedaW + 2;
  rx = checkboxOpcion(doc, rx, honorariosY + 6, 'IPS.', incluye(reg, 'ips'));
  checkboxOpcion(doc, rx, honorariosY + 6, 'IVA.', incluye(reg, 'iva'));
  const honorariosBottom = honorariosY + 10;

  const actividadesY = honorariosBottom;
  const actividadesH = 16;
  celda(doc, m, actividadesY, leftW, actividadesH, 'ACTIVIDADES A REALIZAR:', emp.actividades);
  const actividadesBottom = actividadesY + actividadesH;

  // Panel derecho gris: Vigencia de la Contratacion
  const panelBottom = actividadesBottom;
  doc.setFillColor(225, 225, 225);
  doc.rect(rightX, y, rightW, panelBottom - y, 'F');
  doc.setLineWidth(0.15);
  doc.rect(rightX, y, rightW, panelBottom - y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VIGENCIA DE LA CONTRATACIÓN', rightX + rightW / 2, y + 4.5, { align: 'center' });
  doc.line(rightX, y + 6.5, rightX + rightW, y + 6.5);
  celdaFecha(doc, rightX + 3, y + 12, rightW - 6, 'Fecha de Inicio del Contrato', emp.fechaInicioContrato);
  celdaFecha(doc, rightX + 3, y + 24, rightW - 6, 'Fecha de Término del Contrato', emp.fechaTerminoContrato);
  checkboxOpcion(doc, rightX + 4, y + 36, 'Fecha indeterminada', !!emp.fechaInicioContrato && !emp.fechaTerminoContrato, true);

  // Fila de firmas, ancho completo (columna izquierda + panel derecho)
  y = panelBottom;
  const firmaH = 16;
  const firmaW = w / 3;
  ['Supervisor', 'Director o Gerente', 'Gerente de Recursos Humanos'].forEach((f, i) => {
    const fx = m + i * firmaW;
    doc.setLineWidth(0.15);
    doc.rect(fx, y, firmaW, firmaH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(f, fx + firmaW / 2, y + firmaH - 4, { align: 'center', maxWidth: firmaW - 4 });
  });
  y += firmaH;

  doc.setLineWidth(0.2);
  doc.rect(m, marcoTop2, w, y - marcoTop2);

  doc.save(`Ficha_${emp.apellidos}_${emp.nombres}_${emp.nroDocumento}.pdf`.replace(/\s+/g, '_'));
}
