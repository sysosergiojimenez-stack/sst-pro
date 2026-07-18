import sys
with open('src/client/components/EPP.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()
viejo = '''                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p, i) => {'''
nuevo = '''                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p, i) => {'''
if viejo not in contenido:
    print("ERROR: no encontrado")
    sys.exit(1)
contenido = contenido.replace(viejo, nuevo, 1)
with open('src/client/components/EPP.tsx', 'w', encoding='utf-8') as f:
    f.write(contenido)
print("Parte B1 aplicada.")
