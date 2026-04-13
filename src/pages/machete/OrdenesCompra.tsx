import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

const STATUS_COLOR: Record<string,string> = {
  PENDIENTE:       '#f59e0b',
  SURTIDO_PARCIAL: '#3b82f6',
  SURTIDO_COMPLETO:'#10b981',
  CANCELADA:       '#f87171',
};
const STATUS_LABEL: Record<string,string> = {
  PENDIENTE:       'Pendiente',
  SURTIDO_PARCIAL: 'Surtido parcial',
  SURTIDO_COMPLETO:'Surtido completo',
  CANCELADA:       'Cancelada',
};

export default function OrdenesCompraPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const qc    = useQueryClient();

  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [ocActiva, setOcActiva] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [surtidoOC, setSurtidoOC] = useState<string|null>(null);
  const [surtLineas, setSurtLineas] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Form nueva OC
  const [form, setForm] = useState({
    clienteId: '', numero: '',
    fecha: new Date().toISOString().slice(0,10), notes: '',
  });
  const [lineas, setLineas] = useState<any[]>([]);
  const set = (k:string, v:any) => setForm(f => ({...f, [k]: v}));

  const { data: ocs = [], isLoading } = useQuery({
    queryKey: ['ordenes-compra', cid, filtroStatus, filtroCliente],
    queryFn:  () => {
      let url = `/companies/${cid}/ordenes?`;
      if (filtroStatus)  url += `status=${filtroStatus}&`;
      if (filtroCliente) url += `clientId=${filtroCliente}&`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['products', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled:  !!cid,
  });

  const montoTotal = lineas.reduce((t, l) => t + Number(l.cantidad||0) * Number(l.precioUnitario||0), 0);

  const agregarLinea = () => setLineas(l => [...l, { productId:'', cantidad:1, precioUnitario:0 }]);

  const setLinea = (idx: number, k: string, v: any) => {
    setLineas(l => l.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [k]: v };
      if (k === 'productId') {
        const prod = (productos as any[]).find((p:any) => p.id === v);
        if (prod) updated.precioUnitario = prod.priceMostrador || 0;
      }
      return updated;
    }));
  };

  const crearOC = async () => {
    if (!form.clienteId || !form.numero || lineas.length === 0) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/clients/${form.clienteId}/ordenes`, {
        numero: form.numero, fecha: form.fecha, notes: form.notes,
        lineas: lineas.map(l => ({
          productId: l.productId,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precioUnitario),
        })),
      });
      setShowNew(false);
      setForm({ clienteId:'', numero:'', fecha: new Date().toISOString().slice(0,10), notes:'' });
      setLineas([]);
      qc.invalidateQueries({ queryKey: ['ordenes-compra', cid] });
    } finally { setSaving(false); }
  };

  const registrarSurtido = async (ordenId: string) => {
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/ordenes/${ordenId}/surtidos`, {
        fecha: new Date().toISOString().slice(0,10),
        lineas: surtLineas.filter(l => l.cantidad > 0),
        notes: '',
      });
      setSurtidoOC(null);
      setSurtLineas([]);
      qc.invalidateQueries({ queryKey: ['ordenes-compra', cid] });
      if (ocActiva?.id === ordenId) {
        const { data } = await api.get(`/companies/${cid}/ordenes?`);
        const updated = (data as any[]).find((o:any) => o.id === ordenId);
        if (updated) setOcActiva(updated);
      }
    } finally { setSaving(false); }
  };

  const cerrarOC = async (id: string) => {
    if (!window.confirm('¿Cerrar esta OC con lo surtido hasta ahora?')) return;
    await api.put(`/companies/${cid}/ordenes/${id}/cerrar`, {});
    qc.invalidateQueries({ queryKey: ['ordenes-compra', cid] });
    if (ocActiva?.id === id) setOcActiva(null);
  };

  const cancelarOC = async (id: string) => {
    const motivo = window.prompt('Motivo de cancelación:');
    if (motivo === null) return;
    await api.put(`/companies/${cid}/ordenes/${id}/cancelar`, { motivo });
    qc.invalidateQueries({ queryKey: ['ordenes-compra', cid] });
    if (ocActiva?.id === id) setOcActiva(null);
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:1100 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 4px' }}>Órdenes de Compra</h1>
            <p style={{ fontSize:13, color:'#64748b', margin:0 }}>{(ocs as any[]).length} órdenes</p>
          </div>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(!showNew)}>
            {showNew ? 'Cancelar' : '+ Nueva OC'}
          </button>
        </div>

        {/* Formulario nueva OC */}
        {showNew && (
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nueva orden de compra</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Cliente *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.clienteId}
                  onChange={e => set('clienteId', e.target.value)}>
                  <option value="">— Selecciona cliente —</option>
                  {(clientes as any[]).map((c:any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Número OC *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.numero}
                  onChange={e => set('numero', e.target.value)} placeholder="OC-001"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:13 }} value={form.fecha}
                  onChange={e => set('fecha', e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)} placeholder="Observaciones"/>
              </div>
            </div>

            {/* Líneas de productos */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'#94a3b8' }}>Productos</label>
                <button onClick={agregarLinea}
                  style={{ background:'none', border:`1px solid ${color}`, color, padding:'3px 10px',
                    borderRadius:6, cursor:'pointer', fontSize:12 }}>+ Agregar</button>
              </div>
              {lineas.length === 0 && (
                <p style={{ fontSize:12, color:'#475569', textAlign:'center', padding:'12px 0' }}>
                  Agrega los productos de la orden
                </p>
              )}
              {lineas.map((l, idx) => (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto',
                  gap:8, marginBottom:8, alignItems:'center' }}>
                  <select className="input-base" style={{ fontSize:12 }} value={l.productId}
                    onChange={e => setLinea(idx, 'productId', e.target.value)}>
                    <option value="">— Producto —</option>
                    {(productos as any[]).filter((p:any) => p.isActive !== false).map((p:any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input type="number" min="1" placeholder="Cant." className="input-base" style={{ fontSize:12 }}
                    value={l.cantidad} onChange={e => setLinea(idx, 'cantidad', +e.target.value)}/>
                  <input type="number" min="0" placeholder="Precio" className="input-base" style={{ fontSize:12 }}
                    value={l.precioUnitario} onChange={e => setLinea(idx, 'precioUnitario', +e.target.value)}/>
                  <button onClick={() => setLineas(ls => ls.filter((_,i) => i !== idx))}
                    style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:18 }}>✕</button>
                </div>
              ))}
              {lineas.length > 0 && (
                <div style={{ display:'flex', justifyContent:'flex-end', padding:'8px 0',
                  borderTop:'1px solid #334155', marginTop:4 }}>
                  <span style={{ fontSize:13, color:'#64748b', marginRight:12 }}>Total OC:</span>
                  <span style={{ fontSize:15, fontWeight:700, color }}>{fmt(montoTotal)}</span>
                </div>
              )}
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setShowNew(false); setLineas([]); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={crearOC} disabled={saving || !form.clienteId || !form.numero || lineas.length===0}>
                {saving ? 'Creando…' : 'Crear OC'}
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <select className="input-base" style={{ fontSize:12, minWidth:140 }} value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="SURTIDO_PARCIAL">Surtido parcial</option>
            <option value="SURTIDO_COMPLETO">Surtido completo</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <select className="input-base" style={{ fontSize:12, minWidth:160 }} value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {(clientes as any[]).map((c:any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Layout lista + detalle */}
        <div style={{ display:'grid', gridTemplateColumns: ocActiva ? '1fr 1fr' : '1fr', gap:16 }}>

          {/* Lista de OC */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>OC</th><th>Cliente</th><th>Fecha</th>
                  <th style={{textAlign:'right'}}>Total</th>
                  <th style={{textAlign:'right'}}>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>
                )}
                {!isLoading && (ocs as any[]).length === 0 && (
                  <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin órdenes de compra</td></tr>
                )}
                {(ocs as any[]).map((oc:any) => (
                  <tr key={oc.id}
                    onClick={() => setOcActiva(ocActiva?.id === oc.id ? null : oc)}
                    style={{ cursor:'pointer', background: ocActiva?.id===oc.id ? color+'11' : 'transparent' }}>
                    <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>
                      {oc.numero}
                    </code></td>
                    <td style={{fontWeight:500,fontSize:12}}>{oc.client?.name||'—'}</td>
                    <td style={{fontSize:12,color:'#64748b'}}>{fmtDate(oc.fecha)}</td>
                    <td style={{textAlign:'right',fontSize:12}}>{fmt(oc.montoTotal)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(oc.saldo)}</td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:(STATUS_COLOR[oc.status]||'#64748b')+'22',
                        color:STATUS_COLOR[oc.status]||'#64748b' }}>
                        {STATUS_LABEL[oc.status]||oc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalle OC */}
          {ocActiva && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 2px', color }}>
                      OC #{ocActiva.numero}
                    </h3>
                    <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
                      {ocActiva.client?.name} · {fmtDate(ocActiva.fecha)}
                    </p>
                  </div>
                  <button onClick={() => setOcActiva(null)}
                    style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18 }}>✕</button>
                </div>

                {/* KPIs */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                  {[
                    { label:'Total OC',  value:fmt(ocActiva.montoTotal),  col:'#94a3b8' },
                    { label:'Surtido',   value:fmt(ocActiva.montoSurtido), col:'#10b981' },
                    { label:'Saldo',     value:fmt(ocActiva.saldo),        col:color },
                  ].map(k => (
                    <div key={k.label} style={{ background:'#0f172a', borderRadius:8, padding:'8px 10px' }}>
                      <p style={{ fontSize:10, color:'#64748b', margin:'0 0 2px' }}>{k.label}</p>
                      <p style={{ fontSize:14, fontWeight:700, color:k.col, margin:0 }}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Líneas */}
                {ocActiva.lineas?.length > 0 && (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, marginBottom:12 }}>
                    <thead>
                      <tr style={{ color:'#64748b' }}>
                        <th style={{ textAlign:'left', paddingBottom:4 }}>Producto</th>
                        <th style={{ textAlign:'right', paddingBottom:4 }}>Cant.</th>
                        <th style={{ textAlign:'right', paddingBottom:4 }}>Surtido</th>
                        <th style={{ textAlign:'right', paddingBottom:4 }}>Precio</th>
                        <th style={{ textAlign:'right', paddingBottom:4 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocActiva.lineas.map((l:any) => (
                        <tr key={l.id} style={{ color:'#94a3b8' }}>
                          <td style={{ paddingBottom:3 }}>{l.product?.name||l.productId}</td>
                          <td style={{ textAlign:'right' }}>{l.cantidad}</td>
                          <td style={{ textAlign:'right', color: l.cantidadSurtida>=l.cantidad?'#10b981':'#f59e0b' }}>
                            {l.cantidadSurtida}
                          </td>
                          <td style={{ textAlign:'right' }}>{fmt(l.precioUnitario)}</td>
                          <td style={{ textAlign:'right' }}>{fmt(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Historial surtidos */}
                {ocActiva.surtidos?.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <p style={{ fontSize:11, color:'#64748b', margin:'0 0 6px', fontWeight:600 }}>
                      Historial de surtidos
                    </p>
                    {ocActiva.surtidos.map((s:any) => (
                      <div key={s.id} style={{ display:'flex', justifyContent:'space-between',
                        fontSize:11, color:'#94a3b8', padding:'2px 0' }}>
                        <span>{fmtDate(s.fecha)}</span>
                        <span style={{ color:'#10b981' }}>{fmt(s.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                {ocActiva.status !== 'CANCELADA' && ocActiva.status !== 'SURTIDO_COMPLETO' && (
                  <>
                    <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                      <button onClick={() => cerrarOC(ocActiva.id)}
                        style={{ flex:1, padding:'6px', borderRadius:6, fontSize:12,
                          border:'1px solid #10b981', background:'none', color:'#10b981', cursor:'pointer' }}>
                        ✓ Cerrar OC
                      </button>
                      <button onClick={() => cancelarOC(ocActiva.id)}
                        style={{ flex:1, padding:'6px', borderRadius:6, fontSize:12,
                          border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer' }}>
                        ✕ Cancelar OC
                      </button>
                    </div>

                    {surtidoOC === ocActiva.id ? (
                      <div>
                        <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px' }}>
                          Selecciona cantidades a surtir:
                        </p>
                        {ocActiva.lineas?.map((l:any) => {
                          const pendiente = l.cantidad - l.cantidadSurtida;
                          if (pendiente <= 0) return null;
                          const surtVal = surtLineas.find((s:any) => s.lineaId===l.id)?.cantidad||0;
                          return (
                            <div key={l.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr',
                              gap:8, marginBottom:6, alignItems:'center' }}>
                              <span style={{ fontSize:11, color:'#94a3b8' }}>
                                {l.product?.name} (pendiente: {pendiente})
                              </span>
                              <input type="number" min="0" max={pendiente} className="input-base"
                                style={{ fontSize:12 }} value={surtVal||''}
                                onChange={e => {
                                  const val = Math.min(+e.target.value, pendiente);
                                  setSurtLineas(sl => {
                                    const exists = sl.findIndex((s:any) => s.lineaId===l.id);
                                    if (exists>=0) return sl.map((s:any,i:number) => i===exists?{...s,cantidad:val}:s);
                                    return [...sl, { lineaId:l.id, cantidad:val }];
                                  });
                                }}/>
                            </div>
                          );
                        })}
                        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
                          <button className="btn-secondary" style={{ fontSize:12 }}
                            onClick={() => { setSurtidoOC(null); setSurtLineas([]); }}>
                            Cancelar
                          </button>
                          <button className="btn-primary" style={{ background:color, fontSize:12 }}
                            onClick={() => registrarSurtido(ocActiva.id)} disabled={saving}>
                            {saving ? '…' : 'Registrar surtido'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setSurtidoOC(ocActiva.id); setSurtLineas([]); }}
                        style={{ width:'100%', padding:'8px', borderRadius:8, fontSize:13,
                          border:`1px solid ${color}`, background:'none', color, cursor:'pointer' }}>
                        + Registrar surtido
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
