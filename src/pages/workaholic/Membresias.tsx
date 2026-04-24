import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const STATUS_COLOR: Record<string,string> = { ACTIVA:'#10b981', VENCIDA:'#f87171', SUSPENDIDA:'#f59e0b', CANCELADA:'#64748b' };

export default function WorkaholicMembresiasPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [vista,      setVista]      = useState<'lista'|'nueva'|'tipos'>('lista');
  const [search,     setSearch]     = useState('');
  const [filtroSt,   setFiltroSt]   = useState('');
  const [detalle,    setDetalle]    = useState<any>(null);
  const [pagoModal,  setPagoModal]  = useState<any>(null);
  const [pagoForm,   setPagoForm]   = useState({ amount:'', paymentMethod:'TRANSFERENCIA', reference:'', isRenewal:true });

  const [form, setForm] = useState({
    membershipTypeId:'', holderName:'', holderEmail:'', holderPhone:'',
    holderRfc:'', companyName:'', startDate:new Date().toISOString().slice(0,10),
    paymentMethod:'TRANSFERENCIA', paidNow:true, notes:'',
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const [tipoForm, setTipoForm] = useState({ name:'', type:'COWORKING', duration:'MENSUAL', price:'', hoursIncluded:'0', accessDays:'LUNES-VIERNES', description:'' });

  const { data: types = [] } = useQuery({
    queryKey: ['workaholic-types', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/membership-types`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['workaholic-memberships', cid, search, filtroSt],
    queryFn:  () => {
      let url = `/companies/${cid}/workaholic/memberships?`;
      if (search)   url += `search=${search}&`;
      if (filtroSt) url += `status=${filtroSt}`;
      return api.get(url).then(r=>r.data);
    },
    enabled: !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/memberships`, form),
    onSuccess: () => { setVista('lista'); qc.invalidateQueries({ queryKey: ['workaholic-memberships', cid] }); },
  });

  const crearTipoM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/membership-types`, { ...tipoForm, price:Number(tipoForm.price), hoursIncluded:Number(tipoForm.hoursIncluded) }),
    onSuccess: () => { setVista('lista'); qc.invalidateQueries({ queryKey: ['workaholic-types', cid] }); },
  });

  const pagarM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/memberships/${pagoModal?.id}/payments`, { ...pagoForm, amount:Number(pagoForm.amount) }),
    onSuccess: () => { setPagoModal(null); qc.invalidateQueries({ queryKey: ['workaholic-memberships', cid] }); },
  });

  const selectedType = (types as any[]).find((t:any) => t.id === form.membershipTypeId);

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Membresías</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setVista(v=>v==='tipos'?'lista':'tipos')}
              style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${color}`, background:'none', color, cursor:'pointer', fontSize:12 }}>
              ⚙ Tipos
            </button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => setVista(v=>v==='nueva'?'lista':'nueva')}>
              {vista==='nueva' ? '← Volver' : '+ Nueva membresía'}
            </button>
          </div>
        </div>

        {/* Tipos */}
        {vista === 'tipos' && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Tipos de membresía</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {(types as any[]).map((t:any) => (
                <div key={t.id} style={{ background:'#0f172a', borderRadius:8, padding:12, border:'1px solid #334155' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px' }}>{t.name}</p>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px' }}>{t.type} · {t.duration}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>Precio</span>
                    <span style={{ fontWeight:700, color }}>{fmt(t.price)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>Horas sala</span>
                    <span style={{ color:'#94a3b8' }}>{t.hoursIncluded}h</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>Acceso</span>
                    <span style={{ color:'#94a3b8', fontSize:10 }}>{t.accessDays}</span>
                  </div>
                </div>
              ))}
            </div>
            <h4 style={{ fontSize:13, fontWeight:600, margin:'0 0 10px', color:'#64748b' }}>+ Nuevo tipo</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              {[['Nombre *','name','text'],['Precio *','price','number'],['Horas sala incluidas','hoursIncluded','number'],['Días de acceso','accessDays','text']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:12 }}
                    value={(tipoForm as any)[k]} onChange={e => setTipoForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Tipo</label>
                <select className="input-base" style={{ fontSize:12 }} value={tipoForm.type}
                  onChange={e => setTipoForm(f=>({...f,type:e.target.value}))}>
                  {['OFICINA','COWORKING','VIRTUAL','SALA_PACK'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Duración</label>
                <select className="input-base" style={{ fontSize:12 }} value={tipoForm.duration}
                  onChange={e => setTipoForm(f=>({...f,duration:e.target.value}))}>
                  {['MENSUAL','TRIMESTRAL','SEMESTRAL','ANUAL'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearTipoM.mutate()} disabled={crearTipoM.isPending || !tipoForm.name || !tipoForm.price}>
              {crearTipoM.isPending ? 'Creando…' : 'Crear tipo'}
            </button>
          </div>
        )}

        {/* Nueva membresía */}
        {vista === 'nueva' && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nueva membresía</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Tipo de membresía *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.membershipTypeId}
                  onChange={e => set('membershipTypeId', e.target.value)}>
                  <option value="">— Seleccionar tipo —</option>
                  {(types as any[]).map((t:any) => (
                    <option key={t.id} value={t.id}>{t.name} · {t.duration} · {fmt(t.price)}</option>
                  ))}
                </select>
              </div>
              {selectedType && (
                <div style={{ gridColumn:'span 2', background:'#0f172a', borderRadius:8, padding:'8px 14px',
                  border:`1px solid ${color}33`, display:'flex', gap:24 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Precio: <strong style={{color}}>{fmt(selectedType.price)}</strong></span>
                  <span style={{ fontSize:12, color:'#64748b' }}>Duración: <strong style={{color:'#f1f5f9'}}>{selectedType.duration}</strong></span>
                  <span style={{ fontSize:12, color:'#64748b' }}>Horas sala: <strong style={{color:'#94a3b8'}}>{selectedType.hoursIncluded}h</strong></span>
                </div>
              )}
              {[['Nombre del titular *','holderName'],['Empresa','companyName'],['Email','holderEmail'],['Teléfono','holderPhone'],['RFC','holderRfc']].map(([l,k]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{l}</label>
                  <input className="input-base" style={{ fontSize:13 }} value={(form as any)[k]}
                    onChange={e => set(k, e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Inicio *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Método de pago</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.paymentMethod}
                  onChange={e => set('paymentMethod', e.target.value)}>
                  {['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO'].map(m => (
                    <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:12, color:'#94a3b8', display:'flex', gap:8, alignItems:'center', cursor:'pointer' }}>
                  <input type="checkbox" checked={form.paidNow} onChange={e => set('paidNow', e.target.checked)} style={{ accentColor:color }}/>
                  Registrar pago al crear membresía
                </label>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setVista('lista')}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()}
                disabled={crearM.isPending || !form.membershipTypeId || !form.holderName}>
                {crearM.isPending ? 'Creando…' : 'Crear membresía'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {vista === 'lista' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input className="input-base" style={{ flex:1, fontSize:12 }}
                placeholder="🔍 Buscar por nombre, empresa o folio..."
                value={search} onChange={e => setSearch(e.target.value)}/>
              <select className="input-base" style={{ fontSize:12, minWidth:140 }}
                value={filtroSt} onChange={e => setFiltroSt(e.target.value)}>
                <option value="">Todos</option>
                {['ACTIVA','VENCIDA','SUSPENDIDA','CANCELADA'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead><tr>
                  <th>Folio</th><th>Titular</th><th>Tipo</th>
                  <th>Vigencia</th><th>Horas</th><th>Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'#64748b'}}>Cargando…</td></tr>}
                  {!isLoading && (memberships as any[]).length===0 && (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin membresías</td></tr>
                  )}
                  {(memberships as any[]).map((m:any) => {
                    const st = STATUS_COLOR[m.status]||'#64748b';
                    const hoursLeft = Number(m.membershipType?.hoursIncluded||0) - Number(m.hoursUsed||0);
                    return (
                      <tr key={m.id} style={{ cursor:'pointer' }} onClick={() => setDetalle(m)}>
                        <td><code style={{ fontSize:11, background:'#334155', padding:'2px 6px', borderRadius:4 }}>{m.folio}</code></td>
                        <td style={{ fontWeight:500 }}>
                          {m.holderName}
                          {m.companyName && <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{m.companyName}</p>}
                        </td>
                        <td style={{ fontSize:12 }}>{m.membershipType?.name}</td>
                        <td style={{ fontSize:12 }}>
                          {fmtDate(m.startDate)} → {fmtDate(m.endDate)}
                        </td>
                        <td style={{ textAlign:'center', fontSize:12, color:hoursLeft<=0?'#f87171':color }}>
                          {hoursLeft}h / {m.membershipType?.hoursIncluded}h
                        </td>
                        <td>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                            background:st+'22', color:st, fontWeight:600 }}>{m.status}</span>
                        </td>
                        <td>
                          <button onClick={e => { e.stopPropagation(); setPagoModal(m); setPagoForm({ amount:String(m.membershipType?.price||0), paymentMethod:'TRANSFERENCIA', reference:'', isRenewal:true }); }}
                            style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                            💳 Cobrar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:520, maxHeight:'85vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0, color }}>{detalle.folio} — {detalle.holderName}</h3>
              <button onClick={() => setDetalle(null)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {[
                ['Tipo', detalle.membershipType?.name],
                ['Duración', detalle.membershipType?.duration],
                ['Inicio', fmtDate(detalle.startDate)],
                ['Vencimiento', fmtDate(detalle.endDate)],
                ['Empresa', detalle.companyName||'—'],
                ['Email', detalle.holderEmail||'—'],
              ].map(([l,v]) => (
                <div key={l} style={{ background:'#0f172a', borderRadius:6, padding:'6px 10px' }}>
                  <p style={{ fontSize:9, color:'#64748b', margin:'0 0 2px', textTransform:'uppercase' }}>{l}</p>
                  <p style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', margin:0 }}>{v}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', margin:'0 0 8px' }}>Últimos pagos</p>
            {(detalle.payments||[]).map((p:any) => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #334155', fontSize:12 }}>
                <span style={{ color:'#94a3b8' }}>{p.concept} · {p.period}</span>
                <span style={{ fontWeight:600, color:'#10b981' }}>{fmt(p.amount)}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={() => { setDetalle(null); setPagoModal(detalle); setPagoForm({ amount:String(detalle.membershipType?.price||0), paymentMethod:'TRANSFERENCIA', reference:'', isRenewal:true }); }}
                style={{ flex:1, padding:'9px', borderRadius:8, border:'none', background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                💳 Cobrar renovación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {pagoModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:360, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px' }}>Cobrar membresía</h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 16px' }}>{pagoModal.folio} — {pagoModal.holderName}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              {[['Monto','amount','number'],['Referencia','reference','text']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:13 }}
                    value={(pagoForm as any)[k]} onChange={e => setPagoForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Método</label>
                <select className="input-base" style={{ fontSize:13 }} value={pagoForm.paymentMethod}
                  onChange={e => setPagoForm(f=>({...f,paymentMethod:e.target.value}))}>
                  {['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO'].map(m=><option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <label style={{ fontSize:12, color:'#94a3b8', display:'flex', gap:8, alignItems:'center', cursor:'pointer' }}>
                <input type="checkbox" checked={pagoForm.isRenewal} onChange={e => setPagoForm(f=>({...f,isRenewal:e.target.checked}))} style={{ accentColor:color }}/>
                Extender vigencia al pagar
              </label>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1, fontSize:13 }} onClick={() => setPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex:1, background:color, fontSize:13 }}
                onClick={() => pagarM.mutate()} disabled={pagarM.isPending || !pagoForm.amount}>
                {pagarM.isPending ? 'Registrando…' : `Cobrar ${fmt(Number(pagoForm.amount))}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
