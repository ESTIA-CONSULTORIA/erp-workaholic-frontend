import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const METODOS = [
  { id:'EFECTIVO',        label:'Efectivo',      color:'#10b981' },
  { id:'TRANSFERENCIA',   label:'Transferencia', color:'#06b6d4' },
  { id:'TARJETA_DEBITO',  label:'T. Débito',     color:'#3b82f6' },
  { id:'TARJETA_CREDITO', label:'T. Crédito',    color:'#8b5cf6' },
];

const SERVICIOS_FIJOS = [
  { id:'DIA_COWORKING',   name:'Día Coworking',      price:250, icon:'💻' },
  { id:'HORA_SALA',       name:'Hora Sala de Juntas', price:350, icon:'👥' },
  { id:'ESTACIONAMIENTO', name:'Estacionamiento día',  price:80,  icon:'🚗' },
  { id:'LOCKER',          name:'Locker (mes)',          price:150, icon:'🔒' },
  { id:'IMPRESION',       name:'Impresión (10 hojas)', price:25,  icon:'🖨' },
  { id:'CAFE',            name:'Café especial',         price:45,  icon:'☕' },
];

export default function WorkaholicPOSPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#6366f1';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [carrito,    setCarrito]    = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [metodo,     setMetodo]     = useState('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [exito,      setExito]      = useState(false);
  const [error,      setError]      = useState('');

  const { data: memberships = [] } = useQuery({
    queryKey: ['workaholic-memberships-activas', cid],
    queryFn:  () => api.get(`/companies/${cid}/workaholic/memberships?status=ACTIVA`).then(r=>r.data),
    enabled:  !!cid,
  });

  const total = carrito.reduce((t,l) => t + l.price * l.qty, 0);

  const agregar = (srv: any) => {
    setCarrito(c => {
      const ex = c.find(l => l.id === srv.id);
      if (ex) return c.map(l => l.id===srv.id ? {...l, qty:l.qty+1} : l);
      return [...c, { ...srv, qty:1 }];
    });
  };

  const cambiar = (id:string, delta:number) => {
    setCarrito(c => c.map(l => l.id===id ? {...l,qty:Math.max(0,l.qty+delta)} : l).filter(l=>l.qty>0));
  };

  const saleM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/workaholic/sales`, {
      date: new Date().toISOString(), clientName: clientName || null,
      paymentMethod: metodo, lines: carrito,
    }),
    onSuccess: () => {
      setExito(true); setCarrito([]); setClientName(''); setReferencia('');
      setTimeout(() => setExito(false), 3000);
      qc.invalidateQueries({ queryKey: ['workaholic-dashboard', cid] });
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error'),
  });

  const cobrar = () => {
    if (carrito.length === 0) { setError('Agrega al menos un servicio'); return; }
    if (['TARJETA_DEBITO','TARJETA_CREDITO'].includes(metodo) && referencia.length < 4) {
      setError('Ingresa los últimos 4 dígitos de autorización'); return;
    }
    if (metodo === 'TRANSFERENCIA' && referencia.length < 10) {
      setError('Ingresa la clave de rastreo (mín. 10 dígitos)'); return;
    }
    setError(''); saleM.mutate();
  };

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', background:'#0a0f1a', fontFamily:'system-ui,sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width:150, background:'#0f172a', borderRight:'1px solid #1e293b', display:'flex', flexDirection:'column', padding:10, gap:6 }}>
        <button onClick={() => navigate('/workaholic')}
          style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:11 }}>
          ← Salir
        </button>
        <div style={{ padding:'10px 4px', borderBottom:'1px solid #1e293b' }}>
          <p style={{ fontSize:13, fontWeight:800, color:'#f1f5f9', margin:0 }}>WORKAHOLIC</p>
          <p style={{ fontSize:9, color, margin:0, letterSpacing:1 }}>POS</p>
        </div>
      </div>

      {/* Servicios */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:12, borderBottom:'1px solid #1e293b' }}>
          <p style={{ fontSize:12, color:'#64748b', margin:0, fontWeight:600, textTransform:'uppercase' }}>Servicios disponibles</p>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, alignContent:'start' }}>
          {SERVICIOS_FIJOS.map(srv => (
            <div key={srv.id} onClick={() => agregar(srv)}
              style={{ background:'#0f172a', borderRadius:10, padding:14, cursor:'pointer', border:'1px solid #1e293b', textAlign:'center' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
              <p style={{ fontSize:24, margin:'0 0 8px' }}>{srv.icon}</p>
              <p style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', margin:'0 0 4px' }}>{srv.name}</p>
              <p style={{ fontSize:14, fontWeight:800, color, margin:0 }}>{fmt(srv.price)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ width:280, background:'#0f172a', borderLeft:'1px solid #1e293b', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid #1e293b' }}>
          <input value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="👤 Cliente / Empresa"
            style={{ width:'100%', padding:'6px 10px', borderRadius:7, border:'1px solid #1e293b', background:'#0a0f1a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>
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
                  <button onClick={() => cambiar(l.id,-1)} style={{ width:22,height:22,borderRadius:4,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:12 }}>−</button>
                  <span style={{ fontSize:12,color:'#94a3b8',minWidth:20,textAlign:'center' }}>{l.qty}</span>
                  <button onClick={() => cambiar(l.id,+1)} style={{ width:22,height:22,borderRadius:4,border:`1px solid ${color}`,background:color,color:'#fff',cursor:'pointer',fontSize:12 }}>+</button>
                </div>
              </div>
            ))
          }
        </div>

        {/* Método de pago */}
        <div style={{ padding:'8px 12px', borderTop:'1px solid #1e293b' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:6 }}>
            {METODOS.map(m => (
              <button key={m.id} onClick={() => { setMetodo(m.id); setReferencia(''); }}
                style={{ padding:'4px', borderRadius:6, border:`1px solid ${metodo===m.id?m.color:'#334155'}`,
                  background:metodo===m.id?m.color+'22':'transparent', color:metodo===m.id?m.color:'#64748b',
                  cursor:'pointer', fontSize:10, fontWeight:metodo===m.id?700:400 }}>
                {m.label}
              </button>
            ))}
          </div>
          {metodo !== 'EFECTIVO' && (
            <input value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder={metodo==='TRANSFERENCIA'?'Clave rastreo':'Últimos 4 dígitos'}
              style={{ width:'100%', padding:'5px 8px', borderRadius:6, border:`1px solid ${referencia.length>=(metodo==='TRANSFERENCIA'?10:4)?'#10b981':'#334155'}`, background:'#0a0f1a', color:'#f1f5f9', fontSize:11, boxSizing:'border-box' }}/>
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
            style={{ width:'100%', padding:12, borderRadius:10, border:'none',
              background:carrito.length===0?'#1e293b':color, color:carrito.length===0?'#334155':'#fff',
              cursor:carrito.length===0?'not-allowed':'pointer', fontSize:14, fontWeight:700 }}>
            {saleM.isPending ? 'Procesando…' : `COBRAR ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
