import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function NuevaInspeccion({ onBack }: { onBack: () => void }) {
  const [tipo, setTipo] = useState('general');
  const [areaNombre, setAreaNombre] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [hallazgos, setHallazgos] = useState([{ descripcion: '', categoria: '', riesgo: 'bajo' as const }]);
  
  const createMutation = trpc.inspecciones.create.useMutation({
    onSuccess: () => {
      alert('¡Inspección creada!');
      onBack();
    },
  });

  const addHallazgo = () => {
    setHallazgos([...hallazgos, { descripcion: '', categoria: '', riesgo: 'bajo' }]);
  };

  const removeHallazgo = (index: number) => {
    setHallazgos(hallazgos.filter((_, i) => i !== index));
  };

  const updateHallazgo = (index: number, field: string, value: string) => {
    const newHallazgos = [...hallazgos];
    newHallazgos[index] = { ...newHallazgos[index], [field]: value };
    setHallazgos(newHallazgos);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      tipo: tipo as any,
      areaId: 'area-1',
      areaNombre,
      plantaId: 'planta-1',
      hallazgos: hallazgos.filter(h => h.descripcion.trim()),
      observaciones,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={18} /> Volver
      </button>
      
      <h2 className="text-2xl font-bold mb-6">Nueva Inspección</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Inspección</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="general">General</option>
              <option value="extintores">Extintores</option>
              <option value="epp">EPP</option>
              <option value="maquinaria">Maquinaria</option>
              <option value="electricidad">Electricidad</option>
              <option value="quimicos">Químicos</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Área / Ubicación</label>
            <input 
              type="text" 
              value={areaNombre}
              onChange={(e) => setAreaNombre(e.target.value)}
              placeholder="Ej: Planta de Producción A"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Hallazgos</h3>
            <button 
              type="button" 
              onClick={addHallazgo}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
            >
              <Plus size={16} /> Agregar
            </button>
          </div>
          
          <div className="space-y-3">
            {hallazgos.map((hallazgo, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <input 
                    type="text" 
                    value={hallazgo.descripcion}
                    onChange={(e) => updateHallazgo(index, 'descripcion', e.target.value)}
                    placeholder="Descripción del hallazgo"
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={hallazgo.categoria}
                      onChange={(e) => updateHallazgo(index, 'categoria', e.target.value)}
                      placeholder="Categoría"
                      className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select 
                      value={hallazgo.riesgo}
                      onChange={(e) => updateHallazgo(index, 'riesgo', e.target.value)}
                      className="bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="bajo">Bajo</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                      <option value="critico">Crítico</option>
                    </select>
                  </div>
                </div>
                {hallazgos.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeHallazgo(index)}
                    className="text-red-400 hover:text-red-300 mt-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <label className="block text-sm font-medium mb-2">Observaciones Generales</label>
          <textarea 
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={4}
            placeholder="Observaciones adicionales..."
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <button 
          type="submit" 
          disabled={createMutation.isPending}
          className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {createMutation.isPending ? 'Guardando...' : 'Guardar Inspección'}
        </button>
      </form>
    </div>
  );
}
