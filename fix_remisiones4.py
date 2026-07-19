import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Checkbox al inicio de cada fila (justo antes de la celda de Fecha)
cambios.append((
'''                        <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${expandida ? 'bg-secondary/20' : ''}`}>
                          <td className="px-4 py-3 text-muted-foreground">{formatearFecha(r.fecha)}</td>''',
'''                        <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${expandida ? 'bg-secondary/20' : ''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={remisionesSeleccionadas.has(r.idRegistro)} onChange={() => toggleSeleccionRemision(r.idRegistro)} className="rounded" />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatearFecha(r.fecha)}</td>'''
))

# 2. colSpan del detalle expandido: 5 -> 6 (por la columna nueva del checkbox)
cambios.append((
'''                        {expandida && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div><span className="text-xs text-muted-foreground uppercase">Numeracion</span><p className="font-medium">{r.numeracion}</p></div>''',
'''                        {expandida && (
                          <tr className="bg-secondary/10 border-b border-border/50">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div><span className="text-xs text-muted-foreground uppercase">Numeracion</span><p className="font-medium">{r.numeracion}</p></div>'''
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
    print("Parte 4 aplicada (2 cambios).")
else:
    sys.exit(1)
