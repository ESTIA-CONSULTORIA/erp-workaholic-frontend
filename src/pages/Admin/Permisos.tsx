// ╔═══════════════════════════════════════════════════════════════╗
// ║  PERMISOS — Sistema real de Grupo Workaholic                 ║
// ║  · Roles independientes por empresa                          ║
// ║  · Solo Admin puede modificar                                ║
// ║  · Cambios con efecto inmediato                              ║
// ║  · Módulos filtrados según la empresa activa                 ║
// ╚═══════════════════════════════════════════════════════════════╝
import AppLayout from '../../components/layout/AppLayout';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// Etiquetas humanas para módulos y acciones
const MODULE_LABELS: Record<string,{ label:string; icon:string }> = {
  pos:           { label:'Punto de Venta (POS)',      icon:'🏪' },
  catalogo:      { label:'Catálogo de Productos',     icon:'≋'  },
  inventario:    { label:'Inventario y Stock',        icon:'📦' },
  compras:       { label:'Compras de Insumos',        icon:'🛒' },
  produccion:    { label:'Producción (Lotes)',         icon:'⚙'  },
  oc:            { label:'Órdenes de Compra',         icon:'📋' },
  corte:         { label:'Corte de Caja',             icon:'🏧' },
  gastos:        { label:'Gastos',                    icon:'💸' },
  cxc:           { label:'Cuentas por Cobrar (CxC)',  icon:'◧'  },
  cxp:           { label:'Cuentas por Pagar (CxP)',   icon:'◨'  },
  reportes:      { label:'Estados Financieros',       icon:'Σ'  },
  rh:            { label:'Recursos Humanos',          icon:'👥' },
  nomina:        { label:'Nómina',                    icon:'💰' },
  documentos:    { label:'Documentos',                icon:'📄' },
  admin:         { label:'Administración',            icon:'⊛'  },
  membresias:    { label:'Membresías',                icon:'🏅' },
  servicios:     { label:'Catálogo de Servicios',     icon:'🎯' },
  comisiones:    { label:'Comisiones de Coaches',     icon:'💎' },
  espacios:      { label:'Espacios / Salas',          icon:'🚪' },
  reservaciones: { label:'Reservaciones',             icon:'📅' },
  surtido:       { label:'Surtido de Turno',          icon:'📤' },
  alumnos:       { label:'Alumnos y Prepago',         icon:'👨‍🎓' },
};

const ACTION_LABELS: Record<string,{ label:string; color:string }> = {
  ver:      { label:'Ver',      color:'#3b82f6' },
  crear:    { label:'Crear',    color:'#10b981' },
  editar:   { label:'Editar',   color:'#f59e0b' },
  eliminar: { label:'Eliminar', color:'#f87171' },
  aprobar:  { label:'Aprobar',  color:'#8b5cf6' },
  exportar: { label:'Exportar', color:'#06b6d4' },
};

// Descripción de qué puede hacer cada rol en la empresa (tooltip educativo)
const ROLE_DESCRIPTIONS: Record<string,string> = {
  gerente:       'Supervisa operaciones del día, aprueba cortes y permisos del personal',
  contador:      'Gestiona finanzas, CxC, CxP, nómina y estados financieros',
  cajero:        'Opera el POS de ventas y registra su corte de caja',
  rh:            'Administra empleados, nómina, vacaciones e incidencias',
  director:      'Acceso de solo lectura a reportes y estados financieros',
  produccion_op: 'Registra y gestiona lotes de producción e inventario de insumos',
  coach:         'Puede vender servicios y ver sus propias comisiones',
  encargado_alm: 'Gestiona el surtido del turno y el catálogo de productos de la cooperativa',
};

export default function PermisosPage() {
  const { activeCompany } = useERPStore();
  const cid         = activeCompany?.companyId;
  const companyCode = activeCompany?.companyCode || 'MACHETE';
  const companyName = activeCompany?.companyName || '';
  const color       = activeCompany?.color || '#3b82f6';
  const qc          = useQueryClient();
  const navigate    = useNavigate();

  // Set initial role when roles load

  const [selectedRole, setSelectedRole] = useState('');
  const [saving,       setSaving]       = useState<string|null>(null);
  const [showNewRole,  setShowNewRole]  = useState(false);
  const [confirmDel,   setConfirmDel]   = useState<any>(null);
  const [newRole,      setNewRole]      = useState({ label:'', color:'#64748b', description:'', copyFrom:'' });
  const [tooltip,      setTooltip]      = useState('');

  // Cargar roles de ESTA empresa
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['company-roles', cid],
    queryFn:  () => api.get(`/companies/${cid}/permissions/roles?companyCode=${companyCode}`).then(r => r.data),
    enabled:  !!cid,
  });

  // Cargar módulos disponibles para ESTA empresa
  const { data: modules = [] } = useQuery({
    queryKey: ['company-modules', companyCode],
    queryFn:  () => api.get(`/companies/${cid}/permissions/modules?companyCode=${companyCode}`).then(r => r.data),
    enabled:  !!cid,
  });

  // Cargar permisos de TODOS los roles de esta empresa
  const { data: allPerms = {}, isLoading: permsLoading } = useQuery({
    queryKey: ['company-perms', cid],
    queryFn:  () => api.get(`/companies/${cid}/permissions/all`).then(r => r.data),
    enabled:  !!cid,
    staleTime: 0,
  });

  const rolePerms: Record<string,string[]> = (allPerms as any)[selectedRole] || {};
  const has = (mod: string, action: string) => (rolePerms[mod] || []).includes(action);

  // Mutations
  const toggleM = useMutation({
    mutationFn: ({ mod, action, allowed }: any) =>
      api.put(`/companies/${cid}/permissions/roles/${selectedRole}/modules/${mod}/actions/${action}`, { allowed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-perms', cid] }),
  });

  const resetM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/permissions/roles/${selectedRole}/reset`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-perms', cid] });
    },
  });

  const createRoleM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/permissions/roles`, {
      ...newRole, companyId: cid,
    }),
    onSuccess: (d: any) => {
      const code = d.data?.code || d.code;
      setShowNewRole(false);
      setNewRole({ label:'', color:'#64748b', description:'', copyFrom:'' });
      qc.invalidateQueries({ queryKey: ['company-roles', cid] });
      qc.invalidateQueries({ queryKey: ['company-perms', cid] });
      if (code) setTimeout(() => setSelectedRole(code), 300);
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error al crear perfil'),
  });

  const suspendM = useMutation({
    mutationFn: (code: string) => api.put(`/companies/${cid}/permissions/roles/${code}/suspend`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-roles', cid] });
      setConfirmDel(null);
      setSelectedRole((roles as any[])[0]?.code || '');
    },
  });

  const deleteM = useMutation({
    mutationFn: (code: string) => api.delete(`/companies/${cid}/permissions/roles/${code}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-roles', cid] });
      qc.invalidateQueries({ queryKey: ['company-perms', cid] });
      setConfirmDel(null);
      setSelectedRole((roles as any[])[0]?.code || '');
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error'),
  });


  useEffect(() => {
    if (!selectedRole && (roles as any[]).length > 0) {
      setSelectedRole((roles as any[])[0].code);
    }
  }, [roles, selectedRole]);

  const toggle = (mod: string, action: string) => {
    const key = `${mod}:${action}`;
    setSaving(key);
    toggleM.mutate({ mod, action, allowed: !has(mod, action) }, { onSettled: () => setSaving(null) });
  };

  const activeRoles = (roles as any[]).filter((r: any) => r.isActive !== false);
  const selectedRoleObj = (roles as any[]).find((r: any) => r.code === selectedRole);
  const isBase = selectedRoleObj?.isBase === true;

  // Count how many permissions the selected role has
  const totalAllowed = Object.values(rolePerms).flat().length;

  const COLORS = ['#f87171','#f59e0b','#10b981','#3b82f6','#8b5cf6','#06b6d4','#ec4899','#64748b','#a78bfa'];

  if (rolesLoading || (!selectedRole && (roles as any[]).length > 0)) {
    return <AppLayout><div style={{textAlign:'center',padding:60,color:'#64748b'}}>
      <p style={{fontSize:32,margin:'0 0 12px'}}>🔐</p>
      <p>Cargando perfiles de acceso…</p>
    </div></AppLayout>;
  }

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button onClick={() => navigate(-1)}
              style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
              ← Regresar
            </button>
            <div>
              <h1 style={{ fontSize:20, fontWeight:800, margin:'0 0 2px' }}>Perfiles de Acceso</h1>
              <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
                {companyName} — Solo Admin puede modificar estos permisos
              </p>
            </div>
          </div>
          <button onClick={() => setShowNewRole(true)}
            style={{ padding:'8px 18px', borderRadius:8, border:'none',
              background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
            + Nuevo perfil
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>

          {/* Panel izquierdo — lista de roles */}
          <div>
            <p style={{ fontSize:10, color:'#475569', textTransform:'uppercase',
              letterSpacing:1, fontWeight:700, margin:'0 0 8px' }}>
              Perfiles de {companyName}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {activeRoles.map((r: any) => {
                const rc = r.color || '#64748b';
                const perms = (allPerms as any)[r.code] || {};
                const count = Object.values(perms).flat().length;
                return (
                  <button key={r.code} onClick={() => setSelectedRole(r.code)}
                    style={{ padding:'10px 12px', borderRadius:8, border:`1px solid ${selectedRole===r.code ? rc : '#334155'}`,
                      background: selectedRole===r.code ? rc+'22' : '#1e293b',
                      cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:rc, flexShrink:0 }}/>
                      <span style={{ fontSize:12, fontWeight:600,
                        color: selectedRole===r.code ? rc : '#f1f5f9' }}>
                        {r.label}
                      </span>
                      {!r.isBase && (
                        <span style={{ fontSize:9, color:'#64748b', marginLeft:'auto' }}>✦</span>
                      )}
                    </div>
                    <p style={{ fontSize:10, color:'#475569', margin:'3px 0 0 16px' }}>
                      {count} permiso{count !== 1 ? 's' : ''} activo{count !== 1 ? 's' : ''}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Info del rol seleccionado */}
            {selectedRoleObj && (
              <div style={{ marginTop:12, padding:'10px 12px', background:'#0f172a',
                borderRadius:8, border:'1px solid #334155' }}>
                <p style={{ fontSize:11, fontWeight:700, color:selectedRoleObj.color||color,
                  margin:'0 0 4px' }}>{selectedRoleObj.label}</p>
                <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px', lineHeight:1.4 }}>
                  {selectedRoleObj.description || ROLE_DESCRIPTIONS[selectedRole] || 'Rol personalizado'}
                </p>
                {isBase
                  ? <p style={{ fontSize:10, color:'#334155' }}>Rol base del sistema</p>
                  : <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setConfirmDel({ code: selectedRole, action:'suspend', label: selectedRoleObj.label })}
                        style={{ flex:1, padding:'5px', borderRadius:6, border:'1px solid #f59e0b',
                          background:'none', color:'#f59e0b', cursor:'pointer', fontSize:10 }}>
                        ⏸ Suspender
                      </button>
                      <button onClick={() => setConfirmDel({ code: selectedRole, action:'delete', label: selectedRoleObj.label })}
                        style={{ flex:1, padding:'5px', borderRadius:6, border:'1px solid #f87171',
                          background:'none', color:'#f87171', cursor:'pointer', fontSize:10 }}>
                        🗑 Eliminar
                      </button>
                    </div>
                }
                <button onClick={() => { if(window.confirm(`¿Restaurar permisos por defecto para "${selectedRoleObj.label}"?`)) resetM.mutate(); }}
                  style={{ width:'100%', marginTop:6, padding:'5px', borderRadius:6,
                    border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:10 }}>
                  ↺ Restaurar defaults
                </button>
              </div>
            )}
          </div>

          {/* Panel derecho — permisos */}
          <div>
            {/* Header del panel */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, margin:'0 0 2px',
                  color: selectedRoleObj?.color || color }}>
                  {selectedRoleObj?.label || 'Selecciona un perfil'}
                </h2>
                <p style={{ fontSize:11, color:'#64748b', margin:0 }}>
                  {totalAllowed} acciones habilitadas · Los cambios aplican inmediatamente al hacer clic
                </p>
              </div>
              {/* Leyenda acciones */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {Object.entries(ACTION_LABELS).map(([key, val]) => (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:val.color }}/>
                    <span style={{ color:'#64748b' }}>{val.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {permsLoading ? (
              <p style={{ color:'#64748b', textAlign:'center', padding:40 }}>Cargando permisos…</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {(modules as any[]).map((mod: any) => {
                  const info = MODULE_LABELS[mod.key] || { label: mod.key, icon: '•' };
                  const hasAny = mod.actions.some((a: string) => has(mod.key, a));
                  return (
                    <div key={mod.key} style={{ background:'#1e293b', borderRadius:9,
                      border: hasAny ? `1px solid ${selectedRoleObj?.color || color}33` : '1px solid #334155',
                      padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        {/* Módulo nombre */}
                        <div style={{ width:200, flexShrink:0, display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ fontSize:14 }}>{info.icon}</span>
                          <span style={{ fontSize:12, fontWeight:600, color: hasAny ? '#f1f5f9' : '#64748b' }}>
                            {info.label}
                          </span>
                        </div>
                        {/* Acciones */}
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1 }}>
                          {mod.actions.map((action: string) => {
                            const allowed  = has(mod.key, action);
                            const key      = `${mod.key}:${action}`;
                            const busy     = saving === key;
                            const actInfo  = ACTION_LABELS[action] || { label:action, color:'#64748b' };
                            return (
                              <label key={action}
                                style={{ display:'flex', alignItems:'center', gap:5,
                                  padding:'4px 10px', borderRadius:6, cursor:'pointer',
                                  background: allowed ? actInfo.color+'22' : '#0f172a',
                                  border: `1px solid ${allowed ? actInfo.color+'66' : '#334155'}`,
                                  transition:'all 0.12s', userSelect:'none',
                                  opacity: busy ? 0.6 : 1 }}>
                                <input type="checkbox" checked={allowed} disabled={busy}
                                  onChange={() => toggle(mod.key, action)}
                                  style={{ width:12, height:12, accentColor:actInfo.color, cursor:'pointer' }}/>
                                <span style={{ fontSize:11, fontWeight:600,
                                  color: allowed ? actInfo.color : '#475569' }}>
                                  {busy ? '…' : actInfo.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal — Nuevo perfil */}
      {showNewRole && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:28,
            width:440, border:`1px solid ${color}44` }}>
            <h3 style={{ fontSize:16, fontWeight:800, margin:'0 0 4px', color }}>
              Nuevo perfil para {companyName}
            </h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 20px' }}>
              Este perfil existirá solo en esta empresa. Puedes copiar los permisos de otro perfil como punto de partida.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                  Nombre del perfil *
                </label>
                <input className="input-base" style={{ fontSize:14, fontWeight:600 }}
                  placeholder="Ej: Supervisor de Turno"
                  value={newRole.label} onChange={e => setNewRole(r=>({...r,label:e.target.value}))}
                  autoFocus/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                  ¿Para qué sirve este perfil? (opcional)
                </label>
                <input className="input-base" style={{ fontSize:13 }}
                  placeholder="Descripción breve..."
                  value={newRole.description} onChange={e => setNewRole(r=>({...r,description:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:6 }}>
                  Color de identificación
                </label>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewRole(r=>({...r,color:c}))}
                      style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${newRole.color===c?'#fff':'transparent'}`,
                        background:c, cursor:'pointer', transition:'border 0.1s' }}/>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                  Copiar permisos de (opcional)
                </label>
                <select className="input-base" style={{ fontSize:13 }}
                  value={newRole.copyFrom} onChange={e => setNewRole(r=>({...r,copyFrom:e.target.value}))}>
                  <option value="">— Empezar sin ningún permiso —</option>
                  {activeRoles.map((r: any) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
                <p style={{ fontSize:10, color:'#475569', margin:'4px 0 0' }}>
                  Puedes afinar los permisos individualmente después de crear el perfil
                </p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowNewRole(false)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={() => createRoleM.mutate()}
                disabled={createRoleM.isPending || !newRole.label.trim()}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background: newRole.label.trim() ? newRole.color : '#334155',
                  color:'#fff', cursor:newRole.label.trim()?'pointer':'not-allowed',
                  fontSize:13, fontWeight:700 }}>
                {createRoleM.isPending ? 'Creando…' : `Crear perfil`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Confirmar suspender/eliminar */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:28,
            width:400, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 12px',
              color: confirmDel.action==='delete' ? '#f87171' : '#f59e0b' }}>
              {confirmDel.action==='delete' ? '🗑 Eliminar perfil' : '⏸ Suspender perfil'}
            </h3>
            <p style={{ fontSize:13, color:'#94a3b8', margin:'0 0 8px' }}>
              <strong style={{color:'#f1f5f9'}}>{confirmDel.label}</strong>
            </p>
            <p style={{ fontSize:13, color:'#64748b', margin:'0 0 20px', lineHeight:1.5 }}>
              {confirmDel.action==='delete'
                ? 'Se eliminará permanentemente. Los usuarios con este perfil perderán acceso de inmediato.'
                : 'Los usuarios con este perfil no podrán acceder hasta que se reactive.'
              }
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button
                onClick={() => confirmDel.action==='delete'
                  ? deleteM.mutate(confirmDel.code)
                  : suspendM.mutate(confirmDel.code)}
                disabled={deleteM.isPending || suspendM.isPending}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background: confirmDel.action==='delete' ? '#f87171' : '#f59e0b',
                  color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                {(deleteM.isPending||suspendM.isPending) ? 'Procesando…'
                  : confirmDel.action==='delete' ? 'Sí, eliminar' : 'Sí, suspender'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
