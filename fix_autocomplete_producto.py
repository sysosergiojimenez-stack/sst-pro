import sys

with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Nuevo estado para el buscador de producto
cambios.append((
    "  const [salidaForm, setSalidaForm] = useState({ refItem: '', cantidad: '', trabajadorRetira: '' });",
    "  const [salidaForm, setSalidaForm] = useState({ refItem: '', cantidad: '', trabajadorRetira: '' });\n  const [busquedaProducto, setBusquedaProducto] = useState('');\n  const [mostrarSugerenciasProducto, setMostrarSugerenciasProducto] = useState(false);"
))

# 2. Reset del buscador al agregar el item (limpia el form despues de agregar)
cambios.append((
    "    setSalidaForm({ refItem: '', cantidad: '', trabajadorRetira: '' });\n  };",
    "    setSalidaForm({ refItem: '', cantidad: '', trabajadorRetira: '' });\n    setBusquedaProducto('');\n  };"
))

# 3. BLOQUE 1: Producto en "Agregar Item" (Nueva Nota de Salida)
cambios.append((
'''                    <div>
                      <label className="block text-sm font-medium mb-2">Producto *</label>
                      <select value={salidaForm.refItem} onChange={(e) => setSalidaForm({...salidaForm, refItem: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50">
                        <option value="">Seleccionar...</option>
                        {productos.map(p => {
                          const stock = stockDisponible(p.codigo);
                          return <option key={p.codigo} value={p.codigo}>{p.nombre} (Stock: {stock})</option>;
                        })}
                      </select>
                    </div>''',
'''                    <div className="relative">
                      <label className="block text-sm font-medium mb-2">Producto *</label>
                      <input
                        type="text"
                        value={busquedaProducto || (salidaForm.refItem ? `${productos.find(p => p.codigo === salidaForm.refItem)?.nombre || ''} (Stock: ${stockDisponible(salidaForm.refItem)})` : '')}
                        onChange={(e) => { setBusquedaProducto(e.target.value); setMostrarSugerenciasProducto(true); if (salidaForm.refItem) setSalidaForm({ ...salidaForm, refItem: '' }); }}
                        onFocus={() => setMostrarSugerenciasProducto(true)}
                        onBlur={() => setTimeout(() => setMostrarSugerenciasProducto(false), 150)}
                        placeholder="Escribi nombre o codigo..."
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
                        autoComplete="off"
                      />
                      {mostrarSugerenciasProducto && busquedaProducto && (
                        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                          {productos.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(busquedaProducto.toLowerCase())).length > 0 ? (
                            productos.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(busquedaProducto.toLowerCase())).map(p => (
                              <button
                                type="button"
                                key={p.codigo}
                                onClick={() => { setSalidaForm({ ...salidaForm, refItem: p.codigo }); setBusquedaProducto(''); setMostrarSugerenciasProducto(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
                              >
                                {p.nombre} <span className="text-muted-foreground">(Stock: {stockDisponible(p.codigo)})</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2.5 text-sm text-muted-foreground">Sin resultados</div>
                          )}
                        </div>
                      )}
                    </div>'''
))

# 4. BLOQUE 2: Producto en "Agregar Productos a la Nota" (panel de nota seleccionada)
cambios.append((
'''                  <div><label className="block text-sm font-medium mb-2">Producto *</label>
                    <select value={salidaForm.refItem} onChange={(e) => setSalidaForm({...salidaForm, refItem: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                      <option value="">Seleccionar...</option>
                      {productos.map(p => {
                        const stock = stockDisponible(p.codigo);
                        return <option key={p.codigo} value={p.codigo}>{p.nombre} (Stock: {stock})</option>;
                      })}
                    </select>
                  </div>''',
'''                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Producto *</label>
                    <input
                      type="text"
                      value={busquedaProducto || (salidaForm.refItem ? `${productos.find(p => p.codigo === salidaForm.refItem)?.nombre || ''} (Stock: ${stockDisponible(salidaForm.refItem)})` : '')}
                      onChange={(e) => { setBusquedaProducto(e.target.value); setMostrarSugerenciasProducto(true); if (salidaForm.refItem) setSalidaForm({ ...salidaForm, refItem: '' }); }}
                      onFocus={() => setMostrarSugerenciasProducto(true)}
                      onBlur={() => setTimeout(() => setMostrarSugerenciasProducto(false), 150)}
                      placeholder="Escribi nombre o codigo..."
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
                      required={!salidaForm.refItem}
                      autoComplete="off"
                    />
                    {mostrarSugerenciasProducto && busquedaProducto && (
                      <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                        {productos.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(busquedaProducto.toLowerCase())).length > 0 ? (
                          productos.filter(p => `${p.nombre} ${p.codigo}`.toLowerCase().includes(busquedaProducto.toLowerCase())).map(p => (
                            <button
                              type="button"
                              key={p.codigo}
                              onClick={() => { setSalidaForm({ ...salidaForm, refItem: p.codigo }); setBusquedaProducto(''); setMostrarSugerenciasProducto(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
                            >
                              {p.nombre} <span className="text-muted-foreground">(Stock: {stockDisponible(p.codigo)})</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-sm text-muted-foreground">Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>'''
))

# 5. Resetear buscador tambien al cerrar la Nueva Nota con la X
cambios.append((
    '''<button onClick={() => { setShowNotaSalidaForm(false); setSalidasTemporales([]); setBusquedaQuienRetira(''); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>''',
    '''<button onClick={() => { setShowNotaSalidaForm(false); setSalidasTemporales([]); setBusquedaQuienRetira(''); setBusquedaProducto(''); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>'''
))

# 6. Resetear buscador al cerrar el panel de nota seleccionada
cambios.append((
    '''<button onClick={() => { setSelectedNota(null); setSalidasTemporales([]); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>''',
    '''<button onClick={() => { setSelectedNota(null); setSalidasTemporales([]); setBusquedaProducto(''); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>'''
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
    print("Listo! Los 6 cambios se aplicaron correctamente.")
else:
    sys.exit(1)
