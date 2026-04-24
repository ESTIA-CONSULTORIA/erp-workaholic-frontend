import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

export default function LoncheDashboard() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f97316';

  const { data: dash } = useQuery({
    queryKey: ['lonche-dashboard', cid],
    queryFn:  () => api.get(`/companies/${cid}/lonche/dashboard`).then(r=>r.data),
    enabled:  !!cid, refetchInterval: 30000,
  });

  const kpis = [
    { label:'Ventas hoy',      value:fmt(dash?.ventasHoy||0),      col:color,     icon:'💰' },
    { label:'Tickets hoy',     value:dash?.ticketsHoy||0,           col:'#3b82f6', icon:'🧾' },
    { label:'Cashback hoy',    value:fmt(dash?.cashbackHoy||0),     col:'#f59e0b', icon:'★'  },
    { label:'Alumnos activos', value:dash?.students||0,             col:'#10b981', icon:'👨‍🎓' },
    { label:'Saldo total',     value:fmt(dash?.saldoTotal||0),      col:'#8b5cf6', icon:'💳' },
    { label:'Cashback total',  value:fmt(dash?.cashbackTotal||0),   col:'#f59e0b', icon:'⭐' },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Lonche — Cooperativa Escolar</h1>
          {dash?.turnoActivo
            ? <span style={{fontSize:12,padding:'4px 14px',borderRadius:99,background:'#10b98122',color:'#10b981',fontWeight:600}}>● Turno activo</span>
            : <span style={{fontSize:12,padding:'4px 14px',borderRadius:99,background:'#f8717122',color:'#f87171',fontWeight:600}}>Sin turno hoy</span>
          }
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background:'#1e293b', borderRadius:10, padding:14,
              border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
              <div style={{fontSize:18,marginBottom:6}}>{k.icon}</div>
              <p style={{fontSize:10,color:'#64748b',margin:'0 0 4px',textTransform:'uppercase'}}>{k.label}</p>
              <p style={{fontSize:16,fontWeight:800,color:k.col,margin:0}}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
