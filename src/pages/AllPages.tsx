// ── Páginas stub para todas las rutas del ERP ─────────────────
// Cada una carga el contenido completo desde los archivos .tsx correspondientes.
// Este archivo crea exports simples que redirigen al componente real.

import AppLayout from '../components/layout/AppLayout';
import { useERPStore } from '../store/erp.store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, fmtDate, fmtPct } from '../lib/api';
import { useState } from 'react';

// ── CORTES ────────────────────────────────────────────────────
export function CortesPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  console.log('Admin CID:', cid, 'usuarios:', usuarios);
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const { data: cortes = [], isLoading } = useQuery({
    queryKey: ['cuts', cid, activePeriod],
    queryFn:  () => api.get(`/companies/${cid}/cuts?period=${activePeriod}`).then(r => r.data),
    enabled: !!cid,
  });

  const totalAprobado = cortes
    .filter((c:any) => c.status==='APROBADO')
    .reduce((t:number,c:any) => t+(c.lines||[]).reduce((s:number,l:any)=>s+Number(l.netAmount||0),0), 0);

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Cortes</h1>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>
          {cortes.length} cortes · Total aprobado:{' '}
          <span style={{ color, fontWeight:600 }}>{fmt(totalAprobado)}</span>
        </p>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Folio</th><th>Fecha</th><th>Sucursal</th>
              <th style={{textAlign:'right'}}>Venta neta</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && cortes.length===0 && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cortes en este período</td></tr>}
              {cortes.map((c:any) => {
                const total = (c.lines||[]).reduce((t:number,l:any)=>t+Number(l.netAmount||0),0);
                const badge = c.status==='APROBADO'?'badge-green':c.status==='ENVIADO'?'badge-amber':'badge-gray';
                return (
                  <tr key={c.id}>
                    <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{c.folio}</code></td>
                    <td>{fmtDate(c.date)}</td>
                    <td>{c.branch?.name||'—'}</td>
                    <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(total)}</td>
                    <td><span className={badge}>{c.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

// ── GASTOS ────────────────────────────────────────────────────
export function GastosPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';

  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ['expenses', cid, activePeriod],
    queryFn:  () => api.get(`/companies/${cid}/expenses?period=${activePeriod}`).then(r => r.data),
    enabled: !!cid,
  });

  const total = gastos.reduce((t:number,g:any)=>t+Number(g.total||0),0);

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Gastos y Compras</h1>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>
          {gastos.length} registros · Total: <span style={{ color, fontWeight:600 }}>{fmt(total)}</span>
        </p>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha</th><th>Concepto</th><th>Proveedor</th>
              <th>Rubro</th><th style={{textAlign:'right'}}>Monto</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && gastos.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin gastos registrados</td></tr>}
              {gastos.map((g:any) => (
                <tr key={g.id}>
                  <td>{fmtDate(g.date)}</td>
                  <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.concept}</td>
                  <td>{g.supplier?.name||'—'}</td>
                  <td><span style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{g.rubric?.name||'—'}</span></td>
                  <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(g.total)}</td>
                  <td><span className={g.paymentStatus==='PAGADO'?'badge-green':'badge-amber'}>{g.paymentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

// ── CxC ───────────────────────────────────────────────────────
export function CxCPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';
  const [filterCliente, setFilterCliente] = useState('');
  const [pagoModal, setPagoModal] = useState<any>(null);
  const [pagoForm, setPagoForm] = useState({ amount:0, paymentMethod:'EFECTIVO_MXN', date:new Date().toISOString().slice(0,10), reference:'' });
  const qc = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: summary } = useQuery({
queryKey:['cxc-summary',cid,filterCliente],
queryFn: ()=>api.get(`/companies/${cid}/cxc/summary${filterCliente?`?clientId=${filterCliente}`:''}`).then(r=>r.data),
    enabled:!!cid,
  });

  const { data: cxcs=[] } = useQuery({
    queryKey:['cxc',cid,activePeriod,filterCliente],
queryFn: ()=>api.get(`/companies/${cid}/cxc?period=${activePeriod}${filterCliente?`&clientId=${filterCliente}`:''}`).then(r=>r.data),
    enabled:!!cid,
  });

  const registrarPago = async () => {
    if (!pagoModal || !pagoForm.amount) return;
    await api.post(`/companies/${cid}/cxc/${pagoModal.id}/payments`, pagoForm);
    setPagoModal(null);
    setPagoForm({ amount:0, paymentMethod:'EFECTIVO_MXN', date:new Date().toISOString().slice(0,10), reference:'' });
    qc.invalidateQueries({ queryKey: ['cxc', cid] });
    qc.invalidateQueries({ queryKey: ['cxc-summary', cid] });
  };
  
  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Cuentas por Cobrar</h1>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total pendiente</p>
            <p style={{ fontSize:20, fontWeight:700, color, margin:0 }}>{fmt(summary?.totalPending||0)}</p>
          </div>
          <div className="card-sm" style={{ borderLeft:'3px solid #f87171' }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Vencido</p>
            <p style={{ fontSize:20, fontWeight:700, color:'#f87171', margin:0 }}>{fmt(summary?.totalOverdue||0)}</p>
          </div>
          <div className="card-sm" style={{ borderLeft:'3px solid #64748b' }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Cuentas abiertas</p>
            <p style={{ fontSize:20, fontWeight:700, color:'#94a3b8', margin:0 }}>{summary?.pendingCount||0}</p>
          </div>
        </div>
        <select style={{padding:'6px 12px',borderRadius:8,border:'1px solid #334155',background:'#1e293b',color:'#f1f5f9',fontSize:13,marginBottom:16}}
  value={filterCliente} onChange={e=>setFilterCliente(e.target.value)}>
  <option value="">Todos los clientes</option>
  {(clientes as any[]).map((c:any)=>(
    <option key={c.id} value={c.id}>{c.name}</option>
  ))}
</select>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Cliente</th><th>Fecha</th>
              <th style={{textAlign:'right'}}>Original</th>
              <th style={{textAlign:'right'}}>Saldo</th><th>Estado</th><th>Acción</th>
            </tr></thead>
            <tbody>
              
              {cxcs.length===0 && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cuentas por cobrar</td></tr>}
              {cxcs.map((c:any) => (
                <tr key={c.id}>
                  <td style={{fontWeight:500}}>{c.client?.name}</td>
                  <td>{fmtDate(c.date)}</td>
                  <td style={{textAlign:'right'}}>{fmt(c.originalAmount)}</td>
                  <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(c.balance)}</td>
                  <td><span className={c.status==='PAGADO'?'badge-green':c.status==='VENCIDO'?'badge-red':'badge-amber'}>{c.status}</span></td>
                  <td>
                    {c.status !== 'PAGADO' && (
                      <button onClick={() => setPagoModal(c)}
                        style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                        Registrar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pagoModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:380}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 4px'}}>Registrar pago</h3>
            <p style={{fontSize:12,color:'#64748b',margin:'0 0 16px'}}>{pagoModal.client?.name} — Saldo: {fmt(pagoModal.balance)}</p>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Monto *</label>
                <input type="number" min="0" max={pagoModal.balance} className="input-base" style={{fontSize:13}}
                  value={pagoForm.amount||''} onChange={e=>setPagoForm(f=>({...f,amount:+e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Método de pago</label>
                <select className="input-base" style={{fontSize:13}} value={pagoForm.paymentMethod}
                  onChange={e=>setPagoForm(f=>({...f,paymentMethod:e.target.value}))}>
                  <option value="EFECTIVO_MXN">Efectivo MXN</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha</label>
                <input type="date" className="input-base" style={{fontSize:13}} value={pagoForm.date}
                  onChange={e=>setPagoForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Referencia</label>
                <input className="input-base" style={{fontSize:13}} value={pagoForm.reference}
                  onChange={e=>setPagoForm(f=>({...f,reference:e.target.value}))} placeholder="Número de transferencia, etc."/>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setPagoModal(null)} className="btn-secondary" style={{flex:1,fontSize:13}}>Cancelar</button>
              <button onClick={registrarPago} className="btn-primary"
                style={{flex:1,fontSize:13,background:color}} disabled={!pagoForm.amount}>
                Registrar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ── REPORTES ──────────────────────────────────────────────────
export function ReportesPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  const { data: edo, isLoading } = useQuery({
    queryKey: ['income-statement', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/income-statement?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  if (isLoading) return <AppLayout><p style={{color:'#64748b',padding:32}}>Cargando...</p></AppLayout>;

  const ventas      = edo?.ventas      || {};
  const gastos      = edo?.gastosPorSeccion || {};
  const totalGastos = edo?.totalGastos || 0;
  const contrib     = edo?.contribuciones || 0;
  const antesContrib = edo?.resultadoAntesContrib || 0;
  const resultado   = edo?.resultadoEjercicio || 0;
  const nomina      = edo?.nomina || 0;

  const positivo = (n: number) => n >= 0 ? '#10b981' : '#f87171';

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Estado de Resultados — {activePeriod}</h1>

        {/* VENTAS */}
        <div className="card" style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Ingresos</p>
          <ERRow label="Venta bruta"         value={ventas.bruta    || 0} color={color}/>
          <ERRow label="(-) Descuentos y cortesías" value={-(ventas.descuentos || 0)} color='#f87171' indent/>
          <ERRow label="Venta neta POS"      value={ventas.neta     || 0} color={color} indent/>
          <ERRow label="Venta por cortes"    value={ventas.cortes   || 0} color={color} indent/>
          <ERRow label="= Total ventas"      value={ventas.total    || 0} color={color} bold/>
        </div>

        {/* GASTOS GENERALES */}
        {Object.entries(gastos).filter(([k]) => k !== 'CONTRIBUCIONES').map(([secCode, sec]: any) => (
          <div key={secCode} className="card" style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>
              {sec.name}
            </p>
            {Object.entries(sec.grupos).map(([grpName, grp]: any) => (
              <div key={grpName} style={{ marginBottom:8 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'#94a3b8', margin:'0 0 4px' }}>{grpName}</p>
                {Object.entries(grp.rubrics).map(([rubName, amount]: any) => (
                  <ERRow key={rubName} label={rubName} value={-amount} color='#f87171' indent/>
                ))}
                <ERRow label={`Subtotal ${grpName}`} value={-grp.total} color='#f87171' indent bold/>
              </div>
            ))}
            <ERRow label={`Total ${sec.name}`} value={-sec.total} color='#f87171' bold/>
          </div>
        ))}

        {/* NÓMINA */}
        {nomina > 0 && (
          <div className="card" style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Nómina</p>
            <ERRow label="Nómina del período" value={-nomina} color='#f87171'/>
          </div>
        )}

        {/* RESULTADO ANTES DE CONTRIBUCIONES */}
        <div className="card" style={{ marginBottom:16, borderLeft:`3px solid ${positivo(antesContrib)}` }}>
          <ERRow label="= Resultado antes de contribuciones" value={antesContrib} color={positivo(antesContrib)} bold/>
        </div>

        {/* CONTRIBUCIONES */}
        {gastos['CONTRIBUCIONES'] && (
          <div className="card" style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Contribuciones</p>
            {Object.entries(gastos['CONTRIBUCIONES'].grupos).map(([grpName, grp]: any) => (
              Object.entries(grp.rubrics).map(([rubName, amount]: any) => (
                <ERRow key={rubName} label={rubName} value={-amount} color='#f87171' indent/>
              ))
            ))}
            <ERRow label="Total contribuciones" value={-contrib} color='#f87171' bold/>
          </div>
        )}

        {/* RESULTADO DEL EJERCICIO */}
        <div className="card" style={{ borderLeft:`3px solid ${positivo(resultado)}` }}>
          <ERRow label="= Resultado del ejercicio neto" value={resultado} color={positivo(resultado)} bold/>
        </div>
      </div>
    </AppLayout>
  );
}

function ERRow({ label, value, color, bold, indent }: any) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding: indent ? '3px 0 3px 16px' : '4px 0',
      borderBottom: bold ? '1px solid #334155' : 'none',
      marginBottom: bold ? 8 : 0 }}>
      <span style={{ fontSize: bold ? 13 : 12, fontWeight: bold ? 700 : 400,
        color: bold ? '#f1f5f9' : '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: bold ? 14 : 12, fontWeight: bold ? 700 : 500, color }}>
        {fmt(Math.abs(value))}
      </span>
    </div>
  );
}

// ── DOCUMENTOS ────────────────────────────────────────────────
export function DocumentosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  const { data: docs=[], isLoading } = useQuery({
    queryKey:['documents',cid],
    queryFn: ()=>api.get(`/companies/${cid}/documents`).then(r=>r.data),
    enabled:!!cid,
    refetchInterval:10000,
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Bandeja documental</h1>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {isLoading && <p style={{ color:'#64748b' }}>Cargando…</p>}
          {!isLoading && docs.length===0 && (
            <div className="card" style={{ textAlign:'center', padding:48 }}>
              <p style={{ fontSize:36, marginBottom:12 }}>📄</p>
              <p style={{ color:'#94a3b8', fontWeight:500 }}>Sin documentos</p>
            </div>
          )}
          {docs.map((doc:any) => (
            <div key={doc.id} className="card" style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:48, height:48, borderRadius:8, background:'#334155', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {doc.fileUrl?.startsWith('data:image')
                  ? <img src={doc.fileUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8 }}/>
                  : <span style={{ fontSize:24 }}>📄</span>}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:500, margin:'0 0 2px' }}>{doc.fileName}</p>
                <p style={{ fontSize:12, color:'#64748b', margin:0 }}>{fmtDate(doc.createdAt)}</p>
              </div>
              <span className={doc.status==='VALIDADO'?'badge-green':doc.status==='PENDIENTE_VALIDACION'?'badge-amber':'badge-gray'}>
                {doc.status?.replace(/_/g,' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

// ── CONSOLIDADO ───────────────────────────────────────────────
export function ConsolidadoPage() {
  const { activePeriod } = useERPStore();
  const { data, isLoading } = useQuery({
    queryKey:['consolidated',activePeriod],
    queryFn: ()=>api.get(`/reports/consolidated?period=${activePeriod}`).then(r=>r.data),
  });
  const g = data?.groupTotal||{};

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Grupo Workaholic — Consolidado</h1>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Venta total',   value:fmt(g.netSale),   color:'#3b82f6' },
            { label:'Gastos',        value:fmt(g.expenses),  color:'#8b5cf6' },
            { label:'CxC pendiente', value:fmt(g.cxcBalance),color:'#f59e0b' },
            { label:'Utilidad',      value:fmt(g.netIncome), color:g.netIncome>=0?'#10b981':'#f87171' },
          ].map(k => (
            <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.color}` }}>
              <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ fontSize:18, fontWeight:700, color:k.color, margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Empresa</th>
              <th style={{textAlign:'right'}}>Venta neta</th>
              <th style={{textAlign:'right'}}>CxC</th>
              <th style={{textAlign:'right'}}>Utilidad</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {(data?.companies||[]).map((c:any) => (
                <tr key={c.companyId}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:c.color }}/>
                      <span style={{ fontWeight:500 }}>{c.companyName}</span>
                    </div>
                  </td>
                  <td style={{textAlign:'right',fontWeight:600,color:c.color}}>{fmt(c.netSale)}</td>
                  <td style={{textAlign:'right',color:'#f59e0b'}}>{fmt(c.cxcBalance)}</td>
                  <td style={{textAlign:'right',fontWeight:600,color:c.netIncome>=0?'#10b981':'#f87171'}}>{fmt(c.netIncome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────
export function AdminPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [showNew,  setShowNew]  = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    roleCode: 'contador', companyIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const { data: usuarios = [], refetch } = useQuery({
    queryKey: ['company-users', cid],
    queryFn:  () => api.get(`/companies/${cid}/users`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn:  () => api.get('/companies').then(r => r.data),
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleCompany = (id: string) => {
    setForm(f => ({
      ...f,
      companyIds: f.companyIds.includes(id)
        ? f.companyIds.filter(c => c !== id)
        : [...f.companyIds, id],
    }));
  };

  const resetForm = () => {
    setForm({ name:'', email:'', password:'', roleCode:'contador', companyIds:[] });
    setShowNew(false);
    setEditUser(null);
    setError('');
  };

  const guardar = async () => {
    if (!form.name || !form.email) { setError('Nombre y email son obligatorios'); return; }
    if (!editUser && !form.password) { setError('La contraseña es obligatoria'); return; }
    if (form.companyIds.length === 0) { setError('Selecciona al menos una empresa'); return; }
    setError(''); setSaving(true);
    try {
      if (editUser) {
        await api.put(`/companies/${cid}/users/${editUser.user?.id || editUser.id}`, form);
      } else {
        await api.post(`/companies/${form.companyIds[0]}/users`, form);
      }
      resetForm();
      refetch();
    } catch(e: any) {
      setError(e.response?.data?.message || 'Error');
    } finally { setSaving(false); }
  };

  const toggle = async (u: any) => {
    await api.put(`/companies/${cid}/users/${u.user?.id || u.id}/toggle`, {});
    refetch();
  };

  const startEdit = (u: any) => {
    setEditUser(u);
    setForm({
      name:      u.user?.name     || u.name     || '',
      email:     u.user?.email    || u.email    || '',
      password:  '',
      roleCode:  u.role?.code     || u.roleCode || 'contador',
      companyIds: [cid!],
    });
    setShowNew(true);
  };

  const ROLES = ['admin','administrador','gerente','contador','rh','cajero','director'];

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Administración</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => { resetForm(); setShowNew(true); }}>
            + Nuevo usuario
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, marginTop:0, marginBottom:16 }}>
              {editUser ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Nombre completo *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.name}
                  onChange={e => set('name', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Email *</label>
                <input type="email" className="input-base" style={{ fontSize:13 }} value={form.email}
                  onChange={e => set('email', e.target.value)} disabled={!!editUser}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                  {editUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                </label>
                <input type="password" className="input-base" style={{ fontSize:13 }} value={form.password}
                  onChange={e => set('password', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Rol</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.roleCode}
                  onChange={e => set('roleCode', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:8 }}>Empresas con acceso *</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {(companies as any[]).map((c: any) => (
                  <button key={c.id} onClick={() => toggleCompany(c.id)}
                    style={{
                      padding:'6px 14px', borderRadius:99, fontSize:12, cursor:'pointer',
                      border:`2px solid ${form.companyIds.includes(c.id) ? c.color : '#334155'}`,
                      background: form.companyIds.includes(c.id) ? c.color+'22' : 'transparent',
                      color: form.companyIds.includes(c.id) ? c.color : '#64748b',
                    }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            {error && <p style={{ color:'#f87171', fontSize:13, margin:'0 0 8px' }}>{error}</p>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={resetForm}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : editUser ? 'Actualizar' : 'Crear usuario'}
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {(usuarios as any[]).map((u: any) => (
                <tr key={u.user?.id || u.id}>
                  <td style={{ fontWeight:500 }}>{u.user?.name || u.name}</td>
                  <td style={{ color:'#64748b' }}>{u.user?.email || u.email}</td>
                  <td><span className="badge-blue">{u.role?.name || u.roleCode}</span></td>
                  <td>
                    <span className={u.user?.isActive !== false ? 'badge-green' : 'badge-red'}>
                      {u.user?.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => startEdit(u)}
                        style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                        Editar
                      </button>
                      <button onClick={() => toggle(u)}
                        style={{ background:'none', border:'none', color: u.user?.isActive !== false ? '#f87171' : '#10b981', cursor:'pointer', fontSize:12 }}>
                        {u.user?.isActive !== false ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
