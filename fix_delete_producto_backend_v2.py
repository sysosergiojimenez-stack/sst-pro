import sys

with open('src/server/lib/googleSheets_epp.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

if "export async function deleteProducto" in contenido:
    print("Ya existe deleteProducto, no hace falta agregarla de nuevo.")
    sys.exit(0)

viejo = "  console.log('Producto actualizado en fila:', rowIndex);\n}"

if viejo not in contenido:
    print("ERROR: no encontre el bloque exacto. No se guardo nada.")
    sys.exit(1)

nuevo = """  console.log('Producto actualizado en fila:', rowIndex);
}

export async function deleteProducto(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PRODUCTOS}!A${rowIndex}:F${rowIndex}`,
  });
  console.log('Producto eliminado en fila:', rowIndex);
}"""

contenido = contenido.replace(viejo, nuevo, 1)

with open('src/server/lib/googleSheets_epp.ts', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("Listo! Funcion deleteProducto agregada.")
