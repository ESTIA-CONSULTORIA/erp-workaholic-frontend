// ╔═══════════════════════════════════════════════════════════════╗
// ║  CobroModal — Componente compartido para TODOS los POS       ║
// ║  • Multipago (efectivo + tarjeta + transferencia)             ║
// ║  • Descuento con PIN de autorización                          ║
// ║  • Cambio automático con denominaciones                       ║
// ║  • Verificación CEP (SPEI)                                    ║
// ║  • Desglose de cómo y con qué denominaciones pagaron          ║
// ╚═══════════════════════════════════════════════════════════════╝
import { useState, useEffect, useRef } from 'react';
import { fmt } from '../lib/api';

export type MetodoPago = 'EFECTIVO'|'TARJETA_DEBITO'|'TARJETA_CREDITO'|'TRANSFERENCIA';

export interface PagoLine {
  method: MetodoPago;
  amount: number;
  reference?: string;
  denominaciones?: Record<number,number>; // billete → cantidad
}

interface CobroModalProps {
  total:         number;
  color:         string;
  clientName?:   string;
  allowCredit?:  boolean;
  clienteId?:    string;
  onCobrar:      (pagos: PagoLine[], nota: string) => void;
  onCancel:      () => void;
  loading?:      boolean;
  pinValidator?: (pin: string, descPct: number) => Promise<boolean>; // valida PIN de descuento
}

const METODOS = [
  { id:'EFECTIVO'        as MetodoPago, label:'Efectivo',      icon:'💵', color:'#10b981' },
  { id:'TARJETA_DEBITO'  as MetodoPago, label:'T. Débito',     icon:'💳', color:'#3b82f6' },
  { id:'TARJETA_CREDITO' as MetodoPago, label:'T. Crédito',    icon:'💳', color:'#8b5cf6' },
  { id:'TRANSFERENCIA'   as MetodoPago, label:'Transferencia', icon:'🏦', color:'#06b6d4' },
];

// Denominaciones MXN
const BILLETES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

// Verificar CEP en Banxico
async function verificarCEP(clave: string, monto: number, fecha: string): Promise<any> {
  try {
    const res = await fetch(
      `https://www.banxico.org.mx/cep/valida.do?clave=${encodeURIComponent(clave)}&monto=${monto}&fechaOp=${fecha}`,
      { mode: 'no-cors' }
    );
    // CORS blocked - just return the URL for manual verification
    return { url: `https://www.banxico.org.mx/cep/index.html` };
  } catch {
    return { url: 'https://www.banxico.org.mx/cep/index.html' };
  }
}

export default function CobroModal({
  total, color, clientName, allowCredit = false, clienteId,
  onCobrar, onCancel, loading = false, pinValidator,
}: CobroModalProps) {

  // ── Pago state ──────────────────────────────────────────────
  const [pagos, setPagos] = useState<PagoLine[]>([
    { method:'EFECTIVO', amount:total, reference:'', denominaciones:{} }
  ]);
  const [nota,       setNota]       = useState('');
  const [error,      setError]      = useState('');
  const [esCredito,  setEsCredito]  = useState(false);

  // ── Descuento con PIN ────────────────────────────────────────
  const [showDescuento, setShowDescuento] = useState(false);
  const [descPin,       setDescPin]       = useState('');
  const [descPct,       setDescPct]       = useState(0);
  const [descAmt,       setDescAmt]       = useState(0);
  const [pinError,      setPinError]      = useState('');
  const [pinLoading,    setPinLoading]    = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // ── CEP Verification ─────────────────────────────────────────
  const [showCEP, setShowCEP] = useState(false);
  const [cepClave, setCepClave] = useState('');
  const [cepFecha, setCepFecha] = useState(new Date().toISOString().slice(0,10));
  const [cepResult, setCepResult] = useState<any>(null);

  // ── Denominaciones visuales ──────────────────────────────────
  const [showDesglose, setShowDesglose] = useState(false);
  const [denomActual, setDenomActual] = useState<Record<number,number>>({});

  // ── Cálculos ─────────────────────────────────────────────────
  const descuento       = descAmt > 0 ? descAmt : (total * descPct / 100);
  const totalConDesc    = Math.max(0, total - descuento);
  const efectivoTotal   = pagos.filter(p=>p.method==='EFECTIVO').reduce((t,p)=>t+p.amount,0);
  const otrosTotal      = pagos.filter(p=>p.method!=='EFECTIVO').reduce((t,p)=>t+p.amount,0);
  const sumaPagos       = pagos.reduce((t,p)=>t+p.amount,0);
  const cambio          = Math.max(0, efectivoTotal - (totalConDesc - otrosTotal));
  const faltante        = Math.max(0, totalConDesc - sumaPagos);
  const cuadra          = Math.abs(sumaPagos - totalConDesc) < 0.01 || cambio > 0;

  // Total from denominaciones if user fills them in
  const totalDenoms = Object.entries(denomActual).reduce((t,[k,v])=>t+Number(k)*Number(v),0);

  // Sync first pago amount when total changes
  useEffect(() => {
    setPagos(ps => ps.map((p,i) => i===0 ? {...p, amount:totalConDesc} : p));
  }, [totalConDesc]);

  // ── Handlers ─────────────────────────────────────────────────
  const setMonto = (idx:number, amount:number) =>
    setPagos(ps=>ps.map((p,i)=>i===idx?{...p,amount:Math.max(0,amount)}:p));

  const setRef = (idx:number, reference:string) =>
    setPagos(ps=>ps.map((p,i)=>i===idx?{...p,reference}:p));

  const setMetodo = (idx:number, method:MetodoPago) =>
    setPagos(ps=>ps.map((p,i)=>i===idx?{...p,method,reference:'',denominaciones:{}}:p));

  const addPago = () =>
    setPagos(ps=>[...ps,{method:'EFECTIVO',amount:faltante>0?faltante:0,reference:'',denominaciones:{}}]);

  const removePago = (idx:number) => {
    if (pagos.length===1) return;
    setPagos(ps=>ps.filter((_,i)=>i!==idx));
  };

  const setExacto = (idx:number) => {
    const yaOtros = pagos.filter((_,i)=>i!==idx&&pagos[i]?.method!=='EFECTIVO').reduce((t,p)=>t+p.amount,0);
    setMonto(idx, totalConDesc - yaOtros);
  };

  const addDenom = (billete:number) => {
    setDenomActual(d=>({...d,[billete]:(d[billete]||0)+1}));
    // Update efectivo monto with denominations total
    const newTotal = Object.entries({...denomActual,[billete]:(denomActual[billete]||0)+1})
      .reduce((t,[k,v])=>t+Number(k)*Number(v),0);
    const efIdx = pagos.findIndex(p=>p.method==='EFECTIVO');
    if (efIdx>=0) setMonto(efIdx, newTotal);
  };

  const clearDenoms = () => {
    setDenomActual({});
    const efIdx = pagos.findIndex(p=>p.method==='EFECTIVO');
    if (efIdx>=0) setMonto(efIdx, 0);
  };

  // ── PIN descuento ─────────────────────────────────────────────
  const aplicarDescuentoPIN = async () => {
    if (!descPin || (!descPct && !descAmt)) {
      setPinError('Ingresa PIN y porcentaje o monto de descuento');
      return;
    }
    setPinLoading(true);
    try {
      if (pinValidator) {
        const ok = await pinValidator(descPin, descPct);
        if (!ok) { setPinError('PIN incorrecto'); setPinLoading(false); return; }
      } else {
        // Default: accept PIN 1234 (override via prop)
        if (descPin !== '1234') { setPinError('PIN incorrecto'); setPinLoading(false); return; }
      }
      setShowDescuento(false);
      setPinError('');
      setDescPin('');
    } catch {
      setPinError('Error al verificar PIN');
    }
    setPinLoading(false);
  };

  // ── CEP ──────────────────────────────────────────────────────
  const verificarCEPHandler = async () => {
    const result = await verificarCEP(cepClave, totalConDesc, cepFecha);
    setCepResult(result);
  };

  // ── Cobrar ───────────────────────────────────────────────────
  const cobrar = () => {
    setError('');
    if (esCredito) {
      if (!clienteId) { setError('Selecciona un cliente para venta a crédito'); return; }
      onCobrar([{method:'EFECTIVO', amount:0}], nota);
      return;
    }
    if (!cuadra) { setError(`Falta ${fmt(faltante)} por asignar`); return; }
    for (const p of pagos) {
      if (p.amount <= 0) continue;
      if (p.method==='TARJETA_DEBITO'||p.method==='TARJETA_CREDITO') {
        if (!p.reference||p.reference.trim().length<4) {
          setError('Ingresa los últimos 4 dígitos de la tarjeta'); return;
        }
      }
      if (p.method==='TRANSFERENCIA') {
        if (!p.reference||p.reference.trim().length<10) {
          setError('Ingresa la clave de rastreo SPEI (mín. 10 caracteres)'); return;
        }
      }
    }
    // Attach denominaciones to efectivo pago
    const pagosFinales = pagos
      .filter(p=>p.amount>0)
      .map(p=>p.method==='EFECTIVO'&&Object.keys(denomActual).length>0
        ? {...p, denominaciones:denomActual}
        : p
      );
    onCobrar(pagosFinales, nota);
  };

  const metColor = (id:string) => METODOS.find(m=>m.id===id)?.color||color;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
      <div style={{background:'#1e293b',borderRadius:14,padding:24,
        width:480,maxHeight:'94vh',overflowY:'auto',border:`1px solid ${color}44`}}>

        {/* ── Header ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:800,margin:0,color:'#f1f5f9'}}>Cobro</h2>
            {clientName&&<p style={{fontSize:12,color:'#64748b',margin:'2px 0 0'}}>{clientName}</p>}
          </div>
          <div style={{textAlign:'right'}}>
            {descuento>0&&<p style={{fontSize:11,color:'#f59e0b',margin:'0 0 2px'}}>-{fmt(descuento)} descuento</p>}
            <span style={{fontSize:28,fontWeight:800,color}}>{fmt(totalConDesc)}</span>
          </div>
        </div>

        {/* ── Descuento con PIN ── */}
        <div style={{marginBottom:12}}>
          {descuento>0 ? (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'8px 12px',background:'#f59e0b18',borderRadius:8,border:'1px solid #f59e0b33'}}>
              <span style={{fontSize:12,color:'#f59e0b',fontWeight:600}}>
                Descuento aplicado: {descPct>0?`${descPct}%`:fmt(descAmt)}
              </span>
              <button onClick={()=>{setDescPct(0);setDescAmt(0);}}
                style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:12}}>
                ✕ Quitar
              </button>
            </div>
          ) : (
            <button onClick={()=>{setShowDescuento(true);setTimeout(()=>pinRef.current?.focus(),100);}}
              style={{width:'100%',padding:'7px',borderRadius:8,border:'1px dashed #334155',
                background:'none',color:'#64748b',cursor:'pointer',fontSize:12}}>
              🔑 Aplicar descuento (requiere PIN)
            </button>
          )}
        </div>

        {/* ── Líneas de pago ── */}
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:10}}>
          {pagos.map((pago,idx)=>{
            const mc = metColor(pago.method);
            const needsRef = pago.method!=='EFECTIVO';
            const isEfect  = pago.method==='EFECTIVO';
            return (
              <div key={idx} style={{background:'#0f172a',borderRadius:10,padding:12,
                border:`1px solid ${mc}33`}}>
                {/* Selector método */}
                <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
                  {METODOS.map(m=>(
                    <button key={m.id} onClick={()=>setMetodo(idx,m.id)}
                      style={{padding:'4px 9px',borderRadius:6,fontSize:10,cursor:'pointer',
                        border:`1px solid ${pago.method===m.id?m.color:'#334155'}`,
                        background:pago.method===m.id?m.color+'22':'transparent',
                        color:pago.method===m.id?m.color:'#64748b',
                        fontWeight:pago.method===m.id?700:400}}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                {/* Monto */}
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:needsRef?8:0}}>
                  <label style={{fontSize:11,color:'#64748b',minWidth:46}}>Monto</label>
                  <input type="number" value={pago.amount||''} min={0}
                    onChange={e=>setMonto(idx,Number(e.target.value))}
                    style={{flex:1,padding:'7px 10px',borderRadius:7,
                      border:`1px solid ${mc}55`,background:'#1e293b',
                      color:'#f1f5f9',fontSize:14,fontWeight:700,textAlign:'right'}}/>
                  {isEfect&&(
                    <button onClick={()=>setExacto(idx)}
                      style={{padding:'6px 10px',borderRadius:7,border:`1px solid ${color}`,
                        background:'none',color,cursor:'pointer',fontSize:11,whiteSpace:'nowrap'}}>
                      Exacto
                    </button>
                  )}
                  {pagos.length>1&&(
                    <button onClick={()=>removePago(idx)}
                      style={{padding:'6px',borderRadius:7,border:'1px solid #f87171',
                        background:'none',color:'#f87171',cursor:'pointer',fontSize:11}}>✕</button>
                  )}
                </div>

                {/* Referencia */}
                {needsRef&&(
                  <div>
                    <input
                      placeholder={pago.method==='TRANSFERENCIA'?'Clave rastreo SPEI (22+ dígitos)':'Últimos 4 dígitos auth'}
                      value={pago.reference||''}
                      onChange={e=>setRef(idx,e.target.value)}
                      style={{width:'100%',padding:'7px 10px',borderRadius:7,boxSizing:'border-box',
                        border:`1px solid ${(pago.reference?.length||0)>=(pago.method==='TRANSFERENCIA'?10:4)?'#10b981':'#f87171'}`,
                        background:'#1e293b',color:'#f1f5f9',fontSize:12}}/>
                    {pago.method==='TRANSFERENCIA'&&pago.reference&&pago.reference.length>=10&&(
                      <button onClick={()=>{setCepClave(pago.reference||'');setShowCEP(true);}}
                        style={{marginTop:4,padding:'4px 10px',borderRadius:6,border:'1px solid #06b6d4',
                          background:'none',color:'#06b6d4',cursor:'pointer',fontSize:10}}>
                        🏦 Verificar CEP en Banxico
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Agregar método ── */}
        {faltante>0.01&&(
          <button onClick={addPago}
            style={{width:'100%',padding:'7px',borderRadius:8,border:'1px dashed #334155',
              background:'none',color:'#64748b',cursor:'pointer',fontSize:12,marginBottom:10}}>
            + Agregar otro método ({fmt(faltante)} restante)
          </button>
        )}

        {/* ── Denominaciones efectivo ── */}
        {pagos.some(p=>p.method==='EFECTIVO')&&(
          <div style={{marginBottom:10}}>
            <button onClick={()=>setShowDesglose(v=>!v)}
              style={{width:'100%',padding:'6px',borderRadius:7,border:'1px solid #334155',
                background:'none',color:'#64748b',cursor:'pointer',fontSize:11,marginBottom:6}}>
              {showDesglose?'▲':'▼'} Desglose de denominaciones
              {Object.keys(denomActual).length>0&&` (${fmt(totalDenoms)} capturado)`}
            </button>
            {showDesglose&&(
              <div style={{background:'#0f172a',borderRadius:10,padding:12}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:8}}>
                  {BILLETES.map(b=>(
                    <div key={b} style={{textAlign:'center'}}>
                      <button onClick={()=>addDenom(b)}
                        style={{width:'100%',padding:'6px 2px',borderRadius:7,
                          border:`1px solid ${denomActual[b]?color:'#334155'}`,
                          background:denomActual[b]?color+'22':'transparent',
                          color:denomActual[b]?color:'#64748b',cursor:'pointer',
                          fontSize:11,fontWeight:700}}>
                        ${b}
                      </button>
                      {denomActual[b]>0&&(
                        <p style={{fontSize:10,color:'#94a3b8',margin:'2px 0 0'}}>
                          x{denomActual[b]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {Object.keys(denomActual).length>0&&(
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:12,color:'#94a3b8'}}>
                      Total capturado: <strong style={{color}}>{fmt(totalDenoms)}</strong>
                    </span>
                    <button onClick={clearDenoms}
                      style={{padding:'3px 8px',borderRadius:5,border:'1px solid #334155',
                        background:'none',color:'#64748b',cursor:'pointer',fontSize:10}}>
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Cambio ── */}
        {cambio>0.01&&(
          <div style={{background:'#10b98122',border:'1px solid #10b98144',borderRadius:9,
            padding:'10px 14px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <span style={{fontSize:14,color:'#10b981',fontWeight:700}}>💵 Cambio</span>
              {Object.keys(denomActual).length>0&&(
                <p style={{fontSize:10,color:'#64748b',margin:'2px 0 0'}}>
                  Recibido: {fmt(totalDenoms||efectivoTotal)}
                </p>
              )}
            </div>
            <span style={{fontSize:22,fontWeight:800,color:'#10b981'}}>{fmt(cambio)}</span>
          </div>
        )}

        {/* ── Venta a crédito ── */}
        {allowCredit&&(
          <label style={{display:'flex',gap:8,alignItems:'center',
            fontSize:12,color:'#f59e0b',cursor:'pointer',marginBottom:10}}>
            <input type="checkbox" checked={esCredito} onChange={e=>setEsCredito(e.target.checked)}
              style={{accentColor:'#f59e0b'}}/>
            Registrar como venta a crédito (genera CxC)
          </label>
        )}

        {/* ── Nota ── */}
        <input placeholder="Nota u observación (opcional)" value={nota}
          onChange={e=>setNota(e.target.value)}
          style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #334155',
            background:'#0f172a',color:'#f1f5f9',fontSize:12,
            marginBottom:10,boxSizing:'border-box'}}/>

        {/* ── Error ── */}
        {error&&(
          <p style={{fontSize:12,color:'#f87171',margin:'0 0 10px',
            background:'rgba(248,113,113,0.1)',padding:'8px 12px',borderRadius:7}}>
            ⚠ {error}
          </p>
        )}

        {/* ── Resumen + botones ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div>
            <p style={{fontSize:11,color:'#64748b',margin:0}}>Total a cobrar</p>
            <p style={{fontSize:20,fontWeight:800,color,margin:0}}>{fmt(totalConDesc)}</p>
          </div>
          {sumaPagos>totalConDesc+0.01&&(
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:11,color:'#64748b',margin:0}}>Recibido</p>
              <p style={{fontSize:16,fontWeight:700,color:'#f1f5f9',margin:0}}>{fmt(sumaPagos)}</p>
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:8}}>
          <button onClick={onCancel}
            style={{flex:1,padding:'11px',borderRadius:9,border:'1px solid #334155',
              background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>
            Cancelar
          </button>
          <button onClick={cobrar} disabled={loading||(!esCredito&&!cuadra)}
            style={{flex:2,padding:'11px',borderRadius:9,border:'none',
              background:(!esCredito&&!cuadra)?'#334155':color,
              color:(!esCredito&&!cuadra)?'#64748b':'#fff',
              cursor:(!esCredito&&!cuadra)?'not-allowed':'pointer',
              fontSize:14,fontWeight:800}}>
            {loading?'Procesando…':esCredito?`CRÉDITO ${fmt(totalConDesc)}`:`COBRAR ${fmt(totalConDesc)}`}
          </button>
        </div>
      </div>

      {/* ── Modal: Descuento PIN ── */}
      {showDescuento&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000}}>
          <div style={{background:'#1e293b',borderRadius:14,padding:24,width:320,
            border:`1px solid #f59e0b44`}}>
            <h3 style={{fontSize:15,fontWeight:800,margin:'0 0 16px',color:'#f59e0b'}}>
              🔑 Autorizar descuento
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>% Descuento</label>
                <input type="number" min={0} max={100} value={descPct||''}
                  onChange={e=>{setDescPct(Number(e.target.value));setDescAmt(0);}}
                  placeholder="Ej: 10"
                  style={{width:'100%',padding:'8px 12px',borderRadius:7,border:'1px solid #334155',
                    background:'#0f172a',color:'#f1f5f9',fontSize:14,fontWeight:700,boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>O monto fijo $</label>
                <input type="number" min={0} value={descAmt||''}
                  onChange={e=>{setDescAmt(Number(e.target.value));setDescPct(0);}}
                  placeholder="Ej: 50.00"
                  style={{width:'100%',padding:'8px 12px',borderRadius:7,border:'1px solid #334155',
                    background:'#0f172a',color:'#f1f5f9',fontSize:14,boxSizing:'border-box'}}/>
              </div>
              {(descPct>0||descAmt>0)&&(
                <p style={{fontSize:13,color:'#f59e0b',fontWeight:700,margin:0}}>
                  Descuento: {fmt(descAmt>0?descAmt:total*descPct/100)}
                  {' → '}Total: {fmt(Math.max(0,total-(descAmt>0?descAmt:total*descPct/100)))}
                </p>
              )}
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>PIN de autorización *</label>
                <input ref={pinRef} type="password" value={descPin}
                  onChange={e=>setDescPin(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&aplicarDescuentoPIN()}
                  placeholder="••••"
                  style={{width:'100%',padding:'10px 12px',borderRadius:7,border:'1px solid #334155',
                    background:'#0f172a',color:'#f1f5f9',fontSize:20,letterSpacing:6,
                    textAlign:'center',boxSizing:'border-box'}}/>
              </div>
              {pinError&&<p style={{fontSize:12,color:'#f87171',margin:0}}>⚠ {pinError}</p>}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setShowDescuento(false);setDescPin('');setPinError('');}}
                style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid #334155',
                  background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>
                Cancelar
              </button>
              <button onClick={aplicarDescuentoPIN} disabled={pinLoading||!descPin||(!descPct&&!descAmt)}
                style={{flex:1,padding:'9px',borderRadius:8,border:'none',
                  background:'#f59e0b',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>
                {pinLoading?'Verificando…':'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: CEP Verificación ── */}
      {showCEP&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000}}>
          <div style={{background:'#1e293b',borderRadius:14,padding:24,width:400,
            border:'1px solid #06b6d444'}}>
            <h3 style={{fontSize:15,fontWeight:800,margin:'0 0 4px',color:'#06b6d4'}}>
              🏦 Verificar CEP Banxico
            </h3>
            <p style={{fontSize:12,color:'#64748b',margin:'0 0 16px'}}>
              Comprobante Electrónico de Pago SPEI
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>
                  Clave de rastreo SPEI
                </label>
                <input value={cepClave} onChange={e=>setCepClave(e.target.value)}
                  style={{width:'100%',padding:'8px 12px',borderRadius:7,border:'1px solid #334155',
                    background:'#0f172a',color:'#f1f5f9',fontSize:13,boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha de operación</label>
                <input type="date" value={cepFecha} onChange={e=>setCepFecha(e.target.value)}
                  style={{width:'100%',padding:'8px 12px',borderRadius:7,border:'1px solid #334155',
                    background:'#0f172a',color:'#f1f5f9',fontSize:13,boxSizing:'border-box'}}/>
              </div>
            </div>
            {cepResult&&(
              <div style={{background:'#06b6d418',borderRadius:8,padding:12,marginBottom:12}}>
                <p style={{fontSize:12,color:'#06b6d4',margin:'0 0 8px',fontWeight:600}}>
                  Verificar en Banxico:
                </p>
                <a href={cepResult.url} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:12,color:'#06b6d4',wordBreak:'break-all'}}>
                  {cepResult.url}
                </a>
                <p style={{fontSize:10,color:'#475569',margin:'6px 0 0'}}>
                  Debido a restricciones de seguridad del navegador, debes abrir el
                  enlace de Banxico directamente e ingresar la clave de rastreo.
                </p>
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setShowCEP(false);setCepResult(null);}}
                style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid #334155',
                  background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>
                Cerrar
              </button>
              <button onClick={verificarCEPHandler}
                style={{flex:1,padding:'9px',borderRadius:8,border:'none',
                  background:'#06b6d4',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>
                Verificar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
