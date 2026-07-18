import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = '''                  <tbody>
                    {productosFiltrados.map((p, i) => {
                      const entradas = totalEntradasByProducto(p.codigo);
                      const salidas = totalSalidasByProducto(p.codigo);
                      const stock = stockDisponible(p.codigo);
                      const bajo = isStockBajo(p);
                      return (
                        <tr key={p.codigo} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${bajo ? 'bg-red-500/5' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                          <td className="px-4 py-3 font-medium">{p.nombre}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.proveedor || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400">{entradas}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-400">{salidas}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{stock}</td>
                          <td className="px-4 py-3 text-center">
                            {bajo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                                <AlertCircle size={10} /> Bajo
                              </span>
                            ) : stock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                                <CheckCircle2 size={10} /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                                <AlertTriangle size={10} /> Agotado
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEditProducto(p)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteProducto(p)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>'''
if viejo not in contenido:
    print("ERROR: no encontrado")
    sys.exit(1)

nuevo = '''                  <tbody>
                    {productosFiltrados.map((p, i) => {
                      const entradas = totalEntradasByProducto(p.codigo);
                      const salidas = totalSalidasByProducto(p.codigo);
                      const stock = stockDisponible(p.codigo);
                      const bajo = isStockBajo(p);
                      const editando = showProductoEdit?.codigo === p.codigo;
                      return (
                        <Fragment key={p.codigo}>
                        <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${bajo ? 'bg-red-500/5' : ''} ${editando ? 'bg-secondary/20' : ''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={productosSeleccionados.has(p.codigo)} onChange={() => toggleSeleccionProducto(p.codigo)} className="rounded" />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                          <td className="px-4 py-3 font-medium">{p.nombre}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.proveedor || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400">{entradas}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-400">{salidas}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{stock}</td>
                          <td className="px-4 py-3 text-center">
                            {bajo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                                <AlertCircle size={10} /> Bajo
                              </span>
                            ) : stock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                                <CheckCircle2 size={10} /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                                <AlertTriangle size={10} /> Agotado
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEditProducto(p)} className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${editando ? 'text-primary bg-secondary' : ''}`} title="Editar"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteProducto(p)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        {editando && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={8} className="px-6 py-4">
                              <form onSubmit={handleEditProducto} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-xs text-muted-foreground uppercase mb-1">Codigo</label>
                                  <p className="font-medium text-sm py-2">{p.codigo}</p>
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground uppercase mb-1">Nombre</label>
                                  <input type="text" value={editingProductoForm.nombre} onChange={(e) => setEditingProductoForm({...editingProductoForm, nombre: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground uppercase mb-1">Proveedor</label>
                                  <input type="text" value={editingProductoForm.proveedor} onChange={(e) => setEditingProductoForm({...editingProductoForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground uppercase mb-1">Clasificacion</label>
                                  <select value={editingProductoForm.clasificacion} onChange={(e) => setEditingProductoForm({...editingProductoForm, clasificacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50">
                                    <option value="">Seleccionar...</option>
                                    {clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground uppercase mb-1">Stock Minimo</label>
                                  <input type="number" value={editingProductoForm.stockMinimo} onChange={(e) => setEditingProductoForm({...editingProductoForm, stockMinimo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" />
                                </div>
                                <div className="flex items-end gap-2 md:col-span-4">
                                  <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                                  <button type="button" onClick={() => setShowProductoEdit(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>'''
contenido = contenido.replace(viejo, nuevo, 1)

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte 4 aplicada.")
