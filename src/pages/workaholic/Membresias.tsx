import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const STATUS_COLOR: Record<string,string> = {
  ACTIVA:'#10b981', VENCIDA:'#f87171', SUSPENDIDA:'#f59e0b', CANCELADA:'#64748b',
};
const DURACION_LABEL: Record<string,string> = {
  MENSUAL:'Mensual', TRIMESTRAL:'Trimestral', SEMESTRAL:'Semestral', ANUAL:'Anual',
};

export default function WorkaholicMembresias() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [vista,     setVista]     = useState<'lista'|'nueva'|'tipos'>('lista');
  const [search,    setSearch]    = useState('');
  const [filtroSt,  setFiltroSt]  = useState('');
  const [detalle,   setDetalle]   = useState<any>(null);
  const [pagoModal, setPagoModal] = useState<any>(null);
  const [pagoForm,  setPagoForm]  = useState({ amount:'', paymentMethod:'TRANSFERENCIA', reference:'', period:'' });

  const [form, setForm] = useState({
    membershipTypeId:'', holderName:'', holderEmail:'', holderPhone:'',
    holderRfc:'', companyName:'', members:[] as any[], startDate: new Date().toISOString().slice(0,10),
    paymentMethod:'TRANSFERENCIA', reference:'', notes:'', registerPayment: true,
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  // Form tipo
  const [tipoForm, setTipoForm] = useState({
    name:'', description:'', type:'COWORKING', duration:'MENSUAL',
    price:'', hoursIncluded:'0', accessDays:'LUNES-VIERNES',
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['wk-memberships', cid, search, filtroSt],
    queryFn:  () => {
      let url = `/companies/${cid}/workaholic/memberships?`;
      if (search)   url += `search=${search}&`;
      if (filtroSt) url += `status=${filtroSt}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const { data: types = [] } = useQuery({
    queryKey: ['wk-types', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/membership-types`).then(r => r.data),
    enabled:  !!cid,
  });

  // Tipo seleccionado para saber cuántos miembros permitir
  const selectedType = (types as any[]).find((t:any) => t.id === form.membershipTypeId);
  const maxExtras = selectedType ? Math.max(0, (selectedType.maxMembers||1) - 1) : 0;

    const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/memberships`, form),
    onSuccess: () => { setVista('lista'); qc.invalidateQueries({ queryKey: ['wk-memberships', cid] }); },
    onError: (e:any) => alert(e.response?.data?.message || 'Error'),
  });

  const crearTipoM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/membership-types`, {
      ...tipoForm, price: Number(tipoForm.price), hoursIncluded: Number(tipoForm.hoursIncluded),
    }),
    onSuccess: () => { setVista('lista'); qc.invalidateQueries({ queryKey: ['wk-types', cid] }); },
  });

  const pagarM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/memberships/${pagoModal?.id}/payments`, {
      ...pagoForm, amount: Number(pagoForm.amount), renew: pagoModal?.status === 'VENCIDA',
    }),
    onSuccess: () => { setPagoModal(null); qc.invalidateQueries({ queryKey: ['wk-memberships', cid] }); },
  });

  const checkM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/memberships/check-expired`, {}),
    onSuccess: (d:any) => { alert(`${d.expired} membresías marcadas como vencidas`); qc.invalidateQueries({ queryKey: ['wk-memberships', cid] }); },
  });

  const selType = (types as any[]).find(t => t.id === form.membershipTypeId);

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Membresías</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => checkM.mutate()} disabled={checkM.isPending}
              style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
              ⚠ Verificar vencidas
            </button>
            <button onClick={() => setVista(vista==='tipos'?'lista':'tipos')}
              style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${color}`, background:'none', color, cursor:'pointer', fontSize:12 }}>
              ⚙ Tipos
            </button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => setVista(vista==='nueva'?'lista':'nueva')}>
              {vista==='nueva'?'← Volver':'+ Nueva membresía'}
            </button>
          </div>
        </div>

        {/* TIPOS */}
        {vista === 'tipos' && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Tipos de membresía</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {(types as any[]).map((t:any) => (
                <div key={t.id} style={{ background:'#0f172a', borderRadius:8, padding:12, border:'1px solid #334155' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', margin:'0 0 2px' }}>{t.name}</p>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px' }}>{t.type} · {DURACION_LABEL[t.duration]}</p>
                  <p style={{ fontSize:16, fontWeight:800, color, margin:'0 0 4px' }}>{fmt(t.price)}</p>
                  {t.hoursIncluded > 0 && <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{t.hoursIncluded}h sala incluidas</p>}
                  <p style={{ fontSize:10, color:'#475569', margin:'4px 0 0' }}>{t.accessDays}</p>
                </div>
              ))}
            </div>
            <h4 style={{ fontSize:13, fontWeight:600, margin:'0 0 10px', color:'#64748b' }}>+ Nuevo tipo</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              {[['Nombre','name','text'],['Descripción','description','text'],['Precio','price','number'],['Horas sala incluidas','hoursIncluded','number']].map(([l,k,t]) => (
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
                  {['OFICINA','COWORKING','VIRTUAL','SALA_PACK'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Duración</label>
                <select className="input-base" style={{ fontSize:12 }} value={tipoForm.duration}
                  onChange={e => setTipoForm(f=>({...f,duration:e.target.value}))}>
                  {['MENSUAL','TRIMESTRAL','SEMESTRAL','ANUAL'].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Días acceso</label>
                <input className="input-base" style={{ fontSize:12 }} value={tipoForm.accessDays}
                  onChange={e => setTipoForm(f=>({...f,accessDays:e.target.value}))}/>
              </div>
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearTipoM.mutate()} disabled={crearTipoM.isPending||!tipoForm.name||!tipoForm.price}>
              {crearTipoM.isPending?'Creando…':'Crear tipo'}
            </button>
          </div>
        )}

        {/* NUEVA MEMBRESÍA */}
        {vista === 'nueva' && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nueva membresía</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Tipo de membresía *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.membershipTypeId}
                  onChange={e => set('membershipTypeId', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {(types as any[]).map((t:any) => (
                    <option key={t.id} value={t.id}>{t.name} — {fmt(t.price)} / {DURACION_LABEL[t.duration]}</option>
                  ))}
                </select>
              </div>
              {selType && (
                <div style={{ gridColumn:'span 2', background:'#0f172a', borderRadius:8, padding:'8px 14px',
                  border:`1px solid ${color}33`, display:'flex', gap:24 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Precio: <strong style={{color}}>{fmt(selType.price)}</strong></span>
                  <span style={{ fontSize:12, color:'#64748b' }}>Duración: <strong style={{color:'#f1f5f9'}}>{DURACION_LABEL[selType.duration]}</strong></span>
                  {selType.hoursIncluded > 0 && <span style={{ fontSize:12, color:'#64748b' }}>Horas sala: <strong style={{color:'#f59e0b'}}>{selType.hoursIncluded}h</strong></span>}
                </div>
              )}
              {[['Nombre del titular *','holderName'],['Empresa del cliente','companyName'],['Email','holderEmail'],['Teléfono','holderPhone'],['RFC','holderRfc']].map(([l,k]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{l}</label>
                  <input className="input-base" style={{ fontSize:13 }} value={(form as any)[k]}
                    onChange={e => set(k, e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha inicio</label>
                <input type="date" className="input-base" style={{ fontSize:13 }} value={form.startDate}
                  onChange={e => set('startDate', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Método de pago</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.paymentMethod}
                  onChange={e => set('paymentMethod', e.target.value)}>
                  {['TRANSFERENCIA','EFECTIVO','TARJETA_DEBITO','TARJETA_CREDITO'].map(m=><option key={m}>{m.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Referencia</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.reference}
                  onChange={e => set('reference', e.target.value)} placeholder="Número de transferencia"/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)}/>
              </div>

              {/* Miembros adicionales dinámicos por maxMembers */}
              {selectedType && selectedType.maxMembers > 1 && (
                <div style={{ gridColumn:'span 2' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <label style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase' }}>
                      👥 Miembros adicionales ({form.members.length}/{maxExtras} máx.)
                    </label>
                    {form.members.length < maxExtras && (
                      <button onClick={() => setForm(f => ({...f, members:[...f.members,{name:'',email:'',phone:''}]}))}
                        style={{ padding:'4px 12px', borderRadius:6, border:`1px solid ${color}`,
                          background:'none', color, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        + Agregar miembro
                      </button>
                    )}
                  </div>
                  {form.members.length === 0 && (
                    <p style={{ fontSize:11, color:'#475569', padding:'8px 12px', background:'#0f172a', borderRadius:7 }}>
                      Este tipo permite hasta {selectedType.maxMembers} personas.
                      Puedes agregar hasta {maxExtras} miembro{maxExtras!==1?'s':''} adicional{maxExtras!==1?'es':''}.
                    </p>
                  )}
                  {form.members.map((m:any, mi:number) => (
                    <div key={mi} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8,
                      marginBottom:8, padding:'10px 12px', background:'#0f172a', borderRadius:8,
                      border:`1px solid ${color}22` }}>
                      <div>
                        <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:2 }}>Nombre *</label>
                        <input className="input-base" style={{ fontSize:12 }} placeholder="Nombre completo"
                          value={m.name}
                          onChange={e => setForm(f=>({...f, members:f.members.map((mm:any,mj:number)=>mj===mi?{...mm,name:e.target.value}:mm)}))}/>
                      </div>
                      <div>
                        <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:2 }}>Email</label>
                        <input className="input-base" style={{ fontSize:12 }} placeholder="correo@ejemplo.com"
                          value={m.email}
                          onChange={e => setForm(f=>({...f, members:f.members.map((mm:any,mj:number)=>mj===mi?{...mm,email:e.target.value}:mm)}))}/>
                      </div>
                      <div>
                        <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:2 }}>Teléfono</label>
                        <input className="input-base" style={{ fontSize:12 }} placeholder="55 1234 5678"
                          value={m.phone}
                          onChange={e => setForm(f=>({...f, members:f.members.map((mm:any,mj:number)=>mj===mi?{...mm,phone:e.target.value}:mm)}))}/>
                      </div>
                      <button onClick={() => setForm(f=>({...f, members:f.members.filter((_:any,mj:number)=>mj!==mi)}))}
                        style={{ alignSelf:'flex-end', padding:'7px', borderRadius:6, border:'1px solid #f87171',
                          background:'none', color:'#f87171', cursor:'pointer', fontSize:13, marginTop:14 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:12, color:'#94a3b8', display:'flex', gap:8, alignItems:'center', cursor:'pointer' }}>
                  <input type="checkbox" checked={form.registerPayment} style={{ accentColor:color }}
                    onChange={e => set('registerPayment', e.target.checked)}/>
                  Registrar pago inicial al crear
                </label>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setVista('lista')}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()} disabled={crearM.isPending||!form.membershipTypeId||!form.holderName}>
                {crearM.isPending?'Creando…':'Crear membresía'}
              </button>
            </div>
          </div>
        )}

        {/* LISTA */}
        {vista === 'lista' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input className="input-base" style={{ flex:1, fontSize:12 }}
                placeholder="🔍 Buscar nombre, folio o empresa..."
                value={search} onChange={e => setSearch(e.target.value)}/>
              <select className="input-base" style={{ fontSize:12, minWidth:140 }}
                value={filtroSt} onChange={e => setFiltroSt(e.target.value)}>
                <option value="">Todos los estados</option>
                {['ACTIVA','VENCIDA','SUSPENDIDA','CANCELADA'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead><tr>
                  <th>Folio</th><th>Cliente / Empresa</th><th>Tipo</th>
                  <th>Vigencia</th><th style={{textAlign:'right'}}>Precio</th><th>Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                  {!isLoading && (memberships as any[]).length===0 && (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin membresías</td></tr>
                  )}
                  {(memberships as any[]).map((m:any) => {
                    const st = STATUS_COLOR[m.status]||'#64748b';
                    const dias = Math.ceil((new Date(m.endDate).getTime()-Date.now())/86400000);
                    return (
                      <tr key={m.id} style={{ cursor:'pointer' }} onClick={() => setDetalle(m)}>
                        <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{m.folio}</code></td>
                        <td style={{ fontWeight:500 }}>
                          {m.holderName}
                          {m.companyName && <p style={{fontSize:10,color:'#64748b',margin:0}}>{m.companyName}</p>}
                        </td>
                        <td style={{ fontSize:12 }}>{m.membershipType?.name}</td>
                        <td style={{ fontSize:12 }}>
                          <p style={{margin:0}}>{fmtDate(m.startDate)} → {fmtDate(m.endDate)}</p>
                          <p style={{margin:0,fontSize:10,color:dias<0?'#f87171':dias<7?'#f59e0b':'#64748b'}}>
                            {dias<0?`Venció hace ${-dias}d`:dias===0?'Vence hoy':`${dias}d restantes`}
                          </p>
                        </td>
                        <td style={{ textAlign:'right', fontWeight:600, color }}>{fmt(m.membershipType?.price||0)}</td>
                        <td>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                            background:st+'22', color:st, fontWeight:600 }}>{m.status}</span>
                        </td>
                        <td>
                          <button onClick={e => { e.stopPropagation(); setPagoModal(m); setPagoForm({amount:String(m.membershipType?.price||0),paymentMethod:'TRANSFERENCIA',reference:'',period:''}); }}
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

      {/* Modal pago */}
      {pagoModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:380, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px' }}>Cobrar renovación</h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 16px' }}>{pagoModal.folio} — {pagoModal.holderName}</p>
            {pagoModal.status === 'VENCIDA' && (
              <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171', borderRadius:7, padding:'8px 12px', marginBottom:12 }}>
                <p style={{ fontSize:12, color:'#f87171', margin:0, fontWeight:600 }}>⚠ Membresía vencida — se renovará al cobrar</p>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              {[['Monto','amount','number'],['Referencia','reference','text'],['Período','period','text']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:13 }}
                    value={(pagoForm as any)[k]} onChange={e => setPagoForm(f=>({...f,[k]:e.target.value}))}
                    placeholder={k==='period'?'Ej: Mayo 2026':''}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Método</label>
                <select className="input-base" style={{ fontSize:13 }} value={pagoForm.paymentMethod}
                  onChange={e => setPagoForm(f=>({...f,paymentMethod:e.target.value}))}>
                  {['TRANSFERENCIA','EFECTIVO','TARJETA_DEBITO','TARJETA_CREDITO'].map(m=><option key={m}>{m.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1, fontSize:13 }} onClick={() => setPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex:1, background:color, fontSize:13 }}
                onClick={() => pagarM.mutate()} disabled={pagarM.isPending||!pagoForm.amount}>
                {pagarM.isPending?'Registrando…':`Cobrar ${fmt(Number(pagoForm.amount))}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
