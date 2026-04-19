import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const STATUS_COLOR: Record<string,string> = {
  ACTIVA:'#10b981', MOROSA:'#f87171', SUSPENDIDA:'#f59e0b', CANCELADA:'#64748b'
};

export default function MembresiasPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#10b981';
  const qc    = useQueryClient();

  const [vista,        setVista]        = useState<'lista'|'nueva'|'tipos'>('lista');
  const [search,       setSearch]       = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [detalle,      setDetalle]      = useState<any>(null);
  const [pagoModal,    setPagoModal]    = useState<any>(null);
  const [saving,       setSaving]       = useState(false);

  // Form nueva membresía
  const [form, setForm] = useState({
    membershipTypeId:'', holderName:'', holderEmail:'', holderPhone:'',
    holderRfc:'', groupName:'', notes:'', members:[] as any[],
  });

  // Form nuevo tipo
  const [tipoForm, setTipoForm] = useState({
    name:'', description:'', entryFee:'', monthlyFee:'', maxMembers:1, graceDays:5,
  });

  const [pagoForm, setPagoForm] = useState({
    amount:'', paymentMethod:'EFECTIVO', reference:'', dueDate: new Date().toISOString().slice(0,10),
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['memberships', cid, search, filtroStatus],
    queryFn:  () => {
      let url = `/companies/${cid}/palestra/memberships?`;
      if (search)       url += `search=${search}&`;
      if (filtroStatus) url += `status=${filtroStatus}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const { data: types = [] } = useQuery({
    queryKey: ['membership-types', cid],
    queryFn:  () => api.get(`/companies/${cid}/palestra/membership-types`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/memberships`, form),
    onSuccess:  () => { setVista('lista'); qc.invalidateQueries({ queryKey: ['memberships', cid] }); },
  });

  const crearTipoM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/membership-types`, {
      ...tipoForm, entryFee: Number(tipoForm.entryFee), monthlyFee: Number(tipoForm.monthlyFee),
    }),
    onSuccess: () => { setVista('lista'); qc.invalidateQueries({ queryKey: ['membership-types', cid] }); },
  });

  const pagarM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/memberships/${pagoModal?.id}/payments`, {
      ...pagoForm, amount: Number(pagoForm.amount),
    }),
    onSuccess: () => {
      setPagoModal(null);
      qc.invalidateQueries({ queryKey: ['memberships', cid] });
    },
  });

  const checkOverdueM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/memberships/check-overdue`, {}),
    onSuccess: (data:any) => {
      alert(`✅ ${data.blocked} membresías marcadas como morosas`);
      qc.invalidateQueries({ queryKey: ['memberships', cid] });
    },
  });

  const selectedType = (types as any[]).find((t:any) => t.id === form.membershipTypeId);

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Membresías</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => checkOverdueM.mutate()}
              style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
              ⚠ Verificar vencidas
            </button>
            <button onClick={() => setVista(vista==='tipos'?'lista':'tipos')}
              style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${color}`, background:'none', color, cursor:'pointer', fontSize:12 }}>
              ⚙ Tipos
            </button>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => setVista(vista==='nueva'?'lista':'nueva')}>
              {vista==='nueva' ? '← Volver' : '+ Nueva membresía'}
            </button>
          </div>
        </div>

        {/* Vista: Tipos de membresía */}
        {vista === 'tipos' && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Tipos de membresía</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {(types as any[]).map((t:any) => (
                <div key={t.id} style={{ background:'#0f172a', borderRadius:8, padding:12, border:'1px solid #334155' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px' }}>{t.name}</p>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px' }}>{t.description}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>Entrada</span>
                    <span style={{ fontWeight:600, color }}>{fmt(t.entryFee)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>Mantto/mes</span>
                    <span style={{ fontWeight:600, color:'#f1f5f9' }}>{fmt(t.monthlyFee)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>Max miembros</span>
                    <span style={{ color:'#94a3b8' }}>{t.maxMembers}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>Días gracia</span>
                    <span style={{ color:'#94a3b8' }}>{t.graceDays} días</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Form nuevo tipo */}
            <h4 style={{ fontSize:13, fontWeight:600, margin:'0 0 10px', color:'#64748b' }}>+ Nuevo tipo</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              {[
                ['Nombre *', 'name', 'text'],
                ['Descripción', 'description', 'text'],
                ['Costo entrada', 'entryFee', 'number'],
                ['Mantto mensual', 'monthlyFee', 'number'],
                ['Max miembros', 'maxMembers', 'number'],
                ['Días de gracia', 'graceDays', 'number'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{label}</label>
                  <input type={type} className="input-base" style={{ fontSize:13 }}
                    value={(tipoForm as any)[key]}
                    onChange={e => setTipoForm(f => ({...f, [key]: type==='number' ? +e.target.value : e.target.value}))}/>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearTipoM.mutate()}
              disabled={crearTipoM.isPending || !tipoForm.name || !tipoForm.entryFee}>
              {crearTipoM.isPending ? 'Guardando…' : 'Crear tipo'}
            </button>
          </div>
        )}

        {/* Vista: Nueva membresía */}
        {vista === 'nueva' && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nueva membresía</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Tipo de membresía *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.membershipTypeId}
                  onChange={e => setForm(f => ({...f, membershipTypeId: e.target.value}))}>
                  <option value="">— Seleccionar tipo —</option>
                  {(types as any[]).map((t:any) => (
                    <option key={t.id} value={t.id}>{t.name} — Entrada: {fmt(t.entryFee)} | Mantto: {fmt(t.monthlyFee)}/mes</option>
                  ))}
                </select>
              </div>
              {selectedType && (
                <div style={{ gridColumn:'span 2', background:'#0f172a', borderRadius:8, padding:'8px 12px',
                  border:`1px solid ${color}33`, display:'flex', gap:24 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Entrada: <strong style={{color}}>{fmt(selectedType.entryFee)}</strong></span>
                  <span style={{ fontSize:12, color:'#64748b' }}>Mantto: <strong style={{color:'#f1f5f9'}}>{fmt(selectedType.monthlyFee)}/mes</strong></span>
                  <span style={{ fontSize:12, color:'#64748b' }}>Hasta {selectedType.maxMembers} miembro{selectedType.maxMembers>1?'s':''}</span>
                </div>
              )}
              {[
                ['Nombre del titular *', 'holderName'],
                ['Email', 'holderEmail'],
                ['Teléfono', 'holderPhone'],
                ['RFC', 'holderRfc'],
                ['Nombre del grupo (si aplica)', 'groupName'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{label}</label>
                  <input className="input-base" style={{ fontSize:13 }}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({...f, [key]: e.target.value}))}/>
                </div>
              ))}
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => setForm(f => ({...f, notes: e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setVista('lista')}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()}
                disabled={crearM.isPending || !form.membershipTypeId || !form.holderName}>
                {crearM.isPending ? 'Creando…' : 'Crear membresía'}
              </button>
            </div>
          </div>
        )}

        {/* Vista: Lista */}
        {vista === 'lista' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input className="input-base" style={{ flex:1, fontSize:12 }}
                placeholder="🔍 Buscar por nombre, folio o email..."
                value={search} onChange={e => setSearch(e.target.value)}/>
              <select className="input-base" style={{ fontSize:12, minWidth:140 }}
                value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="">Todos los estados</option>
                {['ACTIVA','MOROSA','SUSPENDIDA','CANCELADA'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Folio</th><th>Titular</th><th>Tipo</th>
                    <th>Miembros</th><th>Próx. pago</th>
                    <th style={{textAlign:'right'}}>Mantto</th>
                    <th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                  {!isLoading && (memberships as any[]).length === 0 && (
                    <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin membresías</td></tr>
                  )}
                  {(memberships as any[]).map((m:any) => (
                    <tr key={m.id} style={{ cursor:'pointer' }} onClick={() => setDetalle(m)}>
                      <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{m.folio}</code></td>
                      <td style={{ fontWeight:500 }}>
                        {m.holderName}
                        {m.groupName && <p style={{fontSize:10,color:'#64748b',margin:0}}>{m.groupName}</p>}
                      </td>
                      <td style={{ fontSize:12 }}>{m.membershipType?.name}</td>
                      <td style={{ textAlign:'center', fontSize:12 }}>{m.members?.length || 1}</td>
                      <td style={{ fontSize:12, color: m.status==='MOROSA'?'#f87171':'#64748b' }}>
                        {m.nextDueDate ? fmtDate(m.nextDueDate) : '—'}
                      </td>
                      <td style={{ textAlign:'right', fontWeight:600, color }}>
                        {fmt(m.membershipType?.monthlyFee || 0)}
                      </td>
                      <td>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                          background: (STATUS_COLOR[m.status]||'#64748b')+'22',
                          color: STATUS_COLOR[m.status]||'#64748b', fontWeight:600 }}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={e => { e.stopPropagation(); setPagoModal(m); setPagoForm({amount: String(m.membershipType?.monthlyFee||0), paymentMethod:'EFECTIVO', reference:'', dueDate: m.nextDueDate?.slice(0,10) || new Date().toISOString().slice(0,10)}); }}
                          style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                          💳 Cobrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal detalle membresía */}
      {detalle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:520, maxHeight:'85vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px', color }}>{detalle.folio} — {detalle.holderName}</h3>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:(STATUS_COLOR[detalle.status]||'#64748b')+'22', color:STATUS_COLOR[detalle.status]||'#64748b' }}>
                  {detalle.status}
                </span>
              </div>
              <button onClick={() => setDetalle(null)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {[
                ['Tipo', detalle.membershipType?.name],
                ['Inicio', fmtDate(detalle.startDate)],
                ['Email', detalle.holderEmail || '—'],
                ['Teléfono', detalle.holderPhone || '—'],
                ['Próx. vencimiento', fmtDate(detalle.nextDueDate)],
                ['Mantto mensual', fmt(detalle.membershipType?.monthlyFee)],
              ].map(([label, val]) => (
                <div key={label} style={{ background:'#0f172a', borderRadius:6, padding:'6px 10px' }}>
                  <p style={{ fontSize:9, color:'#64748b', margin:'0 0 2px', textTransform:'uppercase' }}>{label}</p>
                  <p style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', margin:0 }}>{val}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', margin:'0 0 8px', textTransform:'uppercase' }}>Miembros</p>
            {(detalle.members||[]).map((m:any) => (
              <div key={m.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #334155', fontSize:12 }}>
                <span style={{ color:'#f1f5f9' }}>{m.name} {m.isHolder && <span style={{color,fontSize:10}}>(Titular)</span>}</span>
                <span style={{ color:'#64748b' }}>{m.email || m.phone || ''}</span>
              </div>
            ))}
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', margin:'12px 0 8px', textTransform:'uppercase' }}>Últimos pagos</p>
            {(detalle.payments||[]).length === 0
              ? <p style={{ fontSize:12, color:'#64748b' }}>Sin pagos registrados</p>
              : (detalle.payments||[]).map((p:any) => (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #334155', fontSize:12 }}>
                  <span style={{ color:'#94a3b8' }}>{p.concept}</span>
                  <span style={{ fontWeight:600, color:'#10b981' }}>{fmt(p.amount)}</span>
                </div>
              ))
            }
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
              <button onClick={() => { setDetalle(null); setPagoModal(detalle); setPagoForm({amount:String(detalle.membershipType?.monthlyFee||0),paymentMethod:'EFECTIVO',reference:'',dueDate:detalle.nextDueDate?.slice(0,10)||new Date().toISOString().slice(0,10)}); }}
                style={{ padding:'8px 20px', borderRadius:8, border:'none', background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                💳 Cobrar mantenimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cobrar pago */}
      {pagoModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:380, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px' }}>Cobrar mantenimiento</h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 16px' }}>{pagoModal.folio} — {pagoModal.holderName}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              {[
                ['Monto', 'amount', 'number'],
                ['Referencia', 'reference', 'text'],
                ['Fecha vencimiento', 'dueDate', 'date'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{label}</label>
                  <input type={type} className="input-base" style={{ fontSize:13 }}
                    value={(pagoForm as any)[key]}
                    onChange={e => setPagoForm(f => ({...f, [key]: e.target.value}))}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Método de pago</label>
                <select className="input-base" style={{ fontSize:13 }} value={pagoForm.paymentMethod}
                  onChange={e => setPagoForm(f => ({...f, paymentMethod: e.target.value}))}>
                  {['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO'].map(m => (
                    <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
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
