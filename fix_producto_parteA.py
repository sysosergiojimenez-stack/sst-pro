import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()
viejo1 = "  const [salidaForm, setSalidaForm] = useState({ refItem: '', cantidad: '', trabajadorRetira: '' });"
nuevo1 = viejo1 + "\n  const [showProductoEdit, setShowProductoEdit] = useState<Producto | null>(null);\n  const [editingProductoForm, setEditingProductoForm] = useState({ nombre: '', proveedor: '', clasificacion: '', stockMinimo: '0' });"
if viejo1 not in contenido:
    print("ERROR cambio 1: no encontrado")
    sys.exit(1)
contenido = contenido.replace(viejo1, nuevo1, 1)
with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte A - cambio 1 de 2 aplicado.")
