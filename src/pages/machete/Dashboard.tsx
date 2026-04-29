import AppLayout from '../../components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export default function MacheteDashboard() {
  const { activeCompany } = useERPStore();
  const cid    = activeCompany?.companyId;
  const color  = activeCompany?.color || '#f87171';
  const nav    = useNavigate();

  const { data: dash } = useQuery({
    queryKey: ['machete-dash', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/dashboard`).then(r => r.data),
    enabled:  !!cid,
    refetchInterval: 60000,
  });

  const kpis = [
    { label:'Ventas hoy',           value: fmt(dash?.ventasHoy        || 0), col:color,     icon:'💰', path:'/machete/pos' },
    { label:'Productos en stock',   value: dash?.productosEnStock      || 0, col:'#10b981', icon:'📦', path:'/machete/catalogo' },
    { label:'OC pendientes',        value: dash?.ocPendientes          || 0, col:'#f59e0b', icon:'📋', path:'/machete/ordenes-compra' },
    { label:'Lotes en producción',  value: dash?.lotesEnProduccion     || 0, col:'#8b5cf6', icon:'⚙',  path:'/machete/produccion' },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:800, margin:'0 0 4px' }}>🥩 Machete</h1>
          <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Carnicería y Embutidos</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {kpis.map(k => (
            <div key={k.label} onClick={() => nav(k.path)}
              style={{ background:'#1e293b', borderRadius:10, padding:16, cursor:'pointer',
                border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
              <p style={{ fontSize:22, margin:'0 0 6px' }}>{k.icon}</p>
              <p style={{ fontSize:22, fontWeight:800, color:k.col, margin:'0 0 4px' }}>{k.value}</p>
              <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{k.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[
            { label:'Ir al POS',      path:'/machete/pos',            icon:'🏪' },
            { label:'Catálogo',       path:'/machete/catalogo',       icon:'📦' },
            { label:'Producción',     path:'/machete/produccion',     icon:'⚙'  },
            { label:'Órdenes Compra', path:'/machete/ordenes-compra', icon:'📋' },
            { label:'Compras',        path:'/machete/compras',        icon:'🛒' },
            { label:'Reportes',       path:'/machete/reportes',       icon:'Σ'  },
          ].map(a => (
            <button key={a.label} onClick={() => nav(a.path)}
              style={{ padding:'16px', borderRadius:10, border:'1px solid #334155',
                background:'#1e293b', color:'#f1f5f9', cursor:'pointer', fontSize:14,
                fontWeight:600, textAlign:'left', display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:24 }}>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
