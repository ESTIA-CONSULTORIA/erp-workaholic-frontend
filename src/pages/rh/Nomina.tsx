function NuevoPeriodoForm({ cid, color, onSuccess }: any) {
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ type:'QUINCENAL', period:today, periodEnd:today, periodLabel:'' });
  const [saving, setSaving] = useState(false);
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const guardar = async () => {
    if (!form.periodLabel) { alert('Escribe un nombre'); return; }
    setSaving(true);
    try { const { data } = await api.post(`/companies/${cid}/payroll/periods`, form); onSuccess(data); }
    finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ marginBottom:16 }}>
      <h3 style={{ fontSize:14, fontWeight:600, marginTop:0, marginBottom:12 }}>Nuevo período</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Tipo</label>
          <select className="input-base" style={{ fontSize:13 }} value={form.type} onChange={e=>set('type',e.target.value)}>
            <option value="QUINCENAL">Quincenal</option>
            <option value="MENSUAL">Mensual</option>
            <option value="SEMANAL">Semanal</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha inicio</label>
          <input type="date" className="input-base" style={{ fontSize:13 }} value={form.period} onChange={e=>set('period',e.target.value)}/>
        </div>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Fecha fin</label>
          <input type="date" className="input-base" style={{ fontSize:13 }} value={form.periodEnd} onChange={e=>set('periodEnd',e.target.value)}/>
        </div>
        <div>
          <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Nombre del período</label>
          <input className="input-base" style={{ fontSize:13 }} value={form.periodLabel} onChange={e=>set('periodLabel',e.target.value)} placeholder="Ej: Quincena 1 Marzo 2026"/>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
        <button className="btn-primary" style={{ background:color, fontSize:13 }} onClick={guardar} disabled={saving}>
          {saving?'Creando…':'Crear período'}
        </button>
      </div>
    </div>
  );
}

import AppLayout from '../../components/layout/AppLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useERPStore } from '../../store/erp.store';
import { api, fmt } from '../../lib/api';

export default function NominaPage() {
  const { activeCompany } = useERPStore();
  const cid = activeCompany?.companyId;
  const color = activeCompany?.color || '#3b82f6';
  const qc  = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [payingAccount, setPayingAccount] = useState('');

  const calculateM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/payroll/periods/${selected?.id}/calculate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-lines', selected?.id] });
    },
  });

  const closeM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/payroll/periods/${selected?.id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-periods', cid] }),
    onError: (e:any) => alert(e.response?.data?.message || 'Error al cerrar'),
  });

  const publishM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/payroll/periods/${selected?.id}/publish-receipts`),
    onSuccess: (d:any) => alert(`✅ ${d.published || 0} recibos publicados`),
    onError:   (e:any) => alert(e.response?.data?.message || 'Error al publicar'),
  });

  const { data: periods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ['payroll-periods', cid],
    queryFn:  () => api.get(`/companies/${cid}/payroll/periods`).then(r => r.data),
    enabled: !!cid,
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['payroll-lines', selected?.id],
    queryFn:  () => api.get(`/companies/${cid}/payroll/periods/${selected.id}/lines`).then(r => r.data),
    enabled:  !!selected,
  });

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['cash-accounts', cid],
    queryFn:  () => api.get(`/companies/${cid}/flow/balances`).then(r => r.data?.accounts || []),
    enabled: !!cid,
  });

  const loadM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/payroll/periods/${selected.id}/load`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['payroll-lines', selected?.id] }),
  });

  const exportM = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/companies/${cid}/payroll/periods/${selected.id}/export`, {}, { responseType:'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `nomina_${selected.periodLabel}.csv`);
      document.body.appendChild(a); a.click(); a.remove();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-periods', cid] }),
  });

  const payM = useMutation({
    mutationFn: () => api.post(`/companies/${cid}/payroll/periods/${selected.id}/pay`, { cashAccountId: payingAccount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-periods', cid] }); setSelected(null); },
  });

  const totalNeto  = lines.reduce((t:number,l:any) => t+Number(l.netPay), 0);
  const totalBruto = lines.reduce((t:number,l:any) => t+Number(l.totalPerceptions), 0);

  const STATUS_LABEL: Record<string,string> = { ABIERTO:'Abierto', PRENOMINA:'Prenómina', EXPORTADO:'Exportado', PAGADO:'Pagado' };
  const STATUS_BADGE: Record<string,string> = { ABIERTO:'badge-gray', PRENOMINA:'badge-blue', EXPORTADO:'badge-amber', PAGADO:'badge-green' };

  return (
    <AppLayout>
      <div style={{ maxWidth:960 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Nómina</h1>
          <button className="btn-primary" style={{ background:color }} onClick={() => setShowNew(!showNew)}>+ Nuevo período</button>
        </div>

        {showNew && (
          <NuevoPeriodoForm cid={cid!} color={color} onSuccess={(p:any) => { setShowNew(false); qc.invalidateQueries({queryKey:['payroll-periods',cid]}); setSelected(p); }}/>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>
          {/* Lista períodos */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, margin:0 }}>Períodos</p>
            {periods.map((p:any) => (
              <button key={p.id} onClick={() => setSelected(p)}
                style={{ textAlign:'left', padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer',
                  borderLeft:`3px solid ${selected?.id===p.id?color:'#334155'}`,
                  background: selected?.id===p.id?color+'11':'#1e293b' }}>
                <p style={{ fontSize:13, fontWeight:500, margin:'0 0 4px', color:'#f1f5f9' }}>{p.periodLabel}</p>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span className={STATUS_BADGE[p.status]||'badge-gray'} style={{ fontSize:10 }}>{STATUS_LABEL[p.status]||p.status}</span>
                </div>
              </button>
            ))}
            {periods.length===0 && <p style={{ color:'#64748b', fontSize:13 }}>Sin períodos</p>}
          </div>

          {/* Detalle */}
          {selected && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <h3 style={{ fontSize:16, fontWeight:600, margin:'0 0 2px' }}>{selected.periodLabel}</h3>
                    <p style={{ fontSize:12, color:'#64748b', margin:0 }}>{selected.period} al {selected.periodEnd}</p>
                  </div>
                  <span className={STATUS_BADGE[selected.status]||'badge-gray'}>{STATUS_LABEL[selected.status]||selected.status}</span>
                </div>

                {selected.status==='ABIERTO' && (
                  <div style={{ background:'#334155', borderRadius:8, padding:12 }}>
                    <p style={{ fontSize:12, fontWeight:700, color, margin:'0 0 6px' }}>Paso 1 — Cargar empleados activos</p>
                    <button className="btn-primary" style={{ background:color, width:'100%', fontSize:13 }}
                      onClick={() => loadM.mutate()} disabled={loadM.isPending}>
                      {loadM.isPending?'Cargando…':'Cargar empleados a prenómina'}
                    </button>
                  </div>
                )}

                {(selected.status==='ABIERTO'||selected.status==='PRENOMINA') && lines.length>0 && (
                  <div style={{ background:'#334155', borderRadius:8, padding:12 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#f59e0b', margin:'0 0 6px' }}>Paso 2 — Exportar a CONTPAQi</p>
                    <button className="btn-primary" style={{ background:'#f59e0b', width:'100%', fontSize:13 }}
                      onClick={() => exportM.mutate()} disabled={exportM.isPending}>
                      {exportM.isPending?'Generando…':'⬇ Exportar CSV para CONTPAQi'}
                    </button>
                  </div>
                )}

                {selected.status==='EXPORTADO' && (
                  <div style={{ background:'#334155', borderRadius:8, padding:12 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#10b981', margin:'0 0 6px' }}>Paso 3 — Registrar pago → impacta banco</p>
                    <select className="input-base" style={{ fontSize:13, marginBottom:8 }}
                      value={payingAccount} onChange={e => setPayingAccount(e.target.value)}>
                      <option value="">— Seleccionar cuenta bancaria —</option>
                      {cashAccounts.map((a:any) => <option key={a.accountId} value={a.accountId}>{a.accountName} ({fmt(a.balance)})</option>)}
                    </select>
                    <button className="btn-primary" style={{ background:'#10b981', width:'100%', fontSize:13 }}
                      onClick={() => payM.mutate()} disabled={payM.isPending||!payingAccount}>
                      {payM.isPending?'Procesando…':`✓ Confirmar pago — ${fmt(totalNeto)}`}
                    </button>
                  </div>
                )}

                {selected.status==='PAGADO' && (
                  <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, padding:12 }}>
                    <p style={{ color:'#10b981', fontWeight:600, margin:'0 0 2px' }}>✓ Nómina pagada</p>
                    <p style={{ fontSize:12, color:'#64748b', margin:0 }}>Salida registrada en banco · Reflejado en ER</p>
                  </div>
                )}
              </div>

              {lines.length>0 && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    {[
                      { label:'Total bruto', value:fmt(totalBruto), color },
                      { label:'Deducciones', value:fmt(totalBruto-totalNeto), color:'#f87171' },
                      { label:'Neto a dispersar', value:fmt(totalNeto), color:'#10b981' },
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
                          <th>#</th><th>Empleado</th><th>Puesto</th>
                          <th style={{textAlign:'right'}}>Base</th>
                          <th style={{textAlign:'right',color:'#3b82f6'}}>Timbrado</th>
                          <th style={{textAlign:'right',color:'#f59e0b'}}>Efectivo</th>
                          <th style={{textAlign:'right'}}>Deducciones</th>
                          <th style={{textAlign:'right'}}>Neto</th>
                          <th style={{textAlign:'right',color:'#3b82f6',fontSize:10}}>Neto SAT</th>
                          <th></th>
                        </tr></thead>
                      <tbody>
                        {lines.map((l:any) => (
                          <tr key={l.id}>
                            <td><code style={{fontSize:11,background:'#334155',padding:'2px 4px',borderRadius:4}}>{l.employee.employeeNumber}</code></td>
                            <td style={{fontWeight:500}}>{l.employee.firstName} {l.employee.lastName}</td>
                            <td style={{color:'#64748b',fontSize:12}}>{l.employee.position}</td>
                            <td style={{textAlign:'right',fontSize:12,color:'#94a3b8'}}>{fmt(l.baseSalary)}</td>
                            <td style={{textAlign:'right',fontSize:12,color:'#3b82f6'}}>{fmt(l.baseTimbrado||l.baseSalary)}</td>
                            <td style={{textAlign:'right',fontSize:12,color:l.baseEfectivo>0?'#f59e0b':'#334155'}}>
                              {l.baseEfectivo>0?fmt(l.baseEfectivo):'—'}
                            </td>
                            <td style={{textAlign:'right',color:'#f87171',fontSize:12}}>{fmt(l.totalDeductions)}</td>
                            <td style={{textAlign:'right',fontWeight:700,color}}>{fmt(l.netPay)}</td>
                            <td style={{textAlign:'right',fontSize:11,color:'#3b82f6'}}>{fmt(l.netTimbrado||l.netPay)}</td>
                            <td>
                              {(l.baseEfectivo||0)>0 && (
                                <span style={{fontSize:9,padding:'2px 5px',borderRadius:99,
                                  background:'#f59e0b22',color:'#f59e0b',fontWeight:600}}>
                                  +{fmt(l.netEfectivo||0)} ef.
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

