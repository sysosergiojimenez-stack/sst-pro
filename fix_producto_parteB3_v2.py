import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

if "Modal Editar Producto" in contenido:
    print("El modal ya estaba agregado, no hace falta nada.")
    sys.exit(0)

viejo = '''      {/* MODALES */}

      {/* Modal Editar Remision */}'''
if viejo not in contenido:
    print("ERROR: no encontrado")
    sys.exit(1)

partes = []
partes.append('      {/* MODALES */}\n\n      {/* Modal Editar Producto */}\n')
partes.append('      {showProductoEdit && (\n')
partes.append('        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">\n')
partes.append('          <div className="glass-card p-6 max-w-lg w-full scale-in">\n')
partes.append('            <div className="flex items-center justify-between mb-6">\n')
partes.append('              <h2 className="text-lg font-semibold flex items-center gap-2"><Pencil size={20} className="text-primary" />Editar Producto</h2>\n')
partes.append('''              <button onClick={() => { setShowProductoEdit(null); setEditingProductoForm({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' }); }} className="p-2 rounded-lg hover:bg-secondary transition-colors"><X size={20} /></button>
''')
partes.append('            </div>\n')
partes.append('            <form onSubmit={handleEditProducto} className="space-y-4">\n')
partes.append('              <div className="bg-secondary/50 p-3 rounded-xl"><span className="text-xs text-muted-foreground uppercase">Codigo</span><p className="font-medium">{showProductoEdit.codigo}</p></div>\n')
partes.append('''              <div><label className="block text-sm font-medium mb-2">Nombre</label><input type="text" value={editingProductoForm.nombre} onChange={(e) => setEditingProductoForm({...editingProductoForm, nombre: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
''')
partes.append('''              <div><label className="block text-sm font-medium mb-2">Proveedor</label><input type="text" value={editingProductoForm.proveedor} onChange={(e) => setEditingProductoForm({...editingProductoForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
''')
partes.append('              <div>\n                <label className="block text-sm font-medium mb-2">Clasificacion</label>\n')
partes.append('''                <select value={editingProductoForm.clasificacion} onChange={(e) => setEditingProductoForm({...editingProductoForm, clasificacion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
''')
partes.append('                  <option value="">Seleccionar...</option>\n')
partes.append('                  {clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}\n')
partes.append('                </select>\n              </div>\n')
partes.append('''              <div><label className="block text-sm font-medium mb-2">Stock Minimo</label><input type="number" value={editingProductoForm.stockMinimo} onChange={(e) => setEditingProductoForm({...editingProductoForm, stockMinimo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
''')
partes.append('              <div className="flex gap-2 pt-2">\n')
partes.append('                <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>\n')
partes.append('''                <button type="button" onClick={() => { setShowProductoEdit(null); setEditingProductoForm({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' }); }} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
''')
partes.append('              </div>\n            </form>\n          </div>\n        </div>\n      )}\n\n')
partes.append('      {/* Modal Editar Remision */}')

nuevo = ''.join(partes)
contenido = contenido.replace(viejo, nuevo, 1)
with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte B3 aplicada. Todo listo.")
