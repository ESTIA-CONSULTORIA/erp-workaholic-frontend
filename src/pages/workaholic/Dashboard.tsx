import AppLayout from '../../components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const TYPE_ICON: Record<string,string> = {
  OFICINA:'🏢', SALA_JUNTAS:'👥', SALA_CAPACITACION:'📚', COWORKING:'💻', LOCKER:'🔒'
};

export default function WorkaholicDashboard() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const qc    = useQueryClient();

  const { data: dash } = useQuery({
    queryKey: ['workaholic-dashboard', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/dashboard`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 60000,
  });

  const checkM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/memberships/check-expired`, {}),
    onSuccess: (data:any) => {
      alert(`${data.expired} membresía(s) marcadas como vencidas`);
      qc.invalidateQueries({ queryKey: ['workaholic-dashboard', cid] });
    },
  });

  const kpis = [
    { label:'Total membresías', value: dash?.totalMem   || 0, col:color,    icon:'📋', isNum:true },
    { label:'Activas',          value: dash?.activeMem  || 0, col:'#10b981', icon:'✅', isNum:true },
    { label:'Vencidas',         value: dash?.vencidasMem|| 0, col:'#f87171', icon:'⚠',  isNum:true },
    { label:'Espacios activos', value: dash?.spaces     || 0, col:'#3b82f6', icon:'🏢', isNum:true },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Workaholic — Centro de Negocios</h1>
          <button onClick={() => checkM.mutate()} disabled={checkM.isPending}
            style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
            ⚠ Verificar vencidas
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background:'#1e293b', borderRadius:10, padding:16,
              border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:18 }}>{k.icon}</span>
                <p style={{ fontSize:10, color:'#64748b', margin:0, textTransform:'uppercase', letterSpacing:1 }}>{k.label}</p>
              </div>
              <p style={{ fontSize:28, fontWeight:800, color:k.col, margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Reservaciones de hoy */}
        <div className="card">
          <h2 style={{ fontSize:14, fontWeight:700, margin:'0 0 14px', color }}>
            📅 Reservaciones de hoy ({(dash?.todayRes||[]).length})
          </h2>
          {(dash?.todayRes||[]).length === 0 ? (
            <p style={{ color:'#64748b', fontSize:13 }}>Sin reservaciones para hoy</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(dash?.todayRes||[]).map((r:any) => (
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 14px', background:'#0f172a', borderRadius:8, border:'1px solid #334155' }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:20 }}>{TYPE_ICON[r.space?.type]||'🏢'}</span>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', margin:0 }}>{r.space?.name}</p>
                      <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{r.clientName} · {r.clientCompany||''}</p>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:14, fontWeight:700, color, margin:0 }}>{r.startTime} – {r.endTime}</p>
                    <p style={{ fontSize:11, color:'#64748b', margin:0 }}>
                      {r.fromMembership ? '📋 Membresía' : fmt(r.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
