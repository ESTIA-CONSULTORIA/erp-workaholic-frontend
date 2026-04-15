import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../store/erp.store';
import { api, fmt, fmtDate } from '../lib/api';

// Parsear historial de notasCajero (JSON nuevo o texto viejo)
function parsearHistorial(notasCajero: string | null): any[] {
  if (!notasCajero) return [];
  try {
    const parsed = JSON.parse(notasCajero);
    if (Array.isArray(parsed)) return parsed;
  } catch(e) {}
  // Formato viejo
  return notasCajero.split('|').map(s => s.trim()).filter(Boolean).map(m => ({
    tipo: 'cajero',
    mensaje: m.replace(/^RESPUESTA:\s*/i, ''),
    fecha: null,
  }));
}

export default function CorteCajaPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();

  const puedeValidar = ['admin','administrador','gerente','contador'].includes(role);

  const [vista, setVista] = useState<'nuevo'|'historial'>('historial');
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0,10),
    efectivoContado: 0, totalEfectivo: 0, totalTarjeta: 0,
    totalTransfer: 0, totalCredito: 0, totalVentas: 0, notasCajero: '',
  });

  // Modal validación (contador)
  const [corteSeleccionado, setCorteSeleccionado] = useState<any>(null);
  const [efectivoReal,  setEfectivoReal]  = useState(0);
  const [notasValid,    setNotasValid]    = useState('');
  const [saving,        setSaving]        = useState(false);

  // Modal respuesta (cajero)
  const [corteRespuesta,  setCorteRespuesta]  = useState<any>(null);
  const [respuestaTexto,  setRespuestaTexto]  = useState('');
  const [ticketImg,       setTicketImg]       = useState<string|null>(null);
  const [ticketNombre,    setTicketNombre]    = useState('');

  // Modal detalle (ver conversación completa)
  const [corteDetalle, setCorteDetalle] = useState<any>(null);

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}));

  const { data: cortes = [] } = useQuery({
    queryKey: ['cortes-caja', cid],
    queryFn:  () => api.get(`/companies/${cid}/corte-caja`).then(r => r.data),
    enabled:  !!cid,
  });

  const crearM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/corte-caja`, form),
    onSuccess: () => { setVista('historial'); qc.invalidateQueries({ queryKey: ['cortes-caja', cid] }); },
  });

  const validarM = useMutation({
    mutationFn: (corteId: string) => api.put(`/companies/${cid}/corte-caja/${corteId}/validar`, {
      efectivoReal: efectivoReal || null, notasValidador: notasValid,
    }),
    onSuccess: () => { setCorteSeleccionado(null); qc.invalidateQueries({ queryKey: ['cortes-caja', cid] }); },
  });

  const rechazarM = useMutation({
    mutationFn: (corteId: string) => api.put(`/companies/${cid}/corte-caja/${corteId}/rechazar`, { notas: notasValid }),
    onSuccess: () => { setCorteSeleccionado(null); qc.invalidateQueries({ queryKey: ['cortes-caja', cid] }); },
  });

  const handleTicketUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTicketNombre(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          setTicketImg(canvas.toDataURL('image/jpeg', 0.65));
        };
        img.src = ev.target!.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => setTicketImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const STATUS_COLOR: Record<string,string> = {
    PENDIENTE:'#f59e0b', VALIDADO:'#10b981', RECHAZADO:'#f87171'
  };

  const DENOMINACIONES = [500,200,100,50,20,10,5,2,1,0.5];

  // Componente burbuja de conversación
  const Burbuja = ({ msg }: { msg: any }) => {
    const esCajero = msg.tipo === 'cajero';
    return (
      <div style={{ display:'flex', justifyContent: esCajero ? 'flex-start' : 'flex-end', marginBottom:10 }}>
        <div style={{ maxWidth:'80%' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3,
            justifyContent: esCajero ? 'flex-start' : 'flex-end' }}>
            <span style={{ fontSize:10, color:'#64748b' }}>
              {esCajero ? '👤 Cajero' : '🧾 Contador'}
              {msg.accion === 'rechazo' && <span style={{ color:'#f87171', marginLeft:4 }}>(Rechazo)</span>}
            </span>
            {msg.fecha && (
              <span style={{ fontSize:9, color:'#475569' }}>
                {new Date(msg.fecha).toLocaleString('es-MX', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}
              </span>
            )}
          </div>
          <div style={{
            background: esCajero ? '#1e293b' : '#1e3a5f',
            border: `1px solid ${esCajero ? '#334155' : '#2563eb44'}`,
            borderRadius: esCajero ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
            padding:'8px 12px',
          }}>
            <p style={{ fontSize:13, color:'#f1f5f9', margin:0 }}>{msg.mensaje}</p>
            {msg.ticketUrl && (
              <div style={{ marginTop:8 }}>
                {msg.ticketUrl.startsWith('data:image') ? (
                  <img src={msg.ticketUrl} alt="ticket"
                    style={{ maxWidth:'100%', maxHeight:200, borderRadius:6, cursor:'pointer' }}
                    onClick={() => window.open(msg.ticketUrl)}/>
                ) : (
                  <a href={msg.ticketUrl} download={msg.ticketNombre} target="_blank" rel="noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:6, fontSize:12,
                      color:'#60a5fa', textDecoration:'none' }}>
                    📄 {msg.ticketNombre || 'Ver comprobante'}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Corte de Caja</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setVista(vista==='nuevo'?'historial':'nuevo')}>
            {vista==='nuevo' ? 'Ver historial' : '+ Nuevo corte'}
          </button>
        </div>

        {/* Formulario nuevo corte */}
        {vista === 'nuevo' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo corte de caja</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {[
                ['Fecha', 'fecha', 'date'],
                ['Efectivo contado', 'efectivoContado', 'number'],
                ['Total efectivo (ventas)', 'totalEfectivo', 'number'],
                ['Total tarjeta', 'totalTarjeta', 'number'],
                ['Total transferencia', 'totalTransfer', 'number'],
                ['Total crédito', 'totalCredito', 'number'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{label}</label>
                  <input type={type} min={type==='number'?'0':undefined} className="input-base" style={{ fontSize:13 }}
                    value={(form as any)[key]||''} onChange={e => set(key, type==='number'?+e.target.value:e.target.value)}/>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Notas</label>
              <input className="input-base" style={{ fontSize:13 }} value={form.notasCajero}
                onChange={e => set('notasCajero', e.target.value)} placeholder="Observaciones del cajero"/>
            </div>
            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Efectivo esperado</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{fmt(form.totalEfectivo)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Efectivo contado</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{fmt(form.efectivoContado)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:700 }}>Diferencia</span>
                <span style={{ fontSize:16, fontWeight:700,
                  color: form.efectivoContado-form.totalEfectivo >= 0 ? '#10b981' : '#f87171' }}>
                  {fmt(form.efectivoContado - form.totalEfectivo)}
                </span>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setVista('historial')}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={() => crearM.mutate()} disabled={crearM.isPending}>
                {crearM.isPending ? 'Enviando…' : 'Enviar corte'}
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        {vista === 'historial' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Fecha</th><th>Cajero</th>
                  <th style={{textAlign:'right'}}>Ventas</th>
                  <th style={{textAlign:'right'}}>Efectivo</th>
                  <th style={{textAlign:'right'}}>Diferencia</th>
                  <th>Estado</th><th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(cortes as any[]).length === 0 && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cortes registrados</td></tr>
                )}
                {(cortes as any[]).map((c: any) => {
                  const historial = parsearHistorial(c.notasCajero);
                  const tieneConversacion = historial.length > 0;
                  return (
                    <tr key={c.id}>
                      <td>{fmtDate(c.fecha)}</td>
                      <td style={{ fontWeight:500 }}>{c.cajero?.name}</td>
                      <td style={{ textAlign:'right' }}>{fmt(c.totalVentas)}</td>
                      <td style={{ textAlign:'right' }}>{fmt(c.efectivoContado)}</td>
                      <td style={{ textAlign:'right', fontWeight:700,
                        color: Number(c.diferencia) >= 0 ? '#10b981' : '#f87171' }}>
                        {fmt(c.diferencia)}
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:11, padding:'3px 8px', borderRadius:99,
                            background: STATUS_COLOR[c.status]+'22', color: STATUS_COLOR[c.status] }}>
                            {c.status}
                          </span>
                          {tieneConversacion && (
                            <span style={{ fontSize:10, color:'#60a5fa', cursor:'pointer' }}
                              onClick={() => setCorteDetalle(c)}>
                              💬 {historial.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:8 }}>
                          {/* Contador: validar PENDIENTE */}
                          {puedeValidar && c.status === 'PENDIENTE' && (
                            <button onClick={() => { setCorteSeleccionado(c); setEfectivoReal(Number(c.efectivoContado)); setNotasValid(''); }}
                              style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                              Validar
                            </button>
                          )}
                          {/* Cajero: responder RECHAZADO */}
                          {!puedeValidar && c.status === 'RECHAZADO' && (
                            <button onClick={() => { setCorteRespuesta(c); setRespuestaTexto(''); setTicketImg(null); setTicketNombre(''); }}
                              style={{ background:'none', border:'none', color:'#f59e0b', cursor:'pointer', fontSize:12 }}>
                              Responder
                            </button>
                          )}
                          {/* Ver detalle siempre */}
                          <button onClick={() => setCorteDetalle(c)}
                            style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal detalle / conversación ── */}
      {corteDetalle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#0f172a', borderRadius:12, padding:0, width:560,
            maxHeight:'85vh', display:'flex', flexDirection:'column', border:'1px solid #334155' }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 2px' }}>
                  Corte {fmtDate(corteDetalle.fecha)} — {corteDetalle.cajero?.name}
                </h3>
                <div style={{ display:'flex', gap:12 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Efectivo: {fmt(corteDetalle.efectivoContado)}</span>
                  <span style={{ fontSize:12, color: Number(corteDetalle.diferencia)>=0?'#10b981':'#f87171' }}>
                    Dif: {fmt(corteDetalle.diferencia)}
                  </span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                    background: STATUS_COLOR[corteDetalle.status]+'22',
                    color: STATUS_COLOR[corteDetalle.status] }}>
                    {corteDetalle.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setCorteDetalle(null)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            {/* Desglose */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid #1e293b',
              display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {[
                { label:'Ventas', value: corteDetalle.totalVentas, col: color },
                { label:'Tarjeta', value: corteDetalle.totalTarjeta, col:'#3b82f6' },
                { label:'Transfer', value: corteDetalle.totalTransfer, col:'#06b6d4' },
                { label:'Crédito', value: corteDetalle.totalCredito, col:'#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ background:'#1e293b', borderRadius:6, padding:'6px 8px', textAlign:'center' }}>
                  <p style={{ fontSize:9, color:'#64748b', margin:'0 0 2px', textTransform:'uppercase' }}>{k.label}</p>
                  <p style={{ fontSize:12, fontWeight:700, color:k.col, margin:0 }}>{fmt(k.value)}</p>
                </div>
              ))}
            </div>

            {/* Conversación */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
              {(() => {
                const historial = parsearHistorial(corteDetalle.notasCajero);
                if (historial.length === 0) {
                  return <p style={{ color:'#475569', fontSize:13, textAlign:'center' }}>Sin conversación registrada</p>;
                }
                return historial.map((msg, i) => <Burbuja key={i} msg={msg}/>);
              })()}
              {corteDetalle.notasValidador && parsearHistorial(corteDetalle.notasCajero).every((m:any) => m.accion !== 'rechazo' && m.tipo !== 'contador') && (
                <Burbuja msg={{ tipo:'contador', mensaje: corteDetalle.notasValidador, fecha: corteDetalle.validadoAt }} />
              )}
            </div>

            {/* Acciones desde el detalle */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid #334155', display:'flex', gap:8 }}>
              {puedeValidar && corteDetalle.status === 'PENDIENTE' && (
                <>
                  <button onClick={() => { setCorteSeleccionado(corteDetalle); setEfectivoReal(Number(corteDetalle.efectivoContado)); setNotasValid(''); setCorteDetalle(null); }}
                    style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:color, color:'#fff', cursor:'pointer', fontSize:13 }}>
                    Validar corte
                  </button>
                  <button onClick={() => { setCorteSeleccionado(corteDetalle); setEfectivoReal(0); setNotasValid(''); setCorteDetalle(null); }}
                    style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#f87171', color:'#fff', cursor:'pointer', fontSize:13 }}>
                    Rechazar
                  </button>
                </>
              )}
              {!puedeValidar && corteDetalle.status === 'RECHAZADO' && (
                <button onClick={() => { setCorteRespuesta(corteDetalle); setRespuestaTexto(''); setTicketImg(null); setCorteDetalle(null); }}
                  style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#f59e0b', color:'#fff', cursor:'pointer', fontSize:13 }}>
                  Responder al contador
                </button>
              )}
              <button onClick={() => setCorteDetalle(null)}
                style={{ padding:'8px 20px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal validación contador ── */}
      {corteSeleccionado && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:460, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 16px' }}>
              Validar corte — {fmtDate(corteSeleccionado.fecha)}
            </h3>

            {/* Mostrar conversación previa si existe */}
            {(() => {
              const historial = parsearHistorial(corteSeleccionado.notasCajero);
              if (historial.length === 0) return null;
              return (
                <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16, maxHeight:180, overflowY:'auto' }}>
                  <p style={{ fontSize:10, color:'#64748b', margin:'0 0 8px', textTransform:'uppercase', letterSpacing:1 }}>
                    Conversación
                  </p>
                  {historial.map((msg, i) => <Burbuja key={i} msg={msg}/>)}
                </div>
              );
            })()}

            <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16 }}>
              {[
                ['Efectivo esperado', corteSeleccionado.totalEfectivo],
                ['Efectivo contado por cajero', corteSeleccionado.efectivoContado],
              ].map(([label, val]: any) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                  <span style={{ fontSize:13 }}>{fmt(val)}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Diferencia reportada</span>
                <span style={{ fontSize:14, fontWeight:700,
                  color: Number(corteSeleccionado.diferencia) >= 0 ? '#10b981' : '#f87171' }}>
                  {fmt(corteSeleccionado.diferencia)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                Efectivo real en paquete
              </label>
              <input type="number" min="0" className="input-base" style={{ fontSize:13 }}
                value={efectivoReal||''} onChange={e => setEfectivoReal(+e.target.value)}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                Notas / comentario al cajero
              </label>
              <textarea className="input-base" style={{ fontSize:13, height:70, resize:'none' }}
                value={notasValid} onChange={e => setNotasValid(e.target.value)}
                placeholder="Comentario que verá el cajero..."/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setCorteSeleccionado(null)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                  background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={() => rechazarM.mutate(corteSeleccionado.id)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background:'#f87171', color:'#fff', cursor:'pointer', fontSize:13 }}>Rechazar</button>
              <button onClick={() => validarM.mutate(corteSeleccionado.id)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background:color, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>Aprobar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal respuesta cajero ── */}
      {corteRespuesta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:440, border:'1px solid #f59e0b' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 8px', color:'#f59e0b' }}>
              Responder al contador
            </h3>

            {/* Historial previo */}
            {(() => {
              const historial = parsearHistorial(corteRespuesta.notasCajero);
              if (historial.length === 0 && !corteRespuesta.notasValidador) return null;
              return (
                <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16, maxHeight:160, overflowY:'auto' }}>
                  {corteRespuesta.notasValidador && historial.every((m:any) => m.tipo !== 'contador') && (
                    <Burbuja msg={{ tipo:'contador', mensaje: corteRespuesta.notasValidador, fecha: corteRespuesta.validadoAt, accion:'rechazo' }}/>
                  )}
                  {historial.map((msg, i) => <Burbuja key={i} msg={msg}/>)}
                </div>
              );
            })()}

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Tu respuesta *</label>
              <textarea className="input-base" style={{ fontSize:13, height:80, resize:'none' }}
                value={respuestaTexto} onChange={e => setRespuestaTexto(e.target.value)}
                placeholder="Explica la diferencia o el motivo del ajuste..."/>
            </div>

            {/* Upload ticket */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                Adjuntar ticket o comprobante (opcional)
              </label>
              {ticketImg ? (
                <div style={{ background:'#0f172a', borderRadius:8, padding:10, display:'flex', alignItems:'center', gap:10 }}>
                  {ticketImg.startsWith('data:image') ? (
                    <img src={ticketImg} alt="ticket" style={{ width:48, height:48, objectFit:'cover', borderRadius:6 }}/>
                  ) : (
                    <span style={{ fontSize:28 }}>📄</span>
                  )}
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12, color:'#f1f5f9', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {ticketNombre}
                    </p>
                    <p style={{ fontSize:11, color:'#10b981', margin:0 }}>✓ Listo para enviar</p>
                  </div>
                  <button onClick={() => { setTicketImg(null); setTicketNombre(''); }}
                    style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:18 }}>✕</button>
                </div>
              ) : (
                <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                  borderRadius:8, border:'1px dashed #334155', cursor:'pointer', background:'#0f172a', fontSize:13, color:'#64748b' }}>
                  📎 Seleccionar imagen o PDF
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display:'none' }} onChange={handleTicketUpload}/>
                </label>
              )}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1, fontSize:13 }}
                onClick={() => { setCorteRespuesta(null); setTicketImg(null); }}>
                Cancelar
              </button>
              <button onClick={async () => {
                if (!respuestaTexto.trim()) return;
                setSaving(true);
                try {
                  await api.put(`/companies/${cid}/corte-caja/${corteRespuesta.id}/responder`, {
                    respuesta: respuestaTexto,
                    ...(ticketImg ? { ticketUrl: ticketImg, ticketNombre } : {}),
                  });
                  setCorteRespuesta(null); setTicketImg(null); setTicketNombre('');
                  qc.invalidateQueries({ queryKey: ['cortes-caja', cid] });
                } finally { setSaving(false); }
              }}
                style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
                  background:'#f59e0b', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}
                disabled={saving || !respuestaTexto.trim()}>
                {saving ? 'Enviando…' : 'Enviar respuesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
