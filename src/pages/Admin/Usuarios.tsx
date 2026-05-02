// ╔═══════════════════════════════════════════════════════════════╗
// ║  USUARIOS — Admin                                            ║
// ║  Crear, editar, suspender usuarios de la empresa activa      ║
// ║  Asignar rol por empresa (admin/gerente/contador/cajero/rh)  ║
// ╚═══════════════════════════════════════════════════════════════╝
import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmtDate } from '../../lib/api';

const ROLES_BASE = [
  { code:'admin',         label:'Administrador',  color:'#f87171', desc:'Acceso total al sistema' },
  { code:'gerente',       label:'Gerente',         color:'#8b5cf6', desc:'Gestión operativa y reportes' },
  { code:'contador',      label:'Contador',        color:'#3b82f6', desc:'Finanzas, nómina y reportes' },
  { code:'cajero',        label:'Cajero',          color:'#10b981', desc:'Solo POS y corte de caja' },
  { code:'rh',            label:'RH',              color:'#f59e0b', desc:'Recursos humanos y nómina' },
  { code:'director',      label:'Director',        color:'#06b6d4', desc:'Reportes y lectura general' },
  { code:'produccion_op', label:'Producción',      color:'#64748b', desc:'Lotes y empaque (Machete)' },
  { code:'coach',         label:'Coach',           color:'#ec4899', desc:'POS y comisiones (Palestra)' },
  { code:'encargado_alm', label:'Enc. Almacén',    color:'#f59e0b', desc:'Surtido y catálogo (Lonche)' },
];

const PASS_DEFAULT = 'Workaholic2026!';

export default function UsuariosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();
  const { user } = useERPStore();

  // Admin global puede cambiar de empresa
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const cidActivo = empresaFiltro || cid || '';
  const isGlobalAdmin = activeCompany?.roleCode === 'admin' ||
    activeCompany?.roleCode === 'administrador' ||
    (user as any)?.email === 'loraloraangel@gmail.com' ||
    (user as any)?.email === 'admin@grupoworkaholic.com';

  const [showNew,   setShowNew]   = useState(false);
  const [editUser,  setEditUser]  = useState<any>(null);
  const [busqueda,  setBusqueda]  = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: PASS_DEFAULT,
    roleCode: 'cajero', phone: '',
  });
  const [editForm, setEditForm] = useState({
    name: '', email: '', password: '', roleCode: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showEditPass, setShowEditPass] = useState(false);

  // ── Queries ──────────────────────────────────────────────────
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['users', cidActivo],
    queryFn:  () => api.get(`/companies/${cidActivo}/users`).then(r => r.data),
    enabled:  !!cidActivo,
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn:  () => api.get('/companies').then(r => r.data),
    enabled:  isGlobalAdmin,
  });

  const { data: rolesCustom = [] } = useQuery({
    queryKey: ['company-roles', cidActivo],
    queryFn:  () => api.get(`/companies/${cidActivo}/permissions/roles`).then(r => r.data),
    enabled:  !!cidActivo,
  });

  // Combinar roles base + custom
  const todosRoles = [
    ...ROLES_BASE,
    ...(rolesCustom as any[])
      .filter((r: any) => !ROLES_BASE.find(b => b.code === r.code))
      .map((r: any) => ({ code: r.code, label: r.label, color: r.color || '#64748b', desc: r.description || '' })),
  ];

  // ── Mutations ─────────────────────────────────────────────────
  const createM = useMutation({
    mutationFn: () => api.post(`/companies/${cidActivo}/users`, { ...form, companyId: cidActivo }),
    onSuccess: () => {
      setShowNew(false);
      setForm({ name:'', email:'', password:PASS_DEFAULT, roleCode:'cajero', phone:'' });
      qc.invalidateQueries({ queryKey: ['users', cid] });
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Error desconocido';
      alert('Error al crear usuario: ' + msg);
    },
  });

  const updateM = useMutation({
    mutationFn: () => api.put(`/companies/${cidActivo}/users/${editUser?.id}`, {
      ...editForm,
      // Only send password if not empty
      ...(editForm.password.trim() ? {} : { password: undefined }),
    }),
    onSuccess: () => {
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ['users', cid] });
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Error desconocido';
      alert('Error al guardar: ' + msg);
    },
  });

  const toggleM = useMutation({
    mutationFn: (userId: string) => api.put(`/companies/${cidActivo}/users/${userId}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', cid] }),
    onError: (e: any) => alert(e.response?.data?.message || 'Error'),
  });

  // ── Helpers ───────────────────────────────────────────────────
  const getRolInfo = (code: string) =>
    todosRoles.find(r => r.code === code) || { label: code, color: '#64748b', desc: '' };

  const filtered = (usuarios as any[]).filter((u: any) =>
    !busqueda ||
    u.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.roleCode?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const activos   = filtered.filter((u: any) => u.isActive !== false);
  const inactivos = filtered.filter((u: any) => u.isActive === false);

  return (
    <AppLayout>
      <div style={{ maxWidth: 900 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:'0 0 3px' }}>Usuarios</h1>
            <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
              {activeCompany?.companyName} · {activos.length} activos
              {inactivos.length > 0 && ` · ${inactivos.length} suspendidos`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {isGlobalAdmin && (empresas as any[]).length > 1 && (
              <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}
                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid #334155',
                  background:'#0f172a', color:'#f1f5f9', fontSize:12 }}>
                <option value="">Empresa activa ({activeCompany?.companyName})</option>
                {(empresas as any[]).map((e:any) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            )}
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar usuario…"
              style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #334155',
                background:'#0f172a', color:'#f1f5f9', fontSize:12, width:180 }}/>
            <button onClick={() => setShowNew(true)}
              style={{ padding:'8px 20px', borderRadius:8, border:'none',
                background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
              + Nuevo usuario
            </button>
          </div>
        </div>

        {/* Tabla usuarios activos */}
        {isLoading ? (
          <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>
            <p style={{ fontSize:32, margin:'0 0 12px' }}>⏳</p>
            <p>Cargando usuarios…</p>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Creado</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activos.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#64748b' }}>
                      <p style={{ fontSize:28, margin:'0 0 8px' }}>👤</p>
                      <p>Sin usuarios registrados</p>
                    </td></tr>
                  )}
                  {activos.map((u: any) => {
                    const rol = getRolInfo(u.roleCode || u.companyRoles?.[0]?.role?.code);
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:32, height:32, borderRadius:'50%',
                              background:rol.color+'22', border:`1px solid ${rol.color}44`,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:13, fontWeight:700, color:rol.color, flexShrink:0 }}>
                              {(u.name||'?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize:13, fontWeight:600, margin:'0 0 1px' }}>{u.name}</p>
                              {u.phone && <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{u.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize:12, color:'#94a3b8' }}>{u.email}</td>
                        <td>
                          <span style={{ fontSize:11, padding:'3px 9px', borderRadius:99,
                            fontWeight:600, background:rol.color+'22', color:rol.color }}>
                            {rol.label}
                          </span>
                        </td>
                        <td style={{ fontSize:11, color:'#64748b' }}>{fmtDate(u.createdAt)}</td>
                        <td>
                          <span style={{ fontSize:10, color:'#10b981',
                            background:'#10b98120', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>
                            Activo
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => {
                              setEditUser(u);
                              setEditForm({
                                name: u.name,
                                email: u.email,
                                password: '',
                                roleCode: u.roleCode || u.companyRoles?.[0]?.role?.code || 'cajero',
                              });
                            }}
                              style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${color}`,
                                background:'none', color, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                              ✎ Editar
                            </button>
                            <button onClick={() => {
                              if (window.confirm(`¿Suspender a ${u.name}? No podrá iniciar sesión.`))
                                toggleM.mutate(u.id);
                            }}
                              style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #f59e0b',
                                background:'none', color:'#f59e0b', cursor:'pointer', fontSize:11 }}>
                              ⏸
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Usuarios suspendidos */}
            {inactivos.length > 0 && (
              <div>
                <p style={{ fontSize:11, color:'#475569', textTransform:'uppercase',
                  letterSpacing:1, fontWeight:700, margin:'0 0 8px' }}>
                  Suspendidos ({inactivos.length})
                </p>
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <table className="table-base">
                    <tbody>
                      {inactivos.map((u: any) => {
                        const rol = getRolInfo(u.roleCode || u.companyRoles?.[0]?.role?.code);
                        return (
                          <tr key={u.id} style={{ opacity:0.6 }}>
                            <td>
                              <p style={{ fontSize:12, fontWeight:600, margin:0 }}>{u.name}</p>
                              <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{u.email}</p>
                            </td>
                            <td>
                              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                                background:rol.color+'22', color:rol.color }}>
                                {rol.label}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize:10, color:'#f87171', background:'#f8717120',
                                padding:'2px 8px', borderRadius:99 }}>
                                Suspendido
                              </span>
                            </td>
                            <td>
                              <button onClick={() => toggleM.mutate(u.id)}
                                style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #10b981',
                                  background:'none', color:'#10b981', cursor:'pointer', fontSize:11 }}>
                                ▶ Reactivar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info contraseña default */}
        <div style={{ marginTop:16, padding:'10px 14px', background:'#1e293b',
          borderRadius:9, border:'1px solid #334155', display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:20 }}>🔑</span>
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'#94a3b8', margin:'0 0 2px' }}>
              Contraseña por defecto para usuarios nuevos
            </p>
            <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', margin:0 }}>
              {PASS_DEFAULT}
              <span style={{ fontSize:10, color:'#64748b', marginLeft:8 }}>
                El usuario puede cambiarla desde Mi Perfil
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Modal: Nuevo usuario ── */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:14, padding:28,
            width:500, border:`1px solid ${color}44` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:800, margin:0, color }}>Nuevo usuario</h3>
              <button onClick={() => setShowNew(false)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
              {/* Nombre */}
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre completo *</label>
                <input className="input-base" style={{ fontSize:14, fontWeight:600 }}
                  placeholder="Ej: María García" autoFocus
                  value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))}/>
              </div>
              {/* Email */}
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Correo electrónico *</label>
                <input type="email" className="input-base" style={{ fontSize:13 }}
                  placeholder="usuario@empresa.com"
                  value={form.email} onChange={e => setForm(f=>({...f, email:e.target.value}))}/>
              </div>
              {/* Teléfono */}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Teléfono</label>
                <input className="input-base" style={{ fontSize:13 }}
                  placeholder="55 1234 5678"
                  value={form.phone} onChange={e => setForm(f=>({...f, phone:e.target.value}))}/>
              </div>
              {/* Contraseña */}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Contraseña inicial</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass ? 'text' : 'password'} className="input-base" style={{ fontSize:13, paddingRight:36 }}
                    value={form.password} onChange={e => setForm(f=>({...f, password:e.target.value}))}/>
                  <button onClick={() => setShowPass(p=>!p)}
                    style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:14 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              {/* Rol */}
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:6 }}>Perfil de acceso *</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                  {todosRoles.slice(0,9).map(r => (
                    <button key={r.code} onClick={() => setForm(f=>({...f, roleCode:r.code}))}
                      style={{ padding:'8px 6px', borderRadius:7, cursor:'pointer', textAlign:'left',
                        border:`1px solid ${form.roleCode===r.code ? r.color : '#334155'}`,
                        background: form.roleCode===r.code ? r.color+'22' : '#0f172a' }}>
                      <p style={{ fontSize:11, fontWeight:700, color:form.roleCode===r.code?r.color:'#94a3b8', margin:'0 0 1px' }}>
                        {r.label}
                      </p>
                      <p style={{ fontSize:9, color:'#475569', margin:0, lineHeight:1.3 }}>{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            {form.name && form.email && (
              <div style={{ padding:'10px 14px', background:'#0f172a', borderRadius:8,
                marginBottom:14, display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:36, height:36, borderRadius:'50%',
                  background:getRolInfo(form.roleCode).color+'22',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:15, fontWeight:800, color:getRolInfo(form.roleCode).color }}>
                  {form.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', margin:'0 0 1px' }}>{form.name}</p>
                  <p style={{ fontSize:11, color:'#64748b', margin:0 }}>
                    {form.email} · <span style={{ color:getRolInfo(form.roleCode).color }}>{getRolInfo(form.roleCode).label}</span>
                  </p>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowNew(false)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={() => {
                  if (!form.name.trim() || !form.email.trim()) { alert('Nombre y correo son requeridos'); return; }
                  if (!cidActivo) { alert('No hay empresa activa'); return; }
                  createM.mutate();
                }}
                disabled={createM.isPending || !form.name || !form.email || !form.password || !form.roleCode}
                style={{ flex:2, padding:'10px', borderRadius:8, border:'none',
                  background:form.name&&form.email?color:'#334155',
                  color:'#fff', cursor:form.name&&form.email?'pointer':'not-allowed',
                  fontSize:13, fontWeight:700 }}>
                {createM.isPending ? 'Creando…' : '✓ Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar usuario ── */}
      {editUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:14, padding:28,
            width:480, border:`1px solid ${color}44` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:800, margin:0, color }}>
                Editar — {editUser.name}
              </h3>
              <button onClick={() => setEditUser(null)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Nombre *</label>
                <input className="input-base" style={{ fontSize:13 }}
                  value={editForm.name} onChange={e => setEditForm(f=>({...f, name:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Email</label>
                <input type="email" className="input-base" style={{ fontSize:13 }}
                  value={editForm.email} onChange={e => setEditForm(f=>({...f, email:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>
                  Nueva contraseña <span style={{ color:'#475569' }}>(dejar vacío para no cambiar)</span>
                </label>
                <div style={{ position:'relative' }}>
                  <input type={showEditPass ? 'text' : 'password'} className="input-base"
                    style={{ fontSize:13, paddingRight:36 }}
                    placeholder="••••••••"
                    value={editForm.password} onChange={e => setEditForm(f=>({...f, password:e.target.value}))}/>
                  <button onClick={() => setShowEditPass(p=>!p)}
                    style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:14 }}>
                    {showEditPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:6 }}>Perfil de acceso</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
                  {todosRoles.slice(0,9).map(r => (
                    <button key={r.code} onClick={() => setEditForm(f=>({...f, roleCode:r.code}))}
                      style={{ padding:'7px 5px', borderRadius:6, cursor:'pointer',
                        border:`1px solid ${editForm.roleCode===r.code ? r.color : '#334155'}`,
                        background: editForm.roleCode===r.code ? r.color+'22' : '#0f172a' }}>
                      <p style={{ fontSize:10, fontWeight:700,
                        color:editForm.roleCode===r.code?r.color:'#94a3b8', margin:0 }}>
                        {r.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setEditUser(null)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={() => updateM.mutate()}
                disabled={updateM.isPending || !editForm.name}
                style={{ flex:2, padding:'10px', borderRadius:8, border:'none',
                  background:editForm.name?color:'#334155',
                  color:'#fff', cursor:editForm.name?'pointer':'not-allowed',
                  fontSize:13, fontWeight:700 }}>
                {updateM.isPending ? 'Guardando…' : '💾 Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
