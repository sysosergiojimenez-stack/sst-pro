import { useState, useEffect, useRef, Fragment } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Users, Plus, Pencil, Trash2, X, Save, FileText, Brain, Filter, Search, UserCheck, UserX, Fingerprint, Upload, FileDown, ChevronDown, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { drawPdfHeader, fetchLogoData, computeLogoSize } from '../lib/pdfHeader';

type GeminiItem = {
  id: string;
  file: File;
  status: 'pendiente' | 'procesando' | 'ok' | 'error';
  datosExtraidos: any;
  error: string;
};

const MAX_ARCHIVOS_GEMINI = 10;
const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024;
const CONCURRENCIA_GEMINI = 3;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

interface Proyecto {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
}

interface Empleado {
  rowIndex: number;
  nroDocumento: string;
  fechaHora?: string;
  userEmail?: string;
  obra: string;
  tipoDocumento?: string;
  nombres: string;
  apellidos: string;
  ciudadNacimiento?: string;
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  nombrePadre?: string;
  ocupacionPadre?: string;
  nombreMadre?: string;
  ocupacionMadre?: string;
  nombreConyuge?: string;
  ocupacionConyuge?: string;
  fechaNacConyuge?: string;
  direccion?: string;
  nro?: string;
  dpto?: string;
  piso?: string;
  barrio?: string;
  ciudad?: string;
  departamentoTerritorial?: string;
  puntoReferencia?: string;
  telefonoCelular: string;
  telefonoEmergencia?: string;
  email: string;
  gradoInstruccion?: string;
  instruccionConcluida?: string;
  carreraUniversitaria?: string;
  tipoSangre?: string;
  hijo1?: string;
  fechaNacHijo1?: string;
  hijo2?: string;
  fechaNacHijo2?: string;
  hijo3?: string;
  fechaNacHijo3?: string;
  hijo4?: string;
  fechaNacHijo4?: string;
  hijo5?: string;
  fechaNacHijo5?: string;
  empresa: string;
  cargo: string;
  unidad?: string;
  honorarios?: string;
  moneda?: string;
  regimen?: string;
  actividades?: string;
  fechaInicioContrato?: string;
  fechaTerminoContrato?: string;
  calce?: string;
  scanDocumentos?: string;
  ultimaDeclaracionIPS?: string;
  ipsDocumentoUrl?: string;
  estado?: string;
}

interface EmpleadosPorProyectoProps {
  proyecto: Proyecto;
}

type EmpleadoFormData = {
  nroDocumento: string;
  tipoDocumento: string;
  nombres: string;
  apellidos: string;
  ciudadNacimiento: string;
  fechaNacimiento: string;
  sexo: string;
  estadoCivil: string;
  nombrePadre: string;
  ocupacionPadre: string;
  nombreMadre: string;
  ocupacionMadre: string;
  nombreConyuge: string;
  ocupacionConyuge: string;
  fechaNacConyuge: string;
  direccion: string;
  nro: string;
  dpto: string;
  piso: string;
  barrio: string;
  ciudad: string;
  departamentoTerritorial: string;
  puntoReferencia: string;
  telefonoCelular: string;
  telefonoEmergencia: string;
  email: string;
  gradoInstruccion: string;
  instruccionConcluida: string;
  carreraUniversitaria: string;
  tipoSangre: string;
  hijo1: string;
  fechaNacHijo1: string;
  hijo2: string;
  fechaNacHijo2: string;
  hijo3: string;
  fechaNacHijo3: string;
  hijo4: string;
  fechaNacHijo4: string;
  hijo5: string;
  fechaNacHijo5: string;
  empresa: string;
  cargo: string;
  unidad: string;
  honorarios: string;
  moneda: string;
  regimen: string;
  actividades: string;
  fechaInicioContrato: string;
  fechaTerminoContrato: string;
  calce: string;
};

const emptyForm: EmpleadoFormData = {
  nroDocumento: '',
  tipoDocumento: '',
  nombres: '',
  apellidos: '',
  ciudadNacimiento: '',
  fechaNacimiento: '',
  sexo: '',
  estadoCivil: '',
  nombrePadre: '',
  ocupacionPadre: '',
  nombreMadre: '',
  ocupacionMadre: '',
  nombreConyuge: '',
  ocupacionConyuge: '',
  fechaNacConyuge: '',
  direccion: '',
  nro: '',
  dpto: '',
  piso: '',
  barrio: '',
  ciudad: '',
  departamentoTerritorial: '',
  puntoReferencia: '',
  telefonoCelular: '',
  telefonoEmergencia: '',
  email: '',
  gradoInstruccion: '',
  instruccionConcluida: '',
  carreraUniversitaria: '',
  tipoSangre: '',
  hijo1: '',
  fechaNacHijo1: '',
  hijo2: '',
  fechaNacHijo2: '',
  hijo3: '',
  fechaNacHijo3: '',
  hijo4: '',
  fechaNacHijo4: '',
  hijo5: '',
  fechaNacHijo5: '',
  empresa: '',
  cargo: '',
  unidad: '',
  honorarios: '',
  moneda: '',
  regimen: '',
  actividades: '',
  fechaInicioContrato: '',
  fechaTerminoContrato: '',
  calce: '',
};

function empleadoToForm(emp: Empleado): EmpleadoFormData {
  return {
    nroDocumento: emp.nroDocumento || '',
    tipoDocumento: emp.tipoDocumento || '',
    nombres: emp.nombres || '',
    apellidos: emp.apellidos || '',
    ciudadNacimiento: emp.ciudadNacimiento || '',
    fechaNacimiento: emp.fechaNacimiento || '',
    sexo: emp.sexo || '',
    estadoCivil: emp.estadoCivil || '',
    nombrePadre: emp.nombrePadre || '',
    ocupacionPadre: emp.ocupacionPadre || '',
    nombreMadre: emp.nombreMadre || '',
    ocupacionMadre: emp.ocupacionMadre || '',
    nombreConyuge: emp.nombreConyuge || '',
    ocupacionConyuge: emp.ocupacionConyuge || '',
    fechaNacConyuge: emp.fechaNacConyuge || '',
    direccion: emp.direccion || '',
    nro: emp.nro || '',
    dpto: emp.dpto || '',
    piso: emp.piso || '',
    barrio: emp.barrio || '',
    ciudad: emp.ciudad || '',
    departamentoTerritorial: emp.departamentoTerritorial || '',
    puntoReferencia: emp.puntoReferencia || '',
    telefonoCelular: emp.telefonoCelular || '',
    telefonoEmergencia: emp.telefonoEmergencia || '',
    email: emp.email || '',
    gradoInstruccion: emp.gradoInstruccion || '',
    instruccionConcluida: emp.instruccionConcluida || '',
    carreraUniversitaria: emp.carreraUniversitaria || '',
    tipoSangre: emp.tipoSangre || '',
    hijo1: emp.hijo1 || '',
    fechaNacHijo1: emp.fechaNacHijo1 || '',
    hijo2: emp.hijo2 || '',
    fechaNacHijo2: emp.fechaNacHijo2 || '',
    hijo3: emp.hijo3 || '',
    fechaNacHijo3: emp.fechaNacHijo3 || '',
    hijo4: emp.hijo4 || '',
    fechaNacHijo4: emp.fechaNacHijo4 || '',
    hijo5: emp.hijo5 || '',
    fechaNacHijo5: emp.fechaNacHijo5 || '',
    empresa: emp.empresa || '',
    cargo: emp.cargo || '',
    unidad: emp.unidad || '',
    honorarios: emp.honorarios || '',
    moneda: emp.moneda || '',
    regimen: emp.regimen || '',
    actividades: emp.actividades || '',
    fechaInicioContrato: emp.fechaInicioContrato || '',
    fechaTerminoContrato: emp.fechaTerminoContrato || '',
    calce: emp.calce || '',
  };
}

interface FormularioEmpleadoProps {
  form: EmpleadoFormData;
  setForm: React.Dispatch<React.SetStateAction<EmpleadoFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  inline?: boolean;
  disabledNroDocumento?: boolean;
  onCancel?: () => void;
  isEditing?: boolean;
  pdfFile?: File | null;
  onPdfFileChange?: (file: File | null) => void;
  isUploadingPdf?: boolean;
}

function FormularioEmpleado({ form, setForm, handleSubmit, inline = false, disabledNroDocumento = false, onCancel, isEditing = false, pdfFile, onPdfFileChange, isUploadingPdf = false }: FormularioEmpleadoProps) {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${inline ? '' : 'max-h-[75vh] overflow-y-auto pr-1'}`}>
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos principales</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nro. Documento *</label><input type="text" value={form.nroDocumento} onChange={(e) => setForm({...form, nroDocumento: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required disabled={disabledNroDocumento} /></div>
          <div><label className="block text-sm font-medium mb-1">Tipo Documento</label><input type="text" value={form.tipoDocumento} onChange={(e) => setForm({...form, tipoDocumento: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Nombres *</label><input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
          <div><label className="block text-sm font-medium mb-1">Apellidos *</label><input type="text" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" required /></div>
          <div><label className="block text-sm font-medium mb-1">Fecha Nacimiento</label><input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({...form, fechaNacimiento: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Ciudad Nacimiento</label><input type="text" value={form.ciudadNacimiento} onChange={(e) => setForm({...form, ciudadNacimiento: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Sexo</label><select value={form.sexo} onChange={(e) => setForm({...form, sexo: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"><option value=""></option><option value="M">M</option><option value="F">F</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Estado Civil</label><input type="text" value={form.estadoCivil} onChange={(e) => setForm({...form, estadoCivil: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Tipo Sangre</label><input type="text" value={form.tipoSangre} onChange={(e) => setForm({...form, tipoSangre: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Familia</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nombre Padre</label><input type="text" value={form.nombrePadre} onChange={(e) => setForm({...form, nombrePadre: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Ocupación Padre</label><input type="text" value={form.ocupacionPadre} onChange={(e) => setForm({...form, ocupacionPadre: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Nombre Madre</label><input type="text" value={form.nombreMadre} onChange={(e) => setForm({...form, nombreMadre: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Ocupación Madre</label><input type="text" value={form.ocupacionMadre} onChange={(e) => setForm({...form, ocupacionMadre: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Nombre Cónyuge</label><input type="text" value={form.nombreConyuge} onChange={(e) => setForm({...form, nombreConyuge: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Ocupación Cónyuge</label><input type="text" value={form.ocupacionConyuge} onChange={(e) => setForm({...form, ocupacionConyuge: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Fecha Nac. Cónyuge</label><input type="date" value={form.fechaNacConyuge} onChange={(e) => setForm({...form, fechaNacConyuge: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Domicilio</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Dirección</label><input type="text" value={form.direccion} onChange={(e) => setForm({...form, direccion: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Nro</label><input type="text" value={form.nro} onChange={(e) => setForm({...form, nro: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Dpto</label><input type="text" value={form.dpto} onChange={(e) => setForm({...form, dpto: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Piso</label><input type="text" value={form.piso} onChange={(e) => setForm({...form, piso: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Barrio</label><input type="text" value={form.barrio} onChange={(e) => setForm({...form, barrio: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Ciudad</label><input type="text" value={form.ciudad} onChange={(e) => setForm({...form, ciudad: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Departamento Territorial</label><input type="text" value={form.departamentoTerritorial} onChange={(e) => setForm({...form, departamentoTerritorial: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Punto Referencia</label><input type="text" value={form.puntoReferencia} onChange={(e) => setForm({...form, puntoReferencia: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contacto</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Teléfono Celular</label><input type="text" value={form.telefonoCelular} onChange={(e) => setForm({...form, telefonoCelular: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Teléfono Emergencia</label><input type="text" value={form.telefonoEmergencia} onChange={(e) => setForm({...form, telefonoEmergencia: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Formación</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Grado Instrucción</label><input type="text" value={form.gradoInstruccion} onChange={(e) => setForm({...form, gradoInstruccion: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Instrucción Concluida</label><input type="text" value={form.instruccionConcluida} onChange={(e) => setForm({...form, instruccionConcluida: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Carrera Universitaria</label><input type="text" value={form.carreraUniversitaria} onChange={(e) => setForm({...form, carreraUniversitaria: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Hijos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="grid grid-cols-2 gap-2 sm:col-span-2">
              <div><label className="block text-sm font-medium mb-1">Hijo {n}</label><input type="text" value={(form as any)[`hijo${n}`]} onChange={(e) => setForm({...form, [`hijo${n}`]: e.target.value} as any)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Fecha Nac. Hijo {n}</label><input type="date" value={(form as any)[`fechaNacHijo${n}`]} onChange={(e) => setForm({...form, [`fechaNacHijo${n}`]: e.target.value} as any)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Laboral</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Empresa</label><input type="text" value={form.empresa} onChange={(e) => setForm({...form, empresa: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Cargo</label><input type="text" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Unidad</label><input type="text" value={form.unidad} onChange={(e) => setForm({...form, unidad: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Honorarios</label><input type="text" value={form.honorarios} onChange={(e) => setForm({...form, honorarios: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Moneda</label><input type="text" value={form.moneda} onChange={(e) => setForm({...form, moneda: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Régimen</label><input type="text" value={form.regimen} onChange={(e) => setForm({...form, regimen: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Actividades</label><textarea value={form.actividades} onChange={(e) => setForm({...form, actividades: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" rows={2} /></div>
          <div><label className="block text-sm font-medium mb-1">Fecha Inicio Contrato</label><input type="date" value={form.fechaInicioContrato} onChange={(e) => setForm({...form, fechaInicioContrato: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Fecha Término Contrato</label><input type="date" value={form.fechaTerminoContrato} onChange={(e) => setForm({...form, fechaTerminoContrato: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Calce</label><input type="text" value={form.calce} onChange={(e) => setForm({...form, calce: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
      </div>

      {!isEditing && onPdfFileChange && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Documento adjunto</h4>
          <input type="file" ref={pdfInputRef} accept=".pdf,application/pdf" onChange={(e) => onPdfFileChange(e.target.files?.[0] || null)} className="hidden" />
          {!pdfFile ? (
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 text-sm text-muted-foreground hover:bg-secondary/30 transition-colors"
            >
              <FileText size={18} />
              Click para adjuntar PDF (opcional)
            </button>
          ) : (
            <div className="flex items-center justify-between bg-secondary p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-primary" />
                <div className="text-left">
                  <div className="text-sm font-medium">{pdfFile.name}</div>
                  <div className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button type="button" onClick={() => { onPdfFileChange(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }} className="text-muted-foreground hover:text-red-400 transition-colors">
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={isUploadingPdf} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
          <Save size={18} /> {isUploadingPdf ? 'Subiendo PDF...' : isEditing ? 'Guardar Cambios' : 'Crear Empleado'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80">Cancelar</button>
        )}
      </div>
    </form>
  );
}

export default function EmpleadosPorProyecto({ proyecto }: EmpleadosPorProyectoProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGeminiForm, setShowGeminiForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [filaExpandida, setFilaExpandida] = useState<Empleado | null>(null);
  const [form, setForm] = useState<EmpleadoFormData>(emptyForm);
  const [geminiItems, setGeminiItems] = useState<GeminiItem[]>([]);
  const [geminiProcessing, setGeminiProcessing] = useState(false);
  const [geminiError, setGeminiError] = useState('');
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [manualPdfFile, setManualPdfFile] = useState<File | null>(null);
  const [isUploadingManualPdf, setIsUploadingManualPdf] = useState(false);
  const [showPdfFilters, setShowPdfFilters] = useState(false);
  const [pdfFilters, setPdfFilters] = useState({ empresa: '', estado: '', cargo: '' });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBiometricoMenu, setShowBiometricoMenu] = useState(false);
  const [showIPSForm, setShowIPSForm] = useState(false);
  const [ipsPdfFile, setIpsPdfFile] = useState<File | null>(null);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [editingFecha, setEditingFecha] = useState<{ rowIndex: number | null; value: string }>({ rowIndex: null, value: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchData(); }, [proyecto.denominacion]);

  useEffect(() => {
    let filtrados = [...empleados];
    
    // Filter by empresa
    if (empresaFiltro) {
      filtrados = filtrados.filter(e => (e.empresa || '').trim().toLowerCase() === empresaFiltro.trim().toLowerCase());
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(e => 
        e.nombres.toLowerCase().includes(term) ||
        e.apellidos.toLowerCase().includes(term) ||
        e.nroDocumento.toLowerCase().includes(term) ||
        e.cargo.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term)
      );
    }
    
    setEmpleadosFiltrados(filtrados);
  }, [empresaFiltro, searchTerm, empleados]);

  // Cerrar menús desplegables al hacer click fuera
  useEffect(() => {
    if (!showAddMenu && !showBiometricoMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showAddMenu && !target.closest('[data-add-menu]')) {
        setShowAddMenu(false);
      }
      if (showBiometricoMenu && !target.closest('[data-biometrico-menu]')) {
        setShowBiometricoMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu, showBiometricoMenu]);

  const [marcaciones, setMarcaciones] = useState<Array<{ nroDocumento: string; fecha: string; horaEntrada: string; horaSalida: string }>>([]);
  const [importandoMarcaciones, setImportandoMarcaciones] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/empleados?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
      const data = await response.json();
      if (data.success) {
        setEmpleados(data.data);
        const uniqueEmpresas = [...new Set(data.data.map((e: Empleado) => e.empresa).filter(Boolean))];
        setEmpresas(uniqueEmpresas);
      }
      const respMarc = await apiFetch(`/api/marcaciones-biometricas?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
      const dataMarc = await respMarc.json();
      if (dataMarc.success) setMarcaciones(dataMarc.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const parseFechaDDMYYYY = (fechaStr: string): string => {
    const partes = fechaStr.trim().split('/');
    if (partes.length !== 3) return '';
    const [d, m, y] = partes;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const handleImportarMarcaciones = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportandoMarcaciones(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas: any[][] = XLSX.utils.sheet_to_json(hoja, { header: 1 });

      const registros: Array<{ nroDocumento: string; fecha: string; horaEntrada: string; horaSalida: string; horasRaw: string }> = [];
      for (let i = 1; i < filas.length; i++) {
        const fila = filas[i];
        if (!fila || fila.length < 5) continue;
        const nroDocumento = String(fila[0] || '').trim();
        const fechaRaw = String(fila[3] || '').trim();
        const horasRaw = String(fila[4] || '').trim();
        if (!nroDocumento || !fechaRaw || !horasRaw) continue;

        const fecha = parseFechaDDMYYYY(fechaRaw);
        if (!fecha) continue;

        const horas = horasRaw.split(/\s+/).filter(Boolean);
        const horaEntrada = horas[0] || '';
        const horaSalida = horas.length > 1 ? horas[horas.length - 1] : '';

        registros.push({ nroDocumento, fecha, horaEntrada, horaSalida, horasRaw, proyecto: proyecto.denominacion });
      }

      if (registros.length === 0) {
        alert('No se encontraron marcaciones validas en el archivo.');
        return;
      }

      const resp = await apiFetch('/api/marcaciones-biometricas/importar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registros }),
      });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Error'); }
      const resultado = await resp.json();
      alert(`Importacion completa: ${resultado.nuevos} registros nuevos, ${resultado.actualizados} actualizados.`);
      fetchData();
    } catch (err: any) {
      alert('Error al importar: ' + err.message);
    } finally {
      setImportandoMarcaciones(false);
      e.target.value = '';
    }
  };

  const [showControlHoras, setShowControlHoras] = useState(false);
  const [trabajadorHoras, setTrabajadorHoras] = useState('');
  const [fechaDesdeHoras, setFechaDesdeHoras] = useState('');
  const [fechaHastaHoras, setFechaHastaHoras] = useState('');
  type FilaControlHoras = {
    fechaISO: string;
    fechaMostrar: string;
    nombreDia: string;
    horaEntrada: string;
    horaSalida: string;
    horasTrabajadas: number;
    horasExtras: number;
    horasAusentes: number;
    estado: string;
    rowIndex?: number;
    modificado: boolean;
  };
  const [filasControlHoras, setFilasControlHoras] = useState<FilaControlHoras[]>([]);
  const [guardandoHoras, setGuardandoHoras] = useState(false);
  const FERIADOS_KEY = 'sstpro_feriados';
  const [feriados, setFeriados] = useState<string[]>(() => {
    try {
      const g = localStorage.getItem(FERIADOS_KEY);
      return g ? JSON.parse(g) : [];
    } catch { return []; }
  });
  const [nuevoFeriado, setNuevoFeriado] = useState('');
  const agregarFeriado = () => {
    if (!nuevoFeriado || feriados.includes(nuevoFeriado)) return;
    const actualizados = [...feriados, nuevoFeriado].sort();
    setFeriados(actualizados);
    localStorage.setItem(FERIADOS_KEY, JSON.stringify(actualizados));
    setNuevoFeriado('');
  };
  const quitarFeriado = (fecha: string) => {
    const actualizados = feriados.filter(f => f !== fecha);
    setFeriados(actualizados);
    localStorage.setItem(FERIADOS_KEY, JSON.stringify(actualizados));
  };
  const calcularHoras = (entrada: string, salida: string): number => {
    if (!entrada || !salida) return 0;
    const [he, me] = entrada.split(':').map(Number);
    const [hs, ms] = salida.split(':').map(Number);
    if (isNaN(he) || isNaN(me) || isNaN(hs) || isNaN(ms)) return 0;
    let minutos = (hs * 60 + ms) - (he * 60 + me);
    if (minutos < 0) minutos += 24 * 60;
    return minutos / 60;
  };
  const TOLERANCIA_MIN = 10;
  const aMinutos = (hhmm: string): number | null => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  const calcularFilaControlHoras = (fila: Partial<FilaControlHoras>, fechaISO: string, diaSemana: number, esFeriado: boolean): FilaControlHoras => {
    const horaEntrada = fila.horaEntrada || '';
    const horaSalida = fila.horaSalida || '';
    const horaFinEsperada = diaSemana === 1 ? '18:00' : '17:30';
    const inicioMin = aMinutos('07:00')!;
    const finMin = aMinutos(horaFinEsperada)!;
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
    const esNoLaborable = esFinDeSemana || esFeriado;
    let horasTrabajadas = 0;
    let horasExtras = 0;
    let horasAusentes = 0;
    let estado = '';
    if (esNoLaborable) {
      if (horaEntrada && horaSalida) {
        const eMin = aMinutos(horaEntrada);
        const sMin = aMinutos(horaSalida);
        if (eMin !== null && sMin !== null) {
          let mins = sMin - eMin;
          if (mins < 0) mins += 24 * 60;
          horasExtras = mins / 60;
          estado = esFeriado ? 'Trabajado - Feriado (Extra)' : 'Trabajado - Fin de semana (Extra)';
        }
      } else {
        estado = esFeriado ? 'Feriado' : 'Fin de semana';
      }
    } else {
      if (!horaEntrada || !horaSalida) {
        horasAusentes = (finMin - inicioMin) / 60;
        estado = !horaEntrada && !horaSalida ? 'Ausente (sin marcacion)' : 'Ausente (falta entrada o salida)';
      } else {
        const eMin = aMinutos(horaEntrada)!;
        const sMin = aMinutos(horaSalida)!;
        const retrasoMin = Math.max(0, eMin - inicioMin);
        const salidaTempranaMin = Math.max(0, finMin - sMin);
        const extraAntesMin = Math.max(0, inicioMin - eMin - TOLERANCIA_MIN);
        const extraDespuesMin = Math.max(0, sMin - finMin - TOLERANCIA_MIN);
        const ausenteMin = (retrasoMin > TOLERANCIA_MIN ? retrasoMin : 0) + (salidaTempranaMin > TOLERANCIA_MIN ? salidaTempranaMin : 0);
        const extraMin = extraAntesMin + extraDespuesMin;
        const trabajadasMin = Math.max(0, Math.min(sMin, finMin) - Math.max(eMin, inicioMin));
        horasTrabajadas = trabajadasMin / 60;
        horasExtras = extraMin / 60;
        horasAusentes = ausenteMin / 60;
        estado = ausenteMin > 0 ? 'Presente con observaciones' : 'Presente';
      }
    }
    return {
      fechaISO,
      fechaMostrar: fila.fechaMostrar || new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-ES'),
      nombreDia: fila.nombreDia || new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' }),
      horaEntrada,
      horaSalida,
      horasTrabajadas,
      horasExtras,
      horasAusentes,
      estado,
      rowIndex: fila.rowIndex,
      modificado: fila.modificado || false,
    };
  };

  const generarVistaPreviaHoras = () => {
    if (!trabajadorHoras || !fechaDesdeHoras || !fechaHastaHoras) {
      alert('Selecciona un trabajador y el rango de fechas.');
      return;
    }
    if (fechaDesdeHoras > fechaHastaHoras) {
      alert('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    const mapaMarcaciones = new Map(marcaciones.filter(m => m.nroDocumento === trabajadorHoras).map((m: any) => [m.fecha, m]));
    const nuevasFilas: FilaControlHoras[] = [];
    const inicio = new Date(fechaDesdeHoras + 'T00:00:00');
    const fin = new Date(fechaHastaHoras + 'T00:00:00');
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const fechaISO = d.toISOString().split('T')[0];
      const diaSemana = d.getDay();
      const fechaMostrar = d.toLocaleDateString('es-ES');
      const nombreDia = d.toLocaleDateString('es-ES', { weekday: 'long' });
      const m: any = mapaMarcaciones.get(fechaISO);
      const esFeriado = feriados.includes(fechaISO);
      nuevasFilas.push(calcularFilaControlHoras({
        fechaMostrar,
        nombreDia,
        horaEntrada: m?.horaEntrada || '',
        horaSalida: m?.horaSalida || '',
        rowIndex: m?.rowIndex,
      }, fechaISO, diaSemana, esFeriado));
    }
    setFilasControlHoras(nuevasFilas);
  };

  const handleEditarHora = (index: number, campo: 'horaEntrada' | 'horaSalida', valor: string) => {
    setFilasControlHoras(prev => {
      const fila = prev[index];
      if (!fila) return prev;
      const nuevaFila = calcularFilaControlHoras(
        { ...fila, [campo]: valor, modificado: true },
        fila.fechaISO,
        new Date(fila.fechaISO + 'T00:00:00').getDay(),
        feriados.includes(fila.fechaISO)
      );
      const nuevas = [...prev];
      nuevas[index] = nuevaFila;
      return nuevas;
    });
  };

  const guardarCambiosHoras = async () => {
    const filasModificadas = filasControlHoras.filter(f => f.modificado && f.rowIndex);
    if (filasModificadas.length === 0) {
      alert('No hay cambios para guardar.');
      return;
    }
    setGuardandoHoras(true);
    try {
      for (const fila of filasModificadas) {
        await apiFetch(`/api/marcaciones-biometricas/${fila.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            horaEntrada: fila.horaEntrada,
            horaSalida: fila.horaSalida,
            horasRaw: `${fila.horaEntrada} ${fila.horaSalida}`.trim(),
          }),
        });
      }
      await fetchData();
      alert('Cambios guardados correctamente.');
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setGuardandoHoras(false);
    }
  };

  const exportarExcelHoras = () => {
    const emp = empleados.find(e => e.nroDocumento === trabajadorHoras);
    if (!emp) return;
    let totalTrabajadas = 0;
    let totalExtras = 0;
    let totalAusentes = 0;
    let diasConMarcacion = 0;
    let diasAusente = 0;
    const filas = filasControlHoras.map(f => {
      totalTrabajadas += f.horasTrabajadas;
      totalExtras += f.horasExtras;
      totalAusentes += f.horasAusentes;
      if (f.horaEntrada && f.horaSalida && !f.estado.includes('Ausente')) diasConMarcacion++;
      if (f.estado.includes('Ausente')) diasAusente++;
      return {
        Fecha: f.fechaMostrar,
        Dia: f.nombreDia,
        'Hora Entrada': f.horaEntrada || '-',
        'Hora Salida': f.horaSalida || '-',
        'Horas Trabajadas': f.horasTrabajadas > 0 ? f.horasTrabajadas.toFixed(2) : '-',
        'Horas Extras': f.horasExtras > 0 ? f.horasExtras.toFixed(2) : '-',
        'Horas Ausentes': f.horasAusentes > 0 ? f.horasAusentes.toFixed(2) : '-',
        Estado: f.estado,
      };
    });
    filas.push({ Fecha: '', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total dias con marcacion', Dia: diasConMarcacion, 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total dias ausente', Dia: diasAusente, 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total Horas Trabajadas', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': totalTrabajadas.toFixed(2), 'Horas Extras': '', 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total Horas Extras', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': totalExtras.toFixed(2), 'Horas Ausentes': '', Estado: '' });
    filas.push({ Fecha: 'Total Horas Ausentes', Dia: '', 'Hora Entrada': '', 'Hora Salida': '', 'Horas Trabajadas': '', 'Horas Extras': '', 'Horas Ausentes': totalAusentes.toFixed(2), Estado: '' });
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Control de Horas');
    XLSX.writeFile(libro, `Control_Horas_${emp.nombres}_${emp.apellidos}_${fechaDesdeHoras}_a_${fechaHastaHoras}.xlsx`);
  };

  const exportarPDFHoras = async () => {
    const emp = empleados.find(e => e.nroDocumento === trabajadorHoras);
    if (!emp) return;
    let totalTrabajadas = 0;
    let totalExtras = 0;
    let totalAusentes = 0;
    let diasConMarcacion = 0;
    let diasAusente = 0;
    const body = filasControlHoras.map(f => {
      totalTrabajadas += f.horasTrabajadas;
      totalExtras += f.horasExtras;
      totalAusentes += f.horasAusentes;
      if (f.horaEntrada && f.horaSalida && !f.estado.includes('Ausente')) diasConMarcacion++;
      if (f.estado.includes('Ausente')) diasAusente++;
      return [
        f.fechaMostrar,
        f.nombreDia.charAt(0).toUpperCase() + f.nombreDia.slice(1),
        f.horaEntrada || '-',
        f.horaSalida || '-',
        f.horasTrabajadas > 0 ? f.horasTrabajadas.toFixed(2) : '-',
        f.horasExtras > 0 ? f.horasExtras.toFixed(2) : '-',
        f.horasAusentes > 0 ? f.horasAusentes.toFixed(2) : '-',
        f.estado,
      ];
    });

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const m = 10;
    let y = 12;
    const logo = await fetchLogoData(proyecto.logo);
    if (logo) {
      const { width, height } = computeLogoSize(doc, logo, 10, 36);
      doc.addImage(logo.dataUrl, logo.format, m, y - 8, width, height);
    }
    doc.setFontSize(13);
    doc.text('Control de Horas', pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(8);
    const periodo = `${new Date(fechaDesdeHoras + 'T00:00:00').toLocaleDateString('es-ES')} al ${new Date(fechaHastaHoras + 'T00:00:00').toLocaleDateString('es-ES')}`;
    doc.text(`${proyecto.denominacion}  |  ${emp.nombres} ${emp.apellidos} (${emp.nroDocumento})  |  ${periodo}`, pageW / 2, y, { align: 'center' });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Día', 'Ent.', 'Sal.', 'Trab.', 'Extras', 'Ausent.', 'Estado']],
      body,
      styles: { fontSize: 7.5, cellPadding: 1, lineColor: [200, 200, 200], lineWidth: 0.15 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', minCellHeight: 5 },
      bodyStyles: { minCellHeight: 4.5 },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 13, halign: 'center' },
        3: { cellWidth: 13, halign: 'center' },
        4: { cellWidth: 13, halign: 'right' },
        5: { cellWidth: 13, halign: 'right' },
        6: { cellWidth: 13, halign: 'right' },
        7: { cellWidth: 'auto' },
      },
      margin: { left: m, right: m, bottom: 8 },
      pageBreak: 'avoid',
      didParseCell: (data) => {
        if (data.row.index >= filasControlHoras.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
    y = finalY + 3;
    doc.setFontSize(7.5);
    doc.text(`Días con marcación: ${diasConMarcacion}    |    Días ausente: ${diasAusente}    |    Horas trabajadas: ${totalTrabajadas.toFixed(2)}    |    Horas extras: ${totalExtras.toFixed(2)}    |    Horas ausentes: ${totalAusentes.toFixed(2)}`, m, y);

    doc.save(`Control_Horas_${emp.nombres}_${emp.apellidos}_${fechaDesdeHoras}_a_${fechaHastaHoras}.pdf`);
  };

  const ultimaMarcacion = (nroDocumento: string): string => {
    const delEmpleado = marcaciones.filter(m => m.nroDocumento === nroDocumento);
    if (delEmpleado.length === 0) return '-';
    const ultima = delEmpleado.reduce((max, m) => (m.fecha > max.fecha ? m : max), delEmpleado[0]);
    const hora = ultima.horaSalida || ultima.horaEntrada || '';
    const fechaFmt = ultima.fecha ? new Date(ultima.fecha + 'T00:00:00').toLocaleDateString('es-ES') : '-';
    return hora ? `${fechaFmt} ${hora}` : fechaFmt;
  };

  const subirPdfManual = (file: File, nroDocumento: string, nombres: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const response = await apiFetch('/api/empleados/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64: base64, mimeType: file.type || 'application/pdf', nroDocumento, nombres }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Error al subir PDF');
          resolve(result.url);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const empleadoEditando = editingEmpleado || filaExpandida;
      const url = empleadoEditando ? `/api/empleados/${empleadoEditando.rowIndex}` : '/api/empleados';
      const method = empleadoEditando ? 'PUT' : 'POST';

      let scanDocumentos: string | undefined;
      if (!empleadoEditando && manualPdfFile) {
        setIsUploadingManualPdf(true);
        try {
          scanDocumentos = await subirPdfManual(manualPdfFile, form.nroDocumento, form.nombres);
        } finally {
          setIsUploadingManualPdf(false);
        }
      }

      const body = empleadoEditando
        ? { ...form, obra: proyecto.denominacion, rowIndex: empleadoEditando.rowIndex }
        : { ...form, obra: proyecto.denominacion, ...(scanDocumentos ? { scanDocumentos } : {}) };
      const response = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setShowForm(false); setEditingEmpleado(null); setFilaExpandida(null); setForm(emptyForm); setManualPdfFile(null);
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleDelete = async (empleado: Empleado) => {
    if (!confirm(`Eliminar empleado "${empleado.nombres} ${empleado.apellidos}"?`)) return;
    try {
      const response = await apiFetch(`/api/empleados/${empleado.rowIndex}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleToggleEstado = async (empleado: Empleado) => {
    const estadoActual = (empleado.estado || 'Activo').trim().toLowerCase();
    const nuevoEstado = estadoActual === 'inactivo' ? 'Activo' : 'Inactivo';
    if (!confirm(`Marcar a "${empleado.nombres} ${empleado.apellidos}" como ${nuevoEstado}?`)) return;
    try {
      const response = await apiFetch(`/api/empleados/${empleado.rowIndex}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleGuardarFechaInicio = async (rowIndex: number) => {
    if (editingFecha.rowIndex !== rowIndex) return;
    try {
      const response = await apiFetch(`/api/empleados/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaInicioContrato: editingFecha.value }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Error'); }
      setEditingFecha({ rowIndex: null, value: '' });
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const renderFechaInicioCell = (emp: Empleado) => {
    const isEditing = editingFecha.rowIndex === emp.rowIndex;
    return (
      <td
        className="py-3 px-4 text-sm text-muted-foreground block sm:table-cell cursor-pointer"
        onClick={(e) => {
          if (isEditing) return;
          e.stopPropagation();
          setEditingFecha({ rowIndex: emp.rowIndex, value: emp.fechaInicioContrato || '' });
        }}
      >
        <span className="text-muted-foreground/60 sm:hidden">Fecha Inicio Contrato: </span>
        {isEditing ? (
          <input
            type="date"
            value={editingFecha.value}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setEditingFecha({ rowIndex: emp.rowIndex, value: e.target.value })}
            onBlur={() => handleGuardarFechaInicio(emp.rowIndex)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleGuardarFechaInicio(emp.rowIndex);
              if (e.key === 'Escape') setEditingFecha({ rowIndex: null, value: '' });
            }}
            className="w-full bg-secondary border border-border rounded-lg px-2 py-1 text-sm"
          />
        ) : (
          emp.fechaInicioContrato ? new Date(emp.fechaInicioContrato + 'T00:00:00').toLocaleDateString('es-ES') : '-'
        )}
      </td>
    );
  };

  const handleGeminiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    setGeminiError('');
    setGeminiItems(prev => {
      const espacioDisponible = MAX_ARCHIVOS_GEMINI - prev.length;
      if (espacioDisponible <= 0) {
        setGeminiError(`Máximo ${MAX_ARCHIVOS_GEMINI} archivos por lote.`);
        return prev;
      }
      const sobrantes = selectedFiles.slice(espacioDisponible);
      if (sobrantes.length > 0) setGeminiError(`Máximo ${MAX_ARCHIVOS_GEMINI} archivos por lote. Se ignoraron ${sobrantes.length}.`);
      const nuevos: GeminiItem[] = selectedFiles.slice(0, espacioDisponible)
        .filter(f => {
          if (f.size > MAX_ARCHIVO_BYTES) { setGeminiError(`"${f.name}" supera el tamaño máximo de 10MB y fue omitido.`); return false; }
          return true;
        })
        .map(f => ({ id: `${f.name}-${f.size}-${f.lastModified}`, file: f, status: 'pendiente', datosExtraidos: null, error: '' }));
      return [...prev, ...nuevos];
    });
    e.target.value = '';
  };

  const removeGeminiItem = (id: string) => setGeminiItems(prev => prev.filter(it => it.id !== id));

  const procesarGeminiItem = async (item: GeminiItem) => {
    setGeminiItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'procesando', error: '' } : it));
    try {
      const base64 = await fileToBase64(item.file);
      const response = await apiFetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdfBase64: base64, mimeType: item.file.type }) });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Error');
      setGeminiItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'ok', datosExtraidos: data.data } : it));
    } catch (err: any) {
      setGeminiItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: err.message } : it));
    }
  };

  const handleGeminiProcess = async () => {
    const pendientes = geminiItems.filter(it => it.status === 'pendiente' || it.status === 'error');
    if (pendientes.length === 0) return;
    setGeminiProcessing(true); setGeminiError('');
    for (let i = 0; i < pendientes.length; i += CONCURRENCIA_GEMINI) {
      const lote = pendientes.slice(i, i + CONCURRENCIA_GEMINI);
      await Promise.all(lote.map(procesarGeminiItem));
    }
    setGeminiProcessing(false);
  };

  const geminiItemsOk = geminiItems.filter(it => it.status === 'ok');
  const geminiHayPendientes = geminiItems.some(it => it.status === 'pendiente' || it.status === 'error');

  const handleConfirmGemini = async () => {
    if (geminiItemsOk.length === 0 || geminiSaving) return;
    setGeminiSaving(true); setGeminiError('');
    try {
      for (const item of geminiItemsOk) {
        const datosExtraidos = item.datosExtraidos;
        const body = { nroDocumento: datosExtraidos.nroDocumento || '', nombres: datosExtraidos.nombres || '', apellidos: datosExtraidos.apellidos || '', cargo: datosExtraidos.cargo || '', obra: proyecto.denominacion, empresa: datosExtraidos.empresa || '', telefonoCelular: datosExtraidos.telefono || '', email: datosExtraidos.email || '', scanDocumentos: datosExtraidos.scanDocumentos || '' };
        const response = await apiFetch('/api/empleados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!response.ok) { const err = await response.json(); throw new Error(`${item.file.name}: ${err.error || 'Error'}`); }
      }
      setShowGeminiForm(false); setGeminiItems([]); fetchData();
    } catch (err: any) { setGeminiError(err.message); }
    finally { setGeminiSaving(false); }
  };

  const handleSubmitIPS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipsPdfFile) return;
    setIpsLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(ipsPdfFile);
      });
      const response = await apiFetch('/api/declaraciones-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64,
          mimeType: ipsPdfFile.type || 'application/pdf',
          proyecto: proyecto.denominacion,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al procesar declaración IPS');
      alert(`Declaración IPS procesada: ${data.periodo}. Se actualizaron ${data.actualizados} empleados.`);
      setShowIPSForm(false);
      setIpsPdfFile(null);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIpsLoading(false);
    }
  };

  const ordenarAlfabetico = (a: Empleado, b: Empleado) =>
    a.nombres.localeCompare(b.nombres, 'es') || a.apellidos.localeCompare(b.apellidos, 'es');

  const activosOrdenados = [...empleadosFiltrados]
    .filter(e => (e.estado || 'Activo').trim().toLowerCase() !== 'inactivo')
    .sort(ordenarAlfabetico);

  const inactivosOrdenados = [...empleadosFiltrados]
    .filter(e => (e.estado || 'Activo').trim().toLowerCase() === 'inactivo')
    .sort(ordenarAlfabetico);

  const descargarPDF = async () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 14;
    const marginRight = 14;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 20;

    const checkPageBreak = (alturaNecesaria: number) => {
      if (y + alturaNecesaria > 190) {
        doc.addPage();
        y = 20;
      }
    };

    let filtrados = [...empleados];
    if (pdfFilters.empresa) filtrados = filtrados.filter(e => (e.empresa || '').trim().toLowerCase() === pdfFilters.empresa.trim().toLowerCase());
    if (pdfFilters.estado) filtrados = filtrados.filter(e => (e.estado || 'Activo').trim().toLowerCase() === pdfFilters.estado.trim().toLowerCase());
    if (pdfFilters.cargo.trim()) filtrados = filtrados.filter(e => (e.cargo || '').toLowerCase().includes(pdfFilters.cargo.toLowerCase()));

    y = await drawPdfHeader(doc, proyecto, y - 5, { marginLeft, marginRight });
    y += 4;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Listado de Empleados', marginLeft, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${proyecto.denominacion}`, marginLeft, y);
    y += 6;
    const filtrosTexto = [
      pdfFilters.empresa ? `Empresa: ${pdfFilters.empresa}` : null,
      pdfFilters.estado ? `Estado: ${pdfFilters.estado}` : null,
      pdfFilters.cargo ? `Cargo: ${pdfFilters.cargo}` : null,
    ].filter(Boolean).join(' | ') || 'Sin filtros';
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} | Total: ${filtrados.length} empleado(s) | ${filtrosTexto}`, marginLeft, y);
    y += 12;

    if (filtrados.length === 0) {
      doc.text('No se encontraron empleados con los filtros seleccionados.', marginLeft, y);
      const fechaArchivo = new Date().toISOString().split('T')[0];
      doc.save(`Empleados_${proyecto.denominacion.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`);
      return;
    }

    const agrupados = filtrados.reduce((acc, emp) => {
      const key = emp.empresa?.trim() || 'Sin contratista';
      if (!acc[key]) acc[key] = [];
      acc[key].push(emp);
      return acc;
    }, {} as Record<string, Empleado[]>);

    const contratistas = Object.keys(agrupados).sort((a, b) => a.localeCompare(b, 'es'));

    const headers = ['Documento', 'Nombres', 'Apellidos', 'Cargo', 'Fecha Inicio Contrato', 'Scan Documentos', 'Última dec IPS'];
    const colWidths = [30, 40, 40, 45, 35, 38, 34];
    const startX = marginLeft;

    for (const contratista of contratistas) {
      const lista = agrupados[contratista].sort(ordenarAlfabetico);
      checkPageBreak(30);

      doc.setFillColor(240, 240, 240);
      doc.rect(marginLeft, y - 5, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${contratista} (${lista.length})`, marginLeft + 2, y);
      y += 10;

      doc.setFillColor(230, 230, 230);
      doc.rect(startX, y - 5, contentWidth, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      let x = startX + 2;
      headers.forEach((h, i) => {
        doc.text(h, x, y);
        x += colWidths[i];
      });
      y += 8;

      doc.setFont('helvetica', 'normal');
      for (const emp of lista) {
        checkPageBreak(12);
        doc.setFontSize(8);
        const row = [
          emp.nroDocumento || '-',
          emp.nombres || '-',
          emp.apellidos || '-',
          emp.cargo || '-',
          emp.fechaInicioContrato ? new Date(emp.fechaInicioContrato + 'T00:00:00').toLocaleDateString('es-ES') : '-',
          emp.scanDocumentos || 'Sin PDF',
          emp.ultimaDeclaracionIPS || 'Aun no Genera',
        ];
        x = startX + 2;
        row.forEach((cell, i) => {
          const maxLens = [18, 24, 24, 26, 14, 20, 18];
          const maxLen = maxLens[i] || 18;
          let text = String(cell);
          if (text.length > maxLen) text = text.slice(0, maxLen) + '...';

          if (i === 5 && emp.scanDocumentos) {
            doc.setTextColor(0, 102, 204);
            doc.textWithLink(text, x, y, { url: emp.scanDocumentos });
            doc.setTextColor(0, 0, 0);
          } else if (i === 6 && emp.ipsDocumentoUrl) {
            doc.setTextColor(0, 102, 204);
            doc.textWithLink(text, x, y, { url: emp.ipsDocumentoUrl });
            doc.setTextColor(0, 0, 0);
          } else {
            doc.text(text, x, y);
          }
          x += colWidths[i];
        });
        y += 6;
      }

      y += 6;
    }

    checkPageBreak(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total general: ${filtrados.length} empleado(s)`, marginLeft, y);

    const fechaArchivo = new Date().toISOString().split('T')[0];
    doc.save(`Empleados_${proyecto.denominacion.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`);
  };

  const descargarExcel = () => {
    let filtrados = [...empleados];
    if (pdfFilters.empresa) filtrados = filtrados.filter(e => (e.empresa || '').trim().toLowerCase() === pdfFilters.empresa.trim().toLowerCase());
    if (pdfFilters.estado) filtrados = filtrados.filter(e => (e.estado || 'Activo').trim().toLowerCase() === pdfFilters.estado.trim().toLowerCase());
    if (pdfFilters.cargo.trim()) filtrados = filtrados.filter(e => (e.cargo || '').toLowerCase().includes(pdfFilters.cargo.toLowerCase()));

    const rows = filtrados.map(emp => ({
      'Documento': emp.nroDocumento || '-',
      'Nombres': emp.nombres || '-',
      'Apellidos': emp.apellidos || '-',
      'Cargo': emp.cargo || '-',
      'Fecha Inicio Contrato': emp.fechaInicioContrato ? new Date(emp.fechaInicioContrato + 'T00:00:00').toLocaleDateString('es-ES') : '-',
      'Scan Documentos': emp.scanDocumentos || 'Sin PDF',
      'Estado': emp.estado || 'Activo',
      'Empresa': emp.empresa || '-',
      'Última dec IPS': emp.ultimaDeclaracionIPS || 'Aun no Genera',
    }));

    const hoja = XLSX.utils.json_to_sheet(rows);
    hoja['!cols'] = [
      { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 22 }
    ];
    const colIPS = 8;
    filtrados.forEach((emp, i) => {
      if (emp.ipsDocumentoUrl && emp.ultimaDeclaracionIPS) {
        const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: colIPS });
        hoja[cellRef] = {
          v: emp.ultimaDeclaracionIPS,
          t: 's',
          l: { Target: emp.ipsDocumentoUrl, Tooltip: 'Ver PDF' }
        };
      }
    });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Empleados');
    const fechaArchivo = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `Empleados_${proyecto.denominacion.replace(/\s+/g, '_')}_${fechaArchivo}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-primary" size={24} />
            Empleados del Proyecto
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{empleados.length} empleados registrados</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative" data-add-menu>
            <button
              onClick={() => setShowAddMenu(prev => !prev)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              title="Agregar Empleado"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Agregar Empleado</span>
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
                <button
                  onClick={() => { setShowAddMenu(false); setShowForm(true); setEditingEmpleado(null); setFilaExpandida(null); setForm(emptyForm); }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
                >
                  <Pencil size={16} /> Manual
                </button>
                <button
                  onClick={() => { setShowAddMenu(false); setShowGeminiForm(true); setGeminiItems([]); setGeminiError(''); }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
                >
                  <Brain size={16} /> Con IA
                </button>
              </div>
            )}
          </div>
          <div className="relative" data-biometrico-menu>
            <button
              onClick={() => setShowBiometricoMenu(prev => !prev)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              title="Reloj Biométrico"
            >
              <Fingerprint size={18} /> <span className="hidden sm:inline">Reloj Biométrico</span> <ChevronDown size={14} className="hidden sm:inline" />
            </button>
            {showBiometricoMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
                <button
                  onClick={() => { setShowBiometricoMenu(false); fileInputRef.current?.click(); }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
                >
                  <Upload size={16} /> Importar Marcaciones
                </button>
                <button
                  onClick={() => { setShowBiometricoMenu(false); setShowControlHoras(prev => !prev); }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
                >
                  <Fingerprint size={16} /> Control de Horas
                </button>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} accept=".xls,.xlsx" onChange={handleImportarMarcaciones} disabled={importandoMarcaciones} className="hidden" />
          <button
            onClick={() => setShowPdfFilters(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
            title="Descargar listado"
          >
            <FileDown size={18} /> <span className="hidden sm:inline">Descargar</span>
          </button>
          <button
            type="button"
            onClick={() => setShowIPSForm(prev => !prev)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
            title="Subir declaración jurada de salarios IPS"
          >
            <FileText size={18} /> <span className="hidden sm:inline">Declaración IPS</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, documento, cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 sm:p-1 rounded-md hover:bg-secondary text-muted-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {empresas.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-muted-foreground shrink-0" />
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="flex-1 sm:flex-none sm:w-64 bg-card border border-border rounded-xl px-3 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50"
            >
              <option value="">Todas las empresas</option>
              {empresas.map(empresa => (
                <option key={empresa} value={empresa}>{empresa}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showControlHoras && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Fingerprint size={20} className="text-primary" /> Control de Horas - Generar Informe</h3>
            <button onClick={() => setShowControlHoras(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trabajador *</label>
              <select value={trabajadorHoras} onChange={(e) => setTrabajadorHoras(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>
                {[...empleados].sort((a, b) => a.nombres.localeCompare(b.nombres, 'es')).map(e => (
                  <option key={e.nroDocumento} value={e.nroDocumento}>{e.nombres} {e.apellidos} - CI: {e.nroDocumento}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Desde *</label>
              <input type="date" value={fechaDesdeHoras} onChange={(e) => setFechaDesdeHoras(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hasta *</label>
              <input type="date" value={fechaHastaHoras} onChange={(e) => setFechaHastaHoras(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mb-4 bg-secondary/30 border border-border rounded-lg p-3">
            <label className="block text-sm font-medium mb-2">Feriados (sabado, domingo y feriados trabajados se pagan 100% extra)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <input type="date" value={nuevoFeriado} onChange={(e) => setNuevoFeriado(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm" />
              <button onClick={agregarFeriado} type="button" className="bg-secondary border border-border px-3 py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors">Agregar Feriado</button>
            </div>
            {feriados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {feriados.map(f => (
                  <span key={f} className="inline-flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-full text-xs">
                    {new Date(f + 'T00:00:00').toLocaleDateString('es-ES')}
                    <button onClick={() => quitarFeriado(f)} type="button" className="hover:text-red-400"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={generarVistaPreviaHoras} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <FileText size={18} /> Vista Previa / Editar
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Horario: lunes 07:00-18:00, martes a viernes 07:00-17:30. Tolerancia de {TOLERANCIA_MIN} minutos para llegada tardia/salida temprana.
            El informe incluye horas trabajadas, horas extras (fuera de horario, fin de semana o feriado) y horas ausentes (llegada tardia, salida temprana o falta de marcacion) por dia, con totales del periodo.
          </p>

          {filasControlHoras.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={guardarCambiosHoras} disabled={guardandoHoras} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm disabled:opacity-50">
                  <Save size={18} /> {guardandoHoras ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button onClick={exportarExcelHoras} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm">
                  <FileSpreadsheet size={18} /> Exportar Excel
                </button>
                <button onClick={exportarPDFHoras} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm">
                  <FileText size={18} /> Exportar PDF
                </button>
              </div>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium">Día</th>
                      <th className="text-left px-3 py-2 font-medium">Entrada</th>
                      <th className="text-left px-3 py-2 font-medium">Salida</th>
                      <th className="text-right px-3 py-2 font-medium">Trab.</th>
                      <th className="text-right px-3 py-2 font-medium">Extras</th>
                      <th className="text-right px-3 py-2 font-medium">Ausent.</th>
                      <th className="text-left px-3 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasControlHoras.map((fila, idx) => (
                      <tr key={fila.fechaISO} className="border-t border-border/50">
                        <td className="px-3 py-2 whitespace-nowrap">{fila.fechaMostrar}</td>
                        <td className="px-3 py-2 whitespace-nowrap capitalize">{fila.nombreDia}</td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={fila.horaEntrada}
                            onChange={(e) => handleEditarHora(idx, 'horaEntrada', e.target.value)}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={fila.horaSalida}
                            onChange={(e) => handleEditarHora(idx, 'horaSalida', e.target.value)}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">{fila.horasTrabajadas > 0 ? fila.horasTrabajadas.toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 text-right">{fila.horasExtras > 0 ? fila.horasExtras.toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 text-right">{fila.horasAusentes > 0 ? fila.horasAusentes.toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 text-xs">{fila.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <FormularioEmpleado form={form} setForm={setForm} handleSubmit={handleSubmit} isEditing={!!editingEmpleado} disabledNroDocumento={!!editingEmpleado} onCancel={() => { setShowForm(false); setManualPdfFile(null); }} pdfFile={manualPdfFile} onPdfFileChange={setManualPdfFile} isUploadingPdf={isUploadingManualPdf} />
        </div>
      )}

      {showGeminiForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Agregar Empleado con IA</h3>
            <button onClick={() => setShowGeminiForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Subir ficha(s) en PDF (una por empleado)</label><input type="file" accept=".pdf" multiple onChange={handleGeminiFileChange} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" /></div>

            {geminiItems.length > 0 && (
              <div className="space-y-2">
                {geminiItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={20} className="text-primary flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium truncate">{item.file.name}</div>
                        {item.status === 'ok' && (
                          <div className="text-xs text-emerald-400 mt-1">
                            {item.datosExtraidos?.nombres} {item.datosExtraidos?.apellidos} · Doc. {item.datosExtraidos?.nroDocumento || 'N/A'}
                          </div>
                        )}
                        {item.status === 'error' && <div className="text-xs text-red-400 mt-1">{item.error}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === 'procesando' && <Loader2 size={16} className="animate-spin text-primary" />}
                      {item.status === 'ok' && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {item.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
                      <button onClick={() => removeGeminiItem(item.id)} disabled={item.status === 'procesando'} className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-30"><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {geminiItems.length > 0 && geminiHayPendientes && (
              <button onClick={handleGeminiProcess} disabled={geminiProcessing} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                <Brain size={18} /> {geminiProcessing ? 'Procesando...' : `Procesar con IA ${geminiItems.length > 1 ? `(${geminiItems.length})` : ''}`}
              </button>
            )}

            {geminiError && <div className="text-sm text-red-400">{geminiError}</div>}

            {geminiItemsOk.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-emerald-400 font-medium">{geminiItemsOk.length} empleado{geminiItemsOk.length > 1 ? 's' : ''} listo{geminiItemsOk.length > 1 ? 's' : ''} para guardar en {proyecto.denominacion}</div>
                <button onClick={handleConfirmGemini} disabled={geminiSaving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <Save size={18} /> {geminiSaving ? 'Guardando...' : `Confirmar y Guardar ${geminiItemsOk.length > 1 ? `(${geminiItemsOk.length})` : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showPdfFilters && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileDown size={20} className="text-primary" />
              Descargar listado
            </h3>
            <button onClick={() => setShowPdfFilters(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Empresa</label>
              <select
                value={pdfFilters.empresa}
                onChange={(e) => setPdfFilters({ ...pdfFilters, empresa: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {empresas.map(empresa => (
                  <option key={empresa} value={empresa}>{empresa}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                value={pdfFilters.estado}
                onChange={(e) => setPdfFilters({ ...pdfFilters, estado: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cargo</label>
              <input
                type="text"
                placeholder="Filtrar por cargo..."
                value={pdfFilters.cargo}
                onChange={(e) => setPdfFilters({ ...pdfFilters, cargo: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { descargarPDF(); setShowPdfFilters(false); }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <FileDown size={18} /> Generar PDF
            </button>
            <button
              onClick={() => { descargarExcel(); setShowPdfFilters(false); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FileSpreadsheet size={18} /> Generar Excel
            </button>
            <button
              onClick={() => setPdfFilters({ empresa: '', estado: '', cargo: '' })}
              className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Limpiar filtros
            </button>
            <button
              onClick={() => setShowPdfFilters(false)}
              className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showIPSForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Subir declaración jurada de salarios IPS
            </h3>
            <button onClick={() => { setShowIPSForm(false); setIpsPdfFile(null); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmitIPS} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Archivo PDF de la planilla IPS</label>
              {!ipsPdfFile ? (
                <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 text-sm text-muted-foreground hover:bg-secondary/30 transition-colors cursor-pointer">
                  <Upload size={18} />
                  Click para seleccionar PDF
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => setIpsPdfFile(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div className="flex items-center justify-between bg-secondary p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-primary" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{ipsPdfFile.name}</div>
                      <div className="text-xs text-muted-foreground">{(ipsPdfFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIpsPdfFile(null)} className="text-muted-foreground hover:text-red-400"><X size={16} /></button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!ipsPdfFile || ipsLoading}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Brain size={18} /> {ipsLoading ? 'Procesando...' : 'Procesar con IA'}
              </button>
              <button
                type="button"
                onClick={() => { setShowIPSForm(false); setIpsPdfFile(null); }}
                className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : empleadosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground fade-in">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">
            {searchTerm || empresaFiltro ? 'No se encontraron empleados' : 'No hay empleados asignados'}
          </p>
          <p className="text-sm mt-1">
            {searchTerm || empresaFiltro ? 'Intenta con otros filtros o terminos de busqueda' : 'Agrega empleados a este proyecto'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full block sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Documento</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nombres</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Apellidos</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cargo</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Empresa</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Unidad</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha Inicio Contrato</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Última Marcación</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Última dec IPS</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              <tr className="bg-secondary/30">
                <td colSpan={10} className="py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activos ({activosOrdenados.length})</td>
              </tr>
              {activosOrdenados.length === 0 && (
                <tr><td colSpan={10} className="py-4 px-4 text-sm text-muted-foreground text-center">No hay empleados activos</td></tr>
              )}
              {activosOrdenados.map((emp) => (
                <Fragment key={`${emp.rowIndex}-${emp.nroDocumento}`}>
                  <tr
                    onClick={() => {
                      if (filaExpandida?.rowIndex === emp.rowIndex) {
                        setFilaExpandida(null);
                      } else {
                        setShowForm(false);
                        setEditingEmpleado(null);
                        setFilaExpandida(emp);
                        setForm(empleadoToForm(emp));
                      }
                    }}
                    className="border-b border-border hover:bg-secondary/50 block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border-x border-t sm:border-x-0 sm:border-t-0 border-border p-2 sm:p-0 cursor-pointer"
                  >
                    <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nroDocumento}</td>
                    <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nombres}</td>
                    <td className="py-3 px-4 text-sm block sm:table-cell">{emp.apellidos}</td>
                    <td className="py-3 px-4 text-sm block sm:table-cell">{emp.cargo}</td>
                    <td className="py-3 px-4 text-sm block sm:table-cell">{emp.empresa}</td>
                    <td className="py-3 px-4 text-sm block sm:table-cell">{emp.unidad || '-'}</td>
                    {renderFechaInicioCell(emp)}
                    <td className="py-3 px-4 text-sm text-muted-foreground block sm:table-cell">
                      <span className="text-muted-foreground/60 sm:hidden">Última Marcación: </span>{ultimaMarcacion(emp.nroDocumento)}
                    </td>
                    <td className="py-3 px-4 text-sm block sm:table-cell">
                      <span className="text-muted-foreground/60 sm:hidden">Última dec IPS: </span>
                      {emp.ultimaDeclaracionIPS ? (
                        <a href={emp.ipsDocumentoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{emp.ultimaDeclaracionIPS}</a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 block sm:table-cell">
                      <div className="flex gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                        <button onClick={(e) => { e.stopPropagation(); handleToggleEstado(emp); }} className="p-2.5 sm:p-1 text-muted-foreground hover:text-amber-500 transition-colors" title="Marcar como Inactivo"><UserX size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(emp); }} className="p-2.5 sm:p-1 text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                        {emp.scanDocumentos && <a href={emp.scanDocumentos} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Ver PDF"><FileText size={16} /></a>}
                      </div>
                    </td>
                  </tr>
                  {filaExpandida?.rowIndex === emp.rowIndex && (
                    <tr className="border-b border-border bg-card">
                      <td colSpan={10} className="p-4 sm:p-6">
                        <h3 className="text-lg font-semibold mb-4">Editar Empleado</h3>
                        <FormularioEmpleado form={form} setForm={setForm} handleSubmit={handleSubmit} inline isEditing disabledNroDocumento onCancel={() => setFilaExpandida(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {inactivosOrdenados.length > 0 && (
                <>
                  <tr className="bg-secondary/30">
                    <td colSpan={10} className="py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inactivos ({inactivosOrdenados.length})</td>
                  </tr>
                  {inactivosOrdenados.map((emp) => (
                    <Fragment key={`${emp.rowIndex}-${emp.nroDocumento}`}>
                      <tr
                        onClick={() => {
                          if (filaExpandida?.rowIndex === emp.rowIndex) {
                            setFilaExpandida(null);
                          } else {
                            setShowForm(false);
                            setEditingEmpleado(null);
                            setFilaExpandida(emp);
                            setForm(empleadoToForm(emp));
                          }
                        }}
                        className="border-b border-border hover:bg-secondary/50 opacity-60 block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border-x border-t sm:border-x-0 sm:border-t-0 border-border p-2 sm:p-0 cursor-pointer"
                      >
                        <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nroDocumento}</td>
                        <td className="py-3 px-4 text-sm block sm:table-cell">{emp.nombres}</td>
                        <td className="py-3 px-4 text-sm block sm:table-cell">{emp.apellidos}</td>
                        <td className="py-3 px-4 text-sm block sm:table-cell">{emp.cargo}</td>
                        <td className="py-3 px-4 text-sm block sm:table-cell">{emp.empresa}</td>
                        <td className="py-3 px-4 text-sm block sm:table-cell">{emp.unidad || '-'}</td>
                        {renderFechaInicioCell(emp)}
                        <td className="py-3 px-4 text-sm text-muted-foreground block sm:table-cell">
                          <span className="text-muted-foreground/60 sm:hidden">Última Marcación: </span>{ultimaMarcacion(emp.nroDocumento)}
                        </td>
                        <td className="py-3 px-4 text-sm block sm:table-cell">
                          <span className="text-muted-foreground/60 sm:hidden">Última dec IPS: </span>
                          {emp.ultimaDeclaracionIPS ? (
                            <a href={emp.ipsDocumentoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{emp.ultimaDeclaracionIPS}</a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 block sm:table-cell">
                          <div className="flex gap-1 pt-1.5 sm:pt-0 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                            <button onClick={(e) => { e.stopPropagation(); handleToggleEstado(emp); }} className="p-2.5 sm:p-1 text-muted-foreground hover:text-green-500 transition-colors" title="Reactivar"><UserCheck size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(emp); }} className="p-2.5 sm:p-1 text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                            {emp.scanDocumentos && <a href={emp.scanDocumentos} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2.5 sm:p-1 text-muted-foreground hover:text-primary transition-colors" title="Ver PDF"><FileText size={16} /></a>}
                          </div>
                        </td>
                      </tr>
                      {filaExpandida?.rowIndex === emp.rowIndex && (
                        <tr className="border-b border-border bg-card">
                          <td colSpan={10} className="p-4 sm:p-6">
                            <h3 className="text-lg font-semibold mb-4">Editar Empleado</h3>
                            <FormularioEmpleado form={form} setForm={setForm} handleSubmit={handleSubmit} inline isEditing disabledNroDocumento onCancel={() => setFilaExpandida(null)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
