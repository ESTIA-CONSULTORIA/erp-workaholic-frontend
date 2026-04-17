import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate } from '../lib/api';

const EMPRESA_COLOR: Record<string,string> = {
  MACHETE:'#B5451B', WORKAHOLIC:'#3b82f6', PALESTRA:'#10b981', LONCHE:'#f59e0b'
};

export default function IntercompanyPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();

  const esAdmin = ['admin','administrador','gerente','director'].includes(role);

  const [showNew, setShowNew] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    toCompanyId: '', amount: '', concept: '',
    date: new Date().toISOString().slice(0,10), currency: 'MXN', notes: ''
  });
  const set = (k:string, v:any) => setForm(f => ({...f, [k]:v}));

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['intercompany', cid, activePeriod],
    queryFn:  () => api.get(`/companies/${cid}/intercompany?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  // Get all companies for selector
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn:  () => api.get('/api/v1/companies').then(r => r.data).catch(() => []),
    enabled:  !!cid && showNew,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/intercompany`, { ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      setShowNew(false);
      setForm({ toCompanyId:'', amount:'', concept:'', date:new Date().toISOString().slice(0,10), currency:'MXN', notes:'' });
      qc.invalidateQueries({ queryKey: ['intercompany', cid] });
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al crear'),
  });

  const aprobarM = useMutation({
    mutationFn: ({ id, approved }: any) => api.put(`/companies/${cid}/intercompany/${id}/approve`, { approved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intercompany', cid] }),
  });

  const STATUS_COLOR: Record<string,string> = {
    PENDIENTE:'#f59e0b', APROBADO:'#10b981', RECHAZADO:'#f87171'
  };

  const totalEnviado  = (transfers as any[]).filter((t:any) => t.fromCompanyId === cid && t.status==='APROBADO').reduce((s:number,t:any)=>s+Number(t.amount),0);
  const totalRecibido = (transfers as any[]).filter((t:any) => t.toCompanyId === cid   && t.status==='APROBADO').reduce((s:number,t:any)=>s+Number(t.amount),0);
  const pendientes    = (transfers as any[]).filter((t:any) => t.status === 'PENDIENTE').length;

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Intercompany</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => { setShowNew(!showNew); setError(''); }}>
            {showNew ? 'Cancelar' : '+ Nueva transferencia'}
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Enviado (aprobado)',   value: fmt(totalEnviado),  col:'#f87171' },
            { label:'Recibido (aprobado)',  value: fmt(totalRecibido), col:'#10b981' },
            { label:'Pendientes aprobación',value: String(pendientes), col:'#f59e0b' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        {showNew && (
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nueva transferencia intercompany</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Empresa destino *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.toCompanyId}
                  onChange={e => set('toCompanyId', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {(allCompanies as any[]).filter((c:any) => c.id !== cid).map((c:any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Monto *</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={form.amount} onChange={e => set('amount', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.date} onChange={e => set('date', e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Concepto *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.concept}
                  onChange={e => set('concept', e.target.value)} placeholder="Préstamo, apoyo de capital, etc."/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Moneda</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.currency}
                  onChange={e => set('currency', e.target.value)}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)} placeholder="Observaciones"/>
              </div>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:13, margin:'0 0 12px' }}>{error}</p>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()} disabled={crearM.isPending || !form.toCompanyId || !form.amount || !form.concept}>
                {crearM.isPending ? 'Creando…' : 'Crear solicitud'}
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha</th>
              <th>De</th>
              <th>A</th>
              <th>Concepto</th>
              <th style={{textAlign:'right'}}>Monto</th>
              <th>Estado</th>
              {esAdmin && <th>Acciones</th>}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={esAdmin?7:6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && (transfers as any[]).length===0 && (
                <tr><td colSpan={esAdmin?7:6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin transferencias en este período</td></tr>
              )}
              {(transfers as any[]).map((t:any) => {
                const esMia = t.fromCompanyId === cid;
                return (
                  <tr key={t.id}>
                    <td style={{ fontSize:12 }}>{fmtDate(t.date)}</td>
                    <td>
                      <span style={{ fontSize:12, fontWeight:500,
                        color: EMPRESA_COLOR[t.fromCompany?.code] || '#94a3b8' }}>
                        {t.fromCompany?.name}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize:12, fontWeight:500,
                        color: EMPRESA_COLOR[t.toCompany?.code] || '#94a3b8' }}>
                        {t.toCompany?.name}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'#94a3b8', maxWidth:160,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {t.concept}
                    </td>
                    <td style={{ textAlign:'right', fontWeight:700,
                      color: esMia ? '#f87171' : '#10b981' }}>
                      {esMia ? '-' : '+'}{fmt(t.amount)} {t.currency}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:(STATUS_COLOR[t.status]||'#64748b')+'22',
                        color: STATUS_COLOR[t.status]||'#64748b' }}>
                        {t.status}
                      </span>
                    </td>
                    {esAdmin && (
                      <td>
                        {t.status === 'PENDIENTE' && (
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => aprobarM.mutate({ id:t.id, approved:true })}
                              style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                              ✓ Aprobar
                            </button>
                            <button onClick={() => aprobarM.mutate({ id:t.id, approved:false })}
                              style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
                              ✕ Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    )}
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
