import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const METODOS = [
  { id:'EFECTIVO',        label:'Efectivo',      color:'#10b981' },
  { id:'TARJETA_DEBITO',  label:'T. Débito',     color:'#3b82f6' },
  { id:'TARJETA_CREDITO', label:'T. Crédito',    color:'#8b5cf6' },
  { id:'TRANSFERENCIA',   label:'Transferencia', color:'#06b6d4' },
];

const TIPO_ICON: Record<string,string> = {
  OFICINA:'🏢', SALA_JUNTAS:'🤝', SALA_CAPACITACION:'🎓', COWORKING:'💻', LOCKER:'🔒',
};

// Servicios adicionales fijos del centro de negocios
const SERVICIOS_ADICIONALES = [
  { id:'impresion_bw',   name:'Impresión B/N',      price:3,    icon:'🖨', category:'Servicios' },
  { id:'impresion_color',name:'Impresión Color',     price:8,    icon:'🖨', category:'Servicios' },
  { id:'copiado',        name:'Copiado',             price:2,    icon:'📄', category:'Servicios' },
  { id:'escaner',        name:'Escaneo',             price:5,    icon:'📲', category:'Servicios' },
  { id:'paqueteria',     name:'Recepción Paquetería',price:50,   icon:'📦', category:'Servicios' },
  { id:'cafe',           name:'Café',                price:25,   icon:'☕', category:'A&B' },
  { id:'agua',           name:'Agua Embotellada',    price:20,   icon:'💧', category:'A&B' },
  { id:'snack',          name:'Snack',               price:35,   icon:'🍪', category:'A&B' },
  { id:'estacionamiento',name:'Estacionamiento/día', price:80,   icon:'🚗', category:'Servicios' },
  { id:'membresia_dia',  name:'Día de Coworking',    price:250,  icon:'💻', category:'Accesos' },
  { id:'sala_1h',        name:'Sala de Juntas 1h',   price:350,  icon:'🤝', category:'Accesos' },
  { id:'sala_4h',        name:'Sala de Juntas 4h',   price:1200, icon:'🤝', category:'Accesos' },
  { id:'sala_dia',       name:'Sala de Juntas día',  price:2000, icon:'🤝', category:'Accesos' },
  { id:'capacitacion_1h',name:'Sala Capacitación 1h',price:500,  icon:'🎓', category:'Accesos' },
];

const CATEGORIAS = ['Todos', 'Accesos', 'Servicios', 'A&B'];

export default function WorkaholicPOS() {
  const { activeCompany } = useERPStore();
  const cid    = activeCompany?.companyId;
  const color  = activeCompany?.color || '#6366f1';
  const qc     = useQueryClient();
  const navigate = useNavigate();

  const [carrito,    setCarrito]    = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [metodo,     setMetodo]     = useState('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [categoria,  setCategoria]  = useState('Todos');
  const [busqueda,   setBusqueda]   = useState('');
  const [exito,      setExito]      = useState(false);
  const [error,      setError]      = useState('');
  const [membresiaId,setMembresiaId]= useState('');
  const [modo,       setModo]       = useState<'servicios'|'reservacion'>('servicios');

  // Para modo reservación rápida
  const [resForm, setResForm] = useState({
    spaceId:'', date: new Date().toISOString().slice(0,10),
    startTime:'09:00', endTime:'10:00',
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['wk-memberships-active', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/memberships?status=ACTIVA`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: spaces = [] } = useQuery({
    queryKey: ['wk-spaces', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/spaces`).then(r=>r.data),
    enabled:  !!cid,
  });

  const total = carrito.reduce((t, l) => t + l.price * l.qty, 0);

  const agregar = (srv: any) => {
    setCarrito(c => {
      const ex = c.find(l => l.id === srv.id);
      if (ex) return c.map(l => l.id===srv.id ? {...l, qty:l.qty+1} : l);
      return [...c, { id:srv.id, name:srv.name, price:srv.price, qty:1, icon:srv.icon, ivaRate:srv.ivaRate??16 }];
    });
  };

  const cambiar = (id:string, delta:number) => {
    setCarrito(c => c.map(l => l.id===id ? {...l, qty:Math.max(0,l.qty+delta)} : l).filter(l=>l.qty>0));
  };

  const saleM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/sales`, {
      clientName: clientName || null,
      paymentMethod: metodo,
      lines: carrito.map((l:any) => ({ ...l, productId: l.id, quantity: l.qty, unitPrice: l.price, ivaRate: l.ivaRate ?? 16 })),
    }),
    onSuccess: () => {
      setExito(true);
      setCarrito([]); setClientName(''); setReferencia(''); setMembresiaId('');
      setTimeout(() => setExito(false), 3000);
      qc.invalidateQueries({ queryKey: ['workaholic-dashboard', cid] });
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al registrar venta'),
  });

  const resM = useMutation({
    mutationFn: () => {
      const sp = (spaces as any[]).find(s=>s.id===resForm.spaceId);
      const hours = parseFloat(resForm.endTime.replace(':','.'))-parseFloat(resForm.startTime.replace(':','.'));
      if (!sp) throw new Error('Selecciona un espacio');
      return api.post(`/companies/${cid}/workaholic/reservations`, {
        ...resForm,
        clientName: clientName || 'Cliente POS',
        paymentMethod: metodo,
        membershipId: membresiaId || undefined,
      });
    },
    onSuccess: () => {
      setExito(true);
      setResForm({ spaceId:'', date:new Date().toISOString().slice(0,10), startTime:'09:00', endTime:'10:00' });
      setClientName(''); setMembresiaId('');
      setTimeout(() => setExito(false), 3000);
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error al crear reservación'),
  });

  const cobrar = () => {
    setError('');
    if (['TARJETA_DEBITO','TARJETA_CREDITO'].includes(metodo) && referencia.length < 4) {
      setError('Ingresa los últimos 4 dígitos de autorización'); return;
    }
    if (metodo === 'TRANSFERENCIA' && referencia.length < 10) {
      setError('Ingresa la clave de rastreo (mín. 10 dígitos)'); return;
    }
    if (modo === 'servicios') {
      if (carrito.length === 0) { setError('Agrega al menos un servicio'); return; }
      saleM.mutate();
    } else {
      if (!resForm.spaceId) { setError('Selecciona un espacio'); return; }
      resM.mutate();
    }
  };

  const selSpace = (spaces as any[]).find(s=>s.id===resForm.spaceId);
  const resHours = resForm.startTime && resForm.endTime
    ? Math.round(((parseInt(resForm.endTime)-parseInt(resForm.startTime))*60+(parseInt(resForm.endTime.split(':')[1])-parseInt(resForm.startTime.split(':')[1])))/60*100)/100
    : 0;
  const resTotal = selSpace ? resHours * Number(selSpace.pricePerHour||0) : 0;

  const filtered = SERVICIOS_ADICIONALES.filter(s =>
    (categoria==='Todos' || s.category===categoria) &&
    (!busqueda || s.name.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex',
      background:'#0a0f1a', fontFamily:'system-ui,sans-serif' }}>

      {/* Sidebar */}
      <div style={{ width:160, background:'#0f172a', borderRight:'1px solid #1e293b',
        display:'flex', flexDirection:'column', padding:10, gap:6 }}>
        <button onClick={() => navigate('/workaholic')}
          style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #334155',
            background:'none', color:'#64748b', cursor:'pointer', fontSize:11 }}>
          ← Salir
        </button>
        <div style={{ padding:'10px 4px', borderBottom:'1px solid #1e293b', marginBottom:4 }}>
          <p style={{ fontSize:13, fontWeight:800, color:'#f1f5f9', margin:0 }}>WORKAHOLIC</p>
          <p style={{ fontSize:9, color, margin:0, letterSpacing:1 }}>POS</p>
        </div>

        {/* Modo */}
        <p style={{ fontSize:9, color:'#475569', textTransform:'uppercase', margin:'4px 0 2px' }}>Modo</p>
        <button onClick={() => setModo('servicios')}
          style={{ padding:'7px 8px', borderRadius:7, border:'none', fontSize:11, cursor:'pointer', textAlign:'left',
            background:modo==='servicios'?color+'22':'transparent', color:modo==='servicios'?color:'#64748b' }}>
          🛒 Servicios
        </button>
        <button onClick={() => setModo('reservacion')}
          style={{ padding:'7px 8px', borderRadius:7, border:'none', fontSize:11, cursor:'pointer', textAlign:'left',
            background:modo==='reservacion'?color+'22':'transparent', color:modo==='reservacion'?color:'#64748b' }}>
          📅 Reservación
        </button>

        {modo === 'servicios' && (
          <>
            <p style={{ fontSize:9, color:'#475569', textTransform:'uppercase', margin:'8px 0 2px' }}>Categoría</p>
            {CATEGORIAS.map(cat => (
              <button key={cat} onClick={() => setCategoria(cat)}
                style={{ padding:'6px 8px', borderRadius:7, border:'none', fontSize:11, cursor:'pointer', textAlign:'left',
                  background:categoria===cat?color+'22':'transparent', color:categoria===cat?color:'#64748b' }}>
                {cat}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Catálogo / Formulario */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {modo === 'servicios' ? (
          <>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #1e293b' }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar servicio..."
                style={{ width:'100%', padding:'7px 12px', borderRadius:8, border:'1px solid #1e293b',
                  background:'#0f172a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:12,
              display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, alignContent:'start' }}>
              {filtered.map(s => (
                <div key={s.id} onClick={() => agregar(s)}
                  style={{ background:'#0f172a', borderRadius:10, padding:12, cursor:'pointer',
                    border:'1px solid #1e293b', transition:'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
                  <p style={{ fontSize:20, margin:'0 0 6px' }}>{s.icon}</p>
                  <p style={{ fontSize:11, fontWeight:600, color:'#f1f5f9', margin:'0 0 4px', lineHeight:1.3 }}>{s.name}</p>
                  <p style={{ fontSize:13, fontWeight:800, color, margin:'0 0 2px' }}>{fmt(s.price)}</p>
                  <p style={{ fontSize:9, color:'#475569', margin:0 }}>{s.category}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Modo reservación */
          <div style={{ flex:1, overflowY:'auto', padding:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:'0 0 16px' }}>Reservación rápida</h2>

            {/* Espacios */}
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 8px', textTransform:'uppercase' }}>Espacio *</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:16 }}>
              {(spaces as any[]).length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:32 }}>
                <p style={{ fontSize:24, margin:'0 0 8px' }}>🚪</p>
                <p style={{ fontSize:13, color:'#64748b', margin:'0 0 4px' }}>No hay espacios configurados</p>
                <p style={{ fontSize:11, color:'#475569' }}>Ve a <strong>Workaholic → Espacios</strong> para agregar espacios</p>
              </div>
            )}
            {(spaces as any[]).map(s => (
                <div key={s.id} onClick={() => setResForm(f=>({...f,spaceId:s.id}))}
                  style={{ background:resForm.spaceId===s.id?color+'22':'#0f172a',
                    border:`2px solid ${resForm.spaceId===s.id?color:'#1e293b'}`,
                    borderRadius:9, padding:12, cursor:'pointer' }}>
                  <p style={{ fontSize:18, margin:'0 0 4px' }}>{TIPO_ICON[s.type]||'🏢'}</p>
                  <p style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', margin:'0 0 2px' }}>{s.name}</p>
                  <p style={{ fontSize:11, color, margin:0, fontWeight:600 }}>{s.pricePerHour?fmt(s.pricePerHour)+'/h':''}</p>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha</label>
                <input type="date" value={resForm.date} min={new Date().toISOString().slice(0,10)}
                  onChange={e => setResForm(f=>({...f,date:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #334155',
                    background:'#0f172a', color:'#f1f5f9', fontSize:12 }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hora inicio</label>
                <input type="time" value={resForm.startTime} step="1800"
                  onChange={e => setResForm(f=>({...f,startTime:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #334155',
                    background:'#0f172a', color:'#f1f5f9', fontSize:12 }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hora fin</label>
                <input type="time" value={resForm.endTime} min={resForm.startTime} step="1800"
                  onChange={e => setResForm(f=>({...f,endTime:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #334155',
                    background:'#0f172a', color:'#f1f5f9', fontSize:12 }}/>
              </div>
            </div>

            {/* Membresía opcional */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                Membresía (descuenta horas incluidas)
              </label>
              <select value={membresiaId} onChange={e => setMembresiaId(e.target.value)}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #334155',
                  background:'#0f172a', color:'#f1f5f9', fontSize:12 }}>
                <option value="">— Sin membresía (cobro directo) —</option>
                {(memberships as any[]).map((m:any) => {
                  const horas = Number(m.membershipType?.hoursIncluded||0) - Number(m.hoursUsed||0);
                  return <option key={m.id} value={m.id}>{m.holderName} — {horas}h restantes</option>;
                })}
              </select>
            </div>

            {/* Preview */}
            {selSpace && resHours > 0 && (
              <div style={{ background:'#0f172a', borderRadius:9, padding:'12px 16px',
                border:`1px solid ${color}33`, display:'flex', gap:24, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#64748b' }}>⏱ {resHours}h</span>
                <span style={{ fontSize:12, color:'#64748b' }}>📅 {resForm.startTime} – {resForm.endTime}</span>
                {membresiaId
                  ? <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>★ Desde membresía (sin cargo)</span>
                  : <span style={{ fontSize:16, fontWeight:800, color }}>Total: {fmt(resTotal)}</span>
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel derecho */}
      <div style={{ width:300, background:'#0f172a', borderLeft:'1px solid #1e293b', display:'flex', flexDirection:'column' }}>
        {/* Cliente */}
        <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e293b' }}>
          <input value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="👤 Nombre del cliente / empresa"
            style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid #1e293b',
              background:'#0a0f1a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>

        {/* Carrito (solo en modo servicios) */}
        {modo === 'servicios' && (
          <div style={{ flex:1, overflowY:'auto', padding:10 }}>
            {carrito.length === 0
              ? <p style={{ color:'#334155', textAlign:'center', marginTop:40, fontSize:12 }}>Selecciona servicios</p>
              : carrito.map(l => (
                <div key={l.id} style={{ padding:'8px 0', borderBottom:'1px solid #1e293b' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, color:'#f1f5f9', flex:1 }}>{l.icon} {l.name}</span>
                    <span style={{ fontSize:12, fontWeight:700, color }}>{fmt(l.price*l.qty)}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button onClick={() => cambiar(l.id,-1)}
                      style={{ width:22,height:22,borderRadius:4,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:12 }}>−</button>
                    <span style={{ fontSize:12,color:'#94a3b8',minWidth:20,textAlign:'center' }}>{l.qty}</span>
                    <button onClick={() => cambiar(l.id,+1)}
                      style={{ width:22,height:22,borderRadius:4,border:`1px solid ${color}`,background:color,color:'#fff',cursor:'pointer',fontSize:12 }}>+</button>
                    <span style={{ fontSize:10,color:'#475569',marginLeft:'auto' }}>{fmt(l.price)}/u</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}
        {modo === 'reservacion' && <div style={{ flex:1 }}/>}

        {/* Método pago */}
        <div style={{ padding:'8px 12px', borderTop:'1px solid #1e293b' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:6 }}>
            {METODOS.map(m => (
              <button key={m.id} onClick={() => { setMetodo(m.id); setReferencia(''); }}
                style={{ padding:'5px 4px', borderRadius:6, border:`1px solid ${metodo===m.id?m.color:'#334155'}`,
                  background:metodo===m.id?m.color+'22':'transparent', color:metodo===m.id?m.color:'#64748b',
                  cursor:'pointer', fontSize:10, fontWeight:metodo===m.id?700:400 }}>
                {m.label}
              </button>
            ))}
          </div>
          {metodo !== 'EFECTIVO' && (
            <input value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder={metodo==='TRANSFERENCIA'?'Clave rastreo (10+ dígitos)':'Últimos 4 dígitos'}
              style={{ width:'100%', padding:'6px 8px', borderRadius:6,
                border:`1px solid ${referencia.length>=(metodo==='TRANSFERENCIA'?10:4)?'#10b981':'#f87171'}`,
                background:'#0a0f1a', color:'#f1f5f9', fontSize:11, boxSizing:'border-box' }}/>
          )}
        </div>

        {/* Total y cobrar */}
        <div style={{ padding:12, borderTop:'1px solid #334155' }}>
          {error && <p style={{ fontSize:11, color:'#f87171', margin:'0 0 8px', textAlign:'center' }}>{error}</p>}
          {exito && <p style={{ fontSize:12, color:'#10b981', margin:'0 0 8px', textAlign:'center', fontWeight:700 }}>✅ ¡Registrado!</p>}
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, color:'#64748b' }}>Total</span>
            <span style={{ fontSize:22, fontWeight:800, color }}>
              {modo==='servicios'
                ? fmt(total)
                : membresiaId ? '★ Membresía' : fmt(resTotal)
              }
            </span>
          </div>
          <button onClick={cobrar}
            disabled={saleM.isPending || resM.isPending ||
              (modo==='servicios' && carrito.length===0) ||
              (modo==='reservacion' && !resForm.spaceId)}
            style={{ width:'100%', padding:12, borderRadius:10, border:'none',
              background: (modo==='servicios'&&carrito.length===0)||(modo==='reservacion'&&!resForm.spaceId) ? '#1e293b' : color,
              color: (modo==='servicios'&&carrito.length===0)||(modo==='reservacion'&&!resForm.spaceId) ? '#334155' : '#fff',
              cursor:'pointer', fontSize:14, fontWeight:700 }}>
            {saleM.isPending||resM.isPending ? 'Procesando…'
              : modo==='servicios' ? `COBRAR ${fmt(total)}`
              : membresiaId ? 'RESERVAR (Membresía)' : `COBRAR ${fmt(resTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
