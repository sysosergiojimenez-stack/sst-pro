import sys

with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Nuevo estado para el buscador
cambios.append((
    "  const [notaSalidaForm, setNotaSalidaForm] = useState({ orden: '', fecha: '', quienRetira: '', observaciones: '' });",
    "  const [notaSalidaForm, setNotaSalidaForm] = useState({ orden: '', fecha: '', quienRetira: '', observaciones: '' });\n  const [busquedaQuienRetira, setBusquedaQuienRetira] = useState('');\n  const [mostrarSugerenciasQuienRetira, setMostrarSugerenciasQuienRetira] = useState(false);"
))

# 2. Reemplazar el <select> por el buscador con autocompletado
cambios.append((
'''                  <div><label className="block text-sm font-medium mb-2">Quien Retira (Nro CI) *</label>
                    <select value={notaSalidaForm.quienRetira} onChange={(e) => setNotaSalidaForm({...notaSalidaForm, quienRetira: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                      <option value="">Nro de CI del trabajador</option>
                      {empleados.map(e => <option key={e.nroDocumento} value={e.nroDocumento}>{e.nombres} {e.apellidos} - CI: {e.nroDocumento}</option>)}
                    </select>
                  </div>''',
'''                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Quien Retira (Nro CI) *</label>
                    <input
                      type="text"
                      value={busquedaQuienRetira}
                      onChange={(e) => {
                        setBusquedaQuienRetira(e.target.value);
                        setMostrarSugerenciasQuienRetira(true);
                        if (notaSalidaForm.quienRetira) setNotaSalidaForm({ ...notaSalidaForm, quienRetira: '' });
                      }}
                      onFocus={() => setMostrarSugerenciasQuienRetira(true)}
                      onBlur={() => setTimeout(() => setMostrarSugerenciasQuienRetira(false), 150)}
                      placeholder="Escribi nombre o cedula..."
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
                      required={!notaSalidaForm.quienRetira}
                      autoComplete="off"
                    />
                    {mostrarSugerenciasQuienRetira && busquedaQuienRetira && (
                      <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
                        {empleados.filter(e => `${e.nombres} ${e.apellidos} ${e.nroDocumento}`.toLowerCase().includes(busquedaQuienRetira.toLowerCase())).length > 0 ? (
                          empleados.filter(e => `${e.nombres} ${e.apellidos} ${e.nroDocumento}`.toLowerCase().includes(busquedaQuienRetira.toLowerCase())).map(emp => (
                            <button
                              type="button"
                              key={emp.nroDocumento}
                              onClick={() => {
                                setNotaSalidaForm({ ...notaSalidaForm, quienRetira: emp.nroDocumento });
                                setBusquedaQuienRetira(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                                setMostrarSugerenciasQuienRetira(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
                            >
                              {emp.nombres} {emp.apellidos} <span className="text-muted-foreground">- CI: {emp.nroDocumento}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-sm text-muted-foreground">Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>'''
))

# 3. Resetear el buscador al abrir el formulario de Nueva Nota
cambios.append((
'''              onClick={() => {
                const nextNum = notasSalida.filter(n => n.obra === proyecto).length + 1;
                const hoy = new Date().toISOString().split('T')[0];
                setNotaSalidaForm(prev => ({...prev, orden: `NS-${String(nextNum).padStart(3, '0')}`, fecha: hoy}));
                setShowNotaSalidaForm(true);
              }} className="btn-gradient text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm">''',
'''              onClick={() => {
                const nextNum = notasSalida.filter(n => n.obra === proyecto).length + 1;
                const hoy = new Date().toISOString().split('T')[0];
                setNotaSalidaForm(prev => ({...prev, orden: `NS-${String(nextNum).padStart(3, '0')}`, fecha: hoy}));
                setBusquedaQuienRetira('');
                setShowNotaSalidaForm(true);
              }} className="btn-gradient text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm">'''
))

# 4. Resetear el buscador al cerrar el formulario con la X
cambios.append((
    '''<button onClick={() => { setShowNotaSalidaForm(false); setSalidasTemporales([]); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>''',
    '''<button onClick={() => { setShowNotaSalidaForm(false); setSalidasTemporales([]); setBusquedaQuienRetira(''); }} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>'''
))

# 5. Resetear el buscador despues de guardar la nota con exito
cambios.append((
'''      setShowNotaSalidaForm(false);
      setNotaSalidaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      setSalidasTemporales([]);
      fetchData();
      alert(`Nota de salida creada con ${salidasBatch.length} item(s)!`);''',
'''      setShowNotaSalidaForm(false);
      setNotaSalidaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      setSalidasTemporales([]);
      setBusquedaQuienRetira('');
      fetchData();
      alert(`Nota de salida creada con ${salidasBatch.length} item(s)!`);'''
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
