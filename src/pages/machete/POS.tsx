import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

const CANALES = [
  { id:'MOSTRADOR',  label:'Tienda',       color:'#3b82f6', priceKey:'priceMostrador' },
  { id:'MAYOREO',    label:'Mayoreo',       color:'#f59e0b', priceKey:'priceMayoreo'   },
  { id:'ONLINE',     label:'Distribuidor',  color:'#8b5cf6', priceKey:'priceOnline'    },
  { id:'ML',         label:'Online',        color:'#10b981', priceKey:'priceML'        },
];

export default function POSPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';
  const [canal,        setCanal]        = useState('MOSTRADOR');
  const [carrito,      setCarrito]      = useState<any[]>([]);
  const [metodo,       setMetodo]       = useState('efectivo');
  const [esCredito,    setEsCredito]    = useState(false);
  const [clienteId,    setClienteId]    = useState('');
  const [exito,        setExito]        = useState(false);
  const [error,        setError]        = useState('');

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

  const agregar = (p: any) => {
    const precio = Number((p as any)[priceKey] || 0);
    if (precio === 0) { setError('Este producto no tiene precio para este canal'); return; }
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

  const cambiar = (id: string, delta: number) =>
    setCarrito(c => c.map(i => i.id===id?{...i,cantidad:Math.max(0,Math.min(i.cantidad+delta,i.stock))}:i).filter(i=>i.cantidad>0));

  const total = carrito.reduce((t,i) => t+i.precio*i.cantidad, 0);

  const saleM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/machete/sales`, {
      date: new Date().toISOString().slice(0,10),
      channel: canal,
      paymentMethod: esCredito ? 'credito' : metodo,
      clientId: esCredito ? clienteId : null,
      isCredit: esCredito,
      lines: carrito.map(i => ({ productId:i.id, quantity:i.cantidad, unitPrice:i.precio })),
    }),
    onSuccess: () => {
      setCarrito([]); setExito(true);
      setTimeout(() => setExito(false), 3000);
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al procesar venta'),
  });

  const cobrar = () => {
    if (esCredito && !clienteId) { setError('Selecciona un cliente para crédito'); return; }
    setError('');
    saleM.mutate();
  };

  const TIPO_LABELS: Record<string,string>  = { RES:'Res', CER:'Cerdo' };
  const SABOR_LABELS: Record<string,string> = { NAT:'Natural', CHI:'Chile', BBQ:'BBQ' };

  return (
    <AppLayout>
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 120px)' }}>
        {/* Catálogo */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>
          {/* Selector de canal */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {CANALES.map(c => (
              <button key={c.id} onClick={() => setCanal(c.id)}
                style={{
                  padding:'6px 16px', borderRadius:99, fontSize:12, fontWeight:700, cursor:'pointer',
                  border:`2px solid ${c.color}`,
                  background: canal===c.id ? c.color+'22' : 'transparent',
                  color: canal===c.id ? c.color : '#64748b',
                }}>{c.label}</button>
            ))}
          </div>

          {/* Grid de productos */}
          <div style={{ flex:1, overflowY:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {(inventory as any[]).filter((p:any) => p.isActive !== false).map((p:any) => {
                const precio = Number((p as any)[priceKey] || 0);
                const sinPrecio = precio === 0;
                const enCarrito = carrito.find(i => i.id===p.id);
                return (
                  <button key={p.id} onClick={() => agregar(p)}
                    disabled={p.stock<=0 || sinPrecio}
                    style={{
                      padding:12, borderRadius:12,
                      border:`2px solid ${enCarrito?canalColor:sinPrecio?'#1e293b':'#334155'}`,
                      background: enCarrito ? canalColor+'11' : '#1e293b',
                      cursor: p.stock<=0||sinPrecio ? 'not-allowed' : 'pointer',
                      opacity: p.stock<=0 ? 0.4 : sinPrecio ? 0.5 : 1,
                      textAlign:'left', position:'relative',
                    }}>
                    {enCarrito && (
                      <div style={{ position:'absolute', top:-8, right:-8, width:22, height:22,
                        borderRadius:'50%', background:canalColor, color:'#fff', fontSize:11,
                        fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {enCarrito.cantidad}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:canalColor+'22', color:canalColor }}>
                        {TIPO_LABELS[p.meatType]||p.meatType}
                      </span>
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'#334155', color:'#94a3b8' }}>
                        {SABOR_LABELS[p.flavor]||p.flavor}
                      </span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, margin:'0 0 4px', color:'#f1f5f9' }}>{p.name}</p>
                    <p style={{ fontSize:17, fontWeight:700, color:sinPrecio?'#64748b':precio>0?canalColor:'#64748b', margin:'0 0 2px' }}>
                      {sinPrecio ? 'Sin precio' : fmt(precio)}
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
          <div style={{ padding:16, borderBottom:'1px solid #334155' }}>
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
              {/* Total */}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Total</span>
                <span style={{ fontSize:22, fontWeight:700, color:canalColor }}>{fmt(total)}</span>
              </div>

              {/* Método de pago */}
              <div style={{ marginBottom:10 }}>
                <p style={{ fontSize:11, color:'#64748b', margin:'0 0 6px' }}>Método de pago</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {['efectivo','tarjeta','transferencia'].map(m => (
                    <button key={m} onClick={() => { setMetodo(m); setEsCredito(false); }}
                      style={{ padding:'6px 4px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer',
                        border:`2px solid ${!esCredito&&metodo===m?canalColor:'#334155'}`,
                        background: !esCredito&&metodo===m ? canalColor+'22' : 'transparent',
                        color: !esCredito&&metodo===m ? canalColor : '#64748b',
                        textTransform:'capitalize' }}>
                      {m}
                    </button>
                  ))}
                </div>
                <button onClick={() => setEsCredito(!esCredito)}
                  style={{ width:'100%', marginTop:6, padding:'6px', borderRadius:8, fontSize:11,
                    fontWeight:600, cursor:'pointer',
                    border:`2px solid ${esCredito?'#f59e0b':'#334155'}`,
                    background: esCredito ? '#f59e0b22' : 'transparent',
                    color: esCredito ? '#f59e0b' : '#64748b' }}>
                  💳 Crédito
                </button>
              </div>

              {/* Selector de cliente para crédito */}
              {esCredito && (
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Cliente</label>
                  <select
                    value={clienteId}
                    onChange={e => setClienteId(e.target.value)}
                    style={{ width:'100%', padding:'6px 8px', borderRadius:8, fontSize:12,
                      background:'#0f172a', border:'1px solid #334155', color:'#f1f5f9' }}>
                    <option value="">— Seleccionar cliente —</option>
                    {(clientes as any[]).map((c:any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p style={{ color:'#f87171', fontSize:12, marginBottom:8 }}>{error}</p>}

              <button
                onClick={cobrar}
                disabled={saleM.isPending}
                style={{ width:'100%', padding:'12px', borderRadius:12, border:'none',
                  background: esCredito ? '#f59e0b' : canalColor,
                  color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                {saleM.isPending ? 'Procesando…' : esCredito ? `Registrar crédito — ${fmt(total)}` : `Cobrar ${fmt(total)}`}
              </button>
            </div>
          )}

          {exito && (
            <div style={{ padding:16, textAlign:'center', background:'rgba(16,185,129,0.1)',
              borderTop:'1px solid rgba(16,185,129,0.3)' }}>
              <p style={{ fontSize:24, margin:'0 0 4px' }}>✓</p>
              <p style={{ color:'#10b981', fontWeight:700, margin:0 }}>¡Venta registrada!</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
