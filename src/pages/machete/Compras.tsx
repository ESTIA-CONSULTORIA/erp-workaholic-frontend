import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate, exportCSV } from '../../lib/api';
import ImportCSV from '../../components/ImportCSV';

const METODOS_PAGO = [
  { id:'EFECTIVO',        label:'Efectivo'        },
  { id:'TRANSFERENCIA',   label:'Transferencia'   },
  { id:'TARJETA_DEBITO',  label:'Tarjeta débito'  },
  { id:'TARJETA_CREDITO', label:'Tarjeta crédito' },
  { id:'CREDITO_CLIENTE', label:'Crédito (CxP)'   },
];

const STATUS_COLOR: Record<string,string> = {
  PENDIENTE: '#f59e0b',
  RECIBIDA:  '#10b981',
  PARCIAL:   '#3b82f6',
  CANCELADA: '#f87171',
};

export default function ComprasPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const qc    = useQueryClient();

  const [vista, setVista] = useState<'lista'|'nueva'>('lista');

  // Filtros
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroFechaIni,  setFiltroFechaIni]  = useState('');
  const [filtroFechaFin,  setFiltroFechaFin]  = useState('');
  const [filtroEstado,    setFiltroEstado]     = useState('');

  // Formulario nueva compra
  const [form, setForm] = useState({
    fecha:         new Date().toISOString().slice(0,10),
    proveedorId:   '',
    insumoId:      '',
    unidad:        'kg',
    cantidad:      0,
    costoUnitario: 0,
    metodoPago:    'EFECTIVO',
    cuentaId:      '',
    referencia:    '',
    notas:         '',
  });
  const [lineas, setLineas] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Modal detalle
  const [compraDetalle, setCompraDetalle] = useState<any>(null);

  const setF = (k: string, v: any) => setForm(f => ({...f, [k]: v}));

  // Queries
  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['compras', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/compras`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: insumos = [] } = useQuery({
    queryKey: ['insumos', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/insumos`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cuentas = [] } = useQuery({
    queryKey: ['cuentas', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data),
    enabled:  !!cid,
  });

  // Agregar línea al formulario
  const agregarLinea = () => {
    if (!form.insumoId || !form.cantidad || !form.costoUnitario) return;
    const ins = (insumos as any[]).find(i => i.id === form.insumoId);
    setLineas(ls => [...ls, {
      insumoId:      form.insumoId,
      nombre:        ins?.name || '',
      unidad:        form.unidad || ins?.unit || 'kg',
      cantidad:      form.cantidad,
      costoUnitario: form.costoUnitario,
      total:         form.cantidad * form.costoUnitario,
    }]);
    setF('insumoId', ''); setF('cantidad', 0); setF('costoUnitario', 0);
  };

  const quitarLinea = (idx: number) => setLineas(ls => ls.filter((_,i) => i !== idx));

  const totalCompra = lineas.reduce((t, l) => t + l.total, 0);

  // Mutation crear compra
  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/machete/compras`, {
      fecha:       form.fecha,
      proveedorId: form.proveedorId || null,
      metodoPago:  form.metodoPago,
      cuentaId:    form.cuentaId || null,
      referencia:  form.referencia || null,
      notas:       form.notas || null,
      lineas,
    }),
    onSuccess: () => {
      setVista('lista');
      setLineas([]);
      setForm({ fecha:new Date().toISOString().slice(0,10), proveedorId:'', insumoId:'', unidad:'kg', cantidad:0, costoUnitario:0, metodoPago:'EFECTIVO', cuentaId:'', referencia:'', notas:'' });
      qc.invalidateQueries({ queryKey: ['compras', cid] });
      qc.invalidateQueries({ queryKey: ['insumos', cid] });
    },
  });

  // Filtrar compras
  const comprasFiltradas = (compras as any[]).filter(c => {
    if (filtroProveedor && !c.supplier?.name?.toLowerCase().includes(filtroProveedor.toLowerCase())) return false;
    if (filtroFechaIni && c.date && new Date(c.date) < new Date(filtroFechaIni)) return false;
    if (filtroFechaFin && c.date && new Date(c.date) > new Date(filtroFechaFin+'T23:59:59')) return false;
    if (filtroEstado && c.status !== filtroEstado) return false;
    return true;
  });

  const totalFiltrado = comprasFiltradas.reduce((t, c) => t + Number(c.total || 0), 0);

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Compras de Insumos</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setVista(vista==='nueva'?'lista':'nueva')}>
            {vista==='nueva' ? '← Volver' : '+ Nueva compra'}
          </button>
        </div>

        {/* ── FORMULARIO NUEVA COMPRA ── */}
        {vista === 'nueva' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nueva orden de compra</h3>

            {/* Cabecera */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.fecha} onChange={e => setF('fecha', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Proveedor</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.proveedorId}
                  onChange={e => setF('proveedorId', e.target.value)}>
                  <option value="">— Sin proveedor —</option>
                  {(proveedores as any[]).map((p:any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Método de pago *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.metodoPago}
                  onChange={e => setF('metodoPago', e.target.value)}>
                  {METODOS_PAGO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              {form.metodoPago !== 'CREDITO_CLIENTE' && (
                <div>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Cuenta</label>
                  <select className="input-base" style={{ fontSize:13 }} value={form.cuentaId}
                    onChange={e => setF('cuentaId', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {(Array.isArray(cuentas) ? cuentas as any[] : []).map((c:any) => (
                      <option key={c.accountId||c.id} value={c.accountCode||c.code}>{c.accountName||c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Referencia / Factura</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.referencia}
                  onChange={e => setF('referencia', e.target.value)} placeholder="No. factura o referencia"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notas}
                  onChange={e => setF('notas', e.target.value)} placeholder="Observaciones"/>
              </div>
            </div>

            {/* Agregar líneas */}
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:12 }}>
              <p style={{ fontSize:11, fontWeight:600, color:'#64748b', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:1 }}>
                Agregar insumo
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:8, alignItems:'end' }}>
                <div>
                  <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>Insumo</label>
                  <select className="input-base" style={{ fontSize:12 }} value={form.insumoId}
                    onChange={e => {
                      const ins = (insumos as any[]).find(i => i.id === e.target.value);
                      setF('insumoId', e.target.value);
                      if (ins) { setF('unidad', ins.unit); setF('costoUnitario', ins.costUnit || 0); }
                    }}>
                    <option value="">— Seleccionar —</option>
                    {(insumos as any[]).map((ins:any) => (
                      <option key={ins.id} value={ins.id}>{ins.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>Cantidad</label>
                  <input type="number" min="0" step="0.001" className="input-base" style={{ fontSize:12 }}
                    value={form.cantidad||''} onChange={e => setF('cantidad', +e.target.value)}/>
                </div>
                <div>
                  <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>Costo / {form.unidad||'u'}</label>
                  <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:12 }}
                    value={form.costoUnitario||''} onChange={e => setF('costoUnitario', +e.target.value)}/>
                </div>
                <div>
                  <label style={{ fontSize:10, color:'#64748b', display:'block', marginBottom:3 }}>Total</label>
                  <div style={{ padding:'8px 10px', background:'#1e293b', borderRadius:6, fontSize:12, fontWeight:700, color }}>
                    {fmt(form.cantidad * form.costoUnitario)}
                  </div>
                </div>
                <button onClick={agregarLinea}
                  disabled={!form.insumoId || !form.cantidad || !form.costoUnitario}
                  style={{ padding:'8px 14px', borderRadius:6, border:'none', background:color,
                    color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>
                  + Agregar
                </button>
              </div>
            </div>

            {/* Líneas agregadas */}
            {lineas.length > 0 && (
              <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:12 }}>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th style={{textAlign:'right'}}>Cantidad</th>
                      <th>Unidad</th>
                      <th style={{textAlign:'right'}}>Costo/u</th>
                      <th style={{textAlign:'right'}}>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={i}>
                        <td style={{fontWeight:500}}>{l.nombre}</td>
                        <td style={{textAlign:'right'}}>{l.cantidad}</td>
                        <td style={{color:'#64748b'}}>{l.unidad}</td>
                        <td style={{textAlign:'right',color:'#64748b'}}>{fmt(l.costoUnitario)}</td>
                        <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(l.total)}</td>
                        <td>
                          <button onClick={() => quitarLinea(i)}
                            style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:14}}>✕</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{background:'#0f172a'}}>
                      <td colSpan={4} style={{fontWeight:700,textAlign:'right',color:'#64748b'}}>Total compra</td>
                      <td style={{textAlign:'right',fontWeight:700,fontSize:15,color}}>{fmt(totalCompra)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => { setVista('lista'); setLineas([]); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()}
                disabled={crearM.isPending || lineas.length === 0}>
                {crearM.isPending ? 'Registrando…' : `Registrar compra — ${fmt(totalCompra)}`}
              </button>
            </div>
          </div>
        )}

        {/* ── LISTA DE COMPRAS ── */}
        {vista === 'lista' && (
          <>
            {/* Filtros */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              <input className="input-base" style={{ fontSize:12 }} placeholder="🔍 Buscar proveedor..."
                value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}/>
              <input type="date" className="input-base" style={{ fontSize:12 }}
                value={filtroFechaIni} onChange={e => setFiltroFechaIni(e.target.value)}/>
              <input type="date" className="input-base" style={{ fontSize:12 }}
                value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)}/>
              <select className="input-base" style={{ fontSize:12 }} value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="RECIBIDA">Recibida</option>
                <option value="PARCIAL">Parcial</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>

            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Compras en período', value: comprasFiltradas.length, fmt: (v:any) => v, col:'#94a3b8' },
                { label:'Total comprado',     value: totalFiltrado,           fmt: fmt,            col: color },
                { label:'Proveedores únicos', value: new Set(comprasFiltradas.map(c=>c.supplier?.name||'—')).size, fmt:(v:any)=>v, col:'#64748b' },
              ].map(k => (
                <div key={k.label} style={{ background:'#1e293b', borderRadius:8, padding:12, border:'1px solid #334155' }}>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
                  <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:0 }}>{k.fmt(k.value)}</p>
                </div>
              ))}
            </div>

            {/* Tabla */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
              <button onClick={() => setShowImport(true)}
                style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`,
                  background:'none', color, cursor:'pointer', fontSize:12 }}>
                ⬆ Importar CSV
              </button>
              <button onClick={() => exportCSV('compras', comprasFiltradas,
                [{key:'date',label:'Fecha'},{key:'concept',label:'Folio/Concepto'},
                 {key:'total',label:'Total'},{key:'paymentStatus',label:'Estado'},
                 {key:'invoiceRef',label:'No. Factura'}])}
                style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
                ⬇ Exportar CSV
              </button>
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Insumos</th>
                    <th>Método</th>
                    <th style={{textAlign:'right'}}>Total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>
                  )}
                  {!isLoading && comprasFiltradas.length === 0 && (
                    <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin compras registradas</td></tr>
                  )}
                  {comprasFiltradas.map((c:any) => (
                    <tr key={c.id} style={{cursor:'pointer'}} onClick={() => setCompraDetalle(c)}>
                      <td>
                        <code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4,color:'#94a3b8'}}>
                          {(c.concept?.match(/COM-\d{6}-\d{4}/)?.[0] || `COM-${c.id?.slice(-6).toUpperCase()}`)}
                        </code>
                      </td>
                      <td>{c.date ? new Date(c.date).toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'}</td>
                      <td style={{fontWeight:500}}>{c.supplier?.name || '—'}</td>
                      <td style={{color:'#64748b',fontSize:12}}>
                        {c.items?.length ?? 0} {c.items?.length === 1 ? 'insumo' : 'insumos'}
                      </td>
                      <td style={{fontSize:12,color:'#64748b'}}>
                        {c.paymentStatus === 'PAGADO' ? 'Pagado' : c.paymentStatus === 'PENDIENTE' ? 'Pendiente' : (c.paymentStatus || '—')}
                      </td>
                      <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(c.total)}</td>
                      <td>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                          background:(STATUS_COLOR[c.status]||'#64748b')+'22',
                          color: STATUS_COLOR[c.status]||'#64748b' }}>
                          {c.status || 'RECIBIDA'}
                        </span>
                      </td>
                      <td>
                        <button onClick={e=>{e.stopPropagation();setCompraDetalle(c);}}
                          style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                          Ver
                        </button>
                        {c.paymentStatus !== 'CANCELADO' && (
                          <button onClick={() => setCancelId(c.id)}
                            style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:12}}>
                            Cancelar
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL DETALLE ── */}
      {compraDetalle && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#0f172a',borderRadius:12,padding:0,width:580,maxHeight:'85vh',display:'flex',flexDirection:'column',border:'1px solid #334155'}}>
            {/* Header */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid #334155',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 2px'}}>
                  {(compraDetalle.concept?.match(/COM-\d{6}-\d{4}/)?.[0] || `COM-${compraDetalle.id?.slice(-6).toUpperCase()}`)}
                </h3>
                <p style={{fontSize:12,color:'#64748b',margin:0}}>
                  {(compraDetalle.date ? new Date(compraDetalle.date).toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—')} · {compraDetalle.supplier?.name || 'Sin proveedor'}
                </p>
              </div>
              <button onClick={()=>setCompraDetalle(null)}
                style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>

            {/* Info */}
            <div style={{padding:'12px 20px',borderBottom:'1px solid #1e293b',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              {[
                {label:'Método',  value: compraDetalle.paymentStatus === 'PAGADO' ? 'Pagado' : compraDetalle.paymentStatus === 'PENDIENTE' ? 'Pendiente' : (compraDetalle.paymentStatus || '—')},
                {label:'Referencia / Factura', value: compraDetalle.invoiceRef || compraDetalle.referencia || '—'},
                {label:'Estado', value: compraDetalle.status || 'RECIBIDA'},
              ].map(k=>(
                <div key={k.label} style={{background:'#1e293b',borderRadius:6,padding:'6px 10px'}}>
                  <p style={{fontSize:9,color:'#64748b',margin:'0 0 2px',textTransform:'uppercase'}}>{k.label}</p>
                  <p style={{fontSize:12,fontWeight:600,color:'#f1f5f9',margin:0}}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Líneas */}
            <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
              <p style={{fontSize:10,color:'#64748b',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:1}}>Insumos comprados</p>
              {(compraDetalle.items||[]).length === 0 ? (<p style={{color:'#64748b',fontSize:13}}>Sin detalle de insumos</p>) : (compraDetalle.items||[]).map((l:any,i:number)=>(
                <div key={i} style={{background:'#1e293b',borderRadius:8,padding:'8px 12px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:500,color:'#f1f5f9',margin:'0 0 2px'}}>{l.description}</p>
                    <p style={{fontSize:11,color:'#64748b',margin:0}}>{l.quantity} {l.unit} × {fmt(l.unitCost)}</p>
                  </div>
                  <p style={{fontSize:14,fontWeight:700,color,margin:0}}>{fmt(l.total)}</p>
                </div>
              ))}
              {compraDetalle.notas && (
                <div style={{background:'#1e293b',borderRadius:6,padding:'8px 12px',marginTop:8}}>
                  <p style={{fontSize:10,color:'#64748b',margin:'0 0 2px'}}>Notas</p>
                  <p style={{fontSize:12,color:'#94a3b8',margin:0}}>{compraDetalle.notas}</p>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{padding:'12px 20px',borderTop:'1px solid #334155',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:'#64748b'}}>Total de la compra</span>
              <span style={{fontSize:20,fontWeight:700,color}}>{fmt(compraDetalle.total)}</span>
            </div>
          </div>
        </div>
      )}
      {cancelId && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',
          alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:380,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 8px',color:'#f87171'}}>Cancelar compra</h3>
            <p style={{fontSize:13,color:'#94a3b8',margin:'0 0 20px'}}>
              ¿Confirmas la cancelación? Esta acción no se puede deshacer.
            </p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setCancelId(null)}
                className="btn-secondary" style={{flex:1,fontSize:13}}>No, volver</button>
              <button onClick={async()=>{
                try {
                  await api.put(`/companies/${cid}/machete/compras/${cancelId}/cancelar`,{});
                  qc.invalidateQueries({queryKey:['compras',cid]});
                  setCancelId(null);
                } catch(e:any){ alert(e.response?.data?.message||'Error'); }
              }} className="btn-primary"
                style={{flex:1,fontSize:13,background:'#f87171',border:'none'}}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && (
        <ImportCSV title="Compras" color={color}
          columns={[
            { key:'fecha',     label:'Fecha',      required:true, type:'date'   },
            { key:'proveedor', label:'Proveedor'                                },
            { key:'concepto',  label:'Concepto',   required:true               },
            { key:'total',     label:'Total',       required:true, type:'number'},
            { key:'factura',   label:'No. Factura'                              },
            { key:'estatus',   label:'Estatus'                                  },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/compras`, { rows });
            qc.invalidateQueries({ queryKey: ['compras', cid] });
            return res.data;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </AppLayout>
  );
}
