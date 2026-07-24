import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, X, Save, Shield, User, Eye, EyeOff } from 'lucide-react';

interface Usuario {
  rowIndex: number;
  idRegistro: string;
  dateTime: string;
  registradoPor: string;
  rol: 'Desarrollador' | 'Admin' | 'User';
  nombres: string;
  apellidos: string;
  correo: string;
}

const roles = ['Desarrollador', 'Admin', 'User'] as const;

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    correo: '',
    rol: 'User' as const,
    contrasena: '',
  });

  const token = localStorage.getItem('token') || '';

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setUsuarios(data.data);
    } catch (err) {
      alert('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/usuarios/${editingUser.rowIndex}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';

      const body: any = { ...form };
      if (!editingUser && !form.contrasena) {
        body.contrasena = '123456';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowForm(false);
      setEditingUser(null);
      setForm({ nombres: '', apellidos: '', correo: '', rol: 'User', contrasena: '' });
      fetchUsuarios();
      alert(editingUser ? 'Usuario actualizado' : 'Usuario creado');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (u: Usuario) => {
    if (!confirm(`Eliminar usuario ${u.nombres} ${u.apellidos}?`)) return;
    try {
      const res = await fetch(`/api/usuarios/${u.rowIndex}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error');
      fetchUsuarios();
    } catch {
      alert('Error eliminando usuario');
    }
  };

  const startEdit = (u: Usuario) => {
    setEditingUser(u);
    setForm({
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo,
      rol: u.rol,
      contrasena: '',
    });
    setShowForm(true);
  };

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'Desarrollador': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Admin': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          Administrar Usuarios
        </h2>
        <button
          onClick={() => {
            setEditingUser(null);
            setForm({ nombres: '', apellidos: '', correo: '', rol: 'User', contrasena: '' });
            setShowForm(true);
          }}
          className="btn-gradient text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm"
        >
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <button onClick={() => setShowForm(false)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombres *</label>
              <input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Apellidos *</label>
              <input type="text" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Correo *</label>
              <input type="email" value={form.correo} onChange={(e) => setForm({...form, correo: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rol *</label>
              <select value={form.rol} onChange={(e) => setForm({...form, rol: e.target.value as any})} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50" required>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {editingUser ? 'Nueva Contrasena (opcional)' : 'Contrasena *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.contrasena}
                  onChange={(e) => setForm({...form, contrasena: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm input-glow focus:outline-none focus:border-primary/50 pr-10"
                  placeholder={editingUser ? 'Dejar vacio para no cambiar' : '123456'}
                  required={!editingUser}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full btn-gradient text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25">
                <Save size={16} /> {editingUser ? 'Actualizar' : 'Crear'} Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-4"><div className="skeleton h-6 w-1/4 rounded mb-3" /></div>)}</div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm block sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Correo</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Registrado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {usuarios.map((u) => (
                <tr key={u.idRegistro} className="border-b border-border/50 hover:bg-secondary/30 transition-colors block sm:table-row mb-2 sm:mb-0 rounded-lg sm:rounded-none border border-border/50 sm:border-0 sm:border-b p-2 sm:p-0">
                  <td className="py-3 px-4 font-medium block sm:table-cell">{u.nombres} {u.apellidos}</td>
                  <td className="py-3 px-4 text-muted-foreground block sm:table-cell">{u.correo}</td>
                  <td className="py-3 px-4 block sm:table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs border ${getRolColor(u.rol)}`}>{u.rol}</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs block sm:table-cell">{new Date(u.dateTime).toLocaleDateString('es-ES')}</td>
                  <td className="py-3 px-4 sm:text-right block sm:table-cell pt-1.5 sm:pt-3 mt-1 sm:mt-0 border-t border-border/50 sm:border-0">
                    <button onClick={() => startEdit(u)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary inline-block mr-1" title="Editar"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(u)} className="p-3 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400 inline-block" title="Eliminar"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
