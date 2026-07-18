import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = '''          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Planilla de Productos EPP</h2>
            <button onClick={() => setShowProductoForm(true)} className="bg-secondary border border-border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
              <Plus size={16} /> Nuevo Producto
            </button>
          </div>'''
if viejo not in contenido:
    print("ERROR: no encontrado")
    sys.exit(1)
nuevo = '''          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Planilla de Productos EPP</h2>
            <div className="flex gap-2">
              {productosSeleccionados.size > 0 && (
                <button onClick={handleBulkDeleteProductos} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-500/20 transition-colors text-sm">
                  <Trash2 size={16} /> Eliminar ({productosSeleccionados.size})
                </button>
              )}
              <button onClick={() => setShowProductoForm(true)} className="bg-secondary border border-border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition-colors text-sm">
                <Plus size={16} /> Nuevo Producto
              </button>
            </div>
          </div>'''
contenido = contenido.replace(viejo, nuevo, 1)

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte 2 aplicada.")
