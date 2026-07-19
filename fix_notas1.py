import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo1 = "  const [showNotaEdit, setShowNotaEdit] = useState<NotaSalida | null>(null);"
if viejo1 not in contenido:
    print("ERROR cambio 1: no encontrado")
    sys.exit(1)
nuevo1 = viejo1 + "\n  const [notasSeleccionadas, setNotasSeleccionadas] = useState<Set<string>>(new Set());"
contenido = contenido.replace(viejo1, nuevo1, 1)

viejo2 = """  const handleDeleteNotaSalida = async (nota: NotaSalida) => {
    if (!confirm(`Eliminar nota de salida "${nota.orden || nota.idRegistro}" y todas sus salidas relacionadas?`)) return;
    try {
      const salidasRelacionadas = salidasByNota(nota.idRegistro);
      for (const salida of salidasRelacionadas) {
        await fetch(`/api/epp/salidas/${salida.rowIndex}`, { method: 'DELETE' });
      }
      await fetch(`/api/epp/notas-salida/${nota.rowIndex}`, { method: 'DELETE' });
      fetchData();
      alert('Nota y salidas relacionadas eliminadas');
    } catch (err: any) { alert('Error: ' + err.message); }"""
if viejo2 not in contenido:
    print("ERROR cambio 2: no encontrado")
    sys.exit(1)
nuevo2 = viejo2 + """
  };

  const toggleSeleccionNota = (idRegistro: string) => {
    setNotasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(idRegistro)) next.delete(idRegistro); else next.add(idRegistro);
      return next;
    });
  };

  const toggleSeleccionarTodasNotas = () => {
    if (notasSeleccionadas.size === notasFiltradas.length) {
      setNotasSeleccionadas(new Set());
    } else {
      setNotasSeleccionadas(new Set(notasFiltradas.map(n => n.idRegistro)));
    }
  };

  const handleBulkDeleteNotas = async () => {
    if (notasSeleccionadas.size === 0) return;
    if (!confirm(`Eliminar ${notasSeleccionadas.size} nota(s) de salida seleccionada(s) y todas sus salidas relacionadas?`)) return;
    try {
      const aEliminar = notasSalida.filter(n => notasSeleccionadas.has(n.idRegistro));
      for (const nota of aEliminar) {
        const salidasRelacionadas = salidasByNota(nota.idRegistro);
        for (const salida of salidasRelacionadas) {
          await fetch(`/api/epp/salidas/${salida.rowIndex}`, { method: 'DELETE' });
        }
        await fetch(`/api/epp/notas-salida/${nota.rowIndex}`, { method: 'DELETE' });
      }
      const cantidad = aEliminar.length;
      setNotasSeleccionadas(new Set());
      fetchData();
      alert(`${cantidad} nota(s) de salida eliminada(s) correctamente.`);
    } catch (err: any) { alert('Error: ' + err.message); }"""
contenido = contenido.replace(viejo2, nuevo2, 1)

# Toggle en startEditNota + cerrar Ver
viejo3 = """  const startEditNota = (nota: NotaSalida) => {
    setShowNotaEdit(nota);"""
if viejo3 not in contenido:
    print("ERROR cambio 3: no encontrado")
    sys.exit(1)
nuevo3 = """  const startEditNota = (nota: NotaSalida) => {
    if (showNotaEdit?.idRegistro === nota.idRegistro) { setShowNotaEdit(null); return; }
    setShowNotaDetail(null);
    setShowNotaEdit(nota);"""
contenido = contenido.replace(viejo3, nuevo3, 1)

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte 1 aplicada (3 cambios).")
