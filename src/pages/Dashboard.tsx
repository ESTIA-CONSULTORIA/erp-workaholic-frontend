import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt } from '../lib/api';
import AppLayout from '../components/layout/AppLayout';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function DashboardPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  // Ventas del período activo
  const { data: ventasPeriodo } = useQuery({
    queryKey: ['dashboard-ventas', cid, activePeriod],
    queryFn:  () => api.get(`/companies/${cid}/machete/sales?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  // Estado de resultados del período
  const { data: er } = useQuery({
    queryKey: ['income-statement', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/income-statement?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  // CxC summary
  const { data: cxcSummary } = useQuery({
    queryKey: ['cxc-summary', cid],
    queryFn:  () => api.get(`/companies/${cid}/cxc/summary`).then(r => r.data),
    enabled:  !!cid,
  });

  // Inventario PT
  const { data: inventory = [] } = useQuery({
    queryKey: ['pt-inventory', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid,
  });

  // Ventas últimos 6 meses
  const { data: ventasMeses = [] } = useQuery({
    queryKey: ['dashboard-ventas-meses', cid],
    queryFn:  async () => {
      const now = new Date();
      const results = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const period = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label  = `${MESES[d.getMonth()]}`;
        try {
          const { data } = await api.get(`/companies/${cid}/machete/sales?period=${period}`);
          const total = (data as any[]).reduce((t:number, s:any) => t + Number(s.total), 0);
          results.push({ period, label, total });
        } catch {
          results.push({ period, label, total: 0 });
        }
      }
      return results;
    },
    enabled: !!cid,
  });

  // Calcular KPIs
  const ventas = (ventasPeriodo as any[] || []);
  const totalVentas    = ventas.reduce((t, s) => t + Number(s.total), 0);
  const totalDesc      = ventas.reduce((t, s) => t + Number(s.discount || 0), 0);
  const ventasEfectivo = ventas.filter(s => s.paymentMethod === 'efectivo').reduce((t, s) => t + Number(s.total), 0);
  const ventasCredito  = ventas.filter(s => s.paymentMethod === 'credito').reduce((t, s) => t + Number(s.total), 0);
  const numTransacciones = ventas.length;

  const resultado    = er?.resultadoEjercicio || 0;
  const totalGastos  = er?.totalGastos        || 0;
  const cxcPendiente = cxcSummary?.totalPending || 0;

  // Productos con stock bajo
  const stockBajo = (inventory as any[]).filter(p => Number(p.stock || 0) <= Number(p.minStock || 5) && p.isActive);

  // Máximo para la gráfica de barras
  const maxVenta = Math.max(...(ventasMeses as any[]).map((m:any) => m.total), 1);

  // Ventas por canal
  const porCanal: Record<string,number> = {};
  for (const s of ventas) {
    porCanal[s.channel] = (porCanal[s.channel] || 0) + Number(s.total);
  }
  const CANAL_LABELS: Record<string,string> = { MOSTRADOR:'Tienda', MAYOREO:'Mayoreo', ONLINE:'Distribuidor', ML:'Online' };
  const CANAL_COLORS: Record<string,string> = { MOSTRADOR:'#3b82f6', MAYOREO:'#f59e0b', ONLINE:'#8b5cf6', ML:'#10b981' };

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Dashboard</h1>

        {/* KPIs principales */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Venta del período',   value:fmt(totalVentas),    color, sub:`${numTransacciones} transacciones` },
            { label:'Resultado neto',       value:fmt(resultado),      color:resultado>=0?'#10b981':'#f87171', sub: resultado>=0?'Utilidad':'Pérdida' },
            { label:'Gastos del período',   value:fmt(totalGastos),    color:'#8b5cf6', sub:`Desc: ${fmt(totalDesc)}` },
            { label:'CxC pendiente',        value:fmt(cxcPendiente),   color:'#f59e0b', sub:'Por cobrar' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.color}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:k.color, margin:'0 0 2px' }}>{k.value}</p>
              <p style={{ fontSize:10, color:'#475569', margin:0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
          {/* Gráfica de barras — ventas últimos 6 meses */}
          <div className="card">
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 16px' }}>
              Ventas últimos 6 meses
            </p>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:140 }}>
              {(ventasMeses as any[]).map((m:any) => {
                const pct = maxVenta > 0 ? (m.total / maxVenta) * 100 : 0;
                const esPeriodoActivo = m.period === activePeriod;
                return (
                  <div key={m.period} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <p style={{ fontSize:9, color:esPeriodoActivo?color:'#64748b', fontWeight:esPeriodoActivo?700:400, margin:0 }}>
                      {fmt(m.total)}
                    </p>
                    <div style={{ width:'100%', borderRadius:'4px 4px 0 0',
                      height:`${Math.max(pct, 2)}%`,
                      background: esPeriodoActivo ? color : color+'44',
                      transition:'height 0.3s', minHeight:4 }}/>
                    <p style={{ fontSize:10, color:esPeriodoActivo?color:'#64748b',
                      fontWeight:esPeriodoActivo?700:400, margin:0 }}>{m.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ventas por canal */}
          <div className="card">
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 16px' }}>
              Por canal
            </p>
            {Object.keys(porCanal).length === 0
              ? <p style={{ color:'#64748b', fontSize:13 }}>Sin ventas</p>
              : Object.entries(porCanal).sort((a,b) => b[1]-a[1]).map(([canal, monto]) => {
                  const pct = totalVentas > 0 ? (monto / totalVentas) * 100 : 0;
                  const c   = CANAL_COLORS[canal] || '#64748b';
                  return (
                    <div key={canal} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:12, color:'#94a3b8' }}>{CANAL_LABELS[canal]||canal}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:c }}>{fmt(monto)}</span>
                      </div>
                      <div style={{ height:6, borderRadius:99, background:'#1e293b', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:c, borderRadius:99 }}/>
                      </div>
                    </div>
                  );
                })
            }
            <div style={{ borderTop:'1px solid #334155', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'#64748b' }}>Efectivo</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#10b981' }}>{fmt(ventasEfectivo)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'#64748b' }}>Crédito</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#f59e0b' }}>{fmt(ventasCredito)}</span>
            </div>
          </div>
        </div>

        {/* Stock bajo */}
        {stockBajo.length > 0 && (
          <div className="card" style={{ borderLeft:'3px solid #f87171' }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>
              ⚠ Stock bajo ({stockBajo.length} productos)
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {stockBajo.slice(0,8).map((p:any) => (
                <div key={p.id} style={{ background:'#0f172a', borderRadius:8, padding:'8px 10px' }}>
                  <p style={{ fontSize:11, fontWeight:500, margin:'0 0 2px', color:'#f1f5f9' }}>{p.name}</p>
                  <p style={{ fontSize:12, fontWeight:700, color:'#f87171', margin:0 }}>{p.stock} pzas</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
