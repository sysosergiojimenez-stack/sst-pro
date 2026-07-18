import sys

with open('src/server/lib/googleSheets_epp.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = """  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Producto actualizado en fila:', rowIndex);
}
export async function updateRemision("""

nuevo = """  if (updates.length === 0) return;
  await Promise.all(updates);
  console.log('Producto actualizado en fila:', rowIndex);
}

export async function deleteProducto(rowIndex: number): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PRODUCTOS}!A${rowIndex}:F${rowIndex}`,
  });
  console.log('Producto eliminado en fila:', rowIndex);
}

export async function updateRemision("""

if viejo not in contenido:
    print("ERROR: no encontre el bloque exacto. No se guardo nada.")
    sys.exit(1)

contenido = contenido.replace(viejo, nuevo, 1)

with open('src/server/lib/googleSheets_epp.ts', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("Listo! Funcion deleteProducto agregada.")
