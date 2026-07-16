import sys

with open('src/server/lib/googleSheets_capacitaciones.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = "const sheets = google.sheets({ version: 'v4', auth });"
nuevo = "const sheets = google.sheets({ version: 'v4', auth: auth as any });"

if viejo not in contenido:
    print("ERROR: no encontre la linea exacta. No se modifico nada.")
    sys.exit(1)

contenido = contenido.replace(viejo, nuevo, 1)

with open('src/server/lib/googleSheets_capacitaciones.ts', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("Listo! Se corrigio el tipo en googleSheets_capacitaciones.ts")
