import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const TIPOS = ['MEMBRESIA','SERVICIO','CLASE','CLINICA','RENTA','MANTENIMIENTO'];
const TIPO_ICON: Record<string,string> = { MEMBRESIA:'👥',SERVICIO:'⚙',CLASE:'🎾',CLINICA:'🏆',RENTA:'📅',MANTENIMIENTO:'🔄' };

export default function ServiciosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#10b981';
  const qc    = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [editSrv, setEditSrv] = useState<any>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [form, setForm] = useState({ name:'', description:'', type:'SERVICIO', price:'', duration:'', coachable:false, coachRate:'' });
  const set = (k:string, v:any) => setForm(f => ({...f,[k]:v}));

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', cid],
    queryFn:  () => api.get(`/companies/${cid}/palestra/services`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/services`, {
      ...form, price: Number(form.price), duration: form.duration ? Number(form.duration) : null,
      coachRate: form.coachable ? Number(form.coachRate) : null,
    }),
    onSuccess: () => { setShowNew(false); setForm({ name:'',description:'',type:'SERVICIO',price:'',duration:'',coachable:false,coachRate:'' }); qc.invalidateQueries({ queryKey: ['services', cid] }); },
  });

  const toggleM = useMutation({
    mutationFn: ({ id, isActive }: any) => api.put(`/companies/${cid}/palestra/services/${id}/toggle`, { isActive }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['services', cid] }),
  });

  const updateM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/palestra/services/${editSrv.id}`, {
      ...editSrv, price: Number(editSrv.price), coachRate: editSrv.coachable ? Number(editSrv.coachRate) : null,
    }),
    onSuccess: () => { setEditSrv(null); qc.invalidateQueries({ queryKey: ['services', cid] }); },
  });

  const filtered = (services as any[]).filter(s => !filtroTipo || s.type === filtroTipo);

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Catálogo de Servicios</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }} onClick={() => setShowNew(s => !s)}>
            {showNew ? '✕ Cancelar' : '+ Nuevo servicio'}
          </button>
        </div>

        {/* Form nuevo servicio */}
        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nuevo servicio</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[['Nombre *','name','text'],['Descripción','description','text'],['Precio *','price','number'],['Duración (min)','duration','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11,color:'#64748b',display:'block',marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:13 }} value={(form as any)[k]} onChange={e => set(k, e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11,color:'#64748b',display:'block',marginBottom:3 }}>Tipo</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.type} onChange={e => set('type', e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:6,cursor:'pointer' }}>
                  <input type="checkbox" checked={form.coachable} onChange={e => set('coachable', e.target.checked)}/>
                  Genera comisión de coach
                </label>
                {form.coachable && (
                  <input type="number" className="input-base" style={{ fontSize:12 }} placeholder="Monto comisión"
                    value={form.coachRate} onChange={e => set('coachRate', e.target.value)}/>
                )}
              </div>
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()} disabled={crearM.isPending || !form.name || !form.price}>
              {crearM.isPending ? 'Creando…' : 'Crear servicio'}
            </button>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          <button onClick={() => setFiltroTipo('')}
            style={{ padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer',
              border:`1px solid ${!filtroTipo?color:'#334155'}`, background:!filtroTipo?color+'22':'transparent',
              color:!filtroTipo?color:'#64748b' }}>Todos</button>
          {TIPOS.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              style={{ padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer',
                border:`1px solid ${filtroTipo===t?color:'#334155'}`, background:filtroTipo===t?color+'22':'transparent',
                color:filtroTipo===t?color:'#64748b' }}>
              {TIPO_ICON[t]} {t}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr><th>Tipo</th><th>Nombre</th><th>Duración</th><th style={{textAlign:'right'}}>Precio</th><th>Coach</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {filtered.map((s:any) => (
                <tr key={s.id}>
                  <td><span style={{fontSize:12}}>{TIPO_ICON[s.type]} {s.type}</span></td>
                  <td style={{fontWeight:500}}>
                    {s.name}
                    {s.description && <p style={{fontSize:11,color:'#64748b',margin:0}}>{s.description}</p>}
                  </td>
                  <td style={{fontSize:12,color:'#64748b'}}>{s.duration ? `${s.duration} min` : '—'}</td>
                  <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(s.price)}</td>
                  <td style={{fontSize:12}}>
                    {s.coachable ? <span style={{color:'#f59e0b'}}>★ {fmt(s.coachRate)}</span> : <span style={{color:'#334155'}}>—</span>}
                  </td>
                  <td>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,background:s.isActive?'#10b98122':'#f8717122',color:s.isActive?'#10b981':'#f87171'}}>
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={() => setEditSrv({...s})} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>Editar</button>
                      <button onClick={() => toggleM.mutate({id:s.id, isActive:!s.isActive})}
                        style={{background:'none',border:'none',color:s.isActive?'#f87171':'#10b981',cursor:'pointer',fontSize:12}}>
                        {s.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar */}
      {editSrv && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:460,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>Editar servicio</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[['Nombre','name','text'],['Precio','price','number'],['Descripción','description','text'],['Duración (min)','duration','number']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} className="input-base" style={{fontSize:13}} value={editSrv[k]||''}
                    onChange={e => setEditSrv((s:any) => ({...s,[k]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Tipo</label>
                <select className="input-base" style={{fontSize:13}} value={editSrv.type}
                  onChange={e => setEditSrv((s:any) => ({...s,type:e.target.value}))}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={editSrv.coachable}
                    onChange={e => setEditSrv((s:any) => ({...s,coachable:e.target.checked}))}/>
                  Genera comisión
                </label>
                {editSrv.coachable && (
                  <input type="number" className="input-base" style={{fontSize:12}} placeholder="Monto comisión"
                    value={editSrv.coachRate||''} onChange={e => setEditSrv((s:any) => ({...s,coachRate:e.target.value}))}/>
                )}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={() => setEditSrv(null)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,background:color,fontSize:13}} onClick={() => updateM.mutate()} disabled={updateM.isPending}>
                {updateM.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
