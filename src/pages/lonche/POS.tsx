import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const CAT_COLOR: Record<string,string> = {
  DESAYUNO:'#f59e0b', LUNCH:'#10b981', SNACK:'#8b5cf6',
  BEBIDA:'#3b82f6', DULCE:'#f87171', OTRO:'#64748b',
};

export default function LonchePOS() {
  const { activeCompany } = useERPStore();
  const cid    = activeCompany?.companyId;
  const color  = activeCompany?.color || '#f97316';
  const qc     = useQueryClient();
  const navigate = useNavigate();
  const scanRef = useRef<HTMLInputElement>(null);

  const [turno,       setTurno]       = useState<any>(null);
  const [carrito,     setCarrito]     = useState<any[]>([]);
  const [student,     setStudent]     = useState<any>(null);
  const [scanCode,    setScanCode]    = useState('');
  const [metodo,      setMetodo]      = useState<'EFECTIVO'|'PREPAGO'|'MIXTO'>('EFECTIVO');
  const [categoria,   setCategoria]   = useState('Todos');
  const [busqueda,    setBusqueda]    = useState('');
  const [error,       setError]       = useState('');
  const [exito,       setExito]       = useState('');
  const [showCerrar,  setShowCerrar]  = useState(false);
  const [efectivoDecl,setEfectivoDecl]= useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['lonche-products', cid],
    queryFn:  () => api.get(`/companies/${cid}/lonche/products`).then(r=>r.data),
    enabled:  !!cid,
  });

  // Cargar turno activo
  useEffect(() => {
    if (!cid) return;
    api.get(`/companies/${cid}/lonche/turnos/activo`)
      .then(r => setTurno(r.data))
      .catch(() => setTurno(null));
  }, [cid]);

  const abrirM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/lonche/turnos/abrir`, { cajeroName: activeCompany?.companyName }),
    onSuccess: (d:any) => { setTurno(d.data); setExito('Turno abierto'); setTimeout(()=>setExito(''),2000); },
    onError: (e:any) => setError(e.response?.data?.message || 'Error'),
  });

  const cerrarM = useMutation({
    mutationFn: () => api.put(`/companies/${cid}/lonche/turnos/${turno.id}/cerrar`, {
      efectivoDeclarado: Number(efectivoDecl), notas: '',
    }),
    onSuccess: (d:any) => {
      setShowCerrar(false);
      const dif = Number(d.data?.diferencia || 0);
      setExito(`Turno cerrado. Diferencia: ${fmt(dif)}`);
      setTurno(null);
    },
    onError: (e:any) => setError(e.response?.data?.message || 'Error'),
  });

  const ventaM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/lonche/turnos/${turno.id}/ventas`, {
      items: carrito.map(l => ({ productId: l.id, qty: l.qty })),
      paymentMethod: metodo,
      studentId:   student?.id   || null,
      studentName: student?.name || null,
    }),
    onSuccess: () => {
      setExito('¡Venta registrada!');
      setCarrito([]); setStudent(null); setScanCode(''); setMetodo('EFECTIVO');
      setTimeout(()=>setExito(''),2500);
      qc.invalidateQueries({ queryKey: ['lonche-dashboard', cid] });
      scanRef.current?.focus();
    },
    onError: (e:any) => { setError(e.response?.data?.message || 'Error'); setTimeout(()=>setError(''),4000); },
  });

  // Scan QR/barcode
  const buscarAlumno = async (code: string) => {
    if (!code.trim()) return;
    try {
      const r = await api.get(`/companies/${cid}/lonche/students/by-code/${code.trim()}`);
      if (r.data) { setStudent(r.data); setMetodo('PREPAGO'); setError(''); }
      else setError('Alumno no encontrado');
    } catch { setError('Alumno no encontrado'); }
    setScanCode('');
  };

  const total     = carrito.reduce((t,l) => t+l.price*l.qty, 0);
  const cashback  = carrito.reduce((t,l) => t+l.price*l.qty*(l.cashbackPct/100), 0);
  const saldoDisp = student ? Number(student.balance)+Number(student.cashback) : 0;

  const agregar = (p: any) => {
    setCarrito(c => {
      const ex = c.find(l=>l.id===p.id);
      if (ex) return c.map(l=>l.id===p.id?{...l,qty:l.qty+1}:l);
      return [...c, { id:p.id, name:p.name, price:Number(p.price), qty:1, cashbackPct:Number(p.cashbackPct||0), icon:'🍱' }];
    });
  };

  const categorias = ['Todos', ...Array.from(new Set((products as any[]).map((p:any)=>p.category)))];
  const filtered = (products as any[]).filter(p =>
    (categoria==='Todos'||p.category===categoria) &&
    (!busqueda||p.name.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0f1a', fontFamily:'system-ui,sans-serif', display:'flex', flexDirection:'column' }}>

      {/* Top bar */}
      <div style={{ height:44, background:'#0f172a', borderBottom:'1px solid #1e293b',
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button onClick={() => navigate('/lonche')}
            style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>← Salir</button>
          <span style={{ fontSize:13, fontWeight:800, color:'#f1f5f9' }}>LONCHE POS</span>
          {turno ? (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#10b98122', color:'#10b981' }}>
              ● Turno abierto
            </span>
          ) : (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#f8717122', color:'#f87171' }}>
              ● Sin turno activo
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {!turno && (
            <button onClick={() => abrirM.mutate()} disabled={abrirM.isPending}
              style={{ padding:'5px 14px', borderRadius:7, border:'none', background:'#10b981', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              Abrir turno
            </button>
          )}
          {turno && (
            <button onClick={() => setShowCerrar(true)}
              style={{ padding:'5px 14px', borderRadius:7, border:'1px solid #f87171', background:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
              Cerrar turno
            </button>
          )}
        </div>
      </div>

      {!turno ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
          <p style={{ fontSize:48 }}>🏪</p>
          <p style={{ fontSize:18, fontWeight:700, color:'#f1f5f9' }}>No hay turno activo</p>
          <p style={{ fontSize:13, color:'#64748b' }}>Abre un turno para comenzar a vender</p>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Sidebar categorías */}
          <div style={{ width:100, background:'#0f172a', borderRight:'1px solid #1e293b',
            display:'flex', flexDirection:'column', padding:8, gap:4 }}>
            {categorias.map(cat => (
              <button key={cat} onClick={() => setCategoria(cat)}
                style={{ padding:'8px 6px', borderRadius:8, border:'none', cursor:'pointer', fontSize:10,
                  fontWeight:600, textAlign:'center',
                  background:categoria===cat?(CAT_COLOR[cat]||color)+'33':'transparent',
                  color:categoria===cat?(CAT_COLOR[cat]||color):'#64748b' }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Catálogo */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'8px 12px', borderBottom:'1px solid #1e293b' }}>
              <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                style={{ width:'100%', padding:'6px 10px', borderRadius:7, border:'1px solid #1e293b',
                  background:'#0f172a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:10,
              display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, alignContent:'start' }}>
              {filtered.map((p:any) => (
                <div key={p.id} onClick={() => agregar(p)}
                  style={{ background:'#0f172a', borderRadius:9, padding:10, cursor:'pointer',
                    border:`1px solid ${carrito.find(l=>l.id===p.id)?color:'#1e293b'}`,
                    position:'relative', transition:'border-color 0.1s' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLOR[p.category]||'#64748b',
                    position:'absolute', top:6, right:6 }}/>
                  <p style={{ fontSize:11, fontWeight:600, color:'#f1f5f9', margin:'0 0 4px', lineHeight:1.3 }}>{p.name}</p>
                  <p style={{ fontSize:13, fontWeight:800, color, margin:'0 0 2px' }}>{fmt(p.price)}</p>
                  {Number(p.cashbackPct) > 0 && (
                    <p style={{ fontSize:9, color:'#f59e0b', margin:0 }}>★ {p.cashbackPct}% cashback</p>
                  )}
                  {carrito.find(l=>l.id===p.id) && (
                    <div style={{ position:'absolute', bottom:4, right:6, background:color,
                      borderRadius:99, width:18, height:18, display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff' }}>
                      {carrito.find(l=>l.id===p.id)?.qty}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel derecho */}
          <div style={{ width:280, background:'#0f172a', borderLeft:'1px solid #1e293b', display:'flex', flexDirection:'column' }}>

            {/* Scanner QR */}
            <div style={{ padding:'8px 10px', borderBottom:'1px solid #1e293b' }}>
              <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px', textTransform:'uppercase' }}>
                Escanear alumno / QR
              </p>
              <div style={{ display:'flex', gap:6 }}>
                <input ref={scanRef} value={scanCode} onChange={e=>setScanCode(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') buscarAlumno(scanCode); }}
                  placeholder="Código o nombre..."
                  style={{ flex:1, padding:'6px 8px', borderRadius:7, border:`1px solid ${student?'#10b981':'#334155'}`,
                    background:'#0a0f1a', color:'#f1f5f9', fontSize:12, outline:'none' }}/>
                <button onClick={() => buscarAlumno(scanCode)}
                  style={{ padding:'6px 10px', borderRadius:7, border:`1px solid ${color}`,
                    background:'none', color, cursor:'pointer', fontSize:11 }}>🔍</button>
              </div>
              {student && (
                <div style={{ marginTop:6, padding:'6px 8px', background:'#10b98111', borderRadius:7,
                  border:'1px solid #10b98144', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:'#10b981', margin:0 }}>{student.name}</p>
                    <p style={{ fontSize:10, color:'#64748b', margin:0 }}>{student.grade} · Saldo: {fmt(saldoDisp)}</p>
                  </div>
                  <button onClick={() => { setStudent(null); setMetodo('EFECTIVO'); }}
                    style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:14 }}>✕</button>
                </div>
              )}
            </div>

            {/* Carrito */}
            <div style={{ flex:1, overflowY:'auto', padding:8 }}>
              {carrito.length===0
                ? <p style={{ color:'#334155', textAlign:'center', marginTop:30, fontSize:12 }}>
                    Selecciona productos
                  </p>
                : carrito.map(l => (
                  <div key={l.id} style={{ padding:'6px 0', borderBottom:'1px solid #1e293b' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:12, color:'#f1f5f9', flex:1 }}>{l.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color }}>{fmt(l.price*l.qty)}</span>
                    </div>
                    <div style={{ display:'flex', gap:5, alignItems:'center', marginTop:3 }}>
                      <button onClick={() => setCarrito(c=>c.map(x=>x.id===l.id?{...x,qty:Math.max(0,x.qty-1)}:x).filter(x=>x.qty>0))}
                        style={{ width:20,height:20,borderRadius:4,border:'1px solid #334155',background:'none',color:'#f1f5f9',cursor:'pointer',fontSize:11 }}>−</button>
                      <span style={{ fontSize:12,color:'#94a3b8',minWidth:20,textAlign:'center' }}>{l.qty}</span>
                      <button onClick={() => setCarrito(c=>c.map(x=>x.id===l.id?{...x,qty:x.qty+1}:x))}
                        style={{ width:20,height:20,borderRadius:4,border:`1px solid ${color}`,background:color,color:'#fff',cursor:'pointer',fontSize:11 }}>+</button>
                      {l.cashbackPct > 0 && <span style={{ fontSize:9,color:'#f59e0b',marginLeft:'auto' }}>★ {fmt(l.price*l.qty*l.cashbackPct/100)}</span>}
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Método pago */}
            <div style={{ padding:'8px 10px', borderTop:'1px solid #1e293b' }}>
              <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                {(['EFECTIVO','PREPAGO','MIXTO'] as const).map(m => (
                  <button key={m} onClick={() => setMetodo(m)}
                    disabled={m!=='EFECTIVO' && !student}
                    style={{ flex:1, padding:'5px', borderRadius:6, border:`1px solid ${metodo===m?color:'#334155'}`,
                      background:metodo===m?color+'22':'transparent', color:metodo===m?color:(m!=='EFECTIVO'&&!student)?'#1e293b':'#64748b',
                      cursor:m!=='EFECTIVO'&&!student?'not-allowed':'pointer', fontSize:10, fontWeight:metodo===m?700:400 }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Total y cobrar */}
            <div style={{ padding:'10px 10px', borderTop:'1px solid #334155' }}>
              {error && <p style={{ fontSize:11,color:'#f87171',margin:'0 0 6px',textAlign:'center' }}>{error}</p>}
              {exito && <p style={{ fontSize:12,color:'#10b981',margin:'0 0 6px',textAlign:'center',fontWeight:700 }}>✅ {exito}</p>}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Total</span>
                <span style={{ fontSize:20, fontWeight:800, color }}>{fmt(total)}</span>
              </div>
              {cashback > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:10, color:'#f59e0b' }}>★ Cashback</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'#f59e0b' }}>+{fmt(cashback)}</span>
                </div>
              )}
              <button onClick={() => ventaM.mutate()}
                disabled={ventaM.isPending || carrito.length===0}
                style={{ width:'100%', padding:11, borderRadius:9, border:'none',
                  background:carrito.length===0?'#1e293b':color,
                  color:carrito.length===0?'#334155':'#fff',
                  cursor:carrito.length===0?'not-allowed':'pointer', fontSize:14, fontWeight:700 }}>
                {ventaM.isPending ? 'Procesando…' : `COBRAR ${fmt(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cerrar turno */}
      {showCerrar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:360, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 8px' }}>Cerrar turno</h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 16px' }}>
              Cuenta el efectivo en caja y declara el total.
            </p>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
              Efectivo contado *
            </label>
            <input type="number" className="input-base" style={{ fontSize:16, fontWeight:700, marginBottom:16, textAlign:'center' }}
              value={efectivoDecl} onChange={e=>setEfectivoDecl(e.target.value)} placeholder="$0.00" autoFocus/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowCerrar(false)}
                style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={() => cerrarM.mutate()} disabled={cerrarM.isPending || !efectivoDecl}
                style={{ flex:1, padding:'8px', borderRadius:8, border:'none',
                  background:'#f87171', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                {cerrarM.isPending ? 'Cerrando…' : 'Cerrar turno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
