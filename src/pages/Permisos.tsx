import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api } from '../lib/api';

const ROLES = [
  { code:'admin',          label:'Admin',           color:'#f87171' },
  { code:'administrador',  label:'Administrador',   color:'#f59e0b' },
  { code:'gerente',        label:'Gerente',         color:'#3b82f6' },
  { code:'contador',       label:'Contador',        color:'#8b5cf6' },
  { code:'cajero',         label:'Cajero',          color:'#10b981' },
  { code:'rh',             label:'RH',              color:'#06b6d4' },
  { code:'director',       label:'Director',        color:'#64748b' },
];

const MODULES: Record<string, { label: string; icon: string; actions: string[] }> = {
  pos:        { label:'POS',             icon:'🏪', actions:['ver','crear'] },
  gastos:     { label:'Gastos',          icon:'💸', actions:['ver','crear','editar','eliminar','aprobar','exportar'] },
  cxc:        { label:'CxC',             icon:'◷',  actions:['ver','crear','editar','eliminar','exportar'] },
  cxp:        { label:'CxP',             icon:'◶',  actions:['ver','crear','editar','eliminar','exportar'] },
  inventario: { label:'Inventario',      icon:'📦', actions:['ver','crear','editar','eliminar','exportar'] },
  compras:    { label:'Compras',         icon:'🛒', actions:['ver','crear','editar','eliminar','exportar'] },
  produccion: { label:'Producción',      icon:'⚙',  actions:['ver','crear','editar','eliminar'] },
  catalogo:   { label:'Catálogo',        icon:'≋',  actions:['ver','crear','editar','eliminar'] },
  oc:         { label:'OC',              icon:'📋', actions:['ver','crear','editar','eliminar'] },
  rh:         { label:'RH',              icon:'👥', actions:['ver','crear','editar','eliminar','aprobar','exportar'] },
  reportes:   { label:'Est. Financieros',icon:'∑',  actions:['ver','exportar'] },
  corte:      { label:'Corte de Caja',   icon:'🏧', actions:['ver','crear','editar','aprobar'] },
  admin:      { label:'Admin usuarios',  icon:'⊛',  actions:['ver','crear','editar','eliminar'] },
  membresias: { label:'Membresías',      icon:'👥', actions:['ver','crear','editar','eliminar'] },
  servicios:  { label:'Servicios',       icon:'⚙',  actions:['ver','crear','editar','eliminar'] },
  comisiones: { label:'Comisiones',      icon:'💰', actions:['ver','editar','aprobar'] },
};

const ACTION_COLOR: Record<string,string> = {
  ver:'#3b82f6', crear:'#10b981', editar:'#f59e0b',
  eliminar:'#f87171', aprobar:'#8b5cf6', exportar:'#06b6d4',
};

export default function PermisosPage() {
  const { activeCompany } = useERPStore();
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [selectedRole, setSelectedRole] = useState('cajero');
  const [saving, setSaving] = useState<string|null>(null);

  const { data: allPerms = {}, isLoading } = useQuery({
    queryKey: ['permissions-all'],
    queryFn:  () => api.get('/permissions/all').then(r => r.data),
  });

  const { data: defaults = {} } = useQuery({
    queryKey: ['permissions-defaults'],
    queryFn:  () => api.get('/permissions/defaults').then(r => r.data),
  });

  const rolePerms: Record<string,string[]> = (allPerms as any)[selectedRole] || {};

  const hasPermission = (module: string, action: string) => {
    return (rolePerms[module] || []).includes(action);
  };

  const toggleM = useMutation({
    mutationFn: ({ module, action, allowed }: any) =>
      api.put(`/permissions/roles/${selectedRole}/modules/${module}/actions/${action}`, { allowed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions-all'] }),
  });

  const resetM = useMutation({
    mutationFn: () => api.post(`/permissions/roles/${selectedRole}/reset`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['permissions-all'] }),
  });

  const toggle = (module: string, action: string) => {
    const current = hasPermission(module, action);
    const key = `${module}:${action}`;
    setSaving(key);
    toggleM.mutate({ module, action, allowed: !current }, { onSettled: () => setSaving(null) });
  };

  const defaultPerms: Record<string,string[]> = (defaults as any)[selectedRole] || {};

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Permisos por Rol</h1>
          <button onClick={() => { if(confirm(`¿Restaurar permisos por defecto para ${selectedRole}?`)) resetM.mutate(); }}
            disabled={resetM.isPending}
            style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ↺ Restaurar defaults
          </button>
        </div>

        {/* Selector de rol */}
        <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {ROLES.map(r => (
            <button key={r.code} onClick={() => setSelectedRole(r.code)}
              style={{ padding:'8px 16px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer',
                border:`2px solid ${selectedRole===r.code ? r.color : '#334155'}`,
                background: selectedRole===r.code ? r.color+'22' : 'transparent',
                color: selectedRole===r.code ? r.color : '#64748b' }}>
              {r.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color:'#64748b', textAlign:'center', padding:40 }}>Cargando permisos…</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:0, marginBottom:4 }}>
              <div style={{ fontSize:11, color:'#64748b', padding:'4px 12px', fontWeight:700, textTransform:'uppercase' }}>Módulo</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', padding:'4px 0' }}>
                {['ver','crear','editar','eliminar','aprobar','exportar'].map(a => (
                  <div key={a} style={{ width:80, textAlign:'center', fontSize:10, color:ACTION_COLOR[a], fontWeight:700, textTransform:'uppercase' }}>{a}</div>
                ))}
              </div>
            </div>

            {Object.entries(MODULES).map(([modKey, mod]) => {
              const allActions = ['ver','crear','editar','eliminar','aprobar','exportar'];
              const isDefault = JSON.stringify(defaultPerms[modKey]?.sort()) === JSON.stringify((rolePerms[modKey]||[]).sort());
              return (
                <div key={modKey} style={{ display:'grid', gridTemplateColumns:'200px 1fr',
                  background:'#1e293b', borderRadius:8, marginBottom:2,
                  border: isDefault ? '1px solid #334155' : `1px solid ${color}44` }}>
                  {/* Module name */}
                  <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:8, borderRight:'1px solid #334155' }}>
                    <span style={{ fontSize:16 }}>{mod.icon}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'#f1f5f9' }}>{mod.label}</span>
                    {!isDefault && <span style={{ fontSize:9, color, background:color+'22', padding:'1px 5px', borderRadius:3 }}>Modificado</span>}
                  </div>
                  {/* Actions */}
                  <div style={{ display:'flex', gap:4, padding:'8px', flexWrap:'wrap', alignItems:'center' }}>
                    {allActions.map(action => {
                      const applicable = mod.actions.includes(action);
                      const allowed    = hasPermission(modKey, action);
                      const isSaving   = saving === `${modKey}:${action}`;
                      return (
                        <button key={action}
                          onClick={() => applicable && toggle(modKey, action)}
                          disabled={!applicable || isSaving}
                          style={{ width:80, height:32, borderRadius:6, fontSize:11, fontWeight:600,
                            cursor: applicable ? 'pointer' : 'default',
                            border: applicable ? `1px solid ${allowed ? ACTION_COLOR[action] : '#334155'}` : '1px solid #1e293b',
                            background: applicable ? (allowed ? ACTION_COLOR[action]+'22' : '#0f172a') : '#0f172a',
                            color: applicable ? (allowed ? ACTION_COLOR[action] : '#334155') : '#1e293b',
                            transition:'all 0.15s', opacity: isSaving ? 0.5 : 1 }}>
                          {isSaving ? '…' : (applicable ? (allowed ? '✓' : '—') : '·')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leyenda */}
        <div style={{ marginTop:16, display:'flex', gap:16, flexWrap:'wrap' }}>
          {Object.entries(ACTION_COLOR).map(([action, col]) => (
            <div key={action} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
              <div style={{ width:12, height:12, borderRadius:2, background:col+'44', border:`1px solid ${col}` }}/>
              <span style={{ color:'#64748b', textTransform:'capitalize' }}>{action}</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#0f172a', border:'1px solid #334155' }}/>
            <span style={{ color:'#64748b' }}>Sin permiso</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#1e293b', border:'1px solid #1e293b' }}/>
            <span style={{ color:'#334155' }}>No aplica</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
