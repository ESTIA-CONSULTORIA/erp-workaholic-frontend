import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt, fmtDate } from '../../lib/api';

export default function LoncheReportes() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f97316';

  const hoy  = new Date().toISOString().slice(0,10);
  const mes1 = new Date(new Date().setDate(1)).toISOString().slice(0,10);

  const [modo,     setModo]     = useState<'cooperativa'|'tutor'>('cooperativa');
  const [desde,    setDesde]    = useState(mes1);
  const [hasta,    setHasta]    = useState(hoy);
  const [studentId,setStudentId]= useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['lonche-students', cid],
    queryFn:  () => api.get(`/companies/${cid}/lonche/students`).then(r=>r.data),
    enabled:  !!cid,
  });

  const { data: reporteCoop, isLoading: loadingCoop } = useQuery({
    queryKey: ['lonche-reporte-coop', cid, desde, hasta],
    queryFn:  () => api.get(`/companies/${cid}/lonche/reportes/cooperativa?desde=${desde}&hasta=${hasta}`).then(r=>r.data),
    enabled:  !!cid && modo === 'cooperativa',
  });

  const { data: reporteTutor, isLoading: loadingTutor } = useQuery({
    queryKey: ['lonche-reporte-tutor', cid, studentId, desde, hasta],
    queryFn:  () => api.get(`/companies/${cid}/lonche/reportes/tutor/${studentId}?desde=${desde}&hasta=${hasta}`).then(r=>r.data),
    enabled:  !!cid && modo === 'tutor' && !!studentId,
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 20px' }}>Reportes</h1>

        {/* Modo y filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
          {(['cooperativa','tutor'] as const).map(m => (
            <button key={m} onClick={() => setModo(m)}
              style={{ padding:'7px 16px', borderRadius:99, fontSize:12, cursor:'pointer',
                border:`1px solid ${modo===m?color:'#334155'}`,
                background:modo===m?color+'22':'transparent',
                color:modo===m?color:'#64748b', fontWeight:modo===m?700:400 }}>
              {m === 'cooperativa' ? '🏪 Cooperativa' : '👨‍🎓 Tutor/Alumno'}
            </button>
          ))}
          <input type="date" className="input-base" style={{ fontSize:12, width:140 }}
            value={desde} onChange={e=>setDesde(e.target.value)}/>
          <span style={{ color:'#64748b', fontSize:12 }}>→</span>
          <input type="date" className="input-base" style={{ fontSize:12, width:140 }}
            value={hasta} onChange={e=>setHasta(e.target.value)}/>
          {modo === 'tutor' && (
            <select className="input-base" style={{ fontSize:12, minWidth:200 }}
              value={studentId} onChange={e=>setStudentId(e.target.value)}>
              <option value="">— Seleccionar alumno —</option>
              {(students as any[]).map((s:any) => (
                <option key={s.id} value={s.id}>{s.name} — {s.grade}</option>
              ))}
            </select>
          )}
        </div>

        {/* Reporte Cooperativa */}
        {modo === 'cooperativa' && (
          <>
            {loadingCoop && <p style={{color:'#64748b',textAlign:'center',padding:24}}>Cargando…</p>}
            {reporteCoop && (
              <>
                {/* KPIs */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
                  {[
                    { label:'Total ventas',  value:fmt(reporteCoop.resumen.totalVentas),   col:color },
                    { label:'Efectivo',      value:fmt(reporteCoop.resumen.totalEfectivo), col:'#10b981' },
                    { label:'Prepago',       value:fmt(reporteCoop.resumen.totalPrepago),  col:'#3b82f6' },
                    { label:'Cashback dado', value:fmt(reporteCoop.resumen.totalCashback), col:'#f59e0b' },
                    { label:'Recargas',      value:fmt(reporteCoop.resumen.totalRecargas), col:'#8b5cf6' },
                  ].map(k => (
                    <div key={k.label} style={{ background:'#1e293b', borderRadius:9, padding:14,
                      border:'1px solid #334155', borderLeft:`4px solid ${k.col}` }}>
                      <p style={{fontSize:10,color:'#64748b',margin:'0 0 4px',textTransform:'uppercase'}}>{k.label}</p>
                      <p style={{fontSize:18,fontWeight:800,color:k.col,margin:0}}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Por producto */}
                <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
                  <div style={{ padding:'8px 14px', background:'#334155' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:0 }}>Ventas por producto</p>
                  </div>
                  <table className="table-base">
                    <thead><tr><th>Producto</th><th style={{textAlign:'right'}}>Cantidad</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
                    <tbody>
                      {(reporteCoop.porProducto || []).map((p:any) => (
                        <tr key={p.name}>
                          <td style={{fontWeight:500}}>{p.name}</td>
                          <td style={{textAlign:'right',color:'#94a3b8'}}>{p.qty} pzs</td>
                          <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Turnos */}
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <div style={{ padding:'8px 14px', background:'#334155' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:0 }}>Turnos del período</p>
                  </div>
                  <table className="table-base">
                    <thead><tr><th>Fecha</th><th>Cajero</th><th style={{textAlign:'right'}}>Diferencia</th><th>Estado</th></tr></thead>
                    <tbody>
                      {(reporteCoop.turnos || []).map((t:any, i:number) => (
                        <tr key={i}>
                          <td style={{fontSize:12}}>{fmtDate(t.fecha)}</td>
                          <td style={{fontSize:12}}>{t.cajero}</td>
                          <td style={{textAlign:'right', fontWeight:600,
                            color:Number(t.diferencia||0)===0?'#10b981':Number(t.diferencia||0)>0?'#f59e0b':'#f87171'}}>
                            {t.diferencia!=null?fmt(t.diferencia):'—'}
                          </td>
                          <td>
                            <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,
                              background:t.status==='VALIDADO'?'#10b98122':t.status==='CERRADO'?'#3b82f622':'#f59e0b22',
                              color:t.status==='VALIDADO'?'#10b981':t.status==='CERRADO'?'#3b82f6':'#f59e0b'}}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* Reporte Tutor */}
        {modo === 'tutor' && (
          <>
            {!studentId && (
              <div style={{textAlign:'center',padding:40,color:'#334155'}}>
                <p style={{fontSize:32,margin:'0 0 8px'}}>👨‍🎓</p>
                <p style={{fontSize:13}}>Selecciona un alumno para ver su reporte</p>
              </div>
            )}
            {loadingTutor && <p style={{color:'#64748b',textAlign:'center',padding:24}}>Cargando…</p>}
            {reporteTutor && studentId && (
              <>
                {/* Info alumno */}
                <div style={{ background:'#1e293b', borderRadius:10, padding:16, marginBottom:16,
                  border:`1px solid ${color}33`, display:'flex', gap:24, alignItems:'center' }}>
                  <div style={{fontSize:40}}>👨‍🎓</div>
                  <div>
                    <h2 style={{fontSize:18,fontWeight:800,margin:'0 0 4px'}}>{reporteTutor.student?.name}</h2>
                    <p style={{fontSize:13,color:'#64748b',margin:0}}>
                      {reporteTutor.student?.grade}
                      {reporteTutor.student?.tutorName && ` · Tutor: ${reporteTutor.student.tutorName}`}
                    </p>
                  </div>
                  <div style={{marginLeft:'auto',display:'flex',gap:16}}>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:10,color:'#64748b',margin:'0 0 4px',textTransform:'uppercase'}}>Saldo actual</p>
                      <p style={{fontSize:20,fontWeight:800,color,margin:0}}>{fmt(reporteTutor.student?.balance||0)}</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:10,color:'#64748b',margin:'0 0 4px',textTransform:'uppercase'}}>Cashback</p>
                      <p style={{fontSize:20,fontWeight:800,color:'#f59e0b',margin:0}}>★ {fmt(reporteTutor.student?.cashback||0)}</p>
                    </div>
                  </div>
                </div>

                {/* Compras del período */}
                <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
                  <div style={{ padding:'8px 14px', background:'#334155' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:0 }}>
                      Compras del período ({(reporteTutor.sales||[]).length})
                    </p>
                  </div>
                  {(reporteTutor.sales||[]).length === 0
                    ? <p style={{textAlign:'center',padding:24,color:'#64748b',fontSize:12}}>Sin compras en este período</p>
                    : (reporteTutor.sales||[]).map((s:any) => (
                      <div key={s.id} style={{ padding:'10px 14px', borderBottom:'1px solid #1e293b' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:12, color:'#64748b' }}>{fmtDate(s.createdAt)}</span>
                          <span style={{ fontSize:13, fontWeight:700, color }}>
                            {fmt(s.total)}
                            {Number(s.cashbackEarned)>0 && <span style={{color:'#f59e0b',marginLeft:6,fontSize:11}}>+★{fmt(s.cashbackEarned)}</span>}
                          </span>
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {(s.items||[]).map((item:any) => (
                            <span key={item.id} style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                              background:'#334155', color:'#94a3b8' }}>
                              {item.name} ×{item.qty}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  }
                </div>

                {/* Movimientos de cuenta */}
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <div style={{ padding:'8px 14px', background:'#334155' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#f1f5f9', margin:0 }}>Movimientos de cuenta</p>
                  </div>
                  <table className="table-base">
                    <thead><tr><th>Fecha</th><th>Tipo</th><th style={{textAlign:'right'}}>Monto</th><th style={{textAlign:'right'}}>Saldo</th></tr></thead>
                    <tbody>
                      {(reporteTutor.transactions||[]).map((t:any) => (
                        <tr key={t.id}>
                          <td style={{fontSize:12}}>{fmtDate(t.createdAt)}</td>
                          <td>
                            <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,
                              background:t.type==='RECARGA'?'#10b98122':t.type==='CASHBACK'?'#f59e0b22':'#f8717122',
                              color:t.type==='RECARGA'?'#10b981':t.type==='CASHBACK'?'#f59e0b':'#f87171',
                              fontWeight:600}}>
                              {t.type==='RECARGA'?'⬆ Recarga':t.type==='CASHBACK'?'★ Cashback':'⬇ Compra'}
                            </span>
                          </td>
                          <td style={{textAlign:'right',fontWeight:700,color:Number(t.amount)>0?'#10b981':'#f87171'}}>
                            {Number(t.amount)>0?'+':''}{fmt(t.amount)}
                          </td>
                          <td style={{textAlign:'right',color:'#94a3b8',fontSize:12}}>{fmt(t.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
