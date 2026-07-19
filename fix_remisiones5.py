import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = '''                              {itemsCount === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>}
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
                <span>{remisionesFiltradas.length} remisiones</span>'''
if viejo not in contenido:
    print("ERROR: no encontrado")
    sys.exit(1)

nuevo = '''                              {itemsCount === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                        {showRemisionEdit?.idRegistro === r.idRegistro && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={6} className="px-6 py-4">
                              <form onSubmit={handleEditRemision} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Proveedor</label><input type="text" value={editingRemisionForm.proveedor} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, proveedor: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Numeracion</label><input type="text" value={editingRemisionForm.numeracion} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, numeracion: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Fecha</label><input type="date" value={editingRemisionForm.fecha} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, fecha: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div><label className="block text-xs text-muted-foreground uppercase mb-1">Detalle</label><input type="text" value={editingRemisionForm.detalle} onChange={(e) => setEditingRemisionForm({...editingRemisionForm, detalle: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm input-glow focus:outline-none focus:border-primary/50" /></div>
                                <div className="flex items-end gap-2 md:col-span-4">
                                  <button type="submit" className="btn-gradient text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25"><Save size={18} /> Guardar Cambios</button>
                                  <button type="button" onClick={() => setShowRemisionEdit(null)} className="px-5 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors">Cancelar</button>
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
                <span>{remisionesFiltradas.length} remisiones</span>'''
contenido = contenido.replace(viejo, nuevo, 1)

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte 5 aplicada.")
