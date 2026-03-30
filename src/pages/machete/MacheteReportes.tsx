import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtPct } from '../../lib/api';

export default function MacheteReportesPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';

  const { data: report } = useQuery({
    queryKey: ['machete-report', cid, activePeriod],
    queryFn:  () => api.get(`/companies/${cid}/machete/reports/sales?period=${activePeriod}`).then(r => r.data),
    enabled: !!cid,
  });

  const r = report || {};
  const p = r.production || {};

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Reportes Machete — {activePeriod}</h1>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Venta total',    value:fmt(r.totalRevenue), color },
            { label:'Unidades',       value:r.totalUnits||0,     color:'#f59e0b' },
            { label:'Lotes',          value:p.lotes||0,          color:'#10b981' },
            { label:'Rendimiento',    value:fmtPct(p.avgYield||0), color:'#3b82f6' },
            { label:'Merma',          value:`${(p.totalWaste||0).toFixed(2)}kg`, color:'#f87171' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.color}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:18, fontWeight:700, color:k.color, margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'10px 20px', borderBottom:'1px solid #334155', background:color+'11' }}>
            <p style={{ fontSize:12, fontWeight:700, color, margin:0, textTransform:'uppercase' }}>Detalle por SKU</p>
          </div>
          <table className="table-base">
            <thead><tr><th>Producto</th><th style={{textAlign:'right'}}>Unidades</th><th style={{textAlign:'right'}}>Importe</th><th style={{textAlign:'right'}}>% del total</th></tr></thead>
            <tbody>
              {(r.bySKU||[]).map((s:any) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td style={{textAlign:'right'}}>{s.units}</td>
                  <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(s.revenue)}</td>
                  <td style={{textAlign:'right',color:'#64748b'}}>{r.totalRevenue>0?fmtPct(s.revenue/r.totalRevenue):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
