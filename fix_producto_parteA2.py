import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()
viejo2 = "  const handleAddRemision = async (e: React.FormEvent) => {"
if viejo2 not in contenido:
    print("ERROR cambio 2: no encontrado")
    sys.exit(1)
funciones = "  const startEditProducto = (producto: Producto) => {\n    setShowProductoEdit(producto);\n    setEditingProductoForm({\n      nombre: producto.nombre,\n      proveedor: producto.proveedor,\n      clasificacion: producto.clasificacion,\n      stockMinimo: producto.stockMinimo,\n    });\n  };\n\n"
funciones += "  const handleEditProducto = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!showProductoEdit) return;\n    try {\n      const response = await fetch(`/api/epp/productos/${showProductoEdit.rowIndex}`, {\n        method: 'PUT', headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(editingProductoForm),\n      });\n      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }\n      setShowProductoEdit(null);\n      setEditingProductoForm({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });\n      fetchData();\n    } catch (err: any) { alert('Error: ' + err.message); }\n  };\n\n"
funciones += "  const handleDeleteProducto = async (producto: Producto) => {\n    if (!confirm(`Eliminar producto \"${producto.nombre}\"? Esto no borra las entradas/salidas ya registradas con este codigo.`)) return;\n    try {\n      const response = await fetch(`/api/epp/productos/${producto.rowIndex}`, { method: 'DELETE' });\n      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }\n      fetchData();\n    } catch (err: any) { alert('Error: ' + err.message); }\n  };\n\n"
nuevo2 = funciones + viejo2
contenido = contenido.replace(viejo2, nuevo2, 1)
with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte A - cambio 2 de 2 aplicado.")
