// ╔══════════════════════════════════════════════════════════════════╗
// ║  CobroModal — Componente compartido para TODOS los POS          ║
// ║  Misma lógica de cobro en Machete, Palestra, Workaholic, Lonche ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect } from 'react';
import { fmt } from '../lib/api';

export type MetodoPago = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA';

interface PagoLine {
  metodo: MetodoPago;
  monto: number;
  referencia?: string;
}

interface CobroModalProps {
  total: number;
  color: string;
  clientName?: string;
  nota?: string;
  onNota?: (v: string) => void;
  onCobrar: (pagos: PagoLine[], nota: string) => void;
  onCancel: () => void;
  loading?: boolean;
  allowCredit?: boolean;   // Palestra/Workaholic: venta a crédito
  clienteId?: string;      // Requerido si allowCredit
}

const METODOS: { id: MetodoPago; label: string; icon: string; color: string }[] = [
  { id: 'EFECTIVO',        label: 'Efectivo',      icon: '💵', color: '#10b981' },
  { id: 'TARJETA_DEBITO',  label: 'T. Débito',     icon: '💳', color: '#3b82f6' },
  { id: 'TARJETA_CREDITO', label: 'T. Crédito',    icon: '💳', color: '#8b5cf6' },
  { id: 'TRANSFERENCIA',   label: 'Transferencia',  icon: '🏦', color: '#06b6d4' },
];

export default function CobroModal({
  total, color, clientName, onCobrar, onCancel,
  loading = false, allowCredit = false, clienteId,
}: CobroModalProps) {
  const [pagos,      setPagos]      = useState<PagoLine[]>([{ metodo: 'EFECTIVO', monto: total, referencia: '' }]);
  const [nota,       setNota]       = useState('');
  const [error,      setError]      = useState('');
  const [esCredito,  setEsCredito]  = useState(false);

  // Denominaciones efectivo
  const DENOMS = [20, 50, 100, 200, 500, 1000];
  const efectivoTotal = pagos.filter(p => p.metodo === 'EFECTIVO').reduce((t, p) => t + p.monto, 0);
  const otrosTotal    = pagos.filter(p => p.metodo !== 'EFECTIVO').reduce((t, p) => t + p.monto, 0);
  const sumaPagos     = pagos.reduce((t, p) => t + p.monto, 0);
  const cambio        = Math.max(0, efectivoTotal - (total - otrosTotal));
  const faltante      = Math.max(0, total - sumaPagos);

  const setMonto = (idx: number, monto: number) => {
    setPagos(ps => ps.map((p, i) => i === idx ? { ...p, monto: Math.max(0, monto) } : p));
  };

  const setRef = (idx: number, referencia: string) => {
    setPagos(ps => ps.map((p, i) => i === idx ? { ...p, referencia } : p));
  };

  const addPago = () => {
    setPagos(ps => [...ps, { metodo: 'EFECTIVO', monto: faltante > 0 ? faltante : 0, referencia: '' }]);
  };

  const removePago = (idx: number) => {
    if (pagos.length === 1) return;
    setPagos(ps => ps.filter((_, i) => i !== idx));
  };

  const setExacto = () => {
    // Distribuir el total exacto en la primera línea de efectivo
    setPagos(ps => {
      const yaOtros = ps.filter(p => p.metodo !== 'EFECTIVO').reduce((t, p) => t + p.monto, 0);
      return ps.map((p, i) => i === 0 ? { ...p, monto: total - yaOtros } : p);
    });
  };

  const cobrar = () => {
    setError('');
    if (esCredito) {
      if (!clienteId) { setError('Selecciona un cliente para venta a crédito'); return; }
      onCobrar([{ metodo: 'EFECTIVO', monto: 0 }], nota);
      return;
    }

    // Validar que el total cuadre
    if (Math.abs(sumaPagos - total) > 0.01 && cambio <= 0) {
      setError(`Falta ${fmt(faltante)} por asignar`);
      return;
    }

    // Validar referencias de tarjeta y transferencia
    for (const p of pagos) {
      if ((p.metodo === 'TARJETA_DEBITO' || p.metodo === 'TARJETA_CREDITO')) {
        if (!p.referencia || p.referencia.trim().length < 4) {
          setError('Ingresa los últimos 4 dígitos de autorización de la tarjeta');
          return;
        }
      }
      if (p.metodo === 'TRANSFERENCIA') {
        if (!p.referencia || p.referencia.trim().length < 10) {
          setError('Ingresa la clave de rastreo (mínimo 10 caracteres)');
          return;
        }
      }
    }

    onCobrar(pagos.filter(p => p.monto > 0), nota);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#1e293b', borderRadius:14, padding:24,
        width:440, maxHeight:'92vh', overflowY:'auto', border:`1px solid ${color}44` }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:800, margin:0, color:'#f1f5f9' }}>Cobro</h2>
            {clientName && <p style={{ fontSize:12, color:'#64748b', margin:'2px 0 0' }}>{clientName}</p>}
          </div>
          <span style={{ fontSize:26, fontWeight:800, color }}>{fmt(total)}</span>
        </div>

        {/* Líneas de pago */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
          {pagos.map((pago, idx) => {
            const met = METODOS.find(m => m.id === pago.metodo)!;
            const needsRef = pago.metodo !== 'EFECTIVO';
            return (
              <div key={idx} style={{ background:'#0f172a', borderRadius:10, padding:12,
                border:`1px solid ${met.color}33` }}>
                {/* Selector de método */}
                <div style={{ display:'flex', gap:4, marginBottom:8, flexWrap:'wrap' }}>
                  {METODOS.map(m => (
                    <button key={m.id}
                      onClick={() => setPagos(ps => ps.map((p,i) => i===idx ? {...p, metodo:m.id, referencia:''} : p))}
                      style={{ padding:'4px 10px', borderRadius:7, fontSize:11, cursor:'pointer',
                        border:`1px solid ${pago.metodo===m.id?m.color:'#334155'}`,
                        background:pago.metodo===m.id?m.color+'22':'transparent',
                        color:pago.metodo===m.id?m.color:'#64748b',
                        fontWeight:pago.metodo===m.id?700:400 }}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                {/* Monto */}
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom: needsRef ? 8 : 0 }}>
                  <label style={{ fontSize:11, color:'#64748b', minWidth:50 }}>Monto</label>
                  <input type="number" value={pago.monto || ''} min={0}
                    onChange={e => setMonto(idx, Number(e.target.value))}
                    style={{ flex:1, padding:'7px 10px', borderRadius:7,
                      border:`1px solid ${met.color}55`, background:'#1e293b',
                      color:'#f1f5f9', fontSize:14, fontWeight:700, textAlign:'right' }}/>
                  {pago.metodo === 'EFECTIVO' && (
                    <button onClick={setExacto}
                      style={{ padding:'6px 10px', borderRadius:7, border:`1px solid ${color}`,
                        background:'none', color, cursor:'pointer', fontSize:11, whiteSpace:'nowrap' }}>
                      Exacto
                    </button>
                  )}
                  {pagos.length > 1 && (
                    <button onClick={() => removePago(idx)}
                      style={{ padding:'6px', borderRadius:7, border:'1px solid #f87171',
                        background:'none', color:'#f87171', cursor:'pointer', fontSize:11 }}>✕</button>
                  )}
                </div>

                {/* Denominaciones rápidas (solo efectivo) */}
                {pago.metodo === 'EFECTIVO' && (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
                    {DENOMS.map(d => (
                      <button key={d} onClick={() => setMonto(idx, d)}
                        style={{ padding:'3px 8px', borderRadius:6, fontSize:10, cursor:'pointer',
                          border:'1px solid #334155', background:'#334155', color:'#94a3b8' }}>
                        ${d}
                      </button>
                    ))}
                  </div>
                )}

                {/* Referencia (tarjeta/transferencia) */}
                {needsRef && (
                  <input
                    placeholder={
                      pago.metodo === 'TRANSFERENCIA'
                        ? 'Clave de rastreo SPEI (mín. 10 dígitos)'
                        : 'Últimos 4 dígitos de autorización'
                    }
                    value={pago.referencia || ''}
                    onChange={e => setRef(idx, e.target.value)}
                    maxLength={pago.metodo === 'TRANSFERENCIA' ? 30 : 4}
                    style={{ width:'100%', padding:'7px 10px', borderRadius:7,
                      border:`1px solid ${(pago.referencia?.length || 0) >= (pago.metodo==='TRANSFERENCIA'?10:4) ? '#10b981' : '#f87171'}`,
                      background:'#1e293b', color:'#f1f5f9', fontSize:12, boxSizing:'border-box' }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Agregar otro método */}
        {faltante > 0.01 && (
          <button onClick={addPago}
            style={{ width:'100%', padding:'7px', borderRadius:8, border:'1px dashed #334155',
              background:'none', color:'#64748b', cursor:'pointer', fontSize:12, marginBottom:10 }}>
            + Agregar otro método de pago ({fmt(faltante)} restante)
          </button>
        )}

        {/* Cambio efectivo */}
        {cambio > 0.01 && (
          <div style={{ background:'#10b98122', border:'1px solid #10b98144', borderRadius:9,
            padding:'10px 14px', marginBottom:10, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:14, color:'#10b981', fontWeight:700 }}>💵 Cambio</span>
            <span style={{ fontSize:20, fontWeight:800, color:'#10b981' }}>{fmt(cambio)}</span>
          </div>
        )}

        {/* Nota */}
        <input placeholder="Nota u observación (opcional)" value={nota}
          onChange={e => setNota(e.target.value)}
          style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155',
            background:'#0f172a', color:'#f1f5f9', fontSize:12,
            marginBottom:10, boxSizing:'border-box' }}/>

        {/* Crédito (si aplica) */}
        {allowCredit && (
          <label style={{ display:'flex', gap:8, alignItems:'center',
            fontSize:12, color:'#f59e0b', cursor:'pointer', marginBottom:10 }}>
            <input type="checkbox" checked={esCredito} onChange={e => setEsCredito(e.target.checked)}
              style={{ accentColor:'#f59e0b' }}/>
            Registrar como venta a crédito (genera CxC)
          </label>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize:12, color:'#f87171', margin:'0 0 10px',
            background:'rgba(248,113,113,0.1)', padding:'8px 12px', borderRadius:7 }}>
            ⚠ {error}
          </p>
        )}

        {/* Resumen y botones */}
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginBottom:14 }}>
          <div>
            <p style={{ fontSize:11, color:'#64748b', margin:0 }}>Total a cobrar</p>
            <p style={{ fontSize:20, fontWeight:800, color, margin:0 }}>{fmt(total)}</p>
          </div>
          {sumaPagos > total + 0.01 && (
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:11, color:'#64748b', margin:0 }}>Recibido</p>
              <p style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:0 }}>{fmt(sumaPagos)}</p>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:'11px', borderRadius:9,
              border:'1px solid #334155', background:'none',
              color:'#64748b', cursor:'pointer', fontSize:13 }}>
            Cancelar
          </button>
          <button onClick={cobrar} disabled={loading || (!esCredito && faltante > 0.01 && cambio <= 0)}
            style={{ flex:2, padding:'11px', borderRadius:9, border:'none',
              background: faltante > 0.01 && cambio <= 0 && !esCredito ? '#334155' : color,
              color: faltante > 0.01 && cambio <= 0 && !esCredito ? '#64748b' : '#fff',
              cursor: faltante > 0.01 && cambio <= 0 && !esCredito ? 'not-allowed' : 'pointer',
              fontSize:14, fontWeight:800 }}>
            {loading ? 'Procesando…' : esCredito ? `REGISTRAR A CRÉDITO ${fmt(total)}` : `COBRAR ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
