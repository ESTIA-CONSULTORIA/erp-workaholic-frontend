import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmtDate } from '../lib/api';

const STATUS_COLOR: Record<string,string> = {
  PENDIENTE:'#f59e0b', EN_REVISION:'#3b82f6', APROBADO:'#10b981',
  RECHAZADO:'#f87171', CANCELADO:'#64748b', VENCIDO:'#94a3b8',
};
const TYPE_LABEL: Record<string,string> = {
  VACACION:'Vacaciones', PERMISO:'Permiso', INCAPACIDAD:'Incapacidad',
  BAJA:'Baja', FINIQUITO:'Finiquito', ARQUEO:'Arqueo', GASTO:'Gasto',
};

export default function AprobacionesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();

  const [filtro,   setFiltro]   = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [comment,  setComment]  = useState('');
  const [acting,   setActing]   = useState(false);

  const isApprover = ['admin','administrador','gerente','rh','contador','director'].includes(role);

  const { data: pending = [] } = useQuery({
    queryKey: ['approvals-pending', cid, role],
    queryFn:  () => api.get(`/companies/${cid}/approvals/pending?role=${role}`).then(r => r.data),
    enabled:  !!cid && isApprover,
    refetchInterval: 20000,
  });

  const { data: all = [] } = useQuery({
    queryKey: ['approvals-all', cid, filtro],
    queryFn:  () => api.get(`/companies/${cid}/approvals${filtro?`?status=${filtro}`:''}`).then(r => r.data),
    enabled:  !!cid,
  });

  const actM = useMutation({
    mutationFn: ({ reqId, stepId, approved }: any) =>
      api.put(`/companies/${cid}/approvals/${reqId}/steps/${stepId}/act`, { approved, comment }),
    onSuccess: () => {
      setSelected(null); setComment('');
      qc.invalidateQueries({ queryKey: ['approvals-pending', cid] });
      qc.invalidateQueries({ queryKey: ['approvals-all', cid] });
      qc.invalidateQueries({ queryKey: ['notif-count', cid] });
    },
  });

  const cancelM = useMutation({
    mutationFn: (id: string) => api.put(`/companies/${cid}/approvals/${id}/cancel`, { reason: comment }),
    onSuccess: () => { setSelected(null); setComment(''); qc.invalidateQueries({ queryKey: ['approvals-all', cid] }); },
  });

  const act = async (reqId: string, stepId: string, approved: boolean) => {
    if (!approved && !comment.trim()) { alert('Escribe el motivo de rechazo'); return; }
    setActing(true);
    try { await actM.mutateAsync({ reqId, stepId, approved }); }
    finally { setActing(false); }
  };

  const pendingList = pending as any[];
  const allList     = all as any[];

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 20px' }}>Centro de Aprobaciones</h1>

        {/* Pendientes para mí */}
        {isApprover && pendingList.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:'#f59e0b', margin:'0 0 10px',
              textTransform:'uppercase', letterSpacing:1 }}>
              ⏳ Pendientes de tu aprobación ({pendingList.length})
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {pendingList.map((step: any) => (
                <div key={step.id} style={{ background:'rgba(245,158,11,0.08)', border:'1px solid #f59e0b44',
                  borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', margin:'0 0 2px' }}>
                      {TYPE_LABEL[step.request?.type] || step.request?.type}
                      <span style={{ fontSize:11, color:'#64748b', fontWeight:400, marginLeft:8 }}>
                        Paso {step.stepOrder} · {step.roleRequired}
                      </span>
                    </p>
                    <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{fmtDate(step.request?.createdAt)}</p>
                    {step.request?.metadata && (
                      <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0' }}>
                        {Object.entries(step.request.metadata as any).slice(0,3).map(([k,v])=>`${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => setSelected({ ...step.request, _stepId: step.id })}
                      style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${color}`,
                        background:'none', color, cursor:'pointer', fontSize:12 }}>
                      Detalle
                    </button>
                    <button onClick={() => act(step.request.id, step.id, true)} disabled={acting}
                      style={{ padding:'6px 12px', borderRadius:7, border:'none',
                        background:'#10b981', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      ✓ Aprobar
                    </button>
                    <button onClick={() => setSelected({ ...step.request, _stepId: step.id, _reject: true })}
                      style={{ padding:'6px 12px', borderRadius:7, border:'none',
                        background:'#f87171', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      ✕ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          {['','PENDIENTE','EN_REVISION','APROBADO','RECHAZADO'].map(s => (
            <button key={s} onClick={() => setFiltro(s)}
              style={{ padding:'4px 12px', borderRadius:99, fontSize:11, cursor:'pointer',
                border:`1px solid ${filtro===s?color:'#334155'}`,
                background:filtro===s?color+'22':'transparent',
                color:filtro===s?color:'#64748b', fontWeight:filtro===s?700:400 }}>
              {s || 'Todas'}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Tipo</th><th>Fecha</th><th>Prioridad</th><th>Paso</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody>
              {allList.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin solicitudes</td></tr>
              )}
              {allList.map((r: any) => {
                const st = STATUS_COLOR[r.status] || '#64748b';
                const step = r.steps?.find((s:any) => s.stepOrder === r.currentStep);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight:600 }}>{TYPE_LABEL[r.type] || r.type}</td>
                    <td style={{ fontSize:12 }}>{fmtDate(r.createdAt)}</td>
                    <td style={{ fontSize:11, color:r.priority==='ALTA'?'#f87171':r.priority==='URGENTE'?'#f97316':'#64748b' }}>
                      {r.priority}
                    </td>
                    <td style={{ fontSize:12, color:'#64748b' }}>
                      {step ? `${step.stepOrder}/${r.steps?.length} · ${step.roleRequired}` : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:st+'22', color:st, fontWeight:600 }}>{r.status}</span>
                    </td>
                    <td>
                      <button onClick={() => setSelected(r)}
                        style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24,
            width:500, maxHeight:'85vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0, color }}>
                {TYPE_LABEL[selected.type] || selected.type}
                <span style={{ fontSize:11, color:'#64748b', fontWeight:400, marginLeft:8 }}>{selected.status}</span>
              </h3>
              <button onClick={() => { setSelected(null); setComment(''); }}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            {selected.metadata && (
              <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:14 }}>
                {Object.entries(selected.metadata as any).map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:11, color:'#64748b', textTransform:'capitalize' }}>{k}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'#f1f5f9' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Steps */}
            <p style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', margin:'0 0 8px' }}>Flujo</p>
            {(selected.steps || []).map((s: any) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'6px 10px', background:'#0f172a', borderRadius:7, marginBottom:4 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0,
                  background: s.status==='APROBADO'?'#10b981':s.status==='RECHAZADO'?'#f87171':'#334155',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>
                  {s.status==='APROBADO'?'✓':s.status==='RECHAZADO'?'✕':s.stepOrder}
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:12, color:'#f1f5f9' }}>{s.roleRequired}</span>
                  {s.comment && <p style={{ fontSize:11, color:'#64748b', margin:'2px 0 0' }}>"{s.comment}"</p>}
                </div>
                <span style={{ fontSize:10, color: s.status==='APROBADO'?'#10b981':s.status==='RECHAZADO'?'#f87171':'#475569' }}>
                  {s.status}
                </span>
              </div>
            ))}

            {/* Action */}
            {(selected.status === 'PENDIENTE' || selected.status === 'EN_REVISION') && isApprover && (
              <div style={{ marginTop:16 }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                  Comentario {selected._reject ? '(requerido)' : '(opcional)'}
                </label>
                <input className="input-base" style={{ fontSize:13, marginBottom:10 }}
                  placeholder="Observación o motivo..."
                  value={comment} onChange={e => setComment(e.target.value)}/>
                <div style={{ display:'flex', gap:8 }}>
                  {(selected.steps || [])
                    .filter((s:any) => s.status==='PENDIENTE' && s.stepOrder===selected.currentStep)
                    .map((s:any) => (
                      <div key={s.id} style={{ display:'flex', gap:8, flex:1 }}>
                        {!selected._reject && (
                          <button onClick={() => act(selected.id, s.id, true)} disabled={acting}
                            style={{ flex:1, padding:'8px', borderRadius:8, border:'none',
                              background:'#10b981', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                            ✓ Aprobar
                          </button>
                        )}
                        <button onClick={() => act(selected.id, s.id, false)} disabled={acting}
                          style={{ flex:1, padding:'8px', borderRadius:8, border:'none',
                            background:'#f87171', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                          ✕ Rechazar
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
