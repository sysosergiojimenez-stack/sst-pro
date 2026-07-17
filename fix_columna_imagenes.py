import sys

with open('src/server/lib/googleSheets_capacitaciones.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

cambios.append((
"""  evidenciaPDF: string;
  temasTratados: string;
}""",
"""  evidenciaPDF: string;
  temasTratados: string;
  imagenesAsistencia: string;
}"""
))

cambios.append((
    "    evidenciaPDF: row[14] || '',\n    temasTratados: row[15] || '',\n  };",
    "    evidenciaPDF: row[14] || '',\n    temasTratados: row[15] || '',\n    imagenesAsistencia: row[16] || '',\n  };"
))

cambios.append((
    "range: `${SHEET_CAPACITACIONES}!A2:P`,",
    "range: `${SHEET_CAPACITACIONES}!A2:Q`,"
))

cambios.append((
"""    range: `${SHEET_CAPACITACIONES}!A1:P1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      cap.idRegistro, cap.fechaHora, cap.userEmail,
      cap.proyecto, cap.titulo, cap.fechaProgramada,
      cap.hora, cap.lugar, cap.responsable,
      cap.tipo, cap.estado, cap.fechaRealizada,
      cap.asistentes, cap.observaciones, cap.evidenciaPDF,
      cap.temasTratados
    ]] },""",
"""    range: `${SHEET_CAPACITACIONES}!A1:Q1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[
      cap.idRegistro, cap.fechaHora, cap.userEmail,
      cap.proyecto, cap.titulo, cap.fechaProgramada,
      cap.hora, cap.lugar, cap.responsable,
      cap.tipo, cap.estado, cap.fechaRealizada,
      cap.asistentes, cap.observaciones, cap.evidenciaPDF,
      cap.temasTratados, cap.imagenesAsistencia
    ]] },"""
))

cambios.append((
    "    'O': cap.evidenciaPDF || '',\n    'P': cap.temasTratados || '',\n  };",
    "    'O': cap.evidenciaPDF || '',\n    'P': cap.temasTratados || '',\n    'Q': cap.imagenesAsistencia || '',\n  };"
))

cambios.append((
    "range: `${SHEET_CAPACITACIONES}!A${rowIndex}:P${rowIndex}`,",
    "range: `${SHEET_CAPACITACIONES}!A${rowIndex}:Q${rowIndex}`,"
))

ok = True
for i, (viejo, nuevo) in enumerate(cambios, 1):
    if viejo not in contenido:
        print(f"ERROR en cambio #{i}: no encontre el bloque exacto. No se guardo nada.")
        ok = False
        break
    contenido = contenido.replace(viejo, nuevo, 1)

if ok:
    with open('src/server/lib/googleSheets_capacitaciones.ts', 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("Listo! Columna imagenesAsistencia agregada (6 cambios).")
else:
    sys.exit(1)
