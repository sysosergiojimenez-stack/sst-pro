import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. handleEditNotaSalida: resetear el buscador despues de guardar
cambios.append((
'''      setShowNotaEdit(null);
      setEditingNotaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const startEditNota = (nota: NotaSalida) => {''',
'''      setShowNotaEdit(null);
      setEditingNotaForm({ orden: '', fecha: '', quienRetira: '', observaciones: '' });
      setBusquedaQuienRetira('');
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const startEditNota = (nota: NotaSalida) => {'''
))

# 2. startEditNota: precargar el buscador con el nombre actual
cambios.append((
'''    setEditingNotaForm({
      orden: nota.orden,
      fecha: nota.fecha,
      quienRetira: nota.quienRetira,
      observaciones: nota.observaciones,
    });
  };''',
'''    setEditingNotaForm({
      orden: nota.orden,
      fecha: nota.fecha,
      quienRetira: nota.quienRetira,
      observaciones: nota.observaciones,
    });
    const empActual = buscarEmpleado(nota.quienRetira);
    setBusquedaQuienRetira(empActual ? `${empActual.nombres} ${empActual.apellidos} - CI: ${empActual.nroDocumento}` : '');
  };'''
))

# 3. Campo Quien Retira en la fila de edicion: reemplazar por el buscador
cambios.append((
'''                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Quien Retira</label><input type="text" value={editingNotaForm.quienRetira} onChange={(e) => setEditingNotaForm({...editingNotaForm, quienRetira: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>''',
'''                                <div className="relative">
                                  <label className="block text-xs text-muted-foreground uppercase mb-1">Quien Retira</label>
                                  <input
                                    type="text"
                                    value={busquedaQuienRetira}
                                    onChange={(e) => {
                                      setBusquedaQuienRetira(e.target.value);
                                      setMostrarSugerenciasQuienRetira(true);
                                      if (editingNotaForm.quienRetira) setEditingNotaForm({ ...editingNotaForm, quienRetira: '' });
                                    }}
                                    onFocus={() => setMostrarSugerenciasQuienRetira(true)}
                                    onBlur={() => setTimeout(() => setMostrarSugerenciasQuienRetira(false), 150)}
                                    placeholder="Escribi nombre o cedula..."
                                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50"
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
                                              setEditingNotaForm({ ...editingNotaForm, quienRetira: emp.nroDocumento });
                                              setBusquedaQuienRetira(`${emp.nombres} ${emp.apellidos} - CI: ${emp.nroDocumento}`);
                                              setMostrarSugerenciasQuienRetira(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                                          >
                                            {emp.nombres} {emp.apellidos} <span className="text-muted-foreground">- CI: {emp.nroDocumento}</span>
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                                      )}
                                    </div>
                                  )}
                                </div>'''
))

# 4. Boton Cancelar de la edicion: resetear el buscador
cambios.append((
    '''<button type="button" onClick={() => setShowNotaEdit(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>''',
    '''<button type="button" onClick={() => { setShowNotaEdit(null); setBusquedaQuienRetira(''); }} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>'''
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
    print("Listo! Los 4 cambios se aplicaron correctamente.")
else:
    sys.exit(1)
