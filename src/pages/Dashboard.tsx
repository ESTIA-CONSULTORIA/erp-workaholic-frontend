import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt } from '../lib/api';
import AppLayout from '../components/layout/AppLayout';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function DashboardPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  // Dashboard data universal desde reports
  const { data: dash } = useQuery({
    queryKey: ['dashboard', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/dashboard?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  // Inventario bajo stock (solo Machete)
  const { data: inventory = [] } = useQuery({
    queryKey: ['pt-inventory', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid && activeCompany?.companyCode === 'MACHETE',
  });

  // Cortes pendientes de validación
  const { data: cortesPend = [] } = useQuery({
    queryKey: ['cortes-pendientes', cid],
    queryFn:  () => api.get(`/companies/${cid}/corte-caja?status=PENDIENTE`).then(r => r.data),
    enabled:  !!cid,
  });

  const ventas         = dash?.ventas        || 0;
  const resultado      = dash?.resultado      || 0;
  const totalGastos    = dash?.totalGastos    || 0;
  const cxcPendiente   = dash?.cxcPendiente   || 0;
  const cxpPendiente   = dash?.cxpPendiente   || 0;
  const ventasMeses    = dash?.ventasMeses    || [];
  const maxVenta       = Math.max(...ventasMeses.map((m:any) => m.total), 1);
  const stockBajo      = (inventory as any[]).filter((p:any) => Number(p.stock||0) <= Number(p.minStock||5));

  const positivo = (n: number) => n >= 0 ? '#10b981' : '#f87171';

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Dashboard</h1>

        {/* KPIs principales */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Ventas / Ingresos',  value:fmt(ventas),       col:color,            sub: activePeriod },
            { label:'Resultado neto',      value:fmt(resultado),    col:positivo(resultado), sub: resultado>=0?'Utilidad':'Pérdida' },
            { label:'Gastos del período',  value:fmt(totalGastos),  col:'#8b5cf6',        sub:'Total gastos' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:'0 0 2px' }}>{k.value}</p>
              <p style={{ fontSize:10, color:'#475569', margin:0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'CxC pendiente',     value:fmt(cxcPendiente),                col:'#f59e0b', sub:'Por cobrar' },
            { label:'CxP pendiente',     value:fmt(cxpPendiente),                col:'#f87171', sub:'Por pagar' },
            { label:'Cortes sin validar', value:(cortesPend as any[]).length.toString(), col:'#3b82f6', sub:'Requieren revisión' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:'0 0 2px' }}>{k.value}</p>
              <p style={{ fontSize:10, color:'#475569', margin:0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Gráfica últimos 6 meses */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
          <div className="card">
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 16px' }}>Ingresos últimos 6 meses</p>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:140 }}>
              {ventasMeses.map((m:any) => {
                const pct = maxVenta > 0 ? (m.total / maxVenta) * 100 : 0;
                const esActivo = m.period === activePeriod;
                return (
                  <div key={m.period} style={{ flex:1, display:'flex', flexDirection:'column',
                    alignItems:'center', gap:4 }}>
                    <p style={{ fontSize:9, color: esActivo?color:'#64748b',
                      fontWeight: esActivo?700:400, margin:0 }}>
                      {fmt(m.total)}
                    </p>
                    <div style={{ width:'100%', borderRadius:'4px 4px 0 0',
                      height:`${Math.max(pct, 2)}%`,
                      background: esActivo ? color : color+'44',
                      transition:'height 0.3s', minHeight:4 }}/>
                    <p style={{ fontSize:10, color: esActivo?color:'#64748b',
                      fontWeight: esActivo?700:400, margin:0 }}>{m.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="card">
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 16px' }}>Resumen</p>
            {[
              { label:'Ingresos',   value: ventas,      col: color },
              { label:'Gastos',     value:-totalGastos,  col:'#f87171' },
              { label:'Resultado',  value: resultado,   col: positivo(resultado) },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between',
                marginBottom:10, paddingBottom:8,
                borderBottom: r.label==='Gastos' ? '1px solid #334155' : 'none' }}>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{r.label}</span>
                <span style={{ fontSize:14, fontWeight:700, color:r.col }}>{fmt(Math.abs(r.value))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Cortes pendientes */}
          {(cortesPend as any[]).length > 0 && (
            <div className="card" style={{ borderLeft:'3px solid #3b82f6' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#3b82f6', textTransform:'uppercase',
                letterSpacing:1, margin:'0 0 12px' }}>
                🏧 Cortes sin validar ({(cortesPend as any[]).length})
              </p>
              {(cortesPend as any[]).slice(0,3).map((c:any) => (
                <div key={c.id} style={{ display:'flex', justifyContent:'space-between',
                  fontSize:12, marginBottom:6 }}>
                  <span style={{ color:'#94a3b8' }}>{c.cajero?.name || '—'}</span>
                  <span style={{ color:'#f59e0b' }}>{fmt(c.totalVentas)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stock bajo — solo Machete */}
          {stockBajo.length > 0 && (
            <div className="card" style={{ borderLeft:'3px solid #f87171' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#f87171', textTransform:'uppercase',
                letterSpacing:1, margin:'0 0 12px' }}>
                ⚠ Stock bajo ({stockBajo.length} productos)
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {stockBajo.slice(0,6).map((p:any) => (
                  <div key={p.id} style={{ background:'#0f172a', borderRadius:6, padding:'6px 8px' }}>
                    <p style={{ fontSize:11, fontWeight:500, margin:'0 0 2px', color:'#f1f5f9',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                    <p style={{ fontSize:12, fontWeight:700, color:'#f87171', margin:0 }}>
                      {p.stock} pzas
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
