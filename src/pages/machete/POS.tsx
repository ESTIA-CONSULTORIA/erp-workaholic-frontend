import AppLayout from '../../components/layout/AppLayout';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

import React from 'react';

class POSErrorBoundary extends React.Component<{children:React.ReactNode},{error:string|null}> {
  constructor(props: any) { super(props); this.state = {error: null}; }
  static getDerivedStateFromError(e: Error) { return {error: e.message}; }
  render() {
    if (this.state.error) {
      return (
        <div style={{position:'fixed',inset:0,background:'#0a0f1a',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
          <p style={{color:'#f87171',fontSize:18,fontWeight:700}}>Error en POS</p>
          <pre style={{color:'#fca5a5',fontSize:12,maxWidth:600,whiteSpace:'pre-wrap',background:'#1e293b',padding:16,borderRadius:8}}>{this.state.error}</pre>
          <button onClick={()=>window.location.reload()} style={{padding:'8px 20px',background:'#B5451B',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CANALES = [
  { id:'MOSTRADOR', label:'Tienda',      color:'#3b82f6', priceKey:'priceMostrador' },
  { id:'MAYOREO',   label:'Mayoreo',     color:'#f59e0b', priceKey:'priceMayoreo'   },
  { id:'ONLINE',    label:'Distribuidor',color:'#8b5cf6', priceKey:'priceOnline'    },
  { id:'ML',        label:'Online',      color:'#10b981', priceKey:'priceML'        },
];
const TIPO_LABELS: Record<string,string>  = { RES:'Res', CER:'Cerdo' };
const SABOR_LABELS: Record<string,string> = { NAT:'Natural', CHI:'Chile', BBQ:'BBQ' };
const DENOMINACIONES = [500,200,100,50,20,10,5,2,1,0.5];

const METODOS_PAGO = [
  { id:'EFECTIVO',        label:'Efectivo',        color:'#10b981' },
  { id:'TARJETA_DEBITO',  label:'Tarjeta débito',  color:'#3b82f6' },
  { id:'TARJETA_CREDITO', label:'Tarjeta crédito', color:'#8b5cf6' },
  { id:'TRANSFERENCIA',   label:'Transferencia',   color:'#06b6d4' },
];

// SVG ilustrativo de voucher de tarjeta
const VoucherTarjetaSVG = () => (
  <svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" style={{width:180,height:230}}>
    <rect x="10" y="10" width="180" height="240" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5"/>
    <rect x="10" y="10" width="180" height="36" rx="6" fill="#0f172a"/>
    <rect x="10" y="34" width="180" height="12" fill="#0f172a"/>
    <text x="100" y="32" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">COMPROBANTE DE PAGO</text>
    <text x="100" y="58" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">TARJETA DÉBITO/CRÉDITO</text>
    <line x1="25" y1="68" x2="175" y2="68" stroke="#334155" strokeWidth="0.8"/>
    <text x="25" y="82" fill="#64748b" fontSize="7" fontFamily="monospace">FECHA</text>
    <text x="130" y="82" fill="#94a3b8" fontSize="7" fontFamily="monospace">16/04/2026  11:32</text>
    <text x="25" y="96" fill="#64748b" fontSize="7" fontFamily="monospace">COMERCIO</text>
    <text x="130" y="96" fill="#94a3b8" fontSize="7" fontFamily="monospace">MACHETE SA</text>
    <text x="25" y="110" fill="#64748b" fontSize="7" fontFamily="monospace">TARJETA</text>
    <text x="130" y="110" fill="#94a3b8" fontSize="7" fontFamily="monospace">**** **** **** 4821</text>
    <text x="25" y="124" fill="#64748b" fontSize="7" fontFamily="monospace">TIPO</text>
    <text x="130" y="124" fill="#94a3b8" fontSize="7" fontFamily="monospace">CHIP</text>
    <line x1="25" y1="132" x2="175" y2="132" stroke="#334155" strokeWidth="0.8"/>
    <text x="25" y="146" fill="#64748b" fontSize="7" fontFamily="monospace">MONTO</text>
    <text x="130" y="146" fill="#f1f5f9" fontSize="9" fontFamily="monospace" fontWeight="bold">$800.00 MXN</text>
    <line x1="25" y1="154" x2="175" y2="154" stroke="#334155" strokeWidth="0.8"/>
    {/* Highlight box for NO. AUTORIZACIÓN */}
    <rect x="20" y="160" width="160" height="28" rx="4" fill="#B5451B22" stroke="#B5451B" strokeWidth="1.5"/>
    <text x="28" y="171" fill="#B5451B" fontSize="7" fontFamily="monospace" fontWeight="bold">NO. AUTORIZACIÓN</text>
    <text x="28" y="182" fill="#f97316" fontSize="11" fontFamily="monospace" fontWeight="bold">123456</text>
    {/* Arrow pointing to it */}
    <path d="M 155 145 L 165 158 L 155 158" fill="none" stroke="#B5451B" strokeWidth="1.5"/>
    <text x="158" y="153" fill="#B5451B" fontSize="7" fontFamily="monospace">←</text>
    <text x="25" y="205" fill="#64748b" fontSize="7" fontFamily="monospace">NO. REFERENCIA</text>
    <text x="130" y="205" fill="#94a3b8" fontSize="8" fontFamily="monospace">78901234</text>
    <text x="25" y="219" fill="#64748b" fontSize="7" fontFamily="monospace">RESPUESTA</text>
    <text x="130" y="219" fill="#10b981" fontSize="7" fontFamily="monospace">APROBADO</text>
    <line x1="25" y1="228" x2="175" y2="228" stroke="#334155" strokeWidth="0.8"/>
    <text x="100" y="240" textAnchor="middle" fill="#475569" fontSize="6" fontFamily="monospace">CONSERVE ESTE COMPROBANTE</text>
    {/* Label */}
    <text x="100" y="258" textAnchor="middle" fill="#B5451B" fontSize="7" fontFamily="monospace" fontWeight="bold">↑ Ingresa el No. Autorización</text>
  </svg>
);

// SVG ilustrativo de comprobante SPEI
const VoucherSPEISVG = () => (
  <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" style={{width:180,height:250}}>
    <rect x="10" y="10" width="180" height="260" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5"/>
    <rect x="10" y="10" width="180" height="36" rx="6" fill="#0f172a"/>
    <rect x="10" y="34" width="180" height="12" fill="#0f172a"/>
    <text x="100" y="30" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">COMPROBANTE SPEI</text>
    <text x="100" y="54" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">TRANSFERENCIA ELECTRÓNICA</text>
    <line x1="25" y1="64" x2="175" y2="64" stroke="#334155" strokeWidth="0.8"/>
    <text x="25" y="76" fill="#64748b" fontSize="7" fontFamily="monospace">FECHA</text>
    <text x="115" y="76" fill="#94a3b8" fontSize="7" fontFamily="monospace">16/04/2026  11:32</text>
    <text x="25" y="88" fill="#64748b" fontSize="7" fontFamily="monospace">BANCO ORIGEN</text>
    <text x="115" y="88" fill="#94a3b8" fontSize="7" fontFamily="monospace">BBVA MEXICO</text>
    <text x="25" y="100" fill="#64748b" fontSize="7" fontFamily="monospace">CUENTA ORIGEN</text>
    <text x="115" y="100" fill="#94a3b8" fontSize="7" fontFamily="monospace">**** 4821</text>
    <text x="25" y="112" fill="#64748b" fontSize="7" fontFamily="monospace">BANCO DESTINO</text>
    <text x="115" y="112" fill="#94a3b8" fontSize="7" fontFamily="monospace">BANAMEX</text>
    <text x="25" y="124" fill="#64748b" fontSize="7" fontFamily="monospace">CUENTA DESTINO</text>
    <text x="115" y="124" fill="#94a3b8" fontSize="7" fontFamily="monospace">**** 9032</text>
    <line x1="25" y1="132" x2="175" y2="132" stroke="#334155" strokeWidth="0.8"/>
    <text x="25" y="144" fill="#64748b" fontSize="7" fontFamily="monospace">MONTO</text>
    <text x="115" y="144" fill="#f1f5f9" fontSize="9" fontFamily="monospace" fontWeight="bold">$800.00 MXN</text>
    <line x1="25" y1="152" x2="175" y2="152" stroke="#334155" strokeWidth="0.8"/>
    <text x="25" y="164" fill="#64748b" fontSize="7" fontFamily="monospace">CONCEPTO</text>
    <text x="115" y="164" fill="#94a3b8" fontSize="7" fontFamily="monospace">PAGO MACHETE</text>
    {/* Highlight box for CLAVE RASTREO */}
    <rect x="20" y="170" width="160" height="32" rx="4" fill="#06b6d422" stroke="#06b6d4" strokeWidth="1.5"/>
    <text x="28" y="181" fill="#06b6d4" fontSize="7" fontFamily="monospace" fontWeight="bold">CLAVE DE RASTREO</text>
    <text x="28" y="195" fill="#67e8f9" fontSize="9" fontFamily="monospace" fontWeight="bold">2024041600123456</text>
    <path d="M 158 162 L 168 174 L 158 174" fill="none" stroke="#06b6d4" strokeWidth="1.5"/>
    <text x="161" y="170" fill="#06b6d4" fontSize="7" fontFamily="monospace">←</text>
    <text x="25" y="222" fill="#64748b" fontSize="7" fontFamily="monospace">FOLIO</text>
    <text x="115" y="222" fill="#94a3b8" fontSize="7" fontFamily="monospace">987654321</text>
    <text x="25" y="234" fill="#64748b" fontSize="7" fontFamily="monospace">ESTATUS</text>
    <text x="115" y="234" fill="#10b981" fontSize="7" fontFamily="monospace">LIQUIDADO</text>
    <line x1="25" y1="242" x2="175" y2="242" stroke="#334155" strokeWidth="0.8"/>
    <text x="100" y="252" textAnchor="middle" fill="#475569" fontSize="6" fontFamily="monospace">ESTE COMPROBANTE NO ES CFDi</text>
    <text x="100" y="270" textAnchor="middle" fill="#06b6d4" fontSize="7" fontFamily="monospace" fontWeight="bold">↑ Ingresa la Clave de Rastreo</text>
  </svg>
);

// Tooltip de referencia
const RefTooltip = ({method}:{method:string}) => {
  const [show, setShow] = useState(false);
  const isTransfer = method === 'TRANSFERENCIA';
  return(
    <div style={{position:'relative',display:'inline-block'}}>
      <button onClick={()=>setShow(s=>!s)}
        style={{width:18,height:18,borderRadius:'50%',border:`1px solid ${isTransfer?'#06b6d4':'#8b5cf6'}`,
          background:'none',color:isTransfer?'#06b6d4':'#8b5cf6',cursor:'pointer',fontSize:11,
          display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,padding:0}}>
        ?
      </button>
      {show&&(
        <div style={{position:'absolute',bottom:24,right:0,zIndex:2000,background:'#0f172a',
          border:'1px solid #334155',borderRadius:10,padding:12,boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
          minWidth:200}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:10,color:'#64748b',fontWeight:600}}>
              {isTransfer?'¿Dónde está la clave?':'¿Dónde está el No. Autorización?'}
            </span>
            <button onClick={()=>setShow(false)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:14,padding:0}}>✕</button>
          </div>
          {isTransfer ? <VoucherSPEISVG/> : <VoucherTarjetaSVG/>}
        </div>
      )}
    </div>
  );
};

function POSPageInner() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#B5451B';

  const [canal,     setCanal]     = useState('MOSTRADOR');
  const [carrito,   setCarrito]   = useState<any[]>([]);
  const [esCredito, setEsCredito] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [ocId,      setOcId]      = useState('');
  const [exito,     setExito]     = useState(false);
  const [error,     setError]     = useState('');

  const [pagos, setPagos] = useState<{method:string, amount:number, reference?:string}[]>([{ method:'EFECTIVO', amount:0 }]);
  const [showDescuento, setShowDescuento] = useState(false);
  const [tipoDesc,      setTipoDesc]      = useState<'descuento'|'cortesia'>('descuento');
  const [descValor,     setDescValor]     = useState(0);
  const [descPin,       setDescPin]       = useState('');
  const [descAuth,      setDescAuth]      = useState<any>(null);
  const [pinError,      setPinError]      = useState('');
  const [showTiraX,     setShowTiraX]     = useState(false);
  const [showTiraZ,     setShowTiraZ]     = useState(false);
  const [efectivoCaja,  setEfectivoCaja]  = useState<any>({});
  const [tiraXGuardada, setTiraXGuardada] = useState(false);
  const [tiraData,      setTiraData]      = useState<any>(null);
  const [showMovCaja,   setShowMovCaja]   = useState<'deposito'|'retiro'|null>(null);
  const [movMonto,      setMovMonto]      = useState(0);
  const [movNota,       setMovNota]       = useState('');
  const [movMotivo,     setMovMotivo]     = useState('seguridad');
  const [savingMov,     setSavingMov]     = useState(false);
  const [showCreditBlock, setShowCreditBlock] = useState(false);
  const [creditPin,       setCreditPin]       = useState('');
  const [creditPinError,  setCreditPinError]  = useState('');
  const [showCobro,     setShowCobro]     = useState(false);
  const [conCuanto,     setConCuanto]     = useState(0);
  const [efectivoCobro, setEfectivoCobro] = useState<any>({});
  const [busqueda,      setBusqueda]      = useState('');
  const [filtroGrupo,   setFiltroGrupo]   = useState('TODOS');

  const busquedaRef = useRef<HTMLInputElement>(null);
  const clienteRef  = useRef<HTMLSelectElement>(null);


  // ── Atajos de teclado ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // No activar si estamos en un input/textarea que no sea el de búsqueda
      const tag = (e.target as HTMLElement)?.tagName;
      const isBusqueda = (e.target as HTMLElement) === busquedaRef.current;
      if ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && !isBusqueda) return;

      if (e.key === 'F2') { e.preventDefault(); busquedaRef.current?.focus(); busquedaRef.current?.select(); }
      if (e.key === 'F3') { e.preventDefault(); clienteRef.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); agregarMetodo('EFECTIVO'); }
      if (e.key === 'F5') { e.preventDefault(); agregarMetodo('TARJETA_DEBITO'); }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showCobro)    { setShowCobro(false); return; }
        if (showDescuento){ setShowDescuento(false); return; }
        if (showTiraX)    { setShowTiraX(false); return; }
        if (showTiraZ)    { setShowTiraZ(false); return; }
        if (showMovCaja)  { setShowMovCaja(null); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setCarrito([]); setDescAuth(null); setDescValor(0); setDescPin('');
        setOcId(''); setClienteId(''); setEsCredito(false);
        setPagos([{ method:'EFECTIVO', amount:0 }]);
        setBusqueda('');
      }
      if (e.key === 'Enter' && !showCobro && carrito.length > 0) {
        e.preventDefault();
        cobrar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showCobro, showDescuento, showTiraX, showTiraZ, showMovCaja, carrito, pagos, total, esCredito, clienteId]);



  const canalConfig = CANALES.find(c => c.id === canal)!;
  const canalColor  = canalConfig.color;
  const priceKey    = canalConfig.priceKey;

  const subtotal       = carrito.reduce((t,i) => t+i.precio*i.cantidad, 0);
  const descMonto      = tipoDesc==='cortesia' ? subtotal : (descValor > 0 ? Math.min(descValor, subtotal) : 0);
  const total          = descAuth ? Math.max(0, subtotal - descMonto) : subtotal;
  const totalPagado    = pagos.reduce((t,p) => t+(Number(p.amount)||0), 0);
  const esMixto        = pagos.length > 1;
  const tieneEfectivo  = pagos.some(p => p.method === 'EFECTIVO');
  const otrosPagos     = pagos.filter(p => p.method !== 'EFECTIVO').reduce((t,p) => t+(Number(p.amount)||0), 0);
  const faltaEfectivo  = Math.max(0, total - otrosPagos);
  const metodoPrincipal = pagos[0]?.method || 'EFECTIVO';

  const { data: inventory = [] } = useQuery({ queryKey:['pt-inventory',cid], queryFn:()=>api.get(`/companies/${cid}/machete/inventory/pt`).then(r=>r.data), enabled:!!cid });
  const { data: clientes  = [] } = useQuery({ queryKey:['clients',cid],       queryFn:()=>api.get(`/companies/${cid}/clients`).then(r=>r.data),                enabled:!!cid });
  const { data: ocsPendientes=[] } = useQuery({ queryKey:['ocs-pendientes',cid,clienteId], queryFn:()=>api.get(`/companies/${cid}/ordenes?clientId=${clienteId}&status=ACTIVAS`).then(r=>r.data), enabled:!!cid&&!!clienteId });

  const agregar = (p:any) => {
    if (ocId) return;
    const precio = Number((p as any)[priceKey]||0);
    if (precio===0){setError('Sin precio para este canal');return;}
    if (p.stock<=0) return;
    setError('');
    setCarrito(c=>{
      const idx=c.findIndex(i=>i.id===p.id);
      if(idx>=0){if(c[idx].cantidad>=p.stock)return c;return c.map((i,j)=>j===idx?{...i,cantidad:i.cantidad+1}:i);}
      return [...c,{id:p.id,nombre:p.name,precio,cantidad:1,stock:p.stock}];
    });
  };

  const cargarDesdeOC=(oc:any)=>{
    if(!oc?.lineas)return;
    const lineas=(oc.lineas as any[]).map((l:any)=>{
      const prod=(inventory as any[]).find((p:any)=>p.id===l.productId);
      const stock=Number(prod?.stock||0);
      const pendiente=Math.max(0,(l.cantidad||1)-(l.cantidadSurtida||0));
      return{id:l.productId,nombre:l.product?.name||l.productId,precio:Number(l.precioUnitario||0),cantidad:Math.min(pendiente,stock),cantPendiente:pendiente,stock,sinStock:stock===0};
    }).filter((l:any)=>l.cantPendiente>0);
    setCarrito(lineas);setOcId(oc.id);setEsCredito(true);
  };

  const cambiarCantidad=(id:string,valor:number)=>setCarrito(c=>c.map(i=>i.id===id?{...i,cantidad:Math.max(0,Math.min(valor,i.stock))}:i).filter(i=>i.cantidad>0));
  const cambiar=(id:string,delta:number)=>setCarrito(c=>c.map(i=>i.id===id?{...i,cantidad:Math.max(0,Math.min(i.cantidad+delta,i.stock))}:i).filter(i=>i.cantidad>0));

  const agregarMetodo=(method:string)=>{if(pagos.find(p=>p.method===method))return;setPagos(ps=>[...ps,{method,amount:0}]);};
  const quitarMetodo=(method:string)=>{if(pagos.length<=1)return;setPagos(ps=>ps.filter(p=>p.method!==method));};
  const actualizarMonto=(method:string,amount:number)=>setPagos(ps=>ps.map(p=>p.method===method?{...p,amount}:p));
  const actualizarReferencia=(method:string,reference:string)=>setPagos(ps=>ps.map(p=>p.method===method?{...p,reference}:p));
  const distribuirResto=(method:string)=>{
    const resto=Math.max(0,total-pagos.filter(p=>p.method!==method).reduce((t,p)=>t+(Number(p.amount)||0),0));
    actualizarMonto(method,resto);
  };

  const verificarPin=async()=>{
    setPinError('');
    try{const{data}=await api.post('/auth/verify-pin',{companyId:cid,pin:descPin});setDescAuth(data);setShowDescuento(false);}
    catch{setPinError('PIN incorrecto');}
  };

  const cargarTira=async()=>{
    const today=new Date().toISOString().slice(0,10);
    const{data}=await api.get(`/companies/${cid}/machete/sales?period=${today.slice(0,7)}`);
    const hoy=data.filter((s:any)=>s.date.slice(0,10)===today);
    const porMetodo:Record<string,number>={};
    const porFamilia:Record<string,number>={};
    let totalBruto=0;
    for(const s of hoy){
      totalBruto+=Number(s.total);
      if(s.paymentSplits?.length){for(const sp of s.paymentSplits){porMetodo[sp.method]=(porMetodo[sp.method]||0)+Number(sp.amount);}}
      else{const met=s.paymentMethod||'EFECTIVO';porMetodo[met]=(porMetodo[met]||0)+Number(s.total);}
      for(const l of s.lines||[]){const fam=l.product?.name?.split(' ').slice(0,2).join(' ')||'Otros';porFamilia[fam]=(porFamilia[fam]||0)+Number(l.total);}
    }
    let movimientos:any[]=[];
    try{const{data:movs}=await api.get(`/companies/${cid}/flow/movements?fecha=${today}`);movimientos=movs||[];}catch(e){}
    setTiraData({hoy,porMetodo,porFamilia,movimientos,totalBruto,fecha:today});
  };

  const saleM=useMutation({
    mutationFn:()=>api.post(`/companies/${cid}/machete/sales`,{
      date:new Date().toISOString().slice(0,10),channel:canal,
      paymentMethod:esCredito?'CREDITO_CLIENTE':metodoPrincipal,
      paymentSplits:esCredito?null:(esMixto?pagos.filter(p=>Number(p.amount)>0).map(p=>({method:p.method,amount:p.amount,reference:p.reference||null})):pagos.map(p=>({method:p.method,amount:Number(p.amount)||total,reference:p.reference||null}))[0]?[{method:metodoPrincipal,amount:total,reference:pagos[0]?.reference||null}]:null),
      clientId:esCredito?clienteId:null,ocId:ocId||null,isCredit:esCredito,
      discount:descAuth?descMonto:0,discountType:descAuth?tipoDesc:null,authorizedBy:descAuth?.authorizedBy||null,
      lines:carrito.map(i=>({productId:i.id,quantity:i.cantidad,unitPrice:i.precio})),
    }),
    onSuccess:()=>{
      setCarrito([]);setDescAuth(null);setDescValor(0);setDescPin('');
      setOcId('');setClienteId('');setEsCredito(false);
      setPagos([{method:'EFECTIVO',amount:0}]);setConCuanto(0);setShowCobro(false);setEfectivoCobro({});
      setExito(true);setTimeout(()=>setExito(false),3000);
    },
    onError:(e:any)=>setError(e.response?.data?.message||'Error'),
  });

  const cobrar=async()=>{
    if(esCredito&&!clienteId){setError('Selecciona un cliente');return;}
    if(esCredito&&clienteId){
      const cliente=(clientes as any[]).find((c:any)=>c.id===clienteId);
      if(cliente?.creditLimit>0){
        try{const{data:summary}=await api.get(`/companies/${cid}/cxc/summary?clientId=${clienteId}`);
          if(Number(summary?.totalPending||0)+total>Number(cliente.creditLimit)){setShowCreditBlock(true);setCreditPin('');setCreditPinError('');return;}
        }catch(e){}
      }
    }
    setError('');
    if(!esCredito){
      // If payment is already configured in panel with correct total, go directly
      const panelTotal = pagos.reduce((t,p)=>t+Number(p.amount||0),0);
      if(panelTotal >= total && total > 0) {
        saleM.mutate();
      } else {
        // Open full cobro modal
        setShowCobro(true);
      }
      return;
    }
    saleM.mutate();
  };

  const clienteActivo=(clientes as any[]).find((c:any)=>c.id===clienteId);

  const ProductCard=({p}:{p:any})=>{
    const precio=Number((p as any)[priceKey]||0);
    const sinPrecio=precio===0;
    const enCarrito=carrito.find(i=>i.id===p.id);
    const bloqueado=!!ocId;
    return(
      <button onClick={()=>agregar(p)} disabled={p.stock<=0||sinPrecio||bloqueado}
        style={{padding:8,borderRadius:10,border:`2px solid ${enCarrito?canalColor:sinPrecio||bloqueado?'#1e293b':'#334155'}`,
          background:enCarrito?canalColor+'11':'#1e293b',cursor:p.stock<=0||sinPrecio||bloqueado?'not-allowed':'pointer',
          opacity:p.stock<=0?0.4:sinPrecio?0.5:bloqueado&&!enCarrito?0.3:1,textAlign:'left',position:'relative'}}>
        {enCarrito&&<div style={{position:'absolute',top:-7,right:-7,width:18,height:18,borderRadius:'50%',background:canalColor,color:'#fff',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{enCarrito.cantidad}</div>}
        <div style={{display:'flex',gap:3,marginBottom:4}}>
          <span style={{fontSize:9,padding:'1px 5px',borderRadius:4,background:canalColor+'22',color:canalColor}}>{TIPO_LABELS[p.meatType]||p.meatType}</span>
          <span style={{fontSize:9,padding:'1px 5px',borderRadius:4,background:'#334155',color:'#94a3b8'}}>{SABOR_LABELS[p.flavor]||p.flavor}</span>
        </div>
        <p style={{fontSize:11,fontWeight:600,margin:'0 0 3px',color:'#f1f5f9',lineHeight:1.2}}>{p.name}</p>
        <p style={{fontSize:14,fontWeight:700,color:sinPrecio?'#64748b':canalColor,margin:'0 0 2px'}}>{sinPrecio?'Sin precio':fmt(precio)}</p>
        <p style={{fontSize:10,color:p.stock<=3&&p.stock>0?'#f59e0b':p.stock<=0?'#f87171':'#64748b',margin:0}}>{p.stock<=0?'Sin stock':`${p.stock} pzas`}</p>
      </button>
    );
  };

  const getFamilia=(p:any)=>{const sku=(p.sku||'').toUpperCase();if(sku.startsWith('MCH'))return'Machete';if(sku.startsWith('CHI'))return'Chicali';if(sku.startsWith('ESC'))return'Escarchado';if(sku.startsWith('CER'))return'Cerdo';if(sku.startsWith('MAC'))return'Machaca';if(sku.startsWith('SCR'))return'Scrap';return'Otros';};
  const GRUPOS:Record<string,{label:string,familias:string[],color:string}>={RES:{label:'Res',familias:['Machete','Chicali','Escarchado','Scrap'],color:'#B5451B'},CER:{label:'Cerdo',familias:['Cerdo'],color:'#8b5cf6'},OTROS:{label:'Otros',familias:['Machaca','Otros'],color:'#64748b'}};
  const prods=(inventory as any[]).filter((p:any)=>p.isActive!==false);
  const FILTROS = [
    {id:'TODOS',label:'Todos'},{id:'RES',label:'Res'},{id:'CHICALI',label:'Chicali'},
    {id:'ESCARCHADO',label:'Escarchado'},{id:'CERDO',label:'Cerdo'},{id:'MACHACA',label:'Machaca'},{id:'SCRAP',label:'Scrap'},
  ];
  const prodsFiltrados = prods.filter((p:any) => {
    const fam = getFamilia(p).toUpperCase();
    const passGrupo = filtroGrupo === 'TODOS' || fam.includes(filtroGrupo);
    const passSearch = !busqueda || p.name?.toLowerCase().includes(busqueda.toLowerCase()) || (p.sku||'').toLowerCase().includes(busqueda.toLowerCase());
    return passGrupo && passSearch;
  });

  // ─── POS UI ───────────────────────────────────────────────────

  
  const masVendidos = [...prods].sort((a: any, b: any) => Number(b.stock || 0) - Number(a.stock || 0)).slice(0, 6);

  return(
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', height:'100vh', background:'#0a0f1a', fontFamily:'system-ui,-apple-system,sans-serif', overflow:'hidden' }}>

      {/* ── SIDEBAR IZQUIERDO ────────────────────────── */}
      <div style={{ width:180, background:'#0f172a', borderRight:'1px solid #1e293b', display:'flex', flexDirection:'column', flexShrink:0 }}>
        {/* Back button */}
        <div style={{ padding:'8px 10px', borderBottom:'1px solid #1e293b', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => window.history.back()}
            style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #334155', background:'none',
              color:'#64748b', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
            ← Salir
          </button>
        </div>
        {/* Logo */}
        <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e293b' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14, color:'#fff' }}>M</div>
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:'#f1f5f9', margin:0, letterSpacing:-0.3 }}>MACHETE</p>
              <p style={{ fontSize:9, color:color, margin:0, fontWeight:700, letterSpacing:1 }}>POS</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ padding:'8px 8px', flex:1 }}>
          {[
            { id:'venta',    icon:'🛒', label:'Venta' },
            { id:'historial',icon:'🕐', label:'Historial' },
          ].map(n => (
            <button key={n.id} onClick={() => setVistaNav(n.id as any)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 10px',
                borderRadius:8, border:'none', cursor:'pointer', marginBottom:2, textAlign:'left',
                background: vistaNav === n.id ? color+'22' : 'transparent',
                color: vistaNav === n.id ? color : '#64748b', fontSize:13, fontWeight: vistaNav===n.id?700:400 }}>
              <span style={{ fontSize:16 }}>{n.icon}</span>{n.label}
            </button>
          ))}

          <div style={{ height:1, background:'#1e293b', margin:'8px 0' }}/>

          <p style={{ fontSize:9, color:'#334155', margin:'8px 0 6px 10px', textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>ACCESOS RÁPIDOS</p>
          {[
            { icon:'⚡', label:'Más vendidos', action:() => setFiltroGrupo('TODOS') },
            { icon:'⭐', label:'Favoritos',    action:() => {} },
          ].map(a => (
            <button key={a.label} onClick={a.action}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                borderRadius:8, border:'none', cursor:'pointer', marginBottom:2,
                background:'transparent', color:'#475569', fontSize:11 }}>
              <span>{a.icon}</span>{a.label}
            </button>
          ))}

          <div style={{ height:1, background:'#1e293b', margin:'8px 0' }}/>

          {/* Canal selector */}
          <p style={{ fontSize:9, color:'#334155', margin:'8px 0 6px 10px', textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>CANAL</p>
          {CANALES.map(c => (
            <button key={c.id} onClick={() => setCanal(c.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:6, padding:'6px 10px',
                borderRadius:8, border:'none', cursor:'pointer', marginBottom:2, textAlign:'left',
                background: canal === c.id ? c.color+'22' : 'transparent',
                color: canal === c.id ? c.color : '#475569', fontSize:11, fontWeight: canal===c.id?700:400 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background: canal===c.id?c.color:'#334155', flexShrink:0 }}/>
              {c.label}
            </button>
          ))}
        </div>

        {/* Usuario bottom */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid #1e293b' }}>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => { cargarTira(); setShowTiraX(true); }}
              style={{ flex:1, padding:'5px', borderRadius:6, border:`1px solid ${tiraXGuardada?'#10b981':'#334155'}`, background:'none', color:tiraXGuardada?'#10b981':'#64748b', cursor:'pointer', fontSize:9 }}>
              {tiraXGuardada ? '✔ Tira X' : 'Tira X'}
            </button>
            <button onClick={() => { if(tiraXGuardada) { cargarTira(); setShowTiraZ(true); } }} disabled={!tiraXGuardada}
              style={{ flex:1, padding:'5px', borderRadius:6, border:`1px solid ${tiraXGuardada?'#f59e0b':'#334155'}`, background:'none', color:tiraXGuardada?'#f59e0b':'#334155', cursor:tiraXGuardada?'pointer':'not-allowed', fontSize:9, opacity:tiraXGuardada?1:0.4 }}>
              Tira Z
            </button>
          </div>
        </div>
      </div>

      {/* ── CENTRO: CATÁLOGO ─────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Top bar */}
        <div style={{ padding:'10px 16px', background:'#0f172a', borderBottom:'1px solid #1e293b', display:'flex', gap:10, alignItems:'center' }}>
          {/* Search */}
          <div style={{ flex:1, position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#475569', fontSize:14 }}>🔍</span>
            <input
              ref={busquedaRef}
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto, SKU o código...  F2"
              style={{ width:'100%', padding:'8px 10px 8px 34px', borderRadius:8, border:'1px solid #1e293b',
                background:'#0a0f1a', color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
          </div>
          {/* Cliente */}
          <select ref={clienteRef} value={clienteId} onChange={e => { setClienteId(e.target.value); setOcId(''); setCarrito([]); }}
            style={{ padding:'7px 10px', borderRadius:8, fontSize:11, background:'#0a0f1a', border:`1px solid ${clienteId?'#f59e0b':'#1e293b'}`, color:clienteId?'#f59e0b':'#475569', cursor:'pointer', minWidth:140 }}>
            <option value="">👤 Cliente  F3</option>
            {(clientes as any[]).map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {clienteId && (
            <select value={ocId} onChange={e => { if(e.target.value){const oc=(ocsPendientes as any[]).find((o:any)=>o.id===e.target.value);if(oc)cargarDesdeOC(oc);}else{setOcId('');setCarrito([]);setEsCredito(true);} }}
              style={{ padding:'7px 10px', borderRadius:8, fontSize:11, background:'#0a0f1a', border:`1px solid ${ocId?'#10b981':'#1e293b'}`, color:ocId?'#10b981':'#475569', cursor:'pointer', minWidth:140 }}>
              <option value="">📋 OC pendiente</option>
              {(ocsPendientes as any[]).map((oc:any) => <option key={oc.id} value={oc.id}>{oc.numero}</option>)}
            </select>
          )}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => { setShowMovCaja('deposito'); setMovMonto(0); setMovNota(''); }}
              style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #10b98144', background:'none', color:'#10b981', cursor:'pointer', fontSize:11 }}>↑ Dep.</button>
            <button onClick={() => { setShowMovCaja('retiro'); setMovMonto(0); setMovNota(''); setMovMotivo('seguridad'); }}
              style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #f8717144', background:'none', color:'#f87171', cursor:'pointer', fontSize:11 }}>↓ Ret.</button>
          </div>
        </div>

        {/* Filtros de familia */}
        <div style={{ padding:'8px 16px', background:'#0f172a', borderBottom:'1px solid #1e293b', display:'flex', gap:6, alignItems:'center', overflowX:'auto' }}>
          {FILTROS.map(f => (
            <button key={f.id} onClick={() => setFiltroGrupo(f.id)}
              style={{ padding:'5px 14px', borderRadius:99, border:`1px solid ${filtroGrupo===f.id?color:'#1e293b'}`,
                background: filtroGrupo===f.id?color:'#0a0f1a', color:filtroGrupo===f.id?'#fff':'#64748b',
                cursor:'pointer', fontSize:11, fontWeight:filtroGrupo===f.id?700:400, whiteSpace:'nowrap', flexShrink:0 }}>
              {f.label}
            </button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', gap:4, flexShrink:0 }}>
            <button style={{ padding:'4px 10px', borderRadius:99, border:'1px solid #1e293b', background:'none', color:'#64748b', cursor:'pointer', fontSize:10 }}>⭐ Favoritos</button>
            <button style={{ padding:'4px 10px', borderRadius:99, border:'1px solid #1e293b', background:'none', color:'#64748b', cursor:'pointer', fontSize:10 }}>⚡ Más vendidos</button>
          </div>
        </div>

        {/* Grid de productos */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
          {ocId && (
            <div style={{ background:'#0f172a', borderRadius:8, padding:'8px 12px', marginBottom:10, border:'1px solid #10b981', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>📋</span>
              <span style={{ fontSize:12, color:'#10b981' }}>OC cargada — modifica cantidades en el pedido</span>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10 }}>
            {prodsFiltrados.map((p: any) => {
              const precio  = Number((p as any)[priceKey] || 0);
              const sinPrecio = precio === 0;
              const bloqueado = !!ocId;
              const enCarrito = carrito.find(i => i.id === p.id);
              const stockBajo = p.stock > 0 && p.stock <= 5;
              return (
                <div key={p.id} onClick={() => !bloqueado && !sinPrecio && agregar(p)}
                  style={{ background:'#0f172a', borderRadius:10, border:`2px solid ${enCarrito?color:p.stock<=0?'#1e293b':'#1e293b'}`,
                    padding:10, cursor:p.stock<=0||sinPrecio||bloqueado?'not-allowed':'pointer',
                    opacity:p.stock<=0?0.4:1, position:'relative', transition:'border-color 0.15s',
                    outline:'none' }}>
                  {/* Imagen placeholder */}
                  <div style={{ width:'100%', aspectRatio:'1', borderRadius:7, background:'#1e293b',
                    display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8, overflow:'hidden' }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <span style={{ fontSize:28 }}>🥩</span>}
                    {/* Stock badge */}
                    <div style={{ position:'absolute', top:8, right:8, fontSize:9, padding:'2px 6px', borderRadius:4,
                      background: p.stock<=0?'#f87171':stockBajo?'#f59e0b':'#10b981',
                      color:'#fff', fontWeight:700 }}>
                      {p.stock<=0?'SIN STOCK':`Stock: ${p.stock}`}
                    </div>
                  </div>
                  {/* Badge familia */}
                  <div style={{ display:'flex', gap:3, marginBottom:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:8, padding:'1px 5px', borderRadius:4, background:color+'22', color }}>
                      {getFamilia(p).toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize:11, fontWeight:600, color:'#f1f5f9', margin:'0 0 2px', lineHeight:1.3 }}>{p.name}</p>
                  <p style={{ fontSize:13, fontWeight:800, color:sinPrecio?'#334155':color, margin:'0 0 6px' }}>
                    {sinPrecio ? 'Sin precio' : fmt(precio)}
                  </p>
                  {enCarrito ? (
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <button onClick={e => { e.stopPropagation(); cambiar(p.id, -1); }}
                        style={{ width:26, height:26, borderRadius:6, border:`1px solid ${color}44`, background:'none', color:'#f1f5f9', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                      <span style={{ flex:1, textAlign:'center', fontWeight:700, fontSize:13, color }}>{enCarrito.cantidad}</span>
                      <button onClick={e => { e.stopPropagation(); cambiar(p.id, +1); }}
                        style={{ width:26, height:26, borderRadius:6, border:`1px solid ${color}44`, background:color, color:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => agregar(p)} disabled={p.stock<=0||sinPrecio||bloqueado}
                      style={{ width:'100%', padding:'6px', borderRadius:7, border:'none',
                        background:p.stock<=0||sinPrecio||bloqueado?'#1e293b':color+'33', color:p.stock<=0||sinPrecio?'#334155':color,
                        cursor:p.stock<=0||sinPrecio||bloqueado?'not-allowed':'pointer', fontSize:11, fontWeight:600 }}>
                      {p.stock<=0?'Sin stock':'Agregar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {prodsFiltrados.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#334155' }}>
              <p style={{ fontSize:40, margin:'0 0 8px' }}>🔍</p>
              <p style={{ fontSize:13 }}>Sin resultados para "{busqueda}"</p>
            </div>
          )}
        </div>

        {/* Shortcuts bar */}
        <div style={{ padding:'6px 16px', background:'#0a0f1a', borderTop:'1px solid #1e293b', display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:10, color:'#334155' }}>Atajos (F1)</span>
          {['F2 Buscar','F3 Cliente','F4 Efectivo','F5 Tarjeta','Ctrl+L Limpiar','ESC Cancelar'].map(s => (
            <span key={s} style={{ fontSize:10, color:'#475569' }}>{s}</span>
          ))}
        </div>
      </div>

      {/* ── PANEL DERECHO: PEDIDO ────────────────────── */}
      <div style={{ width:320, background:'#0f172a', borderLeft:'1px solid #1e293b', display:'flex', flexDirection:'column', flexShrink:0 }}>

        {/* Header pedido */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #1e293b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', margin:'0 0 2px' }}>
                PEDIDO ACTUAL
              </p>
              <p style={{ fontSize:10, color:'#475569', margin:0 }}>
                {clienteActivo ? `Cliente: ${clienteActivo.name}` : `${canalConfig.label} · ${new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`}
              </p>
            </div>
            {carrito.length > 0 && (
              <button onClick={() => { setCarrito([]); setOcId(''); setEsCredito(false); setClienteId(''); setDescAuth(null); }}
                style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:11 }}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Items del carrito */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
          {carrito.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#334155' }}>
              <p style={{ fontSize:32, margin:'0 0 8px' }}>🛒</p>
              <p style={{ fontSize:12 }}>Selecciona productos del catálogo</p>
            </div>
          ) : carrito.map(item => (
            <div key={item.id} style={{ background:'#1e293b', borderRadius:8, padding:'8px 10px', marginBottom:6, display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ width:32, height:32, borderRadius:6, background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>🥩</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'#f1f5f9', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nombre}</p>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <button onClick={() => cambiar(item.id, -1)} style={{ width:22, height:22, borderRadius:5, border:'1px solid #334155', background:'none', color:'#f1f5f9', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                  <input type="number" min="1" value={item.cantidad} onChange={e => cambiarCantidad(item.id, +e.target.value)}
                    style={{ width:32, textAlign:'center', padding:'1px 2px', borderRadius:4, border:'1px solid #334155', background:'#0f172a', color:'#f1f5f9', fontSize:11, fontWeight:700 }}/>
                  <button onClick={() => cambiar(item.id, +1)} style={{ width:22, height:22, borderRadius:5, border:`1px solid ${color}44`, background:color, color:'#fff', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color, margin:'0 0 4px' }}>{fmt(item.precio * item.cantidad)}</p>
                <button onClick={() => setCarrito(c => c.filter(i => i.id !== item.id))}
                  style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:11 }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Totales + Pago */}
        {carrito.length > 0 && (
          <div style={{ padding:'12px 14px', borderTop:'1px solid #1e293b' }}>
            {/* Totales */}
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontSize:11, color:'#64748b' }}>Subtotal</span>
                <span style={{ fontSize:12, color:'#94a3b8' }}>{fmt(subtotal)}</span>
              </div>
              {descAuth && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:11, color:'#10b981' }}>{tipoDesc==='cortesia'?'Cortesía':'Descuento'} ({descAuth.authorizedBy})</span>
                  <span style={{ fontSize:12, color:'#10b981' }}>-{fmt(descMonto)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, paddingTop:6, borderTop:'1px solid #334155' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>TOTAL</span>
                <span style={{ fontSize:24, fontWeight:800, color, fontVariantNumeric:'tabular-nums' }}>{fmt(total)}</span>
              </div>
            </div>

            {/* Pago combinado en el panel */}
            <div style={{ background:'#1e293b', borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8' }}>PAGO COMBINADO</span>
                {totalPagado >= total && totalPagado > 0 && (
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'#10b98122', color:'#10b981', fontWeight:700 }}>COMPLETO</span>
                )}
              </div>
              {pagos.map(pago => {
                const mc = METODOS_PAGO.find(m => m.id === pago.method);
                return (
                  <div key={pago.method} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:mc?.color, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'#94a3b8', flex:1 }}>{mc?.label}</span>
                    <input type="number" min="0" step="0.01"
                      style={{ width:80, padding:'4px 6px', borderRadius:5, border:`1px solid ${mc?.color}44`, background:'#0f172a', color:'#f1f5f9', fontSize:12, fontWeight:700, textAlign:'right' }}
                      value={pago.amount || ''} placeholder="$0.00"
                      onChange={e => actualizarMonto(pago.method, +e.target.value)}/>
                    {pagos.length > 1 && (
                      <button onClick={() => quitarMetodo(pago.method)}
                        style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:14 }}>🗑</button>
                    )}
                  </div>
                );
              })}
              {pagos.length < METODOS_PAGO.length && (
                <button onClick={() => {
                  const noUsados = METODOS_PAGO.filter(m => !pagos.find(p => p.method === m.id));
                  if (noUsados.length) agregarMetodo(noUsados[0].id);
                }}
                  style={{ width:'100%', padding:'5px', borderRadius:6, border:'1px dashed #334155', background:'none', color:'#475569', cursor:'pointer', fontSize:10 }}>
                  + Agregar método de pago
                </button>
              )}
              {esMixto && (
                <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:'1px solid #334155' }}>
                  <span style={{ fontSize:11, color:'#64748b' }}>Pagado: {fmt(totalPagado)}</span>
                  <span style={{ fontSize:11, color: totalPagado >= total ? '#10b981' : '#f59e0b' }}>
                    Pendiente: {fmt(Math.max(0, total - totalPagado))}
                  </span>
                </div>
              )}
            </div>

            {/* Cambio */}
            {tieneEfectivo && totalPagado > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, padding:'6px 10px', background:'#0a0f1a', borderRadius:6 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Cambio:</span>
                <span style={{ fontSize:18, fontWeight:700, color:'#10b981' }}>
                  {fmt(Math.max(0, totalPagado - total))}
                </span>
              </div>
            )}

            {/* Descuento */}
            {!descAuth && !esCredito && (
              <button onClick={() => setShowDescuento(true)}
                style={{ width:'100%', marginBottom:6, padding:'6px', borderRadius:7, fontSize:11, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}>
                + Descuento / Cortesía
              </button>
            )}
            {showDescuento && (
              <div style={{ background:'#0a0f1a', borderRadius:8, padding:10, marginBottom:8 }}>
                <p style={{ fontSize:11, fontWeight:600, margin:'0 0 8px', color:'#f1f5f9' }}>Autorización gerente</p>
                <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                  {(['descuento','cortesia'] as const).map(t => (
                    <button key={t} onClick={() => setTipoDesc(t)}
                      style={{ flex:1, padding:'3px', borderRadius:5, fontSize:10, cursor:'pointer', border:`1px solid ${tipoDesc===t?color:'#334155'}`, background:tipoDesc===t?color+'22':'transparent', color:tipoDesc===t?color:'#64748b' }}>
                      {t==='descuento'?'Descuento $':'Cortesía'}
                    </button>
                  ))}
                </div>
                {tipoDesc==='descuento' && <input type="number" min="0" placeholder="Monto" className="input-base" style={{ fontSize:11, marginBottom:6 }} value={descValor||''} onChange={e => setDescValor(+e.target.value)}/>}
                <input type="password" maxLength={4} placeholder="PIN gerente" className="input-base" style={{ fontSize:11, marginBottom:4, letterSpacing:4, textAlign:'center' }} value={descPin} onChange={e => setDescPin(e.target.value)}/>
                {pinError && <p style={{ color:'#f87171', fontSize:10, margin:'0 0 4px' }}>{pinError}</p>}
                <div style={{ display:'flex', gap:4 }}>
                  <button onClick={() => { setShowDescuento(false); setDescPin(''); setPinError(''); }} style={{ flex:1, padding:'5px', borderRadius:5, fontSize:11, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer' }}>Cancelar</button>
                  <button onClick={verificarPin} disabled={descPin.length!==4} style={{ flex:1, padding:'5px', borderRadius:5, fontSize:11, border:'none', background:color, color:'#fff', cursor:'pointer' }}>Autorizar</button>
                </div>
              </div>
            )}

            {error && <p style={{ color:'#f87171', fontSize:11, marginBottom:6 }}>{error}</p>}

            {/* Botón cobrar */}
            <button onClick={cobrar}
              disabled={saleM.isPending || (esCredito && !clienteId) || carrito.length === 0}
              style={{ width:'100%', padding:'14px', borderRadius:10, border:'none', fontSize:15, fontWeight:800,
                cursor:'pointer', letterSpacing:0.5, background:carrito.length===0||(esCredito&&!clienteId)?'#1e293b':(esCredito||clienteId)?'#f59e0b':color,
                color: carrito.length===0?'#334155':'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              🔒 {saleM.isPending ? 'Procesando…' : esCredito ? `Registrar crédito — ${fmt(total)}` : `COBRAR Y FINALIZAR`}
              {!saleM.isPending && !esCredito && <span style={{ fontSize:10, opacity:0.7 }}>(Enter)</span>}
            </button>
          </div>
        )}

        {exito && (
          <div style={{ padding:16, textAlign:'center', background:'rgba(16,185,129,0.08)', borderTop:'1px solid rgba(16,185,129,0.2)' }}>
            <p style={{ fontSize:24, margin:'0 0 4px' }}>✔</p>
            <p style={{ color:'#10b981', fontWeight:700, margin:0, fontSize:14 }}>¡Venta registrada!</p>
          </div>
        )}
      </div>

      {/* ── MODAL COBRO — selección de pago aquí ── */}
      {showCobro&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:700,border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 style={{fontSize:16,fontWeight:700,margin:0,color}}>Forma de pago</h3>
              <div style={{background:'#0f172a',borderRadius:8,padding:'6px 16px',textAlign:'right'}}>
                <p style={{fontSize:11,color:'#64748b',margin:'0 0 2px'}}>Total a cobrar</p>
                <p style={{fontSize:26,fontWeight:700,color,margin:0}}>{fmt(total)}</p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              {/* Métodos */}
              <div>
                <p style={{fontSize:10,color:'#64748b',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:1,fontWeight:700}}>Selecciona método</p>
                {pagos.map(pago=>{
                  const mc=METODOS_PAGO.find(m=>m.id===pago.method);
                  return(
                    <div key={pago.method} style={{background:'#0f172a',borderRadius:8,padding:10,marginBottom:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:12,fontWeight:600,color:mc?.color}}>{mc?.label}</span>
                        <div style={{display:'flex',gap:6}}>
                          {pagos.length>1&&<button onClick={()=>distribuirResto(pago.method)} style={{fontSize:10,padding:'2px 8px',borderRadius:4,border:`1px solid ${mc?.color}`,background:'none',color:mc?.color,cursor:'pointer'}}>Resto</button>}
                          {pagos.length>1&&<button onClick={()=>quitarMetodo(pago.method)} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:16}}>✕</button>}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <input type="number" min="0" step="0.01" autoFocus={pago.method==='EFECTIVO'}
                          style={{flex:1,padding:'8px 10px',borderRadius:6,border:`1px solid ${mc?.color}44`,background:'#1e293b',color:'#f1f5f9',fontSize:16,fontWeight:700}}
                          value={pago.amount||''} placeholder={fmt(pagos.length===1?total:0)}
                          onChange={e=>actualizarMonto(pago.method,+e.target.value)}/>
                        <button onClick={()=>actualizarMonto(pago.method,pagos.length===1?total:Math.max(0,total-pagos.filter(p=>p.method!==pago.method).reduce((t,p)=>t+Number(p.amount||0),0)))}
                          style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${mc?.color}`,background:'none',color:mc?.color,cursor:'pointer',fontSize:12}}>
                          Exacto
                        </button>
                      </div>
                      {pago.method!=='EFECTIVO'&&(
                        <div style={{marginTop:6}}>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <input type="text"
                              style={{flex:1,padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#1e293b',color:'#94a3b8',fontSize:11}}
                              placeholder={pago.method==='TRANSFERENCIA'?'Clave de rastreo SPEI':'Últimos 4 dígitos / No. autorización'}
                              value={pago.reference||''}
                              onChange={e=>actualizarReferencia(pago.method,e.target.value)}/>
                            <RefTooltip method={pago.method}/>
                            {pago.method==='TRANSFERENCIA'&&pago.reference&&pago.reference.length>=10&&(
                              <button onClick={()=>window.open(`https://www.banxico.org.mx/cep/?i=90646&s=20${new Date().toISOString().slice(0,10).replace(/-/g,'')}&n=${encodeURIComponent(pago.reference||'')}`, '_blank')}
                                style={{padding:'5px 8px',borderRadius:6,border:'1px solid #06b6d4',background:'none',color:'#06b6d4',cursor:'pointer',fontSize:10,whiteSpace:'nowrap'}}>
                                Verificar CEP
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {pagos.length<METODOS_PAGO.length&&(
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:6}}>
                    {METODOS_PAGO.filter(m=>!pagos.find(p=>p.method===m.id)).map(m=>(
                      <button key={m.id} onClick={()=>agregarMetodo(m.id)}
                        style={{padding:'4px 10px',borderRadius:6,fontSize:11,cursor:'pointer',border:`1px solid ${m.color}44`,background:'none',color:`${m.color}bb`}}>
                        + {m.label}
                      </button>
                    ))}
                  </div>
                )}
                {esMixto&&(
                  <div style={{background:'#0f172a',borderRadius:6,padding:'8px 12px',marginTop:8,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:12,color:'#64748b'}}>Total cubierto</span>
                    <span style={{fontSize:13,fontWeight:700,color:totalPagado>=total?'#10b981':'#f59e0b'}}>{fmt(totalPagado)} / {fmt(total)}</span>
                  </div>
                )}
              </div>
              {/* Cambio efectivo — desglose de denominaciones */}
              <div>
                {tieneEfectivo?(()=>{
                  const BILLETES = [500,200,100,50,20];
                  const MONEDAS  = [10,5,2,1,0.5];
                  const [cobDen, setCobDen] = [efectivoCobro, setEfectivoCobro];
                  const totalDen = DENOMINACIONES.reduce((t,d)=>t+(d*(cobDen?.[`den_${d}`]||0)),0);
                  const montoEfectivo = totalDen > 0 ? totalDen : Number(pagos.find(p=>p.method==='EFECTIVO')?.amount||0);
                  const cambio = Math.max(0, montoEfectivo - faltaEfectivo);
                  const suficiente = montoEfectivo >= faltaEfectivo && montoEfectivo > 0;
                  // Sync to pagos when totalDen changes
                  if(totalDen>0 && Number(pagos.find(p=>p.method==='EFECTIVO')?.amount||0)!==totalDen){
                    setTimeout(()=>actualizarMonto('EFECTIVO',totalDen),0);
                  }
                  return(
                    <>
                      <p style={{fontSize:10,color:'#64748b',margin:'0 0 6px',textTransform:'uppercase',letterSpacing:1,fontWeight:700}}>Efectivo recibido</p>
                      {esMixto&&(
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,padding:'6px 10px',background:'#0f172a',borderRadius:6}}>
                          <span style={{fontSize:12,color:'#64748b'}}>Debe cubrir en efectivo</span>
                          <span style={{fontSize:13,fontWeight:700,color:'#10b981'}}>{fmt(faltaEfectivo)}</span>
                        </div>
                      )}
                      <div style={{background:'#0f172a',borderRadius:8,padding:10,marginBottom:8,maxHeight:200,overflowY:'auto'}}>
                        <p style={{fontSize:9,color:'#64748b',margin:'0 0 6px',textTransform:'uppercase',letterSpacing:1}}>Billetes</p>
                        {BILLETES.map(d=>(
                          <div key={d} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                            <span style={{fontSize:11,color:'#94a3b8',width:38,textAlign:'right'}}>${d}</span>
                            <span style={{fontSize:10,color:'#475569'}}>×</span>
                            <input type="number" min="0"
                              style={{width:44,padding:'2px 5px',borderRadius:5,border:'1px solid #334155',background:'#1e293b',color:'#f1f5f9',fontSize:11,textAlign:'center'}}
                              value={cobDen?.[`den_${d}`]||''}
                              onChange={e=>{const v={...cobDen,[`den_${d}`]:+e.target.value};setCobDen(v);const tot=DENOMINACIONES.reduce((t,dd)=>t+(dd*(v?.[`den_${dd}`]||0)),0);actualizarMonto('EFECTIVO',tot);}}/>
                            <span style={{fontSize:11,color,fontWeight:600,marginLeft:'auto'}}>{fmt(d*(cobDen?.[`den_${d}`]||0))}</span>
                          </div>
                        ))}
                        <p style={{fontSize:9,color:'#64748b',margin:'8px 0 6px',textTransform:'uppercase',letterSpacing:1}}>Monedas</p>
                        {MONEDAS.map(d=>(
                          <div key={d} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                            <span style={{fontSize:11,color:'#94a3b8',width:38,textAlign:'right'}}>${d}</span>
                            <span style={{fontSize:10,color:'#475569'}}>×</span>
                            <input type="number" min="0"
                              style={{width:44,padding:'2px 5px',borderRadius:5,border:'1px solid #334155',background:'#1e293b',color:'#f1f5f9',fontSize:11,textAlign:'center'}}
                              value={cobDen?.[`den_${d}`]||''}
                              onChange={e=>{const v={...cobDen,[`den_${d}`]:+e.target.value};setCobDen(v);const tot=DENOMINACIONES.reduce((t,dd)=>t+(dd*(v?.[`den_${dd}`]||0)),0);actualizarMonto('EFECTIVO',tot);}}/>
                            <span style={{fontSize:11,color,fontWeight:600,marginLeft:'auto'}}>{fmt(d*(cobDen?.[`den_${d}`]||0))}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0f172a',borderRadius:8,padding:'8px 12px',marginBottom:8}}>
                        <span style={{fontSize:12,color:'#64748b'}}>Total contado</span>
                        <span style={{fontSize:16,fontWeight:700,color:suficiente?'#10b981':'#f59e0b'}}>{fmt(montoEfectivo)}</span>
                      </div>
                      <div style={{background:'#0f172a',borderRadius:8,padding:12,textAlign:'center'}}>
                        <p style={{fontSize:11,color:'#64748b',margin:'0 0 4px'}}>Cambio</p>
                        <p style={{fontSize:32,fontWeight:700,margin:0,color:suficiente?'#10b981':'#475569'}}>
                          {suficiente?fmt(cambio):'—'}
                        </p>
                      </div>
                    </>
                  );
                })():(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#0f172a',borderRadius:8,padding:24}}>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:32,margin:'0 0 8px'}}>💳</p>
                      <p style={{fontSize:13,color:'#64748b',margin:0}}>Pago electrónico</p>
                      <p style={{fontSize:18,fontWeight:700,color:'#10b981',margin:'8px 0 0'}}>{fmt(totalPagado)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={()=>{setShowCobro(false);setEfectivoCobro({});}} style={{flex:1,padding:'11px',borderRadius:8,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>Cancelar</button>
              {(()=>{
                const montoEfectivo = Number(pagos.find(p=>p.method==='EFECTIVO')?.amount||0);
                const cambio = Math.max(0, montoEfectivo - faltaEfectivo);
                const efectivoOk = !tieneEfectivo || montoEfectivo >= faltaEfectivo;
                const totalOk = !esMixto || totalPagado >= total;
                const pureEfectivoOk = !esMixto && tieneEfectivo ? montoEfectivo >= total : true;
                const canConfirm = !saleM.isPending && efectivoOk && totalOk && pureEfectivoOk;
                return(
                  <button onClick={()=>saleM.mutate()} disabled={!canConfirm}
                    style={{flex:2,padding:'11px',borderRadius:8,border:'none',fontSize:13,fontWeight:700,color:'#fff',cursor:canConfirm?'pointer':'not-allowed',
                      background:canConfirm?color:'#334155'}}>
                    {saleM.isPending?'Procesando…':tieneEfectivo?`Confirmar — Cambio ${fmt(cambio)}`:`Confirmar — ${fmt(total)}`}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tira X */}
      {showTiraX&&tiraData&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:720,maxHeight:'85vh',overflowY:'auto',border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:16,fontWeight:700,margin:0,color}}>Tira X {tiraXGuardada?'✔ Guardada':''}</h3>
              <button onClick={()=>setShowTiraX(false)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Efectivo</p>
                <div style={{background:'#0f172a',borderRadius:8,padding:10}}>
                  {DENOMINACIONES.map(d=>(
                    <div key={d} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                      <span style={{fontSize:11,color:'#94a3b8',width:42,textAlign:'right'}}>${d}</span>
                      <span style={{fontSize:10,color:'#64748b'}}>×</span>
                      <input type="number" min="0" disabled={tiraXGuardada}
                        style={{width:48,padding:'3px 6px',borderRadius:5,border:'1px solid #334155',background:tiraXGuardada?'#0f172a':'#1e293b',color:'#f1f5f9',fontSize:11,textAlign:'center'}}
                        value={efectivoCaja?.[`den_${d}`]||''} onChange={e=>setEfectivoCaja((prev:any)=>({...prev,[`den_${d}`]:+e.target.value}))}/>
                      <span style={{fontSize:11,color,fontWeight:600,marginLeft:'auto'}}>{fmt(d*(efectivoCaja?.[`den_${d}`]||0))}</span>
                    </div>
                  ))}
                  <div style={{borderTop:'1px solid #334155',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:12,color:'#64748b'}}>Total</span>
                    <span style={{fontSize:14,fontWeight:700,color}}>{fmt(DENOMINACIONES.reduce((t,d)=>t+d*(efectivoCaja?.[`den_${d}`]||0),0))}</span>
                  </div>
                </div>
              </div>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Terminal bancaria</p>
                <div style={{background:'#0f172a',borderRadius:8,padding:10}}>
                  {[['TARJETA_DEBITO','Débito'],['TARJETA_CREDITO','Crédito'],['TRANSFERENCIA','Transferencia']].map(([k,l])=>(
                    <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{l}</span>
                      <input type="number" min="0" step="0.01" disabled={tiraXGuardada}
                        style={{width:90,padding:'3px 6px',borderRadius:5,border:'1px solid #334155',background:tiraXGuardada?'#0f172a':'#1e293b',color:'#f1f5f9',fontSize:11,textAlign:'right'}}
                        value={efectivoCaja?.[`term_${k}`]||''} onChange={e=>setEfectivoCaja((prev:any)=>({...prev,[`term_${k}`]:+e.target.value}))}/>
                    </div>
                  ))}
                  <div style={{borderTop:'1px solid #334155',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:12,color:'#64748b'}}>Total</span>
                    <span style={{fontSize:14,fontWeight:700,color}}>{fmt(['TARJETA_DEBITO','TARJETA_CREDITO','TRANSFERENCIA'].reduce((t,k)=>t+(efectivoCaja?.[`term_${k}`]||0),0))}</span>
                  </div>
                </div>
              </div>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Delivery</p>
                <div style={{background:'#0f172a',borderRadius:8,padding:10}}>
                  {[['rappi','Rappi'],['ubereats','Uber Eats'],['didi','DiDi Food']].map(([k,l])=>(
                    <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{l}</span>
                      <input type="number" min="0" step="0.01" disabled={tiraXGuardada}
                        style={{width:90,padding:'3px 6px',borderRadius:5,border:'1px solid #334155',background:tiraXGuardada?'#0f172a':'#1e293b',color:'#f1f5f9',fontSize:11,textAlign:'right'}}
                        value={efectivoCaja?.[`del_${k}`]||''} onChange={e=>setEfectivoCaja((prev:any)=>({...prev,[`del_${k}`]:+e.target.value}))}/>
                    </div>
                  ))}
                  <div style={{borderTop:'1px solid #334155',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:12,color:'#64748b'}}>Total</span>
                    <span style={{fontSize:14,fontWeight:700,color}}>{fmt(['rappi','ubereats','didi'].reduce((t,k)=>t+(efectivoCaja?.[`del_${k}`]||0),0))}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowTiraX(false)} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>Cerrar</button>
              {!tiraXGuardada&&<button onClick={()=>{setTiraXGuardada(true);setShowTiraX(false);}} style={{padding:'8px 24px',borderRadius:8,border:'none',background:color,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>Guardar Tira X</button>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tira Z */}
      {showTiraZ&&tiraData&&tiraXGuardada&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:20,width:'90vw',maxWidth:820,border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,borderBottom:'1px solid #334155',paddingBottom:10}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 2px',color:'#f59e0b'}}>Tira Z — Corte de caja</h3>
                <p style={{fontSize:11,color:'#64748b',margin:0}}>{tiraData.fecha} · {tiraData.hoy?.length||0} ventas</p>
              </div>
              <button onClick={()=>setShowTiraZ(false)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}}>
              <div style={{background:'#0f172a',borderRadius:8,padding:10}}>
                <p style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Ventas por familia</p>
                {Object.entries(tiraData.porFamilia||{}).map(([fam,monto]:any)=>(
                  <div key={fam} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:'#94a3b8'}}>{fam}</span>
                    <span style={{fontSize:11,fontWeight:600,color:'#f1f5f9'}}>{fmt(monto)}</span>
                  </div>
                ))}
                <div style={{borderTop:'1px solid #334155',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#64748b'}}>Total</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#f59e0b'}}>{fmt(tiraData.totalBruto)}</span>
                </div>
              </div>
              <div style={{background:'#0f172a',borderRadius:8,padding:10}}>
                <p style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Formas de pago (sistema)</p>
                {[
                  {key:'EFECTIVO',label:'Efectivo',col:'#10b981'},
                  {key:'TARJETA_DEBITO',label:'Tarjeta débito',col:'#3b82f6'},
                  {key:'TARJETA_CREDITO',label:'Tarjeta crédito',col:'#8b5cf6'},
                  {key:'TRANSFERENCIA',label:'Transferencia',col:'#06b6d4'},
                  {key:'CREDITO_CLIENTE',label:'Crédito cliente',col:'#f59e0b'},
                  {key:'rappi',label:'Rappi',col:'#f97316'},
                  {key:'ubereats',label:'Uber Eats',col:'#84cc16'},
                  {key:'didi',label:'DiDi Food',col:'#facc15'},
                ].filter(fp=>(tiraData.porMetodo[fp.key]||0)>0).map(fp=>(
                  <div key={fp.key} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:fp.col}}>{fp.label}</span>
                    <span style={{fontSize:11,fontWeight:600,color:'#f1f5f9'}}>{fmt(tiraData.porMetodo[fp.key]||0)}</span>
                  </div>
                ))}
              </div>
            </div>
            {(tiraData.movimientos||[]).length>0&&(
              <div style={{background:'#0f172a',borderRadius:8,padding:10,marginBottom:10}}>
                <p style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Movimientos de caja</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {(()=>{const deps=(tiraData.movimientos||[]).filter((m:any)=>m.type==='ENTRADA').reduce((t:number,m:any)=>t+Number(m.amount),0);const rets=(tiraData.movimientos||[]).filter((m:any)=>m.type==='SALIDA').reduce((t:number,m:any)=>t+Number(m.amount),0);return[{label:'Depósitos',value:deps,col:'#10b981'},{label:'Retiros',value:rets,col:'#f87171'},{label:'Neto',value:deps-rets,col:deps-rets>=0?'#10b981':'#f87171'}].map(r=>(<div key={r.label} style={{textAlign:'center'}}><p style={{fontSize:10,color:'#64748b',margin:'0 0 2px'}}>{r.label}</p><p style={{fontSize:14,fontWeight:700,color:r.col,margin:0}}>{fmt(r.value)}</p></div>));})()}
                </div>
              </div>
            )}
            <div style={{background:'#0f172a',borderRadius:8,padding:10,marginBottom:14}}>
              <p style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Cajero declaró vs sistema</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[
                  {label:'Efectivo',declarado:DENOMINACIONES.reduce((t,d)=>t+d*(efectivoCaja?.[`den_${d}`]||0),0),esperado:tiraData.porMetodo['EFECTIVO']||0},
                  {label:'Terminal',declarado:['TARJETA_DEBITO','TARJETA_CREDITO','TRANSFERENCIA'].reduce((t,k)=>t+(efectivoCaja?.[`term_${k}`]||0),0),esperado:(tiraData.porMetodo['TARJETA_DEBITO']||0)+(tiraData.porMetodo['TARJETA_CREDITO']||0)+(tiraData.porMetodo['TRANSFERENCIA']||0)},
                  {label:'Delivery',declarado:['rappi','ubereats','didi'].reduce((t,k)=>t+(efectivoCaja?.[`del_${k}`]||0),0),esperado:['rappi','ubereats','didi'].reduce((t,k)=>t+(tiraData.porMetodo[k]||0),0)},
                ].map(r=>{const dif=r.declarado-r.esperado;return(
                  <div key={r.label} style={{background:'#1e293b',borderRadius:6,padding:8}}>
                    <p style={{fontSize:10,fontWeight:700,color:'#64748b',margin:'0 0 6px',textTransform:'uppercase'}}>{r.label}</p>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:10,color:'#64748b'}}>Declarado</span><span style={{fontSize:12,color:'#f1f5f9',fontWeight:600}}>{fmt(r.declarado)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:10,color:'#64748b'}}>Esperado</span><span style={{fontSize:12,color:'#94a3b8'}}>{fmt(r.esperado)}</span></div>
                    <div style={{borderTop:'1px solid #334155',paddingTop:4,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:10,color:'#64748b'}}>Diferencia</span><span style={{fontSize:13,fontWeight:700,color:dif===0?'#10b981':dif>0?'#3b82f6':'#f87171'}}>{dif>0?'+':''}{fmt(dif)}</span></div>
                  </div>
                );})}
              </div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowTiraZ(false)} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #334155',background:'none',color:'#64748b',cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button onClick={async()=>{
                try{
                  await api.post(`/companies/${cid}/corte-caja`,{
                    fecha:tiraData.fecha,totalVentas:tiraData.totalBruto,
                    totalEfectivo:tiraData.porMetodo['EFECTIVO']||0,
                    totalTarjeta:(tiraData.porMetodo['TARJETA_DEBITO']||0)+(tiraData.porMetodo['TARJETA_CREDITO']||0),
                    totalTransfer:tiraData.porMetodo['TRANSFERENCIA']||0,
                    totalCredito:tiraData.porMetodo['CREDITO_CLIENTE']||0,
                    efectivoContado:DENOMINACIONES.reduce((t,d)=>t+d*(efectivoCaja?.[`den_${d}`]||0),0),
                    desgloseDenominaciones:efectivoCaja,desgloseTerminales:efectivoCaja,desgloseDelivery:efectivoCaja,
                  });
                  setShowTiraZ(false);setTiraXGuardada(false);setEfectivoCaja({});
                  alert('✔ Corte enviado al contador');
                }catch(e:any){alert(e.response?.data?.message||'Error');}
              }} style={{padding:'8px 24px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>
                Confirmar Tira Z
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crédito bloqueado */}
      {showCreditBlock&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:380,border:'1px solid #f87171'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 8px',color:'#f87171'}}>⚠ Límite de crédito excedido</h3>
            <p style={{fontSize:13,color:'#94a3b8',margin:'0 0 16px'}}>Se requiere autorización de un gerente.</p>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>PIN de autorización</label>
              <input type="password" className="input-base" style={{fontSize:16,letterSpacing:4,textAlign:'center'}}
                value={creditPin} onChange={e=>{setCreditPin(e.target.value);setCreditPinError('');}} placeholder="● ● ● ●"/>
              {creditPinError&&<p style={{fontSize:12,color:'#f87171',margin:'4px 0 0'}}>{creditPinError}</p>}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={()=>{setShowCreditBlock(false);setCreditPin('');}}>Cancelar</button>
              <button onClick={async()=>{
                try{await api.post('/auth/verify-pin',{companyId:cid,pin:creditPin});setShowCreditBlock(false);setCreditPin('');setError('');saleM.mutate();}
                catch{setCreditPinError('PIN incorrecto');}
              }} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>Autorizar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Depósito/Retiro */}
      {showMovCaja&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:380,border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,margin:0,color:showMovCaja==='deposito'?'#10b981':'#f87171'}}>{showMovCaja==='deposito'?'↑ Depósito en caja':'↓ Retiro de caja'}</h3>
              <button onClick={()=>setShowMovCaja(null)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            {showMovCaja==='retiro'&&(
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Motivo</label>
                <div style={{display:'flex',gap:6}}>
                  {[{id:'seguridad',label:'Seguridad'},{id:'compra_express',label:'Compra express'},{id:'otro',label:'Otro'}].map(m=>(
                    <button key={m.id} onClick={()=>setMovMotivo(m.id)}
                      style={{flex:1,padding:'6px',borderRadius:6,fontSize:11,cursor:'pointer',border:`1px solid ${movMotivo===m.id?'#f87171':'#334155'}`,background:movMotivo===m.id?'#f8717122':'transparent',color:movMotivo===m.id?'#f87171':'#64748b'}}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Monto *</label>
              <input type="number" min="0" step="0.01" className="input-base" style={{fontSize:16,fontWeight:700}} value={movMonto||''} onChange={e=>setMovMonto(+e.target.value)} placeholder="0.00"/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Notas</label>
              <input className="input-base" style={{fontSize:13}} value={movNota} onChange={e=>setMovNota(e.target.value)} placeholder={showMovCaja==='deposito'?'Fondo de cambio...':'Destino del retiro...'}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-secondary" style={{flex:1,fontSize:13}} onClick={()=>setShowMovCaja(null)}>Cancelar</button>
              <button onClick={async()=>{
                if(!movMonto||movMonto<=0){alert('Ingresa un monto válido');return;}
                setSavingMov(true);
                try{
                  await api.post(`/companies/${cid}/flow/movements`,{type:showMovCaja==='deposito'?'ENTRADA':'SALIDA',originType:showMovCaja==='deposito'?'DEPOSITO_CAJA':movMotivo==='compra_express'?'COMPRA_EXPRESS':'RETIRO_CAJA',amount:movMonto,date:new Date().toISOString().slice(0,10),notes:movNota||null});
                  setShowMovCaja(null);setMovMonto(0);setMovNota('');
                  alert(`✔ ${showMovCaja==='deposito'?'Depósito':'Retiro'} registrado`);
                }catch(e:any){alert(e.response?.data?.message||'Error');}
                finally{setSavingMov(false);}
              }} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:showMovCaja==='deposito'?'#10b981':'#f87171',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}} disabled={savingMov||!movMonto}>
                {savingMov?'Registrando…':showMovCaja==='deposito'?'Registrar depósito':'Registrar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function POSPage() {
  return <POSErrorBoundary><POSPageInner/></POSErrorBoundary>;
}
