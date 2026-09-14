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
