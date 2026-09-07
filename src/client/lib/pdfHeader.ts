import type { jsPDF } from 'jspdf';
import { apiFetch } from './api';

export interface ProyectoPdfHeader {
  denominacion: string;
  logo?: string;
}

export interface LogoData {
  dataUrl: string;
  format: string;
}

// Descarga el logo del proyecto (via el proxy que ya evita problemas de CORS
// con GCS) y lo devuelve listo para doc.addImage. null si no hay logo o falla la carga.
export async function fetchLogoData(logoUrl?: string): Promise<LogoData | null> {
  if (!logoUrl) return null;
  try {
    const res = await apiFetch(`/api/inspecciones/imagen-proxy?url=${encodeURIComponent(logoUrl)}`);
    const data = await res.json();
    if (!data.success || !data.base64) return null;
    const match = /^data:image\/(\w+);/.exec(data.base64);
    return { dataUrl: data.base64, format: match ? match[1].toUpperCase() : 'PNG' };
  } catch {
    return null;
  }
}

// Los logos institucionales suelen ser rectangulos anchos (ej. 4143x1076 px,
// ~3.85:1), nunca cuadrados. Calcula el tamano a dibujar respetando la
// relacion de aspecto real de la imagen, en vez de forzar un cuadrado.
export function computeLogoSize(
  doc: jsPDF,
  logo: LogoData,
  targetHeight: number,
  maxWidth: number
): { width: number; height: number } {
  try {
    const props = doc.getImageProperties(logo.dataUrl);
    const ratio = props.width / props.height || 1;
    const width = Math.min(targetHeight * ratio, maxWidth);
    return { width, height: width / ratio };
  } catch {
    return { width: targetHeight, height: targetHeight };
  }
}

// Dibuja el logo (si existe, respetando su relacion de aspecto real) + el
// nombre real del proyecto en la esquina superior derecha del PDF,
// reemplazando el encabezado institucional fijo que cada reporte dibujaba a
// mano. Devuelve el nuevo cursor Y.
export async function drawPdfHeader(
  doc: jsPDF,
  proyecto: ProyectoPdfHeader,
  y: number,
  opts?: { marginLeft?: number; marginRight?: number }
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = opts?.marginLeft ?? 15;
  const marginRight = opts?.marginRight ?? 15;
  const logoHeight = 12;
  const textRight = pageWidth - marginRight;

  const logo = await fetchLogoData(proyecto.logo);
  if (logo) {
    const { width, height } = computeLogoSize(doc, logo, logoHeight, 48);
    doc.addImage(logo.dataUrl, logo.format, marginLeft, y, width, height);
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(proyecto.denominacion || '', textRight, y + 4, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Formularios del Sistema de Gestión de SST', textRight, y + 8, { align: 'right' });

  return y + logoHeight;
}
