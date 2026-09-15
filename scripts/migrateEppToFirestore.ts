// Migracion unica de las pestanas Sheets de EPP (Productos, Remisiones y
// Facturas, Entradas, Notas de Salida, Salidas, SOLICITUDES_SUMINISTRO,
// AJUSTES_STOCK) a sus colecciones Firestore equivalentes. No incluye
// Marcaciones Biometricas (modulo separado, se migra despues).
//
// Productos usa IDs autogenerados (su "codigo" es mutable/renombrable).
// El resto usa idRegistro como doc ID (auto-generado con Date.now() en el
// cliente, nunca tipeado a mano), idempotente con { merge: true } -- salvo
// las pocas filas viejas que ya tenian idRegistro vacio en Sheets, a las
// que se les asigna un ID nuevo autogenerado para no perderlas (afectan
// calculos de stock). Volver a correr el script duplicaria esas filas
// puntuales; el resto es seguro de re-correr.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/migrateEppToFirestore.ts
import 'dotenv/config';
import {
  getAllProductos, getAllRemisiones, getAllEntradas, getAllNotasSalida,
  getAllSalidas, getAllSolicitudesSuministro, getAllAjustesStock,
} from '../src/server/lib/googleSheets_epp';
import { getDb } from '../src/server/lib/firebaseAdmin';

async function main() {
  const db = getDb();

  // --- Productos -> epp_productos (IDs autogenerados) ---
  const productos = await getAllProductos();
  console.log(`Leidos ${productos.length} productos de Sheets.`);
  let batch = db.batch();
  let enBatch = 0;
  let migrados = 0;
  for (const p of productos) {
    if (!p.codigo) continue;
    batch.set(db.collection('epp_productos').doc(), {
      codigo: p.codigo, proyecto: p.proyecto, nombre: p.nombre,
      proveedor: p.proveedor, clasificacion: p.clasificacion, stockMinimo: p.stockMinimo || '0',
    });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${productos.length} productos migrados.`);

  // --- Remisiones y Facturas -> epp_remisiones (doc ID = idRegistro, o
  // autogenerado si la fila no tenia uno -- no se descartan filas, ya que
  // contribuyen a entradas/salidas relacionadas). ---
  const remisiones = await getAllRemisiones();
  console.log(`Leidas ${remisiones.length} remisiones de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const r of remisiones) {
    if (!r.proyecto && !r.numeracion) continue; // fila totalmente vacia
    const ref = r.idRegistro ? db.collection('epp_remisiones').doc(r.idRegistro) : db.collection('epp_remisiones').doc();
    batch.set(ref, {
      idRegistro: r.idRegistro || ref.id, fechaHora: r.fechaHora, userEmail: r.userEmail,
      proyecto: r.proyecto, proveedor: r.proveedor, numeracion: r.numeracion,
      fecha: r.fecha, detalle: r.detalle, scaneado: r.scaneado,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${remisiones.length} remisiones migradas.`);

  // --- Entradas -> epp_entradas (doc ID = idRegistro, o autogenerado --
  // no se descartan filas: contribuyen al calculo de stock por codigo). ---
  const entradas = await getAllEntradas();
  console.log(`Leidas ${entradas.length} entradas de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const e of entradas) {
    if (!e.codigo && !e.cantidad) continue; // fila totalmente vacia
    const ref = e.idRegistro ? db.collection('epp_entradas').doc(e.idRegistro) : db.collection('epp_entradas').doc();
    batch.set(ref, {
      idRegistro: e.idRegistro || ref.id, dateTime: e.dateTime, userEmail: e.userEmail,
      refRemision: e.refRemision, codigo: e.codigo, item: e.item,
      cantidad: e.cantidad, proyecto: e.proyecto,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${entradas.length} entradas migradas.`);

  // --- Notas de Salida -> epp_notas_salida (doc ID = idRegistro, o
  // autogenerado -- no se descartan filas: sus salidas relacionadas se
  // linkean por este idRegistro). ---
  const notas = await getAllNotasSalida();
  console.log(`Leidas ${notas.length} notas de salida de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const n of notas) {
    if (!n.obra && !n.quienRetira) continue; // fila totalmente vacia
    const ref = n.idRegistro ? db.collection('epp_notas_salida').doc(n.idRegistro) : db.collection('epp_notas_salida').doc();
    batch.set(ref, {
      idRegistro: n.idRegistro || ref.id, fechaHora: n.fechaHora, userEmail: n.userEmail,
      obra: n.obra, orden: n.orden, fecha: n.fecha,
      quienRetira: n.quienRetira, observaciones: n.observaciones,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${notas.length} notas de salida migradas.`);

  // --- Salidas -> epp_salidas (doc ID = idRegistro, o autogenerado --
  // no se descartan filas: contribuyen al calculo de stock por refItem). ---
  const salidas = await getAllSalidas();
  console.log(`Leidas ${salidas.length} salidas de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const s of salidas) {
    if (!s.refItem && !s.cantidad) continue; // fila totalmente vacia
    const ref = s.idRegistro ? db.collection('epp_salidas').doc(s.idRegistro) : db.collection('epp_salidas').doc();
    batch.set(ref, {
      idRegistro: s.idRegistro || ref.id, fechaHora: s.fechaHora, userEmail: s.userEmail,
      refNotaSalida: s.refNotaSalida, refItem: s.refItem, cantidad: s.cantidad,
      trabajadorRetira: s.trabajadorRetira,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${salidas.length} salidas migradas.`);

  // --- SOLICITUDES_SUMINISTRO -> epp_solicitudes_suministro (doc ID = idRegistro) ---
  const solicitudes = await getAllSolicitudesSuministro();
  console.log(`Leidas ${solicitudes.length} solicitudes de suministro de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const s of solicitudes) {
    if (!s.idRegistro) continue;
    batch.set(db.collection('epp_solicitudes_suministro').doc(s.idRegistro), {
      idRegistro: s.idRegistro, fechaHora: s.fechaHora, userEmail: s.userEmail,
      proyecto: s.proyecto, numero: s.numero, fecha: s.fecha, supervisor: s.supervisor,
      actividad: s.actividad, ubicacion: s.ubicacion, proveedor: s.proveedor,
      fechaLimiteEntrega: s.fechaLimiteEntrega, observaciones: s.observaciones,
      items: s.items || [], estado: s.estado || 'Pendiente',
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${solicitudes.length} solicitudes de suministro migradas.`);

  // --- AJUSTES_STOCK -> epp_ajustes_stock (doc ID = idRegistro, o
  // autogenerado -- no se descartan filas: contribuyen al calculo de stock). ---
  const ajustes = await getAllAjustesStock();
  console.log(`Leidos ${ajustes.length} ajustes de stock de Sheets.`);
  batch = db.batch(); enBatch = 0; migrados = 0;
  for (const a of ajustes) {
    if (!a.codigoProducto && !a.cantidad) continue; // fila totalmente vacia
    const ref = a.idRegistro ? db.collection('epp_ajustes_stock').doc(a.idRegistro) : db.collection('epp_ajustes_stock').doc();
    batch.set(ref, {
      idRegistro: a.idRegistro || ref.id, fechaHora: a.fechaHora, userEmail: a.userEmail,
      proyecto: a.proyecto, codigoProducto: a.codigoProducto, cantidad: a.cantidad,
      tipo: a.tipo, motivo: a.motivo,
    }, { merge: true });
    enBatch++; migrados++;
    if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
  }
  if (enBatch > 0) await batch.commit();
  console.log(`Listo. ${migrados}/${ajustes.length} ajustes de stock migrados.`);
}

main().catch(err => {
  console.error('Error en la migracion:', err);
  process.exit(1);
});
