import sys
with open('src/server/lib/googleSheets_epp.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = "    range: `${SHEET_PRODUCTOS}!A2:E`,"
if viejo not in contenido:
    print("ERROR: no encontrado")
    sys.exit(1)
nuevo = "    range: `${SHEET_PRODUCTOS}!A2:F`,"
contenido = contenido.replace(viejo, nuevo, 1)

with open('src/server/lib/googleSheets_epp.ts', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Listo! Rango corregido a A2:F, ahora incluye Stock Minimo.")
