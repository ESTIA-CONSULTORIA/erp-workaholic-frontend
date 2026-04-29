// ╔═══════════════════════════════════════════════════════════════╗
// ║  COACHES — Palestra                                          ║
// ║  Gestión de comisiones por coach                             ║
// ║  PENDIENTE → LIBERADA → PAGADA (en nómina) | CONGELADA      ║
// ╚═══════════════════════════════════════════════════════════════╝
import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  PENDIENTE:  { label: 'Pendiente',  color: '#f59e0b', icon: '⏳' },
  LIBERADA:   { label: 'Liberada',   color: '#3b82f6', icon: '✅' },
  PAGADA:     { label: 'Pagada',     color: '#10b981', icon: '💰' },
  CONGELADA:  { label: 'Congelada',  color: '#f87171', icon: '🧊' },
};

function getWeekPeriod(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function CoachesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';
  const qc    = useQueryClient();

  const [semana,        setSemana]        = useState(getWeekPeriod());
  const [filtroCoach,   setFiltroCoach]   = useState('');
  const [filtroStatus,  setFiltroStatus]  = useState('');
  const [showNew,       setShowNew]       = useState(false);
  const [showFreeze,    setShowFreeze]    = useState<any>(null);
  const [motivoFreeze,  setMotivoFreeze]  = useState('');
  const [form, setForm] = useState({
    employeeId: '', clientName: '', service: '', amount: '',
  });

  // ── Queries ──────────────────────────────────────────────────
  const { data: comisiones = [], isLoading } = useQuery({
    queryKey: ['commissions', cid, semana, filtroCoach, filtroStatus],
    queryFn:  () => api.get(`/companies/${cid}/palestra/commissions`, {
      params: {
        week:       semana || undefined,
        employeeId: filtroCoach || undefined,
        status:     filtroStatus || undefined,
      },
    }).then(r => r.data),
    enabled: !!cid,
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=ACTIVO`).then(r => r.data),
    enabled:  !!cid,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const createM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/commissions`, {
      ...form, amount: Number(form.amount), weekPeriod: semana,
    }),
    onSuccess: () => {
      setShowNew(false);
      setForm({ employeeId:'', clientName:'', service:'', amount:'' });
      qc.invalidateQueries({ queryKey: ['commissions', cid] });
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error'),
  });

  const releaseM = useMutation({
    mutationFn: ({ week, coachId }: any) =>
      api.post(`/companies/${cid}/palestra/commissions/release`, {
        weekPeriod: week, employeeId: coachId || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions', cid] }),
    onError: (e: any) => alert(e.response?.data?.message || 'Error'),
  });

  const freezeM = useMutation({
    mutationFn: ({ id, reason }: any) =>
      api.put(`/companies/${cid}/palestra/commissions/${id}/freeze`, { reason }),
    onSuccess: () => {
      setShowFreeze(null);
      setMotivoFreeze('');
      qc.invalidateQueries({ queryKey: ['commissions', cid] });
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error'),
  });

  // ── Cálculos ──────────────────────────────────────────────────
  const list = comisiones as any[];
  const totales = {
    pendiente: list.filter(c => c.status === 'PENDIENTE').reduce((t, c) => t + Number(c.amount), 0),
    liberada:  list.filter(c => c.status === 'LIBERADA').reduce((t, c) => t + Number(c.amount), 0),
    pagada:    list.filter(c => c.status === 'PAGADA').reduce((t, c) => t + Number(c.amount), 0),
  };

  // Agrupar por coach
  const porCoach = list.reduce((acc: any, c: any) => {
    const name = `${c.employee?.firstName || ''} ${c.employee?.lastName || ''}`.trim();
    if (!acc[c.employeeId]) acc[c.employeeId] = { name, id: c.employeeId, items: [] };
    acc[c.employeeId].items.push(c);
    return acc;
  }, {});

  const hayPendientes = list.some(c => c.status === 'PENDIENTE');

  return (
    <AppLayout>
      <div style={{ maxWidth: 1000 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:'0 0 3px' }}>Comisiones Coaches</h1>
            <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
              Palestra · Semana {semana}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="week" value={semana.replace('-W','-W')}
              onChange={e => setSemana(e.target.value.replace('W0','W').replace('W', 'W'))}
              style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #334155',
                background:'#0f172a', color:'#f1f5f9', fontSize:12 }}/>
            {hayPendientes && (
              <button onClick={() => {
                if (window.confirm('¿Liberar TODAS las comisiones pendientes de esta semana?'))
                  releaseM.mutate({ week: semana });
              }}
                disabled={releaseM.isPending}
                style={{ padding:'8px 16px', borderRadius:8, border:'none',
                  background:'#3b82f6', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                {releaseM.isPending ? 'Liberando…' : '✅ Liberar semana'}
              </button>
            )}
            <button onClick={() => setShowNew(true)}
              style={{ padding:'8px 18px', borderRadius:8, border:'none',
                background:color, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700 }}>
              + Nueva comisión
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Pendiente de liberar', value:totales.pendiente, col:'#f59e0b', icon:'⏳' },
            { label:'Liberada (por pagar)',  value:totales.liberada,  col:'#3b82f6', icon:'✅' },
            { label:'Pagada este período',   value:totales.pagada,    col:'#10b981', icon:'💰' },
          ].map(k => (
            <div key={k.label} style={{ background:'#1e293b', borderRadius:10, padding:14,
              border:`1px solid ${k.col}33`, borderLeft:`4px solid ${k.col}` }}>
              <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px', textTransform:'uppercase' }}>
                {k.icon} {k.label}
              </p>
              <p style={{ fontSize:24, fontWeight:800, color:k.col, margin:0 }}>{fmt(k.value)}</p>
            </div>
          ))}
        </div>

        {/* ── Filtros ── */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <select value={filtroCoach} onChange={e => setFiltroCoach(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #334155',
              background:'#0f172a', color:'#f1f5f9', fontSize:12 }}>
            <option value="">Todos los coaches</option>
            {(coaches as any[]).map((c: any) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #334155',
              background:'#0f172a', color:'#f1f5f9', fontSize:12 }}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        {/* ── Lista por coach ── */}
        {isLoading ? (
          <p style={{ textAlign:'center', color:'#64748b', padding:40 }}>Cargando comisiones…</p>
        ) : list.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, background:'#1e293b',
            borderRadius:12, border:'1px dashed #334155' }}>
            <p style={{ fontSize:36, margin:'0 0 12px' }}>⭐</p>
            <p style={{ fontSize:15, fontWeight:600, color:'#64748b', margin:'0 0 6px' }}>
              Sin comisiones en esta semana
            </p>
            <p style={{ fontSize:12, color:'#475569' }}>
              Las comisiones se generan automáticamente al registrar ventas con coach asignado,
              o puedes agregarlas manualmente.
            </p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {Object.values(porCoach).map((coach: any) => {
              const totalCoach = coach.items.reduce((t: number, c: any) => t + Number(c.amount), 0);
              const pendCoach  = coach.items.filter((c: any) => c.status === 'PENDIENTE');
              return (
                <div key={coach.id} style={{ background:'#1e293b', borderRadius:12,
                  border:'1px solid #334155', overflow:'hidden' }}>
                  {/* Coach header */}
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #334155',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    background: '#0f172a' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%',
                        background:color+'22', display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:16, fontWeight:800, color }}>
                        {coach.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:'0 0 2px' }}>
                          {coach.name}
                        </p>
                        <p style={{ fontSize:11, color:'#64748b', margin:0 }}>
                          {coach.items.length} comisiones · Total: {fmt(totalCoach)}
                        </p>
                      </div>
                    </div>
                    {pendCoach.length > 0 && (
                      <button onClick={() => {
                        if (window.confirm(`¿Liberar ${pendCoach.length} comisiones de ${coach.name}?`))
                          releaseM.mutate({ week: semana, coachId: coach.id });
                      }}
                        style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #3b82f6',
                          background:'none', color:'#3b82f6', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        ✅ Liberar ({pendCoach.length})
                      </button>
                    )}
                  </div>
                  {/* Comisiones */}
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Fecha</th><th>Cliente</th><th>Servicio</th>
                        <th style={{textAlign:'right'}}>Comisión</th>
                        <th>Estado</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {coach.items.map((c: any) => {
                        const st = STATUS_CFG[c.status] || STATUS_CFG['PENDIENTE'];
                        return (
                          <tr key={c.id}>
                            <td style={{ fontSize:11, color:'#64748b', whiteSpace:'nowrap' }}>
                              {fmtDate(c.createdAt)}
                            </td>
                            <td style={{ fontSize:12 }}>{c.clientName}</td>
                            <td style={{ fontSize:12, color:'#94a3b8' }}>{c.service}</td>
                            <td style={{ textAlign:'right', fontWeight:700, color }}>
                              {fmt(c.amount)}
                            </td>
                            <td>
                              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                                fontWeight:600, background:st.color+'22', color:st.color }}>
                                {st.icon} {st.label}
                              </span>
                              {c.frozenReason && (
                                <p style={{ fontSize:9, color:'#64748b', margin:'2px 0 0' }}>
                                  {c.frozenReason}
                                </p>
                              )}
                            </td>
                            <td>
                              {c.status === 'PENDIENTE' && (
                                <button onClick={() => { setShowFreeze(c); setMotivoFreeze(''); }}
                                  style={{ padding:'3px 8px', borderRadius:5, border:'1px solid #f87171',
                                    background:'none', color:'#f87171', cursor:'pointer', fontSize:10 }}>
                                  🧊 Congelar
                                </button>
                              )}
                              {c.status === 'CONGELADA' && (
                                <button onClick={() => releaseM.mutate({ id: c.id })}
                                  style={{ padding:'3px 8px', borderRadius:5, border:'1px solid #3b82f6',
                                    background:'none', color:'#3b82f6', cursor:'pointer', fontSize:10 }}>
                                  ↺ Liberar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Nueva comisión manual ── */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:14, padding:28,
            width:440, border:`1px solid ${color}44` }}>
            <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 4px', color }}>
              Nueva comisión manual
            </h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 18px' }}>
              Las comisiones también se generan automáticamente al hacer ventas con coach asignado.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Coach *</label>
                <select className="input-base" style={{ fontSize:13 }}
                  value={form.employeeId} onChange={e => setForm(f=>({...f,employeeId:e.target.value}))}>
                  <option value="">— Seleccionar coach —</option>
                  {(coaches as any[]).map((c:any) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Cliente *</label>
                <input className="input-base" style={{ fontSize:13 }} placeholder="Nombre del cliente"
                  value={form.clientName} onChange={e => setForm(f=>({...f,clientName:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Servicio *</label>
                <input className="input-base" style={{ fontSize:13 }} placeholder="Ej: Clase personal, Clínica spinning"
                  value={form.service} onChange={e => setForm(f=>({...f,service:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Monto comisión *</label>
                <input type="number" className="input-base" style={{ fontSize:16, fontWeight:700 }}
                  placeholder="0.00" min={0}
                  value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowNew(false)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={() => createM.mutate()}
                disabled={createM.isPending || !form.employeeId || !form.clientName || !form.service || !form.amount}
                style={{ flex:2, padding:'10px', borderRadius:8, border:'none',
                  background: form.employeeId && form.amount ? color : '#334155',
                  color:'#fff', cursor: form.employeeId && form.amount ? 'pointer' : 'not-allowed',
                  fontSize:13, fontWeight:700 }}>
                {createM.isPending ? 'Guardando…' : '+ Registrar comisión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Congelar comisión ── */}
      {showFreeze && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:14, padding:28,
            width:400, border:'1px solid #f8717144' }}>
            <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 4px', color:'#f87171' }}>
              🧊 Congelar comisión
            </h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>
              {showFreeze.clientName} · {showFreeze.service}
            </p>
            <p style={{ fontSize:16, fontWeight:700, color, margin:'0 0 16px' }}>
              {fmt(showFreeze.amount)}
            </p>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>
                Motivo de congelamiento *
              </label>
              <input className="input-base" style={{ fontSize:13 }}
                placeholder="Ej: Pendiente de verificar, disputa con cliente…"
                value={motivoFreeze} onChange={e => setMotivoFreeze(e.target.value)} autoFocus/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowFreeze(null)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={() => freezeM.mutate({ id: showFreeze.id, reason: motivoFreeze })}
                disabled={freezeM.isPending || !motivoFreeze.trim()}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background: motivoFreeze.trim() ? '#f87171' : '#334155',
                  color:'#fff', cursor: motivoFreeze.trim() ? 'pointer' : 'not-allowed',
                  fontSize:13, fontWeight:700 }}>
                {freezeM.isPending ? 'Congelando…' : '🧊 Congelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
