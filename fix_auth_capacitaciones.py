import sys

with open('src/server/lib/googleSheets_capacitaciones.ts', 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = """import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\\\n/g, '\\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth: auth as any });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;"""

nuevo = """import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEETS_KEY_PATH || '/home/syso_sergiojimenez/credentials/service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1n5C0-BBOGVR9JrCTCiwECYecVny8AFlxLFXbwBjMw3Y';"""

if viejo not in contenido:
    print("ERROR: no encontre el bloque exacto. No se modifico nada.")
    print("--- Primeras 15 lineas actuales del archivo, para revisar a mano ---")
    print("\\n".join(contenido.split("\\n")[:15]))
    sys.exit(1)

contenido = contenido.replace(viejo, nuevo, 1)

with open('src/server/lib/googleSheets_capacitaciones.ts', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("Listo! Autenticacion unificada con el resto de la app.")
