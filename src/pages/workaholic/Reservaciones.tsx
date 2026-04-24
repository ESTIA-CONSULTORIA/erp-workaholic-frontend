import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TYPE_ICON: Record<string,string> = { OFICINA:'🏢', SALA_JUNTAS:'👥', SALA_CAPACITACION:'📚', COWORKING:'💻', LOCKER:'🔒' };
const STATUS_COLOR: Record<string,string> = { PENDIENTE:'#f59e0b', CONFIRMADA:'#10b981', EN_CURSO:'#3b82f6', COMPLETADA:'#64748b', CANCELADA:'#f87171' };

const HOURS = Array.from({length:14},(_,i)=>`${String(i+7).padStart(2,'0')}:00`);

export default function ReservacionesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [showNew,  setShowNew]  = useState(false);
  const [filtroSpc,setFiltroSpc]= useState('');
  const [error,    setError]    = useState('');
  const [form, setForm] = useState({
    spaceId:'', clientName:'', clientEmail:'', clientPhone:'', clientCompany:'',
    date: new Date().toISOString().slice(0,10),
    startTime:'09:00', endTime:'11:00',
    paymentMethod:'EFECTIVO', membershipId:'', notes:'',
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const { data: spaces = [] } = useQuery({
    queryKey: ['workaholic-spaces', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/spaces`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['workaholic-memberships', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/memberships?status=ACTIVA`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['workaholic-reservations', cid, selectedDate, filtroSpc],
    queryFn:  () => {
      let url = `/companies/${cid}/workaholic/reservations?date=${selectedDate}`;
      if (filtroSpc) url += `&spaceId=${filtroSpc}`;
      return api.get(url).then(r=>r.data);
    },
    enabled: !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/reservations`, form),
    onSuccess: () => {
      setShowNew(false); setError('');
      setForm({ spaceId:'', clientName:'', clientEmail:'', clientPhone:'', clientCompany:'',
        date:new Date().toISOString().slice(0,10), startTime:'09:00', endTime:'11:00',
        paymentMethod:'EFECTIVO', membershipId:'', notes:'' });
      qc.invalidateQueries({ queryKey: ['workaholic-reservations', cid] });
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al reservar'),
  });

  const cancelM = useMutation({
    mutationFn: (id:string) => api.put(`/companies/${cid}/workaholic/reservations/${id}`, { status:'CANCELADA' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workaholic-reservations', cid] }),
  });

  const selectedSpace = (spaces as any[]).find((s:any) => s.id === form.spaceId);
  const hours = form.startTime && form.endTime
    ? Math.max(0, ((parseInt(form.endTime)-parseInt(form.startTime)) || 0))
    : 0;
  const totalEstimado = selectedSpace?.pricePerHour
    ? Number(selectedSpace.pricePerHour) * (parseInt(form.endTime) - parseInt(form.startTime))
    : 0;

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Reservaciones</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => { setShowNew(s=>!s); setError(''); }}>
            {showNew ? '✕ Cancelar' : '+ Nueva reservación'}
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px' }}>Nueva reservación</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Espacio *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.spaceId}
                  onChange={e => set('spaceId', e.target.value)}>
                  <option value="">— Seleccionar espacio —</option>
                  {(spaces as any[]).map((s:any) => (
                    <option key={s.id} value={s.id}>{TYPE_ICON[s.type]} {s.name} — {fmt(s.pricePerHour||0)}/hr</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha *</label>
                <input type="date" className="input-base" style={{ fontSize:12 }}
                  value={form.date} onChange={e => set('date', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Hora inicio *</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.startTime}
                  onChange={e => set('startTime', e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Hora fin *</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.endTime}
                  onChange={e => set('endTime', e.target.value)}>
                  {HOURS.filter(h => h > form.startTime).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Cliente *</label>
                <input className="input-base" style={{ fontSize:12 }} value={form.clientName}
                  onChange={e => set('clientName', e.target.value)} placeholder="Nombre"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Empresa</label>
                <input className="input-base" style={{ fontSize:12 }} value={form.clientCompany}
                  onChange={e => set('clientCompany', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Teléfono</label>
                <input className="input-base" style={{ fontSize:12 }} value={form.clientPhone}
                  onChange={e => set('clientPhone', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Método de pago</label>
                <select className="input-base" style={{ fontSize:12 }} value={form.paymentMethod}
                  onChange={e => set('paymentMethod', e.target.value)}>
                  {['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO','MEMBRESIA'].map(m=>(
                    <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              {form.paymentMethod === 'MEMBRESIA' && (
                <div>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Membresía</label>
                  <select className="input-base" style={{ fontSize:12 }} value={form.membershipId}
                    onChange={e => set('membershipId', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {(memberships as any[]).map((m:any) => (
                      <option key={m.id} value={m.id}>{m.folio} · {m.holderName} ({m.membershipType?.hoursIncluded - m.hoursUsed}h restantes)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {selectedSpace && form.startTime && form.endTime && (
              <div style={{ padding:'8px 14px', borderRadius:8, background:'#0f172a', marginBottom:12,
                display:'flex', gap:20, fontSize:12 }}>
                <span style={{ color:'#64748b' }}>Espacio: <strong style={{color:'#f1f5f9'}}>{selectedSpace.name}</strong></span>
                <span style={{ color:'#64748b' }}>Horas: <strong style={{color:color}}>{form.endTime} - {form.startTime}</strong></span>
                <span style={{ color:'#64748b' }}>Total estimado: <strong style={{color:'#10b981'}}>{fmt(totalEstimado)}</strong></span>
              </div>
            )}
            {error && <p style={{ fontSize:12, color:'#f87171', margin:'0 0 10px', fontWeight:600 }}>⚠ {error}</p>}
            <button className="btn-primary" style={{ background:color, fontSize:13 }}
              onClick={() => crearM.mutate()}
              disabled={crearM.isPending || !form.spaceId || !form.clientName || !form.date}>
              {crearM.isPending ? 'Reservando…' : '✓ Confirmar reservación'}
            </button>
          </div>
        )}

        {/* Filtros y fecha */}
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
          <input type="date" className="input-base" style={{ fontSize:12, maxWidth:160 }}
            value={selectedDate} onChange={e => setSelectedDate(e.target.value)}/>
          <select className="input-base" style={{ fontSize:12, maxWidth:220 }}
            value={filtroSpc} onChange={e => setFiltroSpc(e.target.value)}>
            <option value="">Todos los espacios</option>
            {(spaces as any[]).map((s:any) => (
              <option key={s.id} value={s.id}>{TYPE_ICON[s.type]} {s.name}</option>
            ))}
          </select>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Espacio</th><th>Cliente</th><th>Horario</th>
              <th style={{textAlign:'right'}}>Total</th><th>Pago</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && (reservations as any[]).length===0 && (
                <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin reservaciones para esta fecha</td></tr>
              )}
              {(reservations as any[]).map((r:any) => {
                const st = STATUS_COLOR[r.status]||'#64748b';
                return (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontSize:14, marginRight:6 }}>{TYPE_ICON[r.space?.type]||'🏢'}</span>
                      <span style={{ fontSize:12, fontWeight:500 }}>{r.space?.name}</span>
                    </td>
                    <td>
                      <p style={{ fontSize:12, fontWeight:500, margin:0 }}>{r.clientName}</p>
                      {r.clientCompany && <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{r.clientCompany}</p>}
                    </td>
                    <td style={{ fontSize:12, fontWeight:600, color }}>{r.startTime} – {r.endTime}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>
                      {r.fromMembership ? <span style={{color:'#8b5cf6',fontSize:11}}>📋 Membresía</span> : fmt(r.total)}
                    </td>
                    <td style={{ fontSize:11, color:'#64748b' }}>{r.paymentMethod?.replace(/_/g,' ')}</td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:st+'22', color:st, fontWeight:600 }}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {['PENDIENTE','CONFIRMADA'].includes(r.status) && (
                        <button onClick={() => cancelM.mutate(r.id)}
                          style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:11 }}>
                          Cancelar
                        </button>
                      )}
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
