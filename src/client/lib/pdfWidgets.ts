import type { jsPDF } from 'jspdf';

// Dibuja un checkbox con su etiqueta en linea, devuelve la posicion X donde
// termina (para encadenar varios checkboxes en la misma fila).
export function dibujarCheckbox(doc: jsPDF, x: number, y: number, label: string, marcado: boolean): number {
  const size = 4;
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, y - size + 1, size, size);
  if (marcado) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', x + 0.6, y);
    doc.setFont('helvetica', 'normal');
  }
  doc.text(label, x + size + 2, y);
  return x + size + 2 + doc.getTextWidth(label) + 10;
}

// Igual que dibujarCheckbox pero la etiqueta puede envolver a varias lineas
// dentro de maxWidth (para opciones largas en columna).
export function dibujarCheckboxLinea(doc: jsPDF, x: number, y: number, label: string, marcado: boolean, maxWidth: number) {
  const size = 4;
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, y - size + 1, size, size);
  if (marcado) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', x + 0.6, y);
    doc.setFont('helvetica', 'normal');
  }
  const lineas = doc.splitTextToSize(label, maxWidth - size - 3);
  doc.text(lineas, x + size + 3, y);
}

export const SST_FOR_03_TITULO = 'SST-FOR-03   ENTREGA DE EQUIPO DE PROTECCIÓN PERSONAL (EPP) — NOTA DE SALIDA';
export const SST_FOR_03_SUBTITULO = 'Registro de salida de EPP por ítem, conforme al Art. 18° del Reglamento Interno de SST (entrega y reposición)';

// Titulo de formulario del Sistema de Gestion de SST: barra azul con el
// codigo y nombre del formulario en blanco, y debajo una linea en cursiva
// con su descripcion (mismo formato que SST-FOR-12, Notificacion de
// Amonestacion). Reduce el tamano del texto si no entra en el ancho
// disponible. Devuelve la posicion Y donde sigue el contenido.
export function dibujarTituloFormulario(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  titulo: string,
  subtitulo?: string,
  opts?: { altoBarra?: number; tamanoTitulo?: number; tamanoSubtitulo?: number }
): number {
  const alto = opts?.altoBarra ?? 16;
  let tamano = opts?.tamanoTitulo ?? 13;

  doc.setFillColor(30, 58, 95);
  doc.rect(x, y, w, alto, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(tamano);
  while (tamano > 8 && doc.getTextWidth(titulo) > w - 6) {
    tamano -= 0.5;
    doc.setFontSize(tamano);
  }
  doc.text(titulo, x + 3, y + alto / 2, { baseline: 'middle' });
  doc.setTextColor(0, 0, 0);

  let yFin = y + alto + 3;
  if (subtitulo) {
    let tamanoSub = opts?.tamanoSubtitulo ?? 9;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(tamanoSub);
    while (tamanoSub > 6 && doc.getTextWidth(subtitulo) > w - 3) {
      tamanoSub -= 0.5;
      doc.setFontSize(tamanoSub);
    }
    doc.text(subtitulo, x + 1.5, yFin + 3);
    yFin += 6;
  }
  doc.setFont('helvetica', 'normal');
  return yFin;
}
