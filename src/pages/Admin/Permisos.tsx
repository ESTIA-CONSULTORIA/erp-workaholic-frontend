// ╔═══════════════════════════════════════════════════════════════╗
// ║  PERMISOS — Granular por módulo + acción individual          ║
// ║  Cada checkbox es independiente: ver sin crear, crear sin ver ║
// ║  Solo Admin puede modificar — efecto inmediato               ║
// ╚═══════════════════════════════════════════════════════════════╝
import AppLayout from '../../components/layout/AppLayout';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// ── Etiquetas y colores por acción ───────────────────────────────
const ACCIONES: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  ver:      { label:'Ver',      color:'#3b82f6', icon:'👁', desc:'Puede ver la lista y el detalle' },
  crear:    { label:'Crear',    color:'#10b981', icon:'➕', desc:'Puede registrar nuevos registros' },
  editar:   { label:'Editar',   color:'#f59e0b', icon:'✎',  desc:'Puede modificar registros existentes' },
  eliminar: { label:'Eliminar', color:'#f87171', icon:'🗑', desc:'Puede eliminar o cancelar registros' },
  aprobar:  { label:'Aprobar',  color:'#8b5cf6', icon:'✔',  desc:'Puede aprobar, validar o publicar' },
  exportar: { label:'Exportar', color:'#06b6d4', icon:'⬇',  desc:'Puede descargar o exportar datos' },
};

// ── Etiquetas e iconos por módulo ────────────────────────────────
const MODULOS: Record<string, { label: string; icon: string; grupo: string }> = {
  pos:          { label:'Punto de Venta',       icon:'🏪', grupo:'Operación' },
  corte:        { label:'Corte de Caja',         icon:'🏧', grupo:'Operación' },
  oc:           { label:'Órdenes de Compra',     icon:'📋', grupo:'Operación' },
  catalogo:     { label:'Catálogo Productos',    icon:'≋',  grupo:'Inventario' },
  inventario:   { label:'Inventario / Stock',    icon:'📦', grupo:'Inventario' },
  compras:      { label:'Compras de Insumos',    icon:'🛒', grupo:'Inventario' },
  produccion:   { label:'Producción (Lotes)',    icon:'⚙',  grupo:'Inventario' },
  surtido:      { label:'Surtido de Turno',      icon:'📤', grupo:'Inventario' },
  alumnos:      { label:'Alumnos y Prepago',     icon:'👨‍🎓', grupo:'Inventario' },
  gastos:       { label:'Gastos',                icon:'💸', grupo:'Finanzas' },
  cxc:          { label:'Cuentas por Cobrar',    icon:'◧',  grupo:'Finanzas' },
  cxp:          { label:'Cuentas por Pagar',     icon:'◨',  grupo:'Finanzas' },
  reportes:     { label:'Estados Financieros',   icon:'Σ',  grupo:'Finanzas' },
  membresias:   { label:'Membresías',            icon:'🏅', grupo:'Servicios' },
  servicios:    { label:'Catálogo Servicios',    icon:'🎯', grupo:'Servicios' },
  comisiones:   { label:'Comisiones Coaches',    icon:'💎', grupo:'Servicios' },
  espacios:     { label:'Espacios / Salas',      icon:'🚪', grupo:'Servicios' },
  reservaciones:{ label:'Reservaciones',         icon:'📅', grupo:'Servicios' },
  rh:           { label:'Recursos Humanos',      icon:'👥', grupo:'RH' },
  nomina:       { label:'Nómina',                icon:'💰', grupo:'RH' },
  documentos:   { label:'Documentos',            icon:'📄', grupo:'RH' },
  admin:        { label:'Administración',        icon:'⊛',  grupo:'Admin' },
};

const GRUPOS_ORDER = ['Operación', 'Inventario', 'Finanzas', 'Servicios', 'RH', 'Admin'];

export default function PermisosPage() {
  const { activeCompany } = useERPStore();
  const cid         = activeCompany?.companyId;
  const companyCode = activeCompany?.companyCode || 'MACHETE';
  const companyName = activeCompany?.companyName || '';
  const color       = activeCompany?.color || '#3b82f6';
  const qc          = useQueryClient();
  const navigate    = useNavigate();

  const [selectedRole, setSelectedRole] = useState('');
  const [saving,       setSaving]       = useState<string | null>(null);
  const [showNewRole,  setShowNewRole]  = useState(false);
  const [confirmDel,   setConfirmDel]   = useState<any>(null);
  const [newRole,      setNewRole]      = useState({ label: '', color: '#64748b', description: '', copyFrom: '' });
  const [busqueda,     setBusqueda]     = useState('');

  // ── Queries ───────────────────────────────────────────────────
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['company-roles', cid],
    queryFn:  () => api.get(`/companies/${cid}/permissions/roles?companyCode=${companyCode}`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['company-modules', companyCode],
    queryFn:  () => api.get(`/companies/${cid}/permissions/modules?companyCode=${companyCode}`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: allPerms = {}, isLoading: permsLoading } = useQuery({
    queryKey: ['company-perms', cid, selectedRole],
    queryFn:  () => api.get(`/companies/${cid}/permissions/roles/${selectedRole}`).then(r => r.data),
    enabled:  !!cid && !!selectedRole,
    staleTime: 0,
  });

  // Set initial role
  useEffect(() => {
    if (!selectedRole && (roles as any[]).length > 0) {
      setSelectedRole((roles as any[])[0].code);
    }
  }, [roles, selectedRole]);

  // ── Mutations ─────────────────────────────────────────────────
  const toggleM = useMutation({
    mutationFn: ({ mod, action, allowed }: any) =>
      api.put(`/companies/${cid}/permissions/roles/${selectedRole}/modules/${mod}/actions/${action}`, { allowed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-perms', cid, selectedRole] }),
  });

  const resetM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/permissions/roles/${selectedRole}/reset`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['company-perms', cid, selectedRole] }),
  });

  const createRoleM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/permissions/roles`, { ...newRole, companyId: cid }),
    onSuccess: (d: any) => {
      const code = d.data?.code || d.code;
      setShowNewRole(false);
      setNewRole({ label: '', color: '#64748b', description: '', copyFrom: '' });
      qc.invalidateQueries({ queryKey: ['company-roles', cid] });
      if (code) setTimeout(() => setSelectedRole(code), 300);
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error al crear perfil'),
  });

  const suspendM = useMutation({
    mutationFn: (code: string) => api.put(`/companies/${cid}/permissions/roles/${code}/suspend`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-roles', cid] }); setConfirmDel(null); setSelectedRole(''); },
  });

  const deleteM = useMutation({
    mutationFn: (code: string) => api.delete(`/companies/${cid}/permissions/roles/${code}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-roles', cid] }); setConfirmDel(null); setSelectedRole(''); },
    onError: (e: any) => alert(e.response?.data?.message || 'Error'),
  });

  // ── Helpers ────────────────────────────────────────────────────
  const has = (mod: string, action: string): boolean =>
    Array.isArray(allPerms) ? false : ((allPerms as any)[mod] || []).includes(action);

  const toggle = (mod: string, action: string) => {
    const key = `${mod}:${action}`;
    setSaving(key);
    toggleM.mutate({ mod, action, allowed: !has(mod, action) }, { onSettled: () => setSaving(null) });
  };

  const moduleCount = (mod: string) =>
    (modules as any[]).find((m: any) => m.key === mod)?.actions?.filter((a: string) => has(mod, a)).length || 0;

  const activeRoles = (roles as any[]).filter((r: any) => r.isActive !== false);
  const selectedRoleObj = activeRoles.find((r: any) => r.code === selectedRole);
  const isBase = selectedRoleObj?.isBase === true;

  // Group modules by category
  const modulesByGrupo: Record<string, any[]> = {};
  (modules as any[])
    .filter(m => !busqueda || MODULOS[m.key]?.label.toLowerCase().includes(busqueda.toLowerCase()))
    .forEach((m: any) => {
      const grupo = MODULOS[m.key]?.grupo || 'Otros';
      if (!modulesByGrupo[grupo]) modulesByGrupo[grupo] = [];
      modulesByGrupo[grupo].push(m);
    });

  const COLORS = ['#f87171','#f59e0b','#10b981','#3b82f6','#8b5cf6','#06b6d4','#ec4899','#64748b'];

  if (rolesLoading || (!selectedRole && activeRoles.length > 0)) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <p style={{ fontSize: 32, margin: '0 0 12px' }}>🔐</p>
          <p>Cargando perfiles de acceso…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 1100 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => navigate(-1)}
              style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #334155',
                background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>
              ← Regresar
            </button>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Perfiles de Acceso</h1>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                {companyName} · Cada permiso es independiente · Cambios inmediatos
              </p>
            </div>
          </div>
          <button onClick={() => setShowNewRole(true)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
              background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            + Nuevo perfil
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>

          {/* ── Panel izquierdo: lista de roles ── */}
          <div>
            <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase',
              letterSpacing: 1, fontWeight: 700, margin: '0 0 8px' }}>
              Perfiles en {companyName}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {activeRoles.map((r: any) => {
                const rc = r.color || '#64748b';
                const perms = (allPerms as any);
                const actCount = Object.values(perms || {}).flat().length;
                return (
                  <button key={r.code} onClick={() => setSelectedRole(r.code)}
                    style={{ padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: `1px solid ${selectedRole === r.code ? rc : '#334155'}`,
                      background: selectedRole === r.code ? rc + '18' : '#1e293b',
                      transition: 'all 0.12s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600,
                        color: selectedRole === r.code ? rc : '#f1f5f9', flex: 1 }}>
                        {r.label}
                      </span>
                      {!r.isBase && <span style={{ fontSize: 9, color: '#64748b' }}>✦</span>}
                    </div>
                    {selectedRole === r.code && (
                      <p style={{ fontSize: 10, color: '#475569', margin: '3px 0 0 15px' }}>
                        {(modules as any[]).reduce((t, m) =>
                          t + m.actions.filter((a: string) => has(m.key, a)).length, 0
                        )} acciones activas
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Acciones del rol */}
            {selectedRoleObj && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {!isBase && (
                  <>
                    <button onClick={() => setConfirmDel({ code: selectedRole, action: 'suspend', label: selectedRoleObj.label })}
                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #f59e0b',
                        background: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 11 }}>
                      ⏸ Suspender perfil
                    </button>
                    <button onClick={() => setConfirmDel({ code: selectedRole, action: 'delete', label: selectedRoleObj.label })}
                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #f87171',
                        background: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11 }}>
                      🗑 Eliminar perfil
                    </button>
                  </>
                )}
                <button onClick={() => { if (window.confirm(`¿Restaurar permisos por defecto de "${selectedRoleObj.label}"?`)) resetM.mutate(); }}
                  style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #334155',
                    background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
                  ↺ Restaurar defaults
                </button>
                {isBase && (
                  <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', margin: '4px 0 0' }}>
                    Rol base del sistema
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Panel derecho: permisos granulares ── */}
          <div>
            {/* Leyenda */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
                {selectedRoleObj?.label}
              </span>
              <span style={{ fontSize: 11, color: '#475569' }}>—</span>
              {Object.entries(ACCIONES).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: val.color + '33',
                    border: `1px solid ${val.color}` }} />
                  <span style={{ fontSize: 11, color: '#64748b' }}>{val.label}</span>
                </div>
              ))}
              <input placeholder="Buscar módulo…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: '1px solid #334155',
                  background: '#0f172a', color: '#f1f5f9', fontSize: 11, width: 140 }} />
            </div>

            {permsLoading ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Cargando permisos…</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {GRUPOS_ORDER.filter(g => modulesByGrupo[g]?.length > 0).map(grupo => (
                  <div key={grupo}>
                    {/* Grupo header */}
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#475569',
                      textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 6px' }}>
                      {grupo}
                    </p>

                    {/* Módulos del grupo */}
                    <div style={{ background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden' }}>
                      {modulesByGrupo[grupo].map((mod: any, modIdx: number) => {
                        const info = MODULOS[mod.key] || { label: mod.key, icon: '•', grupo: '' };
                        const anyAllowed = mod.actions.some((a: string) => has(mod.key, a));

                        return (
                          <div key={mod.key}
                            style={{ display: 'flex', alignItems: 'center', gap: 0,
                              borderTop: modIdx > 0 ? '1px solid #0f172a' : 'none',
                              padding: '10px 14px',
                              background: anyAllowed ? color + '08' : 'transparent',
                              transition: 'background 0.1s' }}>

                            {/* Nombre del módulo */}
                            <div style={{ width: 180, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{info.icon}</span>
                              <span style={{ fontSize: 12, fontWeight: 600,
                                color: anyAllowed ? '#f1f5f9' : '#64748b' }}>
                                {info.label}
                              </span>
                            </div>

                            {/* Checkboxes por acción */}
                            <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                              {mod.actions.map((action: string) => {
                                const allowed = has(mod.key, action);
                                const key     = `${mod.key}:${action}`;
                                const busy    = saving === key;
                                const ac      = ACCIONES[action] || { label: action, color: '#64748b', icon: '•', desc: '' };

                                return (
                                  <label key={action}
                                    title={ac.desc}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5,
                                      padding: '5px 10px', borderRadius: 6, cursor: busy ? 'wait' : 'pointer',
                                      userSelect: 'none', transition: 'all 0.1s',
                                      background: allowed ? ac.color + '20' : '#0f172a',
                                      border: `1px solid ${allowed ? ac.color + '80' : '#334155'}`,
                                      opacity: busy ? 0.6 : 1, minWidth: 80 }}>
                                    <input type="checkbox"
                                      checked={allowed}
                                      disabled={busy}
                                      onChange={() => toggle(mod.key, action)}
                                      style={{ width: 13, height: 13, accentColor: ac.color,
                                        cursor: 'pointer', flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, fontWeight: allowed ? 600 : 400,
                                      color: allowed ? ac.color : '#475569' }}>
                                      {busy ? '…' : ac.icon + ' ' + ac.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>

                            {/* Resumen rápido */}
                            <div style={{ width: 60, textAlign: 'right', flexShrink: 0 }}>
                              {anyAllowed ? (
                                <span style={{ fontSize: 10, color: '#475569' }}>
                                  {mod.actions.filter((a: string) => has(mod.key, a)).length}/{mod.actions.length}
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: '#334155' }}>sin acceso</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal nuevo perfil ── */}
      {showNewRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24,
            width: 440, border: `1px solid ${color}44` }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color }}>
              Nuevo perfil — {companyName}
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 18px' }}>
              Existirá solo en esta empresa. Puedes copiar permisos de otro perfil como base.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Nombre *</label>
                <input className="input-base" style={{ fontSize: 14, fontWeight: 600 }}
                  placeholder="Ej: Supervisor de Turno"
                  value={newRole.label} onChange={e => setNewRole(r => ({ ...r, label: e.target.value }))}
                  autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Descripción</label>
                <input className="input-base" style={{ fontSize: 13 }}
                  placeholder="Para qué sirve…"
                  value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewRole(r => ({ ...r, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${newRole.color === c ? '#fff' : 'transparent'}`,
                        background: c, cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>
                  Copiar permisos de (opcional)
                </label>
                <select className="input-base" style={{ fontSize: 13 }}
                  value={newRole.copyFrom} onChange={e => setNewRole(r => ({ ...r, copyFrom: e.target.value }))}>
                  <option value="">— Sin permisos iniciales —</option>
                  {activeRoles.map((r: any) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewRole(false)}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #334155',
                  background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => createRoleM.mutate()}
                disabled={createRoleM.isPending || !newRole.label.trim()}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                  background: newRole.label.trim() ? newRole.color : '#334155',
                  color: '#fff', cursor: newRole.label.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700 }}>
                {createRoleM.isPending ? 'Creando…' : 'Crear perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar suspender/eliminar ── */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24,
            width: 380, border: '1px solid #334155' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px',
              color: confirmDel.action === 'delete' ? '#f87171' : '#f59e0b' }}>
              {confirmDel.action === 'delete' ? '🗑 Eliminar perfil' : '⏸ Suspender perfil'}
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.5 }}>
              <strong style={{ color: '#f1f5f9' }}>{confirmDel.label}</strong>
              <br />
              {confirmDel.action === 'delete'
                ? 'Se eliminará permanentemente. Los usuarios perderán acceso de inmediato.'
                : 'Los usuarios no podrán acceder hasta que se reactive.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #334155',
                  background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button
                onClick={() => confirmDel.action === 'delete'
                  ? deleteM.mutate(confirmDel.code)
                  : suspendM.mutate(confirmDel.code)}
                disabled={deleteM.isPending || suspendM.isPending}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                  background: confirmDel.action === 'delete' ? '#f87171' : '#f59e0b',
                  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {deleteM.isPending || suspendM.isPending ? 'Procesando…'
                  : confirmDel.action === 'delete' ? 'Sí, eliminar' : 'Sí, suspender'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
