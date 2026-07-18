import sys

with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Nuevo estado para editar producto
cambios.append((
    "  const [salidaForm, setSalidaForm] = useState({ refItem: '', cantidad: '', trabajadorRetira: '' });",
    "  const [salidaForm, setSalidaForm] = useState({ refItem: '', cantidad: '', trabajadorRetira: '' });\n  const [showProductoEdit, setShowProductoEdit] = useState<Producto | null>(null);\n  const [editingProductoForm, setEditingProductoForm] = useState({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });"
))

# 2. Nuevas funciones: editar y eliminar producto (despues de handleAddProducto)
cambios.append((
"""  const handleAddRemision = async (e: React.FormEvent) => {""",
"""  const startEditProducto = (producto: Producto) => {
    setShowProductoEdit(producto);
    setEditingProductoForm({
      nombre: producto.nombre,
      proveedor: producto.proveedor,
      clasificacion: producto.clasificacion,
      stockMinimo: producto.stockMinimo,
    });
  };

  const handleEditProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showProductoEdit) return;
    try {
      const response = await fetch(`/api/epp/productos/${showProductoEdit.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProductoForm),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowProductoEdit(null);
      setEditingProductoForm({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleDeleteProducto = async (producto: Producto) => {
    if (!confirm(`Eliminar producto "${producto.nombre}"? Esto no borra las entradas/salidas ya registradas con este codigo.`)) return;
    try {
      const response = await fetch(`/api/epp/productos/${producto.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleAddRemision = async (e: React.FormEvent) => {"""
))

# 3. Columna "Acciones" en el encabezado de la tabla de productos
cambios.append((
'''                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p, i) => {''',
'''                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p, i) => {'''
))

# 4. Celda de Acciones en cada fila
cambios.append((
'''                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                                <AlertTriangle size={10} /> Agotado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Totales */}''',
'''                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
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
                  </tbody>
                </table>
              </div>
              {/* Totales */}'''
))

# 5. Modal de edicion de producto
cambios.append((
'''      {/* MODALES */}

      {/* Modal Ver Detalle de Remision */}''',
'''      {/* MODALES */}

      {/* Modal Editar Producto */}
      {showProductoEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Pencil size={20} className="text-primary" />Editar Producto</h2>
              <button onClick={() => { setShowProductoEdit(null); setEditingProductoForm({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' }); }} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditProducto} className="space-y-4">
              <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Codigo</span><p className="font-medium">{showProductoEdit.codigo}</p></div>
              <div><label className="block text-sm font-medium mb-2">Nombre</label><input type="text" value={editingProductoForm.nombre} onChange={(e) => setEditingProductoForm({...editingProductoForm, nombre: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm font-medium mb-2">Proveedor</label><input type="text" value={editingProductoForm.proveedor} onChange={(e) => setEditingProductoForm({...editingProductoForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div>
                <label className="block text-sm font-medium mb-2">Clasificacion</label>
                <select value={editingProductoForm.clasificacion} onChange={(e) => setEditingProductoForm({...editingProductoForm, clasificacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                  <option value="">Seleccionar...</option>
                  {clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-2">Stock Minimo</label><input type="number" value={editingProductoForm.stockMinimo} onChange={(e) => setEditingProductoForm({...editingProductoForm, stockMinimo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                <button type="button" onClick={() => { setShowProductoEdit(null); setEditingProductoForm({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' }); }} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle de Remision */}'''
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
