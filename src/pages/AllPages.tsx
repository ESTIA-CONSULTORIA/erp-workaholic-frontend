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
  const role  = activeCompany?.roleCode || '';

  const [corteActivo, setCorteActivo] = useState<any>(null);
  const [notas,       setNotas]       = useState('');
  const [accion,      setAccion]      = useState<'aprobar'|'rechazar'|null>(null);
  const [saving,      setSaving]      = useState(false);

  const { data: cortes = [], isLoading } = useQuery({
    queryKey: ['cuts', cid, activePeriod],
    queryFn:  () => api.get(`/companies/${cid}/cuts?period=${activePeriod}`).then(r => r.data),
    enabled: !!cid,
  });

  const totalAprobado = (cortes as any[])
    .filter((c:any) => c.status==='APROBADO')
    .reduce((t:number,c:any) => t+(c.lines||[]).reduce((s:number,l:any)=>s+Number(l.netAmount||0),0), 0);

  const puedeValidar = ['admin','administrador','gerente','contador'].includes(role);

  const ejecutarAccion = async () => {
    if (!corteActivo || !accion) return;
    setSaving(true);
    try {
      if (accion === 'aprobar') {
        await api.put(`/companies/${cid}/cuts/${corteActivo.id}/approve`, { notes: notas });
      } else {
        await api.put(`/companies/${cid}/cuts/${corteActivo.id}/reject`, { notes: notas });
      }
      setCorteActivo(null); setNotas(''); setAccion(null);
      qc.invalidateQueries({ queryKey: ['cuts', cid] });
    } catch(e:any) {
      alert(e.response?.data?.message || 'Error');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Cortes</h1>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>
          {(cortes as any[]).length} cortes · Total aprobado:{' '}
          <span style={{ color, fontWeight:600 }}>{fmt(totalAprobado)}</span>
        </p>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Folio</th><th>Fecha</th><th>Sucursal</th>
              <th style={{textAlign:'right'}}>Venta neta</th>
              <th>Estado</th>
              {puedeValidar && <th>Acciones</th>}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
              {!isLoading && (cortes as any[]).length===0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cortes en este período</td></tr>
              )}
              {(cortes as any[]).map((c:any) => {
                const total = (c.lines||[]).reduce((t:number,l:any)=>t+Number(l.netAmount||0),0);
                const badge = c.status==='APROBADO'?'badge-green':c.status==='ENVIADO'?'badge-amber':c.status==='RECHAZADO'?'badge-red':'badge-gray';
                return (
                  <tr key={c.id}>
                    <td><code style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{c.folio}</code></td>
                    <td>{fmtDate(c.date)}</td>
                    <td>{c.branch?.name||'—'}</td>
                    <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(total)}</td>
                    <td><span className={badge}>{c.status}</span></td>
                    {puedeValidar && (
                      <td>
                        {c.status === 'ENVIADO' && (
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => { setCorteActivo(c); setAccion('aprobar'); setNotas(''); }}
                              style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                              ✓ Aprobar
                            </button>
                            <button onClick={() => { setCorteActivo(c); setAccion('rechazar'); setNotas(''); }}
                              style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:12 }}>
                              ✕ Rechazar
                            </button>
                          </div>
                        )}
                        {c.status === 'APROBADO' && <span style={{fontSize:11,color:'#10b981'}}>✓ Aprobado</span>}
                        {c.status === 'RECHAZADO' && <span style={{fontSize:11,color:'#f87171'}}>✕ Rechazado</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {corteActivo && accion && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1e293b', borderRadius:12, padding:24, width:400, border:'1px solid #334155' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 4px',
              color: accion==='aprobar'?'#10b981':'#f87171' }}>
              {accion==='aprobar' ? '✓ Aprobar corte' : '✕ Rechazar corte'}
            </h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 16px' }}>
              Folio {corteActivo.folio} — {fmtDate(corteActivo.date)}
            </p>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>
                Notas {accion==='rechazar'?'(motivo de rechazo)':'(opcional)'}
              </label>
              <textarea className="input-base" style={{ fontSize:13, height:80, resize:'none' }}
                value={notas} onChange={e => setNotas(e.target.value)}/>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setCorteActivo(null); setAccion(null); }}>
                Cancelar
              </button>
              <button className="btn-primary" style={{ fontSize:13,
                background: accion==='aprobar'?'#10b981':'#f87171' }}
                onClick={ejecutarAccion} disabled={saving}>
                {saving ? 'Procesando...' : accion==='aprobar' ? 'Aprobar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ── GASTOS ────────────────────────────────────────────────────
// INSTRUCCIONES: Reemplaza todo desde "// ── GASTOS" hasta el "}"
// que cierra GastosPage (justo antes de "// ── CONCILIACIÓN")
export function GastosPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();

  const esContador = ['admin','administrador','gerente','contador'].includes(role);

  const [vista,   setVista]   = useState<'lista'|'nuevo'>('lista');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const initForm = {
    date:          new Date().toISOString().slice(0,10),
    concept:       '',
    subtotal:      '',
    tax:           '0',
    paymentMethod: 'efectivo',
    paymentStatus: 'PAGADO',
    supplierId:    '',
    rubricId:      '',
    cashAccountId: '',
    invoiceRef:    '',
    isExternal:    false,
    notes:         '',
  };
  const [form, setForm] = useState(initForm);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const total = (Number(form.subtotal) || 0) + (Number(form.tax) || 0);

  // Catálogos
  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ['expenses', cid, activePeriod],
    queryFn:  () => api.get(`/companies/${cid}/expenses?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid && vista === 'nuevo',
  });

  const { data: cuentas = [] } = useQuery({
    queryKey: ['balances', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data?.accounts || []),
    enabled:  !!cid && vista === 'nuevo' && esContador,
  });

  const totalGastos = (gastos as any[]).reduce((t:number,g:any) => t + Number(g.total||0), 0);

  const guardar = async () => {
    if (!form.concept || !form.subtotal) { setError('Concepto y monto son obligatorios'); return; }
    setError(''); setSaving(true);
    try {
      await api.post(`/companies/${cid}/expenses`, { ...form, subtotal: Number(form.subtotal), tax: Number(form.tax) });
      qc.invalidateQueries({ queryKey: ['expenses', cid] });
      setVista('lista');
      setForm(initForm);
    } catch(e:any) {
      setError(e.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 4px' }}>Gastos y Compras</h1>
            <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
              {(gastos as any[]).length} registros · Total:{' '}
              <span style={{ color, fontWeight:600 }}>{fmt(totalGastos)}</span>
            </p>
          </div>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => { setVista(vista==='nuevo'?'lista':'nuevo'); setError(''); }}>
            {vista === 'nuevo' ? 'Ver lista' : '+ Nuevo gasto'}
          </button>
        </div>

        {/* Formulario nuevo gasto */}
        {vista === 'nuevo' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo gasto</h3>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.date} onChange={e => set('date', e.target.value)}/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Concepto *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.concept}
                  onChange={e => set('concept', e.target.value)} placeholder="Descripción del gasto"/>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Subtotal *</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={form.subtotal} onChange={e => set('subtotal', e.target.value)} placeholder="0.00"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>IVA</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={form.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Método de pago</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.paymentMethod}
                  onChange={e => set('paymentMethod', e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Estado</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.paymentStatus}
                  onChange={e => set('paymentStatus', e.target.value)}>
                  <option value="PAGADO">Pagado</option>
                  <option value="PENDIENTE">Pendiente</option>
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>
                  Proveedor <span style={{ color:'#475569' }}>(opcional)</span>
                </label>
                <select className="input-base" style={{ fontSize:13 }} value={form.supplierId}
                  onChange={e => set('supplierId', e.target.value)}>
                  <option value="">— Proveedor desconocido —</option>
                  {(proveedores as any[]).map((p:any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                  onChange={e => set('notes', e.target.value)} placeholder="Observaciones"/>
              </div>
            </div>

            {/* Campos avanzados solo para contador */}
            {esContador && (
              <>
                <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:1, margin:'16px 0 8px' }}>Campos contables</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Cuenta bancaria</label>
                    <select className="input-base" style={{ fontSize:13 }} value={form.cashAccountId}
                      onChange={e => set('cashAccountId', e.target.value)}>
                      <option value="">— Sin asignar —</option>
                      {(cuentas as any[]).map((c:any) => (
                        <option key={c.accountId} value={c.accountId}>{c.accountName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>No. Factura</label>
                    <input className="input-base" style={{ fontSize:13 }} value={form.invoiceRef}
                      onChange={e => set('invoiceRef', e.target.value)} placeholder="A-001"/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
                    <input type="checkbox" id="isExternal" checked={form.isExternal}
                      onChange={e => set('isExternal', e.target.checked)}
                      style={{ width:16, height:16, cursor:'pointer' }}/>
                    <label htmlFor="isExternal" style={{ fontSize:12, color:'#94a3b8', cursor:'pointer' }}>
                      Operación externa (no afecta resultado operativo)
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Resumen */}
            {Number(form.subtotal) > 0 && (
              <div style={{ background:'#0f172a', borderRadius:8, padding:12, marginBottom:16,
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, color:'#64748b' }}>
                  Total: subtotal {fmt(Number(form.subtotal))} + IVA {fmt(Number(form.tax))}
                </span>
                <span style={{ fontSize:18, fontWeight:700, color }}>{fmt(total)}</span>
              </div>
            )}

            {error && <p style={{ color:'#f87171', fontSize:13, margin:'0 0 12px' }}>{error}</p>}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:13 }}
                onClick={() => { setVista('lista'); setError(''); }}>Cancelar</button>
              <button className="btn-primary" style={{ background:color, fontSize:13 }}
                onClick={guardar} disabled={saving || !form.concept || !form.subtotal}>
                {saving ? 'Guardando…' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de gastos */}
        {vista === 'lista' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Fecha</th><th>Concepto</th><th>Proveedor</th>
                <th>Rubro</th><th style={{textAlign:'right'}}>Monto</th><th>Estado</th>
              </tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                {!isLoading && (gastos as any[]).length===0 && (
                  <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin gastos registrados</td></tr>
                )}
                {(gastos as any[]).map((g:any) => (
                  <tr key={g.id}>
                    <td>{fmtDate(g.date)}</td>
                    <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.concept}</td>
                    <td style={{color:'#94a3b8'}}>{g.supplier?.name||'—'}</td>
                    <td>
                      {g.rubric?.name
                        ? <span style={{fontSize:11,background:'#334155',padding:'2px 6px',borderRadius:4}}>{g.rubric.name}</span>
                        : <span style={{fontSize:11,color:'#475569'}}>—</span>}
                    </td>
                    <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(g.total)}</td>
                    <td>
                      <span className={g.paymentStatus==='PAGADO'?'badge-green':'badge-amber'}>
                        {g.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export function ConciliacionPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [editId,    setEditId]    = useState<string|null>(null);
  const [editName,  setEditName]  = useState('');
  const [saving,    setSaving]    = useState(false);

  const { data: rawBalances } = useQuery({
    queryKey: ['balances', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data),
    enabled:  !!cid,
  });

  const balances = Array.isArray(rawBalances) ? rawBalances : (rawBalances?.accounts || []);
  const totalMxn = rawBalances?.totalMxn || 0;
  const totalUsd = rawBalances?.totalUsd || 0;

  const TIPO_LABELS: Record<string,string> = {
    EFECTIVO:   'Efectivo',
    BANCO:      'Banco',
    PLATAFORMA: 'Plataforma',
    CAJA_CHICA: 'Caja chica',
  };

  const grupos = (balances as any[]).reduce((acc: any, b: any) => {
    const tipo = b.type || 'OTRO';
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(b);
    return acc;
  }, {});

  const guardarNombre = async (accountId: string) => {
    setSaving(true);
    try {
      await api.put(`/companies/${cid}/flow/accounts/${accountId}`, { name: editName });
      setEditId(null);
      qc.invalidateQueries({ queryKey: ['balances', cid] });
    } finally { setSaving(false); }
  };

  const toggleAccount = async (accountId: string, isActive: boolean) => {
    await api.put(`/companies/${cid}/flow/accounts/${accountId}`, { isActive: !isActive });
    qc.invalidateQueries({ queryKey: ['balances', cid] });
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Conciliación</h1>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
          <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Saldo total MXN</p>
            <p style={{ fontSize:24, fontWeight:700, color, margin:0 }}>{fmt(totalMxn)}</p>
          </div>
          <div className="card-sm" style={{ borderLeft:'3px solid #f59e0b' }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Saldo total USD</p>
            <p style={{ fontSize:24, fontWeight:700, color:'#f59e0b', margin:0 }}>${Number(totalUsd).toFixed(2)}</p>
          </div>
        </div>

        {/* Cuentas agrupadas por tipo */}
        {Object.entries(grupos).map(([tipo, cuentas]: any) => (
          <div key={tipo} style={{ marginBottom:20 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 8px' }}>
              {TIPO_LABELS[tipo] || tipo}
            </p>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Cuenta</th><th>Moneda</th>
                    <th style={{textAlign:'right'}}>Saldo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(cuentas as any[]).map((b: any) => (
                    <tr key={b.accountId}>
                      <td>
                        {editId === b.accountId ? (
                          <input className="input-base" style={{ fontSize:12, width:200 }}
                            value={editName} onChange={e => setEditName(e.target.value)}/>
                        ) : (
                          <span style={{ fontWeight:500 }}>{b.accountName}</span>
                        )}
                      </td>
                      <td><span className="badge-blue">{b.currency}</span></td>
                      <td style={{ textAlign:'right', fontWeight:700, color:Number(b.balance)>=0?color:'#f87171' }}>
                        {fmt(b.balance)}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:8 }}>
                          {editId === b.accountId ? (
                            <>
                              <button onClick={() => guardarNombre(b.accountId)} disabled={saving}
                                style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                                ✓ Guardar
                              </button>
                              <button onClick={() => setEditId(null)}
                                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button onClick={() => { setEditId(b.accountId); setEditName(b.accountName); }}
                              style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                              Renombrar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
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

// ── ESTADOS FINANCIEROS ───────────────────────────────────────
// INSTRUCCIONES: Reemplaza todo desde "// ── REPORTES" hasta el cierre
// de ReportesPage (antes de "// ── Estado de Resultados")
// ── ESTADOS FINANCIEROS ───────────────────────────────────────
// REEMPLAZA todo desde "export function ReportesPage()" hasta antes de "function ERTab("
export function ReportesPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const [tab, setTab] = useState<'er'|'flujo'|'balance'>('er');

  const TABS = [
    { id:'er',      label:'Estado de Resultados' },
    { id:'flujo',   label:'Flujo de Efectivo' },
    { id:'balance', label:'Balance General' },
  ] as const;

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:16 }}>Estados Financieros</h1>
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #334155', marginBottom:24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 20px', fontSize:13, fontWeight:500, background:'none', border:'none',
                borderBottom: tab===t.id ? `2px solid ${color}` : '2px solid transparent',
                color: tab===t.id ? color : '#64748b', cursor:'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'er'      && <ERTab      cid={cid!} color={color} activePeriod={activePeriod}/>}
        {tab === 'flujo'   && <FlujoTab   cid={cid!} color={color} activePeriod={activePeriod}/>}
        {tab === 'balance' && <BalanceTab cid={cid!} color={color} activePeriod={activePeriod}/>}
      </div>
    </AppLayout>
  );
}

// ── Flujo de Efectivo ─────────────────────────────────────────
function FlujoTab({ cid, color, activePeriod }: any) {
  const { data: flujo, isLoading } = useQuery({
    queryKey: ['cash-flow', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/cash-flow?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  if (isLoading) return <p style={{color:'#64748b'}}>Cargando...</p>;
  if (!flujo)    return <p style={{color:'#64748b'}}>Sin datos para este período</p>;

  const positivo = (n: number) => n >= 0 ? '#10b981' : '#f87171';

  return (
    <div>
      {/* Resumen */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Saldo inicial',      value: flujo.saldoInicial,   col:'#94a3b8' },
          { label:'Flujo operativo',    value: flujo.operativos?.total||0,  col: positivo(flujo.operativos?.total||0) },
          { label:'Flujo financiero',   value: flujo.financieros?.total||0, col: positivo(flujo.financieros?.total||0) },
          { label:'Saldo final',        value: flujo.saldoFinal,     col: positivo(flujo.saldoFinal) },
        ].map(k => (
          <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
            <p style={{ fontSize:18, fontWeight:700, color:k.col, margin:0 }}>{fmt(k.value)}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Actividades operativas */}
        <div className="card">
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Actividades operativas</p>
          {(flujo.operativos?.entradas||[]).map((e:any, i:number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{e.label}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#10b981' }}>+{fmt(e.monto)}</span>
            </div>
          ))}
          {(flujo.operativos?.salidas||[]).map((e:any, i:number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{e.label}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#f87171' }}>-{fmt(e.monto)}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid #334155', marginTop:8, paddingTop:8,
            display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, fontWeight:700 }}>Neto operativo</span>
            <span style={{ fontSize:14, fontWeight:700, color: positivo(flujo.operativos?.total||0) }}>
              {fmt(flujo.operativos?.total||0)}
            </span>
          </div>
        </div>

        {/* Actividades financieras */}
        <div className="card">
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Actividades de financiamiento</p>
          {(flujo.financieros?.entradas||[]).map((e:any, i:number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{e.label}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#10b981' }}>+{fmt(e.monto)}</span>
            </div>
          ))}
          {(flujo.financieros?.salidas||[]).map((e:any, i:number) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{e.label}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#f87171' }}>-{fmt(e.monto)}</span>
            </div>
          ))}
          {(flujo.financieros?.entradas||[]).length === 0 && (flujo.financieros?.salidas||[]).length === 0 && (
            <p style={{ fontSize:12, color:'#475569' }}>Sin movimientos financieros</p>
          )}
          <div style={{ borderTop:'1px solid #334155', marginTop:8, paddingTop:8,
            display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, fontWeight:700 }}>Neto financiero</span>
            <span style={{ fontSize:14, fontWeight:700, color: positivo(flujo.financieros?.total||0) }}>
              {fmt(flujo.financieros?.total||0)}
            </span>
          </div>
        </div>
      </div>

      {/* Saldos por cuenta */}
      {(flujo.saldosPorCuenta||[]).length > 0 && (
        <div className="card">
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Saldos por cuenta</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {(flujo.saldosPorCuenta||[]).map((c:any, i:number) => (
              <div key={i} style={{ background:'#0f172a', borderRadius:8, padding:'8px 10px' }}>
                <p style={{ fontSize:11, color:'#64748b', margin:'0 0 2px' }}>{c.cuenta}</p>
                <p style={{ fontSize:14, fontWeight:700, margin:0,
                  color: c.saldo >= 0 ? color : '#f87171' }}>
                  {fmt(c.saldo)}
                </p>
                <p style={{ fontSize:10, color:'#475569', margin:0 }}>{c.moneda}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Balance General ───────────────────────────────────────────
function BalanceTab({ cid, color, activePeriod }: any) {
  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance-sheet', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/balance-sheet?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  if (isLoading) return <p style={{color:'#64748b'}}>Cargando...</p>;
  if (!balance)  return <p style={{color:'#64748b'}}>Sin datos para este período</p>;

  const BalRow = ({ label, value, bold, indent, col }: any) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding: indent ? '3px 0 3px 16px' : '4px 0',
      borderBottom: bold ? '1px solid #334155' : 'none',
      marginBottom: bold ? 8 : 0 }}>
      <span style={{ fontSize: bold?13:12, fontWeight: bold?700:400,
        color: bold?'#f1f5f9':'#94a3b8' }}>{label}</span>
      <span style={{ fontSize: bold?14:12, fontWeight: bold?700:500,
        color: col || (bold ? color : '#94a3b8') }}>
        {fmt(value)}
      </span>
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {/* ACTIVOS */}
      <div>
        <div className="card" style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Activos</p>
          <BalRow label="Efectivo y bancos" value={balance.activos?.totalEfectivo||0} color={color}/>
          {(balance.activos?.efectivoYBancos||[]).map((c:any,i:number) => (
            <BalRow key={i} label={c.nombre} value={c.saldo} indent/>
          ))}
          <BalRow label="Cuentas por cobrar" value={balance.activos?.cuentasPorCobrar||0}/>
          {balance.activos?.inventario > 0 && (
            <BalRow label="Inventario" value={balance.activos?.inventario||0}/>
          )}
          <BalRow label="= Total activos" value={balance.activos?.total||0} bold col={color}/>
        </div>
      </div>

      {/* PASIVOS Y PATRIMONIO */}
      <div>
        <div className="card" style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Pasivos</p>
          <BalRow label="Cuentas por pagar" value={balance.pasivos?.cuentasPorPagar||0} col='#f87171'/>
          <BalRow label="= Total pasivos" value={balance.pasivos?.total||0} bold col='#f87171'/>
        </div>

        <div className="card" style={{ borderLeft:`3px solid ${color}` }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
            letterSpacing:1, margin:'0 0 12px' }}>Patrimonio</p>
          <BalRow label="Resultado del período"
            value={balance.patrimonio?.resultadoPeriodo||0}
            col={balance.patrimonio?.resultadoPeriodo>=0?'#10b981':'#f87171'}/>
          <BalRow label="= Patrimonio neto" value={balance.patrimonio?.total||0} bold
            col={balance.patrimonio?.total>=0?color:'#f87171'}/>
        </div>
      </div>
    </div>
  );
}



// ── Estado de Resultados ──────────────────────────────────────
function ERTab({ cid, color, activePeriod }: any) {
  const { data: edo, isLoading } = useQuery({
    queryKey: ['income-statement', cid, activePeriod],
    queryFn:  () => api.get(`/reports/companies/${cid}/income-statement?period=${activePeriod}`).then(r => r.data),
    enabled:  !!cid,
  });

  if (isLoading) return <p style={{color:'#64748b'}}>Cargando...</p>;

  const ventas       = edo?.ventas      || {};
  const gastos       = edo?.gastosPorSeccion || {};
  const totalGastos  = edo?.totalGastos || 0;
  const contrib      = edo?.contribuciones || 0;
  const antesContrib = edo?.resultadoAntesContrib || 0;
  const resultado    = edo?.resultadoEjercicio || 0;
  const nomina       = edo?.nomina || 0;
  const positivo     = (n: number) => n >= 0 ? '#10b981' : '#f87171';

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Ingresos</p>
        <ERRow label="Venta bruta"                value={ventas.bruta    || 0} color={color}/>
        <ERRow label="(-) Descuentos y cortesías" value={-(ventas.descuentos || 0)} color='#f87171' indent/>
        <ERRow label="Venta neta POS"             value={ventas.neta     || 0} color={color} indent/>
        <ERRow label="Venta por cortes"           value={ventas.cortes   || 0} color={color} indent/>
        <ERRow label="= Total ventas"             value={ventas.total    || 0} color={color} bold/>
      </div>

      {edo?.costoVentas > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Costo de ventas</p>
          <ERRow label="(-) Costo de producción" value={-(edo.costoVentas || 0)} color='#f87171'/>
          <ERRow label="= Utilidad bruta"        value={edo.utilidadBruta || 0} color={positivo(edo.utilidadBruta)} bold/>
        </div>
      )}

      {Object.entries(gastos).filter(([k]) => k !== 'CONTRIBUCIONES').map(([secCode, sec]: any) => (
        <div key={secCode} className="card" style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>{sec.name}</p>
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

      {nomina > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Nómina</p>
          <ERRow label="Nómina del período" value={-nomina} color='#f87171'/>
        </div>
      )}

      <div className="card" style={{ marginBottom:16, borderLeft:`3px solid ${positivo(antesContrib)}` }}>
        <ERRow label="= Resultado antes de contribuciones" value={antesContrib} color={positivo(antesContrib)} bold/>
      </div>

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

      <div className="card" style={{ borderLeft:`3px solid ${positivo(resultado)}` }}>
        <ERRow label="= Resultado del ejercicio neto" value={resultado} color={positivo(resultado)} bold/>
      </div>
    </div>
  );
}

// ── Reporte de Ventas ─────────────────────────────────────────
const hoy = new Date().toISOString().slice(0,10);
function VentasTab({ cid, color }: any) {
  const [tipoFiltro, setTipoFiltro] = useState('mes' as 'mes'|'dia'|'rango');
  const [periodo,    setPeriodo]    = useState(hoy.slice(0,7));
  const [diaFiltro,  setDiaFiltro]  = useState(hoy);
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin,    setFechaFin]    = useState(hoy);
  const [canal,       setCanal]       = useState('');

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas-reporte', cid, tipoFiltro, periodo, diaFiltro, fechaInicio, fechaFin, canal],
  queryFn:  () => {
    let url = `/companies/${cid}/machete/sales?`;
    if (tipoFiltro === 'mes')   url += `period=${periodo}`;
    if (tipoFiltro === 'dia')   url += `startDate=${diaFiltro}&endDate=${diaFiltro}`;
    if (tipoFiltro === 'rango') url += `startDate=${fechaInicio}&endDate=${fechaFin}`;
    if (canal) url += `&channel=${canal}`;
    return api.get(url).then(r => r.data);
  },
    enabled: !!cid,
  });

  // Agrupar por familia (meatType + flavor)
  const porFamilia: Record<string, { cantidad:number, total:number }> = {};
  const porCanal:   Record<string, { cantidad:number, total:number }> = {};
  let totalBruto = 0;
  let totalDesc  = 0;
  let totalUnits = 0;

  for (const v of ventas as any[]) {
    const ch = v.channel || 'MOSTRADOR';
    if (!porCanal[ch]) porCanal[ch] = { cantidad:0, total:0 };
    porCanal[ch].total    += Number(v.total);
    porCanal[ch].cantidad += v.lines?.length || 0;
    totalBruto += Number(v.total);
    totalDesc  += Number(v.discount || 0);

    for (const l of v.lines || []) {
      const familia = `${l.product?.meatType || 'RES'} — ${l.product?.flavor || 'NAT'}`;
      if (!porFamilia[familia]) porFamilia[familia] = { cantidad:0, total:0 };
      porFamilia[familia].cantidad += Number(l.quantity);
      porFamilia[familia].total    += Number(l.total);
      totalUnits += Number(l.quantity);
    }
  }

  const exportarExcel = () => {
    import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs').then((XLSX: any) => {
      const CANAL_LBL: Record<string,string> = { MOSTRADOR:'Tienda', MAYOREO:'Mayoreo', ONLINE:'Distribuidor', ML:'Online' };
      const rows = (ventas as any[]).flatMap((v: any) =>
        (v.lines || []).map((l: any) => ({
          Fecha:      v.date?.slice(0,10),
          Canal:      CANAL_LBL[v.channel] || v.channel,
          Cliente:    v.client?.name || '—',
          SKU:        l.product?.sku || '—',
          Producto:   l.product?.name || '—',
          Cantidad:   l.quantity,
          PrecioUnit: Number(l.unitPrice),
          Total:      Number(l.total),
          Pago:       v.paymentMethod,
        }))
      );
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      XLSX.writeFile(wb, `ventas-${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  const CANAL_LABELS: Record<string,string> = { MOSTRADOR:'Tienda', MAYOREO:'Mayoreo', ONLINE:'Distribuidor', ML:'Online' };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Ver por</label>
          <div style={{ display:'flex', gap:4 }}>
            {(['mes','dia','rango'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${tipoFiltro===t ? color : '#334155'}`,
                  background: tipoFiltro===t ? color+'22' : 'transparent',
                  color: tipoFiltro===t ? color : '#64748b' }}>
                {t === 'mes' ? 'Mes' : t === 'dia' ? 'Día' : 'Rango'}
              </button>
            ))}
          </div>
        </div>
        {tipoFiltro === 'mes' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Mes</label>
            <input type="month" className="input-base" style={{ fontSize:13 }}
              value={periodo} onChange={e => setPeriodo(e.target.value)}/>
          </div>
        )}
        {tipoFiltro === 'dia' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Día</label>
            <input type="date" className="input-base" style={{ fontSize:13 }}
              value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}/>
          </div>
        )}
        {tipoFiltro === 'rango' && (
          <>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Desde</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hasta</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaFin} onChange={e => setFechaFin(e.target.value)}/>
            </div>
          </>
        )}
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Canal</label>
          <select className="input-base" style={{ fontSize:13 }} value={canal} onChange={e => setCanal(e.target.value)}>
            <option value="">Todos</option>
            <option value="MOSTRADOR">Tienda</option>
            <option value="MAYOREO">Mayoreo</option>
            <option value="ONLINE">Distribuidor</option>
            <option value="ML">Online</option>
          </select>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <button onClick={exportarExcel}
          style={{padding:'6px 16px',borderRadius:8,fontSize:12,border:'1px solid #10b981',background:'none',color:'#10b981',cursor:'pointer'}}>
          ⬇ Exportar Excel
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:'Venta bruta',   value:fmt(totalBruto),        col:color },
          { label:'Descuentos',    value:fmt(totalDesc),          col:'#f87171' },
          { label:'Venta neta',    value:fmt(totalBruto-totalDesc), col:'#10b981' },
          { label:'Unidades',      value:totalUnits.toString(),   col:'#94a3b8' },
        ].map(k => (
          <div key={k.label} className="card-sm" style={{ borderLeft:`3px solid ${k.col}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
            <p style={{ fontSize:18, fontWeight:700, color:k.col, margin:0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Por canal */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card">
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Por canal</p>
          {Object.entries(porCanal).map(([ch, d]: any) => (
            <div key={ch} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{CANAL_LABELS[ch]||ch}</span>
              <span style={{ fontSize:13, fontWeight:600, color }}>{fmt(d.total)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Por familia</p>
          {Object.entries(porFamilia).map(([fam, d]: any) => (
            <div key={fam} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{fam}</span>
              <span style={{ fontSize:13, fontWeight:600, color }}>{fmt(d.total)} ({d.cantidad} pzas)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle de ventas */}
      {isLoading ? <p style={{color:'#64748b'}}>Cargando...</p> : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Fecha</th><th>Canal</th><th>Cliente</th>
              <th style={{textAlign:'right'}}>Total</th><th>Pago</th>
            </tr></thead>
            <tbody>
              {(ventas as any[]).length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin ventas</td></tr>
              )}
              {(ventas as any[]).map((v: any) => (
                <tr key={v.id}>
                  <td>{fmtDate(v.date)}</td>
                  <td><span className="badge-blue">{CANAL_LABELS[v.channel]||v.channel}</span></td>
                  <td style={{color:'#64748b'}}>{v.client?.name || '—'}</td>
                  <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(v.total)}</td>
                  <td style={{color:'#64748b',fontSize:12}}>{v.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Reporte CxC Multicliente ──────────────────────────────────
function CxCReporteTab({ cid, color }: any) {
  const hoy = new Date().toISOString().slice(0,10);
  const [tipoFiltro,  setTipoFiltro]  = useState('mes' as 'mes'|'dia'|'rango');
  const [periodo,     setPeriodo]     = useState(hoy.slice(0,7));
  const [diaFiltro,   setDiaFiltro]   = useState(hoy);
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin,    setFechaFin]    = useState(hoy);
  const [clienteIds,  setClienteIds]  = useState<string[]>([]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxcs = [], isLoading } = useQuery({
    queryKey: ['cxc-reporte', cid, tipoFiltro, periodo, diaFiltro, fechaInicio, fechaFin, clienteIds],
    queryFn:  () => {
      let url = `/companies/${cid}/cxc?`;
      if (tipoFiltro === 'mes')   url += `period=${periodo}`;
      if (tipoFiltro === 'dia')   url += `startDate=${diaFiltro}&endDate=${diaFiltro}`;
      if (tipoFiltro === 'rango') url += `startDate=${fechaInicio}&endDate=${fechaFin}`;
      if (clienteIds.length === 1) url += `&clientId=${clienteIds[0]}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const filtrados = clienteIds.length > 1
    ? (cxcs as any[]).filter(c => clienteIds.includes(c.clientId))
    : cxcs as any[];

  const totalPendiente = filtrados.reduce((t, c) => t + Number(c.balance), 0);

  const toggleCliente = (id: string) => {
    setClienteIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  const exportarExcel = () => {
    import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs').then((XLSX: any) => {
      const rows = filtrados.map((c: any) => ({
        Cliente:   c.client?.name || '—',
        Fecha:     c.date?.slice(0,10),
        Original:  Number(c.originalAmount),
        Pagado:    Number(c.paidAmount),
        Saldo:     Number(c.balance),
        Estado:    c.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CxC');
      XLSX.writeFile(wb, `cxc-${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Ver por</label>
          <div style={{ display:'flex', gap:4 }}>
            {(['mes','dia','rango'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${tipoFiltro===t ? color : '#334155'}`,
                  background: tipoFiltro===t ? color+'22' : 'transparent',
                  color: tipoFiltro===t ? color : '#64748b' }}>
                {t === 'mes' ? 'Mes' : t === 'dia' ? 'Día' : 'Rango'}
              </button>
            ))}
          </div>
        </div>
        {tipoFiltro === 'mes' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Mes</label>
            <input type="month" className="input-base" style={{ fontSize:13 }}
              value={periodo} onChange={e => setPeriodo(e.target.value)}/>
          </div>
        )}
        {tipoFiltro === 'dia' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Día</label>
            <input type="date" className="input-base" style={{ fontSize:13 }}
              value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}/>
          </div>
        )}
        {tipoFiltro === 'rango' && (
          <>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Desde</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hasta</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaFin} onChange={e => setFechaFin(e.target.value)}/>
            </div>
          </>
        )}
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Clientes</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(clientes as any[]).map((c: any) => (
              <button key={c.id} onClick={() => toggleCliente(c.id)}
                style={{ padding:'4px 10px', borderRadius:99, fontSize:11, cursor:'pointer',
                  border:`1px solid ${clienteIds.includes(c.id) ? color : '#334155'}`,
                  background: clienteIds.includes(c.id) ? color+'22' : 'transparent',
                  color: clienteIds.includes(c.id) ? color : '#64748b' }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="card-sm" style={{ borderLeft:`3px solid ${color}`, flex:1, marginRight:16 }}>
          <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total pendiente</p>
          <p style={{ fontSize:22, fontWeight:700, color, margin:0 }}>{fmt(totalPendiente)}</p>
        </div>
        <button onClick={exportarExcel}
          style={{ padding:'6px 16px', borderRadius:8, fontSize:12, border:'1px solid #10b981', background:'none', color:'#10b981', cursor:'pointer' }}>
          ⬇ Exportar Excel
        </button>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table-base">
          <thead><tr>
            <th>Cliente</th><th>Fecha</th>
            <th style={{textAlign:'right'}}>Original</th>
            <th style={{textAlign:'right'}}>Saldo</th><th>Estado</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>}
            {filtrados.length === 0 && !isLoading && (
              <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cuentas</td></tr>
            )}
            {filtrados.map((c: any) => (
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

// ── Reporte CxP ───────────────────────────────────────────────
function CxPReporteTab({ cid, color }: any) {
  const hoy = new Date().toISOString().slice(0,10);
  const [tipoFiltro,  setTipoFiltro]  = useState('mes' as 'mes'|'dia'|'rango');
  const [periodo,     setPeriodo]     = useState(hoy.slice(0,7));
  const [diaFiltro,   setDiaFiltro]   = useState(hoy);
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin,    setFechaFin]    = useState(hoy);
  const [proveedorId, setProveedorId] = useState('');

  const { data: proveedores = [] } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxps = [], isLoading } = useQuery({
    queryKey: ['cxp-reporte', cid, tipoFiltro, periodo, diaFiltro, fechaInicio, fechaFin, proveedorId],
    queryFn:  () => {
      let url = `/companies/${cid}/cxp?`;
      if (tipoFiltro === 'mes')   url += `period=${periodo}`;
      if (tipoFiltro === 'dia')   url += `startDate=${diaFiltro}&endDate=${diaFiltro}`;
      if (tipoFiltro === 'rango') url += `startDate=${fechaInicio}&endDate=${fechaFin}`;
      if (proveedorId) url += `&supplierId=${proveedorId}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  const totalPendiente = (cxps as any[]).reduce((t, c) => t + Number(c.balance || 0), 0);
  const totalVencido   = (cxps as any[]).filter(c => c.status === 'VENCIDO').reduce((t, c) => t + Number(c.balance || 0), 0);

  const exportarExcel = () => {
    import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs').then((XLSX: any) => {
      const rows = (cxps as any[]).map((c: any) => ({
        Proveedor:   c.proveedorNombre || c.supplier?.name || '—',
        Concepto:    c.concept || '—',
        Fecha:       c.date?.slice(0,10),
        Vencimiento: c.dueDate?.slice(0,10),
        Original:    Number(c.originalAmount),
        Pagado:      Number(c.paidAmount),
        Saldo:       Number(c.balance),
        Estado:      c.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CxP');
      XLSX.writeFile(wb, `cxp-${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Ver por</label>
          <div style={{ display:'flex', gap:4 }}>
            {(['mes','dia','rango'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${tipoFiltro===t ? color : '#334155'}`,
                  background: tipoFiltro===t ? color+'22' : 'transparent',
                  color: tipoFiltro===t ? color : '#64748b' }}>
                {t === 'mes' ? 'Mes' : t === 'dia' ? 'Día' : 'Rango'}
              </button>
            ))}
          </div>
        </div>
        {tipoFiltro === 'mes' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Mes</label>
            <input type="month" className="input-base" style={{ fontSize:13 }}
              value={periodo} onChange={e => setPeriodo(e.target.value)}/>
          </div>
        )}
        {tipoFiltro === 'dia' && (
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Día</label>
            <input type="date" className="input-base" style={{ fontSize:13 }}
              value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}/>
          </div>
        )}
        {tipoFiltro === 'rango' && (
          <>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Desde</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Hasta</label>
              <input type="date" className="input-base" style={{ fontSize:13 }}
                value={fechaFin} onChange={e => setFechaFin(e.target.value)}/>
            </div>
          </>
        )}
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Proveedor</label>
          <select className="input-base" style={{ fontSize:13 }} value={proveedorId}
            onChange={e => setProveedorId(e.target.value)}>
            <option value="">Todos</option>
            {(proveedores as any[]).map((p:any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
          <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total por pagar</p>
          <p style={{ fontSize:22, fontWeight:700, color, margin:0 }}>{fmt(totalPendiente)}</p>
        </div>
        <div className="card-sm" style={{ borderLeft:'3px solid #f87171' }}>
          <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Vencido</p>
          <p style={{ fontSize:22, fontWeight:700, color:'#f87171', margin:0 }}>{fmt(totalVencido)}</p>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button onClick={exportarExcel}
          style={{ padding:'6px 16px', borderRadius:8, fontSize:12, border:'1px solid #10b981',
            background:'none', color:'#10b981', cursor:'pointer' }}>
          ⬇ Exportar Excel
        </button>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table-base">
          <thead><tr>
            <th>Proveedor</th><th>Concepto</th><th>Fecha</th><th>Vencimiento</th>
            <th style={{textAlign:'right'}}>Original</th>
            <th style={{textAlign:'right'}}>Saldo</th>
            <th>Estado</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando...</td></tr>}
            {(cxps as any[]).length === 0 && !isLoading && (
              <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cuentas por pagar</td></tr>
            )}
            {(cxps as any[]).map((c:any) => (
              <tr key={c.id}>
                <td style={{fontWeight:500}}>{c.proveedorNombre || c.supplier?.name || '—'}</td>
                <td style={{color:'#64748b',fontSize:12}}>{c.concept || '—'}</td>
                <td>{c.date?.slice(0,10)}</td>
                <td style={{color: c.status==='VENCIDO'?'#f87171':'#64748b'}}>{c.dueDate?.slice(0,10)}</td>
                <td style={{textAlign:'right'}}>{fmt(c.originalAmount)}</td>
                <td style={{textAlign:'right',fontWeight:700,color:c.status==='VENCIDO'?'#f87171':color}}>{fmt(c.balance)}</td>
                <td><span className={c.status==='PAGADO'?'badge-green':c.status==='VENCIDO'?'badge-red':'badge-amber'}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
        }

// ── DOCUMENTOS ────────────────────────────────────────────────
export function DocumentosPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc    = useQueryClient();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: docs=[], isLoading } = useQuery({
    queryKey:['documents',cid],
    queryFn: ()=>api.get(`/companies/${cid}/documents`).then(r=>r.data),
    enabled:!!cid,
    refetchInterval:10000,
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
      });
      await api.post(`/companies/${cid}/documents`, {
        fileName: file.name,
        mimeType: file.type,
        fileUrl:  `data:${file.type};base64,${base64}`,
        type:     'DOCUMENTO',
      });
      qc.invalidateQueries({ queryKey: ['documents', cid] });
    } catch(e:any) {
      setUploadError(e.response?.data?.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const STATUS_LABEL: Record<string,string> = {
    CARGADO: 'Cargado', PROCESANDO: 'Procesando',
    PENDIENTE_VALIDACION: 'Pendiente', VALIDADO: 'Validado',
    RECHAZADO: 'Rechazado', ARCHIVADO: 'Archivado',
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Bandeja documental</h1>
          <label style={{
            padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
            background: uploading ? '#334155' : color, color:'#fff',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}>
            {uploading ? 'Subiendo...' : '+ Subir documento'}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
              style={{ display:'none' }} onChange={handleFile} disabled={uploading}/>
          </label>
        </div>

        {uploadError && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171',
            borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:13, color:'#f87171' }}>
            {uploadError}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {isLoading && <p style={{ color:'#64748b' }}>Cargando…</p>}
          {!isLoading && (docs as any[]).length===0 && (
            <div className="card" style={{ textAlign:'center', padding:48 }}>
              <p style={{ fontSize:36, marginBottom:12 }}>📄</p>
              <p style={{ color:'#94a3b8', fontWeight:500, marginBottom:8 }}>Sin documentos</p>
              <p style={{ color:'#64748b', fontSize:13 }}>Sube facturas, tickets, comprobantes o cualquier documento</p>
            </div>
          )}
          {(docs as any[]).map((doc:any) => (
            <div key={doc.id} className="card" style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:48, height:48, borderRadius:8, background:'#334155',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {doc.fileUrl?.startsWith('data:image')
                  ? <img src={doc.fileUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8 }}/>
                  : <span style={{ fontSize:24 }}>📄</span>}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:500, margin:'0 0 2px' }}>{doc.fileName}</p>
                <p style={{ fontSize:12, color:'#64748b', margin:0 }}>{fmtDate(doc.createdAt)}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className={
                  doc.status==='VALIDADO'?'badge-green':
                  doc.status==='PENDIENTE_VALIDACION'?'badge-amber':'badge-gray'
                }>
                  {STATUS_LABEL[doc.status] || doc.status?.replace(/_/g,' ')}
                </span>
                {doc.status === 'CARGADO' && (
                  <button onClick={async () => {
                    try {
                      await api.post(`/companies/${cid}/documents/${doc.id}/extract`, {});
                      qc.invalidateQueries({ queryKey: ['documents', cid] });
                    } catch(e:any) {
                      alert(e.response?.data?.message || 'Error al extraer');
                    }
                  }}
                    style={{ fontSize:11, padding:'3px 10px', borderRadius:6, border:`1px solid ${color}`,
                      background:'none', color, cursor:'pointer' }}>
                    🔍 Extraer datos
                  </button>
                )}
                {doc.status === 'PENDIENTE_VALIDACION' && (doc as any).extractedJson && (
                  <button onClick={() => {
                    const d = (doc as any).extractedJson;
                    alert(`Proveedor: ${d.proveedor}\nFecha: ${d.fecha}\nTotal: $${d.total}`);
                  }}
                    style={{ fontSize:11, padding:'3px 10px', borderRadius:6, border:'1px solid #10b981',
                      background:'none', color:'#10b981', cursor:'pointer' }}>
                    ✓ Ver datos
                  </button>
                )}
                
                {doc.fileUrl && (
                  <a href={doc.fileUrl} download={doc.fileName} target="_blank" rel="noreferrer"
                    style={{ fontSize:18, textDecoration:'none' }} title="Descargar">
                    ⬇
                  </a>
                )}
              </div>
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
