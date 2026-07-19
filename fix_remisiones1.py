import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo1 = "  const [showRemisionEdit, setShowRemisionEdit] = useState<Remision | null>(null);"
if viejo1 not in contenido:
    print("ERROR cambio 1: no encontrado")
    sys.exit(1)
nuevo1 = viejo1 + "\n  const [remisionesSeleccionadas, setRemisionesSeleccionadas] = useState<Set<string>>(new Set());"
contenido = contenido.replace(viejo1, nuevo1, 1)

viejo2 = """  const startEditRemision = (remision: Remision) => {
    setShowRemisionEdit(remision);"""
if viejo2 not in contenido:
    print("ERROR cambio 2: no encontrado")
    sys.exit(1)
nuevo2 = """  const startEditRemision = (remision: Remision) => {
    if (showRemisionEdit?.idRegistro === remision.idRegistro) { setShowRemisionEdit(null); return; }
    setShowRemisionDetail(null);
    setShowRemisionEdit(remision);"""
contenido = contenido.replace(viejo2, nuevo2, 1)

viejo3 = """  const handleDeleteRemision = async (remision: Remision) => {
    if (!confirm(`Eliminar remision "${remision.numeracion}"?`)) return;
    try {
      const response = await fetch(`/api/epp/remisiones/${remision.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };"""
if viejo3 not in contenido:
    print("ERROR cambio 3: no encontrado")
    sys.exit(1)
nuevo3 = viejo3 + """

  const toggleSeleccionRemision = (idRegistro: string) => {
    setRemisionesSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(idRegistro)) next.delete(idRegistro); else next.add(idRegistro);
      return next;
    });
  };

  const toggleSeleccionarTodasRemisiones = () => {
    if (remisionesSeleccionadas.size === remisionesFiltradas.length) {
      setRemisionesSeleccionadas(new Set());
    } else {
      setRemisionesSeleccionadas(new Set(remisionesFiltradas.map(r => r.idRegistro)));
    }
  };

  const handleBulkDeleteRemisiones = async () => {
    if (remisionesSeleccionadas.size === 0) return;
    if (!confirm(`Eliminar ${remisionesSeleccionadas.size} remision(es) seleccionada(s)?`)) return;
    try {
      const aEliminar = remisiones.filter(r => remisionesSeleccionadas.has(r.idRegistro));
      await Promise.all(aEliminar.map(r => fetch(`/api/epp/remisiones/${r.rowIndex}`, { method: 'DELETE' })));
      const cantidad = aEliminar.length;
      setRemisionesSeleccionadas(new Set());
      fetchData();
      alert(`${cantidad} remision(es) eliminada(s) correctamente.`);
    } catch (err: any) { alert('Error: ' + err.message); }
  };"""
contenido = contenido.replace(viejo3, nuevo3, 1)

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte 1 aplicada (3 cambios).")
