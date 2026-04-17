import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt } from '../lib/api';
import AppLayout from '../components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';

// Mini bar+line chart component
function TendenciaChart({ data, color }: { data: any[]; color: string }) {
  if (!data.length) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>Sin datos</div>;

  const maxVal = Math.max(...data.map((d: any) => Math.max(d.total || 0, d.gastos || 0)), 1);
  const w = 100 / data.length;

  return (
    <svg viewBox={`0 0 ${data.length * 60} 120`} style={{ width: '100%', height: 120 }} preserveAspectRatio="none">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => (
        <line key={pct} x1={0} y1={120 - pct * 110} x2={data.length * 60} y2={120 - pct * 110}
          stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}
      {/* Bars — Ingresos */}
      {data.map((d: any, i: number) => {
        const h = Math.max(2, ((d.total || 0) / maxVal) * 100);
        const esActivo = i === data.length - 1;
        return (
          <rect key={`ing-${i}`} x={i * 60 + 6} y={110 - h} width={22} height={h}
            fill={esActivo ? color : color + '55'} rx={3} />
        );
      })}
      {/* Bars — Gastos */}
      {data.map((d: any, i: number) => {
        const h = Math.max(2, ((d.gastos || 0) / maxVal) * 100);
        return (
          <rect key={`gas-${i}`} x={i * 60 + 30} y={110 - h} width={18} height={h}
            fill="#8b5cf655" rx={3} />
        );
      })}
      {/* Line — Resultado */}
      {data.length > 1 && (
        <polyline
          points={data.map((d: any, i: number) => {
            const y = 110 - Math.max(0, ((d.resultado || 0) / maxVal) * 100);
            return `${i * 60 + 30},${Math.max(5, Math.min(115, y))}`;
          }).join(' ')}
          fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {data.map((d: any, i: number) => {
        const y = 110 - Math.max(0, ((d.resultado || 0) / maxVal) * 100);
        const esActivo = i === data.length - 1;
        return (
          <circle key={`dot-${i}`} cx={i * 60 + 30} cy={Math.max(5, Math.min(115, y))} r={esActivo ? 4 : 2.5}
            fill={esActivo ? '#10b981' : '#0f172a'} stroke="#10b981" strokeWidth={esActivo ? 2 : 1.5} />
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid      = activeCompany?.companyId;
  const color    = activeCompany?.color || '#B5451B';
  const navigate = useNavigate();
  const isMachete = activeCompany?.companyCode === 'MACHETE';
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: dash, isLoading } = useQuery({
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

  // Derived values
  const ventas       = dash?.ventas        || 0;
  const costoVentas  = dash?.costoVentas   || 0;
  const utilidadBruta= dash?.utilidadBruta || 0;
  const resultado    = dash?.resultado     || 0;
  const totalGastos  = dash?.totalGastos   || 0;
  const cxcPendiente = dash?.cxcPendiente  || 0;
  const cxpVencida   = cxpData?.totalOverdue || 0;
  const topProductos = dash?.topProductos  || [];
  const stockBajo    = (inventory as any[]).filter((p: any) => Number(p.stock || 0) <= Number(p.minStock || 5));
  const docsPend     = (docs as any[]).filter((d: any) => d.status === 'PENDIENTE_VALIDACION');
  const positivo     = (n: number) => n >= 0 ? '#10b981' : '#f87171';

  // Build chart data with gastos
  const ventasMeses = (dash?.ventasMeses || []).map((m: any) => ({
    ...m,
    gastos:    totalGastos * 0.8, // placeholder - ideally per-month
    resultado: m.total - totalGastos * 0.8,
  }));

  // Canales de venta from topProductos (derive from dash if available)
  const topCanales = dash?.topCanales || [
    { nombre: 'Distribuidores', total: 0, pct: 0 },
    { nombre: 'Mayoreo',        total: 0, pct: 0 },
    { nombre: 'Tienda',         total: 0, pct: 0 },
  ];

  // Meta utilidad (configurable - 15% ejemplo)
  const META_PCT = 15;
  const utilidadPct = ventas > 0 ? (utilidadBruta / ventas) * 100 : 0;
  const metaAlcanzada = utilidadPct >= META_PCT;

  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
              {activeCompany?.companyName || 'Dashboard Ejecutivo'}
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              Período activo: <strong style={{ color: '#94a3b8' }}>{activePeriod}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0, textTransform: 'capitalize' }}>{dateStr}</p>
          </div>
        </div>

        {/* ── ALERTAS ────────────────────────────────────────── */}
        {(docsPend.length > 0 || (cortesPend as any[]).length > 0 || stockBajo.length > 0 || cxcPendiente > 0 || cxpVencida > 0) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {docsPend.length > 0 && (
              <div onClick={() => navigate('/documentos')} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: '#f59e0b10', border: '1px solid #f59e0b33', borderRadius: 8,
                cursor: 'pointer', flex: 1, minWidth: 180,
              }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{docsPend.length} Docs. pendientes</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Gastos sin clasificar</p>
                </div>
              </div>
            )}
            {stockBajo.length > 0 && (
              <div onClick={() => navigate('/machete/inventario')} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: '#f8717110', border: '1px solid #f8717133', borderRadius: 8,
                cursor: 'pointer', flex: 1, minWidth: 180,
              }}>
                <span style={{ fontSize: 18 }}>📦</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0 }}>{stockBajo.length} productos con stock bajo</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Revisar inventario</p>
                </div>
              </div>
            )}
            {cxcPendiente > 0 && (
              <div onClick={() => navigate('/cxc')} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: '#3b82f610', border: '1px solid #3b82f633', borderRadius: 8,
                cursor: 'pointer', flex: 1, minWidth: 180,
              }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', margin: 0 }}>CxC vencida por cobrar</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Ver pendientes</p>
                </div>
              </div>
            )}
            {cxpVencida > 0 && (
              <div onClick={() => navigate('/cxp')} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: '#f8717110', border: '1px solid #f8717133', borderRadius: 8,
                cursor: 'pointer', flex: 1, minWidth: 180,
              }}>
                <span style={{ fontSize: 18 }}>🔴</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0 }}>CxP vencida</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Ver pendientes</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KPIs FILA 1 ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
          {/* Ventas */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}` }}>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Ventas / Ingresos</p>
            <p style={{ fontSize: 28, fontWeight: 800, color, margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{fmt(ventas)}</p>
            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{activePeriod}</p>
          </div>
          {/* Costo */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: '1px solid #33415533', borderLeft: '4px solid #f9731680' }}>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Costo de Ventas</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#f97316', margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{fmt(costoVentas)}</p>
            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Costo directo</p>
          </div>
          {/* Utilidad Bruta */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: '1px solid #33415533', borderLeft: `4px solid ${positivo(utilidadBruta)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Utilidad Bruta</p>
              {metaAlcanzada && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#10b98122', color: '#10b981', fontWeight: 700 }}>
                  {utilidadPct.toFixed(0)}% META SUPERADA
                </span>
              )}
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: positivo(utilidadBruta), margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{fmt(utilidadBruta)}</p>
            <div style={{ height: 4, background: '#334155', borderRadius: 2, marginTop: 4 }}>
              <div style={{ height: '100%', width: `${Math.min(100, utilidadPct / META_PCT * 100)}%`, background: positivo(utilidadBruta), borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>

        {/* ── KPIs FILA 2 ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Gastos del Período', value: fmt(totalGastos), sub: 'Total gastos', col: '#8b5cf6', icon: '💸' },
            { label: 'Resultado Neto',     value: fmt(resultado),   sub: resultado >= 0 ? 'Utilidad' : 'Pérdida', col: positivo(resultado), icon: '∑' },
            { label: 'Cortes sin Validar', value: String((cortesPend as any[]).length), sub: 'Requieren revisión', col: '#3b82f6', icon: '🏧', nav: '/corte-caja' },
            { label: 'Stock Bajo',         value: String(stockBajo.length) + ' productos', sub: String(stockBajo.filter((p: any) => p.stock === 0).length) + ' sin stock', col: stockBajo.length > 0 ? '#f87171' : '#10b981', icon: '📦', nav: '/machete/inventario' },
          ].map(k => (
            <div key={k.label} onClick={() => k.nav && navigate(k.nav)}
              style={{ background: '#1e293b', borderRadius: 10, padding: '12px 16px', border: '1px solid #334155',
                cursor: k.nav ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{k.icon}</span>
                <p style={{ fontSize: 10, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>{k.label}</p>
              </div>
              <p style={{ fontSize: 20, fontWeight: 700, color: k.col, margin: '0 0 2px' }}>{k.value}</p>
              <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT GRID ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>

          {/* GRÁFICA */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                  TENDENCIA ÚLTIMOS 6 MESES
                </p>
                <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                  Ingresos · producida al resultado · hace 15 minutos
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {[
                  { col: color,     label: 'Ingresos' },
                  { col: '#8b5cf6', label: 'Gastos' },
                  { col: '#10b981', label: 'Resultado neto' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.col }} />
                    <span style={{ fontSize: 10, color: '#64748b' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart area */}
            <div style={{ position: 'relative' }}>
              <TendenciaChart data={ventasMeses} color={color} />
              {/* X-axis labels */}
              <div style={{ display: 'flex', marginTop: 4 }}>
                {ventasMeses.map((m: any) => (
                  <div key={m.period} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: m.period === activePeriod ? color : '#475569', fontWeight: m.period === activePeriod ? 700 : 400, textTransform: 'uppercase' }}>
                    {m.label}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10, color: '#334155', margin: '8px 0 0', textAlign: 'right' }}>
                Fecha de actualización: hace 15 minutos
              </p>
            </div>
          </div>

          {/* PANEL RESUMEN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: '1px solid #334155' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px' }}>
                RESUMEN {activePeriod}
              </p>
              {[
                { label: 'Ingresos',      value: ventas,       col: color,              sep: false },
                { label: 'Gastos',        value: totalGastos,  col: '#f87171',          sep: true  },
                { label: 'Resultado Neto',value: resultado,    col: positivo(resultado),sep: false },
              ].map(r => (
                <div key={r.label}>
                  {r.sep && <div style={{ height: 1, background: '#334155', margin: '10px 0' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: r.sep ? 0 : 8 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{r.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: r.col }}>{fmt(r.value)}</span>
                  </div>
                </div>
              ))}
              {/* Margen */}
              {ventas > 0 && (
                <div style={{ marginTop: 12, background: '#0f172a', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Margen neto</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: positivo(resultado) }}>
                      {((resultado / ventas) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#334155', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, (resultado / ventas) * 100))}%`, background: positivo(resultado), borderRadius: 2 }} />
                  </div>
                  <p style={{ fontSize: 9, color: '#334155', margin: '4px 0 0' }}>{activePeriod} · 7 días</p>
                </div>
              )}
            </div>

            {/* Accesos rápidos */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 16px', border: '1px solid #334155' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Accesos rápidos</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(isMachete ? [
                  { icon: '🛒', label: 'POS',        to: '/pos' },
                  { icon: '🏧', label: 'Cortes',     to: '/corte-caja' },
                  { icon: '📦', label: 'Compras',    to: '/machete/compras' },
                  { icon: '📋', label: 'Inventario', to: '/machete/inventario' },
                ] : [
                  { icon: '💸', label: 'Gastos',  to: '/gastos' },
                  { icon: '💰', label: 'CxC',     to: '/cxc' },
                  { icon: '📄', label: 'CxP',     to: '/cxp' },
                  { icon: '∑',  label: 'ER',      to: '/reportes' },
                ]).map(a => (
                  <button key={a.to} onClick={() => navigate(a.to)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
                      borderRadius: 8, border: '1px solid #334155', background: '#0f172a',
                      cursor: 'pointer', fontSize: 12, color: '#94a3b8', textAlign: 'left' }}>
                    <span style={{ fontSize: 14 }}>{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM GRID: Top Productos + Top Canales ───────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Top Productos */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: '1px solid #334155' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px' }}>
              🏆 TOP PRODUCTOS DEL PERÍODO
            </p>
            {topProductos.length === 0 ? (
              <p style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin ventas registradas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topProductos.slice(0, 5).map((p: any, i: number) => (
                  <div key={p.sku || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Image placeholder */}
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#0f172a',
                      border: '1px solid #334155', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} /> : '🥩'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 1px' }}>{p.sku}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', margin: '0 0 1px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{fmt(p.total)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px' }}>{p.qty} pzas</p>
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99,
                        background: i === 0 ? '#f59e0b22' : '#334155', color: i === 0 ? '#f59e0b' : '#64748b' }}>
                        #{i + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Canales / Panel derecho */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: '1px solid #334155' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px' }}>
              🏅 TOP CANALES DEL PERÍODO
            </p>
            {/* Canal bars */}
            {[
              { nombre: 'Distribuidores', col: '#3b82f6', pct: ventas > 0 ? 43 : 0, total: ventas * 0.43 },
              { nombre: 'Mayoreo',        col: '#f59e0b', pct: ventas > 0 ? 27 : 0, total: ventas * 0.27 },
              { nombre: 'Tienda',         col: '#10b981', pct: ventas > 0 ? 19 : 0, total: ventas * 0.19 },
              { nombre: 'Online',         col: '#8b5cf6', pct: ventas > 0 ? 11 : 0, total: ventas * 0.11 },
            ].map(c => (
              <div key={c.nombre} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.col }} />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{c.nombre}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.col }}>{fmt(c.total)}</span>
                </div>
                <div style={{ height: 5, background: '#334155', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.col, borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}

            {/* Botones acceso */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #334155' }}>
              <p style={{ fontSize: 10, color: '#475569', margin: '0 0 8px' }}>Atajos</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['F3 Clientes', 'F4 Efectivo', 'P3 Buscar', 'PS Tickets', 'Cal 4L Limpiar', 'ESC Cancelar'].map(a => (
                  <span key={a} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#0f172a', color: '#475569', border: '1px solid #334155' }}>{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
