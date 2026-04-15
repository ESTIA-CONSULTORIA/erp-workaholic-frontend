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
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const initForm = {
    date:          new Date().toISOString().slice(0,10),
    concept:       '',
    subtotal:      '',
    ivaPct:        '0',
    tax:           '0',
    paymentMethod: 'EFECTIVO_MXN',
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
                  <option value="EFECTIVO_MXN">Efectivo MXN</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
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
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="table-base">
              <thead><tr>
                <th>Fecha</th><th>Concepto</th><th>Proveedor</th>
                <th style={{textAlign:'right'}}>Subtotal</th>
                <th style={{textAlign:'right'}}>IVA</th>
                <th style={{textAlign:'right'}}>Total</th>
                <th>Método</th><th>Estado</th>
              </tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Cargando…</td></tr>}
                {!isLoading && (gastos as any[]).length===0 && (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#64748b'}}>Sin gastos registrados</td></tr>
                )}
                {(gastos as any[]).map((g:any) => (
                  <tr key={g.id}>
                    <td>{fmtDate(g.date)}</td>
                    <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.concept}</td>
                    <td style={{color:'#94a3b8',fontSize:12}}>{g.supplier?.name||'—'}</td>
                    <td style={{textAlign:'right',fontSize:12}}>{fmt(g.subtotal)}</td>
                    <td style={{textAlign:'right',fontSize:12,color:'#f59e0b'}}>{fmt(g.tax)}</td>
                    <td style={{textAlign:'right',fontWeight:600,color}}>{fmt(g.total)}</td>
                    <td style={{fontSize:11,color:'#64748b'}}>{g.paymentMethod||'—'}</td>
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
