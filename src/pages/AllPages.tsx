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

  const { data: summary } = useQuery({
    queryKey:['cxc-summary',cid],
    queryFn: ()=>api.get(`/companies/${cid}/cxc/summary`).then(r=>r.data),
    enabled:!!cid,
  });

  const { data: cxcs=[] } = useQuery({
    queryKey:['cxc',cid,activePeriod],
    queryFn: ()=>api.get(`/companies/${cid}/cxc?period=${activePeriod}`).then(r=>r.data),
    enabled:!!cid,
  });

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
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Cliente</th><th>Fecha</th>
              <th style={{textAlign:'right'}}>Original</th>
              <th style={{textAlign:'right'}}>Saldo</th><th>Estado</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

// ── REPORTES ──────────────────────────────────────────────────
export function ReportesPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  const { data: edo, isLoading } = useQuery({
    queryKey:['income-statement',cid,activePeriod],
    queryFn: ()=>api.get(`/reports/companies/${cid}/income-statement?period=${activePeriod}`).then(r=>r.data),
    enabled:!!cid,
  });

  const s = edo?.summary||{};

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Estado de Resultados</h1>
        {isLoading && <p style={{ color:'#64748b' }}>Calculando…</p>}
        {!isLoading && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {(edo?.sections||[]).map((sec:any) => (
              <div key={sec.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'12px 20px', borderBottom:'1px solid #334155', background:color+'11' }}>
                  <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color, margin:0, letterSpacing:1 }}>{sec.name}</p>
                </div>
                {(sec.groups||[]).flatMap((g:any) =>
                  (g.rubrics||[]).map((r:any) => (
                    <div key={r.rubricId} style={{ display:'flex', justifyContent:'space-between', padding:'8px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                      <span style={{ fontSize:13, color:'#94a3b8' }}>{r.name}</span>
                      <span style={{ fontSize:13, fontWeight:600, color }}>{fmt(r.net||r.cost||0)}</span>
                    </div>
                  ))
                )}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 20px', background:color+'11' }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>Total {sec.name}</span>
                  <span style={{ fontSize:14, fontWeight:700, color }}>{fmt(sec.total)}</span>
                </div>
              </div>
            ))}
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Venta neta',       value:fmt(s.totalNetSale),  color },
                { label:'Utilidad bruta',   value:fmt(s.grossProfit),   color:'#10b981' },
                { label:'UTILIDAD / PÉRDIDA NETA', value:fmt(s.netIncome),
                  color:s.netIncome>=0?'#10b981':'#f87171', big:true },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:row.big?14:13, fontWeight:row.big?700:400 }}>{row.label}</span>
                  <span style={{ fontSize:row.big?18:14, fontWeight:700, color:row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── CONCILIACIÓN ──────────────────────────────────────────────
export function ConciliacionPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';

  const { data: balances } = useQuery({
    queryKey:['balances',cid],
    queryFn: ()=>api.get(`/companies/${cid}/flow/balances`).then(r=>r.data),
    enabled:!!cid,
  });

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Conciliación</h1>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
          <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total MXN</p>
            <p style={{ fontSize:22, fontWeight:700, color, margin:0 }}>{fmt(balances?.totalMxn||0)}</p>
          </div>
          <div className="card-sm" style={{ borderLeft:'3px solid #3b82f6' }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total USD</p>
            <p style={{ fontSize:22, fontWeight:700, color:'#3b82f6', margin:0 }}>${(balances?.totalUsd||0).toFixed(2)} USD</p>
          </div>
        </div>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr><th>Cuenta</th><th>Tipo</th><th>Moneda</th><th style={{textAlign:'right'}}>Saldo</th></tr></thead>
            <tbody>
              {(balances?.accounts||[]).map((a:any) => (
                <tr key={a.accountId}>
                  <td style={{fontWeight:500}}>{a.accountName}</td>
                  <td><span className="badge-gray">{a.type}</span></td>
                  <td>{a.currency}</td>
                  <td style={{textAlign:'right',fontWeight:700,color:a.balance>=0?color:'#f87171'}}>
                    {a.currency==='USD'?`$${a.balance.toFixed(2)} USD`:fmt(a.balance)}
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

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    roleCode: 'contador', companyIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const { data: usuarios = [] } = useQuery({
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

  const guardar = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Nombre, email y contraseña son obligatorios'); return;
    }
    if (form.companyIds.length === 0) {
      setError('Selecciona al menos una empresa'); return;
    }
    setError(''); setSaving(true);
    try {
      await api.post(`/companies/${form.companyIds[0]}/users`, form);
      setShowNew(false);
      setForm({ name:'', email:'', password:'', roleCode:'contador', companyIds:[] });
      qc.invalidateQueries({ queryKey: ['company-users', cid] });
    } catch(e: any) {
      setError(e.response?.data?.message || 'Error al crear usuario');
    } finally { setSaving(false); }
  };

  const ROLES = ['admin','administrador','gerente','contador','rh','cajero','director'];

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Administración</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setShowNew(!showNew)}>
            + Nuevo usuario
          </button>
        </div>

        {showNew && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, marginTop:0, marginBottom:16 }}>Nuevo usuario</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Nombre completo *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Nombre apellido"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Email *</label>
                <input type="email" className="input-base" style={{ fontSize:13 }} value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="correo@empresa.com"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Contraseña temporal *</label>
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
                {companies.map((c: any) => (
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
              <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : 'Crear usuario'}
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th></tr></thead>
            <tbody>
              {usuarios.map((u: any) => (
                <tr key={u.user?.id || u.id}>
                  <td style={{ fontWeight:500 }}>{u.user?.name || u.name}</td>
                  <td style={{ color:'#64748b' }}>{u.user?.email || u.email}</td>
                  <td><span className="badge-blue">{u.role?.name || u.roleCode}</span></td>
                  <td><span className={u.user?.isActive !== false ? 'badge-green' : 'badge-red'}>
                    {u.user?.isActive !== false ? 'Activo' : 'Inactivo'}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
