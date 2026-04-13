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

  // Tira X / Z — tiraXGuardada bloquea edición y habilita Z
  const [showTiraX,    setShowTiraX]    = useState(false);
  const [showTiraZ,    setShowTiraZ]    = useState(false);
  const [efectivoCaja, setEfectivoCaja] = useState<any>({});
  const [tiraXGuardada, setTiraXGuardada] = useState(false);
  const [tiraData,     setTiraData]     = useState<any>(null);

  // Depósito / Retiro de caja
  const [showMovCaja,  setShowMovCaja]  = useState<'deposito'|'retiro'|null>(null);
  const [movMonto,     setMovMonto]     = useState(0);
  const [movNota,      setMovNota]      = useState('');
  const [movMotivo,    setMovMotivo]    = useState('seguridad');
  const [savingMov,    setSavingMov]    = useState(false);

  // Control de crédito
  const [showCreditBlock, setShowCreditBlock] = useState(false);
  const [creditPin,       setCreditPin]       = useState('');
  const [creditPinError,  setCreditPinError]  = useState('');

  // Ventana de cobro en efectivo — horizontal
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
    enabled:  !!cid,
  });

  const { data: ocsPendientes = [] } = useQuery({
    queryKey: ['ocs-pendientes', cid, clienteId],
    queryFn:  () => api.get(`/companies/${cid}/ordenes?clientId=${clienteId}&status=ACTIVAS`).then(r => r.data),
    enabled:  !!cid && !!clienteId,
  });

  const agregar = (p: any) => {
    if (ocId) return; // Si hay OC activa, no agregar manualmente
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
    const nuevasLineas = (oc.lineas as any[]).map((l: any) => {
      const prodInventario = (inventory as any[]).find((p:any) => p.id === l.productId);
      const stockReal = Number(prodInventario?.stock || 0);
      const cantPendiente = Math.max(0, (l.cantidad || 1) - (l.cantidadSurtida || 0));
      const cantSurtir = Math.min(cantPendiente, stockReal);
      return {
        id:       l.productId,
        nombre:   l.product?.name || l.productId,
        precio:   Number(l.precioUnitario || l.unitPrice || 0),
        cantidad: cantSurtir,
        cantPendiente,
        stock:    stockReal,
        sinStock: stockReal === 0,
      };
    }).filter((l:any) => l.cantPendiente > 0);
    setCarrito(nuevasLineas);
    setOcId(oc.id);
    setEsCredito(true);
  };

  const cambiarCantidad = (id: string, valor: number) => {
    setCarrito(c => c.map(i => i.id===id ? {...i, cantidad:Math.max(0, Math.min(valor, i.stock))} : i).filter(i=>i.cantidad>0));
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
    const porMetodo:  Record<string,number> = {};
    const porCanal:   Record<string,number> = {};
    const porFamilia: Record<string,number> = {};
    let totalBruto = 0;
    let totalCredito = 0;

    for (const s of hoy) {
      const met = s.paymentMethod || 'efectivo';
      porMetodo[met] = (porMetodo[met]||0) + Number(s.total);
      porCanal[s.channel] = (porCanal[s.channel]||0) + Number(s.total);
      totalBruto += Number(s.total);
      if (met === 'credito') totalCredito += Number(s.total);
      for (const l of s.lines || []) {
        const familia = l.product?.name?.split(' ').slice(0,2).join(' ') || l.product?.sku?.split('-').slice(0,2).join(' ') || 'Otros';
        porFamilia[familia] = (porFamilia[familia]||0) + Number(l.total);
      }
    }

    // Cargar movimientos del día (depósitos/retiros)
    let movimientos: any[] = [];
    try {
      const { data: movs } = await api.get(`/companies/${cid}/flow/movements?fecha=${today}`);
      movimientos = movs || [];
    } catch(e) {}

    const efContado = DENOMINACIONES.reduce((t,d) => t + d*(efectivoCaja?.[`den_${d}`]||0), 0);
    setTiraData({ hoy, porMetodo, porCanal, porFamilia, movimientos, totalBruto, totalCredito, totalDesc:0, fecha: today, efectivoContado: efContado });
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
      setOcId(''); setClienteId(''); setEsCredito(false);
      setConCuanto(0); setShowCobro(false);
      setExito(true); setTimeout(() => setExito(false), 3000);
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error'),
  });

  const cobrar = async () => {
    if (esCredito && !clienteId) { setError('Selecciona un cliente'); return; }

    // Verificar límite de crédito
    if (esCredito && clienteId) {
      const cliente = (clientes as any[]).find((c:any) => c.id === clienteId);
      if (cliente?.creditLimit > 0) {
        try {
          const { data: summary } = await api.get(`/companies/${cid}/cxc/summary?clientId=${clienteId}`);
          const saldoPendiente = summary?.totalPending || 0;
          if (Number(saldoPendiente) + total > Number(cliente.creditLimit)) {
            setShowCreditBlock(true);
            setCreditPin('');
            setCreditPinError('');
            return;
          }
        } catch(e) {}
      }
    }

    setError('');
    if (!esCredito && metodo === 'efectivo') {
      setConCuanto(0);
      setShowCobro(true);
      return;
    }
    saleM.mutate();
  };

  const clienteActivo = (clientes as any[]).find((c:any) => c.id === clienteId);

  return (
    <AppLayout>
      <div style={{ display:'flex', flexDirection:'column', gap:8, height:'calc(100vh - 80px)' }}>

        {/* Barra superior — canales + cliente/OC + tiras */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap',
          background:'#1e293b', borderRadius:10, padding:'8px 12px', border:'1px solid #334155' }}>
          {/* Canales */}
          {CANALES.map(c => (
            <button key={c.id} onClick={() => setCanal(c.id)}
              style={{ padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, cursor:'pointer',
                border:`2px solid ${c.color}`,
                background: canal===c.id ? c.color+'22' : 'transparent',
                color: canal===c.id ? c.color : '#64748b' }}>
              {c.label}
            </button>
          ))}

          <div style={{ width:1, height:24, background:'#334155', margin:'0 4px' }}/>

          {/* Selector cliente */}
          <select value={clienteId} onChange={e => { setClienteId(e.target.value); setOcId(''); setCarrito([]); }}
            style={{ padding:'5px 10px', borderRadius:8, fontSize:11, background:'#0f172a',
              border:`1px solid ${clienteId?'#f59e0b':'#334155'}`, color: clienteId?'#f59e0b':'#94a3b8',
              minWidth:160, cursor:'pointer' }}>
            <option value="">👤 Cliente (crédito)</option>
            {(clientes as any[]).map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Selector OC */}
          {clienteId && (
            <select value={ocId} onChange={e => {
                if (e.target.value) {
                  const oc = (ocsPendientes as any[]).find((o:any) => o.id === e.target.value);
                  if (oc) cargarDesdeOC(oc);
                } else {
                  setOcId(''); setCarrito([]); setEsCredito(true);
                }
              }}
              style={{ padding:'5px 10px', borderRadius:8, fontSize:11, background:'#0f172a',
                border:`1px solid ${ocId?'#10b981':'#334155'}`, color: ocId?'#10b981':'#94a3b8',
                minWidth:180, cursor:'pointer' }}>
              <option value="">📋 OC (venta libre)</option>
              {(ocsPendientes as any[]).map((oc:any) => (
                <option key={oc.id} value={oc.id}>
                  {oc.numero} — ${Number(oc.saldo).toLocaleString()}
                </option>
              ))}
            </select>
          )}

          {clienteId && (
            <button onClick={() => { setClienteId(''); setOcId(''); setCarrito([]); setEsCredito(false); }}
              style={{ padding:'4px 8px', borderRadius:6, fontSize:11, border:'1px solid #334155',
                background:'none', color:'#f87171', cursor:'pointer' }}>
              ✕ Limpiar
            </button>
          )}

          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <button onClick={() => { setShowMovCaja('deposito'); setMovMonto(0); setMovNota(''); }}
              style={{ padding:'5px 12px', borderRadius:8, fontSize:11,
                border:'1px solid #10b981', background:'none', color:'#10b981', cursor:'pointer' }}>
              ↓ Depósito
            </button>
            <button onClick={() => { setShowMovCaja('retiro'); setMovMonto(0); setMovNota(''); setMovMotivo('seguridad'); }}
              style={{ padding:'5px 12px', borderRadius:8, fontSize:11,
                border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer' }}>
              ↑ Retiro
            </button>
            <button onClick={() => { cargarTira(); setShowTiraX(true); }}
              style={{ padding:'5px 12px', borderRadius:8, fontSize:11,
                border:`1px solid ${tiraXGuardada?'#10b981':'#334155'}`,
                background:'none', color: tiraXGuardada?'#10b981':'#94a3b8', cursor:'pointer' }}>
              {tiraXGuardada ? '✓ Tira X' : 'Tira X'}
            </button>
            <button onClick={() => { if (tiraXGuardada) { cargarTira(); setShowTiraZ(true); } }}
              disabled={!tiraXGuardada}
              style={{ padding:'5px 12px', borderRadius:8, fontSize:11,
                border:`1px solid ${tiraXGuardada?'#f59e0b':'#334155'}`,
                background:'none', color: tiraXGuardada?'#f59e0b':'#475569',
                cursor: tiraXGuardada?'pointer':'not-allowed', opacity: tiraXGuardada?1:0.5 }}>
              Tira Z
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div style={{ display:'flex', gap:12, flex:1, overflow:'hidden' }}>
          {/* Catálogo */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {ocId && (
              <div style={{ background:'#0f172a', borderRadius:8, padding:'8px 12px', marginBottom:10,
                border:'1px solid #10b981', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'#10b981' }}>📋 OC cargada — modifica cantidades en el carrito</span>
              </div>
            )}
            {/* Catálogo agrupado */}
            {(() => {
              const prods = (inventory as any[]).filter((p:any) => p.isActive !== false);
              
              // Detectar familia por SKU/nombre
              const getFamilia = (p: any) => {
                const sku = (p.sku || '').toUpperCase();
                if (sku.startsWith('MCH')) return 'Machete';
                if (sku.startsWith('CHI')) return 'Chicali';
                if (sku.startsWith('ESC')) return 'Escarchado';
                if (sku.startsWith('CER')) return 'Cerdo';
                if (sku.startsWith('MAC')) return 'Machaca';
                if (sku.startsWith('SCR')) return 'Scrap';
                return 'Otros';
              };

              const GRUPOS: Record<string, { label:string, familias:string[], color:string }> = {
                RES:   { label:'Res',   familias:['Machete','Chicali','Escarchado','Scrap'], color:'#B5451B' },
                CER:   { label:'Cerdo', familias:['Cerdo'],   color:'#8b5cf6' },
                OTROS: { label:'Otros', familias:['Machaca','Otros'], color:'#64748b' },
              };

              const ProductCard = ({ p }: { p: any }) => {
                const precio = Number((p as any)[priceKey] || 0);
                const sinPrecio = precio === 0;
                const enCarrito = carrito.find(i => i.id===p.id);
                const bloqueado = !!ocId;
                return (
                  <button onClick={() => agregar(p)}
                    disabled={p.stock<=0||sinPrecio||bloqueado}
                    style={{ padding:8, borderRadius:10,
                      border:`2px solid ${enCarrito?canalColor:sinPrecio||bloqueado?'#1e293b':'#334155'}`,
                      background: enCarrito?canalColor+'11':'#1e293b',
                      cursor: p.stock<=0||sinPrecio||bloqueado?'not-allowed':'pointer',
                      opacity: p.stock<=0?0.4:sinPrecio?0.5:bloqueado&&!enCarrito?0.3:1,
                      textAlign:'left', position:'relative' }}>
                    {enCarrito && (
                      <div style={{ position:'absolute', top:-7, right:-7, width:18, height:18,
                        borderRadius:'50%', background:canalColor, color:'#fff', fontSize:9,
                        fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {enCarrito.cantidad}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:3, marginBottom:4 }}>
                      <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:canalColor+'22', color:canalColor }}>
                        {TIPO_LABELS[p.meatType]||p.meatType}
                      </span>
                      <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#334155', color:'#94a3b8' }}>
                        {SABOR_LABELS[p.flavor]||p.flavor}
                      </span>
                    </div>
                    <p style={{ fontSize:11, fontWeight:600, margin:'0 0 3px', color:'#f1f5f9', lineHeight:1.2 }}>{p.name}</p>
                    <p style={{ fontSize:14, fontWeight:700, color:sinPrecio?'#64748b':canalColor, margin:'0 0 2px' }}>
                      {sinPrecio?'Sin precio':fmt(precio)}
                    </p>
                    <p style={{ fontSize:10, color:p.stock<=3&&p.stock>0?'#f59e0b':p.stock<=0?'#f87171':'#64748b', margin:0 }}>
                      {p.stock<=0?'Sin stock':`${p.stock} pzas`}
                    </p>
                  </button>
                );
              };

              return Object.entries(GRUPOS).map(([grupoKey, grupo]) => {
                const familias = grupo.familias.filter(fam =>
                  prods.some(p => getFamilia(p) === fam)
                );
                if (familias.length === 0) return null;

                return (
                  <div key={grupoKey} style={{ marginBottom:20 }}>
                    {/* Encabezado de grupo */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                      <div style={{ width:4, height:20, borderRadius:2, background:grupo.color }}/>
                      <p style={{ fontSize:13, fontWeight:700, color:grupo.color, margin:0, textTransform:'uppercase', letterSpacing:1 }}>
                        {grupo.label}
                      </p>
                      <div style={{ flex:1, height:1, background:'#1e293b' }}/>
                    </div>

                    {/* Familias dentro del grupo */}
                    {familias.map(fam => {
                      const famProds = prods.filter(p => getFamilia(p) === fam);
                      if (famProds.length === 0) return null;

                      // Agrupar por sabor y ordenar por gramaje
                      const sabores = ['NAT','CHI','BBQ','MIX'];
                      const porSabor = sabores.map(sabor => ({
                        sabor,
                        label: SABOR_LABELS[sabor] || sabor,
                        prods: famProds
                          .filter(p => p.flavor === sabor)
                          .sort((a:any, b:any) => Number(a.gramsWeight||0) - Number(b.gramsWeight||0)),
                      })).filter(s => s.prods.length > 0);

                      // Si no tiene sabores definidos, mostrar todos en una fila
                      const sinSabor = famProds.filter(p => !sabores.includes(p.flavor))
                        .sort((a:any, b:any) => Number(a.gramsWeight||0) - Number(b.gramsWeight||0));

                      return (
                        <div key={fam} style={{ marginBottom:14 }}>
                          <p style={{ fontSize:11, color:'#94a3b8', fontWeight:600, margin:'0 0 8px',
                            textTransform:'uppercase', letterSpacing:0.5 }}>
                            {fam}
                          </p>

                          {/* Una fila por sabor */}
                          {porSabor.map(({ sabor, label, prods: saborProds }) => (
                            <div key={sabor} style={{ marginBottom:8 }}>
                              <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px', fontStyle:'italic' }}>
                                {label}
                              </p>
                              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                {saborProds.map(p => <ProductCard key={p.id} p={p}/>)}
                              </div>
                            </div>
                          ))}

                          {/* Productos sin sabor definido */}
                          {sinSabor.length > 0 && (
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                              {sinSabor.map(p => <ProductCard key={p.id} p={p}/>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>

          {/* Carrito */}
          <div style={{ width:280, display:'flex', flexDirection:'column', background:'#1e293b',
            borderRadius:12, border:'1px solid #334155', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #334155' }}>
              <p style={{ fontSize:13, fontWeight:600, margin:0 }}>
                {clienteActivo ? `${clienteActivo.name}` : `Orden — ${canalConfig.label}`}
              </p>
              {clienteActivo && (
                <p style={{ fontSize:10, color:'#f59e0b', margin:'2px 0 0' }}>
                  {ocId ? `OC: ${(ocsPendientes as any[]).find((o:any)=>o.id===ocId)?.numero}` : 'Venta libre a crédito'}
                </p>
              )}
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:10 }}>
              {carrito.length===0
                ? <p style={{ color:'#64748b', fontSize:12, textAlign:'center', paddingTop:24 }}>
                    {ocId ? 'Cargando OC...' : 'Selecciona productos'}
                  </p>
                : carrito.map(item => (
                  <div key={item.id} style={{ background:'#0f172a', borderRadius:8, padding:8, marginBottom:6 }}>
                    <p style={{ fontSize:11, fontWeight:500, margin:'0 0 6px', color:'#f1f5f9' }}>{item.nombre}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <button onClick={() => cambiar(item.id,-1)}
                        style={{ width:24,height:24,borderRadius:5,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:13 }}>−</button>
                      <input type="number" min="1" value={item.cantidad}
                        onChange={e => cambiarCantidad(item.id, +e.target.value)}
                        style={{ width:40, textAlign:'center', padding:'2px 4px', borderRadius:5,
                          border:'1px solid #334155', background:'#1e293b', color:'#f1f5f9', fontSize:12, fontWeight:700 }}/>
                      <button onClick={() => cambiar(item.id,+1)}
                        style={{ width:24,height:24,borderRadius:5,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:13 }}>+</button>
                      <span style={{ flex:1, textAlign:'right', fontWeight:600, fontSize:12, color:canalColor }}>{fmt(item.precio*item.cantidad)}</span>
                      <button onClick={() => setCarrito(c=>c.filter(i=>i.id!==item.id))}
                        style={{ background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:13 }}>✕</button>
                    </div>
                  </div>
                ))}
            </div>

            {carrito.length > 0 && (
              <div style={{ padding:10, borderTop:'1px solid #334155' }}>
                {/* Totales */}
                <div style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ fontSize:11, color:'#64748b' }}>Subtotal</span>
                    <span style={{ fontSize:12, color:'#94a3b8' }}>{fmt(subtotal)}</span>
                  </div>
                  {descAuth && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:11, color:'#10b981' }}>{tipoDesc==='cortesia'?'Cortesía':'Desc.'} ({descAuth.authorizedBy})</span>
                      <span style={{ fontSize:12, color:'#10b981' }}>-{fmt(descMonto)}</span>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:'#64748b' }}>Total</span>
                    <span style={{ fontSize:20, fontWeight:700, color:canalColor }}>{fmt(total)}</span>
                  </div>
                </div>

                {/* Descuento */}
                {!descAuth && (
                  <button onClick={() => setShowDescuento(true)}
                    style={{ width:'100%', marginBottom:8, padding:'5px', borderRadius:7, fontSize:11,
                      border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}>
                    + Descuento / Cortesía
                  </button>
                )}

                {showDescuento && (
                  <div style={{ background:'#0f172a', borderRadius:8, padding:10, marginBottom:8 }}>
                    <p style={{ fontSize:11, fontWeight:600, margin:'0 0 8px', color:'#f1f5f9' }}>Autorización gerente</p>
                    <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                      <button onClick={() => setTipoDesc('descuento')}
                        style={{ flex:1, padding:'3px', borderRadius:5, fontSize:10, cursor:'pointer',
                          border:`1px solid ${tipoDesc==='descuento'?canalColor:'#334155'}`,
                          background: tipoDesc==='descuento'?canalColor+'22':'transparent',
                          color: tipoDesc==='descuento'?canalColor:'#64748b' }}>
                        Descuento $
                      </button>
                      <button onClick={() => setTipoDesc('cortesia')}
                        style={{ flex:1, padding:'3px', borderRadius:5, fontSize:10, cursor:'pointer',
                          border:`1px solid ${tipoDesc==='cortesia'?'#10b981':'#334155'}`,
                          background: tipoDesc==='cortesia'?'#10b98122':'transparent',
                          color: tipoDesc==='cortesia'?'#10b981':'#64748b' }}>
                        Cortesía
                      </button>
                    </div>
                    {tipoDesc==='descuento' && (
                      <input type="number" min="0" placeholder="Monto"
                        className="input-base" style={{ fontSize:11, marginBottom:6 }}
                        value={descValor||''} onChange={e=>setDescValor(+e.target.value)}/>
                    )}
                    <input type="password" maxLength={4} placeholder="PIN gerente"
                      className="input-base" style={{ fontSize:11, marginBottom:4, letterSpacing:4, textAlign:'center' }}
                      value={descPin} onChange={e=>setDescPin(e.target.value)}/>
                    {pinError && <p style={{ color:'#f87171', fontSize:10, margin:'0 0 4px' }}>{pinError}</p>}
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => { setShowDescuento(false); setDescPin(''); setPinError(''); }}
                        style={{ flex:1, padding:'5px', borderRadius:5, fontSize:11, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}>
                        Cancelar
                      </button>
                      <button onClick={verificarPin} disabled={descPin.length!==4}
                        style={{ flex:1, padding:'5px', borderRadius:5, fontSize:11, border:'none', background:canalColor, color:'#fff', cursor:'pointer' }}>
                        Autorizar
                      </button>
                    </div>
                  </div>
                )}

                {/* Método de pago — solo si no es crédito */}
                {!esCredito && !clienteId && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
                      {['efectivo','tarjeta','transferencia'].map(m => (
                        <button key={m} onClick={() => setMetodo(m)}
                          style={{ padding:'5px 2px', borderRadius:7, fontSize:10, fontWeight:600, cursor:'pointer',
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

                {/* Botón crédito manual — solo si no hay cliente seleccionado arriba */}
                {!clienteId && !esCredito && (
                  <button onClick={() => setEsCredito(true)}
                    style={{ width:'100%', marginBottom:8, padding:'5px', borderRadius:7, fontSize:11,
                      border:'2px solid #334155', background:'transparent', color:'#64748b', cursor:'pointer' }}>
                    💳 Marcar como crédito
                  </button>
                )}

                {esCredito && !clienteId && (
                  <div style={{ background:'#0f172a', borderRadius:7, padding:8, marginBottom:8 }}>
                    <p style={{ fontSize:10, color:'#f59e0b', margin:'0 0 6px' }}>Selecciona cliente arriba ↑</p>
                    <button onClick={() => setEsCredito(false)}
                      style={{ fontSize:10, background:'none', border:'none', color:'#64748b', cursor:'pointer' }}>
                      Cancelar crédito
                    </button>
                  </div>
                )}

                {error && <p style={{ color:'#f87171', fontSize:11, marginBottom:6 }}>{error}</p>}

                <button onClick={cobrar}
                  disabled={saleM.isPending || (esCredito && !clienteId) || carrito.length === 0}
                  style={{ width:'100%', padding:'11px', borderRadius:10, border:'none',
                    background: carrito.length===0||(esCredito&&!clienteId) ? '#334155' : esCredito||clienteId?'#f59e0b':canalColor,
                    color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  {saleM.isPending ? 'Procesando…'
                    : (esCredito||clienteId) ? `Registrar crédito — ${fmt(total)}`
                    : `Cobrar ${fmt(total)}`}
                </button>
              </div>
            )}

            {exito && (
              <div style={{ padding:12, textAlign:'center', background:'rgba(16,185,129,0.1)', borderTop:'1px solid rgba(16,185,129,0.3)' }}>
                <p style={{ fontSize:20, margin:'0 0 2px' }}>✓</p>
                <p style={{ color:'#10b981', fontWeight:700, margin:0, fontSize:13 }}>¡Venta registrada!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal cobro en efectivo — HORIZONTAL */}
      {showCobro && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:600, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 16px', color }}>Cobro en efectivo</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
              <div>
                <div style={{ background:'#0f172a', borderRadius:8, padding:16, marginBottom:16 }}>
                  <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>Total a cobrar</p>
                  <p style={{ fontSize:28, fontWeight:700, color, margin:0 }}>{fmt(total)}</p>
                </div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:6 }}>Con cuánto paga</label>
                <input type="number" min={total} step="10" autoFocus
                  className="input-base" style={{ fontSize:22, fontWeight:700, textAlign:'right', marginBottom:8 }}
                  value={conCuanto||''} onChange={e => setConCuanto(+e.target.value)}/>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[50,100,200,500].map(b => (
                    <button key={b} onClick={() => setConCuanto(c => c + b)}
                      style={{ padding:'4px 12px', borderRadius:6, fontSize:12, border:`1px solid ${color}`,
                        background:color+'22', color, cursor:'pointer' }}>
                      +${b}
                    </button>
                  ))}
                  <button onClick={() => setConCuanto(total)}
                    style={{ padding:'4px 12px', borderRadius:6, fontSize:12, border:'1px solid #334155',
                      background:'none', color:'#64748b', cursor:'pointer' }}>
                    Exacto
                  </button>
                </div>
              </div>
              <div>
                <div style={{ background:'#0f172a', borderRadius:8, padding:16, marginBottom:16, minHeight:80,
                  display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                  <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px' }}>Cambio</p>
                  <p style={{ fontSize:36, fontWeight:700,
                    color: conCuanto >= total ? '#10b981' : '#64748b', margin:0 }}>
                    {conCuanto >= total ? fmt(cambio) : '—'}
                  </p>
                </div>
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
          </div>
        </div>
      )}

      {/* Modal Tira X — HORIZONTAL */}
      {showTiraX && tiraData && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:720,
            maxHeight:'85vh', overflowY:'auto', border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontSize:16, fontWeight:700, margin:0, color }}>
                Tira X — Precorte {tiraXGuardada ? '✓ Guardada' : ''}
              </h3>
              <button onClick={() => setShowTiraX(false)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
              {/* Denominaciones */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
                  Efectivo
                </p>
                <div style={{ background:'#0f172a', borderRadius:8, padding:10 }}>
                  {DENOMINACIONES.map(d => (
                    <div key={d} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                      <span style={{ fontSize:11, color:'#94a3b8', width:42, textAlign:'right' }}>${d}</span>
                      <span style={{ fontSize:10, color:'#64748b' }}>×</span>
                      <input type="number" min="0" disabled={tiraXGuardada}
                        style={{ width:48, padding:'3px 6px', borderRadius:5,
                          border:'1px solid #334155', background: tiraXGuardada?'#0f172a':'#1e293b',
                          color:'#f1f5f9', fontSize:11, textAlign:'center' }}
                        value={efectivoCaja?.[`den_${d}`]||''}
                        onChange={e => setEfectivoCaja((prev:any) => ({ ...prev, [`den_${d}`]: +e.target.value }))}/>
                      <span style={{ fontSize:11, color, fontWeight:600, marginLeft:'auto' }}>
                        {fmt(d * (efectivoCaja?.[`den_${d}`] || 0))}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop:'1px solid #334155', marginTop:6, paddingTop:6, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Total</span>
                    <span style={{ fontSize:14, fontWeight:700, color }}>
                      {fmt(DENOMINACIONES.reduce((t,d) => t + d*(efectivoCaja?.[`den_${d}`]||0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terminal */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
                  Terminal bancaria
                </p>
                <div style={{ background:'#0f172a', borderRadius:8, padding:10 }}>
                  {[['debito','Débito'],['credito','Crédito'],['transferencia','Transferencia']].map(([k,l]) => (
                    <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{l}</span>
                      <input type="number" min="0" step="0.01" disabled={tiraXGuardada}
                        style={{ width:90, padding:'3px 6px', borderRadius:5, border:'1px solid #334155',
                          background: tiraXGuardada?'#0f172a':'#1e293b', color:'#f1f5f9', fontSize:11, textAlign:'right' }}
                        value={efectivoCaja?.[`term_${k}`]||''}
                        onChange={e => setEfectivoCaja((prev:any) => ({ ...prev, [`term_${k}`]: +e.target.value }))}/>
                    </div>
                  ))}
                  <div style={{ borderTop:'1px solid #334155', marginTop:6, paddingTop:6, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Total</span>
                    <span style={{ fontSize:14, fontWeight:700, color }}>
                      {fmt(['debito','credito','transferencia'].reduce((t,k) => t + (efectivoCaja?.[`term_${k}`]||0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>
                  Delivery
                </p>
                <div style={{ background:'#0f172a', borderRadius:8, padding:10 }}>
                  {[['rappi','Rappi'],['ubereats','Uber Eats'],['didi','DiDi Food'],['pedidosya','Pedidos Ya']].map(([k,l]) => (
                    <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{l}</span>
                      <input type="number" min="0" step="0.01" disabled={tiraXGuardada}
                        style={{ width:90, padding:'3px 6px', borderRadius:5, border:'1px solid #334155',
                          background: tiraXGuardada?'#0f172a':'#1e293b', color:'#f1f5f9', fontSize:11, textAlign:'right' }}
                        value={efectivoCaja?.[`del_${k}`]||''}
                        onChange={e => setEfectivoCaja((prev:any) => ({ ...prev, [`del_${k}`]: +e.target.value }))}/>
                    </div>
                  ))}
                  <div style={{ borderTop:'1px solid #334155', marginTop:6, paddingTop:6, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Total</span>
                    <span style={{ fontSize:14, fontWeight:700, color }}>
                      {fmt(['rappi','ubereats','didi','pedidosya'].reduce((t,k) => t + (efectivoCaja?.[`del_${k}`]||0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => setShowTiraX(false)}
                style={{ padding:'8px 20px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cerrar
              </button>
              {!tiraXGuardada && (
                <button onClick={() => { setTiraXGuardada(true); setShowTiraX(false); }}
                  style={{ padding:'8px 24px', borderRadius:8, border:'none',
                    background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                  Guardar Tira X
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tira Z — REDISEÑADO */}
      {showTiraZ && tiraData && tiraXGuardada && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:20, width:'90vw', maxWidth:820,
            border:'1px solid #334155' }}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14,
              borderBottom:'1px solid #334155', paddingBottom:10 }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 2px', color:'#f59e0b' }}>
                  Tira Z — Corte de caja
                </h3>
                <p style={{ fontSize:11, color:'#64748b', margin:0 }}>
                  {tiraData.fecha} · {tiraData.hoy?.length || 0} ventas
                </p>
              </div>
              <button onClick={() => setShowTiraZ(false)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            {/* Fila 1: Ventas por familia | Formas de pago */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>

              {/* Ventas por familia */}
              <div style={{ background:'#0f172a', borderRadius:8, padding:10 }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:1, margin:'0 0 8px' }}>Ventas por familia</p>
                {Object.entries(tiraData.porFamilia || {}).map(([fam, monto]: any) => (
                  <div key={fam} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'#94a3b8' }}>{fam}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:'#f1f5f9' }}>{fmt(monto)}</span>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid #334155', marginTop:6, paddingTop:6,
                  display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>Total</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{fmt(tiraData.totalBruto)}</span>
                </div>
              </div>

              {/* Formas de pago */}
              <div style={{ background:'#0f172a', borderRadius:8, padding:10 }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:1, margin:'0 0 8px' }}>Formas de pago</p>
                {[
                  { key:'efectivo',      label:'Efectivo',         col:'#10b981' },
                  { key:'tarjeta',       label:'Terminal débito',   col:'#3b82f6' },
                  { key:'credito',       label:'Terminal crédito',  col:'#8b5cf6' },
                  { key:'transferencia', label:'Transferencia',     col:'#06b6d4' },
                  { key:'credito_cliente', label:'Crédito cliente', col:'#f59e0b' },
                  { key:'rappi',         label:'Rappi',             col:'#f97316' },
                  { key:'ubereats',      label:'Uber Eats',         col:'#84cc16' },
                  { key:'didi',          label:'DiDi Food',         col:'#facc15' },
                  { key:'pedidosya',     label:'Pedidos Ya',        col:'#f43f5e' },
                ].filter(fp => (tiraData.porMetodo[fp.key]||0) > 0).map(fp => (
                  <div key={fp.key} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:11, color:fp.col }}>{fp.label}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:'#f1f5f9' }}>{fmt(tiraData.porMetodo[fp.key]||0)}</span>
                  </div>
                ))}
                {Object.keys(tiraData.porMetodo).length === 0 && (
                  <p style={{ fontSize:11, color:'#475569' }}>Sin ventas registradas</p>
                )}
              </div>
            </div>

            {/* Fila 2: Movimientos de caja */}
            {(tiraData.movimientos || []).length > 0 && (
              <div style={{ background:'#0f172a', borderRadius:8, padding:10, marginBottom:10 }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:1, margin:'0 0 8px' }}>Movimientos de caja</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {(() => {
                    const deps = (tiraData.movimientos||[]).filter((m:any) => m.type==='ENTRADA').reduce((t:number,m:any) => t+Number(m.amount),0);
                    const rets = (tiraData.movimientos||[]).filter((m:any) => m.type==='SALIDA').reduce((t:number,m:any) => t+Number(m.amount),0);
                    return [
                      { label:'Depósitos', value:deps, col:'#10b981' },
                      { label:'Retiros',   value:rets, col:'#f87171' },
                      { label:'Neto',      value:deps-rets, col: deps-rets>=0?'#10b981':'#f87171' },
                    ].map(r => (
                      <div key={r.label} style={{ textAlign:'center' }}>
                        <p style={{ fontSize:10, color:'#64748b', margin:'0 0 2px' }}>{r.label}</p>
                        <p style={{ fontSize:14, fontWeight:700, color:r.col, margin:0 }}>{fmt(r.value)}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Fila 3: Declarado por cajero vs sistema */}
            <div style={{ background:'#0f172a', borderRadius:8, padding:10, marginBottom:14 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                letterSpacing:1, margin:'0 0 8px' }}>Cajero declaró vs sistema</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  {
                    label:    'Efectivo',
                    declarado: DENOMINACIONES.reduce((t,d) => t + d*(efectivoCaja?.[`den_${d}`]||0), 0),
                    esperado:  tiraData.porMetodo['efectivo']||0,
                  },
                  {
                    label:    'Terminal',
                    declarado: ['debito','credito','transferencia'].reduce((t,k) => t+(efectivoCaja?.[`term_${k}`]||0), 0),
                    esperado:  (tiraData.porMetodo['tarjeta']||0)+(tiraData.porMetodo['transferencia']||0),
                  },
                  {
                    label:    'Delivery',
                    declarado: ['rappi','ubereats','didi','pedidosya'].reduce((t,k) => t+(efectivoCaja?.[`del_${k}`]||0), 0),
                    esperado:  ['rappi','ubereats','didi','pedidosya'].reduce((t,k) => t+(tiraData.porMetodo[k]||0), 0),
                  },
                ].map(r => {
                  const dif = r.declarado - r.esperado;
                  return (
                    <div key={r.label} style={{ background:'#1e293b', borderRadius:6, padding:8 }}>
                      <p style={{ fontSize:10, fontWeight:700, color:'#64748b', margin:'0 0 6px',
                        textTransform:'uppercase', letterSpacing:0.5 }}>{r.label}</p>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <span style={{ fontSize:10, color:'#64748b' }}>Declarado</span>
                        <span style={{ fontSize:12, color:'#f1f5f9', fontWeight:600 }}>{fmt(r.declarado)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, color:'#64748b' }}>Esperado</span>
                        <span style={{ fontSize:12, color:'#94a3b8' }}>{fmt(r.esperado)}</span>
                      </div>
                      <div style={{ borderTop:'1px solid #334155', paddingTop:4,
                        display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:10, color:'#64748b' }}>Diferencia</span>
                        <span style={{ fontSize:13, fontWeight:700, color: dif===0?'#10b981':dif>0?'#3b82f6':'#f87171' }}>
                          {dif>0?'+':''}{fmt(dif)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botones */}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowTiraZ(false)}
                style={{ padding:'8px 20px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={async () => {
                try {
                  await api.post(`/companies/${cid}/corte-caja`, {
                    fecha:                  tiraData.fecha,
                    totalVentas:            tiraData.totalBruto,
                    totalEfectivo:          tiraData.porMetodo['efectivo']||0,
                    totalTarjeta:           tiraData.porMetodo['tarjeta']||0,
                    totalTransfer:          tiraData.porMetodo['transferencia']||0,
                    totalCredito:           tiraData.porMetodo['credito']||0,
                    totalDelivery:          ['rappi','ubereats','didi','pedidosya'].reduce((t:number,k:string) => t+(efectivoCaja?.[`del_${k}`]||0),0),
                    totalTerminal:          ['debito','credito','transferencia'].reduce((t:number,k:string) => t+(efectivoCaja?.[`term_${k}`]||0),0),
                    efectivoContado:        DENOMINACIONES.reduce((t,d) => t+d*(efectivoCaja?.[`den_${d}`]||0),0),
                    desgloseDenominaciones: efectivoCaja,
                    desgloseTerminales:     efectivoCaja,
                    desgloseDelivery:       efectivoCaja,
                  });
                  setShowTiraZ(false);
                  setTiraXGuardada(false);
                  setEfectivoCaja({});
                  alert('✓ Corte enviado al contador para validación');
                } catch(e:any) {
                  alert(e.response?.data?.message || 'Error al crear corte');
                }
              }}
                style={{ padding:'8px 24px', borderRadius:8, border:'none',
                  background:'#f59e0b', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Confirmar Tira Z
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal bloqueo de crédito */}
      {showCreditBlock && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:380, border:'1px solid #f87171' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 8px', color:'#f87171' }}>
              ⚠ Límite de crédito excedido
            </h3>
            <p style={{ fontSize:13, color:'#94a3b8', margin:'0 0 16px' }}>
              Este cliente ha alcanzado su límite de crédito. Se requiere autorización de un gerente o administrador.
            </p>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>PIN de autorización</label>
              <input type="password" className="input-base" style={{ fontSize:16, letterSpacing:4, textAlign:'center' }}
                value={creditPin} onChange={e => { setCreditPin(e.target.value); setCreditPinError(''); }}
                placeholder="● ● ● ●"/>
              {creditPinError && <p style={{ fontSize:12, color:'#f87171', margin:'4px 0 0' }}>{creditPinError}</p>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1, fontSize:13 }}
                onClick={() => { setShowCreditBlock(false); setCreditPin(''); }}>
                Cancelar
              </button>
              <button onClick={async () => {
                try {
                  await api.post('/auth/verify-pin', { companyId: cid, pin: creditPin });
                  setShowCreditBlock(false);
                  setCreditPin('');
                  setError('');
                  if (!esCredito && metodo === 'efectivo') {
                    setConCuanto(0); setShowCobro(true);
                  } else {
                    saleM.mutate();
                  }
                } catch {
                  setCreditPinError('PIN incorrecto');
                }
              }}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background:'#f59e0b', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Autorizar venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Depósito / Retiro de caja */}
      {showMovCaja && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:380, border:'1px solid #334155' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0,
                color: showMovCaja==='deposito' ? '#10b981' : '#f87171' }}>
                {showMovCaja==='deposito' ? '↓ Depósito en caja' : '↑ Retiro de caja'}
              </h3>
              <button onClick={() => setShowMovCaja(null)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            {showMovCaja === 'retiro' && (
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Motivo</label>
                <div style={{ display:'flex', gap:6 }}>
                  {[
                    { id:'seguridad',      label:'Seguridad' },
                    { id:'compra_express', label:'Compra express' },
                    { id:'otro',           label:'Otro' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setMovMotivo(m.id)}
                      style={{ flex:1, padding:'6px', borderRadius:6, fontSize:11, cursor:'pointer',
                        border:`1px solid ${movMotivo===m.id ? '#f87171' : '#334155'}`,
                        background: movMotivo===m.id ? '#f8717122' : 'transparent',
                        color: movMotivo===m.id ? '#f87171' : '#64748b' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Monto *</label>
              <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:16, fontWeight:700 }}
                value={movMonto||''} onChange={e => setMovMonto(+e.target.value)} placeholder="0.00"/>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                Notas {showMovCaja==='deposito' ? '(quién deposita)' : '(detalle)'}
              </label>
              <input className="input-base" style={{ fontSize:13 }} value={movNota}
                onChange={e => setMovNota(e.target.value)}
                placeholder={showMovCaja==='deposito' ? 'Fondo de cambio, reposición...' : 'Destino del retiro...'}/>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1, fontSize:13 }}
                onClick={() => setShowMovCaja(null)}>Cancelar</button>
              <button onClick={async () => {
                if (!movMonto || movMonto <= 0) { alert('Ingresa un monto válido'); return; }
                setSavingMov(true);
                try {
                  await api.post(`/companies/${cid}/flow/movements`, {
                    type:       showMovCaja === 'deposito' ? 'ENTRADA' : 'SALIDA',
                    originType: showMovCaja === 'deposito' ? 'DEPOSITO_CAJA' : movMotivo === 'compra_express' ? 'COMPRA_EXPRESS' : 'RETIRO_CAJA',
                    amount:     movMonto,
                    date:       new Date().toISOString().slice(0,10),
                    notes:      movNota || null,
                  });
                  setShowMovCaja(null);
                  setMovMonto(0);
                  setMovNota('');
                  alert(`✓ ${showMovCaja === 'deposito' ? 'Depósito' : 'Retiro'} registrado`);
                } catch(e:any) {
                  alert(e.response?.data?.message || 'Error al registrar');
                } finally { setSavingMov(false); }
              }}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background: showMovCaja==='deposito' ? '#10b981' : '#f87171',
                  color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}
                disabled={savingMov || !movMonto}>
                {savingMov ? 'Registrando…' : showMovCaja==='deposito' ? 'Registrar depósito' : 'Registrar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
