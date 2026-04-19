import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

export default function PalestraDashboardPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#10b981';

  const { data: dash } = useQuery({
    queryKey: ['palestra-dashboard', cid],
    queryFn:  () => api.get(`/companies/${cid}/palestra/dashboard`).then(r => r.data),
    enabled:  !!cid,
  });

  const kpis = [
    { label:'Total membresías',      value: dash?.totalMembers   || 0, col: color,    icon:'👥', fmt:(v:any)=>v },
    { label:'Membresías activas',    value: dash?.activeMembers  || 0, col:'#10b981', icon:'✅', fmt:(v:any)=>v },
    { label:'Membresías morosas',    value: dash?.morosasCount   || 0, col:'#f87171', icon:'⚠',  fmt:(v:any)=>v },
    { label:'Comisiones pendientes', value: dash?.pendingCommissions?.total || 0, col:'#f59e0b', icon:'💰', fmt },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 24px' }}>Palestra — Dashboard</h1>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background:'#1e293b', borderRadius:10, padding:16,
              border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{k.icon}</span>
                <p style={{ fontSize:10, color:'#64748b', margin:0, textTransform:'uppercase', letterSpacing:1 }}>{k.label}</p>
              </div>
              <p style={{ fontSize:24, fontWeight:800, color:k.col, margin:0 }}>{k.fmt(k.value)}</p>
            </div>
          ))}
        </div>
        <div style={{ background:'#1e293b', borderRadius:10, padding:20, border:'1px solid #334155' }}>
          <p style={{ fontSize:13, color:'#64748b', margin:0, textAlign:'center' }}>
            Usa el menú lateral para gestionar Membresías, Servicios, Coaches y el Restaurante.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
