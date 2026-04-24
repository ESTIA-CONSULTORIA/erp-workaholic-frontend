import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TIPO_COLOR: Record<string,string> = {
  OFICINA:'#6366f1', SALA_JUNTAS:'#3b82f6', SALA_CAPACITACION:'#8b5cf6',
  COWORKING:'#10b981', LOCKER:'#64748b',
};
const STATUS_COLOR: Record<string,string> = {
  PENDIENTE:'#f59e0b', CONFIRMADA:'#10b981', EN_CURSO:'#3b82f6',
  COMPLETADA:'#64748b', CANCELADA:'#f87171',
};

export default function ReservacionesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [showNew,   setShowNew]   = useState(false);
  const [filtroDate,setFiltroDate]= useState(new Date().toISOString().slice(0,10));
  const [filtroSp,  setFiltroSp]  = useState('');
  const [error,     setError]     = useState('');

  const [form, setForm] = useState({
    spaceId:'', clientName:'', clientEmail:'', clientPhone:'', clientCompany:'',
    date: new Date().toISOString().slice(0,10),
    startTime:'09:00', endTime:'10:00',
    paymentMethod:'EFECTIVO', membershipId:'', notes:'',
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const { data: spaces = [] } = useQuery({
    queryKey: ['wk-spaces', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/spaces`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['wk-memberships-active', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/memberships?status=ACTIVA`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['wk-reservations', cid, filtroDate, filtroSp],
    queryFn:  () => {
      let url = `/companies/${cid}/workaholic/reservations?`;
      if (filtroDate) url += `date=${filtroDate}&`;
      if (filtroSp)   url += `spaceId=${filtroSp}`;
      return api.get(url).then(r=>r.data);
    },
    enabled: !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/reservations`, form),
    onSuccess: () => {
      setShowNew(false); setError('');
      setForm({ spaceId:'', clientName:'', clientEmail:'', clientPhone:'', clientCompany:'',
        date:new Date().toISOString().slice(0,10), startTime:'09:00', endTime:'10:00',
        paymentMethod:'EFECTIVO', membershipId:'', notes:'' });
      qc.invalidateQueries({ queryKey: ['wk-reservations', cid] });
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al crear reservación'),
  });

  const updateM = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/companies/${cid}/workaholic/reservations/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wk-reservations', cid] }),
  });

  const selSpace = (spaces as any[]).find(s => s.id === form.spaceId);
  const hours = form.startTime && form.endTime
    ? Math.round(((parseInt(form.endTime)-parseInt(form.startTime))*60+(parseInt(form.endTime.split(':')[1])-parseInt(form.startTime.split(':')[1])))/60*100)/100
    : 0;
  const total = selSpace && hours > 0 ? hours * Number(selSpace.pricePerHour||0) : 0;

  // Build calendar grid for today
  const HOURS = Array.from({length:13}, (_,i) => `${(8+i).toString().padStart(2,'0')}:00`);

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Reservaciones</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(s=>!s)}>
            {showNew ? '✕ Cancelar' : '+ Nueva reservación'}
          </button>
        </div>

        {/* Form nueva reservación */}
        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nueva reservación</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Espacio *</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {(spaces as any[]).map((s:any) => (
                    <button key={s.id} onClick={() => set('spaceId', s.id)}
                      style={{ padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:12,
                        border:`2px solid ${form.spaceId===s.id?(TIPO_COLOR[s.type]||color):'#334155'}`,
                        background:form.spaceId===s.id?(TIPO_COLOR[s.type]||color)+'22':'#0f172a',
                        color:form.spaceId===s.id?(TIPO_COLOR[s.type]||color):'#64748b' }}>
                      <span style={{ fontWeight:600 }}>{s.name}</span>
                      <span style={{ fontSize:10, marginLeft:6 }}>{s.pricePerHour?fmt(s.pricePerHour)+'/h':''}</span>
                    </button>
                  ))}
                </div>
              </div>
              {[['Cliente *','clientName','text'],['Empresa','clientCompany','text'],['Email','clientEmail','text'],['Teléfono','clientPhone','text']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} className="input-base" style={{ fontSize:12 }} value={(form as any)[k]}
                    onChange={e => set(k,e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha *</label>
                <input type="date" className="input-base" style={{ fontSize:12 }} value={form.date}
                  min={new Date().toISOString().slice(0,10)} onChange={e => set('date',e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Hora inicio</label>
                <input type="time" className="input-base" style={{ fontSize:12 }} value={form.startTime}
                  onChange={e => set('startTime',e.target.value)} step="1800"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Hora fin</label>
                <input type="time" className="input-base" style={{ fontSize:12 }} value={form.endTime}
                  min={form.startTime} onChange={e => set('endTime',e.target.value)} step="1800"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Método pago</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.paymentMethod}
                  onChange={e => set('paymentMethod',e.target.value)}>
                  {['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO'].map(m=><option key={m}>{m.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Membresía (opcional)</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.membershipId}
                  onChange={e => set('membershipId',e.target.value)}>
                  <option value="">— Sin membresía —</option>
                  {(memberships as any[]).map((m:any) => (
                    <option key={m.id} value={m.id}>{m.holderName} — {m.membershipType?.hoursIncluded-m.hoursUsed}h restantes</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:12 }} value={form.notes}
                  onChange={e => set('notes',e.target.value)}/>
              </div>
            </div>

            {/* Preview */}
            {selSpace && hours > 0 && (
              <div style={{ background:'#0f172a', borderRadius:8, padding:'10px 14px', marginBottom:12,
                display:'flex', gap:24, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#64748b' }}>⏱ {hours}h</span>
                <span style={{ fontSize:12, color:'#64748b' }}>💰 {fmt(selSpace.pricePerHour)}/h</span>
                <span style={{ fontSize:14, fontWeight:800, color }}>Total: {fmt(total)}</span>
                {form.membershipId && <span style={{ fontSize:11, color:'#f59e0b' }}>★ Descuenta horas de membresía</span>}
              </div>
            )}

            {error && <p style={{ fontSize:12, color:'#f87171', margin:'0 0 10px' }}>{error}</p>}
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()}
              disabled={crearM.isPending || !form.spaceId || !form.clientName || !form.startTime || !form.endTime}>
              {crearM.isPending ? 'Reservando…' : 'Confirmar reservación'}
            </button>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
          <input type="date" className="input-base" style={{ fontSize:12, width:160 }}
            value={filtroDate} onChange={e => setFiltroDate(e.target.value)}/>
          <select className="input-base" style={{ fontSize:12, minWidth:180 }}
            value={filtroSp} onChange={e => setFiltroSp(e.target.value)}>
            <option value="">Todos los espacios</option>
            {(spaces as any[]).map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Tabla reservaciones */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Espacio</th><th>Cliente / Empresa</th><th>Fecha</th>
              <th>Horario</th><th style={{textAlign:'right'}}>Total</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && (reservations as any[]).length===0 && (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin reservaciones</td></tr>
              )}
              {(reservations as any[]).map((r:any) => {
                const st = STATUS_COLOR[r.status]||'#64748b';
                const tc = TIPO_COLOR[r.space?.type]||color;
                return (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:tc+'22', color:tc, fontWeight:600 }}>
                        {r.space?.name}
                      </span>
                    </td>
                    <td style={{ fontWeight:500 }}>
                      {r.clientName}
                      {r.clientCompany && <p style={{fontSize:10,color:'#64748b',margin:0}}>{r.clientCompany}</p>}
                    </td>
                    <td style={{ fontSize:12 }}>{fmtDate(r.date)}</td>
                    <td style={{ fontSize:12 }}>{r.startTime} — {r.endTime} <span style={{color:'#64748b'}}>({r.hours}h)</span></td>
                    <td style={{ textAlign:'right', fontWeight:600, color:r.fromMembership?'#f59e0b':color }}>
                      {r.fromMembership ? '★ Membresía' : fmt(r.total)}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:st+'22', color:st, fontWeight:600 }}>{r.status}</span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        {r.status === 'CONFIRMADA' && (
                          <button onClick={() => updateM.mutate({id:r.id,status:'EN_CURSO'})}
                            style={{ background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:11 }}>▶ Iniciar</button>
                        )}
                        {r.status === 'EN_CURSO' && (
                          <button onClick={() => updateM.mutate({id:r.id,status:'COMPLETADA'})}
                            style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:11 }}>✓ Cerrar</button>
                        )}
                        {['CONFIRMADA','PENDIENTE'].includes(r.status) && (
                          <button onClick={() => updateM.mutate({id:r.id,status:'CANCELADA'})}
                            style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:11 }}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
