// ╔═══════════════════════════════════════════════════════════════╗
// ║  POS WORKAHOLIC — Centro de Negocios                         ║
// ║  Vende: espacios por hora/día, servicios, membresías          ║
// ║  Con membresía activa: descuenta horas automáticamente        ║
// ╚═══════════════════════════════════════════════════════════════╝
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import CobroModal from '../../components/CobroModal';

// Servicios adicionales fijos del centro de negocios
const SERVICIOS_EXTRA = [
  { id:'impresion_bw',    name:'Impresión B/N',       price:3,    icon:'🖨',  cat:'Servicios' },
  { id:'impresion_color', name:'Impresión Color',      price:8,    icon:'🖨',  cat:'Servicios' },
  { id:'escaner',         name:'Escaneo',              price:5,    icon:'📲',  cat:'Servicios' },
  { id:'copiado',         name:'Copiado B/N',          price:2,    icon:'📄',  cat:'Servicios' },
  { id:'paqueteria',      name:'Recepción Paquetería', price:50,   icon:'📦',  cat:'Servicios' },
  { id:'estacion',        name:'Estacionamiento/día',  price:80,   icon:'🚗',  cat:'Servicios' },
  { id:'cafe',            name:'Café',                 price:25,   icon:'☕',  cat:'A&B' },
  { id:'agua',            name:'Agua Embotellada',     price:20,   icon:'💧',  cat:'A&B' },
  { id:'snack',           name:'Snack',                price:35,   icon:'🍪',  cat:'A&B' },
  { id:'refresco',        name:'Refresco',             price:25,   icon:'🥤',  cat:'A&B' },
];

const TIPO_ICON: Record<string,string> = {
  OFICINA:'🏢', SALA_JUNTAS:'🤝', SALA_CAPACITACION:'🎓', COWORKING:'💻', LOCKER:'🔒',
};

const METODOS_PAGO = ['EFECTIVO','TARJETA_DEBITO','TARJETA_CREDITO','TRANSFERENCIA'];

export default function WorkaholicPOS() {
  const { activeCompany } = useERPStore();
  const cid    = activeCompany?.companyId;
  const color  = activeCompany?.color || '#6366f1';
  const qc     = useQueryClient();
  const nav    = useNavigate();

  // Estado del carrito
  const [carrito,     setCarrito]     = useState<any[]>([]);
  const [clientName,  setClientName]  = useState('');
  const [busqueda,    setBusqueda]    = useState('');
  const [categoria,   setCategoria]   = useState('Espacios');
  const [showCobro,   setShowCobro]   = useState(false);
  const [descPct,     setDescPct]     = useState(0);
  const [descAmt,     setDescAmt]     = useState(0);
  const [exito,       setExito]       = useState('');
  const [error,       setError]       = useState('');

  // Para membresía
  const [membresiaSelec, setMembresiaSelec] = useState('');  // id membresía activa del cliente
  const [busquedaMem,    setBusquedaMem]    = useState('');

  // Para espacio con horario
  const [espacioModal,  setEspacioModal]  = useState<any>(null);
  const [espacioForm,   setEspacioForm]   = useState({ date:'', startTime:'09:00', endTime:'10:00', reservar:true });

  // ── Queries ─────────────────────────────────────────────────
  const { data: spaces = [] } = useQuery({
    queryKey: ['wk-spaces', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/spaces`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: membresiaTypes = [] } = useQuery({
    queryKey: ['wk-mem-types', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/membership-types`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: membresiaActivas = [] } = useQuery({
    queryKey: ['wk-memberships-active', cid, busquedaMem],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/memberships?status=ACTIVA${busquedaMem?'&search='+busquedaMem:''}`).then(r => r.data),
    enabled:  !!cid,
    staleTime: 30000,
  });

  // ── Mutations ────────────────────────────────────────────────
  const saleM = useMutation({
    mutationFn: (pagos: any[]) => {
      const metodoPrincipal = pagos[0]?.method || 'EFECTIVO';
      return api.post(`/companies/${cid}/workaholic/sales`, {
        clientName: clientName || null,
        paymentMethod: metodoPrincipal,
        paymentSplits: pagos.length > 1 ? pagos : null,
        discount: montoDescuento,
        membershipId: membresiaSelec || null,
        lines: carrito.map((l:any) => ({
          productId:   l.spaceId || null,
          serviceId:   l.serviceId || null,
          membershipTypeId: l.membershipTypeId || null,
          quantity:    l.qty || 1,
          unitPrice:   l.price,
          description: l.name,
          type:        l.type, // 'ESPACIO' | 'SERVICIO' | 'MEMBRESIA'
          // Reservación si aplica
          date:        l.date || null,
          startTime:   l.startTime || null,
          endTime:     l.endTime || null,
          hours:       l.hours || null,
          spaceId:     l.spaceId || null,
          fromMembership: membresiaSelec && l.type === 'ESPACIO',
          ivaRate:     16,
        })),
      });
    },
    onSuccess: () => {
      setCarrito([]);
      setClientName('');
      setMembresiaSelec('');
      setDescPct(0); setDescAmt(0);
      setExito('✅ Venta registrada');
      setTimeout(() => setExito(''), 3000);
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al registrar venta'),
  });

  // ── Totales ──────────────────────────────────────────────────
  const subtotal       = carrito.reduce((t, i) => t + i.price * (i.qty||1), 0);
  const montoDescuento = descAmt > 0 ? descAmt : (subtotal * descPct / 100);
  const totalConDesc   = Math.max(0, subtotal - montoDescuento);

  // Horas disponibles de membresía seleccionada
  const memActiva = (membresiaActivas as any[]).find((m:any) => m.id === membresiaSelec);
  const horasDisp = memActiva
    ? Number(memActiva.membershipType?.hoursIncluded || 0) - Number(memActiva.hoursUsed || 0)
    : 0;

  // ── Agregar al carrito ────────────────────────────────────────
  const agregarServicio = (s: any) => {
    setCarrito(c => {
      const ex = c.find(l => l.id === s.id && l.type === 'SERVICIO');
      if (ex) return c.map(l => l.id===s.id && l.type==='SERVICIO' ? {...l, qty:(l.qty||1)+1} : l);
      return [...c, { ...s, type:'SERVICIO', serviceId:s.id, qty:1 }];
    });
  };

  const agregarEspacio = (space: any, form: any) => {
    const hours = Math.max(0.5,
      (parseInt(form.endTime) - parseInt(form.startTime)) ||
      ((parseInt(form.endTime.split(':')[0])*60 + parseInt(form.endTime.split(':')[1]||'0')) -
       (parseInt(form.startTime.split(':')[0])*60 + parseInt(form.startTime.split(':')[1]||'0'))) / 60
    );
    const price = membresiaSelec ? 0
      : (hours >= 8 ? Number(space.pricePerDay||0) : Number(space.pricePerHour||0) * hours);

    setCarrito(c => [...c, {
      id: `${space.id}_${form.date}_${form.startTime}`,
      spaceId: space.id,
      name: `${space.name} — ${form.date} ${form.startTime}-${form.endTime}`,
      price,
      qty: 1,
      type: 'ESPACIO',
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      hours,
      fromMembership: !!membresiaSelec,
      icon: TIPO_ICON[space.type] || '🏢',
    }]);
    setEspacioModal(null);
    setEspacioForm({ date:'', startTime:'09:00', endTime:'10:00', reservar:true });
  };

  const agregarMembresia = (tipo: any) => {
    setCarrito(c => [...c, {
      id: `mem_${tipo.id}`,
      membershipTypeId: tipo.id,
      name: `Membresía ${tipo.name} (${tipo.duration})`,
      price: Number(tipo.price),
      qty: 1,
      type: 'MEMBRESIA',
      icon: '🏅',
    }]);
  };

  const quitarItem = (id: string) => setCarrito(c => c.filter(l => l.id !== id));
  const cambiarQty = (id: string, delta: number) => setCarrito(c =>
    c.map(l => l.id===id ? {...l, qty:Math.max(1,l.qty+delta)} : l)
  );

  // ── Filtrado de productos ─────────────────────────────────────
  const CATS = ['Espacios', 'Membresías', 'Servicios', 'A&B'];

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    if (categoria === 'Espacios') {
      return (spaces as any[])
        .filter((s:any) => !q || s.name.toLowerCase().includes(q))
        .map((s:any) => ({ ...s, cat:'Espacios', icon: TIPO_ICON[s.type]||'🏢', price: Number(s.pricePerHour||0) }));
    }
    if (categoria === 'Membresías') {
      return (membresiaTypes as any[])
        .filter((m:any) => m.isActive && (!q || m.name.toLowerCase().includes(q)));
    }
    return SERVICIOS_EXTRA.filter(s =>
      (categoria === 'Todos' || s.cat === categoria) &&
      (!q || s.name.toLowerCase().includes(q))
    );
  }, [categoria, busqueda, spaces, membresiaTypes]);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex',
      background:'#0a0f1a', fontFamily:'system-ui,sans-serif' }}>

      {/* ── Sidebar ── */}
      <div style={{ width:160, background:'#0f172a', borderRight:'1px solid #1e293b',
        display:'flex', flexDirection:'column', padding:10, gap:6 }}>
        <button onClick={() => nav('/workaholic')}
          style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #334155',
            background:'none', color:'#64748b', cursor:'pointer', fontSize:11 }}>
          ← Salir
        </button>
        <div style={{ padding:'10px 4px', borderBottom:'1px solid #1e293b', marginBottom:4 }}>
          <p style={{ fontSize:13, fontWeight:800, color:'#f1f5f9', margin:0 }}>WORKAHOLIC</p>
          <p style={{ fontSize:10, color:'#64748b', margin:'2px 0 0' }}>Centro de Negocios</p>
        </div>
        {/* Categorías */}
        {CATS.map(cat => (
          <button key={cat} onClick={() => { setCategoria(cat); setBusqueda(''); }}
            style={{ padding:'8px 10px', borderRadius:7, border:`1px solid ${categoria===cat?color:'transparent'}`,
              background: categoria===cat ? color+'22' : 'transparent',
              color: categoria===cat ? color : '#64748b', cursor:'pointer', fontSize:12,
              fontWeight: categoria===cat ? 700 : 400, textAlign:'left' }}>
            {cat === 'Espacios' ? '🏢' : cat === 'Membresías' ? '🏅' : cat === 'Servicios' ? '🖨' : '☕'} {cat}
          </button>
        ))}

        {/* Membresía activa del cliente */}
        <div style={{ marginTop:'auto', borderTop:'1px solid #1e293b', paddingTop:10 }}>
          <p style={{ fontSize:10, color:'#64748b', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:0.5 }}>
            Membresía cliente
          </p>
          <input value={busquedaMem} onChange={e => setBusquedaMem(e.target.value)}
            placeholder="Buscar membresía…"
            style={{ width:'100%', padding:'5px 8px', borderRadius:6, border:'1px solid #334155',
              background:'#0a0f1a', color:'#f1f5f9', fontSize:11, marginBottom:6, boxSizing:'border-box' }}/>
          {(membresiaActivas as any[]).filter((_:any,i:number)=>i<4).map((m:any) => (
            <button key={m.id} onClick={() => setMembresiaSelec(membresiaSelec===m.id ? '' : m.id)}
              style={{ width:'100%', padding:'5px 8px', borderRadius:6, marginBottom:3,
                border:`1px solid ${membresiaSelec===m.id?'#10b981':'#334155'}`,
                background: membresiaSelec===m.id ? '#10b98118' : 'transparent',
                color: membresiaSelec===m.id ? '#10b981' : '#94a3b8',
                cursor:'pointer', fontSize:10, textAlign:'left' }}>
              <p style={{ margin:'0 0 1px', fontWeight:600 }}>{m.holderName}</p>
              <p style={{ margin:0, color:'#64748b' }}>{m.membershipType?.name}</p>
              {membresiaSelec===m.id && (
                <p style={{ margin:'2px 0 0', color:'#10b981', fontWeight:700 }}>
                  {horasDisp.toFixed(1)}h disponibles
                </p>
              )}
            </button>
          ))}
          {membresiaSelec && (
            <button onClick={() => setMembresiaSelec('')}
              style={{ width:'100%', padding:'4px', borderRadius:6, border:'1px solid #f87171',
                background:'none', color:'#f87171', cursor:'pointer', fontSize:10, marginTop:3 }}>
              ✕ Quitar membresía
            </button>
          )}
        </div>
      </div>

      {/* ── Catálogo ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Barra de búsqueda */}
        <div style={{ padding:'10px 14px', borderBottom:'1px solid #1e293b', background:'#0f172a' }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder={`Buscar ${categoria.toLowerCase()}…`}
            style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #1e293b',
              background:'#0a0f1a', color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
        </div>

        {/* Grid de productos */}
        <div style={{ flex:1, overflowY:'auto', padding:14, display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, alignContent:'start' }}>

          {itemsFiltrados.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'#334155' }}>
              <p style={{ fontSize:28 }}>🔍</p>
              <p style={{ fontSize:13 }}>Sin resultados</p>
            </div>
          )}

          {categoria === 'Espacios' && (itemsFiltrados as any[]).map((s:any) => (
            <div key={s.id} onClick={() => { setEspacioModal(s); setEspacioForm({...espacioForm, date:new Date().toISOString().slice(0,10)}); }}
              style={{ background:'#0f172a', borderRadius:10, padding:14, cursor:'pointer',
                border:'1px solid #1e293b', transition:'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
              <p style={{ fontSize:24, margin:'0 0 6px' }}>{TIPO_ICON[s.type]||'🏢'}</p>
              <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px', lineHeight:1.3 }}>{s.name}</p>
              <p style={{ fontSize:10, color:'#64748b', margin:'0 0 6px' }}>{s.type?.replace('_',' ')} · {s.capacity}p</p>
              {s.pricePerHour && <p style={{ fontSize:12, color, margin:'0 0 2px', fontWeight:700 }}>{fmt(s.pricePerHour)}/hr</p>}
              {s.pricePerDay  && <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{fmt(s.pricePerDay)}/día</p>}
              {membresiaSelec && (
                <p style={{ fontSize:10, color:'#10b981', marginTop:4, fontWeight:600 }}>✓ Incluido en membresía</p>
              )}
            </div>
          ))}

          {categoria === 'Membresías' && (itemsFiltrados as any[]).map((m:any) => (
            <div key={m.id} onClick={() => agregarMembresia(m)}
              style={{ background:'#0f172a', borderRadius:10, padding:14, cursor:'pointer',
                border:'1px solid #1e293b', transition:'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
              <p style={{ fontSize:24, margin:'0 0 6px' }}>🏅</p>
              <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:'0 0 2px', lineHeight:1.3 }}>{m.name}</p>
              <p style={{ fontSize:10, color:'#64748b', margin:'0 0 6px' }}>{m.duration} · {m.hoursIncluded}h de sala</p>
              <p style={{ fontSize:14, color, fontWeight:800, margin:0 }}>{fmt(m.price)}</p>
              {m.description && <p style={{ fontSize:10, color:'#475569', margin:'4px 0 0', lineHeight:1.4 }}>{m.description}</p>}
            </div>
          ))}

          {(categoria === 'Servicios' || categoria === 'A&B') && (itemsFiltrados as any[]).map((s:any) => (
            <div key={s.id} onClick={() => agregarServicio(s)}
              style={{ background:'#0f172a', borderRadius:10, padding:14, cursor:'pointer',
                border:`1px solid ${carrito.find(l=>l.id===s.id)?color:'#1e293b'}`,
                transition:'border-color 0.15s', position:'relative' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => {
                const inCart = carrito.find(l=>l.id===s.id);
                e.currentTarget.style.borderColor = inCart ? color : '#1e293b';
              }}>
              <p style={{ fontSize:24, margin:'0 0 6px' }}>{s.icon}</p>
              <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px', lineHeight:1.3 }}>{s.name}</p>
              <p style={{ fontSize:14, color, fontWeight:800, margin:0 }}>{fmt(s.price)}</p>
              {carrito.find(l=>l.id===s.id) && (
                <div style={{ position:'absolute', top:8, right:8, background:color,
                  borderRadius:99, width:20, height:20, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>
                  {carrito.find(l=>l.id===s.id)?.qty}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho: carrito + cobro ── */}
      <div style={{ width:300, background:'#0f172a', borderLeft:'1px solid #1e293b',
        display:'flex', flexDirection:'column' }}>

        {/* Nombre del cliente */}
        <div style={{ padding:'10px 12px', borderBottom:'1px solid #1e293b' }}>
          <input value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="Nombre del cliente"
            style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid #334155',
              background:'#0a0f1a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
          {membresiaSelec && memActiva && (
            <p style={{ fontSize:10, color:'#10b981', margin:'5px 0 0', fontWeight:600 }}>
              ✓ {memActiva.holderName} — Membresía activa ({horasDisp.toFixed(1)}h disponibles)
            </p>
          )}
        </div>

        {/* Carrito */}
        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {carrito.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#334155' }}>
              <p style={{ fontSize:32, margin:'0 0 8px' }}>🛒</p>
              <p style={{ fontSize:12 }}>
                {categoria === 'Espacios' ? 'Selecciona un espacio para reservar' : 'Agrega productos'}
              </p>
            </div>
          ) : carrito.map(l => (
            <div key={l.id} style={{ padding:'7px 4px', borderBottom:'1px solid #1e293b' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:'#f1f5f9', margin:'0 0 2px', lineHeight:1.3 }}>
                    {l.icon} {l.name}
                  </p>
                  {l.fromMembership && (
                    <p style={{ fontSize:9, color:'#10b981', margin:0 }}>✓ Incluido en membresía</p>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, marginLeft:6 }}>
                  <span style={{ fontSize:12, fontWeight:700, color: l.fromMembership ? '#10b981' : color }}>
                    {l.fromMembership ? 'Incluido' : fmt(l.price * (l.qty||1))}
                  </span>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    {l.type !== 'ESPACIO' && (
                      <>
                        <button onClick={() => cambiarQty(l.id,-1)}
                          style={{ width:18,height:18,borderRadius:3,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                        <span style={{ fontSize:11,color:'#64748b',minWidth:14,textAlign:'center' }}>{l.qty}</span>
                        <button onClick={() => cambiarQty(l.id,1)}
                          style={{ width:18,height:18,borderRadius:3,border:`1px solid ${color}`,background:color,color:'#fff',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
                      </>
                    )}
                    <button onClick={() => quitarItem(l.id)}
                      style={{ width:18,height:18,borderRadius:3,border:'1px solid #f87171',background:'none',color:'#f87171',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totales + descuento + cobrar */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid #334155' }}>
          {error && <p style={{ fontSize:11,color:'#f87171',margin:'0 0 6px',textAlign:'center' }}>{error}</p>}
          {exito && <p style={{ fontSize:12,color:'#10b981',margin:'0 0 6px',textAlign:'center',fontWeight:700 }}>{exito}</p>}

          {carrito.length > 0 && (
            <>
              {/* Descuento */}
              <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
                <span style={{ fontSize:10, color:'#64748b' }}>Desc:</span>
                <input type="number" min={0} max={100} value={descPct||''} placeholder="%"
                  onChange={e => { setDescPct(Number(e.target.value)); setDescAmt(0); }}
                  style={{ width:44, padding:'4px 5px', borderRadius:5, border:'1px solid #334155', background:'#0a0f1a', color:'#f1f5f9', fontSize:11 }}/>
                <span style={{ fontSize:10, color:'#475569' }}>%</span>
                <input type="number" min={0} value={descAmt||''} placeholder="$"
                  onChange={e => { setDescAmt(Number(e.target.value)); setDescPct(0); }}
                  style={{ width:56, padding:'4px 5px', borderRadius:5, border:'1px solid #334155', background:'#0a0f1a', color:'#f1f5f9', fontSize:11 }}/>
                {(descPct>0||descAmt>0) && (
                  <button onClick={()=>{setDescPct(0);setDescAmt(0);}}
                    style={{ padding:'3px 5px',borderRadius:4,border:'none',background:'#f87171',color:'#fff',cursor:'pointer',fontSize:9 }}>✕</button>
                )}
              </div>

              {/* Resumen */}
              {(descPct>0||descAmt>0) && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#64748b' }}>Subtotal</span>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>{fmt(subtotal)}</span>
                </div>
              )}
              {montoDescuento > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#f59e0b' }}>Descuento</span>
                  <span style={{ fontSize:11, color:'#f59e0b' }}>-{fmt(montoDescuento)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>TOTAL</span>
                <span style={{ fontSize:22, fontWeight:800, color }}>{fmt(totalConDesc)}</span>
              </div>
            </>
          )}

          <button onClick={() => { setError(''); setShowCobro(true); }}
            disabled={carrito.length===0}
            style={{ width:'100%', padding:12, borderRadius:9, border:'none', fontSize:14, fontWeight:800,
              background: carrito.length===0 ? '#1e293b' : color,
              color: carrito.length===0 ? '#334155' : '#fff',
              cursor: carrito.length===0 ? 'not-allowed' : 'pointer' }}>
            {carrito.length===0 ? 'Agrega productos' : `COBRAR ${fmt(totalConDesc)}`}
          </button>
        </div>
      </div>

      {/* ── Modal: seleccionar horario de espacio ── */}
      {espacioModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#1e293b', borderRadius:14, padding:24, width:400, border:`1px solid ${color}44` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:800, margin:0, color }}>
                {TIPO_ICON[espacioModal.type]} {espacioModal.name}
              </h3>
              <button onClick={() => setEspacioModal(null)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ gridColumn:'span 3' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={espacioForm.date}
                  onChange={e => setEspacioForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Entrada</label>
                <input type="time" className="input-base" style={{ fontSize:13 }}
                  value={espacioForm.startTime}
                  onChange={e => setEspacioForm(f=>({...f,startTime:e.target.value}))}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Salida</label>
                <input type="time" className="input-base" style={{ fontSize:13 }}
                  value={espacioForm.endTime}
                  onChange={e => setEspacioForm(f=>({...f,endTime:e.target.value}))}/>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                <div style={{ background:color+'18', border:`1px solid ${color}44`, borderRadius:7, padding:'7px 10px', width:'100%' }}>
                  <p style={{ fontSize:9, color:'#64748b', margin:'0 0 2px' }}>Total</p>
                  {(() => {
                    const [h1,m1] = espacioForm.startTime.split(':').map(Number);
                    const [h2,m2] = espacioForm.endTime.split(':').map(Number);
                    const hours = Math.max(0, (h2*60+m2 - h1*60-m1) / 60);
                    const price = membresiaSelec ? 0
                      : hours >= 8 ? Number(espacioModal.pricePerDay||0)
                      : Number(espacioModal.pricePerHour||0) * hours;
                    return <p style={{ fontSize:15, fontWeight:800, color, margin:0 }}>
                      {membresiaSelec ? <span style={{ color:'#10b981' }}>Incluido</span> : fmt(price)}
                    </p>;
                  })()}
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setEspacioModal(null)}
                style={{ flex:1, padding:'9px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancelar
              </button>
              <button onClick={() => agregarEspacio(espacioModal, espacioForm)}
                disabled={!espacioForm.date}
                style={{ flex:2, padding:'9px', borderRadius:8, border:'none',
                  background: espacioForm.date ? color : '#334155',
                  color:'#fff', cursor: espacioForm.date ? 'pointer' : 'not-allowed',
                  fontSize:13, fontWeight:700 }}>
                + Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CobroModal ── */}
      {showCobro && (
        <CobroModal
          total={totalConDesc}
          color={color}
          pinValidator={async (pin, pct) => {
            try {
              const r = await api.post('/auth/verify-pin', { companyId: cid, pin });
              return !!r.data?.valid;
            } catch { return false; }
          }}
          onCobrar={(pagos, _nota) => {
            setShowCobro(false);
            saleM.mutate(pagos);
          }}
          onCancel={() => setShowCobro(false)}
          loading={saleM.isPending}
        />
      )}
    </div>
  );
}
