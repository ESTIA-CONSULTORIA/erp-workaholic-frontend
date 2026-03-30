import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtPct } from '../lib/api';
import AppLayout from '../components/layout/AppLayout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

export default function DashboardPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  const { data: edo } = useQuery({
    queryKey: ['income-statement', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/income-statement?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: flow } = useQuery({
    queryKey: ['flow-balances', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxc } = useQuery({
    queryKey: ['cxc-summary', cid],
    queryFn:  () => api.get(`/companies/${cid}/cxc/summary`).then(r => r.data),
    enabled:  !!cid,
  });

  const s  = edo?.summary || {};
  const totalNet  = s.totalNetSale   || 0;
  const netIncome = s.netIncome      || 0;

  const chartData = [
    { name:'Ingresos', value:totalNet,          color },
    { name:'Costo',    value:s.totalCost    ||0, color:'#f59e0b' },
    { name:'Gastos',   value:s.totalExpenses||0, color:'#8b5cf6' },
    { name:'Utilidad', value:Math.max(netIncome,0), color:'#10b981' },
  ];

  const flowData = (flow?.accounts||[])
    .filter((a:any) => a.balance > 0)
    .map((a:any) => ({ name:a.accountName, value:a.balance }));

  const COLORS = [color,'#10b981','#f59e0b','#8b5cf6','#3b82f6'];

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>
          Dashboard — <span style={{ color }}>{activeCompany?.companyName}</span>
        </h1>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          <KPI label="Venta neta"     value={fmt(totalNet)}    color={color}
            sub={`${fmtPct(s.pctMeta||0)} de meta`}/>
          <KPI label="Utilidad bruta" value={fmt(s.grossProfit||0)} color="#10b981"
            sub={`Margen ${fmtPct(s.grossMargin||0)}`}/>
          <KPI label="Utilidad neta"  value={fmt(netIncome)}
            color={netIncome>=0?'#10b981':'#f87171'}
            sub={`Margen ${fmtPct(s.netMargin||0)}`}/>
          <KPI label="Saldo total"    value={fmt(flow?.totalMxn||0)} color="#06b6d4"
            sub={`+$${(flow?.totalUsd||0).toFixed(2)} USD`}/>
        </div>

        {/* Gráficas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
          <div className="card">
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:16, marginTop:0 }}>
              Resultado del mes
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top:4,right:8,bottom:4,left:8 }}>
                <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }}/>
                <YAxis tick={{ fill:'#64748b', fontSize:10 }}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                <Tooltip
                  formatter={(v:any) => [fmt(v),'']}
                  contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8 }}
                  labelStyle={{ color:'#f1f5f9' }}/>
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {chartData.map((d,i) => <Cell key={i} fill={d.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:16, marginTop:0 }}>
              Distribución de saldos
            </p>
            {flowData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={flowData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={65}
                    label={({ name, percent }:any) => `${name}: ${(percent*100).toFixed(0)}%`}>
                    {flowData.map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:any) => [fmt(v),'']}
                    contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8 }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', fontSize:14 }}>
                Sin movimientos
              </div>
            )}
          </div>
        </div>

        {/* CxC */}
        <div className="card">
          <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:12, marginTop:0 }}>
            Cuentas por cobrar
          </p>
          <div style={{ display:'flex', gap:24 }}>
            <div>
              <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>Total pendiente</p>
              <p style={{ fontSize:20, fontWeight:700, color:'#f59e0b', margin:0 }}>{fmt(cxc?.totalPending||0)}</p>
            </div>
            <div>
              <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>Vencido</p>
              <p style={{ fontSize:20, fontWeight:700, color:'#f87171', margin:0 }}>{fmt(cxc?.totalOverdue||0)}</p>
            </div>
            <div>
              <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>Cuentas abiertas</p>
              <p style={{ fontSize:20, fontWeight:700, color:'#94a3b8', margin:0 }}>{cxc?.pendingCount||0}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function KPI({ label, value, color, sub }: any) {
  return (
    <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
      <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</p>
      <p style={{ fontSize:20, fontWeight:700, color, margin:'0 0 2px' }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{sub}</p>}
    </div>
  );
}
