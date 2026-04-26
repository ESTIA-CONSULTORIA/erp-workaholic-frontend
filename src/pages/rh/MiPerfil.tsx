// src/pages/rh/MiPerfil.tsx — Portal del Empleado
import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TIPOS_SOL = [
  { id:'VACACIONES',        label:'Vacaciones',       icon:'🏖', goce:true  },
  { id:'PERMISO_CON_GOCE',  label:'Permiso con goce', icon:'📅', goce:true  },
  { id:'PERMISO_SIN_GOCE',  label:'Permiso sin goce', icon:'📋', goce:false },
];

const STATUS_CONFIG: Record<string,{label:string;color:string;icon:string}> = {
  PENDIENTE:          { label:'Pendiente jefe',        color:'#f59e0b', icon:'⏳' },
  APROBADO_JEFE:      { label:'Pendiente RH',          color:'#3b82f6', icon:'✓'  },
  APROBADO:           { label:'Aprobado',              color:'#10b981', icon:'✅' },
  RECHAZADO:          { label:'Rechazado',             color:'#f87171', icon:'✕'  },
  CANCELADA:          { label:'Cancelada',             color:'#64748b', icon:'—'  },
  CANCELADO:          { label:'Cancelada',             color:'#64748b', icon:'—'  },
  PAGADA_SIN_GOZAR:   { label:'Pagada — por gozar',   color:'#f59e0b', icon:'💰' },
  GOZADA:             { label:'Gozada',                color:'#8b5cf6', icon:'🏖' },
  PAGADA_Y_GOZADA:    { label:'Pagada y gozada',       color:'#10b981', icon:'✅' },
};

type Tab = 'solicitudes'|'incidencias'|'incapacidades'|'recibos'|'documentos';

export default function MiPerfilPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [tab,       setTab]      = useState<Tab>('solicitudes');
  const [showForm,  setShowForm] = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [form, setForm] = useState({ type:'VACACIONES', startDate:'', endDate:'', notes:'', paymentType:'GOZAR' });

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['mi-perfil', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/me`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['my-incidents', cid, perfil?.id],
    queryFn:  () => api.get(`/companies/${cid}/incidents/employee/${perfil.id}`).then(r => r.data),
    enabled:  !!cid && !!perfil?.id && tab === 'incidencias',
  });

  const { data: disabilities = [] } = useQuery({
    queryKey: ['my-disabilities', cid, perfil?.id],
    queryFn:  () => api.get(`/companies/${cid}/disabilities/employee/${perfil.id}`).then(r => r.data),
    enabled:  !!cid && !!perfil?.id && tab === 'incapacidades',
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['my-receipts', cid, perfil?.id],
    queryFn:  () => api.get(`/companies/${cid}/payroll-receipts/employee/${perfil.id}`).then(r => r.data),
    enabled:  !!cid && !!perfil?.id && tab === 'recibos',
  });

  const { data: legalDocs = [] } = useQuery({
    queryKey: ['my-legal', cid, perfil?.id],
    queryFn:  () => api.get(`/companies/${cid}/legal/employee/${perfil.id}`).then(r => r.data),
    enabled:  !!cid && !!perfil?.id && tab === 'documentos',
  });

  const cancelSolicitudM = useMutation({
    mutationFn: (id: string) => api.put(`/companies/${cid}/rh/me/vacations/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mi-perfil', cid] }),
    onError: (e:any) => alert(e.response?.data?.message || 'No se pudo cancelar'),
  });

  const ackM = useMutation({
    mutationFn: (id:string) => api.put(`/companies/${cid}/payroll-receipts/${id}/acknowledge`, { employeeId: perfil?.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-receipts', cid] }),
  });

  const balance     = perfil?.vacationBalance;
  const solicitudes = perfil?.vacations || [];
  const dias = form.startDate && form.endDate
    ? Math.ceil((new Date(form.endDate).getTime()-new Date(form.startDate).getTime())/86400000)+1
    : 0;

  const enviar = async () => {
    if (!form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/rh/me/vacations`, form);
      setShowForm(false);
      setForm({ type:'VACACIONES', startDate:'', endDate:'', notes:'' });
      qc.invalidateQueries({ queryKey: ['mi-perfil', cid] });
    } catch(e:any) { alert(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  if (isLoading) return <AppLayout><p style={{color:'#64748b',padding:24}}>Cargando…</p></AppLayout>;

  if (!perfil) return (
    <AppLayout>
      <div style={{ maxWidth:600, margin:'60px auto', textAlign:'center' }}>
        <p style={{ fontSize:48, margin:'0 0 12px' }}>👤</p>
        <h2 style={{ fontSize:20, fontWeight:700, margin:'0 0 8px' }}>Sin expediente vinculado</h2>
        <p style={{ color:'#64748b', fontSize:14 }}>Solicita a RH que vincule tu usuario al expediente.</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        {/* Header */}
        <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:20 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:color+'33',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>👤</div>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:22, fontWeight:800, margin:'0 0 2px' }}>{perfil.firstName} {perfil.lastName}</h1>
            <p style={{ fontSize:13, color:'#64748b', margin:0 }}>{perfil.position}{perfil.department?` · ${perfil.department}`:''}</p>
            <p style={{ fontSize:11, color:'#475569', margin:'2px 0 0' }}>#{perfil.employeeNumber} · Desde {fmtDate(perfil.startDate)}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ padding:'9px 18px', borderRadius:9, border:'none', background:color,
              color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
            + Nueva solicitud
          </button>
        </div>

        {/* KPIs */}
        {balance && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Antigüedad',   value:`${balance.years} año${balance.years!==1?'s':''}`, col:'#94a3b8' },
              { label:'Días LFT',     value:`${balance.entitled}d`, col:color, sub:balance.workDays===6?'Jornada 6d':'Jornada 5d' },
              { label:'Usados',       value:`${balance.used}d`,     col:'#f59e0b' },
              { label:'Disponibles',  value:`${balance.balance}d`,  col:balance.balance>0?'#10b981':'#f87171' },
            ].map(k => (
              <div key={k.label} style={{ background:'#1e293b', borderRadius:9, padding:'12px 14px',
                border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
                <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px', textTransform:'uppercase' }}>{k.label}</p>
                <p style={{ fontSize:20, fontWeight:800, color:k.col, margin:0 }}>{k.value}</p>
                {(k as any).sub && <p style={{ fontSize:10, color:'#475569', margin:'2px 0 0' }}>{(k as any).sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Form solicitud */}
        {showForm && (
          <div style={{ background:'#1e293b', borderRadius:12, padding:20, marginBottom:16, border:`1px solid ${color}33` }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 14px', color }}>Nueva solicitud</h3>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {TIPOS_SOL.map(t => (
                <button key={t.id} onClick={() => setForm(f=>({...f,type:t.id}))}
                  style={{ flex:1, padding:'9px', borderRadius:9, cursor:'pointer', textAlign:'center',
                    border:`2px solid ${form.type===t.id?color:'#334155'}`,
                    background:form.type===t.id?color+'22':'#0f172a' }}>
                  <p style={{ fontSize:18, margin:'0 0 3px' }}>{t.icon}</p>
                  <p style={{ fontSize:11, fontWeight:600, color:form.type===t.id?color:'#64748b', margin:0 }}>{t.label}</p>
                  <p style={{ fontSize:9, color:t.goce?'#10b981':'#f87171', margin:'2px 0 0' }}>{t.goce?'Con goce':'Sin goce'}</p>
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Inicio *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.startDate} min={new Date().toISOString().slice(0,10)}
                  onChange={e => setForm(f=>({...f,startDate:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fin *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.endDate} min={form.startDate}
                  onChange={e => setForm(f=>({...f,endDate:e.target.value}))}/>
              </div>
            </div>
            {dias > 0 && (
              <div style={{ padding:'7px 12px', borderRadius:7, background:'#0f172a',
                border:'1px solid #334155', marginBottom:10, fontSize:12, color:'#94a3b8' }}>
                📅 {dias} días naturales
                {balance && form.type==='VACACIONES' && dias>balance.balance && (
                  <span style={{ color:'#f87171', marginLeft:8 }}>⚠ Excede saldo ({balance.balance}d)</span>
                )}
              </div>
            )}
            {/* Tipo de pago */}
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:6 }}>
                ¿Cómo quieres tus vacaciones?
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {[
                  { id:'GOZAR',          label:'Gozar',           sub:'Tomar los días', icon:'🏖' },
                  { id:'PAGAR_SIN_GOZAR',label:'Pagar sin gozar', sub:'Recibir el dinero ahora', icon:'💰' },
                  { id:'AMBOS',          label:'Pagar y gozar',   sub:'Todo junto', icon:'✅' },
                ].map(t => (
                  <button key={t.id} type="button"
                    onClick={() => setForm(f=>({...f,paymentType:t.id}))}
                    style={{ padding:'8px', borderRadius:8, cursor:'pointer', textAlign:'center',
                      border:`2px solid ${form.paymentType===t.id?color:'#334155'}`,
                      background:form.paymentType===t.id?color+'22':'#0f172a' }}>
                    <p style={{ fontSize:16, margin:'0 0 3px' }}>{t.icon}</p>
                    <p style={{ fontSize:11, fontWeight:700, color:form.paymentType===t.id?color:'#94a3b8', margin:'0 0 2px' }}>{t.label}</p>
                    <p style={{ fontSize:9, color:'#475569', margin:0 }}>{t.sub}</p>
                  </button>
                ))}
              </div>
              {form.paymentType === 'PAGAR_SIN_GOZAR' && (
                <div style={{ marginTop:8, padding:'7px 10px', background:'rgba(245,158,11,0.1)',
                  border:'1px solid #f59e0b44', borderRadius:7 }}>
                  <p style={{ fontSize:11, color:'#f59e0b', margin:0 }}>
                    💰 Recibirás el pago en la siguiente nómina. Tienes 6 meses para tomar los días.
                  </p>
                </div>
              )}
            </div>
            <input className="input-base" style={{ fontSize:13, marginBottom:12 }}
              placeholder="Motivo (opcional)" value={form.notes}
              onChange={e => setForm(f=>({...f,notes:e.target.value}))}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={enviar} disabled={saving||!form.startDate||!form.endDate}
                style={{ padding:'8px 24px', borderRadius:8, border:'none', background:color,
                  color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                {saving?'Enviando…':'📤 Enviar'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, marginBottom:16, borderBottom:'1px solid #334155', flexWrap:'wrap' }}>
          {([
            { id:'solicitudes',   label:'Solicitudes' },
            { id:'incidencias',   label:'Incidencias' },
            { id:'incapacidades', label:'Incapacidades' },
            { id:'recibos',       label:'Recibos nómina' },
            { id:'documentos',    label:'Documentos' },
          ] as {id:Tab;label:string}[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'8px 14px', borderRadius:'6px 6px 0 0', border:'none', cursor:'pointer', fontSize:12,
                background:tab===t.id?'#1e293b':'transparent', color:tab===t.id?color:'#64748b',
                fontWeight:tab===t.id?700:400, borderBottom:tab===t.id?`2px solid ${color}`:'2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Solicitudes/Vacaciones */}
        {tab === 'solicitudes' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {solicitudes.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#334155' }}>
                <p style={{ fontSize:32, margin:'0 0 8px' }}>📋</p>
                <p style={{ fontSize:13 }}>Sin solicitudes registradas</p>
              </div>
            ) : (solicitudes as any[]).map((s:any) => {
              const st = STATUS_CONFIG[s.status] || { label:s.status, color:'#64748b', icon:'?' };
              return (
                <div key={s.id} style={{ background:'#1e293b', borderRadius:9, padding:'12px 16px',
                  border:'1px solid #334155', borderLeft:`4px solid ${st.color}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#f1f5f9' }}>
                        {TIPOS_SOL.find(t=>t.id===s.type)?.label||s.type}
                      </span>
                      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:99,
                        background:st.color+'22', color:st.color, fontWeight:600 }}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <span style={{ fontSize:10, color:'#475569' }}>{fmtDate(s.createdAt)}</span>
                  </div>
                  <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>
                    {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
                    <span style={{ marginLeft:8, color:'#94a3b8' }}>({s.businessDays||s.days}d hábiles)</span>
                  </p>
                  {s.notes && <p style={{ fontSize:11, color:'#475569', margin:'0 0 4px' }}>"{s.notes}"</p>}
                  {s.rejectedReason && <p style={{ fontSize:11, color:'#f87171', margin:0 }}>✕ {s.rejectedReason}</p>}
                  {/* Cancelar si está pendiente */}
                  {s.status === 'PENDIENTE' && (
                    <button onClick={() => {
                      if (window.confirm('¿Cancelar esta solicitud?'))
                        cancelSolicitudM.mutate(s.id);
                    }}
                      style={{ marginTop:6, padding:'4px 10px', borderRadius:6,
                        border:'1px solid #f87171', background:'none', color:'#f87171',
                        cursor:'pointer', fontSize:11 }}>
                      ✕ Cancelar solicitud
                    </button>
                  )}
                  {s.status === 'PAGADA_SIN_GOZAR' && (
                    <button onClick={() => {
                      if (window.confirm('¿Registrar que ya tomaste estos días de vacaciones?'))
                        api.put(`/companies/${cid}/rh/vacations/${s.id}/gozar-pagadas`, {})
                          .then(() => qc.invalidateQueries({ queryKey: ['mi-perfil', cid] }))
                          .catch((e:any) => alert(e.response?.data?.message || 'Error'));
                    }}
                      style={{ marginTop:6, padding:'4px 10px', borderRadius:6,
                        border:`1px solid ${color}`, background:'none', color,
                        cursor:'pointer', fontSize:11 }}>
                      🏖 Registrar días gozados
                    </button>
                  )}
                  {s.status === 'PAGADA_SIN_GOZAR' && s.plazoGozar && (
                    <p style={{ fontSize:10, color:'#f59e0b', margin:'4px 0 0' }}>
                      ⏰ Debes gozarlos antes del {new Date(s.plazoGozar).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}
                    </p>
                  )}
                  {/* Barra de progreso */}
                  <div style={{ display:'flex', gap:4, marginTop:8 }}>
                    {[['Enviada','✓',true],['Jefe','2',['APROBADO_JEFE','APROBADO'].includes(s.status)],['RH','3',s.status==='APROBADO']].map(([lbl,ico,done],i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:4, flex:1 }}>
                        <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, fontSize:9, color:'#fff',
                          background: done?'#10b981':s.status==='RECHAZADO'?'#f87171':'#334155',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {done?'✓':ico}
                        </div>
                        <span style={{ fontSize:10, color:'#475569' }}>{lbl}</span>
                        {i<2 && <div style={{ flex:1, height:1, background:'#334155' }}/>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Incidencias */}
        {tab === 'incidencias' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr><th>Tipo</th><th>Período</th><th>Cantidad</th><th>Monto</th><th>Estado</th></tr></thead>
              <tbody>
                {(incidents as any[]).length===0
                  ? <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin incidencias</td></tr>
                  : (incidents as any[]).map((inc:any) => (
                    <tr key={inc.id}>
                      <td style={{fontSize:12}}>{inc.type}</td>
                      <td style={{fontSize:12}}>{fmtDate(inc.dateFrom)}{inc.dateTo&&inc.dateTo!==inc.dateFrom?` → ${fmtDate(inc.dateTo)}`:''}</td>
                      <td style={{textAlign:'center',fontSize:12}}>{inc.quantity} {inc.unit}</td>
                      <td style={{textAlign:'right',fontWeight:600,color:inc.amount>0?'#10b981':'#f87171'}}>{inc.amount?fmt(inc.amount):'—'}</td>
                      <td><span style={{fontSize:11,padding:'2px 6px',borderRadius:99,background:'#334155',color:'#94a3b8'}}>{inc.status}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Incapacidades */}
        {tab === 'incapacidades' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr><th>Tipo</th><th>Período</th><th>Días</th><th>Folio IMSS</th><th>Estado</th></tr></thead>
              <tbody>
                {(disabilities as any[]).length===0
                  ? <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin incapacidades</td></tr>
                  : (disabilities as any[]).map((d:any) => (
                    <tr key={d.id}>
                      <td style={{fontSize:12}}>{d.type}</td>
                      <td style={{fontSize:12}}>{fmtDate(d.startDate)} → {fmtDate(d.endDate)}</td>
                      <td style={{textAlign:'center'}}>{d.days}</td>
                      <td style={{fontSize:11,color:'#64748b'}}>{d.folio||'—'}</td>
                      <td><span style={{fontSize:11,padding:'2px 6px',borderRadius:99,background:'#8b5cf622',color:'#8b5cf6'}}>{d.status}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Recibos nómina */}
        {tab === 'recibos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(receipts as any[]).length===0 ? (
              <div style={{textAlign:'center',padding:40,color:'#334155'}}>
                <p style={{fontSize:32,margin:'0 0 8px'}}>💰</p>
                <p style={{fontSize:13}}>Sin recibos publicados</p>
              </div>
            ) : (receipts as any[]).map((r:any) => (
              <div key={r.id} style={{ background:'#1e293b', borderRadius:9, padding:'14px 16px',
                border:'1px solid #334155', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',margin:'0 0 2px'}}>
                    Recibo de nómina
                    {!r.employeeAckAt && <span style={{fontSize:10,color:'#f59e0b',marginLeft:8}}>● Nuevo</span>}
                  </p>
                  <p style={{fontSize:11,color:'#64748b',margin:0}}>Publicado: {fmtDate(r.publishedAt)}</p>
                </div>
                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:10,color:'#64748b',margin:0}}>Percepciones</p>
                    <p style={{fontSize:14,fontWeight:700,color:'#10b981',margin:0}}>{fmt(r.grossAmount)}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:10,color:'#64748b',margin:0}}>Deducciones</p>
                    <p style={{fontSize:14,fontWeight:700,color:'#f87171',margin:0}}>-{fmt(r.deductions)}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:10,color:'#64748b',margin:0}}>Neto</p>
                    <p style={{fontSize:16,fontWeight:800,color,margin:0}}>{fmt(r.netAmount)}</p>
                  </div>
                  {!r.employeeAckAt && (
                    <button onClick={() => ackM.mutate(r.id)}
                      style={{padding:'6px 12px',borderRadius:7,border:'none',background:color,color:'#fff',cursor:'pointer',fontSize:11,fontWeight:600}}>
                      ✓ Visto
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Documentos legales */}
        {tab === 'documentos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(legalDocs as any[]).length===0 ? (
              <div style={{textAlign:'center',padding:40,color:'#334155'}}>
                <p style={{fontSize:32,margin:'0 0 8px'}}>📄</p>
                <p style={{fontSize:13}}>Sin documentos legales</p>
              </div>
            ) : (legalDocs as any[]).map((d:any) => (
              <div key={d.id} style={{ background:'#1e293b', borderRadius:9, padding:'14px 16px',
                border:'1px solid #334155', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',margin:'0 0 2px'}}>{d.title}</p>
                  <p style={{fontSize:11,color:'#64748b',margin:0}}>
                    {d.type} · #{d.documentNumber} · {fmtDate(d.generatedAt)}
                  </p>
                  {d.signedByEmployeeAt && <p style={{fontSize:10,color:'#10b981',margin:'2px 0 0'}}>✓ Firmado por ti el {fmtDate(d.signedByEmployeeAt)}</p>}
                </div>
                <span style={{fontSize:11,padding:'3px 10px',borderRadius:99,
                  background:d.status==='FIRMADO'?'#10b98122':d.status==='GENERADO'?'#3b82f622':'#33415522',
                  color:d.status==='FIRMADO'?'#10b981':d.status==='GENERADO'?'#3b82f6':'#64748b'}}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
