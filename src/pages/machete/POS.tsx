import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const CANALES = [
  { id:'MOSTRADOR', label:'Tienda',      color:'#3b82f6', priceKey:'priceMostrador' },
  { id:'MAYOREO',   label:'Mayoreo',     color:'#f59e0b', priceKey:'priceMayoreo'   },
  { id:'ONLINE',    label:'Distribuidor',color:'#8b5cf6', priceKey:'priceOnline'    },
  { id:'ML',        label:'Online',      color:'#10b981', priceKey:'priceML'        },
];

const TIPO_LABELS: Record<string,string>  = { RES:'Res', CER:'Cerdo' };
const SABOR_LABELS: Record<string,string> = { NAT:'Natural', CHI:'Chile', BBQ:'BBQ' };
const DENOMINACIONES = [500,200,100,50,20,10,5,2,1,0.5];
const TERMINALES = [['debito','Débito'],['credito','Crédito'],['transferencia','Transferencia']];
const DELIVERY    = [['rappi','Rappi'],['ubereats','Uber Eats'],['didi','DiDi Food'],['pedidosya','Pedidos Ya']];

export default function POSPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';

  const [canal,      setCanal]      = useState('MOSTRADOR');
  const [carrito,    setCarrito]    = useState<any[]>([]);
  const [metodo,     setMetodo]     = useState('efectivo');
  const [esCredito,  setEsCredito]  = useState(false);
  const [clienteId,  setClienteId]  = useState('');
  const [ocId,       setOcId]       = useState('');
  const [exito,      setExito]      = useState(false);
  const [error,      setError]      = useState('');

  // Descuento / cortesía
  const [showDescuento, setShowDescuento] = useState(false);
  const [tipoDesc,      setTipoDesc]      = useState<'descuento'|'cortesia'>('descuento');
  const [descValor,     setDescValor]     = useState(0);
  const [descPin,       setDescPin]       = useState('');
  const [descAuth,      setDescAuth]      = useState<any>(null);
  const [pinError,      setPinError]      = useState('');

  // Tira X / Z
  const [showTiraX,    setShowTiraX]    = useState(false);
  const [showTiraZ,    setShowTiraZ]    = useState(false);
  const [efectivoCaja, setEfectivoCaja] = useState<any>({});
  const [tiraData,     setTiraData]     = useState<any>(null);

  // Ventana de cobro en efectivo
  const [showCobro, setShowCobro] = useState(false);
  const [conCuanto, setConCuanto] = useState(0);

  const canalConfig = CANALES.find(c => c.id === canal)!;
  const canalColor  = canalConfig.color;
  const priceKey    = canalConfig.priceKey;

  const { data: inventory = [] } = useQuery({
    queryKey: ['pt-inventory', cid],
    queryFn:  () => api.get(`/companies/${cid}/machete/inventory/pt`).then(r => r.data),
    enabled: !!cid,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid && esCredito,
  });

  const { data: ocsPendientes = [] } = useQuery({
    queryKey: ['ocs-pendientes', cid, clienteId],
    queryFn:  () => api.get(`/companies/${cid}/ordenes?clientId=${clienteId}&status=ACTIVAS`).then(r => r.data),
    enabled:  !!cid && !!clienteId && esCredito,
  });

  const agregar = (p: any) => {
    const precio = Number((p as any)[priceKey] || 0);
    if (precio === 0) { setError('Sin precio para este canal'); return; }
    if (p.stock <= 0) return;
    setError('');
    setCarrito(c => {
      const idx = c.findIndex(i => i.id === p.id);
      if (idx >= 0) {
        if (c[idx].cantidad >= p.stock) return c;
        return c.map((i,j) => j===idx ? {...i, cantidad:i.cantidad+1} : i);
      }
      return [...c, { id:p.id, nombre:p.name, precio, cantidad:1, stock:p.stock }];
    });
  };

  const cargarDesdeOC = (oc: any) => {
    if (!oc?.lineas) return;
    const nuevasLineas = (oc.lineas as any[]).map((l: any) => ({
      id:       l.productId,
      nombre:   l.product?.name || l.productId,
      precio:   Number(l.unitPrice || l.precioUnitario || 0),
      cantidad: l.cantidadPendiente || l.cantidad || 1,
      stock:    999,
    }));
    setCarrito(nuevasLineas);
    setOcId(oc.id);
  };

  const cambiar = (id: string, delta: number) =>
    setCarrito(c => c.map(i => i.id===id?{...i,cantidad:Math.max(0,Math.min(i.cantidad+delta,i.stock))}:i).filter(i=>i.cantidad>0));

  const subtotal  = carrito.reduce((t,i) => t+i.precio*i.cantidad, 0);
  const descMonto = tipoDesc==='cortesia' ? subtotal : (descValor > 0 ? Math.min(descValor, subtotal) : 0);
  const total     = descAuth ? Math.max(0, subtotal - descMonto) : subtotal;
  const cambio    = Math.max(0, conCuanto - total);

  const verificarPin = async () => {
    setPinError('');
    try {
      const { data } = await api.post('/auth/verify-pin', { companyId: cid, pin: descPin });
      setDescAuth(data);
      setShowDescuento(false);
    } catch {
      setPinError('PIN incorrecto');
    }
  };

  const cargarTira = async () => {
    const today = new Date().toISOString().slice(0,10);
    const { data } = await api.get(`/companies/${cid}/machete/sales?period=${today.slice(0,7)}`);
    const hoy = data.filter((s:any) => s.date.slice(0,10) === today);
    const porMetodo: Record<string,number> = {};
    const porCanal:  Record<string,number> = {};
    let totalBruto = 0;
    for (const s of hoy) {
      porMetodo[s.paymentMethod] = (porMetodo[s.paymentMethod]||0) + Number(s.total);
      porCanal[s.channel]        = (porCanal[s.channel]||0)        + Number(s.total);
      totalBruto += Number(s.total);
    }
    // Calcular efectivo contado desde desglose
    const efContado = DENOMINACIONES.reduce((t,d) => t + d*(efectivoCaja?.[`den_${d}`]||0), 0);
    setTiraData({ hoy, porMetodo, porCanal, totalBruto, totalDesc:0, fecha: today, efectivoContado: efContado });
  };

  const saleM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/machete/sales`, {
      date:          new Date().toISOString().slice(0,10),
      channel:       canal,
      paymentMethod: esCredito ? 'credito' : metodo,
      clientId:      esCredito ? clienteId : null,
      ocId:          ocId || null,
      isCredit:      esCredito,
      discount:      descAuth ? descMonto : 0,
      discountType:  descAuth ? tipoDesc : null,
      authorizedBy:  descAuth?.authorizedBy || null,
      lines: carrito.map(i => ({ productId:i.id, quantity:i.cantidad, unitPrice:i.precio })),
    }),
    onSuccess: () => {
      setCarrito([]); setDescAuth(null); setDescValor(0); setDescPin('');
      setOcId(''); setConCuanto(0); setShowCobro(false);
      setExito(true); setTimeout(() => setExito(false), 3000);
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error'),
  });

  const cobrar = () => {
    if (esCredito && !clienteId) { setError('Selecciona un cliente'); return; }
    setError('');
    if (!esCredito && metodo === 'efectivo') {
      setConCuanto(0);
      setShowCobro(true);
      return;
    }
    saleM.mutate();
  };

  return (
    <AppLayout>
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 120px)' }}>
        {/* Catálogo */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {CANALES.map(c => (
              <button key={c.id} onClick={() => setCanal(c.id)}
                style={{ padding:'6px 16px', borderRadius:99, fontSize:12, fontWeight:700, cursor:'pointer',
                  border:`2px solid ${c.color}`,
                  background: canal===c.id ? c.color+'22' : 'transparent',
                  color: canal===c.id ? c.color : '#64748b' }}>
                {c.label}
              </button>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button onClick={() => { cargarTira(); setShowTiraX(true); }}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, border:'1px solid #334155', background:'none', color:'#94a3b8', cursor:'pointer' }}>
                Tira X
              </button>
              <button onClick={() => { cargarTira(); setShowTiraZ(true); }}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, border:'1px solid #f59e0b', background:'none', color:'#f59e0b', cursor:'pointer' }}>
                Tira Z
              </button>
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {(inventory as any[]).filter((p:any) => p.isActive !== false).map((p:any) => {
                const precio = Number((p as any)[priceKey] || 0);
                const sinPrecio = precio === 0;
                const enCarrito = carrito.find(i => i.id===p.id);
                return (
                  <button key={p.id} onClick={() => agregar(p)}
                    disabled={p.stock<=0||sinPrecio}
                    style={{ padding:12, borderRadius:12,
                      border:`2px solid ${enCarrito?canalColor:sinPrecio?'#1e293b':'#334155'}`,
                      background: enCarrito?canalColor+'11':'#1e293b',
                      cursor: p.stock<=0||sinPrecio?'not-allowed':'pointer',
                      opacity: p.stock<=0?0.4:sinPrecio?0.5:1,
                      textAlign:'left', position:'relative' }}>
                    {enCarrito && (
                      <div style={{ position:'absolute', top:-8, right:-8, width:22, height:22,
                        borderRadius:'50%', background:canalColor, color:'#fff', fontSize:11,
                        fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {enCarrito.cantidad}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:canalColor+'22', color:canalColor }}>
                        {TIPO_LABELS[p.meatType]||p.meatType}
                      </span>
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'#334155', color:'#94a3b8' }}>
                        {SABOR_LABELS[p.flavor]||p.flavor}
                      </span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, margin:'0 0 4px', color:'#f1f5f9' }}>{p.name}</p>
                    <p style={{ fontSize:17, fontWeight:700, color:sinPrecio?'#64748b':canalColor, margin:'0 0 2px' }}>
                      {sinPrecio?'Sin precio':fmt(precio)}
                    </p>
                    <p style={{ fontSize:11, color:p.stock<=3?'#f87171':'#64748b', margin:0 }}>
                      {p.stock<=0?'Sin stock':`${p.stock} pzas`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div style={{ width:300, display:'flex', flexDirection:'column', background:'#1e293b',
          borderRadius:12, border:'1px solid #334155', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #334155' }}>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Orden — {canalConfig.label}</p>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:12 }}>
            {carrito.length===0
              ? <p style={{ color:'#64748b', fontSize:13, textAlign:'center', paddingTop:32 }}>Selecciona productos</p>
              : carrito.map(item => (
                <div key={item.id} style={{ background:'#0f172a', borderRadius:8, padding:10, marginBottom:8 }}>
                  <p style={{ fontSize:12, fontWeight:500, margin:'0 0 6px', color:'#f1f5f9' }}>{item.nombre}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => cambiar(item.id,-1)} style={{ width:26,height:26,borderRadius:6,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:14 }}>−</button>
                    <span style={{ fontWeight:700, minWidth:20, textAlign:'center', color:'#f1f5f9' }}>{item.cantidad}</span>
                    <button onClick={() => cambiar(item.id,+1)} style={{ width:26,height:26,borderRadius:6,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:14 }}>+</button>
                    <span style={{ flex:1, textAlign:'right', fontWeight:600, fontSize:13, color:canalColor }}>{fmt(item.precio*item.cantidad)}</span>
                    <button onClick={() => setCarrito(c=>c.filter(i=>i.id!==item.id))} style={{ background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:14 }}>✕</button>
                  </div>
                </div>
              ))}
          </div>

          {carrito.length > 0 && (
            <div style={{ padding:12, borderTop:'1px solid #334155' }}>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Subtotal</span>
                  <span style={{ fontSize:13, color:'#94a3b8' }}>{fmt(subtotal)}</span>
                </div>
                {descAuth && (
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, color:'#10b981' }}>
                      {tipoDesc==='cortesia'?'Cortesía':'Descuento'} ({descAuth.authorizedBy})
                    </span>
                    <span style={{ fontSize:13, color:'#10b981' }}>-{fmt(descMonto)}</span>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Total</span>
                  <span style={{ fontSize:22, fontWeight:700, color:canalColor }}>{fmt(total)}</span>
                </div>
              </div>

              {!descAuth && (
                <button onClick={() => setShowDescuento(true)}
                  style={{ width:'100%', marginBottom:10, padding:'6px', borderRadius:8, fontSize:12,
                    border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}>
                  + Descuento / Cortesía
                </button>
              )}

              {showDescuento && (
                <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:10 }}>
                  <p style={{ fontSize:12, fontWeight:600, margin:'0 0 8px', color:'#f1f5f9' }}>Autorización gerente</p>
                  <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                    <button onClick={() => setTipoDesc('descuento')}
                      style={{ flex:1, padding:'4px', borderRadius:6, fontSize:11, cursor:'pointer',
                        border:`1px solid ${tipoDesc==='descuento'?canalColor:'#334155'}`,
                        background: tipoDesc==='descuento'?canalColor+'22':'transparent',
                        color: tipoDesc==='descuento'?canalColor:'#64748b' }}>
                      Descuento $
                    </button>
                    <button onClick={() => setTipoDesc('cortesia')}
                      style={{ flex:1, padding:'4px', borderRadius:6, fontSize:11, cursor:'pointer',
                        border:`1px solid ${tipoDesc==='cortesia'?'#10b981':'#334155'}`,
                        background: tipoDesc==='cortesia'?'#10b98122':'transparent',
                        color: tipoDesc==='cortesia'?'#10b981':'#64748b' }}>
                      Cortesía
                    </button>
                  </div>
                  {tipoDesc==='descuento' && (
                    <input type="number" min="0" placeholder="Monto descuento"
                      className="input-base" style={{ fontSize:12, marginBottom:8 }}
                      value={descValor||''} onChange={e=>setDescValor(+e.target.value)}/>
                  )}
                  <input type="password" maxLength={4} placeholder="PIN gerente (4 dígitos)"
                    className="input-base" style={{ fontSize:12, marginBottom:4, letterSpacing:4, textAlign:'center' }}
                    value={descPin} onChange={e=>setDescPin(e.target.value)}/>
                  {pinError && <p style={{ color:'#f87171', fontSize:11, margin:'0 0 6px' }}>{pinError}</p>}
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => { setShowDescuento(false); setDescPin(''); setPinError(''); }}
                      style={{ flex:1, padding:'6px', borderRadius:6, fontSize:12, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={verificarPin} disabled={descPin.length!==4}
                      style={{ flex:1, padding:'6px', borderRadius:6, fontSize:12, border:'none', background:canalColor, color:'#fff', cursor:'pointer' }}>
                      Autorizar
                    </button>
                  </div>
                </div>
              )}

              {/* Cliente y OC — primero si es crédito */}
              <div style={{ marginBottom:10 }}>
                <button onClick={() => { setEsCredito(!esCredito); setClienteId(''); setOcId(''); }}
                  style={{ width:'100%', padding:'8px', borderRadius:8, fontSize:12,
                    fontWeight:600, cursor:'pointer', marginBottom: esCredito ? 8 : 0,
                    border:`2px solid ${esCredito?'#f59e0b':'#334155'}`,
                    background: esCredito?'#f59e0b22':'transparent',
                    color: esCredito?'#f59e0b':'#64748b' }}>
                  💳 {esCredito ? 'Venta a crédito ✓' : 'Venta a crédito'}
                </button>

                {esCredito && (
                  <div>
                    <select value={clienteId} onChange={e=>{ setClienteId(e.target.value); setOcId(''); setCarrito([]); }}
                      style={{ width:'100%', padding:'6px 8px', borderRadius:8, fontSize:12,
                        background:'#0f172a', border:'1px solid #f59e0b', color:'#f1f5f9', marginBottom:6 }}>
                      <option value="">— Seleccionar cliente —</option>
                      {(clientes as any[]).map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {clienteId && (
                      <select value={ocId} onChange={e => {
                          setOcId(e.target.value);
                          if (e.target.value) {
                            const oc = (ocsPendientes as any[]).find((o:any) => o.id === e.target.value);
                            if (oc) cargarDesdeOC(oc);
                          } else {
                            setCarrito([]);
                          }
                        }}
                        style={{ width:'100%', padding:'6px 8px', borderRadius:8, fontSize:12,
                          background:'#0f172a', border:'1px solid #334155', color:'#f1f5f9' }}>
                        <option value="">— Venta libre (sin OC) —</option>
                        {(ocsPendientes as any[]).map((oc:any) => (
                          <option key={oc.id} value={oc.id}>
                            {oc.numero} — Saldo: {fmt(oc.saldo || 0)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Método de pago — solo para venta no crédito */}
              {!esCredito && (
                <div style={{ marginBottom:10 }}>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 6px' }}>Método de pago</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {['efectivo','tarjeta','transferencia'].map(m => (
                      <button key={m} onClick={() => setMetodo(m)}
                        style={{ padding:'6px 4px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer',
                          border:`2px solid ${metodo===m?canalColor:'#334155'}`,
                          background: metodo===m?canalColor+'22':'transparent',
                          color: metodo===m?canalColor:'#64748b',
                          textTransform:'capitalize' }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p style={{ color:'#f87171', fontSize:12, marginBottom:8 }}>{error}</p>}

              <button onClick={cobrar} 
                disabled={saleM.isPending || (esCredito && !clienteId) || carrito.length === 0}
                style={{ width:'100%', padding:'12px', borderRadius:12, border:'none',
                  background: (esCredito && !clienteId) || carrito.length === 0 ? '#334155' : esCredito?'#f59e0b':canalColor,
                  color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                {saleM.isPending?'Procesando…':esCredito?`Registrar crédito — ${fmt(total)}`:`Cobrar ${fmt(total)}`}
              </button>
            </div>
          )}

          {exito && (
            <div style={{ padding:16, textAlign:'center', background:'rgba(16,185,129,0.1)', borderTop:'1px solid rgba(16,185,129,0.3)' }}>
              <p style={{ fontSize:24, margin:'0 0 4px' }}>✓</p>
              <p style={{ color:'#10b981', fontWeight:700, margin:0 }}>¡Venta registrada!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal cobro en efectivo */}
      {showCobro && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:320 }}>
            <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 20px', color }}>Cobro en efectivo</h3>
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:13, color:'#64748b' }}>Total a cobrar</span>
                <span style={{ fontSize:20, fontWeight:700, color }}>{fmt(total)}</span>
              </div>
            </div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:6 }}>Con cuánto paga el cliente</label>
            <input type="number" min={total} step="10" autoFocus
              className="input-base" style={{ fontSize:18, fontWeight:700, textAlign:'right', marginBottom:16 }}
              value={conCuanto||''} onChange={e => setConCuanto(+e.target.value)}/>
            {conCuanto >= total && (
              <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:14, color:'#64748b' }}>Cambio</span>
                  <span style={{ fontSize:24, fontWeight:700, color:'#10b981' }}>{fmt(cambio)}</span>
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowCobro(false)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={() => saleM.mutate()} disabled={conCuanto < total || saleM.isPending}
                style={{ flex:2, padding:'10px', borderRadius:8, border:'none',
                  background: conCuanto >= total ? color : '#334155',
                  color:'#fff', cursor: conCuanto >= total ? 'pointer' : 'not-allowed',
                  fontSize:13, fontWeight:700 }}>
                {saleM.isPending ? 'Procesando...' : `Confirmar — Cambio ${fmt(cambio)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tira X */}
      {showTiraX && tiraData && (
        <TiraModal
          titulo="Tira X — Precorte"
          data={tiraData}
          color={color}
          efectivoCaja={efectivoCaja}
          onEfectivoCaja={setEfectivoCaja}
          onClose={() => setShowTiraX(false)}
          onConfirm={() => setShowTiraX(false)}
        />
      )}

      {/* Modal Tira Z */}
      {showTiraZ && tiraData && (
        <TiraModal
          titulo="Tira Z — Corte de caja"
          data={tiraData}
          color={color}
          isZ={true}
          efectivoCaja={efectivoCaja}
          onEfectivoCaja={setEfectivoCaja}
          onClose={() => setShowTiraZ(false)}
          onConfirm={() => {
            setShowTiraZ(false);
          }}
        />
      )}
    </AppLayout>
  );
}

// ── Componente Tira ───────────────────────────────────────────
function TiraModal({ titulo, data, color, isZ, efectivoCaja, onEfectivoCaja, onClose, onConfirm }: any) {
  const CANAL_LABELS: Record<string,string> = {
    MOSTRADOR:'Tienda', MAYOREO:'Mayoreo', ONLINE:'Distribuidor', ML:'Online'
  };
  const METODO_LABELS: Record<string,string> = {
    efectivo:'Efectivo', tarjeta:'Tarjeta', transferencia:'Transferencia', credito:'Crédito'
  };

  const DENOMINACIONES = [500,200,100,50,20,10,5,2,1,0.5];
  const efContado   = DENOMINACIONES.reduce((t,d) => t + d*(efectivoCaja?.[`den_${d}`]||0), 0);
  const termContado = ['debito','credito','transferencia'].reduce((t,k) => t + (efectivoCaja?.[`term_${k}`]||0), 0);
  const delContado  = ['rappi','ubereats','didi','pedidosya'].reduce((t,k) => t + (efectivoCaja?.[`del_${k}`]||0), 0);

  const efEsperado   = data.porMetodo['efectivo']     || 0;
  const termEsperado = (data.porMetodo['tarjeta']||0) + (data.porMetodo['transferencia']||0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:440, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ fontSize:16, fontWeight:700, margin:0, color }}>{titulo}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        <p style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>{data.fecha}</p>

        {/* Tira X — desglose completo */}
        {!isZ && (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
              Denominaciones en caja
            </p>
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:12 }}>
              {DENOMINACIONES.map(d => (
                <div key={d} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#94a3b8', width:50, textAlign:'right' }}>${d}</span>
                  <span style={{ fontSize:11, color:'#64748b' }}>×</span>
                  <input type="number" min="0"
                    style={{ width:60, padding:'4px 8px', borderRadius:6, border:'1px solid #334155',
                      background:'#1e293b', color:'#f1f5f9', fontSize:12, textAlign:'center' }}
                    value={efectivoCaja?.[`den_${d}`]||''}
                    onChange={e => onEfectivoCaja({ ...efectivoCaja, [`den_${d}`]: +e.target.value })}/>
                  <span style={{ fontSize:12, color, fontWeight:600, marginLeft:'auto' }}>
                    = {fmt(d * (efectivoCaja?.[`den_${d}`] || 0))}
                  </span>
                </div>
              ))}
              <div style={{ borderTop:'1px solid #334155', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'#64748b' }}>Total efectivo</span>
                <span style={{ fontSize:15, fontWeight:700, color }}>{fmt(efContado)}</span>
              </div>
            </div>

            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Terminal bancaria</p>
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:12 }}>
              {[['debito','Débito'],['credito','Crédito'],['transferencia','Transferencia']].map(([k,l]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{l}</span>
                  <input type="number" min="0" step="0.01"
                    style={{ width:100, padding:'4px 8px', borderRadius:6, border:'1px solid #334155',
                      background:'#1e293b', color:'#f1f5f9', fontSize:12, textAlign:'right' }}
                    value={efectivoCaja?.[`term_${k}`]||''}
                    onChange={e => onEfectivoCaja({ ...efectivoCaja, [`term_${k}`]: +e.target.value })}/>
                </div>
              ))}
              <div style={{ borderTop:'1px solid #334155', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'#64748b' }}>Total terminal</span>
                <span style={{ fontSize:15, fontWeight:700, color }}>{fmt(termContado)}</span>
              </div>
            </div>

            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Plataformas delivery</p>
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:12 }}>
              {[['rappi','Rappi'],['ubereats','Uber Eats'],['didi','DiDi Food'],['pedidosya','Pedidos Ya']].map(([k,l]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{l}</span>
                  <input type="number" min="0" step="0.01"
                    style={{ width:100, padding:'4px 8px', borderRadius:6, border:'1px solid #334155',
                      background:'#1e293b', color:'#f1f5f9', fontSize:12, textAlign:'right' }}
                    value={efectivoCaja?.[`del_${k}`]||''}
                    onChange={e => onEfectivoCaja({ ...efectivoCaja, [`del_${k}`]: +e.target.value })}/>
                </div>
              ))}
              <div style={{ borderTop:'1px solid #334155', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'#64748b' }}>Total delivery</span>
                <span style={{ fontSize:15, fontWeight:700, color }}>{fmt(delContado)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tira Z — diferencias */}
        {isZ && (
          <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
              Comparativa
            </p>
            {[
              { label:'Efectivo esperado',    valor: efEsperado,   contado: efContado,   dif: efContado - efEsperado },
              { label:'Terminal esperada',    valor: termEsperado, contado: termContado, dif: termContado - termEsperado },
            ].map(r => (
              <div key={r.label} style={{ marginBottom:12 }}>
                <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{r.label}</p>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>Sistema</span>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{fmt(r.valor)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>Cajero (Tira X)</span>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{fmt(r.contado)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #334155', paddingTop:4 }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>Diferencia</span>
                  <span style={{ fontSize:15, fontWeight:700, color: r.dif >= 0 ? '#10b981' : '#f87171' }}>
                    {r.dif >= 0 ? '+' : ''}{fmt(r.dif)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
              background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
            {isZ ? 'Cancelar' : 'Cerrar'}
          </button>
          <button onClick={onConfirm}
            style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
              background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            {isZ ? 'Confirmar corte Z' : 'Guardar Tira X'}
          </button>
        </div>
      </div>
    </div>
  );
}
