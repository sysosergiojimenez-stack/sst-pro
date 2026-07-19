import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

inicio_marca = "      {/* Modal Editar Remision */}"
fin_marca = "      {/* Modal Procesar Factura con IA */}"

idx_inicio = contenido.find(inicio_marca)
idx_fin = contenido.find(fin_marca)

if idx_inicio == -1 or idx_fin == -1 or idx_fin < idx_inicio:
    print("ERROR: no encontre los marcadores. No se modifico nada.")
    sys.exit(1)

contenido = contenido[:idx_inicio] + contenido[idx_fin:]

with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("Listo! Modal viejo de Remision eliminado. Remisiones completas.")
