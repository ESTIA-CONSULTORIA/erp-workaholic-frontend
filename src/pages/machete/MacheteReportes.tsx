import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate, fmtPct } from '../../lib/api';

type TabId = 'ventas' | 'cxc' | 'cxp';

export default function MacheteReportesPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const [tab, setTab] = useState<TabId>('ventas');

  const TABS: { id: TabId; label: string }[] = [
    { id: 'ventas', label: 'Ventas' },
    { id: 'cxc',   label: 'CxC multicliente' },
    { id: 'cxp',   label: 'CxP' },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:16 }}>Reportes</h1>
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 20px', fontSize:13, fontWeight:500, background:'none', border:'none',
                borderBottom: tab===t.id ? `2px solid ${color}` : '2px solid transparent',
                color: tab===t.id ? color : '#64748b', cursor:'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'ventas' && <VentasTab    cid={cid!} color={color} activePeriod={activePeriod}/>}
        {tab === 'cxc'    && <CxCReporteTab cid={cid!} color={color}/>}
        {tab === 'cxp'    && <CxPReporteTab cid={cid!} color={color}/>}
      </div>
    </AppLayout>
  );
}

// ── VENTAS ────────────────────────────────────────────────────
const hoy = new Date().toISOString().slice(0,10);
function VentasTab({ cid, color, activePeriod }: any) {
  const [tipoFiltro,  setTipoFiltro]  = useState<'mes'|'dia'|'rango'>('mes');
  const [periodo,     setPeriodo]     = useState(activePeriod || hoy.slice(0,7));
  const [diaFiltro,   setDiaFiltro]   = useState(hoy);
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin,    setFechaFin]    = useState(hoy);
  const [canal,       setCanal]       = useState('');

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas-reporte', cid, tipoFiltro, periodo, diaFiltro, fechaInicio, fechaFin, canal],
    queryFn: () => {
      let url = `/companies/${cid}/machete/sales?`;
      if (tipoFiltro === 'mes')   url += `period=${periodo}`;
      if (tipoFiltro === 'dia')   url += `startDate=${diaFiltro}&endDate=${diaFiltro}`;
      if (tipoFiltro === 'rango') url += `startDate=${fechaInicio}&endDate=${fechaFin}`;
      if (canal) url += `&channel=${canal}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const porFamilia: Record<string,{ cantidad:number, total:number }> = {};
  const porCanal:   Record<string,{ cantidad:number, total:number }> = {};
  let totalBruto = 0, totalDesc = 0, totalUnits = 0;

  for (const v of ventas as any[]) {
    const ch = v.channel || 'MOSTRADOR';
    if (!porCanal[ch]) porCanal[ch] = { cantidad:0, total:0 };
    porCanal[ch].total    += Number(v.total);
    porCanal[ch].cantidad += v.lines?.length || 0;
    totalBruto += Number(v.total);
    totalDesc  += Number(v.discount || 0);
    for (const l of v.lines || []) {
      const familia = `${l.product?.meatType||'RES'} — ${l.product?.flavor||'NAT'}`;
      if (!porFamilia[familia]) porFamilia[familia] = { cantidad:0, total:0 };
      porFamilia[familia].cantidad += Number(l.quantity);
      porFamilia[familia].total    += Number(l.total);
      totalUnits += Number(l.quantity);
    }
  }

  const CANAL_LABELS: Record<string,string> = {
    MOSTRADOR:'Tienda', MAYOREO:'Mayoreo', ONLINE:'Distribuidor', ML:'Online'
  };

  const exportarExcel = () => {
    import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs').then((XLSX: any) => {
      const rows = (ventas as any[]).flatMap((v:any) =>
        (v.lines||[]).map((l:any) => ({
          Fecha:     v.date?.slice(0,10),
          Canal:     CANAL_LABELS[v.channel]||v.channel,
          Cliente:   v.client?.name||'—',
          SKU:       l.product?.sku||'—',
          Producto:  l.product?.name||'—',
          Cantidad:  l.quantity,
          PrecioUnit:Number(l.unitPrice),
          Total:     Number(l.total),
          Pago:      v.paymentMethod,
        }))
      );
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      XLSX.writeFile(wb, `ventas-${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  return (
    <div>
      {/* Filtros */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Ver por</label>
          <div style={{ display:'flex', gap:4 }}>
            {(['mes','dia','rango'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${tipoFiltro===t?color:'#334155'}`,
                  background: tipoFiltro===t?color+'22':'transparent',
                  color: tipoFiltro===t?color:'#64748b' }}>
                {t==='mes'?'Mes':t==='dia'?'Día':'Rango'}
              </button>
            ))}
          </div>
        </div>
        {tipoFiltro==='mes' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Mes</label>
            <input type="month" className="input-base" style={{ fontSize:13 }}
              value={periodo} onChange={e => setPeriodo(e.target.value)}/>
          </div>
        )}
        {tipoFiltro==='dia' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Día</label>
            <input type="date" className="input-base" style={{ fontSize:13 }}
              value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}/>
          </div>
        )}
        {tipoFiltro==='rango' && (
          <>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Desde</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hasta</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaFin} onChange={e => setFechaFin(e.target.value)}/>
            </div>
          </>
        )}
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Canal</label>
          <select className="input-base" style={{ fontSize:13 }} value={canal}
            onChange={e => setCanal(e.target.value)}>
            <option value="">Todos</option>
            <option value="MOSTRADOR">Tienda</option>
            <option value="MAYOREO">Mayoreo</option>
            <option value="ONLINE">Distribuidor</option>
            <option value="ML">Online</option>
          </select>
        </div>
        <button onClick={exportarExcel}
          style={{ padding:'6px 16px', borderRadius:8, fontSize:12, border:'1px solid #10b981',
            background:'none', color:'#10b981', cursor:'pointer', alignSelf:'flex-end' }}>
          ⬇ Excel
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:'Venta bruta',  value:fmt(totalBruto),          col:color },
          { label:'Descuentos',   value:fmt(totalDesc),           col:'#f87171' },
          { label:'Venta neta',   value:fmt(totalBruto-totalDesc), col:'#10b981' },
          { label:'Unidades',     value:totalUnits.toString(),    col:'#94a3b8' },
        ].map(k => (
          <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
            <p style={{ fontSize:18, fontWeight:700, color:k.col, margin:0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Por canal y familia */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card">
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Por canal</p>
          {Object.entries(porCanal).map(([ch, d]:any) => (
            <div key={ch} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{CANAL_LABELS[ch]||ch}</span>
              <span style={{ fontSize:13, fontWeight:600, color }}>{fmt(d.total)}</span>
            </div>
          ))}
          {Object.keys(porCanal).length === 0 && <p style={{ fontSize:12, color:'#475569' }}>Sin ventas</p>}
        </div>
        <div className="card">
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Por familia</p>
          {Object.entries(porFamilia).map(([fam, d]:any) => (
            <div key={fam} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{fam}</span>
              <span style={{ fontSize:13, fontWeight:600, color }}>{fmt(d.total)} ({d.cantidad} pzas)</span>
            </div>
          ))}
          {Object.keys(porFamilia).length === 0 && <p style={{ fontSize:12, color:'#475569' }}>Sin ventas</p>}
        </div>
      </div>

      {/* Detalle */}
      {isLoading ? <p style={{color:'#64748b'}}>Cargando...</p> : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha</th><th>Canal</th><th>Cliente</th>
              <th style={{textAlign:'right'}}>Total</th><th>Pago</th>
            </tr></thead>
            <tbody>
              {(ventas as any[]).length===0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin ventas</td></tr>
              )}
              {(ventas as any[]).map((v:any) => (
                <tr key={v.id}>
                  <td>{fmtDate(v.date)}</td>
                  <td><span className="badge-blue">{CANAL_LABELS[v.channel]||v.channel}</span></td>
                  <td style={{color:'#64748b'}}>{v.client?.name||'—'}</td>
                  <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(v.total)}</td>
                  <td style={{color:'#64748b',fontSize:12}}>{v.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── CxC MULTICLIENTE ─────────────────────────────────────────
function CxCReporteTab({ cid, color }: any) {
  const hoyStr = new Date().toISOString().slice(0,10);
  const [tipoFiltro,  setTipoFiltro]  = useState<'mes'|'dia'|'rango'>('mes');
  const [periodo,     setPeriodo]     = useState(hoyStr.slice(0,7));
  const [diaFiltro,   setDiaFiltro]   = useState(hoyStr);
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin,    setFechaFin]    = useState(hoyStr);
  const [clienteIds,  setClienteIds]  = useState<string[]>([]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxcs = [], isLoading } = useQuery({
    queryKey: ['cxc-reporte', cid, tipoFiltro, periodo, diaFiltro, fechaInicio, fechaFin, clienteIds],
    queryFn: () => {
      let url = `/companies/${cid}/cxc?`;
      if (tipoFiltro==='mes')   url += `period=${periodo}`;
      if (tipoFiltro==='dia')   url += `startDate=${diaFiltro}&endDate=${diaFiltro}`;
      if (tipoFiltro==='rango') url += `startDate=${fechaInicio}&endDate=${fechaFin}`;
      if (clienteIds.length===1) url += `&clientId=${clienteIds[0]}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const filtrados = clienteIds.length > 1
    ? (cxcs as any[]).filter(c => clienteIds.includes(c.clientId))
    : cxcs as any[];

  const totalPendiente = filtrados.reduce((t,c) => t + Number(c.balance), 0);
  const toggleCliente  = (id:string) =>
    setClienteIds(ids => ids.includes(id) ? ids.filter(i=>i!==id) : [...ids, id]);

  const exportarExcel = () => {
    import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs').then((XLSX:any) => {
      const rows = filtrados.map((c:any) => ({
        Cliente:  c.client?.name||'—', Fecha: c.date?.slice(0,10),
        Original: Number(c.originalAmount), Pagado: Number(c.paidAmount),
        Saldo:    Number(c.balance), Estado: c.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CxC');
      XLSX.writeFile(wb, `cxc-${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Ver por</label>
          <div style={{ display:'flex', gap:4 }}>
            {(['mes','dia','rango'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${tipoFiltro===t?color:'#334155'}`,
                  background: tipoFiltro===t?color+'22':'transparent',
                  color: tipoFiltro===t?color:'#64748b' }}>
                {t==='mes'?'Mes':t==='dia'?'Día':'Rango'}
              </button>
            ))}
          </div>
        </div>
        {tipoFiltro==='mes' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Mes</label>
            <input type="month" className="input-base" style={{ fontSize:13 }}
              value={periodo} onChange={e => setPeriodo(e.target.value)}/>
          </div>
        )}
        {tipoFiltro==='dia' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Día</label>
            <input type="date" className="input-base" style={{ fontSize:13 }}
              value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}/>
          </div>
        )}
        {tipoFiltro==='rango' && (
          <>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Desde</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hasta</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaFin} onChange={e => setFechaFin(e.target.value)}/>
            </div>
          </>
        )}
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Clientes</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(clientes as any[]).map((c:any) => (
              <button key={c.id} onClick={() => toggleCliente(c.id)}
                style={{ padding:'4px 10px', borderRadius:99, fontSize:11, cursor:'pointer',
                  border:`1px solid ${clienteIds.includes(c.id)?color:'#334155'}`,
                  background: clienteIds.includes(c.id)?color+'22':'transparent',
                  color: clienteIds.includes(c.id)?color:'#64748b' }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="card-sm" style={{ borderLeft:`3px solid ${color}`, flex:1, marginRight:16 }}>
          <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total pendiente</p>
          <p style={{ fontSize:22, fontWeight:700, color, margin:0 }}>{fmt(totalPendiente)}</p>
        </div>
        <button onClick={exportarExcel}
          style={{ padding:'6px 16px', borderRadius:8, fontSize:12, border:'1px solid #10b981',
            background:'none', color:'#10b981', cursor:'pointer' }}>
          ⬇ Excel
        </button>
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table-base">
          <thead><tr>
            <th>Cliente</th><th>Fecha</th>
            <th style={{textAlign:'right'}}>Original</th>
            <th style={{textAlign:'right'}}>Saldo</th><th>Estado</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>}
            {filtrados.length===0 && !isLoading && (
              <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cuentas</td></tr>
            )}
            {filtrados.map((c:any) => (
              <tr key={c.id}>
                <td style={{fontWeight:500}}>{c.client?.name}</td>
                <td>{fmtDate(c.date)}</td>
                <td style={{textAlign:'right'}}>{fmt(c.originalAmount)}</td>
                <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(c.balance)}</td>
                <td><span className={c.status==='PAGADO'?'badge-green':c.status==='VENCIDO'?'badge-red':'badge-amber'}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CxP ───────────────────────────────────────────────────────
function CxPReporteTab({ cid, color }: any) {
  const hoyStr = new Date().toISOString().slice(0,10);
  const [tipoFiltro,  setTipoFiltro]  = useState<'mes'|'dia'|'rango'>('mes');
  const [periodo,     setPeriodo]     = useState(hoyStr.slice(0,7));
  const [diaFiltro,   setDiaFiltro]   = useState(hoyStr);
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin,    setFechaFin]    = useState(hoyStr);
  const [proveedorId, setProveedorId] = useState('');

  const { data: proveedores = [] } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxps = [], isLoading } = useQuery({
    queryKey: ['cxp-reporte', cid, tipoFiltro, periodo, diaFiltro, fechaInicio, fechaFin, proveedorId],
    queryFn: () => {
      let url = `/companies/${cid}/cxp?`;
      if (tipoFiltro==='mes')   url += `period=${periodo}`;
      if (tipoFiltro==='dia')   url += `startDate=${diaFiltro}&endDate=${diaFiltro}`;
      if (tipoFiltro==='rango') url += `startDate=${fechaInicio}&endDate=${fechaFin}`;
      if (proveedorId) url += `&supplierId=${proveedorId}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const totalPendiente = (cxps as any[]).reduce((t,c) => t+Number(c.balance||0), 0);
  const totalVencido   = (cxps as any[]).filter(c=>c.status==='VENCIDO').reduce((t,c) => t+Number(c.balance||0), 0);

  const exportarExcel = () => {
    import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs').then((XLSX:any) => {
      const rows = (cxps as any[]).map((c:any) => ({
        Proveedor: c.supplier?.name||'—', Concepto: c.concept||'—',
        Fecha: c.date?.slice(0,10), Vencimiento: c.dueDate?.slice(0,10),
        Original: Number(c.originalAmount), Pagado: Number(c.paidAmount),
        Saldo: Number(c.balance), Estado: c.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CxP');
      XLSX.writeFile(wb, `cxp-${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Ver por</label>
          <div style={{ display:'flex', gap:4 }}>
            {(['mes','dia','rango'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${tipoFiltro===t?color:'#334155'}`,
                  background: tipoFiltro===t?color+'22':'transparent',
                  color: tipoFiltro===t?color:'#64748b' }}>
                {t==='mes'?'Mes':t==='dia'?'Día':'Rango'}
              </button>
            ))}
          </div>
        </div>
        {tipoFiltro==='mes' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Mes</label>
            <input type="month" className="input-base" style={{ fontSize:13 }}
              value={periodo} onChange={e => setPeriodo(e.target.value)}/>
          </div>
        )}
        {tipoFiltro==='dia' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Día</label>
            <input type="date" className="input-base" style={{ fontSize:13 }}
              value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}/>
          </div>
        )}
        {tipoFiltro==='rango' && (
          <>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Desde</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hasta</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaFin} onChange={e => setFechaFin(e.target.value)}/>
            </div>
          </>
        )}
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Proveedor</label>
          <select className="input-base" style={{ fontSize:13 }} value={proveedorId}
            onChange={e => setProveedorId(e.target.value)}>
            <option value="">Todos</option>
            {(proveedores as any[]).map((p:any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
          <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total por pagar</p>
          <p style={{ fontSize:22, fontWeight:700, color, margin:0 }}>{fmt(totalPendiente)}</p>
        </div>
        <div className="card-sm" style={{ borderLeft:'3px solid #f87171' }}>
          <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Vencido</p>
          <p style={{ fontSize:22, fontWeight:700, color:'#f87171', margin:0 }}>{fmt(totalVencido)}</p>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button onClick={exportarExcel}
          style={{ padding:'6px 16px', borderRadius:8, fontSize:12, border:'1px solid #10b981',
            background:'none', color:'#10b981', cursor:'pointer' }}>
          ⬇ Excel
        </button>
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table-base">
          <thead><tr>
            <th>Proveedor</th><th>Concepto</th><th>Fecha</th><th>Vencimiento</th>
            <th style={{textAlign:'right'}}>Original</th>
            <th style={{textAlign:'right'}}>Saldo</th><th>Estado</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>}
            {(cxps as any[]).length===0 && !isLoading && (
              <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cuentas por pagar</td></tr>
            )}
            {(cxps as any[]).map((c:any) => (
              <tr key={c.id}>
                <td style={{fontWeight:500}}>{c.supplier?.name||'—'}</td>
                <td style={{color:'#64748b',fontSize:12}}>{c.concept||'—'}</td>
                <td>{c.date?.slice(0,10)}</td>
                <td style={{color:c.status==='VENCIDO'?'#f87171':'#64748b'}}>{c.dueDate?.slice(0,10)}</td>
                <td style={{textAlign:'right'}}>{fmt(c.originalAmount)}</td>
                <td style={{textAlign:'right',fontWeight:700,color:c.status==='VENCIDO'?'#f87171':color}}>{fmt(c.balance)}</td>
                <td><span className={c.status==='PAGADO'?'badge-green':c.status==='VENCIDO'?'badge-red':'badge-amber'}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
