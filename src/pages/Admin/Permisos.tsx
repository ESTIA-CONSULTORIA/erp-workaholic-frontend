import AppLayout from '../../components/layout/AppLayout';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api } from '../../lib/api';

const ROLES = [
  { code:'admin',         label:'Admin'          },
  { code:'administrador', label:'Administrador'  },
  { code:'gerente',       label:'Gerente'        },
  { code:'contador',      label:'Contador'       },
  { code:'cajero',        label:'Cajero'         },
  { code:'rh',            label:'RH'             },
  { code:'director',      label:'Director'       },
];

const GRUPOS: { label: string; items: { module: string; action: string; label: string }[] }[] = [
  { label:'Operaciones', items:[
    { module:'pos', action:'ver', label:'Ver POS' },
    { module:'pos', action:'crear', label:'Cobrar/Venta' },
    { module:'corte', action:'ver', label:'Ver corte' },
    { module:'corte', action:'crear', label:'Crear corte' },
    { module:'corte', action:'aprobar', label:'Validar corte' },
    { module:'oc', action:'ver', label:'Ver OC' },
    { module:'oc', action:'crear', label:'Crear OC' },
  ]},
  { label:'Catálogos', items:[
    { module:'catalogo', action:'ver', label:'Ver catálogo' },
    { module:'catalogo', action:'crear', label:'Crear productos' },
    { module:'catalogo', action:'editar', label:'Editar productos' },
    { module:'catalogo', action:'eliminar', label:'Eliminar productos' },
    { module:'inventario', action:'ver', label:'Ver inventario' },
    { module:'inventario', action:'editar', label:'Ajustar stock' },
  ]},
  { label:'Compras', items:[
    { module:'compras', action:'ver', label:'Ver compras' },
    { module:'compras', action:'crear', label:'Nueva compra' },
    { module:'compras', action:'eliminar', label:'Cancelar compra' },
    { module:'compras', action:'exportar', label:'Exportar compras' },
  ]},
  { label:'Finanzas', items:[
    { module:'gastos', action:'ver', label:'Ver gastos' },
    { module:'gastos', action:'crear', label:'Nuevo gasto' },
    { module:'gastos', action:'aprobar', label:'Aprobar gasto' },
    { module:'cxc', action:'ver', label:'Ver CxC' },
    { module:'cxc', action:'crear', label:'Nueva CxC' },
    { module:'cxp', action:'ver', label:'Ver CxP' },
    { module:'cxp', action:'crear', label:'Nueva CxP' },
    { module:'cxp', action:'editar', label:'Abonar CxP' },
  ]},
  { label:'Reportes', items:[
    { module:'reportes', action:'ver', label:'Ver ER/Flujo' },
    { module:'reportes', action:'exportar', label:'Exportar reportes' },
    { module:'gastos', action:'exportar', label:'Exportar gastos' },
    { module:'cxc', action:'exportar', label:'Exportar CxC' },
  ]},
  { label:'RH', items:[
    { module:'rh', action:'ver', label:'Ver empleados' },
    { module:'rh', action:'crear', label:'Nuevo empleado' },
    { module:'rh', action:'editar', label:'Editar empleado' },
    { module:'rh', action:'aprobar', label:'Aprobar permisos' },
    { module:'rh', action:'exportar', label:'Exportar RH' },
  ]},
  { label:'Palestra', items:[
    { module:'membresias', action:'ver', label:'Ver membresías' },
    { module:'membresias', action:'crear', label:'Nueva membresía' },
    { module:'membresias', action:'editar', label:'Editar membresía' },
    { module:'servicios', action:'ver', label:'Ver servicios' },
    { module:'servicios', action:'crear', label:'Crear servicio' },
    { module:'comisiones', action:'ver', label:'Ver comisiones' },
    { module:'comisiones', action:'aprobar', label:'Liberar comisiones' },
  ]},
  { label:'Administración', items:[
    { module:'admin', action:'ver', label:'Ver usuarios' },
    { module:'admin', action:'crear', label:'Crear usuario' },
    { module:'admin', action:'editar', label:'Editar usuario' },
    { module:'documentos', action:'ver', label:'Ver documentos' },
    { module:'documentos', action:'crear', label:'Subir documento' },
    { module:'permisos', action:'ver', label:'Ver permisos' },
    { module:'permisos', action:'editar', label:'Editar permisos' },
  ]},
];

export default function PermisosPage() {
  const navigate = useNavigate();
  const { activeCompany } = useERPStore();
  const color = activeCompany?.color || '#3b82f6';
  const companyId = activeCompany?.companyId;
  const qc = useQueryClient();

  const [selectedRole, setSelectedRole] = useState('cajero');
  const [saving, setSaving] = useState<string|null>(null);
  const [message, setMessage] = useState<{ type:'ok'|'error'; text:string }|null>(null);

  const permissionsQueryKey = useMemo(() => ['permissions-all', companyId], [companyId]);

  const { data: allPerms = {}, isLoading, error } = useQuery({
    queryKey: permissionsQueryKey,
    queryFn: () => api.get('/permissions/all', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
    retry: 1,
  });

  const rolePerms: Record<string,string[]> = (allPerms as any)[selectedRole] || {};

  const has = (module: string, action: string) =>
    (rolePerms[module] || []).includes(action);

  const toggleM = useMutation({
    mutationFn: ({ module, action, allowed }: any) =>
      api.put(`/permissions/roles/${selectedRole}/modules/${module}/actions/${action}`, {
        allowed,
        companyId,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: permissionsQueryKey });
      setMessage({ type:'ok', text:'Permiso guardado correctamente.' });
      setTimeout(() => setMessage(null), 2200);
    },
    onError: (e:any) => {
      setMessage({ type:'error', text: e.response?.data?.message || e.message || 'No se pudo guardar el permiso.' });
    },
  });

  const resetM = useMutation({
    mutationFn: () => api.post(`/permissions/roles/${selectedRole}/reset`, { companyId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: permissionsQueryKey });
      setMessage({ type:'ok', text:'Permisos restaurados para esta empresa.' });
      setTimeout(() => setMessage(null), 2200);
    },
    onError: (e:any) => setMessage({ type:'error', text: e.response?.data?.message || 'No se pudo restaurar.' }),
  });

  const toggle = (module: string, action: string) => {
    if (!companyId) {
      setMessage({ type:'error', text:'No hay empresa activa. Selecciona una empresa antes de editar permisos.' });
      return;
    }
    const key = `${module}:${action}`;
    setSaving(key);
    toggleM.mutate({ module, action, allowed: !has(module, action) }, { onSettled: () => setSaving(null) });
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:1180 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:12 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={() => navigate('/dashboard')} style={smallButton}>🏠 Home</button>
            <button onClick={() => navigate('/admin')} style={smallButton}>← Admin</button>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => navigate(-1)}
              style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
              ← Regresar
            </button>
            <h1 style={{ fontSize:19, fontWeight:700, margin:0 }}>Permisos por rol y empresa</h1>
          </div>
              <p style={{ fontSize:11, color:'#64748b', margin:'2px 0 0' }}>
                Empresa activa: {activeCompany?.companyName || activeCompany?.companyCode || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { if(confirm(`¿Restaurar defaults para ${selectedRole} en esta empresa?`)) resetM.mutate(); }}
            style={{ ...smallButton, color:'#f59e0b', borderColor:'#f59e0b55' }}
            disabled={resetM.isPending}
          >
            ↺ Restaurar defaults
          </button>
        </div>

        {message && (
          <div style={{
            padding:'8px 10px', borderRadius:8, marginBottom:10, fontSize:12,
            border:`1px solid ${message.type==='ok' ? '#10b98155' : '#f8717155'}`,
            background: message.type==='ok' ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.12)',
            color: message.type==='ok' ? '#34d399' : '#f87171',
          }}>
            {message.text}
          </div>
        )}

        {error && (
          <div style={{ padding:10, borderRadius:8, background:'rgba(248,113,113,0.12)', color:'#f87171', fontSize:12, marginBottom:10 }}>
            Error cargando permisos. Revisa backend o sesión.
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:4, marginBottom:10, background:'#0f172a', borderRadius:8, padding:4 }}>
          {ROLES.map(r => (
            <button key={r.code} onClick={() => { setSelectedRole(r.code); setMessage(null); }}
              style={{
                padding:'6px 4px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                background: selectedRole===r.code ? color : 'transparent',
                color: selectedRole===r.code ? '#fff' : '#64748b',
              }}>
              {r.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color:'#64748b', textAlign:'center', padding:30 }}>Cargando permisos…</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:6 }}>
            {GRUPOS.map(grupo => (
              <div key={grupo.label} style={{ background:'#1e293b', borderRadius:8, border:'1px solid #334155', overflow:'hidden' }}>
                <div style={{ background:'#334155', padding:'5px 8px' }}>
                  <p style={{ fontSize:10, fontWeight:800, color:'#f1f5f9', margin:0, textTransform:'uppercase', letterSpacing:0.4 }}>
                    {grupo.label}
                  </p>
                </div>
                <div style={{ padding:'5px 8px' }}>
                  {grupo.items.map(item => {
                    const allowed = has(item.module, item.action);
                    const key = `${item.module}:${item.action}`;
                    const busy = saving === key;
                    return (
                      <label key={key} title={`${item.module}.${item.action}`}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 0', cursor:'pointer', userSelect:'none', opacity: busy ? 0.6 : 1 }}>
                        <input
                          type="checkbox"
                          checked={allowed}
                          disabled={busy || !companyId}
                          onChange={() => toggle(item.module, item.action)}
                          style={{ width:12, height:12, accentColor:color, cursor:'pointer' }}
                        />
                        <span style={{ fontSize:10.5, color: allowed ? '#f1f5f9' : '#64748b', lineHeight:1.1 }}>
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const smallButton: React.CSSProperties = {
  background:'none',
  border:'1px solid #334155',
  color:'#94a3b8',
  cursor:'pointer',
  padding:'5px 10px',
  borderRadius:6,
  fontSize:12,
};
