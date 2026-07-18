import sys

with open('src/server/index.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Agregar deleteProducto al import
cambios.append((
    "  getAllProductos, getProductosByProyecto, getProductoByCodigo, appendProducto, updateProducto,",
    "  getAllProductos, getProductosByProyecto, getProductoByCodigo, appendProducto, updateProducto, deleteProducto,"
))

# 2. Agregar la ruta DELETE justo despues de la ruta PUT de productos
cambios.append((
"""app.put('/api/epp/productos/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await updateProducto(rowIndex, body);
    return c.json({ success: true, message: 'Producto actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/epp/productos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});""",
"""app.put('/api/epp/productos/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await updateProducto(rowIndex, body);
    return c.json({ success: true, message: 'Producto actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/epp/productos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/api/epp/productos/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await deleteProducto(rowIndex);
    return c.json({ success: true, message: 'Producto eliminado' });
  } catch (error: any) {
    console.error('Error DELETE /api/epp/productos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});"""
))

ok = True
for i, (viejo, nuevo) in enumerate(cambios, 1):
    if viejo not in contenido:
        print(f"ERROR en cambio #{i}: no encontre el bloque exacto. No se guardo nada.")
        ok = False
        break
    contenido = contenido.replace(viejo, nuevo, 1)

if ok:
    with open('src/server/index.ts', 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("Listo! Ruta DELETE de productos agregada.")
else:
    sys.exit(1)
