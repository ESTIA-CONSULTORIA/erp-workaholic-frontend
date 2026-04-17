import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate } from '../lib/api';
import AppLayout from '../components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid      = activeCompany?.companyId;
  const color    = activeCompany?.color || '#3b82f6';
  const navigate = useNavigate();
  const isMachete = activeCompany?.companyCode === 'MACHETE';

  const { data: dash } = useQuery({
    queryKey: ['dashboard', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/dashboard?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 60000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['pt-inventory', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid && isMachete,
  });

  const { data: cortesPend = [] } = useQuery({
    queryKey: ['cortes-pendientes', cid],
    queryFn:  () => api.get(`/companies/${cid}/corte-caja?status=PENDIENTE`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['documents-pending', cid],
    queryFn:  () => api.get(`/companies/${cid}/documents`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxpData } = useQuery({
    queryKey: ['cxp-summary', cid],
    queryFn:  () => api.get(`/companies/${cid}/cxp/summary`).then(r => r.data),
    enabled:  !!cid,
  });

  const ventas        = dash?.ventas          || 0;
  const resultado     = dash?.resultado       || 0;
  const totalGastos   = dash?.totalGastos     || 0;
  const cxcPendiente  = dash?.cxcPendiente    || 0;
  const cxpPendiente  = dash?.cxpPendiente    || 0;
  const costoVentas   = dash?.costoVentas     || 0;
  const utilidadBruta = dash?.utilidadBruta   || 0;
  const ventasMeses   = dash?.ventasMeses     || [];
  const topProductos  = dash?.topProductos    || [];
  const maxVenta     = Math.max(...ventasMeses.map((m:any) => m.total), 1);
  const stockBajo    = (inventory as any[]).filter((p:any) => Number(p.stock||0) <= Number(p.minStock||5));
  const docsPend     = (docs as any[]).filter((d:any) => d.status === 'PENDIENTE_VALIDACION');
  const cxpVencida   = cxpData?.totalOverdue || 0;

  const positivo = (n: number) => n >= 0 ? '#10b981' : '#f87171';

  // Accesos rápidos por empresa
  const accesos = isMachete ? [
    { label:'POS',         icon:'🛒', to:'/pos'                },
    { label:'Corte',       icon:'🏧', to:'/corte-caja'         },
    { label:'Compras',     icon:'📦', to:'/machete/compras'    },
    { label:'Producción',  icon:'🔥', to:'/machete/produccion' },
    { label:'Inventario',  icon:'📋', to:'/machete/inventario' },
    { label:'Gastos',      icon:'💸', to:'/gastos'             },
    { label:'CxC',         icon:'💰', to:'/cxc'                },
    { label:'CxP',         icon:'📄', to:'/cxp'                },
  ] : [
    { label:'Gastos',      icon:'💸', to:'/gastos'             },
    { label:'CxC',         icon:'💰', to:'/cxc'                },
    { label:'CxP',         icon:'📄', to:'/cxp'                },
    { label:'Documentos',  icon:'📎', to:'/documentos'         },
    { label:'ER',          icon:'∑',  to:'/reportes'           },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Dashboard</h1>
          <span style={{ fontSize:12, color:'#475569' }}>{activePeriod}</span>
        </div>

        {/* Accesos rápidos */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {accesos.map(a => (
            <button key={a.to} onClick={() => navigate(a.to)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                padding:'10px 16px', borderRadius:10, border:'1px solid #334155',
                background:'#1e293b', cursor:'pointer', minWidth:72, transition:'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor=color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor='#334155')}>
              <span style={{ fontSize:20 }}>{a.icon}</span>
              <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Alertas activas */}
        {(docsPend.length > 0 || (cortesPend as any[]).length > 0 || cxpVencida > 0 || stockBajo.length > 0) && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {docsPend.length > 0 && (
              <div onClick={() => navigate('/documentos')}
                style={{ background:'#f59e0b11', border:'1px solid #f59e0b44', borderRadius:8,
                  padding:'8px 14px', fontSize:12, color:'#f59e0b', cursor:'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>⚠ {docsPend.length} documento{docsPend.length>1?'s':''} pendiente{docsPend.length>1?'s':''} de clasificar</span>
                <span style={{ fontSize:11 }}>Ver →</span>
              </div>
            )}
            {(cortesPend as any[]).length > 0 && (
              <div onClick={() => navigate('/corte-caja')}
                style={{ background:'#3b82f611', border:'1px solid #3b82f644', borderRadius:8,
                  padding:'8px 14px', fontSize:12, color:'#3b82f6', cursor:'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>🏧 {(cortesPend as any[]).length} corte{(cortesPend as any[]).length>1?'s':''} pendiente{(cortesPend as any[]).length>1?'s':''} de validar</span>
                <span style={{ fontSize:11 }}>Ver →</span>
              </div>
            )}
            {cxpVencida > 0 && (
              <div onClick={() => navigate('/cxp')}
                style={{ background:'#f8717111', border:'1px solid #f8717144', borderRadius:8,
                  padding:'8px 14px', fontSize:12, color:'#f87171', cursor:'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>🔴 CxP vencida: {fmt(cxpVencida)}</span>
                <span style={{ fontSize:11 }}>Ver →</span>
              </div>
            )}
            {stockBajo.length > 0 && (
              <div onClick={() => navigate('/machete/inventario')}
                style={{ background:'#f8717111', border:'1px solid #f8717144', borderRadius:8,
                  padding:'8px 14px', fontSize:12, color:'#f87171', cursor:'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>📦 {stockBajo.length} producto{stockBajo.length>1?'s':''} con stock bajo</span>
                <span style={{ fontSize:11 }}>Ver →</span>
              </div>
            )}
          </div>
        )}

        {/* KPIs principales */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
          {[
            { label:'Ventas / Ingresos',   value:fmt(ventas),        col:color,               sub:activePeriod },
            { label:'Costo de ventas',      value:fmt(costoVentas),   col:'#f97316',           sub:'Costo directo' },
            { label:'Utilidad bruta',       value:fmt(utilidadBruta), col:positivo(utilidadBruta), sub: utilidadBruta>=0?'Positivo':'Negativo' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:'0 0 2px' }}>{k.value}</p>
              <p style={{ fontSize:10, color:'#475569', margin:0 }}>{k.sub}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Gastos del período',  value:fmt(totalGastos),  col:'#8b5cf6', sub:'Total gastos'   },
            { label:'Resultado neto',       value:fmt(resultado),    col:positivo(resultado), sub:resultado>=0?'Utilidad':'Pérdida' },
            { label:'CxC pendiente',       value:fmt(cxcPendiente), col:'#f59e0b', sub:'Por cobrar'     },
            { label:'CxP vencida',         value:fmt(cxpVencida),   col: cxpVencida>0?'#f87171':'#10b981', sub: cxpVencida>0?'Req. atención':'Sin vencidas' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:'0 0 2px' }}>{k.value}</p>
              <p style={{ fontSize:10, color:'#475569', margin:0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Gráfica + Resumen */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
          <div className="card">
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 16px' }}>Ingresos últimos 6 meses</p>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:140 }}>
              {ventasMeses.length === 0 && (
                <p style={{ color:'#475569', fontSize:13, margin:'auto' }}>Sin datos</p>
              )}
              {ventasMeses.map((m:any) => {
                const pct = maxVenta > 0 ? (m.total / maxVenta) * 100 : 0;
                const esActivo = m.period === activePeriod;
                return (
                  <div key={m.period} style={{ flex:1, display:'flex', flexDirection:'column',
                    alignItems:'center', gap:4 }}>
                    <p style={{ fontSize:9, color:esActivo?color:'#64748b',
                      fontWeight:esActivo?700:400, margin:0 }}>{fmt(m.total)}</p>
                    <div style={{ width:'100%', borderRadius:'4px 4px 0 0',
                      height:`${Math.max(pct,2)}%`, background:esActivo?color:color+'44',
                      transition:'height 0.3s', minHeight:4 }}/>
                    <p style={{ fontSize:10, color:esActivo?color:'#64748b',
                      fontWeight:esActivo?700:400, margin:0 }}>{m.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 16px' }}>Resumen {activePeriod}</p>
            {[
              { label:'Ingresos',  value: ventas,       col:color       },
              { label:'Gastos',    value:-totalGastos,  col:'#f87171'   },
              { label:'CxC',       value: cxcPendiente, col:'#f59e0b'   },
              { label:'Resultado', value: resultado,    col:positivo(resultado) },
            ].map((r,i) => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between',
                marginBottom:8, paddingBottom:8,
                borderBottom: i < 3 ? '1px solid #1e293b' : 'none' }}>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{r.label}</span>
                <span style={{ fontSize:14, fontWeight:700, color:r.col }}>{fmt(Math.abs(r.value))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 3 productos más vendidos */}
        {isMachete && topProductos.length > 0 && (
          <div className="card" style={{ borderLeft:`3px solid ${color}`, marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color, textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 12px' }}>🏆 Top productos del período</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {topProductos.slice(0,3).map((p:any, i:number) => (
                <div key={p.sku||i} style={{ background:'#0f172a', borderRadius:8, padding:'10px 12px',
                  borderLeft:`3px solid ${i===0?'#f59e0b':i===1?'#94a3b8':'#cd7c2f'}` }}>
                  <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px' }}>
                    {i===0?'🥇':i===1?'🥈':'🥉'} {p.sku}
                  </p>
                  <p style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', margin:'0 0 2px',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                  <p style={{ fontSize:13, fontWeight:700, color, margin:0 }}>{fmt(p.total)}</p>
                  <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{p.qty} pzas</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock bajo — solo Machete */}
        {isMachete && stockBajo.length > 0 && (
          <div className="card" style={{ borderLeft:'3px solid #f87171', marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#f87171', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 12px' }}>
              ⚠ Stock bajo ({stockBajo.length} productos)
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {stockBajo.slice(0,8).map((p:any) => (
                <div key={p.id} style={{ background:'#0f172a', borderRadius:6, padding:'6px 10px' }}>
                  <p style={{ fontSize:11, fontWeight:500, margin:'0 0 2px', color:'#f1f5f9',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                  <p style={{ fontSize:12, fontWeight:700, color:'#f87171', margin:0 }}>
                    {p.stock} / min {p.minStock}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
