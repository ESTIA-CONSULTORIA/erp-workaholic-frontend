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
// ── GASTOS REPLACEMENT ────────────────────────────────────────
// Reemplaza desde "export function GastosPage()" hasta el "}" que cierra GastosPage
export function GastosPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();

  const esContador = ['admin','administrador','gerente','contador'].includes(role);

  const [vista,   setVista]   = useState<'lista'|'nuevo'>('lista');
  const [busqueda,    setBusqueda]    = useState('');
  const [showImport, setShowImport]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const initForm = {
    date:          new Date().toISOString().slice(0,10),
    concept:       '',
    subtotal:      '',
    ivaPct:        '0',
    tax:           '0',
    paymentMethod: 'EFECTIVO',
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

  const { data: rubros = [] } = useQuery({
    queryKey: ['rubrics', cid],
    queryFn:  () => api.get(`/companies/${cid}/financial-rubrics`).then(r => r.data),
    enabled:  !!cid && vista === 'nuevo',
  });

  const { data: rawBalances } = useQuery({
    queryKey: ['balances', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data),
    enabled:  !!cid && vista === 'nuevo' && esContador,
  });
  const cuentas = Array.isArray(rawBalances) ? rawBalances : (rawBalances?.accounts || []);

  const totalGastos = (gastos as any[]).reduce((t:number,g:any) => t + Number(g.total||0), 0);

  const handleSubtotalChange = (val: string) => {
    const sub = Number(val) || 0;
    const tax = (sub * Number(form.ivaPct) / 100).toFixed(2);
    setForm(f => ({ ...f, subtotal: val, tax }));
  };

  const handleIvaChange = (pct: string) => {
    const tax = ((Number(form.subtotal)||0) * Number(pct) / 100).toFixed(2);
    setForm(f => ({ ...f, ivaPct: pct, tax }));
  };

  const guardar = async () => {
    if (!form.concept || !form.subtotal) { setError('Concepto y monto son obligatorios'); return; }
    setError(''); setSaving(true);
    try {
      await api.post(`/companies/${cid}/expenses`, {
        ...form,
        subtotal: Number(form.subtotal),
        tax:      Number(form.tax),
      });
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

        {vista === 'nuevo' && (
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Nuevo gasto</h3>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Fecha *</label>
                <input type="date" className="input-base" style={{ fontSize:13 }}
                  value={form.date} onChange={e => set('date', e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Concepto *</label>
                <input className="input-base" style={{ fontSize:13 }} value={form.concept}
                  onChange={e => set('concept', e.target.value)} placeholder="Descripción del gasto"/>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Subtotal *</label>
                <input type="number" min="0" step="0.01" className="input-base" style={{ fontSize:13 }}
                  value={form.subtotal} onChange={e => handleSubtotalChange(e.target.value)} placeholder="0.00"/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>IVA</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.ivaPct}
                  onChange={e => handleIvaChange(e.target.value)}>
                  <option value="0">Sin IVA (0%)</option>
                  <option value="8">8% — Frontera</option>
                  <option value="16">16% — General</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Monto IVA</label>
                <div style={{ background:'#0f172a', borderRadius:8, padding:'8px 12px', fontSize:13,
                  color: Number(form.tax) > 0 ? '#f59e0b' : '#475569', border:'1px solid #334155' }}>
                  {fmt(Number(form.tax))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Total</label>
                <div style={{ background:'#0f172a', borderRadius:8, padding:'8px 12px', fontSize:14,
                  fontWeight:700, color, border:'1px solid #334155' }}>
                  {fmt(total)}
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Método de pago</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.paymentMethod}
                  onChange={e => set('paymentMethod', e.target.value)}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA_DEBITO">Tarjeta débito</option>
                  <option value="TARJETA_CREDITO">Tarjeta crédito</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Estado</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.paymentStatus}
                  onChange={e => set('paymentStatus', e.target.value)}>
                  <option value="PAGADO">Pagado</option>
                  <option value="PENDIENTE">Pendiente (CxP)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Proveedor</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.supplierId}
                  onChange={e => set('supplierId', e.target.value)}>
                  <option value="">— Sin proveedor —</option>
                  {(proveedores as any[]).map((p:any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Subcuenta contable *</label>
                <select className="input-base" style={{ fontSize:13 }} value={form.rubricId}
                  onChange={e => set('rubricId', e.target.value)}>
                  <option value="">— Selecciona rubro —</option>
                  {(rubros as any[]).map((r:any) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campos contables para contador */}
            {esContador && (
              <>
                <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:1, margin:'8px 0 8px' }}>Campos contables</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
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
                  <div>
                    <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Notas</label>
                    <input className="input-base" style={{ fontSize:13 }} value={form.notes}
                      onChange={e => set('notes', e.target.value)} placeholder="Observaciones"/>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <input type="checkbox" id="isExternal" checked={form.isExternal}
                    onChange={e => set('isExternal', e.target.checked)}
                    style={{ width:16, height:16, cursor:'pointer' }}/>
                  <label htmlFor="isExternal" style={{ fontSize:12, color:'#94a3b8', cursor:'pointer' }}>
                    Operación externa (no afecta resultado operativo)
                  </label>
                </div>
              </>
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

        {vista === 'lista' && (
          <>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            <input className="input-base" style={{ maxWidth:280, fontSize:13 }}
              placeholder="Buscar concepto, proveedor, rubro…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
            <button onClick={() => setShowImport(true)}
              style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`,
                background:'none', color, cursor:'pointer', fontSize:12 }}>
              ⬆ Importar CSV
            </button>
            <button onClick={() => exportCSV('gastos',
              (gastos as any[]).filter((g:any) => {
                const q = busqueda.toLowerCase();
                return !q || g.concept?.toLowerCase().includes(q) || g.supplier?.name?.toLowerCase().includes(q) || g.rubric?.name?.toLowerCase().includes(q);
              }),
              [{key:'date',label:'Fecha'},{key:'concept',label:'Concepto'},
               {key:'subtotal',label:'Subtotal'},{key:'tax',label:'IVA'},
               {key:'total',label:'Total'},{key:'paymentMethod',label:'Método'},
               {key:'paymentStatus',label:'Estatus'}])}
              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
              ⬇ Exportar CSV
            </button>
            <span style={{ fontSize:12, color:'#475569', marginLeft:'auto' }}>
              {(gastos as any[]).filter((g:any) => {
                const q = busqueda.toLowerCase();
                return !q || g.concept?.toLowerCase().includes(q) || g.supplier?.name?.toLowerCase().includes(q);
              }).length} registros
            </span>
          </div>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
            <table className="table-base" style={{ minWidth:900 }}>
              <thead><tr>
                <th>Mes</th>
                <th>Fecha</th>
                <th>Cuenta</th>
                <th>Subcuenta</th>
                <th>Proveedor</th>
                <th>Descripción</th>
                <th style={{textAlign:'right'}}>Subtotal</th>
                <th style={{textAlign:'right'}}>IVA</th>
                <th style={{textAlign:'right'}}>Total</th>
                <th>Método</th>
                <th>Estatus</th>
              </tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={11} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                {!isLoading && (gastos as any[]).length===0 && (
                  <tr><td colSpan={11} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin gastos registrados</td></tr>
                )}
                {(gastos as any[]).filter((g:any) => { const q=busqueda.toLowerCase(); return !q||g.concept?.toLowerCase().includes(q)||g.supplier?.name?.toLowerCase().includes(q)||g.rubric?.name?.toLowerCase().includes(q); }).map((g:any) => {
                  const fecha = g.date ? new Date(g.date) : null;
                  const mes = fecha ? fecha.toLocaleDateString('es-MX',{month:'short',year:'2-digit'}).toUpperCase() : '—';
                  const fechaCorta = fecha ? fecha.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'}) : '—';
                  const METODO_LABELS: Record<string,string> = {
                    EFECTIVO:'Efectivo', EFECTIVO_MXN:'Efectivo',
                    TRANSFERENCIA:'Transfer.', TARJETA:'Tarjeta',
                    TARJETA_DEBITO:'T. Débito', TARJETA_CREDITO:'T. Crédito',
                    CHEQUE:'Cheque',
                  };
                  return (
                    <tr key={g.id}>
                      <td style={{fontSize:11,color:'#64748b',whiteSpace:'nowrap'}}>{mes}</td>
                      <td style={{fontSize:12,whiteSpace:'nowrap'}}>{fechaCorta}</td>
                      <td style={{fontSize:11,color:'#94a3b8',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {g.rubric?.group?.section?.name || '—'}
                      </td>
                      <td style={{fontSize:11,color:'#94a3b8',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {g.rubric?.name || '—'}
                      </td>
                      <td style={{fontSize:11,color:'#94a3b8',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {g.supplier?.name||'—'}
                      </td>
                      <td style={{fontSize:12,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {g.concept}
                      </td>
                      <td style={{textAlign:'right',fontSize:12}}>{fmt(g.subtotal)}</td>
                      <td style={{textAlign:'right',fontSize:12,color: Number(g.tax)>0 ? '#f59e0b':'#475569'}}>
                        {Number(g.tax)>0 ? fmt(g.tax) : '—'}
                      </td>
                      <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(g.total)}</td>
                      <td style={{fontSize:11,color:'#64748b',whiteSpace:'nowrap'}}>
                        {METODO_LABELS[g.paymentMethod||''] || g.paymentMethod || '—'}
                      </td>
                      <td>
                        <span className={g.paymentStatus==='PAGADO'?'badge-green':'badge-amber'}>
                          {g.paymentStatus==='PAGADO'?'Pagado':'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
      {showImport && (
        <ImportCSV
          title="Gastos"
          color={color}
          columns={[
            { key:'fecha',         label:'Fecha',      required:true,  type:'date'   },
            { key:'concepto',      label:'Concepto',   required:true                 },
            { key:'subtotal',      label:'Subtotal',   required:true,  type:'number' },
            { key:'iva',           label:'IVA',                        type:'number' },
            { key:'total',         label:'Total',                      type:'number' },
            { key:'metodo',        label:'Método de pago'                            },
            { key:'factura',       label:'No. Factura'                               },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/gastos`, { rows });
            qc.invalidateQueries({ queryKey: ['expenses', cid] });
            return res.data;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </AppLayout>
  );
}

export function ConciliacionPage() {
  const { activeCompany } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const role  = activeCompany?.roleCode || '';
  const qc    = useQueryClient();

  const esAdmin = ['admin','administrador','gerente'].includes(role);

  const [editId,   setEditId]   = useState<string|null>(null);
  const [editName, setEditName] = useState('');
  const [saving,   setSaving]   = useState(false);

  const { data: rawBalances } = useQuery({
    queryKey: ['balances', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data),
    enabled:  !!cid,
  });

  // Para el admin: obtener cortes del día para comparar declarado vs teórico
  const hoy = new Date().toISOString().slice(0,10);
  const { data: cortes = [] } = useQuery({
    queryKey: ['cortes-arqueo', cid, hoy],
    queryFn:  () => api.get(`/companies/${cid}/corte-caja`).then(r => r.data),
    enabled:  !!cid && esAdmin,
  });

  const balances = Array.isArray(rawBalances) ? rawBalances : (rawBalances?.accounts || []);
  const totalMxn = rawBalances?.totalMxn || 0;

  const TIPO_LABELS: Record<string,string> = {
    EFECTIVO:'Efectivo', BANCO:'Banco', PLATAFORMA:'Plataforma', CAJA_CHICA:'Caja chica',
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

  // Calcular totales de cortes del día para comparar
  const cortesHoy = (cortes as any[]).filter((c:any) => c.fecha?.slice(0,10) === hoy);
  const efectivoDeclarado = cortesHoy.reduce((t:number,c:any) => t + Number(c.efectivoContado||0), 0);
  const efectivoTeorico   = balances.find((b:any) => b.type === 'EFECTIVO')?.balance || 0;
  const diferencia        = efectivoDeclarado - Number(efectivoTeorico);

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Arqueo de Caja</h1>
          <span style={{ fontSize:12, padding:'4px 12px', borderRadius:99,
            background: esAdmin ? '#3b82f622' : '#f59e0b22',
            color: esAdmin ? '#3b82f6' : '#f59e0b' }}>
            {esAdmin ? 'Vista administrador' : 'Vista contador'}
          </span>
        </div>

        {/* Vista Admin: declarado vs teórico */}
        {esAdmin && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Efectivo declarado (cortes hoy)', value: efectivoDeclarado, col: '#f59e0b' },
              { label:'Efectivo teórico (sistema)',       value: efectivoTeorico,   col: color },
              { label:'Diferencia',                       value: diferencia,        col: diferencia === 0 ? '#10b981' : diferencia > 0 ? '#3b82f6' : '#f87171' },
            ].map(k => (
              <div key={k.label} style={{ background:'#1e293b', borderRadius:8, padding:12, border:'1px solid #334155' }}>
                <p style={{ fontSize:10, color:'#64748b', margin:'0 0 4px' }}>{k.label}</p>
                <p style={{ fontSize:20, fontWeight:700, color:k.col, margin:0 }}>{fmt(k.value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Saldo total */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Saldo total MXN</p>
            <p style={{ fontSize:24, fontWeight:700, color, margin:0 }}>{fmt(totalMxn)}</p>
          </div>
          <div className="card-sm" style={{ borderLeft:'3px solid #64748b' }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Cuentas activas</p>
            <p style={{ fontSize:24, fontWeight:700, color:'#94a3b8', margin:0 }}>{balances.length}</p>
          </div>
        </div>

        {/* Desglose por tipo de cuenta */}
        {Object.entries(grupos).map(([tipo, cuentas]: any) => (
          <div key={tipo} style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1, margin:'0 0 8px' }}>
              {TIPO_LABELS[tipo] || tipo}
            </p>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th>Moneda</th>
                    <th style={{textAlign:'right'}}>Saldo sistema</th>
                    {esAdmin && <th style={{textAlign:'right'}}>Diferencia</th>}
                    {esAdmin && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {(cuentas as any[]).map((b: any) => {
                    const dif = tipo === 'EFECTIVO' ? diferencia : 0;
                    return (
                      <tr key={b.accountId}>
                        <td>
                          {esAdmin && editId === b.accountId ? (
                            <input className="input-base" style={{ fontSize:12, width:200 }}
                              value={editName} onChange={e => setEditName(e.target.value)}/>
                          ) : (
                            <span style={{ fontWeight:500 }}>{b.accountName}</span>
                          )}
                        </td>
                        <td><span className="badge-blue">{b.currency}</span></td>
                        <td style={{ textAlign:'right', fontWeight:700,
                          color: Number(b.balance) >= 0 ? color : '#f87171' }}>
                          {fmt(b.balance)}
                        </td>
                        {esAdmin && (
                          <td style={{ textAlign:'right', fontWeight:700,
                            color: tipo !== 'EFECTIVO' ? '#475569' : dif === 0 ? '#10b981' : dif > 0 ? '#3b82f6' : '#f87171' }}>
                            {tipo === 'EFECTIVO' ? (dif > 0 ? `+${fmt(dif)}` : fmt(dif)) : '—'}
                          </td>
                        )}
                        {esAdmin && (
                          <td>
                            {editId === b.accountId ? (
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => guardarNombre(b.accountId)} disabled={saving}
                                  style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12 }}>
                                  ✓ Guardar
                                </button>
                                <button onClick={() => setEditId(null)}
                                  style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditId(b.accountId); setEditName(b.accountName); }}
                                style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                                Renombrar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      </>)}

      {tab === 'movimientos' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
            <input type="month" className="input-base" style={{ fontSize:13, maxWidth:160 }}
              value={filtroMes} onChange={e => setFiltroMes(e.target.value)}/>
            <span style={{ fontSize:12, color:'#475569', marginLeft:8 }}>
              {(movimientos as any[]).length} movimientos
            </span>
            <button onClick={() => exportCSV('movimientos', movimientos as any[],
              [{key:'date',label:'Fecha'},{key:'type',label:'Tipo'},{key:'originType',label:'Origen'},
               {key:'amount',label:'Monto'},{key:'currency',label:'Moneda'},{key:'notes',label:'Notas'}])}
              style={{ marginLeft:'auto', padding:'6px 14px', borderRadius:8, border:'1px solid #334155',
                background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
              ⬇ Exportar CSV
            </button>
          </div>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Fecha</th><th>Cuenta</th><th>Tipo</th><th>Origen</th>
                <th style={{textAlign:'right'}}>Monto</th><th>Notas</th>
              </tr></thead>
              <tbody>
                {loadMov && <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#64748b'}}>Cargando…</td></tr>}
                {!loadMov && (movimientos as any[]).length === 0 && (
                  <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'#64748b'}}>Sin movimientos en este período</td></tr>
                )}
                {(movimientos as any[]).map((m:any) => (
                  <tr key={m.id}>
                    <td style={{fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(m.date)}</td>
                    <td style={{fontSize:11,color:'#94a3b8'}}>{m.cashAccount?.name||'—'}</td>
                    <td>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,
                        background: m.type==='ENTRADA'?'#10b98122':'#f8717122',
                        color: m.type==='ENTRADA'?'#10b981':'#f87171'}}>
                        {m.type}
                      </span>
                    </td>
                    <td style={{fontSize:11,color:'#64748b'}}>{m.originType?.replace(/_/g,' ')||'—'}</td>
                    <td style={{textAlign:'right',fontWeight:700,
                      color:m.type==='ENTRADA'?'#10b981':'#f87171'}}>
                      {m.type==='SALIDA'?'-':''}{fmt(m.amountMxn||m.amount)}
                    </td>
                    <td style={{fontSize:11,color:'#64748b',maxWidth:160,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.notes||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImportBanca && (
        <ImportCSV title="Estado de cuenta bancario" color={color}
          columns={[
            { key:'fecha',       label:'Fecha',       required:true, type:'date'   },
            { key:'descripcion', label:'Descripción', required:true               },
            { key:'cargo',       label:'Cargo',                      type:'number' },
            { key:'abono',       label:'Abono',                      type:'number' },
            { key:'referencia',  label:'Referencia'                               },
          ]}
          onImport={async (rows) => {
            // Convert bank statement rows to flow movements
            const movs = rows.filter(r => r.cargo > 0 || r.abono > 0).map(r => ({
              fecha:      r.fecha,
              descripcion: r.descripcion,
              monto:       r.abono > 0 ? r.abono : r.cargo,
              tipo:        r.abono > 0 ? 'ENTRADA' : 'SALIDA',
              referencia:  r.referencia,
            }));
            const res = await api.post(`/companies/${cid}/import/gastos`, {
              rows: movs.filter(m => m.tipo === 'SALIDA').map(m => ({
                fecha:    m.fecha,
                concepto: m.descripcion,
                total:    m.monto,
                metodo:   'TRANSFERENCIA',
                estatus:  'PAGADO',
              }))
            });
            qc.invalidateQueries({ queryKey: ['movements', cid] });
            qc.invalidateQueries({ queryKey: ['balances', cid] });
            return res.data;
          }}
          onClose={() => setShowImportBanca(false)}
        />
      )}
    </AppLayout>
  );
}

// ── CxC REPLACEMENT ───────────────────────────────────────────
// Reemplaza desde "export function CxCPage()" hasta el "}" que cierra CxCPage
export function CxCPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';
  const [filterCliente, setFilterCliente] = useState('');
  const [pagoModal,     setPagoModal]     = useState<any>(null);
  const [historialModal, setHistorialModal] = useState<any>(null);
  const [showImportCxC, setShowImportCxC] = useState(false);
  const [pagoForm,      setPagoForm]      = useState({
    amount: 0, paymentMethod: 'EFECTIVO',
    date: new Date().toISOString().slice(0,10), reference: '',
  });
  const qc = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', cid],
    queryFn:  () => api.get(`/companies/${cid}/clients`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: summary } = useQuery({
    queryKey: ['cxc-summary', cid, filterCliente],
    queryFn:  () => api.get(`/companies/${cid}/cxc/summary${filterCliente?`?clientId=${filterCliente}`:''}`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxcs = [] } = useQuery({
    queryKey: ['cxc', cid, activePeriod, filterCliente],
    queryFn:  () => api.get(`/companies/${cid}/cxc?period=${activePeriod}${filterCliente?`&clientId=${filterCliente}`:''}`).then(r => r.data),
    enabled:  !!cid,
  });

  // Ordenar por fecha de pago más reciente primero
  const cxcsOrdenadas = [...(cxcs as any[])].sort((a, b) => {
    const fechaA = a.payments?.[0]?.date || a.date;
    const fechaB = b.payments?.[0]?.date || b.date;
    return new Date(fechaB).getTime() - new Date(fechaA).getTime();
  });

  const registrarPago = async () => {
    if (!pagoModal || !pagoForm.amount) return;
    await api.post(`/companies/${cid}/cxc/${pagoModal.id}/payments`, pagoForm);
    setPagoModal(null);
    setPagoForm({ amount:0, paymentMethod:'EFECTIVO', date:new Date().toISOString().slice(0,10), reference:'' });
    qc.invalidateQueries({ queryKey: ['cxc', cid] });
    qc.invalidateQueries({ queryKey: ['cxc-summary', cid] });
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>Cuentas por Cobrar</h1>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:16 }}>
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

        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input-base" style={{ maxWidth:240, fontSize:13 }}
            placeholder="Buscar cliente, concepto…" id="cxc-search"
            onChange={e => { (window as any)._cxcQ = e.target.value; }}/>
          <select style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #334155',
            background:'#1e293b', color:'#f1f5f9', fontSize:13 }}
            value={filterCliente} onChange={e => setFilterCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {(clientes as any[]).map((c:any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={() => setShowImportCxC(true)}
            style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`,
              background:'none', color, cursor:'pointer', fontSize:12 }}>
            ⬆ Importar CSV
          </button>
          <button onClick={() => exportCSV('cxc', cxcsOrdenadas,
            [{key:'date',label:'Fecha'},{key:'originalAmount',label:'Original'},
             {key:'paidAmount',label:'Pagado'},{key:'balance',label:'Saldo'},
             {key:'status',label:'Estado'}])}
            style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #334155',
              background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ⬇ Exportar CSV
          </button>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Cliente</th>
              <th>No. OC</th>
              <th>Fecha venta</th>
              <th>Último pago</th>
              <th style={{textAlign:'right'}}>Original</th>
              <th style={{textAlign:'right'}}>Pagado</th>
              <th style={{textAlign:'right'}}>Saldo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr></thead>
            <tbody>
              {(cxcsOrdenadas as any[]).length===0 && (
                <tr><td colSpan={9} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cuentas por cobrar</td></tr>
              )}
              {cxcsOrdenadas.map((c:any) => {
                const ultimoPago = c.payments?.[0];
                return (
                  <tr key={c.id}>
                    <td style={{fontWeight:500}}>{c.client?.name}</td>
                    <td style={{fontSize:11,color:'#64748b'}}>
                      {c.concept?.match(/OC-?\d+|[A-Z]+-\d+/)?.[0] || '—'}
                    </td>
                    <td style={{fontSize:12,color:'#64748b'}}>{fmtDate(c.date)}</td>
                    <td style={{fontSize:12,color: ultimoPago ? '#10b981' : '#475569'}}>
                      {ultimoPago ? fmtDate(ultimoPago.date) : '—'}
                    </td>
                    <td style={{textAlign:'right',fontSize:12}}>{fmt(c.originalAmount)}</td>
                    <td style={{textAlign:'right',fontSize:12,color:'#10b981'}}>{fmt(c.paidAmount)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(c.balance)}</td>
                    <td>
                      <span className={c.status==='PAGADO'?'badge-green':c.status==='VENCIDO'?'badge-red':'badge-amber'}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        {c.status !== 'PAGADO' && (
                          <button onClick={() => setPagoModal(c)}
                            style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                            Abonar
                          </button>
                        )}
                        {(c.payments?.length > 0) && (
                          <button onClick={() => setHistorialModal(c)}
                            style={{background:'none',border:'none',color:'#10b981',cursor:'pointer',fontSize:12}}>
                            Historial
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pagoModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',
          alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:380,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 4px'}}>Registrar pago</h3>
            <p style={{fontSize:12,color:'#64748b',margin:'0 0 16px'}}>
              {pagoModal.client?.name} — Saldo: {fmt(pagoModal.balance)}
            </p>
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
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA_DEBITO">Tarjeta débito</option>
                  <option value="TARJETA_CREDITO">Tarjeta crédito</option>
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
                  onChange={e=>setPagoForm(f=>({...f,reference:e.target.value}))} placeholder="No. de transferencia, etc."/>
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
      {showImportCxC && (
        <ImportCSV title="CxC" color={color}
          columns={[
            { key:'cliente',      label:'Cliente',    required:true },
            { key:'concepto',     label:'Concepto',   required:true },
            { key:'fecha',        label:'Fecha',      type:'date'   },
            { key:'vencimiento',  label:'Vencimiento',type:'date'   },
            { key:'monto',        label:'Monto',      required:true, type:'number' },
            { key:'pagado',       label:'Pagado',     type:'number' },
            { key:'estatus',      label:'Estatus'                   },
          ]}
          onImport={async (rows) => {
            const res = await api.post(`/companies/${cid}/import/cxc`, { rows });
            qc.invalidateQueries({ queryKey: ['cxc', cid] });
            return res.data;
          }}
          onClose={() => setShowImportCxC(false)}
        />
      )}
      {historialModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',
          alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#0f172a',borderRadius:12,padding:0,width:520,
            maxHeight:'80vh',display:'flex',flexDirection:'column',border:'1px solid #334155'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #334155',
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 2px'}}>Historial de pagos</h3>
                <p style={{fontSize:12,color:'#64748b',margin:0}}>
                  {historialModal.client?.name} · Saldo: {fmt(historialModal.balance)}
                </p>
              </div>
              <button onClick={()=>setHistorialModal(null)}
                style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
              {(historialModal.payments||[]).length === 0 ? (
                <p style={{color:'#475569',fontSize:13,textAlign:'center',padding:'24px 0'}}>Sin pagos registrados</p>
              ) : (historialModal.payments||[]).map((p:any,i:number) => (
                <div key={i} style={{background:'#1e293b',borderRadius:8,padding:'10px 14px',
                  marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:600,color:'#10b981',margin:'0 0 2px'}}>{fmt(p.amount)}</p>
                    <p style={{fontSize:11,color:'#64748b',margin:0}}>
                      {fmtDate(p.date)} · {p.paymentMethod||'—'} {p.reference ? `· Ref: ${p.reference}` : ''}
                    </p>
                  </div>
                  <span style={{fontSize:10,color:'#475569'}}>#{i+1}</span>
                </div>
              ))}
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #334155',
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'#64748b'}}>Total pagado</span>
              <span style={{fontSize:16,fontWeight:700,color:'#10b981'}}>{fmt(historialModal.paidAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ── CxP PAGE (NUEVO) ──────────────────────────────────────────
// Agrega esto DESPUÉS de CxCPage y ANTES de ConciliacionPage
export function CxPPage() {
  const { activeCompany, activePeriod } = useERPStore();
  const cid   = activeCompany?.companyId;
  const color = activeCompany?.color || '#f59e0b';
  const qc    = useQueryClient();

  const [filterProv,     setFilterProv]     = useState('');
  const [pagoModal,      setPagoModal]      = useState<any>(null);
  const [historialCxP,   setHistorialCxP]   = useState<any>(null);
  const [showImportCxP, setShowImportCxP] = useState(false);
  const [nuevaModal,     setNuevaModal]      = useState(false);
  const [pagoForm,    setPagoForm]    = useState({
    amount: 0, paymentMethod: 'EFECTIVO',
    date: new Date().toISOString().slice(0,10), reference: '',
  });
  const [nuevaForm, setNuevaForm] = useState({
    supplierId: '', concept: '', date: new Date().toISOString().slice(0,10),
    dueDate: '', originalAmount: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: proveedores = [] } = useQuery({
    queryKey: ['suppliers', cid],
    queryFn:  () => api.get(`/companies/${cid}/suppliers`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: summary } = useQuery({
    queryKey: ['cxp-summary', cid],
    queryFn:  () => api.get(`/companies/${cid}/cxp/summary`).then(r => r.data),
    enabled:  !!cid,
  });

  const { data: cxps = [] } = useQuery({
    queryKey: ['cxp-gestion', cid, activePeriod, filterProv],
    queryFn:  () => {
      let url = `/companies/${cid}/cxp?period=${activePeriod}`;
      if (filterProv) url += `&supplierId=${filterProv}`;
      return api.get(url).then(r => r.data);
    },
    enabled: !!cid,
  });

  // Ordenar por fecha de vencimiento más próxima
  const cxpsOrdenadas = [...(cxps as any[])].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const registrarPago = async () => {
    if (!pagoModal || !pagoForm.amount) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/cxp/${pagoModal.id}/payments`, pagoForm);
      setPagoModal(null);
      setPagoForm({ amount:0, paymentMethod:'EFECTIVO', date:new Date().toISOString().slice(0,10), reference:'' });
      qc.invalidateQueries({ queryKey: ['cxp-gestion', cid] });
      qc.invalidateQueries({ queryKey: ['cxp-summary', cid] });
    } finally { setSaving(false); }
  };

  const crearCxP = async () => {
    if (!nuevaForm.concept || !nuevaForm.originalAmount) return;
    setSaving(true);
    try {
      await api.post(`/companies/${cid}/cxp`, {
        ...nuevaForm,
        originalAmount: Number(nuevaForm.originalAmount),
      });
      setNuevaModal(false);
      setNuevaForm({ supplierId:'', concept:'', date: new Date().toISOString().slice(0,10), dueDate:'', originalAmount:'', notes:'' });
      qc.invalidateQueries({ queryKey: ['cxp-gestion', cid] });
      qc.invalidateQueries({ queryKey: ['cxp-summary', cid] });
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Cuentas por Pagar</h1>
          <button className="btn-primary" style={{ background:color, fontSize:13 }}
            onClick={() => setNuevaModal(true)}>
            + Nueva CxP
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:16 }}>
          <div className="card-sm" style={{ borderLeft:`3px solid ${color}` }}>
            <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Total por pagar</p>
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

        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <select style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #334155',
            background:'#1e293b', color:'#f1f5f9', fontSize:13 }}
            value={filterProv} onChange={e => setFilterProv(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {(proveedores as any[]).map((p:any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={() => setShowImportCxP(true)}
            style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${color}`,
              background:'none', color, cursor:'pointer', fontSize:12 }}>
            ⬆ Importar CSV
          </button>
          <button onClick={() => exportCSV('cxp', cxpsOrdenadas,
            [{key:'concept',label:'Concepto'},{key:'date',label:'Fecha'},
             {key:'dueDate',label:'Vencimiento'},{key:'originalAmount',label:'Original'},
             {key:'paidAmount',label:'Pagado'},{key:'balance',label:'Saldo'},
             {key:'status',label:'Estado'},{key:'invoiceRef',label:'Factura'}])}
            style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #334155',
              background:'none', color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ⬇ Exportar CSV
          </button>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table-base">
            <thead><tr>
              <th>Proveedor</th>
              <th>No. Factura</th>
              <th>Concepto</th>
              <th>Fecha</th>
              <th>Vencimiento</th>
              <th style={{textAlign:'right'}}>Original</th>
              <th style={{textAlign:'right'}}>Pagado</th>
              <th style={{textAlign:'right'}}>Saldo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr></thead>
            <tbody>
              {(cxpsOrdenadas as any[]).length===0 && (
                <tr><td colSpan={10} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin cuentas por pagar</td></tr>
              )}
              {cxpsOrdenadas.map((c:any) => {
                const vencida = c.dueDate && new Date(c.dueDate) < new Date() && c.status !== 'PAGADO';
                return (
                  <tr key={c.id}>
                    <td style={{fontWeight:500}}>{c.supplier?.name||'—'}</td>
                    <td style={{fontSize:11,color:'#64748b'}}>{c.invoiceRef||'—'}</td>
                    <td style={{fontSize:12,color:'#94a3b8',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.concept}</td>
                    <td style={{fontSize:12,color:'#64748b'}}>{fmtDate(c.date)}</td>
                    <td style={{fontSize:12,color: vencida?'#f87171':'#64748b'}}>
                      {c.dueDate ? fmtDate(c.dueDate) : '—'}
                      {vencida && <span style={{marginLeft:4,fontSize:10}}>⚠</span>}
                    </td>
                    <td style={{textAlign:'right',fontSize:12}}>{fmt(c.originalAmount)}</td>
                    <td style={{textAlign:'right',fontSize:12,color:'#10b981'}}>{fmt(c.paidAmount)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:vencida?'#f87171':color}}>{fmt(c.balance)}</td>
                    <td>
                      <span className={c.status==='PAGADO'?'badge-green':vencida?'badge-red':'badge-amber'}>
                        {c.status==='PAGADO'?'Pagado':vencida?'Vencido':c.status==='PARCIAL'?'Parcial':'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        {c.status !== 'PAGADO' && (
                          <button onClick={() => setPagoModal(c)}
                            style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12}}>
                            Abonar
                          </button>
                        )}
                        {(c.payments?.length > 0) && (
                          <button onClick={() => setHistorialCxP(c)}
                            style={{background:'none',border:'none',color:'#10b981',cursor:'pointer',fontSize:12}}>
                            Historial
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal pago */}
      {pagoModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',
          alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:380,border:'1px solid #334155'}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 4px'}}>Registrar abono</h3>
            <p style={{fontSize:12,color:'#64748b',margin:'0 0 16px'}}>
              {pagoModal.supplier?.name||pagoModal.concept} — Saldo: {fmt(pagoModal.balance)}
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Monto *</label>
                <input type="number" min="0" max={pagoModal.balance} className="input-base" style={{fontSize:13}}
                  value={pagoForm.amount||''} onChange={e=>setPagoForm(f=>({...f,amount:+e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Método</label>
                <select className="input-base" style={{fontSize:13}} value={pagoForm.paymentMethod}
                  onChange={e=>setPagoForm(f=>({...f,paymentMethod:e.target.value}))}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA_DEBITO">Tarjeta débito</option>
                  <option value="TARJETA_CREDITO">Tarjeta crédito</option>
                  <option value="CHEQUE">Cheque</option>
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
                  onChange={e=>setPagoForm(f=>({...f,reference:e.target.value}))} placeholder="No. de transferencia"/>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setPagoModal(null)} className="btn-secondary" style={{flex:1,fontSize:13}}>Cancelar</button>
              <button onClick={registrarPago} className="btn-primary"
                style={{flex:1,fontSize:13,background:color}} disabled={saving||!pagoForm.amount}>
                {saving?'…':'Registrar abono'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva CxP */}
      {nuevaModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',
          alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#1e293b',borderRadius:12,padding:24,width:460,border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,margin:0,color}}>Nueva cuenta por pagar</h3>
              <button onClick={()=>setNuevaModal(false)}
                style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div style={{gridColumn:'span 2'}}>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Concepto *</label>
                <input className="input-base" style={{fontSize:13}} value={nuevaForm.concept}
                  onChange={e=>setNuevaForm(f=>({...f,concept:e.target.value}))} placeholder="Factura proveedor, renta, etc."/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Proveedor</label>
                <select className="input-base" style={{fontSize:13}} value={nuevaForm.supplierId}
                  onChange={e=>setNuevaForm(f=>({...f,supplierId:e.target.value}))}>
                  <option value="">— Sin proveedor —</option>
                  {(proveedores as any[]).map((p:any)=>(
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Monto *</label>
                <input type="number" min="0" className="input-base" style={{fontSize:13}}
                  value={nuevaForm.originalAmount}
                  onChange={e=>setNuevaForm(f=>({...f,originalAmount:e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha</label>
                <input type="date" className="input-base" style={{fontSize:13}} value={nuevaForm.date}
                  onChange={e=>setNuevaForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Fecha vencimiento</label>
                <input type="date" className="input-base" style={{fontSize:13}} value={nuevaForm.dueDate}
                  onChange={e=>setNuevaForm(f=>({...f,dueDate:e.target.value}))}/>
              </div>
              <div style={{gridColumn:'span 2'}}>
                <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:3}}>Notas</label>
                <input className="input-base" style={{fontSize:13}} value={nuevaForm.notes}
                  onChange={e=>setNuevaForm(f=>({...f,notes:e.target.value}))} placeholder="Observaciones"/>
              </div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn-secondary" style={{fontSize:13}} onClick={()=>setNuevaModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{background:color,fontSize:13}}
                onClick={crearCxP} disabled={saving||!nuevaForm.concept||!nuevaForm.originalAmount}>
                {saving?'Guardando…':'Registrar CxP'}
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
        {/* Todos los tabs se montan desde el inicio para cargar en paralelo */}
        <div style={{ display: tab === 'er'      ? 'block' : 'none' }}><ERTab      cid={cid!} color={color} activePeriod={activePeriod}/></div>
        <div style={{ display: tab === 'flujo'   ? 'block' : 'none' }}><FlujoTab   cid={cid!} color={color} activePeriod={activePeriod}/></div>
        <div style={{ display: tab === 'balance' ? 'block' : 'none' }}><BalanceTab cid={cid!} color={color} activePeriod={activePeriod}/></div>
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
          <ERRow label="(-) Costo de venta" value={-(edo.costoVentas || 0)} color='#f87171'/>
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

  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [validModal,   setValidModal]   = useState<any>(null);
  const [validando,    setValidando]    = useState(false);
  const [tipoDoc,      setTipoDoc]      = useState<'GASTO'|'COMPRA'|null>(null);

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

  const validarComoGasto = async () => {
    if (!validModal) return;
    setValidando(true);
    try {
      const d = validModal.extractedJson || {};
      await api.post(`/companies/${cid}/expenses`, {
        date:          d.fecha || new Date().toISOString().slice(0,10),
        concept:       d.concepto || validModal.fileName,
        subtotal:      Number(d.subtotal || d.total || 0),
        tax:           Number(d.iva || 0),
        paymentMethod: 'EFECTIVO',
        paymentStatus: 'PENDIENTE',
        invoiceRef:    d.folio || d.numero || '',
        notes:         `Generado desde documento OCR: ${validModal.fileName}`,
      });
      await api.put(`/companies/${cid}/documents/${validModal.id}`, { status: 'VALIDADO' });
      qc.invalidateQueries({ queryKey: ['documents', cid] });
      qc.invalidateQueries({ queryKey: ['expenses', cid] });
      setValidModal(null); setTipoDoc(null);
      alert('✔ Gasto prellenado en estado Pendiente. Revísalo en Gastos.');
    } catch(e:any) {
      alert(e.response?.data?.message || 'Error al crear gasto');
    } finally { setValidando(false); }
  };

  const validarComoCompra = async () => {
    if (!validModal) return;
    setValidando(true);
    try {
      const d = validModal.extractedJson || {};
      await api.put(`/companies/${cid}/documents/${validModal.id}`, { status: 'VALIDADO' });
      qc.invalidateQueries({ queryKey: ['documents', cid] });
      setValidModal(null); setTipoDoc(null);
      alert('✔ Documento marcado como compra. Regístrala en el módulo Compras.');
    } catch(e:any) {
      alert(e.response?.data?.message || 'Error');
    } finally { setValidando(false); }
  };

  const STATUS_LABEL: Record<string,string> = {
    CARGADO: 'Cargado', PROCESANDO: 'Procesando',
    PENDIENTE_VALIDACION: 'Pendiente', VALIDADO: 'Validado',
    RECHAZADO: 'Rechazado', ARCHIVADO: 'Archivado',
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:900 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Bandeja documental</h1>
          <label style={{
            padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
            background: uploading ? '#334155' : color, color:'#fff',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}>
            {uploading ? 'Subiendo...' : '+ Subir documento'}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              style={{ display:'none' }} onChange={handleFile} disabled={uploading}/>
          </label>
        </div>

        {uploadError && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid #f87171',
            borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:13, color:'#f87171' }}>
            {uploadError}
          </div>
        )}

        {/* Pendientes de validación */}
        {(docs as any[]).some((d:any) => d.status === 'PENDIENTE_VALIDACION') && (
          <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b44', borderRadius:8,
            padding:'8px 14px', marginBottom:16, fontSize:12, color:'#f59e0b' }}>
            ⚠ Tienes documentos pendientes de clasificar como Gasto o Compra
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {isLoading && <p style={{ color:'#64748b' }}>Cargando…</p>}
          {!isLoading && (docs as any[]).length===0 && (
            <div className="card" style={{ textAlign:'center', padding:48 }}>
              <p style={{ fontSize:36, marginBottom:12 }}>📄</p>
              <p style={{ color:'#94a3b8', fontWeight:500, marginBottom:8 }}>Sin documentos</p>
              <p style={{ color:'#64748b', fontSize:13 }}>Sube facturas, tickets o comprobantes para extraer datos con OCR</p>
            </div>
          )}
          {(docs as any[]).map((doc:any) => (
            <div key={doc.id} className="card" style={{ display:'flex', alignItems:'center', gap:16,
              border: doc.status==='PENDIENTE_VALIDACION' ? '1px solid #f59e0b44' : '1px solid #1e293b' }}>
              <div onClick={() => doc.fileUrl && setValidModal(doc)}
                style={{ width:56, height:56, borderRadius:8, background:'#334155',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  cursor: doc.fileUrl ? 'pointer' : 'default', overflow:'hidden' }}>
                {doc.fileUrl?.startsWith('data:image')
                  ? <img src={doc.fileUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <span style={{ fontSize:28 }}>📄</span>}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:500, margin:'0 0 2px' }}>{doc.fileName}</p>
                <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
                  {fmtDate(doc.createdAt)}
                  {doc.extractedJson?.proveedor && ` · ${doc.extractedJson.proveedor}`}
                  {doc.extractedJson?.total && ` · $${doc.extractedJson.total}`}
                </p>
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
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`1px solid ${color}`,
                      background:'none', color, cursor:'pointer' }}>
                    🔍 Extraer OCR
                  </button>
                )}
                {doc.status === 'PENDIENTE_VALIDACION' && (
                  <button onClick={() => { setValidModal(doc); setTipoDoc(null); }}
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid #f59e0b',
                      background:'#f59e0b22', color:'#f59e0b', cursor:'pointer', fontWeight:600 }}>
                    📋 Clasificar
                  </button>
                )}
                {doc.fileUrl && (
                  <button onClick={() => {
                    const w = window.open();
                    if (w) w.document.write(`<img src="${doc.fileUrl}" style="max-width:100%">`);
                  }}
                    style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18 }}
                    title="Ver imagen">
                    👁
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de clasificación OCR */}
      {validModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#0f172a', borderRadius:12, border:'1px solid #334155',
            width:'90vw', maxWidth:800, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>Clasificar documento</h3>
              <button onClick={() => { setValidModal(null); setTipoDoc(null); }}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, flex:1, overflow:'hidden' }}>

              {/* Vista previa imagen */}
              <div style={{ borderRight:'1px solid #334155', padding:16, overflowY:'auto',
                display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0f1a' }}>
                {validModal.fileUrl?.startsWith('data:image') ? (
                  <img src={validModal.fileUrl} alt="documento"
                    style={{ maxWidth:'100%', maxHeight:'60vh', borderRadius:6, objectFit:'contain' }}/>
                ) : (
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:48, margin:'0 0 8px' }}>📄</p>
                    <p style={{ fontSize:13, color:'#64748b' }}>{validModal.fileName}</p>
                  </div>
                )}
              </div>

              {/* Datos extraídos y clasificación */}
              <div style={{ padding:20, overflowY:'auto' }}>
                <p style={{ fontSize:11, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:1, margin:'0 0 12px', fontWeight:700 }}>
                  Datos extraídos por OCR
                </p>

                {validModal.extractedJson ? (
                  <div style={{ background:'#1e293b', borderRadius:8, padding:12, marginBottom:16 }}>
                    {[
                      ['Proveedor',   validModal.extractedJson.proveedor],
                      ['Fecha',       validModal.extractedJson.fecha],
                      ['Folio/No.',   validModal.extractedJson.folio || validModal.extractedJson.numero],
                      ['Subtotal',    validModal.extractedJson.subtotal ? `$${validModal.extractedJson.subtotal}` : null],
                      ['IVA',         validModal.extractedJson.iva ? `$${validModal.extractedJson.iva}` : null],
                      ['Total',       validModal.extractedJson.total ? `$${validModal.extractedJson.total}` : null],
                      ['Concepto',    validModal.extractedJson.concepto],
                    ].filter(([,v]) => v).map(([label, value]) => (
                      <div key={label as string} style={{ display:'flex', justifyContent:'space-between',
                        marginBottom:6, paddingBottom:6, borderBottom:'1px solid #334155' }}>
                        <span style={{ fontSize:11, color:'#64748b' }}>{label}</span>
                        <span style={{ fontSize:12, fontWeight:500, color:'#f1f5f9' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background:'#1e293b', borderRadius:8, padding:12, marginBottom:16 }}>
                    <p style={{ fontSize:12, color:'#64748b', margin:0 }}>Sin datos extraídos — clasifica manualmente</p>
                  </div>
                )}

                <p style={{ fontSize:11, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:1, margin:'0 0 12px', fontWeight:700 }}>
                  ¿Qué tipo de documento es?
                </p>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                  <button onClick={() => setTipoDoc('GASTO')}
                    style={{ padding:'14px 10px', borderRadius:10, cursor:'pointer', textAlign:'center',
                      border: tipoDoc==='GASTO' ? '2px solid #f59e0b' : '1px solid #334155',
                      background: tipoDoc==='GASTO' ? '#f59e0b22' : '#1e293b' }}>
                    <p style={{ fontSize:20, margin:'0 0 4px' }}>🧾</p>
                    <p style={{ fontSize:13, fontWeight:700, color: tipoDoc==='GASTO' ? '#f59e0b' : '#94a3b8', margin:'0 0 2px' }}>
                      Es un GASTO
                    </p>
                    <p style={{ fontSize:10, color:'#64748b', margin:0 }}>Afecta ER y flujo</p>
                  </button>
                  <button onClick={() => setTipoDoc('COMPRA')}
                    style={{ padding:'14px 10px', borderRadius:10, cursor:'pointer', textAlign:'center',
                      border: tipoDoc==='COMPRA' ? `2px solid ${color}` : '1px solid #334155',
                      background: tipoDoc==='COMPRA' ? color+'22' : '#1e293b' }}>
                    <p style={{ fontSize:20, margin:'0 0 4px' }}>📦</p>
                    <p style={{ fontSize:13, fontWeight:700, color: tipoDoc==='COMPRA' ? color : '#94a3b8', margin:'0 0 2px' }}>
                      Es una COMPRA
                    </p>
                    <p style={{ fontSize:10, color:'#64748b', margin:0 }}>Afecta inventario</p>
                  </button>
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setValidModal(null); setTipoDoc(null); }}
                    style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #334155',
                      background:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
                    Cancelar
                  </button>
                  <button
                    onClick={tipoDoc==='GASTO' ? validarComoGasto : validarComoCompra}
                    disabled={!tipoDoc || validando}
                    style={{ flex:2, padding:'10px', borderRadius:8, border:'none', fontSize:13,
                      fontWeight:700, cursor: tipoDoc ? 'pointer' : 'not-allowed',
                      background: !tipoDoc ? '#334155' : tipoDoc==='GASTO' ? '#f59e0b' : color,
                      color: '#fff' }}>
                    {validando ? 'Procesando…'
                      : !tipoDoc ? 'Selecciona el tipo'
                      : tipoDoc==='GASTO' ? '✓ Crear gasto pendiente'
                      : '✓ Marcar como compra'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
