import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = '''                                {itemsCount === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay salidas registradas</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-secondary/30 border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{notasFiltradas.length} notas de salida</span>'''
if viejo not in contenido:
    print("ERROR: no encontrado")
    sys.exit(1)

nuevo = '''                                {itemsCount === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay salidas registradas</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                        {showNotaEdit?.idRegistro === n.idRegistro && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={6} className="px-6 py-4">
                              <form onSubmit={handleEditNotaSalida} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Orden</label><input type="text" value={editingNotaForm.orden} onChange={(e) => setEditingNotaForm({...editingNotaForm, orden: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Fecha</label><input type="date" value={editingNotaForm.fecha} onChange={(e) => setEditingNotaForm({...editingNotaForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Quien Retira</label><input type="text" value={editingNotaForm.quienRetira} onChange={(e) => setEditingNotaForm({...editingNotaForm, quienRetira: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Observaciones</label><input type="text" value={editingNotaForm.observaciones} onChange={(e) => setEditingNotaForm({...editingNotaForm, observaciones: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div className="flex items-end gap-2 md:col-span-4">
                                  <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                                  <button type="button" onClick={() => setShowNotaEdit(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-secondary/30 border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{notasFiltradas.length} notas de salida</span>'''
contenido = contenido.replace(viejo, nuevo, 1)

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte 5 aplicada.")
