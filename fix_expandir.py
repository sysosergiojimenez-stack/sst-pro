import sys

with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Agregar Fragment al import de React
cambios.append((
    "import { useState, useEffect } from 'react';",
    "import { useState, useEffect, Fragment } from 'react';"
))

# 2. Tabla de Remisiones: convertir fila + boton "Ver detalle" en fila expandible
cambios.append((
'''                    }).map((r, i) => {
                      const itemsCount = entradasByRemision(r.idRegistro).length;
                      return (
                        <tr key={r.idRegistro} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{formatearFecha(r.fecha)}</td>
                          <td className="px-4 py-3 font-medium">{r.numeracion}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.proveedor || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                              <Package size={10} /> {itemsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {r.scaneado && (
                                <a href={r.scaneado} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver PDF">
                                  <FileText size={16} />
                                </a>
                              )}
                              <button onClick={() => setShowRemisionDetail(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver detalle"><Eye size={16} /></button>
                              <button onClick={() => startEditRemision(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteRemision(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}''',
'''                    }).map((r, i) => {
                      const itemsCount = entradasByRemision(r.idRegistro).length;
                      const expandida = showRemisionDetail?.idRegistro === r.idRegistro;
                      return (
                        <Fragment key={r.idRegistro}>
                        <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${expandida ? 'bg-secondary/20' : ''}`}>
                          <td className="px-4 py-3 text-muted-foreground">{formatearFecha(r.fecha)}</td>
                          <td className="px-4 py-3 font-medium">{r.numeracion}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.proveedor || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                              <Package size={10} /> {itemsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {r.scaneado && (
                                <a href={r.scaneado} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver PDF">
                                  <FileText size={16} />
                                </a>
                              )}
                              <button onClick={() => setShowRemisionDetail(expandida ? null : r)} className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${expandida ? 'text-primary bg-secondary' : ''}`} title="Ver detalle"><Eye size={16} /></button>
                              <button onClick={() => startEditRemision(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteRemision(r)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        {expandida && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div><span className="text-xs text-muted-foreground uppercase">Numeracion</span><p className="font-medium">{r.numeracion}</p></div>
                                <div><span className="text-xs text-muted-foreground uppercase">Proveedor</span><p className="font-medium">{r.proveedor || '-'}</p></div>
                                <div><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{formatearFecha(r.fecha)}</p></div>
                                <div><span className="text-xs text-muted-foreground uppercase">ID Registro</span><p className="font-medium">{r.idRegistro}</p></div>
                              </div>
                              {r.detalle && (
                                <div className="mb-4"><span className="text-xs text-muted-foreground uppercase">Detalle</span><p className="font-medium">{r.detalle}</p></div>
                              )}
                              {r.scaneado && (
                                <a href={r.scaneado} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm mb-4"><FileText size={14} /> Ver documento escaneado</a>
                              )}
                              <h4 className="text-sm font-medium mb-2">Items de la remision ({itemsCount})</h4>
                              <div className="space-y-2">
                                {entradasByRemision(r.idRegistro).map(e => (
                                  <div key={e.idRegistro} className="flex items-center justify-between bg-background/50 p-3 rounded-xl text-sm">
                                    <div><p className="font-medium">{e.item}</p><p className="text-xs text-muted-foreground">Codigo: {e.codigo}</p></div>
                                    <span className="font-medium">{e.cantidad} und</span>
                                  </div>
                                ))}
                                {itemsCount === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}'''
))

# 3. Tabla de Notas de Salida: misma logica de fila expandible
cambios.append((
'''                    }).map((n) => {
                      const itemsCount = salidasByNota(n.idRegistro).length;
                      const emp = buscarEmpleado(n.quienRetira);
                      const nombreRetira = emp ? `${emp.nombres} ${emp.apellidos}` : n.quienRetira;
                      return (
                        <tr key={n.idRegistro} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{formatearFecha(n.fecha)}</td>
                          <td className="px-4 py-3 font-medium">{n.orden || n.idRegistro}</td>
                          <td className="px-4 py-3">{nombreRetira}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                              <Package size={10} /> {itemsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setShowNotaDetail(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Ver detalle"><Eye size={16} /></button>
                              <button onClick={() => startEditNota(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteNotaSalida(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}''',
'''                    }).map((n) => {
                      const itemsCount = salidasByNota(n.idRegistro).length;
                      const emp = buscarEmpleado(n.quienRetira);
                      const nombreRetira = emp ? `${emp.nombres} ${emp.apellidos}` : n.quienRetira;
                      const expandida = showNotaDetail?.idRegistro === n.idRegistro;
                      return (
                        <Fragment key={n.idRegistro}>
                        <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${expandida ? 'bg-secondary/20' : ''}`}>
                          <td className="px-4 py-3 text-muted-foreground">{formatearFecha(n.fecha)}</td>
                          <td className="px-4 py-3 font-medium">{n.orden || n.idRegistro}</td>
                          <td className="px-4 py-3">{nombreRetira}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                              <Package size={10} /> {itemsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setShowNotaDetail(expandida ? null : n)} className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${expandida ? 'text-primary bg-secondary' : ''}`} title="Ver detalle"><Eye size={16} /></button>
                              <button onClick={() => startEditNota(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteNotaSalida(n)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        {expandida && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div><span className="text-xs text-muted-foreground uppercase">Orden</span><p className="font-medium">{n.orden || n.idRegistro}</p></div>
                                <div><span className="text-xs text-muted-foreground uppercase">Quien Retira</span><p className="font-medium">{nombreRetira}</p></div>
                                <div><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{formatearFecha(n.fecha)}</p></div>
                                <div><span className="text-xs text-muted-foreground uppercase">ID Registro</span><p className="font-medium">{n.idRegistro}</p></div>
                              </div>
                              {n.observaciones && (
                                <div className="mb-4"><span className="text-xs text-muted-foreground uppercase">Observaciones</span><p className="font-medium">{n.observaciones}</p></div>
                              )}
                              <h4 className="text-sm font-medium mb-2">Salidas registradas ({itemsCount})</h4>
                              <div className="space-y-2">
                                {salidasByNota(n.idRegistro).map(s => {
                                  const prod = productos.find(p => p.codigo === s.refItem);
                                  const empS = buscarEmpleado(s.trabajadorRetira);
                                  return (
                                    <div key={s.idRegistro} className="flex items-center justify-between bg-background/50 p-3 rounded-xl text-sm">
                                      <div><p className="font-medium">{prod?.nombre || s.refItem}</p><p className="text-xs text-muted-foreground">Trabajador: {empS ? `${empS.nombres} ${empS.apellidos} (${empS.nroDocumento})` : s.trabajadorRetira}</p></div>
                                      <span className="font-medium">{s.cantidad} und</span>
                                    </div>
                                  );
                                })}
                                {itemsCount === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay salidas registradas</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}'''
))

# 4. Eliminar el modal de detalle de Remision (ya no hace falta, ahora es inline)
cambios.append((
'''      {/* Modal Ver Detalle de Remision */}
      {showRemisionDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Truck size={20} className="text-amber-400" />Detalle de Remision</h2>
              <button onClick={() => setShowRemisionDetail(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Numeracion</span><p className="font-medium">{showRemisionDetail.numeracion}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Proveedor</span><p className="font-medium">{showRemisionDetail.proveedor}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{formatearFecha(showRemisionDetail.fecha)}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">ID Registro</span><p className="font-medium">{showRemisionDetail.idRegistro}</p></div>
              </div>
              {showRemisionDetail.detalle && (
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Detalle</span><p className="font-medium">{showRemisionDetail.detalle}</p></div>
              )}
              {showRemisionDetail.scaneado && (
                <a href={showRemisionDetail.scaneado} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm"><FileText size={14} /> Ver documento escaneado</a>
              )}
              <div>
                <h3 className="font-medium text-sm mb-3">Items de la remision ({entradasByRemision(showRemisionDetail.idRegistro).length})</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {entradasByRemision(showRemisionDetail.idRegistro).map(e => (
                    <div key={e.idRegistro} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm">
                      <div><p className="font-medium">{e.item}</p><p className="text-xs text-muted-foreground">Codigo: {e.codigo}</p></div>
                      <span className="font-medium">{e.cantidad} und</span>
                    </div>
                  ))}
                  {entradasByRemision(showRemisionDetail.idRegistro).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay items registrados para esta remision</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

''',
""
))

# 5. Eliminar el modal de detalle de Nota de Salida
cambios.append((
'''      {/* Modal Ver Detalle de Nota de Salida */}
      {showNotaDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ArrowDownCircle size={20} className="text-red-400" />Detalle de Nota de Salida</h2>
              <button onClick={() => setShowNotaDetail(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Orden</span><p className="font-medium">{showNotaDetail.orden}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Quien Retira</span><p className="font-medium">{showNotaDetail.quienRetira}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Fecha</span><p className="font-medium">{formatearFecha(showNotaDetail.fecha)}</p></div>
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">ID Registro</span><p className="font-medium">{showNotaDetail.idRegistro}</p></div>
              </div>
              {showNotaDetail.observaciones && (
                <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Observaciones</span><p className="font-medium">{showNotaDetail.observaciones}</p></div>
              )}
              <div>
                <h3 className="font-medium text-sm mb-3">Salidas registradas ({salidasByNota(showNotaDetail.idRegistro).length})</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {salidasByNota(showNotaDetail.idRegistro).map(s => {
                    const prod = productos.find(p => p.codigo === s.refItem);
                    const emp = buscarEmpleado(s.trabajadorRetira);
                    return (
                      <div key={s.idRegistro} className="flex items-center justify-between bg-secondary/50 p-3 rounded-xl text-sm">
                        <div>
                          <p className="font-medium">{prod?.nombre || s.refItem}</p>
                          <p className="text-xs text-muted-foreground">Trabajador: {emp ? `${emp.nombres} ${emp.apellidos} (${emp.nroDocumento})` : s.trabajadorRetira}</p>
                        </div>
                        <span className="font-medium">{s.cantidad} und</span>
                      </div>
                    );
                  })}
                  {salidasByNota(showNotaDetail.idRegistro).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay salidas registradas para esta nota</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

''',
""
))

ok = True
for i, (viejo, nuevo) in enumerate(cambios, 1):
    if viejo not in contenido:
        print(f"ERROR en cambio #{i}: no encontre el bloque exacto. No se guardo nada.")
        ok = False
        break
    contenido = contenido.replace(viejo, nuevo, 1)

if ok:
    with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("Listo! Los 5 cambios se aplicaron correctamente.")
else:
    sys.exit(1)
