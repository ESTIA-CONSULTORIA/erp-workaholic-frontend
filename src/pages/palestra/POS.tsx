import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const METODOS = [
  { id:'EFECTIVO',       label:'Efectivo',      color:'#10b981' },
  { id:'TARJETA_DEBITO', label:'T. Débito',     color:'#3b82f6' },
  { id:'TARJETA_CREDITO',label:'T. Crédito',    color:'#8b5cf6' },
  { id:'TRANSFERENCIA',  label:'Transferencia', color:'#06b6d4' },
];

const TIPO_ICON: Record<string,string> = {
  MEMBRESIA:'👥', SERVICIO:'⚙', CLASE:'🎾', CLINICA:'🏆', RENTA:'📅', MANTENIMIENTO:'🔄',
  ROPA:'👕', ACCESORIOS:'🎒', SUPLEMENTOS:'💊', GENERAL:'📦', PRODUCTO:'📦'
};

export default function PalestraPOSPage() {
  const { activeCompany } = useERPStore();
  const cid    = activeCompany?.companyId;
  const color  = activeCompany?.color || '#10b981';
  const qc     = useQueryClient();
  const navigate = useNavigate();

  const [carrito,     setCarrito]     = useState<any[]>([]);
  const [clientName,  setClientName]  = useState('');
  const [metodo,      setMetodo]      = useState('EFECTIVO');
  const [referencia,  setReferencia]  = useState('');
  const [coachId,     setCoachId]     = useState('');
  const [busqueda,    setBusqueda]    = useState('');
  const [exito,       setExito]       = useState(false);
  const [error,       setError]       = useState('');

  const { data: services = [] } = useQuery({
    queryKey: ['services', cid],
    queryFn:  () => api.get(`/companies/${cid}/palestra/services`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['palestra-products', cid],
    queryFn:  () => api.get(`/companies/${cid}/palestra/products`).then(r => r.data),
    enabled:  !!cid,
  });

  // Combinar servicios y productos en un solo catálogo
  const catalog = [
    ...(services as any[]).map(s => ({ ...s, itemType:'SERVICIO' })),
    ...(products as any[]).map(p => ({ ...p, type: p.category || 'PRODUCTO', itemType:'PRODUCTO',
      price: p.price, coachable: false, duration: null,
      name: p.name + (p.stock <= 0 ? ' (Sin stock)' : '') })),
  ];

  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches', cid],
    queryFn:  () => api.get(`/companies/${cid}/rh/employees?status=ACTIVO`).then(r => r.data),
    enabled:  !!cid,
  });

  const total = carrito.reduce((t, l) => t + l.price * l.qty, 0);

  const agregar = (srv: any) => {
    if (srv.itemType === 'PRODUCTO' && srv.stock <= 0) return;
    setCarrito(c => {
      const existing = c.find(l => l.id === srv.id);
      if (existing) return c.map(l => l.id === srv.id ? {...l, qty: l.qty+1} : l);
      return [...c, { id:srv.id, name:srv.name, price:Number(srv.price), qty:1,
                      coachable:srv.coachable||false, coachRate:Number(srv.coachRate||0),
                      productId: srv.itemType==='PRODUCTO'?srv.id:null,
                      type: srv.itemType }];
    });
  };

  const cambiar = (id: string, delta: number) => {
    setCarrito(c => c.map(l => l.id===id ? {...l, qty: Math.max(0, l.qty+delta)} : l).filter(l => l.qty > 0));
  };

  const saleM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/palestra/sales`, {
      date: new Date().toISOString(),
      channel: 'MOSTRADOR',
      clientName: clientName || null,
      paymentMethod: metodo,
      lines: carrito.map(l => ({
        ...l,
        coachId: l.coachable && coachId ? coachId : null,
      })),
    }),
    onSuccess: () => {
      setExito(true);
      setCarrito([]);
      setClientName('');
      setReferencia('');
      setCoachId('');
      setTimeout(() => setExito(false), 3000);
      qc.invalidateQueries({ queryKey: ['palestra-dashboard', cid] });
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al registrar venta'),
  });

  const cobrar = () => {
    if (carrito.length === 0) { setError('Agrega al menos un servicio'); return; }
    if (['TARJETA_DEBITO','TARJETA_CREDITO'].includes(metodo) && referencia.length < 4) {
      setError('Ingresa los últimos 4 dígitos de autorización'); return;
    }
    if (metodo === 'TRANSFERENCIA' && referencia.length < 10) {
      setError('Ingresa la clave de rastreo (mín. 10 dígitos)'); return;
    }
    setError('');
    saleM.mutate();
  };

  const filtered = catalog.filter(s =>
    !busqueda || s.name.toLowerCase().includes(busqueda.toLowerCase()) || s.type === busqueda
  );

  const hasCoachable = carrito.some(l => l.coachable);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', background:'#0a0f1a', fontFamily:'system-ui,sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width:160, background:'#0f172a', borderRight:'1px solid #1e293b', display:'flex', flexDirection:'column', padding:10, gap:6 }}>
        <button onClick={() => navigate('/palestra')}
          style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:11 }}>
          ← Salir
        </button>
        <div style={{ padding:'10px 4px', borderBottom:'1px solid #1e293b', marginBottom:4 }}>
          <p style={{ fontSize:13, fontWeight:800, color:'#f1f5f9', margin:0 }}>PALESTRA</p>
          <p style={{ fontSize:9, color, margin:0, letterSpacing:1 }}>POS</p>
        </div>
        {['MEMBRESIA','SERVICIO','CLASE','CLINICA','RENTA','MANTENIMIENTO','ROPA','ACCESORIOS','SUPLEMENTOS','GENERAL'].map(tipo => {
          const count = (services as any[]).filter(s => s.type === tipo).length;
          if (!count) return null;
          return (
            <button key={tipo} onClick={() => setBusqueda(tipo)}
              style={{ padding:'7px 8px', borderRadius:8, border:'none', background: busqueda===tipo?color+'22':'transparent',
                color: busqueda===tipo?color:'#64748b', cursor:'pointer', fontSize:11, textAlign:'left', display:'flex', gap:6, alignItems:'center' }}>
              <span>{TIPO_ICON[tipo]}</span>{tipo}
            </button>
          );
        })}
        <button onClick={() => setBusqueda('')}
          style={{ padding:'7px 8px', borderRadius:8, border:'none', background: !busqueda?color+'22':'transparent',
            color: !busqueda?color:'#64748b', cursor:'pointer', fontSize:11, textAlign:'left' }}>
          🔍 Todos
        </button>
      </div>

      {/* Catálogo */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', borderBottom:'1px solid #1e293b' }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar servicio..."
            style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #1e293b', background:'#0f172a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, alignContent:'start' }}>
          {filtered.map((s:any) => (
            <div key={s.id} onClick={() => agregar(s)}
              style={{ background:'#0f172a', borderRadius:10, padding:12, cursor:'pointer', border:'1px solid #1e293b', transition:'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
              <p style={{ fontSize:18, margin:'0 0 6px' }}>{TIPO_ICON[s.type]||'⚙'}</p>
              <p style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', margin:'0 0 4px', lineHeight:1.3 }}>{s.name}</p>
              <p style={{ fontSize:13, fontWeight:800, color, margin:'0 0 4px' }}>{fmt(s.price)}</p>
              {s.duration && <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{s.duration} min</p>}
              {s.itemType==='PRODUCTO' && (
                <p style={{ fontSize:9, margin:'2px 0 0', color: s.stock<=0?'#f87171':s.stock<=s.minStock?'#f59e0b':'#10b981' }}>
                  {s.stock<=0?'Sin stock':`Stock: ${s.stock}`}
                </p>
              )}
              {s.coachable && <p style={{ fontSize:9, color:'#f59e0b', margin:'2px 0 0' }}>★ Comisión coach</p>}
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ gridColumn:'1/-1', textAlign:'center', color:'#334155', padding:40 }}>Sin servicios</p>
          )}
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ width:300, background:'#0f172a', borderLeft:'1px solid #1e293b', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e293b' }}>
          <input value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="👤 Nombre del cliente"
            style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid #1e293b', background:'#0a0f1a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>

        {/* Carrito */}
        <div style={{ flex:1, overflowY:'auto', padding:10 }}>
          {carrito.length === 0
            ? <p style={{ color:'#334155', textAlign:'center', marginTop:40, fontSize:12 }}>Selecciona servicios</p>
            : carrito.map(l => (
              <div key={l.id} style={{ padding:'8px 0', borderBottom:'1px solid #1e293b' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#f1f5f9', flex:1 }}>{l.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color }}>{fmt(l.price * l.qty)}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <button onClick={() => cambiar(l.id,-1)} style={{ width:22,height:22,borderRadius:4,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:12 }}>−</button>
                  <span style={{ fontSize:12,color:'#94a3b8',minWidth:20,textAlign:'center' }}>{l.qty}</span>
                  <button onClick={() => cambiar(l.id,+1)} style={{ width:22,height:22,borderRadius:4,border:`1px solid ${color}`,background:color,color:'#fff',cursor:'pointer',fontSize:12 }}>+</button>
                  <span style={{ fontSize:10,color:'#475569',marginLeft:'auto' }}>{fmt(l.price)}/u</span>
                </div>
              </div>
            ))
          }
        </div>

        {/* Coach selector */}
        {hasCoachable && (
          <div style={{ padding:'8px 12px', borderTop:'1px solid #1e293b' }}>
            <label style={{ fontSize:10, color:'#f59e0b', display:'block', marginBottom:4 }}>★ Coach (servicios con comisión)</label>
            <select value={coachId} onChange={e => setCoachId(e.target.value)}
              style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid #f59e0b33', background:'#0a0f1a', color:'#f1f5f9', fontSize:12 }}>
              <option value="">— Sin asignar —</option>
              {(coaches as any[]).map((c:any) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Método de pago */}
        <div style={{ padding:'8px 12px', borderTop:'1px solid #1e293b' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:6 }}>
            {METODOS.map(m => (
              <button key={m.id} onClick={() => { setMetodo(m.id); setReferencia(''); }}
                style={{ padding:'5px 4px', borderRadius:6, border:`1px solid ${metodo===m.id?m.color:'#334155'}`,
                  background: metodo===m.id?m.color+'22':'transparent', color:metodo===m.id?m.color:'#64748b',
                  cursor:'pointer', fontSize:10, fontWeight:metodo===m.id?700:400 }}>
                {m.label}
              </button>
            ))}
          </div>
          {metodo !== 'EFECTIVO' && (
            <input value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder={metodo==='TRANSFERENCIA'?'Clave rastreo (10+ dígitos)':'Últimos 4 dígitos'}
              style={{ width:'100%', padding:'6px 8px', borderRadius:6, border:`1px solid ${referencia.length>=(metodo==='TRANSFERENCIA'?10:4)?'#10b981':'#f87171'}`, background:'#0a0f1a', color:'#f1f5f9', fontSize:11, boxSizing:'border-box' }}/>
          )}
        </div>

        {/* Total y cobrar */}
        <div style={{ padding:12, borderTop:'1px solid #334155' }}>
          {error && <p style={{ fontSize:11, color:'#f87171', margin:'0 0 8px', textAlign:'center' }}>{error}</p>}
          {exito && <p style={{ fontSize:12, color:'#10b981', margin:'0 0 8px', textAlign:'center', fontWeight:700 }}>✅ ¡Venta registrada!</p>}
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, color:'#64748b' }}>Total</span>
            <span style={{ fontSize:22, fontWeight:800, color }}>{fmt(total)}</span>
          </div>
          <button onClick={cobrar} disabled={saleM.isPending || carrito.length===0}
            style={{ width:'100%', padding:12, borderRadius:10, border:'none', background: carrito.length===0?'#1e293b':color,
              color: carrito.length===0?'#334155':'#fff', cursor: carrito.length===0?'not-allowed':'pointer',
              fontSize:14, fontWeight:700 }}>
            {saleM.isPending ? 'Procesando…' : `COBRAR ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
