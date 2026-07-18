import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = "  const [showProductoEdit, setShowProductoEdit] = useState<Producto | null>(null);"
if viejo not in contenido:
    print("ERROR cambio 1: no encontrado")
    sys.exit(1)
nuevo = viejo + "\n  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<string>>(new Set());"
contenido = contenido.replace(viejo, nuevo, 1)

viejo2 = """  const startEditProducto = (producto: Producto) => {
    setShowProductoEdit(producto);"""
if viejo2 not in contenido:
    print("ERROR cambio 2: no encontrado")
    sys.exit(1)
nuevo2 = """  const startEditProducto = (producto: Producto) => {
    if (showProductoEdit?.codigo === producto.codigo) { setShowProductoEdit(null); return; }
    setShowProductoEdit(producto);"""
contenido = contenido.replace(viejo2, nuevo2, 1)

viejo3 = """  const handleDeleteProducto = async (producto: Producto) => {
    if (!confirm(`Eliminar producto "${producto.nombre}"? Esto no borra las entradas/salidas ya registradas con este codigo.`)) return;
    try {
      const response = await fetch(`/api/epp/productos/${producto.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };"""
if viejo3 not in contenido:
    print("ERROR cambio 3: no encontrado")
    sys.exit(1)
nuevo3 = viejo3 + """

  const toggleSeleccionProducto = (codigo: string) => {
    setProductosSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo); else next.add(codigo);
      return next;
    });
  };

  const toggleSeleccionarTodosProductos = () => {
    if (productosSeleccionados.size === productosFiltrados.length) {
      setProductosSeleccionados(new Set());
    } else {
      setProductosSeleccionados(new Set(productosFiltrados.map(p => p.codigo)));
    }
  };

  const handleBulkDeleteProductos = async () => {
    if (productosSeleccionados.size === 0) return;
    if (!confirm(`Eliminar ${productosSeleccionados.size} producto(s) seleccionado(s)? Esto no borra las entradas/salidas ya registradas.`)) return;
    try {
      const aEliminar = productos.filter(p => productosSeleccionados.has(p.codigo));
      await Promise.all(aEliminar.map(p => fetch(`/api/epp/productos/${p.rowIndex}`, { method: 'DELETE' })));
      setProductosSeleccionados(new Set());
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };"""
contenido = contenido.replace(viejo3, nuevo3, 1)

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte 1 aplicada (3 cambios).")
