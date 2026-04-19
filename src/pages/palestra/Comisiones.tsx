import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const STATUS_COLOR: Record<string,string> = {
  PENDIENTE:'#f59e0b', LIBERADA:'#10b981', PAGADA:'#3b82f6', CONGELADA:'#f87171'
};

function getWeekPeriod() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

export default function ComisionesPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#10b981';
  const qc    = useQueryClient();

  const [filtroStatus,  setFiltroStatus]  = useState('');
  const [filtroCoach,   setFiltroCoach]   = useState('');
  const [filtroWeek,    setFiltroWeek]    = useState(getWeekPeriod());
  const [freezeModal,   setFreezeModal]   = useState<any>(null);
  const [freezeReason,  setFreezeReason]  = useState('');

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions', cid, filtroStatus, filtroCoach, filtroWeek],
    queryFn:  () => {
      let url = `/companies/${cid}/palestra/commissions?`;
      if (filtroStatus) url += `status=${filtroStatus}&`;
      if (filtroCoach)  url += `employeeId=${filtroCoach}&`;
      if (filtroWeek)   url += `week=${filtroWeek}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=ACTIVO`).then(r => r.data),
    enabled:  !!cid,
  });

  const releaseM = useMutation({
    mutationFn: (employeeId?: string) => api.post(`/companies/${cid}/palestra/commissions/release`, {
      weekPeriod: filtroWeek, employeeId: employeeId || undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions', cid] }),
  });

  const freezeM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/palestra/commissions/${freezeModal.id}/freeze`, { reason: freezeReason }),
    onSuccess:  () => { setFreezeModal(null); setFreezeReason(''); qc.invalidateQueries({ queryKey: ['commissions', cid] }); },
  });

  const list = commissions as any[];
  const totalPendiente = list.filter(c => c.status==='PENDIENTE').reduce((t,c) => t+Number(c.amount),0);
  const totalLiberada  = list.filter(c => c.status==='LIBERADA').reduce((t,c) => t+Number(c.amount),0);
  const totalCongelada = list.filter(c => c.status==='CONGELADA').reduce((t,c) => t+Number(c.amount),0);

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Comisiones de Coaches</h1>
          <button onClick={() => releaseM.mutate(undefined)}
            disabled={releaseM.isPending}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            ✓ Liberar todas pendientes ({filtroWeek})
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'Pendientes',  value:totalPendiente, col:'#f59e0b', count:list.filter(c=>c.status==='PENDIENTE').length },
            { label:'Liberadas',   value:totalLiberada,  col:'#10b981', count:list.filter(c=>c.status==='LIBERADA').length  },
            { label:'Congeladas',  value:totalCongelada, col:'#f87171', count:list.filter(c=>c.status==='CONGELADA').length },
          ].map(k => (
            <div key={k.label} style={{ background:'#1e293b', borderRadius:10, padding:14, border:`1px solid #334155`, borderLeft:`4px solid ${k.col}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px', textTransform:'uppercase' }}>{k.label} ({k.count})</p>
              <p style={{ fontSize:22, fontWeight:800, color:k.col, margin:0 }}>{fmt(k.value)}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <input type="week" className="input-base" style={{ fontSize:12 }}
            value={filtroWeek} onChange={e => setFiltroWeek(e.target.value)}/>
          <select className="input-base" style={{ fontSize:12 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {['PENDIENTE','LIBERADA','PAGADA','CONGELADA'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-base" style={{ fontSize:12 }} value={filtroCoach} onChange={e => setFiltroCoach(e.target.value)}>
            <option value="">Todos los coaches</option>
            {(coaches as any[]).map((c:any) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
          {filtroCoach && (
            <button onClick={() => releaseM.mutate(filtroCoach)}
              style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`, background:'none', color, cursor:'pointer', fontSize:12 }}>
              Liberar solo este coach
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Coach</th><th>Cliente</th><th>Servicio</th>
              <th>Semana</th><th style={{textAlign:'right'}}>Comisión</th>
              <th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && list.length===0 && (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin comisiones</td></tr>
              )}
              {list.map((c:any) => (
                <tr key={c.id}>
                  <td style={{ fontWeight:500 }}>{c.employee?.firstName} {c.employee?.lastName}</td>
                  <td style={{ fontSize:12 }}>{c.clientName}</td>
                  <td style={{ fontSize:12, color:'#64748b' }}>{c.service}</td>
                  <td style={{ fontSize:11, color:'#475569' }}>{c.weekPeriod}</td>
                  <td style={{ textAlign:'right', fontWeight:700, color }}>{fmt(c.amount)}</td>
                  <td>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                      background:(STATUS_COLOR[c.status]||'#64748b')+'22',
                      color:STATUS_COLOR[c.status]||'#64748b', fontWeight:600 }}>
                      {c.status}
                    </span>
                    {c.frozenReason && (
                      <p style={{ fontSize:10, color:'#f87171', margin:'2px 0 0' }}>{c.frozenReason}</p>
                    )}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      {c.status === 'PENDIENTE' && (
                        <>
                          <button onClick={() => releaseM.mutate(c.employeeId)}
                            style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                            Liberar
                          </button>
                          <button onClick={() => { setFreezeModal(c); setFreezeReason(''); }}
                            style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
                            Congelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal congelar */}
      {freezeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:380, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px', color:'#f87171' }}>Congelar comisión</h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 16px' }}>
              {freezeModal.employee?.firstName} — {freezeModal.service} — {fmt(freezeModal.amount)}
            </p>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Motivo *</label>
            <input className="input-base" style={{ fontSize:13, marginBottom:16 }}
              placeholder="Ej: Cliente pendiente de pago"
              value={freezeReason} onChange={e => setFreezeReason(e.target.value)}/>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1, fontSize:13 }} onClick={() => setFreezeModal(null)}>Cancelar</button>
              <button onClick={() => freezeM.mutate()} disabled={freezeM.isPending || !freezeReason}
                style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#f87171', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                {freezeM.isPending ? 'Congelando…' : 'Congelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
