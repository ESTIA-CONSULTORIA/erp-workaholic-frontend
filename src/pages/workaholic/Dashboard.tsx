import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api } from '../../lib/api';

export default function WorkaholicDashboard() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';

  const { data: dash } = useQuery({
    queryKey: ['workaholic-dashboard', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/dashboard`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 60000,
  });

  const kpis = [
    { label:'Total membresías',    value: dash?.totalMem   || 0, col: color,    icon:'🏢' },
    { label:'Membresías activas',  value: dash?.activeMem  || 0, col:'#10b981', icon:'✅' },
    { label:'Membresías vencidas', value: dash?.vencidas   || 0, col:'#f87171', icon:'⚠' },
    { label:'Reservas hoy',        value: dash?.todayRes   || 0, col:'#f59e0b', icon:'📅' },
    { label:'Espacios activos',    value: dash?.spaces     || 0, col:'#06b6d4', icon:'🚪' },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 24px' }}>Workaholic — Centro de Negocios</h1>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background:'#1e293b', borderRadius:10, padding:16,
              border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{k.icon}</div>
              <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px', textTransform:'uppercase' }}>{k.label}</p>
              <p style={{ fontSize:24, fontWeight:800, color:k.col, margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>
        <div style={{ background:'#1e293b', borderRadius:10, padding:20, border:'1px solid #334155' }}>
          <p style={{ fontSize:13, color:'#64748b', margin:0, textAlign:'center' }}>
            Usa el menú para gestionar Membresías, Reservaciones, Espacios y el Restaurante.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
